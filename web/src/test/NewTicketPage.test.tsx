import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NewTicketPage } from '../pages/NewTicketPage';
import { server } from './msw';
import { renderWithProviders } from './render';

function renderForm() {
  return renderWithProviders(
    <Routes>
      <Route path="/tickets/new" element={<NewTicketPage />} />
      <Route path="/tickets/:id" element={<p>detail page</p>} />
    </Routes>,
    { route: '/tickets/new' },
  );
}

describe('NewTicketPage', () => {
  it('shows validation errors for empty and invalid input without calling the API', async () => {
    let posted = false;
    server.use(
      http.post('/api/tickets', () => {
        posted = true;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    renderForm();

    await userEvent.type(screen.getByLabelText(/customer email/i), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /create ticket/i }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Customer name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(posted).toBe(false);

    // Errors are wired to their inputs for screen readers.
    expect(screen.getByLabelText(/title/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits a valid ticket and navigates to its detail page', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post('/api/tickets', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 42, ...body, status: 'open' }, { status: 201 });
      }),
    );
    renderForm();

    await userEvent.type(screen.getByLabelText(/title/i), 'Cannot log in');
    await userEvent.type(screen.getByLabelText(/customer name/i), 'Jane Smith');
    await userEvent.type(screen.getByLabelText(/customer email/i), 'jane@example.com');
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'high');
    await userEvent.type(screen.getByLabelText(/description/i), 'Password reset loops forever.');
    await userEvent.click(screen.getByRole('button', { name: /create ticket/i }));

    await waitFor(() =>
      expect(body).toEqual({
        title: 'Cannot log in',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        priority: 'high',
        description: 'Password reset loops forever.',
      }),
    );
    expect(await screen.findByText('detail page')).toBeInTheDocument();
    expect(await screen.findByText(/ticket #42 created/i)).toBeInTheDocument();
  });
});
