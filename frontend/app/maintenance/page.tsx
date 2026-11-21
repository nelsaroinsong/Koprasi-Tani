import type { Metadata } from 'next';
import { getMaintenanceStatus } from '@/lib/maintenance-server';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pemeliharaan Sistem | Koperasi Sinar Pagi Sejahtera',
  description: 'Sistem sedang dalam pemeliharaan terjadwal. Layanan akan segera kembali normal.',
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const status = await getMaintenanceStatus();
  return <MaintenanceScreen initialStatus={status} />;
}
