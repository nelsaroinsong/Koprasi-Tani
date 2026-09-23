"use client"

import * as React from "react"
import { Sprout } from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const activeTeam = teams[0] || {
    name: "Sinar Pagi Sejahtera",
    logo: Sprout,
    plan: "Koperasi Minahasa Utara",
  }

  const LogoComponent = activeTeam.logo || Sprout

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="hover:bg-emerald-50/70 transition rounded-xl p-2 cursor-default group"
        >
          <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-700/20 ring-2 ring-emerald-500/20">
            <LogoComponent className="size-5 text-emerald-100" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight ml-1">
            <span className="truncate font-bold text-slate-900 text-xs">
              {activeTeam.name}
            </span>
            <span className="truncate text-[11px] text-emerald-700 font-semibold">
              {activeTeam.plan}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
