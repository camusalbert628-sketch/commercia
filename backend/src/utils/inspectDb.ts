import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspect() {
  const users = await prisma.user.findMany({
    include: {
      subscription: {
        include: { plan: true },
      },
      businesses: true,
    },
  });

  console.log('--- USERS IN DB ---');
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      name: `${u.firstName} ${u.lastName}`,
      isAdmin: u.isAdmin,
      subscription: u.subscription ? {
        plan: u.subscription.plan?.name,
        displayName: u.subscription.plan?.displayName,
        status: u.subscription.status,
        endDate: u.subscription.endDate,
      } : null,
    });
  }

  const payments = await prisma.payment.findMany();
  console.log('--- PAYMENTS IN DB ---', payments.length);
  for (const p of payments) {
    console.log(p);
  }
}

inspect().finally(() => prisma.$disconnect());
