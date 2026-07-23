import React, { useState, useMemo, useEffect } from 'react';
import { Upload, FileSpreadsheet, Download, ChevronDown, ChevronUp, ChevronRight, CheckCircle, AlertCircle, Trash2, Calendar, Clock, User, FileText, Search, Filter, LogOut, Menu, Bell, MessageSquare, Database, ClipboardList, Settings, ChevronsLeft, ChevronsRight, LayoutDashboard, Plus, Minus, Activity, Share2, Copy, ClipboardCheck, Truck, Leaf, Flame, Zap, Cog, Wind, Hammer, Wrench, BookOpen, Eye, EyeOff } from 'lucide-react';
import { parseMasterEQ, parseRegionalMP, exportToSAP, parseHierarchyReference } from './utils/excel';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import DailyDashboard from './components/DailyDashboard';
import MonitoringDashboard from './components/MonitoringDashboard';
import SAPVerificationView from './components/SAPVerificationView';
import VehicleMonitoringView from './components/VehicleMonitoringView';
import SAPTransactionGuideView from './components/SAPTransactionGuideView';
import BeritaAcaraView from './components/BeritaAcaraView';
import Dendrogram from './components/ui/Dendrogram';
import AfraChatbot from './components/AfraChatbot';
import WorkOrderMonitoringView from './components/WorkOrderMonitoringView';
import AdminInbox from './components/AdminInbox';
import { supabase } from './lib/supabase';
import {
  fetchMasterEquipment, uploadMasterEquipment,
  fetchHierarchyData, uploadHierarchyData,
  bulkUpdateReadings, loginUser,
  saveSystemConfig, getSystemConfig, fetchAllUsers,
  createUser, updateUser, deleteUser
} from './lib/supabaseService';

function LoginView({ onLogin }) {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Rotating background slideshow state
  const backgroundImages = [
    '/sawit1.jpg',
    '/sawit.jpg',
    '/boiler.jg.jpeg',
    '/decanter.jpg',
    '/SCREW PRESS.jpg',
    '/digester.jpg',
    '/HORIZONTAL STERILIZER.jpg'
  ];
  const [currentBgIdx, setCurrentBgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBgIdx((prevIdx) => (prevIdx + 1) % backgroundImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!supabase) {
      // Fallback for completely local offline testing without Supabase
      if (password === '123' && nik.length === 8) {
        onLogin({ nik, role: nik === '00000000' ? 'Admin' : 'Unit', plant: nik === '00000000' ? 'ALL' : '5F01', name: nik === '00000000' ? 'Admin Offline' : 'Unit Offline' });
      } else {
        setError('Koneksi Supabase gagal dan kredensial offline salah (Gunakan 123).');
      }
      setLoading(false);
      return;
    }

    const { data, error } = await loginUser(nik, password);
    setLoading(false);

    if (error) {
      setError(error);
    } else if (data) {
      onLogin({ nik: data.nik, role: data.role, plant: data.plant, name: data.name, password: data.password || password });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {/* ===== HERO SECTION: 2-Column Layout ===== */}
      <div className="flex h-screen">
      {/* Left Side - Vibrant Corporate Branding Panel */}
      <div 
        className="hidden lg:flex lg:w-[50%] relative flex-col justify-between p-16 text-white overflow-hidden bg-[#047857]"
      >
        {/* Background Images Slideshow with Crossfade */}
        {backgroundImages.map((imgSrc, idx) => (
          <div
            key={imgSrc}
            className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out scale-105 ${
              idx === currentBgIdx ? 'opacity-40 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            style={{ backgroundImage: `url('${imgSrc}')` }}
          />
        ))}
        {/* Fresh Emerald Gradient Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-[#064e3b] via-[#047857]/90 to-[#10b981]/50 mix-blend-multiply" />

        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Decorative elements removed for a quieter, cleaner look */}
        </div>

        {/* Top Hierarchy Logos (Danantara -> BUMN -> Holding -> PTPN) */}
        <div className="relative z-10 flex items-center gap-4 bg-white/95 backdrop-blur-xs px-5 py-2.5 rounded-2xl border border-white/10 shadow-md w-fit">
          <img src="/danantara-indonesia_800.png" alt="Danantara" className="h-7 object-contain" />
          <div className="w-[1px] h-6 bg-slate-200" />
          <img src="/Logo_BUMN_Untuk_Indonesia_2020.svg.webp" alt="BUMN" className="h-5.5 object-contain" />
          <div className="w-[1px] h-6 bg-slate-200" />
          <img src="/Logo_Holding_Perkebunan_Nusantara_III.png" alt="Holding Perkebunan" className="h-7.5 object-contain" />
          <div className="w-[1px] h-6 bg-slate-200" />
          <img src="/logo ptpnimages.png" alt="PTPN" className="h-7.5 object-contain" />
        </div>

        {/* Center Big Typography */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <span className="text-[10px] font-bold text-green-100 uppercase tracking-widest bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/20">
            PT Perkebunan Nusantara IV Regional V
          </span>
          <h1 className="text-5xl font-black mt-6 mb-8 leading-[1.1] tracking-tight text-white drop-shadow-sm">
            Plant Maintenance<br/>
            <span className="text-green-300 drop-shadow-md">Regional V PTPN IV</span>
          </h1>
          <p className="text-emerald-50 text-sm leading-relaxed mb-4 font-medium">
            Modul Plant Maintenance (PM) menangani pemeliharaan mesin, kendaraan, alat berat, serta proses perencanaan, pembuatan jadwal, dan fasilitas kontrol pemeliharaan secara efisien.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-white/60 font-medium">
          &copy; 2026 PT Perkebunan Nusantara IV. All rights reserved.
        </div>
      </div>

      {/* Right Side - Clean High-Contrast Login Panel with Tech Pattern & Palm Watermark */}
      <div className="w-full lg:w-[50%] flex flex-col justify-center px-8 md:px-20 py-12 bg-[#f8fafc] shadow-2xl relative z-10 border-l border-slate-100 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:24px_24px] overflow-hidden">
        {/* Faint Palm Plantation Watermark Texture */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.06] grayscale scale-105 pointer-events-none"
          style={{ backgroundImage: "url('/sawit.jpg')" }}
        />
        {/* Subtle Decorative Ambient Glowing Orbs */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-200/10 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute -top-10 right-1/4 w-60 h-60 bg-teal-100/20 rounded-full blur-3xl pointer-events-none z-0" />
        
        <div className="max-w-md w-full mx-auto bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100/80 relative z-10">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#064e3b]/10 p-2 rounded-xl border border-[#064e3b]/20">
                <Leaf size={24} className="text-[#064e3b]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">PTPN IV REGIONAL V</h2>
                <p className="text-[10px] text-slate-500 font-bold">Modul PM SAP</p>
              </div>
            </div>
          </div>

          <h2 className="text-[28px] font-black text-slate-800 mb-2 tracking-tight leading-tight">
            Modul PM SAP
          </h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">Silakan otentikasi dengan NIK Anda.</p>

          {error && (
            <div className="bg-red-50 text-red-700 p-3.5 rounded-xl mb-6 text-sm font-medium border border-red-200 flex items-center gap-2.5">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nomor Induk Karyawan (NIK)</label>
              <input 
                type="text" 
                maxLength="8"
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                placeholder="Contoh: 12345678"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] focus:outline-none transition-colors text-sm font-medium shadow-sm"
                required
                autoFocus
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] focus:outline-none transition-colors text-sm font-medium shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2 relative z-20">
              <button disabled={loading} type="submit" className="w-full bg-[#064e3b] hover:bg-[#065f46] text-white font-bold py-3.5 px-4 rounded-xl transition-colors hover:shadow-lg hover:shadow-[#064e3b]/20 disabled:opacity-50 text-sm tracking-wide">
                {loading ? 'Otentikasi...' : 'Masuk ke Dashboard'}
              </button>
            </div>
            
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              {/* Trigger link */}
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors underline-offset-4 hover:underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Tidak Dapat Login
              </button>
            </div>

            {/* ===== MODAL DIALOG ===== */}
            {showHelp && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                onClick={() => setShowHelp(false)}
              >
                <div
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 relative"
                  style={{ animation: 'dialogPop 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Close button */}
                  <button
                    onClick={() => setShowHelp(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>

                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-center text-base font-black text-slate-800 mb-1">Tidak Dapat Login?</h3>
                  <p className="text-center text-[12px] text-slate-500 mb-5 leading-relaxed">
                    Silahkan hubungi <span className="font-bold text-slate-700">Keyuser PM</span><br/>untuk mendapatkan bantuan akses.
                  </p>

                  {/* WhatsApp button */}
                  <a
                    href={`https://wa.me/6281251334618?text=${encodeURIComponent('Tidak Dapat Login\n\nUnit             : \nUser ID/NIK : \n\nMohon Bantuannya Tim Keyuser, Terima Kasih 🙏')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowHelp(false)}
                    className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-bold py-3 px-4 rounded-2xl transition-colors shadow-md hover:shadow-lg hover:shadow-[#25D366]/30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Chat WhatsApp Keyuser PM
                  </a>

                  {/* Dismiss */}
                  <button
                    onClick={() => setShowHelp(false)}
                    className="mt-3 w-full text-[11px] text-slate-400 hover:text-slate-600 transition-colors py-1"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
      </div>

      {/* ===== PM KNOWLEDGE SECTION: Full-Width Below Hero ===== */}
      <div style={{ position: 'relative', background: 'linear-gradient(-45deg, #f0fdf4, #ecfdf5, #f0f9ff, #f9fafb)', backgroundSize: '400% 400%', animation: 'gradientAnimation 15s ease infinite', overflow: 'hidden' }}>


        {/* Floating bg images */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <img src="/HORIZONTAL STERILIZER.jpg" alt="" style={{ position: 'absolute', top: '-5%', right: '-8%', width: '42%', opacity: 0.065, filter: 'grayscale(100%) blur(1px)', animation: 'floatSlow1 20s ease-in-out infinite', borderRadius: '24px' }} />
          <img src="/boiler.jg.jpeg" alt="" style={{ position: 'absolute', bottom: '8%', left: '-6%', width: '35%', opacity: 0.065, filter: 'grayscale(100%) blur(1px)', animation: 'floatSlow2 25s ease-in-out infinite', borderRadius: '24px' }} />
          <img src="/SCREW PRESS.jpg" alt="" style={{ position: 'absolute', top: '40%', right: '5%', width: '28%', opacity: 0.045, filter: 'grayscale(100%) blur(2px)', animation: 'floatSlow1 22s ease-in-out infinite', borderRadius: '24px' }} />
          <div style={{ position: 'absolute', top: '10%', left: '20%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '80px 40px' }}>

          {/* Section intro header */}
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '99px', padding: '6px 16px', marginBottom: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Panduan Referensi SAP PM PTPN IV</span>
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#064e3b', margin: '0 0 16px 0', letterSpacing: '-0.02em', lineHeight: 1.15 }}>Mengenal Plant Maintenance</h2>
            <p style={{ fontSize: '1.05rem', color: '#374151', maxWidth: '680px', margin: '0 auto', lineHeight: 1.7 }}>
              <strong style={{ color: '#064e3b' }}>Plant Maintenance (PM)</strong> adalah modul SAP yang mengelola seluruh siklus pemeliharaan aset fisik perusahaan, mulai dari perencanaan rutin, penanganan kerusakan, pencatatan jam kerja, hingga pelaporan biaya secara terintegrasi di lingkungan <strong style={{ color: '#064e3b' }}>PTPN IV Regional V</strong>.
            </p>
          </div>

          <div style={{ marginBottom: '72px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: 900, fontSize: '15px', flexShrink: 0 }}>1</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>Bagan Alur Proses Bisnis SAP PM</h3>
              </div>
            </div>
            <p style={{ fontSize: '13.5px', color: '#6b7280', marginBottom: '32px', lineHeight: 1.6 }}>
              Transaksi ERP SAP PM di PTPN terbagi dalam <strong style={{ color: '#064e3b' }}>3 pilar utama</strong> yang semuanya bermuara pada konfirmasi kerja dan penutupan Work Order:
            </p>

            <Dendrogram />
          </div>

          {/* Section 2: Master Data */}
          <div style={{ marginBottom: '72px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: 900, fontSize: '15px', flexShrink: 0 }}>2</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>Struktur Organisasi & Master Data</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {[
                { title: 'Functional Location', icon: '📍', accent: '#1d4ed8', iconBg: '#dbeafe', border: '#bfdbfe', bg: '#eff6ff', desc: 'Menentukan area fisik mesin di pabrik, misal: Stasiun Sterilizer, Stasiun Press, Stasiun Clarification. Menjadi "alamat" setiap mesin di SAP.' },
                { title: 'Equipment Master', icon: '⚙️', accent: '#7c3aed', iconBg: '#ede9fe', border: '#ddd6fe', bg: '#f5f3ff', desc: 'Registrasi detail fisik aset: nomor seri, merek, tahun operasi yang ditautkan ke Functional Location sebagai identitas unik mesin.' },
                { title: 'Bill of Material (BOM)', icon: '📋', accent: '#b45309', iconBg: '#fef3c7', border: '#fde68a', bg: '#fffbeb', desc: 'Daftar suku cadang yang terikat pada tiap mesin untuk mempermudah perencanaan pengadaan material saat pemeliharaan berlangsung.' },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg, border: `1.5px solid ${item.border}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: item.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{item.icon}</div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: item.accent, margin: 0 }}>{item.title}</p>
                  <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: 1.65 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: 4 explanation cards */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: 900, fontSize: '15px', flexShrink: 0 }}>3</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>Penjelasan Bagan Transaksi SAP PM</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {[
                { icon: '🔧', label: 'PM02 Preventive Maintenance', tag: 'Terencana', tagBg: '#3b82f6', border: '#bfdbfe', bg: '#eff6ff', iconBg: '#dbeafe', desc: 'Perawatan rutin terjadwal berdasarkan kalender atau jam jalan alat. Jadwal dibuat lewat IP41/IP42, lalu IP30 memicu Work Order (IW31) secara otomatis saat jatuh tempo. Tujuannya: mencegah kerusakan sebelum terjadi.' },
                { icon: '⚠️', label: 'PM01 Corrective Maintenance', tag: 'Temuan', tagBg: '#f59e0b', border: '#fde68a', bg: '#fffbeb', iconBg: '#fef3c7', desc: 'Penanganan kerusakan yang ditemukan operator/teknisi. Dimulai dari Notification (IW21), lalu dibuatkan Work Order (IW31) untuk merencanakan kebutuhan mekanik dan estimasi suku cadang.' },
                { icon: '💼', label: 'PM04 Investment Order (Project Maintenance)', tag: 'Project Maintenance', tagBg: '#ec4899', border: '#fbcfe8', bg: '#fdf2f8', iconBg: '#fbcfe8', desc: 'Work Order untuk proyek modifikasi aset, penambahan kapasitas mesin, atau penggantian unit baru (Capital Expense). Terintegrasi dengan WBS Element dan Modul Project System (PS).' },
                { icon: '🏁', label: 'Tahap Penyelesaian (Closing)', tag: 'Wajib', tagBg: '#10b981', border: '#6ee7b7', bg: '#f0fdf4', iconBg: '#d1fae5', desc: 'Semua alur berakhir di sini. ① IW41: Eksekusi & Konfirmasi Kerja IW41 jam kerja teknisi di lapangan. ② TECO via IW32: Penyelesaian Teknis TECO / IW32 setelah pekerjaan selesai.' },
              ].map((t, i) => (
                <div key={i} style={{ background: t.bg, border: `1.5px solid ${t.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{t.icon}</div>
                      <p style={{ fontSize: '14px', fontWeight: 800, color: '#111827', margin: 0 }}>{t.label}</p>
                    </div>
                    <span style={{ display: 'inline-block', background: t.tagBg, color: '#fff', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', whiteSpace: 'nowrap', flexShrink: 0 }}>{t.tag}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.65 }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '64px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Berdasarkan SE-07/06S2/II/2021 · Petunjuk Pelaksanaan Input Transaksi ERP SAP PTPN VI · Edisi 1</p>
          </div>

        </div>
      </div>
    </div>
  );
}

const getInitials = (name) => {
  return (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const unitNamesMap = {
  '5F01': 'PABRIK GUNUNG MELIAU',
  '5F04': 'PABRIK RIMBA BELIAN',
  '5F07': 'PABRIK NGABANG',
  '5F08': 'PABRIK PARINDU',
  '5F09': 'PABRIK KEMBAYAN',
  '5F14': 'PABRIK PAMUKAN',
  '5F15': 'PABRIK PELAIHARI',
  '5F21': 'PABRIK SAMUNTAI',
  '5F22': 'PABRIK LONG PINANG',
  '5AKN': 'AKUNTANSI DAN KEUANGAN',
  '5TEP': 'TEKNIK DAN PENGOLAHAN'
};

const getUnitName = (plant, existingName) => {
  if (existingName && existingName !== '-') return existingName;
  return unitNamesMap[plant] || '';
};

function App() {
  const [masterMap, setMasterMap] = useState(null);
  const [templateData, setTemplateData] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [sapSyncedDates, setSapSyncedDates] = useState([]);
  const [hierarchyData, setHierarchyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    nik: '', name: '', password: '123', role: 'Unit', plant: '', jabatan: '', unit_name: ''
  });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('Password baru dan konfirmasi password tidak cocok.');
      return;
    }
    
    if (passwordForm.new.length < 8) {
      setPasswordError('Password baru minimal 8 karakter.');
      return;
    }

    const currentPwd = currentUser?.password || '123';
    if (currentPwd !== passwordForm.current) {
      setPasswordError('Password saat ini salah.');
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await updateUser(currentUser.nik, { password: passwordForm.new });
    setIsUpdatingPassword(false);

    if (error) {
      setPasswordError(error.message || 'Gagal mengubah password');
    } else {
      setPasswordSuccess('Password berhasil diubah.');
      setPasswordForm({ current: '', new: '', confirm: '' });
      const updatedUser = { ...currentUser, password: passwordForm.new };
      setCurrentUser(updatedUser);
      localStorage.setItem('sap_current_user', JSON.stringify(updatedUser));
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsSavingUser(true);
    let res;
    if (editingUser) {
      res = await updateUser(editingUser.nik, userForm);
    } else {
      res = await createUser(userForm);
    }
    
    if (res.error) {
      alert('Gagal menyimpan user: ' + JSON.stringify(res.error));
    } else {
      const { data } = await fetchAllUsers();
      if (data) setAllUsers(data);
      setIsUserModalOpen(false);
    }
    setIsSavingUser(false);
  };

  const handleDeleteUser = async (nik) => {
    if (window.confirm(`Yakin ingin menghapus user dengan NIK ${nik}?`)) {
      setLoadingUsers(true);
      const res = await deleteUser(nik);
      if (res.error) {
        alert('Gagal menghapus: ' + JSON.stringify(res.error));
      } else {
        const { data } = await fetchAllUsers();
        if (data) setAllUsers(data);
      }
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [currentUser, setCurrentUser] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('hideNav') === 'true') {
      return { nik: 'SYSTEM', name: 'System Auto-Capture', role: 'Admin', plant: 'ALL' };
    }
    const saved = localStorage.getItem('sapApp_user');
    return saved ? JSON.parse(saved) : null;
  });

  const isAdmin = currentUser && (
    currentUser.role === 'Admin' || 
    currentUser.role?.toUpperCase() === 'ADMIN' || 
    currentUser.role?.toUpperCase() === 'REGIONAL'
  );
  
  
  const [docDetails, setDocDetails] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    readBy: '',
    shortText: `HM - ${format(new Date(), 'dd/MM/yyyy')}`
  });

  // Load data on mount — Supabase first, fallback to localStorage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load doc details from localStorage (user-specific, no need for Supabase)
        const savedDocDetails = localStorage.getItem('sapApp_docDetails');
        if (savedDocDetails) {
          const parsed = JSON.parse(savedDocDetails);
          setDocDetails(prev => ({ ...prev, readBy: parsed.readBy || '' }));
        }

        if (supabase) {
          // --- Load from Supabase ---
          const [eqResult, hResult, masterMapResult, templateResult, syncResult] = await Promise.all([
            fetchMasterEquipment(),
            fetchHierarchyData(),
            getSystemConfig('master_map'),
            getSystemConfig('template_data'),
            getSystemConfig('sap_synced_dates')
          ]);

          if (masterMapResult.data) {
            setMasterMap(new Map(masterMapResult.data));
          }

          if (hResult.data) {
            setHierarchyData(hResult.data);
          }

          if (templateResult.data) {
            setTemplateData(templateResult.data);
          }

          if (syncResult.data) {
            setSapSyncedDates(syncResult.data);
          }

          // Merge template equipments with master_equipment from Supabase AND masterMap
          const templateEqs = templateResult.data?.equipments || [];
          const masterEqs = eqResult.data || [];
          // Build a map from template equipments (they have rowIndex needed for SAP export)
          const mergedMap = new Map(templateEqs.map(e => [e.eqNum, { ...e }]));
          // Add from master_equipment table and backfill missing plants
          masterEqs.forEach(e => {
            if (mergedMap.has(e.eqNum)) {
              const existing = mergedMap.get(e.eqNum);
              if (!existing.plant && e.plant) existing.plant = e.plant;
            } else {
              mergedMap.set(e.eqNum, e);
            }
          });
          // Also add from masterMap (used by Master Data tab) and backfill missing plants
          if (masterMapResult.data) {
            const mmEntries = masterMapResult.data;
            mmEntries.forEach(([eqNum, info]) => {
              const plant = typeof info === 'string' ? info : info.plant;
              const description = typeof info === 'string' ? eqNum : info.description || eqNum;
              if (mergedMap.has(eqNum)) {
                const existing = mergedMap.get(eqNum);
                if (!existing.plant && plant) existing.plant = plant;
              } else {
                mergedMap.set(eqNum, { eqNum, plant, description, type: 'Induk', reading: 0, induk: description });
              }
            });
          }
          setEquipments(Array.from(mergedMap.values()));

          if (!templateResult.data && eqResult.data && eqResult.data.length > 0) {
            // Fallback: if no template data but master_equipment exists
            const eqs = eqResult.data;
            const hData = hResult.data || null;
            const finalEqs = hData ? applyHierarchy(eqs, hData) : eqs;
            setEquipments(finalEqs);
            setTemplateData({ headers: {}, originalData: [], equipments: finalEqs });
          }
        }
      } catch (e) {
        console.error('Failed to load data', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Sync equipment readings to Supabase when they change
  useEffect(() => {
    if (!supabase || !templateData || equipments.length === 0) return;
    const timer = setTimeout(() => {
      bulkUpdateReadings(equipments).catch(console.error);
    }, 2000); // debounce 2 seconds
    return () => clearTimeout(timer);
  }, [equipments]);

  const handleDocDetailsChange = (field, value) => {
    setDocDetails(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'date') {
        const parts = value.split('-');
        if (parts.length === 3) {
          next.shortText = `HM - ${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      localStorage.setItem('sapApp_docDetails', JSON.stringify(next));
      return next;
    });
  };

  const applyHierarchy = (eqs, hData) => {
    if (!hData || !hData.mapping) return eqs;
    return eqs.map(eq => {
      const hInfo = hData.mapping[eq.description];
      if (hInfo) {
        return { 
          ...eq, 
          induk: hInfo.induk || eq.description,
          sInduk: hInfo.sInduk || null,
          type: hInfo.type || 'Sub',
        };
      }
      return {
        ...eq,
        induk: eq.parentEquipment || eq.description,
        sInduk: null,
        type: 'Induk'
      };
    });
  };

  const handleHierarchyUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const data = await parseHierarchyReference(file);
      setHierarchyData(data);
      // Also save to Supabase
      if (supabase) await uploadHierarchyData(data);
      
      if (templateData && equipments.length > 0) {
        const newEqs = applyHierarchy(equipments, data);
        setEquipments(newEqs);
        if (supabase) await uploadMasterEquipment(newEqs);
      }
      setError(null);
    } catch (err) {
      setError("Gagal membaca Referensi Hierarki: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMasterUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const newMap = await parseMasterEQ(file);
      
      // REPLACE (bukan merge) — file baru sepenuhnya menggantikan data lama
      setMasterMap(newMap);
      if (supabase) await saveSystemConfig('master_map', Array.from(newMap.entries()));
      setError(null);
      alert(`Berhasil memperbarui Master EQ! Total data sekarang: ${newMap.size}`);
    } catch (err) {
      setError("Gagal membaca Master EQ: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = null; // Reset input
    }
  };

  const handleTemplateUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!masterMap) {
      setError("Silakan upload Master EQ terlebih dahulu!");
      return;
    }
    try {
      setLoading(true);
      const result = await parseRegionalMP(file, masterMap);
      const finalEqs = hierarchyData ? applyHierarchy(result.equipments, hierarchyData) : result.equipments;
      result.equipments = finalEqs;
      setTemplateData(result);
      setEquipments(finalEqs);
      
      // Save everything to Supabase
      if (supabase) {
        await saveSystemConfig('template_data', result);
        const { error: upErr } = await uploadMasterEquipment(finalEqs);
        if (upErr) console.error('Supabase upload error:', upErr);
      }
      setError(null);
    } catch (err) {
      setError("Gagal membaca Template: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua data yang tersimpan?")) {
      localStorage.removeItem('sapApp_masterMap');
      localStorage.removeItem('sapApp_templateData');
      localStorage.removeItem('sapApp_hierarchyData');
      // Clear Supabase
      if (supabase) {
        await supabase.from('master_equipment').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('hierarchy_data').delete().neq('id', 0);
      }
      setMasterMap(null);
      setTemplateData(null);
      setEquipments([]);
      setHierarchyData(null);
    }
  };

  const handleReadingChange = (indukName, value) => {
    setEquipments(prev => prev.map(eq => 
      eq.induk === indukName ? { ...eq, reading: value } : eq
    ));
  };

  const handleExport = () => {
    if (!templateData) return;
    exportToSAP(templateData.headers, templateData.originalData, equipments, docDetails);
  };

  // Filter equipments based on search query
  const filteredEquipments = useMemo(() => {
    if (!searchQuery.trim()) return equipments;
    const query = searchQuery.toLowerCase();
    
    // Find all equipments that match the query
    const matchedEqs = equipments.filter(eq => 
      (eq.eqNum && String(eq.eqNum).toLowerCase().includes(query)) ||
      (eq.description && eq.description.toLowerCase().includes(query)) ||
      (eq.measuringPoint && String(eq.measuringPoint).toLowerCase().includes(query)) ||
      (eq.induk && eq.induk.toLowerCase().includes(query)) ||
      (eq.sInduk && eq.sInduk.toLowerCase().includes(query))
    );

    // Get all parent names that are involved
    const matchedInduks = new Set(matchedEqs.map(eq => eq.induk));
    
    // Return all equipments that belong to these matched parents
    // So the entire group is shown if ANY member matches
    return equipments.filter(eq => matchedInduks.has(eq.induk));
  }, [equipments, searchQuery]);

  // Group equipments by plant (using filtered equipments)
  const groupedEquipments = useMemo(() => {
    const groups = {};
    filteredEquipments.forEach(eq => {
      if (!groups[eq.plant]) groups[eq.plant] = [];
      groups[eq.plant].push(eq);
    });
    
    // Role-based filtering
    if (currentUser?.role === 'Unit') {
      const allowedPlant = currentUser.plant;
      const unitGroups = {};
      if (groups[allowedPlant]) {
        unitGroups[allowedPlant] = groups[allowedPlant];
      }
      return unitGroups;
    }
    
    return groups;
  }, [filteredEquipments, currentUser]);

  // Calculate summary metrics for the Input Harian
  const totalEquipmentCount = useMemo(() => {
    let count = 0;
    Object.values(groupedEquipments).forEach(eqs => count += eqs.length);
    return count;
  }, [groupedEquipments]);

  const filledEquipmentCount = useMemo(() => {
    let count = 0;
    Object.values(groupedEquipments).forEach(eqs => {
      count += eqs.filter(eq => eq.reading !== undefined && eq.reading !== '').length;
    });
    return count;
  }, [groupedEquipments]);

  const pendingEquipmentCount = totalEquipmentCount - filledEquipmentCount;

  if (!currentUser) {
    return (
      <LoginView 
        onLogin={(user) => {
          setCurrentUser(user);
          localStorage.setItem('sapApp_user', JSON.stringify(user));
        }} 
      />
    );
  }

  const isScreenshotMode = new URLSearchParams(window.location.search).get('screenshotMode') === 'true';

  if (isScreenshotMode) {
    return (
      <div className="bg-white">
        <VehicleMonitoringView currentUser={currentUser} screenshotMode={true} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:24px_24px] print:h-auto print:overflow-visible print:bg-white">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#0f172a]/40 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          group fixed md:relative h-full bg-[#064e3b] text-white flex flex-col transition-colors duration-300 shadow-2xl z-50 border-r border-[#065f46] overflow-hidden print:hidden
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0'} 
          ${isSidebarOpen && !isMobileMenuOpen ? 'md:w-64' : 'md:w-[72px] md:hover:w-64'}
        `}
      >
        {/* Grain Noise Overlay */}
        <div 
          className="absolute inset-0 z-0 opacity-10 pointer-events-none mix-blend-overlay" 
          style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}
        ></div>

        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10 min-h-[64px] relative z-10">
          <span className={`font-extrabold text-[10px] uppercase tracking-widest text-slate-400 pl-2 ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
            PM REGIONAL 5
          </span>
          <button onClick={() => {
            if (window.innerWidth < 768) {
              setIsMobileMenuOpen(!isMobileMenuOpen);
            } else {
              setIsSidebarOpen(!isSidebarOpen);
            }
          }} className="p-2 hover:bg-white/10 rounded-xl text-green-100 hover:text-white transition-colors mx-auto md:hidden">
            <ChevronsLeft size={20} />
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:block p-2 hover:bg-white/10 rounded-xl text-green-100 hover:text-white transition-colors mx-auto">
            <Menu size={20} />
          </button>
        </div>
        
        {/* Navigation List Grouped by SAP PM Hierarchy */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-4 px-3 relative z-10">
          {/* Group 1: Master Data */}
          <div className="space-y-1">
            <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
              Master Data (PM-EQ)
            </p>
            <button 
              onClick={() => {
                setActiveTab('master');
                window.history.pushState({}, '', '?tab=master');
                setIsMobileMenuOpen(false);
              }} 
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'master' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
              title="Master Data Equipment"
            >
              <Database size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
              <span className={`text-xs font-semibold ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                Master Data Alat
              </span>
            </button>
          </div>

          {/* Group 2: Logbook / Input */}
          <div className="space-y-1">
            <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
              Logbook Transaksi (IK11)
            </p>
            <button 
              onClick={() => {
                setActiveTab('dashboard');
                window.history.pushState({}, '', window.location.pathname);
                setIsMobileMenuOpen(false);
              }} 
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'dashboard' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
              title="Jam Jalan Mesin Pabrik"
            >
              <LayoutDashboard size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
              <span className={`text-xs font-semibold ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                Jam Jalan Mesin Pabrik
              </span>
            </button>

            <button 
              onClick={() => {
                setActiveTab('vehicle');
                window.history.pushState({}, '', '?tab=vehicle');
                setIsMobileMenuOpen(false);
              }} 
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'vehicle' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
              title="Logbook Kendaraan"
            >
              <Truck size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
              <span className={`text-xs font-semibold ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                Logbook Kendaraan
              </span>
            </button>
          </div>

          {/* Group 3: Reconciliation & Reports */}
          <div className="space-y-1">
            <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
              Sinkronisasi & Laporan
            </p>
            {isAdmin && (
              <button 
                onClick={() => {
                  setActiveTab('verifikasi');
                  window.history.pushState({}, '', '?tab=verifikasi');
                  setIsMobileMenuOpen(false);
                }} 
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'verifikasi' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                title="Verifikasi Sinkronisasi SAP"
              >
                <CheckCircle size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
                <span className={`text-xs font-semibold ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                  Verifikasi SAP
                </span>
              </button>
            )}

            {currentUser?.role !== 'Unit' && (
              <>
                <button 
                  onClick={() => {
                    setActiveTab('table');
                    window.history.pushState({}, '', window.location.pathname);
                    setIsMobileMenuOpen(false);
                  }} 
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'table' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                  title="Tabel & Ekspor SAP"
                >
                  <ClipboardList size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
                  <span className={`text-xs font-semibold ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                    Tabel & Ekspor SAP
                  </span>
                </button>
              </>
            )}

            <button 
              onClick={() => {
                setActiveTab('work-order');
                window.history.pushState({}, '', '?tab=work-order');
                setIsMobileMenuOpen(false);
              }} 
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'work-order' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
              title="Monitoring Work Order"
            >
              <FileSpreadsheet size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
              <span className={`text-xs font-semibold ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                Monitoring Work Order
              </span>
            </button>

            <button 
              onClick={() => {
                setActiveTab('monitoring');
                window.history.pushState({}, '', window.location.pathname);
                setIsMobileMenuOpen(false);
              }} 
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'monitoring' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
              title="Monitoring & Kepatuhan Bulanan"
            >
              <Activity size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
              <span className={`text-xs font-semibold ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                Monitoring Bulanan
              </span>
            </button>
            
            <button 
              onClick={() => {
                setActiveTab('berita-acara');
                window.history.pushState({}, '', '?tab=berita-acara');
                setIsMobileMenuOpen(false);
              }} 
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'berita-acara' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
              title="Cetak Berita Acara Logbook"
            >
              <FileText size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
              <span className={`text-xs font-semibold truncate ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                Berita Acara
              </span>
            </button>
          </div>

          {/* Group 4: SAP PM Guide & Settings */}
          <div className="space-y-1">
            <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
              Referensi ERP SAP PM
            </p>
            <button 
              onClick={() => {
                setActiveTab('sap-guide');
                window.history.pushState({}, '', '?tab=sap-guide');
                setIsMobileMenuOpen(false);
              }} 
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'sap-guide' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
              title="Panduan T-Code SAP PM"
            >
              <BookOpen size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
              <span className={`text-xs font-semibold ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                Panduan T-Code SAP
              </span>
            </button>

            {isAdmin ? (
              <button 
                onClick={() => {
                  setActiveTab('settings');
                  setIsMobileMenuOpen(false);
                }} 
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'settings' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                title="Pengaturan Sistem"
              >
                <Settings size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
                <span className={`text-xs font-semibold ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                  Pengaturan
                </span>
                {activeTab === 'settings' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#10b981] rounded-r-full" />}
              </button>
            ) : (
              <button 
                onClick={() => {
                  setActiveTab('settings');
                  setIsMobileMenuOpen(false);
                }} 
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'settings' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                title="Informasi Akun"
              >
                <User size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
                <span className={`text-xs font-semibold ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                  Info Akun
                </span>
                {activeTab === 'settings' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#10b981] rounded-r-full" />}
              </button>
            )}

            {/* Inbox Tab - Only for Regional Admin */}
            {isAdmin && (
              <button
                onClick={() => { setActiveTab('inbox'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-colors border-l-2 ${activeTab === 'inbox' ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                title="Inbox Bantuan"
              >
                <MessageSquare size={18} className={isSidebarOpen || isMobileMenuOpen ? "mr-4" : "mx-auto group-hover:mr-4 group-hover:mx-0"} />
                <span className={`text-xs font-semibold truncate ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden group-hover:block'}`}>
                  Inbox Bantuan
                </span>
                {activeTab === 'inbox' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#10b981] rounded-r-full" />}
              </button>
            )}
          </div>
        </nav>

        {/* Sidebar Footer & Toggle */}
        <div className="hidden md:flex p-4 border-t border-white/10 justify-center relative z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-black/10 border border-white/5 hover:bg-white/10 hover:text-white rounded-xl text-green-100 transition-colors shadow-inner">
            {isSidebarOpen ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible print:w-full print:block">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-[64px] flex items-center justify-between px-4 sm:px-6 shrink-0 z-50 shadow-sm relative print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <Database className="text-[#0f766e] hidden sm:block" size={20} />
            <h1 className="text-base font-bold text-slate-800 tracking-tight">PM Regional 5</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:block text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              {format(currentTime, "dd MMMM yyyy, HH : mm : ss", { locale: id })}
            </div>

            <div className="h-6 w-px bg-slate-200"></div>
            
            <div className="relative">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                <div className="bg-[#0f766e]/10 p-2 rounded-full border border-[#0f766e]/20 text-[#0f766e]">
                  <User size={16} />
                </div>
                <div className="hidden md:flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide truncate max-w-[150px]">{currentUser.name}</span>
                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1">
                      <button 
                        onClick={() => {
                          setActiveTab('settings');
                          setIsProfileDropdownOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-lg transition-colors text-left"
                      >
                        <User size={16} className="text-slate-400" />
                        <span className="truncate">{currentUser.name}</span>
                      </button>
                    </div>
                    <div className="p-1 border-t border-slate-100">
                      <button 
                        onClick={() => {
                          setCurrentUser(null);
                          localStorage.removeItem('sapApp_user');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 font-bold hover:bg-red-50 rounded-lg transition-colors text-left"
                      >
                        <LogOut size={16} />
                        Keluar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 print:overflow-visible print:block print:p-0">
          
          {activeTab !== 'dashboard' && activeTab !== 'monitoring' && activeTab !== 'verifikasi' && activeTab !== 'berita-acara' && activeTab !== 'sap-guide' && activeTab !== 'work-order' && activeTab !== 'inbox' && (
            <div className="flex justify-between items-end mb-8">
              <h2 className="text-[26px] font-light text-slate-800 tracking-tight">
                {activeTab === 'table' && 'Tabel & Ekspor SAP'}
                {activeTab === 'master' && 'Master Data Equipment'}
                {activeTab === 'settings' && 'Pengaturan Sistem'}
                {activeTab === 'inbox' && 'Inbox Bantuan (Live Chat)'}
              </h2>
              
              {activeTab === 'table' && templateData && (
                <button 
                  onClick={handleExport}
                  className="bg-[#0cb1a8] hover:bg-teal-600 transition-colors text-white px-5 py-2.5 rounded shadow flex items-center gap-2 font-medium text-sm"
                >
                  <Download size={18} />
                  Export to SAP
                </button>
              )}
            </div>
          )}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="-mx-3 -my-3 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 h-[calc(100vh-100px)]">
              {!templateData ? (
                <div className="text-center py-24 bg-white rounded-xl shadow-sm border border-slate-200 m-8">
                  <LayoutDashboard size={64} className="mx-auto text-slate-300 mb-4" />
                  <h2 className="text-2xl font-bold text-slate-700">Data Belum Siap</h2>
                  <p className="text-slate-500 mt-2 max-w-md mx-auto">
                    Silakan pastikan Master Data dan Template telah diunggah.
                  </p>
                </div>
              ) : (
                <DailyDashboard 
                  templateData={templateData} 
                  equipments={equipments} 
                  setEquipments={setEquipments}
                  currentUser={currentUser}
                  sapSyncedDates={sapSyncedDates}
                  setSapSyncedDates={setSapSyncedDates}
                />
              )}
            </div>
          )}

          {/* TAB: MONITORING BULANAN */}
          {activeTab === 'monitoring' && (
            <div className="-mx-3 -my-3 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 h-[calc(100vh-100px)]">
              <MonitoringDashboard 
                equipments={equipments} 
                currentUser={currentUser} 
              />
            </div>
          )}

          {/* TAB: VERIFIKASI SAP */}
          {activeTab === 'verifikasi' && (
            <div className="-mx-3 -my-3 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 h-[calc(100vh-100px)]">
              <SAPVerificationView 
                equipments={equipments}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* TAB: VEHICLE MONITORING */}
          {activeTab === 'vehicle' && (
            <div className="-mx-3 -my-3 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 min-h-[calc(100vh-100px)]">
              <VehicleMonitoringView currentUser={currentUser} />
            </div>
          )}

          {/* TAB: BERITA ACARA */}
          {activeTab === 'berita-acara' && (
            <div className="-mx-3 -my-3 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 min-h-[calc(100vh-100px)]">
              <BeritaAcaraView currentUser={currentUser} />
            </div>
          )}

          {/* TAB: SAP GUIDE */}
          {activeTab === 'sap-guide' && (
            <div className="-mx-3 -my-3 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 min-h-[calc(100vh-100px)]">
              <SAPTransactionGuideView />
            </div>
          )}

          {/* TAB: WORK ORDER MONITORING */}
          {activeTab === 'work-order' && (
            <div className="-mx-3 -my-3 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 min-h-[calc(100vh-100px)]">
              <WorkOrderMonitoringView currentUser={currentUser} />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 mb-6 shadow-sm">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}

          {/* TAB: SETTINGS & PROFILE */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              
              {/* Profile Header (SSO Style - Light Mode) */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
                {/* Decorative background grid/dots */}
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0f172a 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                
                <div className="p-8 flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10">
                  <div className="w-28 h-28 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 border-4 border-white shadow-md">
                    <span className="text-3xl font-light text-emerald-600">
                      {getInitials(currentUser.name)}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h2 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">{currentUser.name || 'User'}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="font-mono text-slate-500">NIK SAP {currentUser.nik}</span>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-emerald-600 font-semibold text-sm flex items-center gap-1.5">
                        <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                        {currentUser.plant || '-'} {getUnitName(currentUser.plant, currentUser.unit_name)} I {isAdmin ? 'ADMIN' : 'USER'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="px-8 pb-8 relative z-10">
                  <div className="bg-emerald-50/50 rounded-xl p-4 flex gap-3 border border-emerald-100">
                    <svg aria-hidden="true" className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">Profile Sync Active</h4>
                      <p className="text-xs text-emerald-700/80 mt-1 leading-relaxed">Your profile is managed by your organization's Key User. Any profile changes must be requested through your system administrator.</p>
                    </div>
                  </div>
                </div>

                {/* PASSWORD CHANGE SECTION */}
                <div className="px-8 pb-8 relative z-10">
                  <div className="flex flex-col lg:flex-row gap-8 pt-8 border-t border-slate-100">
                    <div className="lg:w-1/3">
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Password</h3>
                      <p className="text-sm text-slate-500">Must be at least 8 characters long.</p>
                    </div>
                    <div className="lg:w-2/3">
                      <form onSubmit={handleUpdatePassword} className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-5">
                        {passwordError && (
                          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            {passwordError}
                          </div>
                        )}
                        {passwordSuccess && (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
                            {passwordSuccess}
                          </div>
                        )}
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-semibold text-slate-700 mb-2">Current password</label>
                          <div className="relative">
                            <input 
                              id="currentPassword"
                              type={showCurrentPassword ? 'text' : 'password'} 
                              required
                              value={passwordForm.current}
                              onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                              className="w-full bg-white border border-slate-300 rounded-lg pl-4 pr-10 py-2.5 text-slate-800 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all outline-none"
                              placeholder="Current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                            >
                              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-700 mb-2">New password</label>
                          <div className="relative">
                            <input 
                              id="newPassword"
                              type={showNewPassword ? 'text' : 'password'} 
                              required
                              minLength={8}
                              value={passwordForm.new}
                              onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                              className="w-full bg-white border border-slate-300 rounded-lg pl-4 pr-10 py-2.5 text-slate-800 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all outline-none"
                              placeholder="New password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                            >
                              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">Confirm password</label>
                          <div className="relative">
                            <input 
                              id="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'} 
                              required
                              minLength={8}
                              value={passwordForm.confirm}
                              onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                              className="w-full bg-white border border-slate-300 rounded-lg pl-4 pr-10 py-2.5 text-slate-800 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all outline-none"
                              placeholder="Confirm password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                            >
                              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button 
                            type="submit" 
                            disabled={isUpdatingPassword}
                            className="bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                          >
                            {isUpdatingPassword ? 'Updating...' : 'Update'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              {/* Only show these to Regional */}
              {isAdmin && (
                <div className="space-y-6 pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-2 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">Manajemen File Dasar</h3>
                    {(masterMap || templateData || hierarchyData) && (
                      <button 
                        onClick={handleClearData}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm shadow-sm"
                      >
                        <Trash2 size={16} />
                        Hapus Data Tersimpan
                      </button>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Upload Cards */}
                    {/* Master EQ */}
                    <div className={`p-6 rounded-2xl border-2 border-dashed transition-colors ${masterMap ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-white hover:border-blue-400'}`}>
                      <label className="flex flex-col items-center justify-center cursor-pointer h-full min-h-[160px]">
                        {masterMap ? (
                          <>
                            <CheckCircle size={40} className="text-green-500 mb-3" />
                            <span className="font-semibold text-green-700">Master EQ Tersimpan</span>
                            <span className="text-sm text-green-600 mt-1">{masterMap.size} equipment dimuat</span>
                          </>
                        ) : (
                          <>
                            <Upload size={40} className="text-slate-400 mb-3" />
                            <span className="font-semibold text-slate-700 text-center">1. Upload Master EQ.xlsx</span>
                            <span className="text-sm text-slate-500 mt-1 text-center">Klik atau drag file ke sini</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept=".xlsx, .xls" onClick={(e) => { e.target.value = ''; }} onChange={handleMasterUpload} />
                      </label>
                    </div>

                    {/* Hierarchy */}
                    <div className={`p-6 rounded-2xl border-2 border-dashed transition-colors ${hierarchyData ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-white hover:border-blue-400'}`}>
                      <label className="flex flex-col items-center justify-center cursor-pointer h-full min-h-[160px]">
                        {hierarchyData ? (
                          <>
                            <CheckCircle size={40} className="text-green-500 mb-3" />
                            <span className="font-semibold text-green-700 text-center">Referensi Dimuat</span>
                            <span className="text-sm text-green-600 mt-1 text-center">{Object.keys(hierarchyData.mapping).length} item dikenali</span>
                          </>
                        ) : (
                          <>
                            <Upload size={40} className="text-slate-400 mb-3" />
                            <span className="font-semibold text-slate-700 text-center">2. Referensi Pengelompokan</span>
                            <span className="text-sm text-slate-500 mt-1 text-center">Upload data mesin pabrik.xlsx</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept=".xlsx, .xls" onClick={(e) => { e.target.value = ''; }} onChange={handleHierarchyUpload} />
                      </label>
                    </div>

                    {/* Template */}
                    <div className={`p-6 rounded-2xl border-2 border-dashed transition-colors ${templateData ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-white hover:border-blue-400'} ${!masterMap ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <label className={`flex flex-col items-center justify-center h-full min-h-[160px] ${masterMap ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        {templateData ? (
                          <>
                            <CheckCircle size={40} className="text-green-500 mb-3" />
                            <span className="font-semibold text-green-700 text-center">Template Regional Dimuat</span>
                            <span className="text-sm text-green-600 mt-1 text-center">{equipments.length} equipment siap diisi</span>
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet size={40} className="text-slate-400 mb-3" />
                            <span className="font-semibold text-slate-700 text-center">3. Upload REGIONAL 5 MP.xlsx</span>
                            <span className="text-sm text-slate-500 mt-1 text-center">Template yang akan di-export</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept=".xlsx, .xls" onClick={(e) => { e.target.value = ''; }} onChange={handleTemplateUpload} disabled={!masterMap} />
                      </label>
                    </div>
                  </div>

                  {/* ===== DAFTAR USER (Admin Only) ===== */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#064e3b]/10 flex items-center justify-center">
                          <User size={18} className="text-[#064e3b]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Daftar User Terdaftar</h3>
                          <p className="text-[11px] text-slate-400">Total: {allUsers.length} akun aktif</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(null);
                            setUserForm({ nik: '', name: '', password: '123', role: 'Unit', plant: '', jabatan: '', unit_name: '' });
                            setIsUserModalOpen(true);
                          }}
                          className="flex items-center gap-2 text-[11px] font-bold text-white bg-[#064e3b] hover:bg-[#047857] px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                        >
                          <Plus size={12} />
                          Tambah User
                        </button>
                        <button
                        onClick={async () => {
                          setLoadingUsers(true);
                          const { data } = await fetchAllUsers();
                          if (data) setAllUsers(data);
                          setLoadingUsers(false);
                        }}
                        className="flex items-center gap-2 text-[11px] font-bold text-[#064e3b] bg-[#064e3b]/10 hover:bg-[#064e3b]/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {loadingUsers ? (
                          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                        )}
                        Muat Daftar
                      </button>
                    </div>
                    </div>

                    {allUsers.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-sm">
                        <User size={36} className="mx-auto mb-2 opacity-30" />
                        <p>Klik <strong>"Muat Daftar"</strong> untuk menampilkan user</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="flex gap-3 px-6 pt-4 pb-2">
                          <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 text-[11px] font-bold px-3 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                            Admin: {allUsers.filter(u => u.role === 'Admin').length} user
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-bold px-3 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Unit: {allUsers.filter(u => u.role === 'Unit').length} user
                          </span>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama</th>
                              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">NIK / User ID</th>
                              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit / Plant</th>
                              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                              <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {allUsers.map((u, idx) => (
                              <tr key={u.nik} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-6 py-3 text-slate-400 text-[11px]">{idx + 1}</td>
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${u.role === 'Admin' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                      {(u.name || u.nik).charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-slate-700 text-xs">{u.name || '-'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3">
                                  <code className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md">{u.nik}</code>
                                </td>
                                <td className="px-6 py-3 text-xs text-slate-500 font-medium">
                                  {u.plant ? `${u.plant} - ${getUnitName(u.plant, u.unit_name)}` : '-'}
                                </td>
                                <td className="px-6 py-3">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${u.role === 'Admin' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${u.role === 'Admin' ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        setEditingUser(u);
                                        setUserForm({
                                          nik: u.nik, name: u.name, password: '123', 
                                          role: u.role, plant: u.plant || '', 
                                          jabatan: u.jabatan || '', unit_name: u.unit_name || ''
                                        });
                                        setIsUserModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit User"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteUser(u.nik)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Hapus User"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  {/* User Modal */}
                  {isUserModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSavingUser && setIsUserModalOpen(false)}></div>
                      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                          <h3 className="text-lg font-bold text-slate-800">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h3>
                          <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                        <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">NIK SAP *</label>
                              <input required type="text" value={userForm.nik} onChange={e => setUserForm({...userForm, nik: e.target.value})} disabled={!!editingUser} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100" placeholder="1300xxxx" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                              <input required type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Nama..." />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
                              <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white">
                                <option value="Unit">Unit (User)</option>
                                <option value="Admin">Admin</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                              <input type="text" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Default: 123" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Kode Unit / Plant</label>
                              <input type="text" value={userForm.plant} onChange={e => setUserForm({...userForm, plant: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="5Fxx" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Unit Panjang</label>
                              <input type="text" value={userForm.unit_name} onChange={e => setUserForm({...userForm, unit_name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="PABRIK..." />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan</label>
                            <input type="text" value={userForm.jabatan} onChange={e => setUserForm({...userForm, jabatan: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Asisten Teknik..." />
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Batal</button>
                            <button type="submit" disabled={isSavingUser} className="px-4 py-2 text-sm font-medium text-white bg-[#064e3b] hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2">
                              {isSavingUser ? 'Menyimpan...' : 'Simpan User'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: MASTER DATA */}
          {activeTab === 'master' && (
            <div className="bg-white p-2 rounded-xl shadow border border-slate-200 min-h-full">
              <MasterDataView masterMap={masterMap} currentUser={currentUser} />
            </div>
          )}

          {/* TAB: TABEL & EKSPOR SAP */}
          {activeTab === 'table' && currentUser?.role !== 'Unit' && (
            <>
              {!templateData ? (
                <div className="text-center py-24 bg-white rounded-xl shadow-sm border border-slate-200 mt-4">
                  <LayoutDashboard size={64} className="mx-auto text-slate-300 mb-4" />
                  <h2 className="text-2xl font-bold text-slate-700">Data Belum Siap</h2>
                  <p className="text-slate-500 mt-2 max-w-md mx-auto">
                    {isAdmin 
                      ? "Silakan unggah Master Data dan Template di menu Pengaturan terlebih dahulu agar form input muncul." 
                      : "Silakan hubungi tim Regional untuk mengatur Master Data & Template pada perangkat ini."}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card 1: Total Equipment */}
                    <div className="bg-[#4a89f3] text-white p-6 rounded shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
                      <div className="relative z-10">
                        <p className="text-blue-100 text-sm font-medium mb-1">Total Equipment Tersedia</p>
                        <h3 className="text-4xl font-bold drop-shadow-sm">{totalEquipmentCount}</h3>
                      </div>
                      <Database className="absolute -right-4 -bottom-4 text-white opacity-20 w-32 h-32" />
                    </div>
                    
                    {/* Card 2: Sudah Diisi */}
                    <div className="bg-[#0cb1a8] text-white p-6 rounded shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
                      <div className="relative z-10">
                        <p className="text-teal-100 text-sm font-medium mb-1">Sudah Diisi (Selesai)</p>
                        <h3 className="text-4xl font-bold drop-shadow-sm">{filledEquipmentCount}</h3>
                      </div>
                      <CheckCircle className="absolute -right-4 -bottom-4 text-white opacity-20 w-32 h-32" />
                    </div>
                    
                    {/* Card 3: Belum Diisi */}
                    <div className="bg-[#718096] text-white p-6 rounded shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
                      <div className="relative z-10">
                        <p className="text-slate-200 text-sm font-medium mb-1">Belum Diisi (Pending)</p>
                        <h3 className="text-4xl font-bold drop-shadow-sm">{pendingEquipmentCount}</h3>
                      </div>
                      <AlertCircle className="absolute -right-4 -bottom-4 text-white opacity-10 w-32 h-32" />
                    </div>
                  </div>

                  <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Informasi Dokumen Harian</h3>
                    <div className="grid md:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Calendar size={16} className="text-slate-400" /> Measurement Date</label>
                        <input 
                          type="date" 
                          value={docDetails.date} 
                          onChange={(e) => handleDocDetailsChange('date', e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-[#4a89f3] focus:outline-none bg-slate-50 text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Clock size={16} className="text-slate-400" /> Measurement Time</label>
                        <input 
                          type="time" 
                          value={docDetails.time} 
                          onChange={(e) => handleDocDetailsChange('time', e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-[#4a89f3] focus:outline-none bg-slate-50 text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><User size={16} className="text-slate-400" /> Read By</label>
                        <input 
                          type="text" 
                          maxLength={12}
                          value={docDetails.readBy} 
                          onChange={(e) => handleDocDetailsChange('readBy', e.target.value)}
                          placeholder="Maks. 12 huruf"
                          className="w-full px-3 py-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-[#4a89f3] focus:outline-none bg-slate-50 text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><FileText size={16} className="text-slate-400" /> Short Text</label>
                        <input 
                          type="text" 
                          maxLength={30}
                          value={docDetails.shortText} 
                          onChange={(e) => handleDocDetailsChange('shortText', e.target.value)}
                          placeholder="Keterangan singkat..."
                          className="w-full px-3 py-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-[#4a89f3] focus:outline-none bg-slate-50 text-slate-700"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="text-lg font-bold text-slate-800">Daftar Equipment</h3>
                      <div className="flex items-center gap-2">
                        <button
                          id="copy-all-equipment-btn"
                          onClick={() => {
                            // Build tab-separated table: No | Plant | Equipment | Deskripsi | Measuring Point | Counter Reading
                            const header = ['No', 'Plant', 'No. Equipment', 'Deskripsi', 'Measuring Point', 'HM (Counter Reading)'].join('\t');
                            const rows = equipments.map((eq, idx) =>
                              [idx + 1, eq.plant || '', eq.eqNum || '', eq.description || eq.induk || '', eq.measuringPoint || '', eq.reading || ''].join('\t')
                            );
                            const text = [header, ...rows].join('\n');
                            navigator.clipboard.writeText(text).then(() => {
                              const btn = document.getElementById('copy-all-equipment-btn');
                              if (btn) {
                                btn.setAttribute('data-copied', 'true');
                                setTimeout(() => btn.removeAttribute('data-copied'), 2000);
                              }
                            }).catch(() => alert('Gagal menyalin ke clipboard'));
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200 hover:border-emerald-200"
                        >
                          {typeof document !== 'undefined' && document.getElementById('copy-all-equipment-btn')?.getAttribute('data-copied') ? (
                            <><ClipboardCheck size={15} className="text-green-600" /> Tersalin!</>
                          ) : (
                            <><Copy size={15} /> Salin Semua Baris ({equipments.length})</>
                          )}
                        </button>
                        <div className="relative w-72">
                          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            placeholder="Cari alat, nomor, titik ukur..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#4a89f3] focus:outline-none text-sm bg-white shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {Object.keys(groupedEquipments).length === 0 ? (
                      <div className="text-center py-16 text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
                        <Search size={48} className="mx-auto text-slate-300 mb-4" />
                        <p>Tidak ada alat yang cocok dengan "{searchQuery}"</p>
                      </div>
                    ) : (
                      Object.entries(groupedEquipments).sort(([a], [b]) => a.localeCompare(b)).map(([plant, eqs]) => (
                        <div key={plant} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                          <PlantGroup 
                            plant={plant} 
                            equipments={eqs} 
                            onReadingChange={handleReadingChange}
                            hierarchyData={hierarchyData}
                            searchQuery={searchQuery}
                          />
                        </div>
                      ))
                    )}
                  </section>
                </div>
              )}
            </>
          )}

          {activeTab === 'inbox' && currentUser?.role === 'Admin' && (
            <AdminInbox currentUser={currentUser} />
          )}

          {/* AI Assistant (Global across all tabs) */}
          <AfraChatbot currentUser={currentUser} />

        </main>
      </div>
    </div>
  );
}

const COST_CENTER_DESC = {
  "5F01STAS01": "Jembatan Timbang",
  "5F01STAS02": "Loading Ramp",
  "5F01STAS03": "Sterilizer",
  "5F01STAS04": "Rail Track",
  "5F01STAS05": "Thresser & Hoisting",
  "5F01STAS06": "Pressan",
  "5F01STAS07": "Klarifikasi",
  "5F01STAS08": "Pengolahan Inti Sawi",
  "5F01STAS09": "Boiler",
  "5F01STAS10": "Pengolahan Air",
  "5F01STAS11": "Kamar Mesin",
  "5F01STAS12": "Tangki Timbun dan Ke",
  "5F01STAS13": "Limbah",
  "5F01STAS14": "Empty Bunch Hopper",
  "5F01STAS19": "Laboratorium",
  "5F04STAS01": "Jembatan Timbang",
  "5F04STAS02": "Loading Ramp",
  "5F04STAS03": "Sterilizer",
  "5F04STAS04": "Rail Track",
  "5F04STAS05": "Thresser & Hoisting",
  "5F04STAS06": "Pressan",
  "5F04STAS07": "Klarifikasi",
  "5F04STAS08": "Pengolahan Inti Sawi",
  "5F04STAS09": "Boiler",
  "5F04STAS10": "Pengolahan Air",
  "5F04STAS11": "Kamar Mesin",
  "5F04STAS12": "Tangki Timbun dan Ke",
  "5F04STAS13": "Limbah",
  "5F04STAS14": "Empty Bunch Hopper",
  "5F04STAS19": "Laboratorium",
  "5F07STAS01": "Jembatan Timbang",
  "5F07STAS02": "Loading Ramp",
  "5F07STAS03": "Sterilizer",
  "5F07STAS04": "Rail Track",
  "5F07STAS05": "Thresser & Hoisting",
  "5F07STAS06": "Pressan",
  "5F07STAS07": "Klarifikasi",
  "5F07STAS08": "Pengolahan Inti Sawi",
  "5F07STAS09": "Boiler",
  "5F07STAS10": "Pengolahan Air",
  "5F07STAS11": "Kamar Mesin",
  "5F07STAS12": "Tangki Timbun dan Ke",
  "5F07STAS13": "Limbah",
  "5F07STAS14": "Empty Bunch Hopper",
  "5F07STAS19": "Laboratorium",
  "5F08STAS01": "Jembatan Timbang",
  "5F08STAS02": "Loading Ramp",
  "5F08STAS03": "Sterilizer",
  "5F08STAS04": "Rail Track",
  "5F08STAS05": "Thresser & Hoisting",
  "5F08STAS06": "Pressan",
  "5F08STAS07": "Klarifikasi",
  "5F08STAS08": "Pengolahan Inti Sawi",
  "5F08STAS09": "Boiler",
  "5F08STAS10": "Pengolahan Air",
  "5F08STAS11": "Kamar Mesin",
  "5F08STAS12": "Tangki Timbun dan Ke",
  "5F08STAS13": "Limbah",
  "5F08STAS14": "Empty Bunch Hopper",
  "5F08STAS19": "Laboratorium",
  "5F09STAS01": "Jembatan Timbang",
  "5F09STAS02": "Loading Ramp",
  "5F09STAS03": "Sterilizer",
  "5F09STAS05": "Thresser & Hoisting",
  "5F09STAS06": "Pressan",
  "5F09STAS07": "Klarifikasi",
  "5F09STAS08": "Pengolahan Inti Sawi",
  "5F09STAS09": "Boiler",
  "5F09STAS10": "Pengolahan Air",
  "5F09STAS11": "Kamar Mesin",
  "5F09STAS12": "Tangki Timbun dan Ke",
  "5F09STAS13": "Limbah",
  "5F09STAS14": "Empty Bunch Hopper",
  "5F09STAS19": "Laboratorium",
  "5F14STAS01": "Jembatan Timbang",
  "5F14STAS02": "Loading Ramp",
  "5F14STAS03": "Sterilizer",
  "5F14STAS05": "Thresser & Hoisting",
  "5F14STAS06": "Pressan",
  "5F14STAS07": "Klarifikasi",
  "5F14STAS08": "Pengolahan Inti Sawi",
  "5F14STAS09": "Boiler",
  "5F14STAS10": "Pengolahan Air",
  "5F14STAS11": "Kamar Mesin",
  "5F14STAS12": "Tangki Timbun dan Ke",
  "5F14STAS13": "Limbah",
  "5F14STAS14": "Empty Bunch Hopper",
  "5F14STAS19": "Laboratorium",
  "5F15STAS01": "Jembatan Timbang",
  "5F15STAS02": "Loading Ramp",
  "5F15STAS03": "Sterilizer",
  "5F15STAS05": "Thresser & Hoisting",
  "5F15STAS06": "Pressan",
  "5F15STAS07": "Klarifikasi",
  "5F15STAS08": "Pengolahan Inti Sawi",
  "5F15STAS09": "Boiler",
  "5F15STAS10": "Pengolahan Air",
  "5F15STAS11": "Kamar Mesin",
  "5F15STAS12": "Tangki Timbun dan Ke",
  "5F15STAS13": "Limbah",
  "5F15STAS14": "Empty Bunch Hopper",
  "5F15STAS19": "Laboratorium",
  "5F20STKC01": "Penerimaan Bahan Baku PPKR",
  "5F20STKC02": "Prebreaker PPKR",
  "5F20STKC03": "Crepper PPKR",
  "5F20STKC04": "Dryer PPKR",
  "5F20STKC05": "Lump Crusher / Hammer Mill PPKR",
  "5F20STKC06": "Bak Sirkulasi PPKR",
  "5F20STKC07": "Blanket PPKR",
  "5F20STKC08": "Macerator PPKR",
  "5F20STKC09": "Trolley / Box Dryer PPKR",
  "5F20STKC10": "Cutter / Schredder PPKR",
  "5F20STKC11": "Thermal Oil Heater PPKR",
  "5F20STKC12": "Sortasi Bahan Jadi PPKR",
  "5F20STKC13": "Limbah PPKR",
  "5F20STKC19": "Laboraturium PKR",
  "5F22STAS01": "Jembatan Timbang",
  "5F22STAS02": "Loading Ramp",
  "5F22STAS03": "Sterilizer",
  "5F22STAS04": "Rail Track",
  "5F22STAS05": "Thresser & Hoisting",
  "5F22STAS06": "Pressan",
  "5F22STAS07": "Klarifikasi",
  "5F22STAS08": "Pengolahan Inti Sawi",
  "5F22STAS09": "Boiler",
  "5F22STAS10": "Pengolahan Air",
  "5F22STAS11": "Kamar Mesin",
  "5F22STAS12": "Tangki Timbun dan Ke",
  "5F22STAS13": "Limbah",
  "5F22STAS14": "Empty Bunch Hopper",
  "5F22STAS19": "Laboratorium"
};

function MasterDataView({ masterMap, currentUser }) {
  const [plantFilter, setPlantFilter] = useState('');
  const [vhcFilter, setVhcFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 100;

  const dataList = useMemo(() => {
    if (!masterMap) return [];
    const list = [];
    masterMap.forEach((info, eqNum) => {
      const plant = typeof info === 'string' ? info : info.plant;
      const desc = typeof info === 'string' ? 'Deskripsi tidak tersedia (Silakan Hapus Data & Re-upload Master EQ)' : info.description;
      const functionalLoc = typeof info === 'string' ? '' : info.functionalLoc || '';
      const flDescription = typeof info === 'string' ? '' : info.flDescription || '';
      const costCenter = typeof info === 'string' ? '' : info.costCenter || '';
      const ccDescription = costCenter ? (COST_CENTER_DESC[costCenter] || '-') : '-';
      list.push({ eqNum, plant, description: desc, functionalLoc, flDescription, costCenter, ccDescription });
    });
    return list;
  }, [masterMap]);

  const uniquePlants = useMemo(() => {
    const plants = new Set();
    dataList.forEach(item => plants.add(item.plant));
    return Array.from(plants).sort();
  }, [dataList]);

  const filteredData = useMemo(() => {
    let result = dataList;
    if (plantFilter) {
      result = result.filter(item => item.plant === plantFilter);
    }
    if (vhcFilter) {
      result = result.filter(item => item.eqNum && String(item.eqNum).startsWith(vhcFilter));
    }
    if (searchQuery) {
      const words = searchQuery.toLowerCase().split(' ').filter(w => w);
      result = result.filter(item => {
        const targetStr = `${item.eqNum} ${item.description} ${item.functionalLoc} ${item.flDescription} ${item.costCenter} ${item.ccDescription}`.toLowerCase();
        return words.every(word => targetStr.includes(word));
      });
    }
    return result;
  }, [dataList, plantFilter, vhcFilter, searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [plantFilter, vhcFilter, searchQuery]);

  // Set default plantFilter for Unit role
  useEffect(() => {
    if (currentUser?.role === 'Unit') {
      setPlantFilter(currentUser.plant);
    }
  }, [currentUser]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (!masterMap) {
    return (
      <div className="text-center py-24 bg-white rounded-xl shadow-sm border border-slate-200 mt-8 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 border border-slate-100 shadow-sm">
          <FileSpreadsheet size={32} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Master EQ Belum Diunggah</h2>
        <p className="text-slate-500 mt-2 max-w-md">Silakan unggah Master EQ di menu Input Harian terlebih dahulu agar data dapat ditampilkan.</p>
      </div>
    );
  }

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map((item, idx) => ({
      "No": idx + 1,
      "Equipment": item.eqNum,
      "Description": item.description,
      "Functional Loc": item.functionalLoc,
      "FLoc Description": item.flDescription,
      "Cost Center": item.costCenter,
      "CC Description": item.ccDescription,
      "Plant": item.plant
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterData");
    XLSX.writeFile(wb, `Master_Data_Equipment_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const handleCopyEqNums = () => {
    const eqNums = filteredData.map(item => item.eqNum).join('\n');
    navigator.clipboard.writeText(eqNums).then(() => {
      alert(`Berhasil menyalin ${filteredData.length} nomor equipment ke clipboard!`);
    }).catch(err => {
      alert('Gagal menyalin: ' + err);
    });
  };

  return (
    <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-slate-200 overflow-hidden -mx-3 sm:mx-0">
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h2 className="text-xl font-bold text-slate-800">Pencarian Master Data</h2>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => {
                const url = 'https://pmreg5.vercel.app/?tab=master';
                navigator.clipboard.writeText(url);
                alert('Link khusus Master Data berhasil disalin!\nAnda bisa membagikan link ini: ' + url);
              }}
              className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-all shadow-sm flex-1 justify-center md:flex-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              <Share2 size={16} /> Bagikan Link
            </button>
            <button 
              onClick={handleExport}
              className="bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-800 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-all shadow-sm flex-1 justify-center md:flex-none focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-1"
            >
              <Download size={16} /> Ekspor Excel
            </button>
            <button 
              onClick={handleCopyEqNums}
              title="Salin semua nomor equipment yang tampil"
              className="bg-slate-800 border border-slate-700 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-all shadow-sm flex-1 justify-center md:flex-none focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-1"
            >
              <Copy size={16} /> Copy No. EQ
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2"><Filter size={16} className="text-slate-400" /> Filter Plant</label>
            <select 
              value={plantFilter} 
              onChange={(e) => setPlantFilter(e.target.value)}
              disabled={currentUser?.role === 'Unit'}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-shadow hover:border-slate-400"
            >
              <option value="">Semua Plant</option>
              {uniquePlants.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2"><Filter size={16} className="text-slate-400" /> Jenis Equipment</label>
            <select 
              value={vhcFilter} 
              onChange={(e) => setVhcFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow hover:border-slate-400"
            >
              <option value="">Semua Jenis</option>
              <option value="1">Pabrik (1)</option>
              <option value="2">Kendaraan (2)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2"><Search size={16} className="text-slate-400" /> Cari Bebas</label>
            <input 
              type="text" 
              placeholder="Cari (misal: STERILIZER NO 1 atau FLoc/CC)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow hover:border-slate-400 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] sm:text-xs font-semibold border-b border-slate-200">
            <tr>
              <th className="px-3 sm:px-6 py-3 sm:py-4 w-12 sm:w-16 whitespace-nowrap">No</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Equipment</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 min-w-[200px]">Description</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Functional Loc.</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 min-w-[200px]">FLoc Description</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Cost Center</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 min-w-[150px]">CC Description</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">MP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {currentData.length > 0 ? currentData.map((item, idx) => (
              <tr key={`${item.eqNum}-${idx}`} className="hover:bg-slate-50/80 transition-colors bg-white group">
                <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 text-slate-400 whitespace-nowrap">{(page - 1) * itemsPerPage + idx + 1}</td>
                <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 font-medium text-slate-800 whitespace-nowrap group-hover:text-blue-600 transition-colors"><span translate="no" className="notranslate">{item.eqNum}</span></td>
                <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 min-w-[200px] leading-relaxed text-slate-700">{item.description}</td>
                <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 text-slate-500 font-mono text-[10px] sm:text-xs whitespace-nowrap">{item.functionalLoc}</td>
                <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 text-slate-500 text-[10px] sm:text-xs min-w-[200px] leading-relaxed">{item.flDescription}</td>
                <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 text-slate-500 font-mono text-[10px] sm:text-xs whitespace-nowrap">{item.costCenter}</td>
                <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 text-slate-500 text-[10px] sm:text-xs min-w-[150px] leading-relaxed">{item.ccDescription}</td>
                <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium text-[10px] sm:text-xs border border-blue-200/60 shadow-sm">{item.plant}</span></td>
              </tr>
            )) : (
              <tr>
                <td colSpan="8" className="px-6 py-16 text-center text-slate-500 bg-white">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-slate-50 rounded-full border border-slate-100">
                      <Search size={24} className="text-slate-400" />
                    </div>
                    <p>Tidak ada alat yang cocok dengan filter pencarian.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 sm:p-5 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-white rounded-b-xl">
          <span className="text-sm text-slate-500 text-center md:text-left font-medium">
            Menampilkan <span className="text-slate-700 font-semibold">{((page - 1) * itemsPerPage) + 1}</span> - <span className="text-slate-700 font-semibold">{Math.min(page * itemsPerPage, filteredData.length)}</span> dari <span className="text-slate-700 font-semibold">{filteredData.length}</span> data
          </span>
          <div className="flex gap-3 w-full md:w-auto justify-center">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              Sebelumnya
            </button>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
      
      {/* AI Assistant has been moved to main App component */}
    </div>
  );
}

function PlantGroup({ plant, equipments, onReadingChange, hierarchyData, searchQuery }) {
  const [isOpen, setIsOpen] = useState(plant !== 'Uncategorized');

  const filledCount = equipments.filter(eq => eq.reading !== undefined && eq.reading !== '').length;
  const isComplete = filledCount === equipments.length;

  const groupedInduks = useMemo(() => {
    const groups = {};
    equipments.forEach(eq => {
      const induk = eq.induk || eq.description || 'Lainnya';
      if (!groups[induk]) groups[induk] = { sInduks: {}, subs: [], allEqs: [] };
      groups[induk].allEqs.push(eq);
      
      const sInduk = eq.sInduk;
      if (sInduk) {
        if (!groups[induk].sInduks[sInduk]) groups[induk].sInduks[sInduk] = { eqs: [], headerEq: null };
        groups[induk].sInduks[sInduk].eqs.push(eq);
      } else {
        groups[induk].subs.push(eq);
      }
    });

    Object.values(groups).forEach(group => {
      const remainingSubs = [];
      group.subs.forEach(eq => {
        if (group.sInduks[eq.description]) {
          group.sInduks[eq.description].headerEq = eq;
        } else {
          remainingSubs.push(eq);
        }
      });
      group.subs = remainingSubs;
    });

    return Object.entries(groups).sort(([indukA], [indukB]) => {
      if (!hierarchyData || !hierarchyData.order) return indukA.localeCompare(indukB);
      
      const idxA = hierarchyData.order.indexOf(indukA);
      const idxB = hierarchyData.order.indexOf(indukB);
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return indukA.localeCompare(indukB);
    });
  }, [equipments, hierarchyData]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors ${isOpen ? 'border-b border-slate-200' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isComplete ? 'bg-green-500' : 'bg-amber-400'}`}></div>
          <h3 className="font-semibold text-lg text-slate-800">{plant}</h3>
          <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full font-medium">
            {filledCount} / {equipments.length}
          </span>
        </div>
        {isOpen ? <Minus className="text-slate-500" /> : <Plus className="text-slate-500" />}
      </button>

      {isOpen && (
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3 w-16">No</th>
                <th className="px-6 py-3 w-48">Equipment</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 w-48">Measuring Pt.</th>
                <th className="px-6 py-3 w-64">HM Induk / Komponen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedInduks.map(([indukName, data]) => (
                <IndukEquipmentGroup 
                  key={indukName} 
                  indukName={indukName} 
                  data={data} 
                  onReadingChange={onReadingChange} 
                  searchQuery={searchQuery}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function IndukEquipmentGroup({ indukName, data, onReadingChange, searchQuery }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand when searching
  useEffect(() => {
    if (searchQuery && searchQuery.trim() !== '') {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [searchQuery]);

  return (
    <React.Fragment>
      <tr 
        className="bg-slate-100/80 hover:bg-slate-200/80 transition-colors cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td colSpan="4" className="py-3 pr-6 pl-2 font-semibold text-slate-800 border-t border-slate-300">
          <div className="flex items-center gap-2">
            {isExpanded ? <Minus size={18} className="text-slate-500" /> : <Plus size={18} className="text-slate-500" />}
            <span>◩ {indukName} <span className="text-sm font-normal text-slate-500 ml-2">({data.allEqs.length} komponen)</span></span>
          </div>
        </td>
        <td className="px-6 py-3 border-t border-slate-300" onClick={(e) => e.stopPropagation()}>
          <input 
            type="number" 
            value={data.allEqs[0]?.reading || ''}
            onChange={(e) => onReadingChange(indukName, e.target.value)}
            placeholder="Input Jam Jalan..."
            className={`w-full px-3 py-2 border rounded-lg font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow shadow-inner ${data.allEqs[0]?.reading ? 'bg-blue-100 border-blue-400 text-blue-900' : 'bg-white border-slate-300'}`}
          />
        </td>
      </tr>
      
      {isExpanded && (() => {
        const children = [];
        Object.entries(data.sInduks).forEach(([sIndukName, sIndukData]) => {
          const sortIdx = sIndukData.headerEq ? sIndukData.headerEq.rowIndex : (sIndukData.eqs[0] ? sIndukData.eqs[0].rowIndex : 0);
          children.push({ type: 'sInduk', sortIdx, sIndukName, sIndukData });
        });
        data.subs.forEach(eq => {
          children.push({ type: 'sub', sortIdx: eq.rowIndex, eq });
        });
        children.sort((a, b) => a.sortIdx - b.sortIdx);

        return children.map((item, idx) => {
          if (item.type === 'sInduk') {
            return <SubIndukGroup key={`sinduk-${item.sIndukName}`} sIndukName={item.sIndukName} sIndukData={item.sIndukData} searchQuery={searchQuery} />;
          } else {
            return <EquipmentRow key={`sub-${item.eq.rowIndex}`} eq={item.eq} idx={idx} isSub={false} />;
          }
        });
      })()}
    </React.Fragment>
  );
}

function SubIndukGroup({ sIndukName, sIndukData, searchQuery }) {
  const headerEq = sIndukData.headerEq;
  const childEqs = sIndukData.eqs;

  return (
    <React.Fragment>
      {headerEq ? (
        <tr className="bg-blue-50/40 hover:bg-blue-100/40 transition-colors cursor-default">
          <td className="px-6 py-2 text-slate-500 pl-10 border-t border-slate-200 whitespace-nowrap">
            {headerEq.no}
          </td>
          <td className="px-6 py-2 font-medium text-blue-900 border-t border-slate-200">{headerEq.eqNum}</td>
          <td className="px-6 py-2 font-bold text-blue-900 border-t border-slate-200">{headerEq.description}</td>
          <td className="px-6 py-2 text-blue-700/70 border-t border-slate-200">{headerEq.measuringPoint}</td>
          <td className="px-6 py-2 border-t border-slate-200">
            <span className="text-slate-400 italic px-3 font-mono bg-white border border-slate-200 py-1 rounded">
              {headerEq.reading ? headerEq.reading + ' (Auto)' : 'Menunggu Induk...'}
            </span>
          </td>
        </tr>
      ) : (
        <tr className="bg-blue-50/40 hover:bg-blue-100/40 transition-colors cursor-default">
          <td colSpan="5" className="px-6 py-2 font-bold text-blue-900 pl-10 border-t border-slate-200">
            <span>{sIndukName} <span className="text-xs font-normal text-blue-700/70 ml-2">({childEqs.length} sub)</span></span>
          </td>
        </tr>
      )}
      {childEqs.map((eq, idx) => (
        <EquipmentRow key={eq.rowIndex} eq={eq} idx={idx} isSub={true} />
      ))}
    </React.Fragment>
  );
}

function EquipmentRow({ eq, idx, isSub }) {
  return (
    <tr className="hover:bg-blue-50/30 transition-colors bg-white">
      <td className={`px-6 py-2 text-slate-400 ${isSub ? 'pl-20' : 'pl-10'}`}>
        {isSub && <span className="text-slate-300 mr-2 font-bold">↳</span>}
        {eq.no || idx + 1}
      </td>
      <td className="px-6 py-2 font-medium text-slate-700">{eq.eqNum}</td>
      <td className="px-6 py-2">{eq.description}</td>
      <td className="px-6 py-2 text-slate-500">{eq.measuringPoint}</td>
      <td className="px-6 py-2">
        <span className="text-slate-400 italic px-3 font-mono bg-slate-50 border border-slate-100 py-1 rounded">
          {eq.reading ? eq.reading + ' (Auto)' : 'Menunggu Induk...'}
        </span>
      </td>
    </tr>
  );
}

export default App;
