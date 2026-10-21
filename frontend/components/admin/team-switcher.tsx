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
          className="hover:bg-[#EAEDE7]/80 transition rounded-2xl p-2 cursor-default group"
        >
          <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-[#233414] border border-[#344d15] shadow-sm shadow-[#233414]/15 p-1.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/koperasi-logo-lime.png"
              alt="Logo Koperasi Sinar Pagi Sejahtera"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight ml-1.5 min-w-0">
            <span className="truncate font-bold text-[#1a2610] text-[13px] tracking-tight">
              {activeTeam.name}
            </span>
            <span className="truncate text-[10px] text-[#526046] font-medium">
              {activeTeam.plan}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
