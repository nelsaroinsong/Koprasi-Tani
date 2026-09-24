const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const petani = await prisma.user.findFirst({
    where: { role: 'PETANI' },
  });

  if (!petani) {
    console.log('Tidak ada user petani terdaftar.');
    return;
  }

  const existingCount = await prisma.product.count();
  if (existingCount === 0) {
    await prisma.product.createMany({
      data: [
        {
          nama: 'Kelapa Butir Tua Minahasa',
          deskripsi: 'Kelapa butir tua grade A langsung petik dari kebun di Airmadidi. Daging tebal...',
          kategori: 'Kelapa',
          hargaPerSatuan: 4500,
          satuan: 'butir',
          stok: 850,
          imageUrl: 'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=600&q=80',
          isTersedia: true,
          petaniId: petani.id,
        },
        {
          nama: 'Jagung Pipil Kering Super',
          deskripsi: 'Kadar air rendah <14%, butir utuh bersih tanpa kotoran, sangat sesuai untuk...',
          kategori: 'Jagung',
          hargaPerSatuan: 5500,
          satuan: 'kg',
          stok: 2400,
          imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
          isTersedia: true,
          petaniId: petani.id,
        },
        {
          nama: 'Kopra Putih Kualitas Ekspor',
          deskripsi: 'Dikeringkan menggunakan solar dryer dome higienis, warna putih cerah beb...',
          kategori: 'Turunan',
          hargaPerSatuan: 13500,
          satuan: 'kg',
          stok: 600,
          imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
          isTersedia: true,
          petaniId: petani.id,
        },
      ],
    });
    console.log('3 Produk awal petani berhasil dibuat!');
  } else {
    console.log('Produk sudah ada:', existingCount);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
