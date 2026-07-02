/**
 * Hand-authored OpenAPI 3.0 document, kept deliberately small and in sync with
 * the zod schemas in @ticketdash/shared. Served at /api/docs (Swagger UI) and
 * /api/openapi.json.
 */

const ticketProperties = {
  id: { type: 'integer', example: 1 },
  title: { type: 'string', maxLength: 200, example: 'Unable to complete payment' },
  description: {
    type: 'string',
    maxLength: 5000,
    example: 'The customer receives an error after submitting the payment form.',
  },
  customerName: { type: 'string', maxLength: 120, example: 'Jane Smith' },
  customerEmail: { type: 'string', format: 'email', example: 'jane@example.com' },
  status: { type: 'string', enum: ['open', 'in_progress', 'resolved'], example: 'open' },
  priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
  position: {
    type: 'number',
    description: 'Board rank within a status column (lower = higher up)',
    example: 3.5,
  },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
} as const;

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const ticketResponse = (description: string, status = '200') => ({
  [status]: {
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } },
  },
});

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Support Ticket Dashboard API',
    version: '1.0.0',
    description:
      'REST API for viewing, creating and updating customer support tickets. ' +
      'Live changes are also broadcast over socket.io as ticket:created / ticket:updated / ticket:deleted events.',
  },
  servers: [{ url: '/', description: 'Current host' }],
  // All ticket endpoints require a bearer token; login and health opt out below.
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Tickets' },
    { name: 'Auth' },
    { name: 'Meta' },
  ],
  paths: {
    '/api/tickets': {
      get: {
        tags: ['Tickets'],
        summary: 'List tickets with filtering, search, sorting and pagination',
        parameters: [
          { name: 'status', in: 'query', schema: ticketProperties.status },
          { name: 'priority', in: 'query', schema: ticketProperties.priority },
          {
            name: 'q',
            in: 'query',
            description: 'Case-insensitive search across title, customer name and email',
            schema: { type: 'string', maxLength: 200 },
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['createdAt', 'priority', 'title', 'status', 'position'],
              default: 'createdAt',
            },
          },
          { name: 'sortDir', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated ticket list',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TicketList' } },
            },
          },
          '400': errorResponse('Invalid query parameters'),
        },
      },
      post: {
        tags: ['Tickets'],
        summary: 'Create a ticket (always starts with status "open")',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateTicket' } },
          },
        },
        responses: {
          ...ticketResponse('Ticket created', '201'),
          '400': errorResponse('Validation failed (per-field details included)'),
        },
      },
    },
    '/api/tickets/stats': {
      get: {
        tags: ['Tickets'],
        summary: 'Ticket counts by status plus high-priority open count',
        responses: {
          '200': {
            description: 'Aggregated counts',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketStats' } } },
          },
        },
      },
    },
    '/api/tickets/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
      ],
      get: {
        tags: ['Tickets'],
        summary: 'Get a single ticket',
        responses: {
          ...ticketResponse('The ticket'),
          '400': errorResponse('Invalid id'),
          '404': errorResponse('Ticket not found'),
        },
      },
      patch: {
        tags: ['Tickets'],
        summary: 'Partially update a ticket (status changes use this endpoint)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateTicket' } },
          },
        },
        responses: {
          ...ticketResponse('Updated ticket'),
          '400': errorResponse('Validation failed'),
          '404': errorResponse('Ticket not found'),
        },
      },
      delete: {
        tags: ['Tickets'],
        summary: 'Delete a ticket (admin role required)',
        responses: {
          '204': { description: 'Ticket deleted' },
          '401': errorResponse('Missing or invalid token'),
          '403': errorResponse('Authenticated but not an admin'),
          '404': errorResponse('Ticket not found'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with a seeded demo user',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': {
            description: 'JWT and user profile',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          '401': errorResponse('Invalid email or password'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current authenticated user',
        responses: {
          '200': { description: 'The user embedded in the token' },
          '401': errorResponse('Missing or invalid token'),
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['Meta'],
        summary: 'Liveness/readiness check including database connectivity',
        security: [],
        responses: {
          '200': { description: 'API and database are healthy' },
          '503': { description: 'Database unreachable' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Ticket: {
        type: 'object',
        properties: ticketProperties,
        required: Object.keys(ticketProperties),
      },
      CreateTicket: {
        type: 'object',
        properties: {
          title: ticketProperties.title,
          description: ticketProperties.description,
          customerName: ticketProperties.customerName,
          customerEmail: ticketProperties.customerEmail,
          priority: ticketProperties.priority,
        },
        required: ['title', 'description', 'customerName', 'customerEmail', 'priority'],
      },
      UpdateTicket: {
        type: 'object',
        description: 'Any subset of fields; at least one is required.',
        properties: {
          title: ticketProperties.title,
          description: ticketProperties.description,
          customerName: ticketProperties.customerName,
          customerEmail: ticketProperties.customerEmail,
          priority: ticketProperties.priority,
          status: ticketProperties.status,
          position: ticketProperties.position,
        },
        minProperties: 1,
      },
      TicketList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Ticket' } },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              pageSize: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
      TicketStats: {
        type: 'object',
        properties: {
          open: { type: 'integer' },
          inProgress: { type: 'integer' },
          resolved: { type: 'integer' },
          highPriorityOpen: { type: 'integer' },
        },
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@demo.dev' },
          password: { type: 'string', example: 'demo1234' },
        },
        required: ['email', 'password'],
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string', enum: ['AGENT', 'ADMIN'] },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
        required: ['error'],
      },
    },
  },
} as const;
