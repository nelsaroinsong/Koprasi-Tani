"use client"

import * as React from "react"

export type BadgeKey = "pesananToko" | "pesananSewa" | "bagiHasil" | "petani" | "pembeli"
/** Menu yang badge-nya hilang saat dibuka (plus "bell" untuk lonceng) */
export type SeenSection = "bell" | BadgeKey
type PendingKey = "pesananToko" | "pesananSewa" | "bagiHasil"

export interface AdminNotificationItem {
  id: string
  kind: "order" | "rental" | "rental_update" | "user"
  title: string
  description: string
  at: string
  unread: boolean
  target: { group: string; item: string }
}

interface NotificationsState {
  /** Badge sidebar: item yang belum dilihat */
  badges: Record<BadgeKey, number>
  /** Total pekerjaan tertunda (tidak hilang walau sudah dilihat) */
  pending: Record<PendingKey, number>
  /** Sidik jari isi tiap menu; berubah saat ada item baru */
  signatures: Record<BadgeKey, string>
  sewaDetail: { menunggu: number; ambilHariIni: number; terlambat: number; refundDp: number }
  unreadCount: number
  items: AdminNotificationItem[]
  loaded: boolean
}

interface NotificationsContextType extends NotificationsState {
  refresh: () => void
  markSeen: (section: SeenSection) => void
}

const EMPTY: NotificationsState = {
  badges: { pesananToko: 0, pesananSewa: 0, bagiHasil: 0, petani: 0, pembeli: 0 },
  pending: { pesananToko: 0, pesananSewa: 0, bagiHasil: 0 },
  signatures: { pesananToko: "", pesananSewa: "", bagiHasil: "", petani: "", pembeli: "" },
  sewaDetail: { menunggu: 0, ambilHariIni: 0, terlambat: 0, refundDp: 0 },
  unreadCount: 0,
  items: [],
  loaded: false,
}

const POLL_MS = 30_000

const NotificationsContext = React.createContext<NotificationsContextType>({
  ...EMPTY,
  refresh: () => {},
  markSeen: () => {},
})

/** Badge sidebar & lonceng admin: polling tiap 30 detik + saat tab browser aktif kembali */
export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<NotificationsState>(EMPTY)
  const [tick, setTick] = React.useState(0)
  const refresh = React.useCallback(() => setTick((t) => t + 1), [])

  React.useEffect(() => {
    let active = true
    fetch("/api/admin/notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d?.success) return
        setState({
          badges: d.badges,
          pending: d.pending || { pesananToko: d.badges.pesananToko, pesananSewa: d.badges.pesananSewa, bagiHasil: d.badges.bagiHasil },
          signatures: d.signatures || EMPTY.signatures,
          sewaDetail: d.sewaDetail,
          unreadCount: d.unreadCount,
          items: d.items,
          loaded: true,
        })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [tick])

  React.useEffect(() => {
    const id = window.setInterval(refresh, POLL_MS)
    const onFocus = () => document.visibilityState === "visible" && refresh()
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener("admin-data-changed", refresh)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("admin-data-changed", refresh)
    }
  }, [refresh])

  const markSeen = React.useCallback(
    (section: SeenSection) => {
      // Optimistis: langsung hilangkan badge, lalu simpan ke server
      setState((s) =>
        section === "bell"
          ? { ...s, unreadCount: 0, items: s.items.map((n) => ({ ...n, unread: false })) }
          : { ...s, badges: { ...s.badges, [section]: 0 } }
      )
      // Segarkan SETELAH server menyimpan, agar badge tidak muncul lagi karena data lama
      fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      })
        .catch(() => {})
        .finally(refresh)
    },
    [refresh]
  )

  const value = React.useMemo(() => ({ ...state, refresh, markSeen }), [state, refresh, markSeen])
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useAdminNotifications() {
  return React.useContext(NotificationsContext)
}

/**
 * Muat ulang tabel otomatis saat ada aktivitas baru di menu ini (pesanan masuk, pendaftar baru, dll.).
 * Tidak dipanggil saat pertama kali data notifikasi dimuat.
 */
export function useRefetchOnNewActivity(section: BadgeKey, refetch: () => void) {
  const { signatures, loaded } = useAdminNotifications()
  const signature = signatures[section]
  const lastRef = React.useRef<string | null>(null)
  const refetchRef = React.useRef(refetch)
  React.useEffect(() => {
    refetchRef.current = refetch
  }, [refetch])
  React.useEffect(() => {
    if (!loaded) return
    if (lastRef.current !== null && lastRef.current !== signature) refetchRef.current()
    lastRef.current = signature
  }, [signature, loaded])
}

/** Panggil setelah admin mengubah data (setujui sewa, proses pesanan, dsb.) agar badge segera diperbarui */
export function notifyAdminDataChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("admin-data-changed"))
}

export function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (!count) return null
  return (
    <span
      className={`min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center tabular-nums shrink-0 ${className}`}
      aria-label={`${count} baru`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
