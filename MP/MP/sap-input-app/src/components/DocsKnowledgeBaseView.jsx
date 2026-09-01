import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Search, Copy, Check, ChevronRight, ArrowLeft,
  Sparkles, FileText, Database, Shield, Settings, Activity, Truck, Hammer,
  Plus, Edit3, Trash2, Tag, CheckCircle, AlertCircle, Bookmark, Compass,
  MessageSquare, X, Sun, Moon
} from 'lucide-react';
import { fetchKnowledgeBase, saveKnowledgeBase } from '../lib/supabaseService';

export default function DocsKnowledgeBaseView({ currentUser, onBackToApp }) {
  const isDev = currentUser?.role?.toUpperCase() === 'DEV';
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN' || isDev;

  // Theme mode: light by default
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Active navigation document ID
  const [activeDocId, setActiveDocId] = useState('welcome');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Live custom Q&A articles from Supabase
  const [customArticles, setCustomArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  // Edit / Add modal for DEV
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleForm, setArticleForm] = useState({ category: 'SAP PM & Otorisasi', q: '', a: '', tags: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Load custom Q&A from Supabase
  const loadCustomArticles = async () => {
    setLoadingArticles(true);
    try {
      const { data } = await fetchKnowledgeBase();
      if (data && Array.isArray(data)) {
        setCustomArticles(data);
      }
    } catch (e) {
      console.error('Failed to load knowledge base:', e);
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    loadCustomArticles();
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchModalOpen(false);
        setIsEditModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (type, text) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Structured Documentation Nav Tree
  const DOCS_NAV = [
    {
      group: 'Panduan Memulai',
      items: [
        { id: 'welcome', title: 'Selamat Datang di PM Regional 5', category: 'Panduan Memulai' },
        { id: 'roles-access', title: 'Hak Akses (DEV, ADMIN, USER)', category: 'Panduan Memulai' },
        { id: 'quick-start', title: 'Alur Kerja Harian Petugas Unit', category: 'Panduan Memulai' },
      ]
    },
    {
      group: 'Logbook Mesin Pabrik (IK11)',
      items: [
        { id: 'ik11-sop', title: 'SOP Input Jam Jalan Harian (IK11)', category: 'Logbook Mesin Pabrik' },
        { id: 'stasiun-pabrik', title: 'Hierarki Stasiun & Equipment PKS', category: 'Logbook Mesin Pabrik' },
        { id: 'ik11-deadline', title: 'Ketentuan Batas Waktu H+1', category: 'Logbook Mesin Pabrik' },
      ]
    },
    {
      group: 'Logbook Kendaraan & Alat Berat',
      items: [
        { id: 'zesthlp16pa', title: 'T-Code SAP ZESTHLP16PA', category: 'Kendaraan & Alat Berat' },
        { id: 'master-kendaraan', title: 'Master 235 Kendaraan Regional 5', category: 'Kendaraan & Alat Berat' },
        { id: 'jobcodes', title: 'Job Codes & Satuan Operasional', category: 'Kendaraan & Alat Berat' },
      ]
    },
    {
      group: 'Verifikasi Biaya Pemeliharaan (ZCO)',
      items: [
        { id: 'zco-cctr', title: 'Laporan Cost Center ZCO_CCTR_01', category: 'Verifikasi Biaya' },
        { id: 'zco-filter', title: 'Aturan Subtotal & Pembersihan Data', category: 'Verifikasi Biaya' },
      ]
    },
    {
      group: 'Monitoring Work Order (IW39)',
      items: [
        { id: 'wo-lifecycle', title: 'Siklus Work Order (CRTD/REL/TECO)', category: 'Monitoring Work Order' },
        { id: 'pm01-pm02-pm04', title: 'Tipe Order (PM01, PM02, PM04)', category: 'Monitoring Work Order' },
        { id: 'wo-integration', title: 'Upload Berkas IW39, ZVTAB, 046EXP', category: 'Monitoring Work Order' },
      ]
    },
    {
      group: 'Sinkronisasi & Berita Acara',
      items: [
        { id: 'ik17-verification', title: 'Verifikasi Pembacaan SAP (IK17)', category: 'Sinkronisasi & Laporan' },
        { id: 'berita-acara-sop', title: 'Penerbitan Berita Acara Online', category: 'Sinkronisasi & Laporan' },
        { id: 'troubleshooting-sap', title: 'Penanganan Error Tanggal & Selisih', category: 'Sinkronisasi & Laporan' },
      ]
    },
    {
      group: 'Admin & Developer Tools',
      items: [
        { id: 'master-templates', title: 'Manajemen Master EQ & Template', category: 'Admin & Developer' },
        { id: 'user-management', title: 'Manajemen Akun & Reset Password', category: 'Admin & Developer' },
        { id: 'qa-knowledge-base', title: 'Knowledge Base Live Editor', category: 'Admin & Developer' },
      ]
    }
  ];

  // Flat list for search
  const allDocItems = useMemo(() => {
    const list = [];
    DOCS_NAV.forEach(grp => {
      grp.items.forEach(item => list.push({ ...item, group: grp.group }));
    });
    customArticles.forEach(ca => {
      list.push({
        id: ca.id,
        title: ca.q,
        category: ca.category || 'FAQ & Knowledge Base',
        group: 'Live Knowledge Base Q&A',
        isCustom: true,
        data: ca
      });
    });
    return list;
  }, [customArticles]);

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allDocItems.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return allDocItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q) ||
      (item.data?.a && item.data.a.toLowerCase().includes(q))
    );
  }, [allDocItems, searchQuery]);

  // Copy page content to clipboard
  const handleCopyPage = () => {
    const text = document.getElementById('docs-main-content')?.innerText || '';
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Save new/edited Q&A
  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!articleForm.q.trim() || !articleForm.a.trim()) return;

    let updated;
    if (editingArticle) {
      updated = customArticles.map(a => a.id === editingArticle.id ? {
        ...a,
        category: articleForm.category,
        q: articleForm.q.trim(),
        a: articleForm.a.trim(),
        tags: typeof articleForm.tags === 'string' ? articleForm.tags.split(',').map(t=>t.trim()).filter(Boolean) : articleForm.tags,
        updated_at: new Date().toISOString(),
        updated_by: currentUser?.name || 'DEV'
      } : a);
    } else {
      const newItem = {
        id: 'kb-' + Date.now(),
        category: articleForm.category,
        q: articleForm.q.trim(),
        a: articleForm.a.trim(),
        tags: typeof articleForm.tags === 'string' ? articleForm.tags.split(',').map(t=>t.trim()).filter(Boolean) : [],
        created_at: new Date().toISOString(),
        created_by: currentUser?.name || 'DEV'
      };
      updated = [newItem, ...customArticles];
    }

    setIsSaving(true);
    const { error } = await saveKnowledgeBase(updated);
    setIsSaving(false);

    if (error) {
      showToast('error', 'Gagal menyimpan: ' + (error.message || error));
    } else {
      setCustomArticles(updated);
      setIsEditModalOpen(false);
      setEditingArticle(null);
      showToast('success', 'Knowledge Base berhasil diperbarui di Cloud!');
    }
  };

  // Delete Q&A
  const handleDeleteArticle = async (id) => {
    if (!window.confirm('Hapus artikel ini dari Knowledge Base?')) return;
    const updated = customArticles.filter(a => a.id !== id);
    setIsSaving(true);
    const { error } = await saveKnowledgeBase(updated);
    setIsSaving(false);
    if (!error) {
      setCustomArticles(updated);
      showToast('success', 'Artikel berhasil dihapus.');
    }
  };

  // Dynamic content renderer based on activeDocId
  const renderDocBody = () => {
    const customMatch = customArticles.find(c => c.id === activeDocId);
    if (customMatch) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {customMatch.category}
            </span>
            {customMatch.updated_by && (
              <span className="text-xs text-slate-500">Penyunting: {customMatch.updated_by}</span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{customMatch.q}</h1>
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-slate-700 leading-relaxed text-sm whitespace-pre-line font-sans shadow-xs">
            {customMatch.a}
          </div>
          {Array.isArray(customMatch.tags) && customMatch.tags.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <Tag size={13} className="text-slate-400" />
              {customMatch.tags.map((t, i) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md font-mono border border-slate-200">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    switch (activeDocId) {
      case 'welcome':
        return (
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-3 shadow-xs">
                <Sparkles size={13} className="text-emerald-600" />
                Portal Resmi ERP SAP PM Regional V
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-4">
                Pusat Pengetahuan &amp; SOP PM Regional 5
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                Sistem <strong>Plant Maintenance (PM) Regional 5</strong> adalah platform integrasi operasional dan pelaporan pemeliharaan terstandarisasi untuk seluruh unit <strong>Pabrik Kelapa Sawit (PKS)</strong>, <strong>Kebun Kelapa Sawit</strong>, dan <strong>Pabrik Karet (PKR)</strong> di lingkungan <strong>PT Perkebunan Nusantara IV Regional V</strong>.
              </p>
            </div>

            {/* Section 1: Modul Utama */}
            <div id="what-you-can-do" className="space-y-4 pt-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Modul Utama &amp; Ruang Lingkup Sistem
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3.5 w-1/3">Modul / Menu</th>
                      <th className="px-5 py-3.5">Fungsi &amp; Ruang Lingkup Operasional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-emerald-800">Logbook Jam Mesin (IK11)</td>
                      <td className="px-5 py-3.5 leading-relaxed">Pencatatan jam operasi harian mesin pabrik, turbin, boiler, genset, stasiun proses per tanggal.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-amber-700">Logbook Kendaraan (ZESTHLP16PA)</td>
                      <td className="px-5 py-3.5 leading-relaxed">Monitoring 235 unit armada kendaraan/alat berat, pencatatan HM/KM, dan rekonsiliasi log transaksi.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-purple-700">Verifikasi Biaya (ZCO_CCTR_01)</td>
                      <td className="px-5 py-3.5 leading-relaxed">Verifikasi pemeliharaan biaya cost center kendaraan per unit kebun/pabrik (auto-filter subtotal).</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-blue-700">Work Order Monitoring (IW39)</td>
                      <td className="px-5 py-3.5 leading-relaxed">Pelacakan status WO (PM01 Corrective, PM02 Preventive, PM04 Project) serta realisasi biaya 046EXP.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-teal-700">Sinkronisasi SAP (IK17)</td>
                      <td className="px-5 py-3.5 leading-relaxed">Pencocokan pembacaan jam jalan Web vs SAP IK17 secara otomatis dan deteksi selisih data.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-rose-700">Berita Acara Online</td>
                      <td className="px-5 py-3.5 leading-relaxed">Penerbitan dokumen Berita Acara jam operasi bulanan via integrasi Google Sheets &amp; Cetak PDF resmi.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-yellow-700">Developer &amp; Key User Tools</td>
                      <td className="px-5 py-3.5 leading-relaxed">Manajemen Master Data Equipment, Template Regional, Manajemen User, dan Knowledge Base Editor.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Tiga Pilar */}
            <div id="three-dashboards" className="space-y-4 pt-4 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Tiga Pilar Monitoring PM Regional 5</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">1</div>
                  <h3 className="text-sm font-bold text-slate-900">Input Harian Pabrik</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">Formulir pengisian jam jalan mesin pabrik dengan validasi durasi (maks 24 jam) dan batas waktu H+1 pukul 09:00 WIB.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">2</div>
                  <h3 className="text-sm font-bold text-slate-900">Logbook Kendaraan</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">Pusat monitoring 235 armada alat berat &amp; kendaraan kebun/pabrik dari T-Code ZESTHLP16PA dan ZCO_CCTR_01.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 text-xs font-black flex items-center justify-center">3</div>
                  <h3 className="text-sm font-bold text-slate-900">Kepatuhan Regional</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">Matriks kepatuhan 28 unit pabrik &amp; kebun dengan sinkronisasi IK17 serta pelacakan realisasi Work Order.</p>
                </div>
              </div>
            </div>

            {/* Section 3: Need Help */}
            <div id="need-help" className="space-y-4 pt-4 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Layanan Bantuan &amp; Dukungan Teknis</h2>
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-emerald-900">Tim Key User ERP SAP Regional 5</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>AFRA VENERANDA EVARIS</strong> (Key User PM) &bull; <strong>EKO PUJI CAHYONO</strong> (Key User CO) &bull; <strong>MARJUNITA</strong> (Key User MM)
                  </p>
                </div>
                <a 
                  href="https://wa.me/6281251334618?text=Halo%20Keyuser%20PM%20Regional%205,%20saya%20memerlukan%20bantuan%20seputar%20sistem"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <MessageSquare size={14} />
                  WhatsApp Helpdesk
                </a>
              </div>
            </div>
          </div>
        );

      case 'roles-access':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Panduan Memulai</p>
            <h1 className="text-3xl font-black text-slate-900">Hak Akses &amp; Otorisasi Pengguna (RBAC)</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sistem menerapkan <strong>Role-Based Access Control (RBAC)</strong> ketat untuk menjamin keamanan dan privasi data operasional masing-masing unit kebun dan pabrik di Regional V.
            </p>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 text-xs font-black rounded-full bg-amber-100 text-amber-800 border border-amber-200">ROLE DEV</span>
                  <span className="text-xs text-slate-500 font-mono">AFRA VENERANDA EVARIS, EKO PUJI CAHYONO</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hak akses tertinggi (Super Admin / Developer). Memiliki akses ke seluruh 28 unit, manajemen file dasar, upload template master regional, manajemen akun pengguna, reset password, simulasi jam jalan bebas batas, dan <strong>Knowledge Base Live Editor</strong>.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 text-xs font-black rounded-full bg-purple-100 text-purple-800 border border-purple-200">ROLE ADMIN</span>
                  <span className="text-xs text-slate-500 font-mono">Tim Bagian Teknik, Pengolahan &amp; Akuntansi Regional</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Akses tingkat regional. Dapat melihat dan memverifikasi data seluruh pabrik dan kebun, upload berkas verifikasi IK17, upload Work Order IW39, upload ZCO, dan mengesahkan Berita Acara.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 text-xs font-black rounded-full bg-blue-100 text-blue-800 border border-blue-200">ROLE USER (UNIT)</span>
                  <span className="text-xs text-slate-500 font-mono">124 Petugas Unit Kebun &amp; Pabrik</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Lockdown Unit Milik Sendiri:</strong> User dikunci secara permanen hanya dapat melihat, menginput, dan mencetak data unit tempatnya bertugas (contoh: user SUISWADI hanya dapat mengakses data Pabrik Parindu 5F08). Seluruh dropdown unit lain dinonaktifkan secara otomatis.
                </p>
              </div>
            </div>
          </div>
        );

      case 'ik11-sop':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Logbook Mesin Pabrik</p>
            <h1 className="text-3xl font-black text-slate-900">SOP Input Jam Jalan Mesin Pabrik (IK11)</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pencatatan jam operasi harian mesin pabrik wajib dilakukan setiap hari kerja dengan ketentuan operasional sebagai berikut:
            </p>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <h4 className="font-bold text-emerald-700">1. Batas Waktu Pengisian (Deadline)</h4>
                <p>Pengisian data logbook harian wajib diselesaikan paling lambat <strong>H+1 pukul 09:00 WIB</strong> setiap paginya.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <h4 className="font-bold text-emerald-700">2. Batas Maksimum Jam Operasi</h4>
                <p>Setiap equipment memiliki batas maksimum jam operasi <strong>24.0 jam/hari</strong>. Input melebihi 24 jam akan ditolak otomatis oleh sistem validasi.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <h4 className="font-bold text-emerald-700">3. Tanggal yang Dapat Diedit</h4>
                <p>Untuk role USER, sistem hanya membuka tanggal aktif kemarin (H-1) dan hari ini untuk mencegah manipulasi data historis tanpa persetujuan.</p>
              </div>
            </div>
          </div>
        );

      case 'zesthlp16pa':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Kendaraan &amp; Alat Berat</p>
            <h1 className="text-3xl font-black text-slate-900">Petunjuk T-Code ZESTHLP16PA</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              T-Code <code>ZESTHLP16PA</code> digunakan pada SAP Front End untuk mengekstrak dan memverifikasi logbook kendaraan &amp; alat berat 28 unit Regional 5.
            </p>
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900">Langkah Ekstraksi:</h3>
              <ol className="space-y-2 list-decimal list-inside text-xs text-slate-700">
                <li className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  Ketik <code>ZESTHLP16PA</code> pada command bar SAP GUI.
                </li>
                <li className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  Tentukan periode bulan (contoh: <code>01.08.2026 s/d 31.08.2026</code>) dan kode Plant.
                </li>
                <li className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  Ekspor file ke format spreadsheet (Excel <code>.xlsx</code>).
                </li>
                <li className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  Upload file pada menu <strong>Logbook Kendaraan</strong> &gt; tombol <em>Upload ZESTHLP16PA</em>.
                </li>
              </ol>
            </div>
          </div>
        );

      case 'zco-cctr':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">Verifikasi Biaya</p>
            <h1 className="text-3xl font-black text-slate-900">Verifikasi Biaya Cost Center (ZCO_CCTR_01)</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Laporan <code>ZCO_CCTR_01</code> menyajikan realisasi pembebanan biaya pemeliharaan armada kendaraan kebun dan pabrik.
            </p>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2 shadow-xs">
              <p className="font-bold text-emerald-700">Pembersihan Baris Otomatis:</p>
              <p>Sistem secara otomatis menyaring 25 baris subtotal SAP <code>PLANT xxx LOG RATE</code> dan header baris ganda sehingga total cost center yang ditampilkan adalah 235 kendaraan valid.</p>
            </div>
          </div>
        );

      case 'qa-knowledge-base':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Admin &amp; Developer</p>
                <h1 className="text-3xl font-black text-slate-900">Knowledge Base Live Editor</h1>
              </div>
              {isDev && (
                <button
                  onClick={() => {
                    setEditingArticle(null);
                    setArticleForm({ category: 'SAP PM & Otorisasi', q: '', a: '', tags: '' });
                    setIsEditModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
                >
                  <Plus size={15} />
                  Tambah Q&amp;A Baru
                </button>
              )}
            </div>

            <p className="text-sm text-slate-600">
              Artikel dan Tanya-Jawab di bawah ini tersimpan di Supabase Cloud dan terhubung otomatis dengan widget <strong>Chatbot Asisten PM</strong>.
            </p>

            <div className="space-y-3">
              {customArticles.map((item, idx) => (
                <div key={item.id} className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{item.q}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{item.a}</p>
                    </div>

                    {isDev && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingArticle(item);
                            setArticleForm({
                              category: item.category || 'SAP PM & Otorisasi',
                              q: item.q || '',
                              a: item.a || '',
                              tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '')
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Dokumentasi SOP</p>
            <h1 className="text-3xl font-black text-slate-900 capitalize">{activeDocId.replace(/-/g, ' ')}</h1>
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-sm text-slate-700 leading-relaxed space-y-4 shadow-xs">
              <p>Dokumentasi resmi untuk modul <strong>{activeDocId.replace(/-/g, ' ')}</strong> pada sistem PM Regional 5.</p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-emerald-700 mb-1">Status Modul:</h4>
                <p className="text-xs text-slate-600">Modul ini aktif dan terintegrasi dengan database ERP SAP PM Regional 5.</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      {/* ── TOP HEADER BAR (PM Regional 5 Docs - Mode Terang) ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 h-14 flex items-center justify-between px-4 sm:px-6 shadow-xs">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-lg text-xs tracking-wider uppercase shadow-xs">
              PM REG 5
            </span>
            <span className="text-slate-800 font-bold text-sm">Knowledge Base &amp; Docs</span>
          </div>
        </div>

        {/* Center: Search Box (Ctrl + K) */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl text-xs text-slate-500 transition-colors shadow-inner cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search size={14} className="text-slate-400" />
              Cari dokumentasi, T-Code SAP, SOP...
            </span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-[10px] text-slate-500 rounded-md font-mono shadow-2xs">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveDocId('qa-knowledge-base')}
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer font-medium"
          >
            <Bookmark size={13} className="text-amber-600" />
            Dictionary
          </button>

          <span className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium">
            🇮🇩 ID
          </span>

          <button
            onClick={onBackToApp}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <ArrowLeft size={14} />
            Kembali ke Dashboard
          </button>
        </div>
      </header>

      {/* ── TOAST NOTIFICATION ── */}
      {toastMsg && (
        <div className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-xl animate-in slide-in-from-top-2 ${
          toastMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle size={15} className="text-emerald-600" /> : <AlertCircle size={15} className="text-red-600" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ── MAIN 3-COLUMN LAYOUT ── */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* ── 1. LEFT SIDEBAR (Nav Tree - Light Mode) ── */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 space-y-6 shrink-0 hidden md:block overflow-y-auto max-h-[calc(100vh-56px)] sticky top-14">
          {DOCS_NAV.map((grp, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 font-mono">
                {grp.group}
              </p>
              <div className="space-y-0.5">
                {grp.items.map(item => {
                  const isActive = activeDocId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveDocId(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 font-bold shadow-2xs border-l-2 border-emerald-600'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{item.title}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Custom Live Q&A Section */}
          {customArticles.length > 0 && (
            <div className="space-y-1 pt-3 border-t border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 font-mono">
                Live Knowledge Base ({customArticles.length})
              </p>
              <div className="space-y-0.5">
                {customArticles.slice(0, 8).map(ca => {
                  const isActive = activeDocId === ca.id;
                  return (
                    <button
                      key={ca.id}
                      onClick={() => setActiveDocId(ca.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 font-bold shadow-2xs border-l-2 border-emerald-600'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{ca.q}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* ── 2. CENTER CONTENT AREA (Light Mode) ── */}
        <main className="flex-1 min-w-0 p-6 sm:p-10 lg:p-12 overflow-y-auto max-h-[calc(100vh-56px)]" id="docs-main-content">
          <div className="max-w-3xl space-y-8">
            {/* Top Toolbar in Content */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Compass size={14} className="text-emerald-600" />
                <span>Dokumentasi PM Reg 5</span>
                <span>/</span>
                <span className="text-slate-800 font-semibold">{activeDocId}</span>
              </div>

              <button
                onClick={handleCopyPage}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-3 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                {copiedSuccess ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copiedSuccess ? 'Tersalin' : 'Salin Halaman'}</span>
              </button>
            </div>

            {/* Dynamic Content */}
            {renderDocBody()}
          </div>
        </main>

        {/* ── 3. RIGHT SIDEBAR (ON THIS PAGE Anchor Menu) ── */}
        <aside className="w-56 bg-white border-l border-slate-200 p-6 shrink-0 hidden lg:block sticky top-14 max-h-[calc(100vh-56px)]">
          <div className="space-y-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
              <FileText size={13} className="text-emerald-600" />
              ON THIS PAGE
            </p>
            <div className="space-y-2 text-xs">
              <a
                href="#what-you-can-do"
                className="block text-emerald-800 font-bold pl-2 border-l-2 border-emerald-600 hover:text-emerald-900 transition-colors"
              >
                Modul &amp; Fitur Utama
              </a>
              <a
                href="#three-dashboards"
                className="block text-slate-600 pl-2 border-l-2 border-transparent hover:text-slate-900 transition-colors"
              >
                Tiga Pilar Monitoring
              </a>
              <a
                href="#need-help"
                className="block text-slate-600 pl-2 border-l-2 border-transparent hover:text-slate-900 transition-colors"
              >
                Layanan Bantuan
              </a>
            </div>

            {isDev && (
              <div className="pt-6 border-t border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Dev Actions</span>
                <button
                  onClick={() => {
                    setEditingArticle(null);
                    setArticleForm({ category: 'SAP PM & Otorisasi', q: '', a: '', tags: '' });
                    setIsEditModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus size={14} />
                  Tambah Artikel
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── MODAL: SEARCH (Ctrl+K) ── */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari dokumentasi, T-Code, SOP..."
                className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder-slate-400 font-medium"
              />
              <button onClick={() => setIsSearchModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada hasil untuk "{searchQuery}"
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveDocId(item.id);
                      setIsSearchModalOpen(false);
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-emerald-700">{item.group || item.category}</span>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{item.title}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-800 transition-colors" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT / CREATE Q&A (DEV ONLY) ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 size={15} className="text-emerald-600" />
                {editingArticle ? 'Edit Knowledge Base' : 'Tambah Artikel Knowledge Base'}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={articleForm.category}
                  onChange={e => setArticleForm({ ...articleForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Panduan Memulai">Panduan Memulai</option>
                  <option value="Logbook Mesin Pabrik">Logbook Mesin Pabrik</option>
                  <option value="Kendaraan & Alat Berat">Kendaraan & Alat Berat</option>
                  <option value="Verifikasi Biaya">Verifikasi Biaya</option>
                  <option value="Monitoring Work Order">Monitoring Work Order</option>
                  <option value="Sinkronisasi & Laporan">Sinkronisasi & Laporan</option>
                  <option value="SAP PM & Otorisasi">SAP PM & Otorisasi</option>
                  <option value="Troubleshooting & Akun">Troubleshooting & Akun</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pertanyaan / Judul Topik *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Prosedur Pengisian Logbook IK11"
                  value={articleForm.q}
                  onChange={e => setArticleForm({ ...articleForm, q: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Konten / Penjelasan Lengkap *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tuliskan dokumentasi, langkah-langkah, atau SOP..."
                  value={articleForm.a}
                  onChange={e => setArticleForm({ ...articleForm, a: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tags (Pisahkan koma)</label>
                <input
                  type="text"
                  placeholder="pm01, ik11, sap, sop"
                  value={articleForm.tags}
                  onChange={e => setArticleForm({ ...articleForm, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan ke Cloud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
