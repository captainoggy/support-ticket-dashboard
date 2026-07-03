import { PrismaClient, TicketPriority, TicketStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** Deterministic, realistic dataset spread over ~3 weeks so sorting and
 *  relative dates are demonstrable. daysAgo anchors each ticket's createdAt. */
const tickets: Array<{
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
  status: TicketStatus;
  priority: TicketPriority;
  daysAgo: number;
}> = [
  {
    title: 'Unable to complete payment',
    description:
      'I get a "transaction declined" error every time I submit the payment form, on two different cards. The order shows as pending in my account but no confirmation email arrives.',
    customerName: 'Jane Smith',
    customerEmail: 'jane.smith@example.com',
    status: 'open',
    priority: 'high',
    daysAgo: 0.2,
  },
  {
    title: 'Two-factor authentication codes not arriving',
    description:
      'SMS codes stopped arriving yesterday. I have tried resending several times and checked that my phone number is correct in settings. I am locked out of my account.',
    customerName: 'Marcus Chen',
    customerEmail: 'marcus.chen@example.com',
    status: 'open',
    priority: 'high',
    daysAgo: 0.5,
  },
  {
    title: 'Invoice PDF shows wrong company address',
    description:
      'We updated our billing address last month but invoices generated since then still show the old address. We need corrected invoices for March and April for our accounting.',
    customerName: 'Priya Patel',
    customerEmail: 'priya.patel@acmecorp.example.com',
    status: 'in_progress',
    priority: 'medium',
    daysAgo: 1,
  },
  {
    title: 'Dashboard loads very slowly on Safari',
    description:
      'The analytics dashboard takes 30+ seconds to load on Safari 18, while Chrome loads it in about 2 seconds. Happens on multiple Macs in our office.',
    customerName: 'Tom Okafor',
    customerEmail: 'tom.okafor@example.com',
    status: 'open',
    priority: 'medium',
    daysAgo: 2,
  },
  {
    title: 'Request: export reports as CSV',
    description:
      'It would save us hours every week if the monthly usage report could be exported as CSV instead of only PDF. Is this on the roadmap?',
    customerName: 'Sofia Alvarez',
    customerEmail: 'sofia.alvarez@example.com',
    status: 'open',
    priority: 'low',
    daysAgo: 3,
  },
  {
    title: 'API returns 500 on bulk upload endpoint',
    description:
      'POST /v2/items/bulk started returning 500 errors this morning for payloads over ~200 items. Smaller payloads work. Request ID: 7f3a-22c1 if that helps your logs.',
    customerName: 'Dmitri Volkov',
    customerEmail: 'dmitri.volkov@devshop.example.com',
    status: 'in_progress',
    priority: 'high',
    daysAgo: 3.5,
  },
  {
    title: 'Cannot remove a team member',
    description:
      'When I try to remove a former employee from our workspace, the confirmation dialog appears but the member remains after clicking Remove. No error message shows.',
    customerName: 'Amara Diallo',
    customerEmail: 'amara.diallo@example.com',
    status: 'open',
    priority: 'medium',
    daysAgo: 5,
  },
  {
    title: 'Billed twice for the annual plan',
    description:
      'My credit card statement shows two identical charges on the same day for the annual subscription renewal. Please refund the duplicate charge.',
    customerName: 'Liam O’Sullivan',
    customerEmail: 'liam.osullivan@example.com',
    status: 'resolved',
    priority: 'high',
    daysAgo: 6,
  },
  {
    title: 'Dark mode: unreadable text in settings',
    description:
      'With dark mode enabled, the labels on the notification settings page render dark grey on a black background and are almost impossible to read.',
    customerName: 'Yuki Tanaka',
    customerEmail: 'yuki.tanaka@example.com',
    status: 'in_progress',
    priority: 'low',
    daysAgo: 8,
  },
  {
    title: 'Password reset link expires immediately',
    description:
      'Every password reset email I receive says the link has expired, even when I click it within a minute of receiving it. Tried in incognito and a different browser.',
    customerName: 'Fatima Al-Rashid',
    customerEmail: 'fatima.alrashid@example.com',
    status: 'resolved',
    priority: 'high',
    daysAgo: 10,
  },
  {
    title: 'Webhook deliveries delayed by several minutes',
    description:
      'Order webhooks that used to arrive within seconds now take 5–10 minutes, which breaks our fulfilment automation. Started around the 14th.',
    customerName: 'Marcus Chen',
    customerEmail: 'marcus.chen@example.com',
    status: 'resolved',
    priority: 'medium',
    daysAgo: 12,
  },
  {
    title: 'Question about GDPR data retention',
    description:
      'Our compliance team needs to know how long deleted customer records are retained in your backups and how we can request permanent erasure.',
    customerName: 'Ingrid Bergström',
    customerEmail: 'ingrid.bergstrom@nordicsoft.example.com',
    status: 'in_progress',
    priority: 'low',
    daysAgo: 14,
  },
  {
    title: 'Mobile app crashes when attaching photos',
    description:
      'The iOS app (v3.2.1, iPhone 15) closes instantly when I tap "Attach photo" on a support request. Attaching from the photo library works; the camera option is what crashes.',
    customerName: 'Carlos Mendes',
    customerEmail: 'carlos.mendes@example.com',
    status: 'resolved',
    priority: 'medium',
    daysAgo: 16,
  },
  {
    title: 'Add SSO support for Okta',
    description:
      'We are rolling out Okta across the company and need SAML SSO for your product before our security review in Q3. Happy to join a beta if one exists.',
    customerName: 'Rachel Goldberg',
    customerEmail: 'rachel.goldberg@fintechco.example.com',
    status: 'open',
    priority: 'low',
    daysAgo: 18,
  },
  {
    title: 'Typo on the pricing page',
    description:
      '"Enterprice" should be "Enterprise" in the plan comparison table. Small thing, but it was the first thing our CFO noticed.',
    customerName: 'Sofia Alvarez',
    customerEmail: 'sofia.alvarez@example.com',
    status: 'resolved',
    priority: 'low',
    daysAgo: 21,
  },
];

async function main() {
  // The demo password is never committed: it comes from the environment and
  // is shared with reviewers separately. Users are upserted so demo logins
  // always work (and the password rotates) on every boot.
  const demoPassword = process.env.DEMO_PASSWORD;
  if (demoPassword) {
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    await prisma.user.upsert({
      where: { email: 'admin@demo.dev' },
      update: { passwordHash },
      create: { email: 'admin@demo.dev', name: 'Ada Admin', role: 'ADMIN', passwordHash },
    });
    await prisma.user.upsert({
      where: { email: 'agent@demo.dev' },
      update: { passwordHash },
      create: { email: 'agent@demo.dev', name: 'Alex Agent', role: 'AGENT', passwordHash },
    });
  } else {
    console.warn('Seed: DEMO_PASSWORD is not set, demo users were not created/updated.');
  }

  // Tickets are only seeded into an empty table so restarting the stack never
  // wipes out changes a reviewer made through the UI.
  const existing = await prisma.ticket.count();
  if (existing > 0) {
    console.log(`Seed: ${existing} tickets already present, leaving them untouched.`);
    return;
  }

  const now = Date.now();
  await prisma.ticket.createMany({
    data: tickets.map((t, i) => {
      const createdAt = new Date(now - t.daysAgo * DAY);
      return {
        title: t.title,
        description: t.description,
        customerName: t.customerName,
        customerEmail: t.customerEmail,
        status: t.status,
        priority: t.priority,
        // Board rank: the array is ordered newest-first, so the index puts
        // recent tickets at the top of their columns.
        position: i,
        createdAt,
        // In-progress/resolved tickets were touched after creation.
        updatedAt: t.status === 'open' ? createdAt : new Date(createdAt.getTime() + 6 * HOUR + i),
      };
    }),
  });
  console.log(`Seed: created ${tickets.length} tickets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
