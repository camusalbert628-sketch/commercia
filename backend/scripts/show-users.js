const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        isActive: true,
        createdAt: true,
        businesses: {
          include: { business: true }
        }
      }
    });
    console.log('REAL USERS IN NEON:', JSON.stringify(users, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

showUsers();
