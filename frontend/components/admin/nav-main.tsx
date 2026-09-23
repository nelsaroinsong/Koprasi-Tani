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
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { activeTab, setActiveTab } = useAdmin()

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/70 px-2 py-1.5">
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
                      ? "bg-emerald-50 text-emerald-800 font-bold border-r-2 border-emerald-600 shadow-2xs hover:bg-emerald-50 hover:text-emerald-900 rounded-xl"
                      : "text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-800 transition rounded-xl"
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
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer"
                  >
                    {item.icon && (
                      <item.icon
                        className={
                          isCurrentActive
                            ? "w-4 h-4 text-emerald-700 shrink-0"
                            : "w-4 h-4 text-slate-500 group-hover:text-emerald-700 shrink-0 transition"
                        }
                      />
                    )}
                    <span className="text-xs">{item.title}</span>
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
                        ? "text-emerald-900 font-bold hover:bg-emerald-50/70 rounded-xl"
                        : "text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-800 transition rounded-xl"
                    }
                  >
                    {item.icon && (
                      <item.icon
                        className={
                          isGroupActive
                            ? "w-4 h-4 text-emerald-700 shrink-0"
                            : "w-4 h-4 text-slate-500 shrink-0"
                        }
                      />
                    )}
                    <span className="text-xs">{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="border-emerald-100 ml-3.5 pl-2 space-y-0.5 mt-1">
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
                                ? "bg-emerald-50 text-emerald-800 font-bold border-l-2 border-emerald-600 rounded-lg text-xs"
                                : "text-slate-600 hover:bg-emerald-50/50 hover:text-emerald-800 transition rounded-lg text-xs"
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
                              className="cursor-pointer"
                            >
                              <span>{subItem.title}</span>
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
