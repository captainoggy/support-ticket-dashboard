import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { TicketDetailPage } from '../pages/TicketDetailPage';
import { renderWithProviders } from './render';

function renderDetail(id = 1) {
  return renderWithProviders(
    <Routes>
      <Route path="/tickets/:id" element={<TicketDetailPage />} />
    </Routes>,
    { route: `/tickets/${id}` },
  );
}

describe('TicketDetailPage inline editing', () => {
  it('edits the title in place and saves on Enter', async () => {
    renderDetail();
    await screen.findByText('Unable to complete payment');

    await userEvent.click(screen.getByRole('button', { name: 'Edit title' }));
    const input = screen.getByRole('textbox', { name: 'Title' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Payment declined at checkout{Enter}');

    expect(await screen.findByText('Title updated')).toBeInTheDocument();
    expect(screen.getByText('Payment declined at checkout')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
  });

  it('shows a validation error for an invalid customer email without saving', async () => {
    renderDetail();
    await screen.findByText('Card declined on checkout.');

    await userEvent.click(screen.getByRole('button', { name: 'Edit customer email' }));
    const input = screen.getByRole('textbox', { name: 'Customer email' });
    await userEvent.clear(input);
    await userEvent.type(input, 'not-an-email{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address');
    // Still editing: the invalid value must not be committed.
    expect(screen.getByRole('textbox', { name: 'Customer email' })).toBeInTheDocument();
  });

  it('cancels a description edit with Escape, leaving the text unchanged', async () => {
    renderDetail();
    await screen.findByText('Card declined on checkout.');

    await userEvent.click(screen.getByRole('button', { name: 'Edit description' }));
    const textarea = screen.getByRole('textbox', { name: 'Description' });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'This should be discarded{Escape}');

    expect(screen.getByText('Card declined on checkout.')).toBeInTheDocument();
    expect(screen.queryByText('This should be discarded')).not.toBeInTheDocument();
  });
});
