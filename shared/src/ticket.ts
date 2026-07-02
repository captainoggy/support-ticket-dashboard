import { z } from 'zod';

/**
 * Single source of truth for ticket validation, shared by the API (request
 * validation) and the web app (form validation) so the rules can never drift.
 */

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved'] as const;
export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const;

export const StatusSchema = z.enum(TICKET_STATUSES);
export const PrioritySchema = z.enum(TICKET_PRIORITIES);

export type TicketStatus = z.infer<typeof StatusSchema>;
export type TicketPriority = z.infer<typeof PrioritySchema>;

export const CreateTicketSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description is required')
    .max(5000, 'Description must be at most 5000 characters'),
  customerName: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(1, 'Customer name is required')
    .max(120, 'Customer name must be at most 120 characters'),
  customerEmail: z
    .string({ required_error: 'Customer email is required' })
    .trim()
    .min(1, 'Customer email is required')
    .max(254, 'Customer email must be at most 254 characters')
    .email('Enter a valid email address'),
  priority: PrioritySchema,
});

/** Partial update — any editable field, but at least one. Status changes ride this too. */
export const UpdateTicketSchema = CreateTicketSchema.partial()
  .extend({
    status: StatusSchema.optional(),
    // Board rank (lower = higher in the column); set when a card is dragged.
    position: z.number().finite().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;

export const TICKET_SORT_FIELDS = ['createdAt', 'priority', 'title', 'status', 'position'] as const;
export type TicketSortField = (typeof TICKET_SORT_FIELDS)[number];

export const ListTicketsQuerySchema = z.object({
  status: StatusSchema.optional(),
  priority: PrioritySchema.optional(),
  q: z.string().trim().max(200).optional(),
  sortBy: z.enum(TICKET_SORT_FIELDS).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListTicketsQuery = z.infer<typeof ListTicketsQuerySchema>;

/** Shape of a ticket as the API serializes it (dates as ISO strings). */
export interface Ticket {
  id: number;
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
  status: TicketStatus;
  priority: TicketPriority;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TicketListResponse {
  data: Ticket[];
  meta: PaginationMeta;
}

export interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  highPriorityOpen: number;
}

export const LoginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export type UserRole = 'AGENT' | 'ADMIN';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
