'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Search,
  CheckCircle2,
  Check,
  RefreshCw,
  Package,
  ArrowUpDown,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'PETANI' | 'PEMBELI' | 'ADMIN' | string;
  avatarUrl: string | null;
  isVerified: boolean;
  isOnboarded: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export function RecentUsersTable() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 6,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchUsers = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '6',
      });

      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching recent users:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Helper render role dengan gaya bullet dot serasi pesanan
  const renderRoleIndicator = (role: string) => {
    switch (role) {
      case 'PETANI':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Petani Mitra</span>
          </span>
        );
      case 'PEMBELI':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>Pembeli</span>
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
            <span>Administrator</span>
          </span>
        );
      default:
        return (
          <span className="text-[12.5px] text-slate-700 font-medium">
            {role}
          </span>
        );
    }
  };

  // Helper render status dengan gaya minimalis serasi pesanan
  const renderStatusIndicator = (isVerified: boolean) => {
    if (isVerified) {
      return (
        <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
          <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5] shrink-0" />
          <span>Terverifikasi</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-500">
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        <span>Menunggu Verifikasi</span>
      </span>
    );
  };

  return (
    <div
      className="rounded-2xl border border-[#E5E7EB] p-1.5"
      style={HATCHED_BG_STYLE}
    >
      {/* Outer Hatched Header Bar */}
      <div className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-slate-600 stroke-[1.8]" />
          <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">
            User Baru Mendaftar
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari user..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-[#E5E7EB] rounded-lg placeholder:text-slate-400 text-slate-800 focus:outline-none focus:border-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchUsers}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
            title="Segarkan Data Tabel"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isLoading ? 'animate-spin text-slate-800' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Inner White Table Box */}
      <div className="bg-white rounded-xl border border-[#ECEEF2] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white border-b border-[#F1F3F5]">
              <TableRow className="border-[#F1F3F5] hover:bg-transparent">
                <TableHead className="py-3 text-[12px] font-normal text-slate-400 min-w-[170px] pl-4">
                  <span className="inline-flex items-center gap-1">
                    Pengguna <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  </span>
                </TableHead>
                <TableHead className="py-3 text-[12px] font-normal text-slate-400 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Email <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  </span>
                </TableHead>
                <TableHead className="py-3 text-[12px] font-normal text-slate-400 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Peran <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  </span>
                </TableHead>
                <TableHead className="py-3 text-[12px] font-normal text-slate-400 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Kontak <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  </span>
                </TableHead>
                <TableHead className="py-3 text-[12px] font-normal text-slate-400 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Status <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  </span>
                </TableHead>
                <TableHead className="py-3 text-[12px] font-normal text-slate-400 whitespace-nowrap pr-4">
                  <span className="inline-flex items-center gap-1">
                    Tanggal <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-[#F3F4F6]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                      <span className="text-xs text-slate-400">
                        Memuat data user...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Package className="w-5 h-5 text-slate-300" />
                      <span className="text-xs font-medium text-slate-500">
                        {searchQuery
                          ? 'Tidak ada user yang sesuai dengan pencarian.'
                          : 'Belum ada data user terdaftar.'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const initial = (user.name || 'U').charAt(0).toUpperCase();
                  const registeredDate = new Date(user.createdAt)
                    .toISOString()
                    .split('T')[0];

                  return (
                    <TableRow
                      key={user.id}
                      className="cursor-default hover:bg-[#F9FAFB]/70 transition-colors border-[#F3F4F6]"
                    >
                      {/* Pengguna: Avatar + Nama */}
                      <TableCell className="py-3.5 pl-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5.5 h-5.5 rounded-full border border-slate-200 shrink-0">
                            <AvatarImage
                              src={user.avatarUrl || ''}
                              alt={user.name}
                            />
                            <AvatarFallback className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {initial}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className="text-[12.5px] font-medium text-slate-700 truncate max-w-[170px]"
                            title={user.name}
                          >
                            {user.name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="py-3.5 whitespace-nowrap text-[12.5px] text-slate-600">
                        {user.email}
                      </TableCell>

                      {/* Peran */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        {renderRoleIndicator(user.role)}
                      </TableCell>

                      {/* Kontak */}
                      <TableCell className="py-3.5 whitespace-nowrap text-[12.5px] text-slate-600">
                        {user.phone || '-'}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        {renderStatusIndicator(user.isVerified)}
                      </TableCell>

                      {/* Tanggal */}
                      <TableCell className="py-3.5 whitespace-nowrap text-[12.5px] text-slate-600 pr-4">
                        {registeredDate}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer - Format & tombol persis Pesanan Masuk */}
        <div className="px-4 py-3 bg-white border-t border-[#F1F3F5] flex items-center justify-between text-xs text-slate-500">
          <span>
            Halaman {currentPage} dari {Math.max(1, pagination.totalPages)}
            {pagination.totalCount > 0 && (
              <span className="text-slate-400 ml-1.5 font-normal">
                (Total {pagination.totalCount} user)
              </span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium transition cursor-pointer"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={currentPage >= pagination.totalPages || isLoading}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium transition cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
