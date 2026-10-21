"use client"

import * as React from "react"
import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  ShieldCheck,
  UserCog,
} from "lucide-react"
import { signOut } from "next-auth/react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { AdminProfileModal } from "@/components/admin/admin-profile-modal"

export function NavUser({
  user: initialUser,
}: {
  user: {
    name: string
    email: string
    avatar: string
    phone?: string
  }
}) {
  const { isMobile } = useSidebar()
  const [user, setUser] = React.useState(initialUser)
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false)

  // Sync if initialUser changes
  React.useEffect(() => {
    setUser(initialUser)
  }, [initialUser])

  const userInitial = (user.name || 'A').charAt(0).toUpperCase()

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-[#EAEDE7] data-[state=open]:text-[#1a2610] hover:bg-[#EAEDE7]/80 transition rounded-2xl cursor-pointer p-2"
              >
                <Avatar className="h-9 w-9 rounded-xl border border-[#dce1d6] shadow-2xs">
                  <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                  <AvatarFallback className="rounded-xl bg-[#233414] text-[#D4F63D] font-bold text-xs">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-bold text-[#1a2610] text-xs">
                    {user.name}
                  </span>
                  <span className="truncate text-[11px] text-[#526046] font-medium">
                    {user.email}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-[#708063]" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-max min-w-[300px] max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl p-2 shadow-xl border-slate-200 bg-white"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={8}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 p-2.5 text-left bg-emerald-50/70 rounded-xl mb-1.5 border border-emerald-100/80 min-w-0">
                  <Avatar className="h-10 w-10 rounded-xl border border-emerald-300 shadow-2xs shrink-0">
                    <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                    <AvatarFallback className="rounded-xl bg-emerald-200 text-emerald-900 font-bold text-xs">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="min-w-0 flex-1 overflow-hidden relative">
                        <span
                          className="block font-bold text-slate-900 text-xs whitespace-nowrap overflow-hidden [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_85%,transparent_100%)] pr-1"
                          title={user.name}
                        >
                          {user.name}
                        </span>
                      </div>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <div className="overflow-hidden relative mt-0.5">
                      <span
                        className="block text-[11px] text-slate-500 whitespace-nowrap overflow-hidden [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_85%,transparent_100%)] pr-1"
                        title={user.email}
                      >
                        {user.email}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setIsEditProfileOpen(true)}
                  className="cursor-pointer gap-2.5 py-2 px-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 transition"
                >
                  <UserCog className="w-4 h-4 text-emerald-700" />
                  <span>Edit Profil & Keamanan</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={async () => {
                  await signOut({ redirect: false });
                  window.location.replace('/admin-koperasi-sinar-pagi-sejahtera');
                }}
                className="cursor-pointer gap-2.5 py-2 px-2.5 rounded-lg text-xs font-semibold text-red-600 focus:text-red-700 focus:bg-red-50 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span>Keluar dari Admin</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Edit Profile Modal */}
      <AdminProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={user}
        onUserUpdated={(updated) => {
          setUser((prev) => ({ ...prev, ...updated }));
        }}
      />
    </>
  )
}
