"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useAdmin } from "@/components/admin/admin-context"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    badge?: string
    items?: {
      title: string
      url: string
      badge?: string
    }[]
  }[]
}) {
  const { activeTab, setActiveTab } = useAdmin()

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-[#526046] px-2 py-1.5">
        Menu Utama
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {items.map((item) => {
          const hasChildren = Boolean(item.items && item.items.length > 0);

          if (!hasChildren) {
            const isCurrentActive = activeTab.group === item.title;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isCurrentActive}
                  tooltip={item.title}
                  className={
                    isCurrentActive
                      ? "bg-[#EAEDE7] text-[#1a2610] font-bold shadow-2xs rounded-xl"
                      : "text-[#526046] hover:bg-[#EAEDE7]/60 hover:text-[#1a2610] font-medium transition rounded-xl"
                  }
                >
                  <a
                    href={item.url}
                    onClick={(e) => {
                      if (item.url === "/admin" || item.url === "#") {
                        e.preventDefault();
                      }
                      setActiveTab(item.title, "");
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer w-full"
                  >
                    {item.icon && (
                      <item.icon
                        className={
                          isCurrentActive
                            ? "w-4 h-4 text-[#233414] shrink-0"
                            : "w-4 h-4 text-[#708063] group-hover:text-[#1a2610] shrink-0 transition"
                        }
                      />
                    )}
                    <span className="text-xs">{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] font-semibold text-[#526046] bg-white border border-[#dce1d6] px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                        {item.badge}
                      </span>
                    )}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          const isGroupActive = activeTab.group === item.title;

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || isGroupActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={
                      isGroupActive
                        ? "text-[#1a2610] font-bold hover:bg-[#EAEDE7]/70 rounded-xl"
                        : "text-[#526046] hover:bg-[#EAEDE7]/60 hover:text-[#1a2610] font-medium transition rounded-xl"
                    }
                  >
                    {item.icon && (
                      <item.icon
                        className={
                          isGroupActive
                            ? "w-4 h-4 text-[#233414] shrink-0"
                            : "w-4 h-4 text-[#708063] shrink-0"
                        }
                      />
                    )}
                    <span className="text-xs">{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto mr-1 text-[10px] font-semibold text-[#526046] bg-[#f4f5f1] border border-[#dce1d6] px-1.5 py-0.5 rounded-full shrink-0">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="ml-1 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 w-3.5 h-3.5 text-[#708063] group-hover:text-[#1a2610]" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="border-[#dce1d6] ml-3.5 pl-2 space-y-0.5 mt-1">
                    {item.items?.map((subItem) => {
                      const isCurrentActive =
                        activeTab.group === item.title &&
                        activeTab.item === subItem.title;

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isCurrentActive}
                            className={
                              isCurrentActive
                                ? "bg-[#EAEDE7] text-[#1a2610] font-bold rounded-lg text-xs"
                                : "text-[#526046] hover:bg-[#EAEDE7]/50 hover:text-[#1a2610] font-medium transition rounded-lg text-xs"
                            }
                          >
                            <a
                              href={subItem.url}
                              onClick={(e) => {
                                if (subItem.url === "/admin" || subItem.url === "#") {
                                  e.preventDefault();
                                }
                                setActiveTab(item.title, subItem.title);
                              }}
                              className="cursor-pointer flex items-center justify-between w-full"
                            >
                              <span>{subItem.title}</span>
                              {subItem.badge && (
                                <span className="text-[10px] font-semibold text-[#708063] bg-white border border-[#dce1d6] px-1.5 py-0.2 rounded-full shrink-0">
                                  {subItem.badge}
                                </span>
                              )}
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
