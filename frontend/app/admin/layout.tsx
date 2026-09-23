import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { AdminProvider } from "@/components/admin/admin-context"
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
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
        <SidebarInset className="bg-slate-50/70 min-h-screen">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-emerald-950/10 bg-white/90 backdrop-blur-md px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              <SidebarTrigger className="-ml-1 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition rounded-xl p-2 cursor-pointer" />
              <Separator
                orientation="vertical"
                className="mr-2 h-4 bg-emerald-200"
              />
              <AdminBreadcrumb />
            </div>

            {/* Right Header Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Panel Koperasi Aktif</span>
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminProvider>
  )
}

