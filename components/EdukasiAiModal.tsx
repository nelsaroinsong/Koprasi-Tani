'use client';

import React, { useState } from 'react';
import { X, Sparkles, AlertTriangle, CheckCircle2, Leaf, Send, RefreshCw } from 'lucide-react';

interface EdukasiAiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sampleDiseases = [
  {
    id: 'd-1',
    crop: 'Kelapa',
    name: 'Busuk Pucuk Kelapa (Phytophthora palmivora)',
    symptoms: 'Daun muda menguning, pelepah patah, titik tumbuh membusuk dan berbau khas.',
    treatment: 'Pangkas pelepah terserang, semprot fungisida organik Trichoderma harzianum 20gr/liter di sekitar pucuk, tingkatkan drainase parit.',
    prevention: 'Jaga kelembaban kebun di musim penghujan Likupang, berikan kapur dolomit di pangkal batang.',
  },
  {
    id: 'd-2',
    crop: 'Jagung',
    name: 'Ulat Grayak Jagung (Spodoptera frugiperda / FAW)',
    symptoms: 'Daun berlubang tak beraturan dengan serbuk kotoran mirip serbuk gergaji di pucuk daun muda.',
    treatment: 'Aplikasi agen hayati Beauveria bassiana atau Bacillus thuringiensis dosis 5ml/liter air saat sore hari, semprot tepat ke gulungan daun.',
    prevention: 'Tanam serempak se-kecamatan Kauditan/Airmadidi, pasang perangkap feromon 4 titik per hektar.',
  },
  {
    id: 'd-3',
    crop: 'Jagung',
    name: 'Penyakit Bulai Jagung (Peronosclerospora maydis)',
    symptoms: 'Daun bergaris kuning keputihan memanjang sejajar tulang daun, tanaman kerdil tanpa tongkol.',
    treatment: 'Cabut dan musnahkan tanaman terserang agar spora tidak menyebar ke tanaman sehat.',
    prevention: 'Gunakan benih bersertifikat tahan bulai, perlakuan benih (seed treatment) dengan fungisida metalaksil sebelum tanam.',
  },
  {
    id: 'd-4',
    crop: 'Kelapa',
    name: 'Kumbang Tanduk (Oryctes rhinoceros)',
    symptoms: 'Pelepah daun muda tergunting membentuk huruf V khas saat mekar.',
    treatment: 'Pemberian serbuk jamur Metarhizium anisopliae pada sarang tumpukan batang kelapa lapuk.',
    prevention: 'Bersihkan sisa batang kelapa mati di kebun, pasang ferotrap di pinggir blok lahan.',
  },
];

export default function EdukasiAiModal({ isOpen, onClose }: EdukasiAiModalProps) {
  const [selectedCrop, setSelectedCrop] = useState<'Semua' | 'Kelapa' | 'Jagung'>('Semua');
  const [activeDisease, setActiveDisease] = useState(sampleDiseases[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [chatLog, setChatLog] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: 'Halo Pak Lio! Saya Agronom AI Koperasi Sinar Pagi Sejahtera. Ada gejala hama atau penyakit pada tanaman kelapa atau jagung Anda di Minahasa Utara yang ingin didiagnosis?',
    },
  ]);

  if (!isOpen) return null;

  const handleSendQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;

    const userText = customQuestion;
    setChatLog((prev) => [...prev, { sender: 'user', text: userText }]);
    setCustomQuestion('');

    setTimeout(() => {
      let reply = 'Berdasarkan analisis kondisi iklim Minahasa Utara saat ini, pastikan kebersihan sanitasi gulma di sekitar perakaran dan berikan pupuk kalium organik tinggi untuk memperkuat dinding sel tanaman.';
      if (userText.toLowerCase().includes('jagung') || userText.toLowerCase().includes('ulat')) {
        reply = 'Untuk hama ulat pada jagung, disarankan semprot agen hayati Beauveria bassiana saat jam 16.00-18.00 WITA. Anda juga bisa menyewa Drone Sprayer Koperasi untuk tuntas 1 ha dalam 20 menit!';
      } else if (userText.toLowerCase().includes('kelapa') || userText.toLowerCase().includes('kuning')) {
        reply = 'Gejala daun kelapa menguning bisa dipicu defisiensi hara Magnesium atau serangan jamur Phytophthora pasca hujan deras. Tambahkan dolomit 1.5kg/pohon dan bersihkan lumut pelepah.';
      }
      setChatLog((prev) => [...prev, { sender: 'ai', text: reply }]);
    }, 600);
  };

  const filteredDiseases = sampleDiseases.filter(
    (d) => selectedCrop === 'Semua' || d.crop === selectedCrop
  );

  return (
    <div id="edukasi-ai-backdrop" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="edukasi-ai-modal"
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-accent text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">Klinik Tanaman &amp; Edukasi AI</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-forest-700">
                  Minut Agritech
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Deteksi Hama, Penyakit Kelapa &amp; Jagung Sesuai Standar Agronomi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Filter Crop */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Database Penyakit Lapangan
            </p>
            <div className="flex gap-1.5">
              {(['Semua', 'Kelapa', 'Jagung'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCrop(c)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    selectedCrop === c
                      ? 'bg-forest-accent text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Disease Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredDiseases.map((dis) => (
              <div
                key={dis.id}
                onClick={() => setActiveDisease(dis)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  activeDisease.id === dis.id
                    ? 'border-forest-accent bg-emerald-50/60 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                      {dis.crop}
                    </span>
                    {activeDisease.id === dis.id && (
                      <span className="text-[10px] font-bold text-forest-accent">Aktif Ditinjau</span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{dis.name}</h4>
                </div>
              </div>
            ))}
          </div>

          {/* Active Disease Diagnosis Panel */}
          {activeDisease && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-extrabold text-slate-900">{activeDisease.name}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <p className="font-bold text-rose-700 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Gejala Khas
                  </p>
                  <p className="text-slate-600 leading-relaxed">{activeDisease.symptoms}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <p className="font-bold text-emerald-700 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tindakan Pengendalian
                  </p>
                  <p className="text-slate-600 leading-relaxed">{activeDisease.treatment}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <p className="font-bold text-forest-accent flex items-center gap-1 mb-1">
                    🛡️ Pencegahan Berkala
                  </p>
                  <p className="text-slate-600 leading-relaxed">{activeDisease.prevention}</p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive AI Chat Box */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div className="p-3.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Konsultasi Langsung dengan Asisten AI Koperasi
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Online • Siap Menjawab
              </span>
            </div>

            <div className="p-4 space-y-3 max-h-48 overflow-y-auto text-xs bg-slate-50/40">
              {chatLog.map((chat, idx) => (
                <div
                  key={idx}
                  className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl leading-relaxed ${
                      chat.sender === 'user'
                        ? 'bg-forest-accent text-white rounded-tr-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                    }`}
                  >
                    {chat.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendQuestion} className="p-3 border-t border-slate-200 flex gap-2 bg-white">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Tanyakan dosis pupuk, gejala daun bercak, atau waktu panen jagung..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-forest-accent focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-forest-accent text-white rounded-xl text-xs font-bold hover:bg-forest-800 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Kirim</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
