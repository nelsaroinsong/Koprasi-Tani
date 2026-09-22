'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import MainFooter from '@/components/MainFooter';
import CartDrawer from '@/components/CartDrawer';
import TokoModal from '@/components/TokoModal';
import AlsintanModal from '@/components/AlsintanModal';
import EdukasiAiModal from '@/components/EdukasiAiModal';
import KurModal from '@/components/KurModal';
import JurnalModal from '@/components/JurnalModal';
import DashboardModal from '@/components/DashboardModal';
import { initialProducts, initialAlsintan } from '@/lib/data';
import { Product, AlsintanItem, CartItem } from '@/lib/types';
import { CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [products] = useState<Product[]>(initialProducts);
  const [alsintanList] = useState<AlsintanItem[]>(initialAlsintan);

  // Cart starts with 1 item matching the screenshot badge '1'
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      product: initialProducts[0], // Kelapa Butir Tua Minahasa
      quantity: 50,
    },
  ]);

  const [activeSection, setActiveSection] = useState<'beranda' | 'toko' | 'alsintan' | 'ai' | 'jurnal' | 'dashboard' | 'kur'>('beranda');

  // Modals & Drawers state
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [tokoModalOpen, setTokoModalOpen] = useState(false);
  const [alsintanModalOpen, setAlsintanModalOpen] = useState(false);
  const [selectedAlsintan, setSelectedAlsintan] = useState<AlsintanItem | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [kurModalOpen, setKurModalOpen] = useState(false);
  const [jurnalModalOpen, setJurnalModalOpen] = useState(false);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Cart Handlers
  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 10 }
            : item
        );
      }
      return [...prev, { product, quantity: 10 }];
    });
    showToast(`✓ ${product.name} telah ditambahkan ke Keranjang Belanja!`);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Komoditas dihapus dari keranjang.');
  };

  const handleCheckout = () => {
    alert('Pesanan komoditas telah tercatat di sistem Koperasi Sinar Pagi Sejahtera! Tim logistik Pool Airmadidi akan menyiapkan surat jalan penimbangan.');
    setCartItems([]);
    setCartDrawerOpen(false);
  };

  // Alsintan booking
  const handleSewaAlsintan = (item: AlsintanItem) => {
    setSelectedAlsintan(item);
    setAlsintanModalOpen(true);
  };

  const handleConfirmBooking = (bookingDetails: {
    item: AlsintanItem;
    date: string;
    duration: number;
    pool: string;
    withOperator: boolean;
    totalCost: number;
  }) => {
    setAlsintanModalOpen(false);
    showToast(`✓ Berhasil booking ${bookingDetails.item.name} untuk tanggal ${bookingDetails.date} di ${bookingDetails.pool}!`);
  };

  const handleOpenModal = (type: 'toko' | 'alsintan' | 'ai' | 'jurnal' | 'dashboard' | 'kur') => {
    if (type === 'toko') setTokoModalOpen(true);
    else if (type === 'ai') setAiModalOpen(true);
    else if (type === 'kur') setKurModalOpen(true);
    else if (type === 'jurnal') setJurnalModalOpen(true);
    else if (type === 'dashboard') setDashboardModalOpen(true);
    else if (type === 'alsintan') {
      setSelectedAlsintan(alsintanList[0]);
      setAlsintanModalOpen(true);
    }
  };

  const totalCartCount = cartItems.length;

  return (
    <div className="min-h-screen bg-dot-pattern text-slate-800 flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setCartDrawerOpen(true)}
        onOpenModal={handleOpenModal}
        activeSection={activeSection}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection
          onExploreToko={() => setTokoModalOpen(true)}
          onSewaAlsintan={() => {
            setSelectedAlsintan(alsintanList[0]);
            setAlsintanModalOpen(true);
          }}
          onBookingBanner={() => {
            setSelectedAlsintan(alsintanList[0]);
            setAlsintanModalOpen(true);
          }}
        />
      </main>

      {/* Footer */}
      <MainFooter
        onNavClick={(target) => {
          if (target === 'ai') setAiModalOpen(true);
          else if (target === 'kur') setKurModalOpen(true);
          else if (target === 'jurnal') setJurnalModalOpen(true);
          else if (target === 'alsintan') {
            setSelectedAlsintan(alsintanList[0]);
            setAlsintanModalOpen(true);
          } else if (target === 'toko') {
            setTokoModalOpen(true);
          }
        }}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onCheckout={handleCheckout}
      />

      {/* Toko Online Modal */}
      <TokoModal
        isOpen={tokoModalOpen}
        onClose={() => setTokoModalOpen(false)}
        products={products}
        onAddToCart={handleAddToCart}
      />

      {/* Alsintan Booking Modal */}
      <AlsintanModal
        isOpen={alsintanModalOpen}
        onClose={() => setAlsintanModalOpen(false)}
        selectedItem={selectedAlsintan}
        allItems={alsintanList}
        onConfirmBooking={handleConfirmBooking}
      />

      {/* Edukasi AI Modal */}
      <EdukasiAiModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />

      {/* KUR Scoring Modal */}
      <KurModal
        isOpen={kurModalOpen}
        onClose={() => setKurModalOpen(false)}
      />

      {/* Jurnal Panen Modal */}
      <JurnalModal
        isOpen={jurnalModalOpen}
        onClose={() => setJurnalModalOpen(false)}
      />

      {/* Dashboard Petani Modal */}
      <DashboardModal
        isOpen={dashboardModalOpen}
        onClose={() => setDashboardModalOpen(false)}
        onOpenSewa={() => {
          setSelectedAlsintan(alsintanList[0]);
          setAlsintanModalOpen(true);
        }}
        onOpenKur={() => setKurModalOpen(true)}
      />
    </div>
  );
}
