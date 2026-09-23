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
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <AdminBreadcrumb />
            </div>
          </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminProvider>
  )
}
