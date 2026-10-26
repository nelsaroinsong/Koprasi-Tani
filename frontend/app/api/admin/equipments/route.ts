import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';
import { validateIndonesianPhone } from '@/lib/phone-validation';
import {
  readEquipmentsFromFile,
  writeEquipmentsToFile,
  type EquipmentItem,
} from '@/lib/equipments';

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

    let list: EquipmentItem[] = [];

    try {
      const dbEquipments: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM equipments ORDER BY "createdAt" DESC`
      );

      if (dbEquipments && dbEquipments.length > 0) {
        list = dbEquipments.map((eq) => ({
          id: eq.id,
          nama: eq.nama,
          kategori: eq.kategori,
          deskripsi: eq.deskripsi,
          spesifikasi: eq.spesifikasi,
          hargaSewa: Number(eq.hargaSewa),
          satuanSewa: eq.satuanSewa || 'hari',
          biayaOperator: eq.biayaOperator !== null ? Number(eq.biayaOperator) : null,
          stokUnit: Number(eq.stokUnit) || 1,
          kondisi: eq.kondisi || 'Sangat Baik',
          imageUrl: eq.imageUrl,
          isTersedia: eq.isTersedia ?? true,
          kontakPj: eq.kontakPj,
          createdAt: eq.createdAt,
          updatedAt: eq.updatedAt,
        }));
      }
    } catch {}

    if (list.length === 0) {
      list = readEquipmentsFromFile();
    }

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

    const newId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const newEquipment: EquipmentItem = {
      id: newId,
      nama: nama.trim(),
      kategori: kategori.trim(),
      deskripsi: deskripsi?.trim() || null,
      spesifikasi: spesifikasi?.trim() || null,
      hargaSewa: Number(hargaSewa),
      satuanSewa: satuanSewa || 'hari',
      biayaOperator: biayaOperator !== null && biayaOperator !== undefined ? Number(biayaOperator) : null,
      stokUnit: Number(stokUnit) || 1,
      kondisi: kondisi || 'Sangat Baik',
      imageUrl: imageUrl || null,
      isTersedia: Boolean(isTersedia),
      kontakPj: cleanKontakPj,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Simpan ke PostgreSQL database
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO equipments (id, nama, kategori, deskripsi, spesifikasi, "hargaSewa", "satuanSewa", "biayaOperator", "stokUnit", kondisi, "imageUrl", "isTersedia", "kontakPj", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
        newEquipment.id,
        newEquipment.nama,
        newEquipment.kategori,
        newEquipment.deskripsi,
        newEquipment.spesifikasi,
        newEquipment.hargaSewa,
        newEquipment.satuanSewa,
        newEquipment.biayaOperator,
        newEquipment.stokUnit,
        newEquipment.kondisi,
        newEquipment.imageUrl,
        newEquipment.isTersedia,
        newEquipment.kontakPj
      );
    } catch (e) {
      console.warn('Gagal insert ke PostgreSQL, menyimpan ke JSON fallback:', e);
    }

    // Simpan juga ke file fallback
    const currentList = readEquipmentsFromFile();
    currentList.unshift(newEquipment);
    writeEquipmentsToFile(currentList);

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

    // Update di PostgreSQL
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE equipments 
         SET nama = COALESCE($2, nama),
             kategori = COALESCE($3, kategori),
             deskripsi = $4,
             spesifikasi = $5,
             "hargaSewa" = COALESCE($6, "hargaSewa"),
             "satuanSewa" = COALESCE($7, "satuanSewa"),
             "biayaOperator" = $8,
             "stokUnit" = COALESCE($9, "stokUnit"),
             kondisi = COALESCE($10, kondisi),
             "imageUrl" = COALESCE($11, "imageUrl"),
             "isTersedia" = COALESCE($12, "isTersedia"),
             "kontakPj" = $13,
             "updatedAt" = NOW()
         WHERE id = $1`,
        id,
        nama,
        kategori,
        deskripsi,
        spesifikasi,
        hargaSewa !== undefined ? Number(hargaSewa) : null,
        satuanSewa,
        biayaOperator !== undefined && biayaOperator !== null ? Number(biayaOperator) : null,
        stokUnit !== undefined ? Number(stokUnit) : null,
        kondisi,
        imageUrl,
        isTersedia !== undefined ? Boolean(isTersedia) : null,
        cleanUpdatedKontakPj ?? kontakPj
      );
    } catch (e) {
      console.warn('Gagal update ke PostgreSQL:', e);
    }

    // Update di file JSON fallback
    const currentList = readEquipmentsFromFile();
    const idx = currentList.findIndex((item) => item.id === id);
    if (idx > -1) {
      currentList[idx] = {
        ...currentList[idx],
        ...(nama && { nama }),
        ...(kategori && { kategori }),
        deskripsi: deskripsi !== undefined ? deskripsi : currentList[idx].deskripsi,
        spesifikasi: spesifikasi !== undefined ? spesifikasi : currentList[idx].spesifikasi,
        ...(hargaSewa !== undefined && { hargaSewa: Number(hargaSewa) }),
        ...(satuanSewa && { satuanSewa }),
        biayaOperator: biayaOperator !== undefined ? (biayaOperator !== null ? Number(biayaOperator) : null) : currentList[idx].biayaOperator,
        ...(stokUnit !== undefined && { stokUnit: Number(stokUnit) }),
        ...(kondisi && { kondisi }),
        ...(imageUrl && { imageUrl }),
        ...(isTersedia !== undefined && { isTersedia: Boolean(isTersedia) }),
        kontakPj: kontakPj !== undefined ? kontakPj : currentList[idx].kontakPj,
        updatedAt: new Date().toISOString(),
      };
      writeEquipmentsToFile(currentList);
    }

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

    try {
      if (typeof isTersedia === 'boolean') {
        await prisma.$executeRawUnsafe(
          `UPDATE equipments SET "isTersedia" = $1, "updatedAt" = NOW() WHERE id = $2`,
          isTersedia,
          id
        );
      }
      if (kondisi) {
        await prisma.$executeRawUnsafe(
          `UPDATE equipments SET kondisi = $1, "updatedAt" = NOW() WHERE id = $2`,
          kondisi,
          id
        );
      }
      if (typeof stokUnit === 'number') {
        await prisma.$executeRawUnsafe(
          `UPDATE equipments SET "stokUnit" = $1, "updatedAt" = NOW() WHERE id = $2`,
          stokUnit,
          id
        );
      }
    } catch {}

    const currentList = readEquipmentsFromFile();
    const idx = currentList.findIndex((item) => item.id === id);
    if (idx > -1) {
      if (typeof isTersedia === 'boolean') currentList[idx].isTersedia = isTersedia;
      if (kondisi) currentList[idx].kondisi = kondisi;
      if (typeof stokUnit === 'number') currentList[idx].stokUnit = stokUnit;
      currentList[idx].updatedAt = new Date().toISOString();
      writeEquipmentsToFile(currentList);
    }

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

    for (const id of idsToDelete) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM equipments WHERE id = $1`, id);
      } catch {}
    }

    const currentList = readEquipmentsFromFile();
    const deleteSet = new Set(idsToDelete);
    const updated = currentList.filter((item) => !deleteSet.has(item.id));
    writeEquipmentsToFile(updated);

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
