const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Admin koperasi masuk lewat Google, jadi akun ini tidak memakai kata sandi.
const ADMIN_EMAIL = 'sinarpagisejahteraminut@gmail.com';
const ADMIN_NAME = 'Koperasi Sinar Pagi Sejahtera Minut';

// Akun admin lama (login email + kata sandi) yang digantikan oleh akun Gmail di atas.
const LEGACY_ADMIN_EMAIL = 'admin@sinarpagisejahtera.co.id';

async function main() {
  console.log(`[Seed Admin] Menyiapkan akun admin Google: ${ADMIN_EMAIL}...`);

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  const legacy = await prisma.user.findUnique({ where: { email: LEGACY_ADMIN_EMAIL } });

  let user;
  if (existing) {
    // Gmail sudah terdaftar (mis. pernah login sebagai pembeli): naikkan jadi admin.
    user = await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: 'ADMIN', isVerified: true, isActive: true, password: null },
    });
    if (legacy && legacy.role === 'ADMIN') {
      await prisma.user.update({
        where: { email: LEGACY_ADMIN_EMAIL },
        data: { isActive: false, password: null },
      });
      console.log(`[Seed Admin] Akun admin lama ${LEGACY_ADMIN_EMAIL} dinonaktifkan.`);
    }
  } else if (legacy) {
    // Ganti email akun admin lama ke Gmail koperasi (ID & data terkait tetap sama).
    user = await prisma.user.update({
      where: { email: LEGACY_ADMIN_EMAIL },
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        password: null,
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
      },
    });
  }

  console.log(`[Seed Admin] Berhasil menyimpan akun admin:`);
  console.log(`- ID: ${user.id}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Role: ${user.role}`);
  console.log(`- Login: Google (tanpa kata sandi)`);
}

main()
  .catch((e) => {
    console.error('[Seed Admin] Terjadi error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
