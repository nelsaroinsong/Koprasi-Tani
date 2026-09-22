'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import MainFooter from '@/components/MainFooter';
import CartDrawer from '@/components/CartDrawer';
import { initialProducts } from '@/lib/data';
import { Product, CartItem } from '@/lib/types';
import { CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [products] = useState<Product[]>(initialProducts);

  // Cart starts with 1 item matching the screenshot badge '1'
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      product: initialProducts[0], // Kelapa Butir Tua Minahasa
      quantity: 50,
    },
  ]);

  const [activeSection, setActiveSection] = useState<'beranda' | 'toko' | 'alsintan'>('beranda');

  // Modals & Drawers state
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

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

  const handleOpenModal = (type: 'toko' | 'alsintan') => {
    if (type === 'toko') {
      alert('Layanan Toko Online Komoditas sedang dalam penyesuaian.');
    } else if (type === 'alsintan') {
      alert('Layanan Sewa Alsintan & Traktor sedang dalam penyesuaian.');
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
          onExploreToko={() => handleOpenModal('toko')}
          onSewaAlsintan={() => handleOpenModal('alsintan')}
          onBookingBanner={() => handleOpenModal('alsintan')}
        />
      </main>

      {/* Footer */}
      <MainFooter
        onNavClick={(target) => handleOpenModal(target)}
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
    </div>
  );
}
