"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useAdmin } from "@/components/admin/admin-context"
import { LayoutGrid } from "lucide-react"

export function AdminBreadcrumb() {
  const { activeTab, setActiveTab } = useAdmin()
  const isDashboard = activeTab.group === 'Dashboard' || !activeTab.group

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs text-slate-500 font-medium">
        <BreadcrumbItem className="flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <BreadcrumbLink
            href="/admin"
            onClick={(e) => {
              e.preventDefault()
              setActiveTab('Dashboard', '')
            }}
            className="hover:text-slate-900 transition font-medium"
          >
            Overview
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator className="text-slate-300">
          /
        </BreadcrumbSeparator>

        <BreadcrumbItem>
          <BreadcrumbPage className="text-slate-900 font-semibold">
            {isDashboard
              ? 'Dashboard'
              : activeTab.item === 'Toko Online'
              ? 'Katalog Komoditas'
              : activeTab.item === 'Lokasi Gudang'
              ? 'Titik Lokasi Gudang'
              : activeTab.item || activeTab.group}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
