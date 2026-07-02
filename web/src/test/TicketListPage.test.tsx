import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { TicketListPage } from '../pages/TicketListPage';
import { fixtureTickets, server } from './msw';
import { renderWithProviders } from './render';

describe('TicketListPage', () => {
  it('renders tickets from the API with status, priority and customer', async () => {
    renderWithProviders(<TicketListPage />);

    // Loading state first…
    expect(screen.getByRole('status', { name: /loading tickets/i })).toBeInTheDocument();

    // …then real data.
    const table = await screen.findByRole('table');
    expect(within(table).getByText(/unable to complete payment/i)).toBeInTheDocument();
    expect(within(table).getByText('Jane Smith')).toBeInTheDocument();
    expect(within(table).getByText('High')).toBeInTheDocument();
    expect(
      within(table).getByRole('combobox', { name: /status for "unable to complete payment"/i }),
    ).toHaveValue('open');
  });

  it('shows the empty state when no tickets exist', async () => {
    server.use(
      http.get('/api/tickets', () =>
        HttpResponse.json({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } }),
      ),
    );
    renderWithProviders(<TicketListPage />);
    expect(await screen.findByText(/no tickets yet/i)).toBeInTheDocument();
  });

  it('shows the error state and recovers on retry', async () => {
    server.use(http.get('/api/tickets', () => HttpResponse.json({ error: 'boom' }, { status: 500 })));
    renderWithProviders(<TicketListPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded/i);

    server.resetHandlers(); // handlers back to healthy
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('PATCHes a status change and confirms with a toast', async () => {
    let patchedBody: unknown = null;
    server.use(
      http.patch('/api/tickets/1', async ({ request }) => {
        patchedBody = await request.json();
        return HttpResponse.json({ ...fixtureTickets[0], status: 'resolved' });
      }),
    );
    renderWithProviders(<TicketListPage />);

    // jsdom renders both responsive layouts (CSS hiding doesn't apply), so
    // scope to the desktop table to get exactly one select.
    const table = await screen.findByRole('table');
    const select = within(table).getByRole('combobox', {
      name: /status for "unable to complete payment"/i,
    });
    await userEvent.selectOptions(select, 'resolved');

    await waitFor(() => expect(patchedBody).toEqual({ status: 'resolved' }));
    expect(await screen.findByText(/status updated to resolved/i)).toBeInTheDocument();
  });
});
