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

export function AdminBreadcrumb() {
  const { activeTab } = useAdmin()

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink
            href="/admin"
            className="text-slate-500 hover:text-emerald-700 font-medium text-xs transition"
          >
            {activeTab.group}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {activeTab.item ? (
          <>
            <BreadcrumbSeparator className="hidden md:block text-slate-300" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-emerald-800 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {activeTab.item}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
