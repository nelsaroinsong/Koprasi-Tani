"use client"

import * as React from "react"
import { AdminNotificationsProvider } from "@/components/admin/admin-notifications"

export type AdminTab = {
  group: string
  item: string
  payload?: any
}

type AdminContextType = {
  activeTab: AdminTab
  setActiveTab: (group: string, item: string, payload?: any) => void
}

const AdminContext = React.createContext<AdminContextType>({
  activeTab: { group: "Dashboard", item: "Ringkasan" },
  setActiveTab: () => {},
})

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTabState] = React.useState<AdminTab>({
    group: "Dashboard",
    item: "Ringkasan",
  })

  const setActiveTab = React.useCallback((group: string, item: string, payload?: any) => {
    setActiveTabState({ group, item, payload })
  }, [])

  return (
    <AdminContext.Provider value={{ activeTab, setActiveTab }}>
      <AdminNotificationsProvider>{children}</AdminNotificationsProvider>
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return React.useContext(AdminContext)
}
