const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: 'admin@commercia.com' }
    });

    const hash = await bcrypt.hash('Commercia2026!', 10);

    if (existing) {
      const updated = await prisma.user.update({
        where: { email: 'admin@commercia.com' },
        data: {
          isAdmin: true,
          isActive: true,
          passwordHash: hash
        }
      });
      console.log('✅ Updated existing admin user:', updated.email);
    } else {
      const created = await prisma.user.create({
        data: {
          email: 'admin@commercia.com',
          passwordHash: hash,
          firstName: 'Super',
          lastName: 'Admin',
          isAdmin: true,
          isActive: true,
          emailVerified: true
        }
      });
      console.log('✅ Created Super Admin in Neon DB:', created.email, created.id);
    }
  } catch (err) {
    console.error('Error seeding admin:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
