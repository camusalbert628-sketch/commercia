import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      phone: true,
      createdAt: true,
    },
  });
  console.log('USERS FOUND:');
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
