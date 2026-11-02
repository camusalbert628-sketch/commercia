const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRealData() {
  try {
    const usersCount = await prisma.user.count();
    const businessesCount = await prisma.business.count();
    const salesCount = await prisma.sale.count();
    const paymentsCount = await prisma.payment.count();
    const auditLogsCount = await prisma.auditLog.count();
    const adminUsers = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true, email: true, firstName: true, lastName: true } });

    console.log('REAL METRICS IN NEON:');
    console.log({
      usersCount,
      businessesCount,
      salesCount,
      paymentsCount,
      auditLogsCount,
      adminUsers
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealData();
