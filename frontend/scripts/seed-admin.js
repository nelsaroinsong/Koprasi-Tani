const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const adminEmail = 'admin@sinarpagisejahtera.co.id';
  const adminRawPassword = 'AdminKoperasi2026!';
  const hashedPassword = hashPassword(adminRawPassword);

  console.log(`[Seed Admin] Menyiapkan akun admin: ${adminEmail}...`);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Administrator Koperasi Sinar Pagi Sejahtera',
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      email: adminEmail,
      name: 'Administrator Koperasi Sinar Pagi Sejahtera',
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
      isActive: true,
    },
  });

  console.log(`[Seed Admin] Berhasil menyimpan akun admin:`);
  console.log(`- ID: ${user.id}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Nama: ${user.name}`);
  console.log(`- Role: ${user.role}`);
  console.log(`- Password default: ${adminRawPassword}`);
}

main()
  .catch((e) => {
    console.error('[Seed Admin] Terjadi error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
