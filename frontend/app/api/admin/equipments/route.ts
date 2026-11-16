import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';
import { validateIndonesianPhone } from '@/lib/phone-validation';
import { getEquipments, toEquipmentItem } from '@/lib/equipments';
import { clampJeda } from '@/lib/equipment-rentals';

export const dynamic = 'force-dynamic';

async function checkIsAdmin(session: any): Promise<boolean> {
  if (!session?.user?.email) return false;
  if ((session.user as any)?.role === 'ADMIN') return true;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { role: true },
    });
    return dbUser?.role === 'ADMIN';
  } catch {
    return false;
  }
}

// GET: Ambil seluruh daftar alat untuk manajemen admin
export async function GET() {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const list = await getEquipments();

    return NextResponse.json({
      success: true,
      equipments: list,
    });
  } catch (error: any) {
    console.error('Error saat admin mengambil data sewa alat:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat inventaris sewa alat' },
      { status: 500 }
    );
  }
}

// POST: Admin menambahkan unit alat baru
export async function POST(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const {
      nama,
      kategori,
      deskripsi,
      spesifikasi,
      hargaSewa,
      satuanSewa = 'hari',
      biayaOperator = null,
      stokUnit = 1,
      kondisi = 'Sangat Baik',
      imageUrl = null,
      isTersedia = true,
      kontakPj = '081944078924',
      jedaHari = 1,
    } = body;

    if (!nama || !kategori || hargaSewa === undefined) {
      return NextResponse.json(
        { error: 'Nama alat, kategori, dan harga sewa wajib diisi' },
        { status: 400 }
      );
    }

    const adminEmail = session?.user?.email;
    let cleanKontakPj = '';
    if (adminEmail) {
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
        select: { phone: true },
      });
      if (adminUser?.phone) {
        cleanKontakPj = adminUser.phone;
      }
    }

    if (!cleanKontakPj) {
      if (kontakPj && String(kontakPj).trim()) {
        const phoneValidation = validateIndonesianPhone(String(kontakPj).trim(), false);
        if (phoneValidation.isValid) {
          cleanKontakPj = phoneValidation.cleanPhone;
        }
      }
    }

    if (!cleanKontakPj) {
      cleanKontakPj = '081944078924';
    }

    const created = await prisma.equipment.create({
      data: {
        nama: nama.trim(),
        kategori: kategori.trim(),
        deskripsi: deskripsi?.trim() || null,
        spesifikasi: spesifikasi?.trim() || null,
        hargaSewa: Number(hargaSewa),
        satuanSewa: satuanSewa || 'hari',
        biayaOperator:
          biayaOperator !== null && biayaOperator !== undefined ? Number(biayaOperator) : null,
        stokUnit: Math.max(0, Number(stokUnit) || 1),
        kondisi: kondisi || 'Sangat Baik',
        imageUrl: imageUrl || null,
        isTersedia: Boolean(isTersedia),
        kontakPj: cleanKontakPj,
        jedaHari: clampJeda(jedaHari),
      },
    });
    const newEquipment = toEquipmentItem(created);

    // Hapus cache Redis
    await delCachePattern('equipments:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Alat "${newEquipment.nama}" berhasil ditambahkan ke inventaris.`,
      equipment: newEquipment,
    });
  } catch (error: any) {
    console.error('Error saat admin menambah alat:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menambahkan alat pertanian' },
      { status: 500 }
    );
  }
}

// PUT: Admin memperbarui data unit alat yang ada
export async function PUT(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      nama,
      kategori,
      deskripsi,
      spesifikasi,
      hargaSewa,
      satuanSewa,
      biayaOperator,
      stokUnit,
      kondisi,
      imageUrl,
      isTersedia,
      kontakPj,
      jedaHari,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID alat wajib disertakan' }, { status: 400 });
    }

    let cleanUpdatedKontakPj: string | undefined = undefined;
    const adminEmail = session?.user?.email;
    if (adminEmail) {
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
        select: { phone: true },
      });
      if (adminUser?.phone) {
        cleanUpdatedKontakPj = adminUser.phone;
      }
    }

    if (!cleanUpdatedKontakPj && kontakPj !== undefined) {
      if (typeof kontakPj === 'string' && kontakPj.trim()) {
        const phoneValidation = validateIndonesianPhone(kontakPj.trim(), false);
        if (phoneValidation.isValid) {
          cleanUpdatedKontakPj = phoneValidation.cleanPhone;
        }
      }
    }

    if (!cleanUpdatedKontakPj && kontakPj !== undefined) {
      cleanUpdatedKontakPj = '081944078924';
    }

    const existing = await prisma.equipment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Unit alat tidak ditemukan' }, { status: 404 });
    }

    await prisma.equipment.update({
      where: { id },
      data: {
        ...(nama && { nama: String(nama).trim() }),
        ...(kategori && { kategori: String(kategori).trim() }),
        ...(deskripsi !== undefined && { deskripsi: deskripsi ? String(deskripsi).trim() : null }),
        ...(spesifikasi !== undefined && { spesifikasi: spesifikasi ? String(spesifikasi).trim() : null }),
        ...(hargaSewa !== undefined && { hargaSewa: Number(hargaSewa) }),
        ...(satuanSewa && { satuanSewa }),
        ...(biayaOperator !== undefined && {
          biayaOperator: biayaOperator !== null ? Number(biayaOperator) : null,
        }),
        ...(stokUnit !== undefined && { stokUnit: Math.max(0, Number(stokUnit) || 0) }),
        ...(kondisi && { kondisi }),
        ...(imageUrl && { imageUrl }),
        ...(isTersedia !== undefined && { isTersedia: Boolean(isTersedia) }),
        ...(jedaHari !== undefined && { jedaHari: clampJeda(jedaHari) }),
        ...((cleanUpdatedKontakPj ?? kontakPj) !== undefined && {
          kontakPj: cleanUpdatedKontakPj ?? kontakPj,
        }),
      },
    });

    // Invalidate Redis
    await delCachePattern('equipments:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Data alat berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('Error saat admin mengedit alat:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memperbarui alat pertanian' },
      { status: 500 }
    );
  }
}

// PATCH: Toggle ketersediaan atau kondisi unit secara cepat
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const { id, isTersedia, kondisi, stokUnit } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID alat wajib disertakan' }, { status: 400 });
    }

    await prisma.equipment.update({
      where: { id },
      data: {
        ...(typeof isTersedia === 'boolean' && { isTersedia }),
        ...(kondisi && { kondisi }),
        ...(typeof stokUnit === 'number' && { stokUnit: Math.max(0, stokUnit) }),
      },
    });

    await delCachePattern('equipments:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Status unit alat berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('Error saat patch status alat:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal mengubah status alat' },
      { status: 500 }
    );
  }
}

// DELETE: Hapus unit alat dari inventaris (Tunggal atau Banyak)
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    let idsToDelete: string[] = [];

    if (idParam) {
      idsToDelete.push(idParam);
    } else if (idsParam) {
      idsToDelete = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      try {
        const body = await request.json();
        if (Array.isArray(body.ids)) {
          idsToDelete = body.ids;
        } else if (body.id) {
          idsToDelete = [body.id];
        }
      } catch {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'ID unit alat wajib disertakan' }, { status: 400 });
    }

    // Alat yang punya riwayat sewa tidak dihapus agar riwayat transaksi tetap utuh
    const withHistory = await prisma.equipmentRentalItem.findMany({
      where: { equipmentId: { in: idsToDelete } },
      select: { equipmentId: true, nama: true },
      distinct: ['equipmentId'],
    });
    if (withHistory.length > 0) {
      return NextResponse.json(
        {
          error: `Alat ${withHistory
            .map((h) => `"${h.nama}"`)
            .join(', ')} memiliki riwayat sewa sehingga tidak dapat dihapus. Nonaktifkan ketersediaannya saja.`,
        },
        { status: 400 }
      );
    }

    await prisma.equipment.deleteMany({ where: { id: { in: idsToDelete } } });

    await delCachePattern('equipments:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: `${idsToDelete.length} unit alat berhasil dihapus dari inventaris.`,
      deletedIds: idsToDelete,
    });
  } catch (error: any) {
    console.error('Error saat admin menghapus alat:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menghapus alat pertanian' },
      { status: 500 }
    );
  }
}
