import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { AdminProvider } from "@/components/admin/admin-context"
import { AdminTopHeader } from "@/components/admin/admin-top-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();

  // Proteksi server-side: hanya akun ber-role ADMIN yang dapat mengakses
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/admin-koperasi-sinar-pagi-sejahtera?error=unauthorized');
  }

  return (
    <AdminProvider>
      <SidebarProvider>
        <AppSidebar user={session.user} />
        <SidebarInset className="bg-[#f4f5f1] min-h-screen min-w-0 max-w-full overflow-x-hidden font-sans selection:bg-[#D4F63D] selection:text-slate-950">
          <AdminTopHeader user={session.user} />
          <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5 lg:p-7 min-w-0 max-w-full w-full">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminProvider>
  )
}

