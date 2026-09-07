import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Search, Copy, Check, ChevronRight, ArrowLeft,
  Sparkles, FileText, Database, Shield, Settings, Activity, Truck, Hammer,
  Plus, Edit3, Trash2, Tag, CheckCircle, AlertCircle, Bookmark, Compass,
  MessageSquare, X, Sun, Moon, Terminal, Code, Server, Layers, Cpu,
  FileSpreadsheet, ExternalLink, RefreshCw, Key, Clock, HelpCircle, HardDrive
} from 'lucide-react';
import { fetchKnowledgeBase, saveKnowledgeBase } from '../lib/supabaseService';

function CodeSnippet({ code, language = 'sql', title = '' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a] shadow-md my-3 font-mono text-xs text-left">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400">
        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <Terminal size={12} className="text-emerald-500" />
          {title || language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors cursor-pointer"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'Tersalin!' : 'Salin Kodingan'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed text-[12px] scrollbar-thin scrollbar-thumb-slate-700">
        <code>{code}</code>
      </pre>
    </div>
  );
}

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

            {/* Architecture Overview */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Server size={16} className="text-[#064e3b]" />
                Arsitektur Sistem &amp; Stack Teknologi
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aplikasi dibangun dengan arsitektur micro-service modern: Frontend React 19 + Vite, Backend REST API PostgREST v12.2, Database PostgreSQL 18.4, Reverse Proxy Nginx, dan Process Manager PM2 Cluster di server Cloud Ubuntu 24.04.
              </p>
              <CodeSnippet
                language="bash"
                title="PostgREST REST API — Query Data via HTTP cURL"
                code={`# Mengambil data logbook kendaraan plant 5F01 bulan berjalan
curl -X GET "https://pmreg5.afratarigan.my.id/postgrest/vehicle_logs?plant=eq.5F01&date=gte.2026-09-01&order=date.desc" \\
  -H "Authorization: Bearer YOUR_ANON_TOKEN" \\
  -H "Accept: application/json"

# Response HTTP 200 OK:
# [{"activity_number":"ACT-1001","vehicle_code":"2000015518","date":"2026-09-07","hm_km":8.5,"uom":"HM"}]`}
              />
            </div>

            {/* Modul Utama */}
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
                  </tbody>
                </table>
              </div>
            </div>

            {/* Need Help */}
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
              Sistem menerapkan <strong>Role-Based Access Control (RBAC)</strong> ketat untuk menjamin keamanan dan isolasi data operasional masing-masing unit kebun dan pabrik di Regional V.
            </p>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 text-xs font-black rounded-full bg-amber-100 text-amber-800 border border-amber-200">ROLE DEV</span>
                  <span className="text-xs text-slate-500 font-mono">Super Admin / Pengembang</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hak akses tertinggi tanpa batasan: Akses seluruh 28 unit, manajemen master data alat, upload template regional, manajemen user, reset password, simulasi jam jalan bebas batas tanggal, serta akses ke Knowledge Base Live Editor.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 text-xs font-black rounded-full bg-purple-100 text-purple-800 border border-purple-200">ROLE ADMIN</span>
                  <span className="text-xs text-slate-500 font-mono">Tim Bagian Teknik, Pengolahan &amp; Akuntansi Regional</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Akses tingkat regional: Dapat memonitor dan memverifikasi seluruh unit, upload ZESTHLP16PA, upload IW39, upload ZCO, serta validasi rekonsiliasi biaya.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 text-xs font-black rounded-full bg-blue-100 text-blue-800 border border-blue-200">ROLE USER (UNIT)</span>
                  <span className="text-xs text-slate-500 font-mono">124 Petugas Unit Kebun &amp; Pabrik</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Lockdown Unit Milik Sendiri:</strong> Pengguna hanya dapat mengakses data unit tempatnya bertugas. Dropdown plant lain dikunci otomatis. Pada rekap regional, unit lain hanya dapat dilihat status kepatuhannya tanpa bisa mengubah detail.
                </p>
              </div>
            </div>

            <CodeSnippet
              language="javascript"
              title="Implementasi Frontend: Role Evaluation & Plant Guard"
              code={`// Logika penentuan hak akses pengguna
const isDev = currentUser?.role?.toUpperCase() === 'DEV';
const isAdmin = isDev || ['ADMIN', 'REGIONAL'].includes(currentUser?.role?.toUpperCase());
const isUserRole = !isAdmin || ['USER', 'UNIT'].includes(currentUser?.role?.toUpperCase());

// Guard filter data unit:
const filterByUserPlant = (logs, currentUser) => {
  if (isAdmin) return logs; // Admin & Dev dapat melihat semua
  return logs.filter(l => l.plant === currentUser?.plant);
};`}
            />

            <CodeSnippet
              language="sql"
              title="Implementasi Database: Row-Level Plant Filtering di PostgreSQL"
              code={`-- Kueri server-side memastikan role USER hanya membaca log unitnya sendiri:
SELECT activity_number, vehicle_code, plant, date, hm_km, unit_value, uom
FROM vehicle_logs
WHERE (
  -- Jika Admin/Dev (:role = 'DEV' / 'ADMIN'), ambil semua plant
  (:role IN ('DEV', 'ADMIN', 'REGIONAL'))
  OR
  -- Jika User biasa, kunci hanya ke unitnya
  (plant = :userPlant)
)
AND date >= '2026-09-01'
ORDER BY date DESC;`}
            />
          </div>
        );

      case 'quick-start':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Panduan Memulai</p>
            <h1 className="text-3xl font-black text-slate-900">Alur Kerja Harian Petugas Unit</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Setiap petugas unit kebun/pabrik wajib menjalankan alur operasional standar harian berikut untuk memastikan data jam operasi dan logbook kendaraan tersinkronisasi ke SAP secara akurat.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">01</span>
                <h3 className="font-bold text-slate-800 text-sm">Pukul 07:00 - 08:30 WIB</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Kumpulkan formulir jam jalan operator mesin pabrik (turbin, boiler, genset) dan SPBS angkutan harian kendaraan.</p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">02</span>
                <h3 className="font-bold text-slate-800 text-sm">Pukul 08:30 - 09:00 WIB</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Buka menu <strong>Jam Jalan Mesin Pabrik</strong> &gt; isi matriks jam jalan &gt; klik <strong>Simpan Jam Jalan</strong> sebelum batas cut-off H+1.</p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">03</span>
                <h3 className="font-bold text-slate-800 text-sm">Pukul 09:30 - 11:00 WIB</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Buka menu <strong>Logbook Kendaraan</strong> &gt; periksa <strong>Checklist Kebun (Unit)</strong> untuk memastikan seluruh armada aktif telah terisi.</p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">04</span>
                <h3 className="font-bold text-slate-800 text-sm">Akhir Bulan (Tgl 28 - 31)</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Buka menu <strong>Berita Acara</strong> &gt; periksa rekonsiliasi jam operasi bulanan &gt; cetak dokumen PDF &gt; upload bukti bertandatangan.</p>
              </div>
            </div>

            <CodeSnippet
              language="json"
              title="Format Payload Simpan Jam Jalan Matriks (Web Matrix)"
              code={`{
  "plant": "5F01",
  "year_month": "2026-09",
  "equipment_code": "2000015518",
  "equipment_desc": "DORONG TBS PKS MELIAU",
  "daily_hours": {
    "2026-09-01": 8.5,
    "2026-09-02": 9.0,
    "2026-09-03": 7.5,
    "2026-09-04": 8.0,
    "2026-09-05": 8.5,
    "2026-09-06": 0.0,
    "2026-09-07": 8.0
  },
  "status": "Normal",
  "updated_by": "ANDHI HARTADI (13004627)"
}`}
            />
          </div>
        );

      case 'ik11-sop':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Logbook Mesin Pabrik</p>
            <h1 className="text-3xl font-black text-slate-900">SOP Input Jam Jalan Mesin Pabrik (IK11)</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pencatatan jam operasi harian mesin pabrik mengacu pada standar T-Code SAP <code>IK11</code> (Enter Measurement Reading for Point).
            </p>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <h4 className="font-bold text-emerald-700">1. Batas Waktu Pengisian (Cut-Off)</h4>
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

            <CodeSnippet
              language="sql"
              title="Struktur Tabel PostgreSQL daily_logs (Penyimpanan Jam Jalan Mesin)"
              code={`CREATE TABLE IF NOT EXISTS daily_logs (
  id BIGSERIAL PRIMARY KEY,
  plant VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  equipment VARCHAR(50) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Normal',
  notes TEXT,
  read_by VARCHAR(50),
  synced_to_sap BOOLEAN DEFAULT false,
  sap_doc_num VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_plant_eq_date UNIQUE (plant, equipment, date)
);

-- Index performa tinggi untuk pencarian matriks per bulan dan plant:
CREATE INDEX IF NOT EXISTS idx_daily_logs_plant_date ON daily_logs (plant, date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_equipment ON daily_logs (equipment);`}
            />

            <CodeSnippet
              language="sql"
              title="Kueri Agregasi Total Jam Jalan Mesin Pabrik per Bulan"
              code={`-- Menghitung total jam operasi (Jam & Menit) per equipment selama bulan berjalan:
SELECT 
  plant,
  equipment,
  COUNT(date) AS hari_terisi,
  SUM(duration_minutes) / 60.0 AS total_jam_operasi,
  ROUND(AVG(duration_minutes) / 60.0, 2) AS rata_rata_jam_per_hari
FROM daily_logs
WHERE plant = '5F01' 
  AND date >= '2026-09-01' AND date <= '2026-09-30'
GROUP BY plant, equipment
ORDER BY total_jam_operasi DESC;`}
            />
          </div>
        );

      case 'stasiun-pabrik':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Logbook Mesin Pabrik</p>
            <h1 className="text-3xl font-black text-slate-900">Hierarki Stasiun &amp; Equipment PKS</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Struktur peralatan mesin pada Pabrik Kelapa Sawit (PKS) di lingkungan PTPN IV Regional V dibagi ke dalam 9 stasiun proses utama yang terhubung secara serial.
            </p>

            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { no: '01', name: 'Loading Ramp & Timbangan', eq: 'Hopper, Hydraulic Door, Transfer Carriage' },
                { no: '02', name: 'Stasiun Sterilizer', eq: 'Sterilizer Door, Cantilever Rail, Blow-down Silencer' },
                { no: '03', name: 'Stasiun Threshing', eq: 'Auto Feeder, Rotary Drum Thresher, Bottom Conveyor' },
                { no: '04', name: 'Stasiun Press', eq: 'Digester, Screw Press, Cake Breaker Conveyor (CBC)' },
                { no: '05', name: 'Stasiun Klarifikasi', eq: 'Sand Trap, Vibrating Screen, Continuous Settling Tank' },
                { no: '06', name: 'Stasiun Nut & Kernel', eq: 'Depericarper, Polishing Drum, Ripple Mill, Claybath' },
                { no: '07', name: 'Stasiun Boiler', eq: 'Feed Water Pump, Induced Draft Fan (IDF), Forced Draft Fan' },
                { no: '08', name: 'Power House', eq: 'Steam Turbine Generator, Diesel Genset, Synchronizing Panel' },
                { no: '09', name: 'Water Treatment & IPAL', eq: 'Clarifier Water, Sand Filter, Anaerobic Pond Mixer' },
              ].map(st => (
                <div key={st.no} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">{st.no}</span>
                    <h4 className="text-xs font-bold text-slate-800">{st.name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500">{st.eq}</p>
                </div>
              ))}
            </div>

            <CodeSnippet
              language="javascript"
              title="Pemetaan Hierarki Equipment Induk & Anak di JavaScript"
              code={`export const PKS_STATION_HIERARCHY = {
  '5F01': {
    plantName: 'PKS GUNUNG MELIAU',
    stations: [
      {
        id: 'ST-01',
        name: 'STASIUN LOADING RAMP',
        equipments: [
          { eqNum: '10000101', desc: 'Hydraulic Loading Ramp 01', type: 'Induk' },
          { eqNum: '10000102', desc: 'Fruit Transfer Conveyor', type: 'Anak', parent: '10000101' }
        ]
      },
      {
        id: 'ST-07',
        name: 'STASIUN BOILER',
        equipments: [
          { eqNum: '10000701', desc: 'Boiler No. 1 (Kapasitas 30 Ton/h)', type: 'Induk' },
          { eqNum: '10000702', desc: 'Induced Draft Fan (IDF) 01', type: 'Anak', parent: '10000701' }
        ]
      }
    ]
  }
};`}
            />
          </div>
        );

      case 'ik11-deadline':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Logbook Mesin Pabrik</p>
            <h1 className="text-3xl font-black text-slate-900">Ketentuan Batas Waktu H+1 &amp; Kepatuhan</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ketepatan waktu penginputan jam jalan mesin pabrik merupakan KPI penting operasional Regional 5. Batas waktu toleransi penginputan diatur ketat oleh sistem.
            </p>

            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900 shadow-xs">
              <h4 className="font-bold flex items-center gap-1.5 text-sm">
                <AlertCircle size={16} className="text-amber-700" />
                Aturan Cut-Off Pukul 09:00 WIB
              </h4>
              <p className="leading-relaxed">
                Data jam jalan mesin tanggal <code>D</code> wajib disimpan paling lambat tanggal <code>D+1 pukul 09:00 WIB</code>. Jika melebihi batas waktu tersebut:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Status pada Matriks Regional akan otomatis ditandai sebagai <strong>KOSONG / TERLAMBAT</strong>.</li>
                <li>Persetujuan pembukaan tanggal lewat batas waktu memerlukan verifikasi izin dari Key User DEV.</li>
              </ul>
            </div>

            <CodeSnippet
              language="javascript"
              title="Logika Validasi Deadline Pengisian Jam Jalan"
              code={`// Pengecekan apakah penginputan tanggal target sudah melewati deadline
export function isInputLocked(targetDateStr, userRole, maxAllowedTime = '09:00') {
  if (userRole === 'DEV') return false; // DEV bebas simulasi tanggal

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');

  // Input untuk hari ini selalu dibuka
  if (targetDateStr === todayStr) return false;

  // Input untuk kemarin dibuka sebelum jam cut-off
  if (targetDateStr === yesterdayStr) {
    const currentHourMin = format(now, 'HH:mm');
    return currentHourMin > maxAllowedTime;
  }

  // Tanggal lebih lampau (H-2 kebawah) terkunci untuk USER
  return targetDateStr < yesterdayStr;
}`}
            />
          </div>
        );

      case 'zesthlp16pa':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Kendaraan &amp; Alat Berat</p>
            <h1 className="text-3xl font-black text-slate-900">Petunjuk T-Code ZESTHLP16PA</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              T-Code <code>ZESTHLP16PA</code> digunakan pada SAP GUI untuk mengekstrak data operasional logbook harian armada kendaraan dan alat berat 28 unit Regional 5.
            </p>

            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900">Langkah Ekstraksi di SAP GUI:</h3>
              <ol className="space-y-2 list-decimal list-inside text-xs text-slate-700">
                <li className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  Buka SAP GUI &gt; ketik <code>ZESTHLP16PA</code> pada command bar &gt; tekan Enter.
                </li>
                <li className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  Masukkan parameter: <strong>Company Code: 2000</strong>, <strong>Plant: [Kode Unit misal 5F01]</strong>, dan periode tanggal satu bulan penuh.
                </li>
                <li className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  Jalankan laporan (tekan <code>F8</code>) &gt; klik Menu <code>List &gt; Export &gt; Spreadsheet (*.xlsx)</code>.
                </li>
                <li className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  Buka menu <strong>Logbook Kendaraan</strong> &gt; klik tombol <strong>Upload ZESTHLP16PA</strong> untuk sinkronisasi otomatis ke cloud.
                </li>
              </ol>
            </div>

            <CodeSnippet
              language="sql"
              title="Skema Database PostgreSQL untuk ZESTHLP16PA (vehicle_logs)"
              code={`CREATE TABLE IF NOT EXISTS vehicle_master (
  vehicle_code VARCHAR(30) PRIMARY KEY,
  description TEXT,
  plant VARCHAR(10) NOT NULL,
  cost_center VARCHAR(30),
  wilayah VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_logs (
  activity_number VARCHAR(50) PRIMARY KEY,
  vehicle_code VARCHAR(30) REFERENCES vehicle_master(vehicle_code),
  plant VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  vehicle_time VARCHAR(20),
  job_code VARCHAR(30),
  hm_km NUMERIC(10,2) DEFAULT 0,
  unit_value NUMERIC(10,2) DEFAULT 0,
  uom VARCHAR(20),
  location_code VARCHAR(50),
  operator VARCHAR(100),
  reference TEXT,
  remarks TEXT,
  measurement_doc VARCHAR(50),
  document_number VARCHAR(50),
  spbs_number VARCHAR(50),
  cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vlogs_plant_date ON vehicle_logs (plant, date);
CREATE INDEX IF NOT EXISTS idx_vlogs_vehicle_code ON vehicle_logs (vehicle_code);`}
            />
          </div>
        );

      case 'master-kendaraan':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Kendaraan &amp; Alat Berat</p>
            <h1 className="text-3xl font-black text-slate-900">Master 235 Kendaraan Regional 5</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Database Master Kendaraan memuat <strong>235 unit armada</strong> kendaraan angkut dan alat berat yang beroperasi aktif di seluruh wilayah Kalimantan Barat, Kalimantan Tengah, dan Kalimantan Timur.
            </p>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Kategori 1</span>
                <h4 className="text-sm font-bold text-slate-800 mt-1">Dump Truck &amp; Tangki</h4>
                <p className="text-xs text-slate-500 mt-1">Armada pengangkutan TBS, CPO, kernel, pupuk, dan tankos solid.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Kategori 2</span>
                <h4 className="text-sm font-bold text-slate-800 mt-1">Alat Berat (Heavy Eq.)</h4>
                <p className="text-xs text-slate-500 mt-1">Wheel Loader, Bulldozer, Excavator, Vibratory Roller untuk pemeliharaan jalan kebun.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Kategori 3</span>
                <h4 className="text-sm font-bold text-slate-800 mt-1">Traktor &amp; Operasional</h4>
                <p className="text-xs text-slate-500 mt-1">Traktor pertanian, genset mobile, dan kendaraan dinas kebun.</p>
              </div>
            </div>

            <CodeSnippet
              language="javascript"
              title="Kueri Pengambilan Data Master Kendaraan dengan Cache"
              code={`import { supabase } from '../lib/supabase';

// Cache memory untuk respon instan tanpa query berulang
const masterCache = new Map();

export async function fetchVehicleMaster(forceRefresh = false) {
  if (!forceRefresh && masterCache.has('all_vehicles')) {
    return { data: masterCache.get('all_vehicles'), error: null };
  }

  const { data, error } = await supabase
    .from('vehicle_master')
    .select('vehicle_code, description, plant, cost_center, wilayah')
    .order('plant', { ascending: true })
    .order('vehicle_code', { ascending: true });

  if (!error && data) {
    masterCache.set('all_vehicles', data);
  }
  return { data, error };
}`}
            />
          </div>
        );

      case 'jobcodes':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Kendaraan &amp; Alat Berat</p>
            <h1 className="text-3xl font-black text-slate-900">Job Codes &amp; Satuan Operasional</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Setiap transaksi logbook kendaraan wajib menyertakan kode pekerjaan (Job Code) standar SAP untuk penelusuran biaya dan alokasi cost center secara otomatis.
            </p>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="px-4 py-3">Kode Pekerjaan</th>
                    <th className="px-4 py-3">Deskripsi Pekerjaan</th>
                    <th className="px-4 py-3">Satuan Ukur (UoM)</th>
                    <th className="px-4 py-3">Pola Pembebanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-800">JC-01</td>
                    <td className="px-4 py-2.5">Langsir Buah / TBS dari TPH ke Pabrik</td>
                    <td className="px-4 py-2.5 font-mono">TON / TRIP</td>
                    <td className="px-4 py-2.5">Biaya Panen &amp; Angkut TBS</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-800">JC-02</td>
                    <td className="px-4 py-2.5">Pemadatan &amp; Perbaikan Jalan Kebun</td>
                    <td className="px-4 py-2.5 font-mono">HM (Hour Meter)</td>
                    <td className="px-4 py-2.5">Pemeliharaan Infrastruktur</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-800">JC-03</td>
                    <td className="px-4 py-2.5">Angkut Pupuk &amp; Bibitan Kelapa Sawit</td>
                    <td className="px-4 py-2.5 font-mono">ZAK / TON</td>
                    <td className="px-4 py-2.5">Pemupukan Tanaman Menghasilkan</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-800">JC-04</td>
                    <td className="px-4 py-2.5">Angkut Solid, Tankos &amp; Abu Janjang</td>
                    <td className="px-4 py-2.5 font-mono">TON / TRIP</td>
                    <td className="px-4 py-2.5">Aplikasi Limbah Pabrik ke Kebun</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-800">JC-05</td>
                    <td className="px-4 py-2.5">Transportasi CPO / Kernel ke Bulking</td>
                    <td className="px-4 py-2.5 font-mono">TON / KM</td>
                    <td className="px-4 py-2.5">Pengiriman Produksi Utama</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <CodeSnippet
              language="javascript"
              title="Konstanta Mapping Job Codes di Frontend React"
              code={`export const JOB_CODE_DESC = {
  'JC-01': 'Langsir Buah TBS ke Pabrik',
  'JC-02': 'Pemadatan & Rawat Jalan Kebun',
  'JC-03': 'Langsir Pupuk & Bahan Kimia',
  'JC-04': 'Aplikasi Tankos & Solid PKS',
  'JC-05': 'Transport CPO / Palm Kernel',
  'JC-06': 'Pembersihan Parit / Drainase',
  'JC-07': 'Operasional Genset / Pembangkit',
  'JC-08': 'Dinas Operasional Kebun'
};

export const UOM_LABEL = {
  'HM': 'Hour Meter (Jam Kerja)',
  'KM': 'Kilometer (Jarak Tempuh)',
  'TON': 'Tonase Hasil Angkut',
  'TRIP': 'Jumlah Ritase / Trip'
};`}
            />
          </div>
        );

      case 'zco-cctr':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">Verifikasi Biaya</p>
            <h1 className="text-3xl font-black text-slate-900">Verifikasi Biaya Cost Center (ZCO_CCTR_01)</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Laporan SAP <code>ZCO_CCTR_01</code> menyajikan realisasi pembebanan biaya operasional per Cost Center kendaraan dan perbandingan dengan tarif log internal.
            </p>

            <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2 shadow-xs">
              <p className="font-bold text-emerald-700">Tujuan Rekonsiliasi:</p>
              <p>Mencocokkan apakah biaya BBM, suku cadang, dan jasa pemeliharaan pada SAP CO sesuai dengan akumulasi HM/KM yang tercatat pada logbook harian kendaraan.</p>
            </div>

            <CodeSnippet
              language="sql"
              title="Kueri SQL: Rekonsiliasi Biaya Kendaraan vs Jam Kerja (HM/KM)"
              code={`-- Membandingkan total jam kerja logbook dengan alokasi cost center:
SELECT 
  vl.plant,
  vl.vehicle_code,
  vm.description AS nama_kendaraan,
  vm.cost_center,
  COUNT(vl.activity_number) AS total_transaksi,
  SUM(CASE WHEN vl.uom = 'HM' THEN vl.hm_km ELSE 0 END) AS total_hm,
  SUM(CASE WHEN vl.uom = 'KM' THEN vl.hm_km ELSE 0 END) AS total_km,
  SUM(vl.unit_value) AS total_hasil_angkut
FROM vehicle_logs vl
LEFT JOIN vehicle_master vm ON vl.vehicle_code = vm.vehicle_code
WHERE vl.date BETWEEN '2026-08-01' AND '2026-08-31'
  AND vl.cancelled = false
GROUP BY vl.plant, vl.vehicle_code, vm.description, vm.cost_center
ORDER BY vl.plant, total_hm DESC;`}
            />
          </div>
        );

      case 'zco-filter':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">Verifikasi Biaya</p>
            <h1 className="text-3xl font-black text-slate-900">Aturan Subtotal &amp; Pembersihan Data ZCO</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Hasil ekspor mentah dari SAP GUI sering memuat baris subtotal regional seperti <code>PLANT 5F01 LOG RATE</code> yang jika tidak dibersihkan akan menyebabkan perhitungan ganda.
            </p>

            <CodeSnippet
              language="javascript"
              title="Fungsi Pembersihan Otomatis Baris Subtotal SAP"
              code={`// Membersihkan baris subtotal & header duplikat dari file Excel ZCO SAP:
export function cleanZcoExcelRows(rawRows) {
  return rawRows.filter(row => {
    // 1. Ambil kolom pengenal cost center / akun
    const cctr = String(row['Cost Center'] || row['cctr'] || '').trim().toUpperCase();
    const desc = String(row['Description'] || row['desc'] || '').trim().toUpperCase();

    // 2. Buang baris subtotal agregat
    if (cctr.includes('TOTAL') || cctr.includes('LOG RATE') || cctr.includes('SUBTOTAL')) {
      return false;
    }
    if (desc.includes('PLANT') && desc.includes('RATE')) {
      return false;
    }

    // 3. Pastikan baris memiliki kode kendaraan / cost center yang valid
    return cctr.length > 3 && !isNaN(Number(row['Actual Cost'] || row['Biaya Realisasi'] || 0));
  });
}`}
            />
          </div>
        );

      case 'wo-lifecycle':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Monitoring Work Order</p>
            <h1 className="text-3xl font-black text-slate-900">Siklus Hidup Work Order (CRTD/REL/TECO)</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Setiap perintah kerja pemeliharaan mesin (Maintenance Order) melewati empat status utama dari penerbitan hingga penyelesaian keuangan di SAP PM:
            </p>

            <div className="grid sm:grid-cols-4 gap-3">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-black text-slate-400">STATUS 1</span>
                <h4 className="text-sm font-bold text-slate-800">CRTD (Created)</h4>
                <p className="text-xs text-slate-500">Order baru dibuat, belum disetujui untuk pengadaan suku cadang.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-blue-200 bg-blue-50/40 shadow-xs space-y-1">
                <span className="text-xs font-black text-blue-600">STATUS 2</span>
                <h4 className="text-sm font-bold text-blue-900">REL (Released)</h4>
                <p className="text-xs text-blue-700">Order disetujui, reservasi material gudang dapat dicairkan.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs space-y-1">
                <span className="text-xs font-black text-emerald-600">STATUS 3</span>
                <h4 className="text-sm font-bold text-emerald-900">TECO (Completed)</h4>
                <p className="text-xs text-emerald-700">Pekerjaan fisik mesin selesai, tinggal settlement biaya.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-purple-200 bg-purple-50/40 shadow-xs space-y-1">
                <span className="text-xs font-black text-purple-600">STATUS 4</span>
                <h4 className="text-sm font-bold text-purple-900">CLSD (Closed)</h4>
                <p className="text-xs text-purple-700">Penyelesaian akuntansi penuh, order terkunci permanen.</p>
              </div>
            </div>

            <CodeSnippet
              language="sql"
              title="Kueri Pelacakan Order Terbuka (CRTD & REL) yang Belum TECO"
              code={`-- Mendeteksi Work Order yang belum diselesaikan (Outstanding WO):
SELECT 
  plant,
  order_number,
  order_type,
  equipment_desc,
  system_status,
  created_on,
  CURRENT_DATE - created_on AS umur_order_hari
FROM work_orders
WHERE system_status NOT LIKE '%TECO%' 
  AND system_status NOT LIKE '%CLSD%'
ORDER BY umur_order_hari DESC;`}
            />
          </div>
        );

      case 'pm01-pm02-pm04':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Monitoring Work Order</p>
            <h1 className="text-3xl font-black text-slate-900">Tipe Order (PM01, PM02, PM04)</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Standarisasi klasifikasi jenis pemeliharaan pada SAP PM PTPN IV:
            </p>

            <div className="space-y-3">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-xs">PM01</span>
                  <h4 className="font-bold text-sm text-slate-800">Planned Corrective Maintenance</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">Perbaikan terencana berdasarkan temuan inspeksi berkala sebelum terjadi kerusakan total.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">PM02</span>
                  <h4 className="font-bold text-sm text-slate-800">Preventive Maintenance</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">Pemeliharaan pencegahan berbasis jadwal siklus waktu atau jam operasi (greasing, ganti oli rutin, servis kalibrasi).</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono font-bold text-xs">PM04</span>
                  <h4 className="font-bold text-sm text-slate-800">Breakdown / Emergency Maintenance</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">Perbaikan darurat akibat kerusakan mendadak yang menyebabkan mesin berhenti operasi (stagnasi pabrik).</p>
              </div>
            </div>
          </div>
        );

      case 'wo-integration':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Monitoring Work Order</p>
            <h1 className="text-3xl font-black text-slate-900">Upload Berkas IW39, ZVTAB, 046EXP</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sistem menyatukan tiga sumber data SAP terpisah ke dalam satu tampilan terpadu melalui penggabungan berbasis nomor order (<code>AUFNR</code>).
            </p>

            <CodeSnippet
              language="javascript"
              title="Logika Penggabungan File IW39 + ZVTAB + 046EXP"
              code={`// Menggabungkan 3 file Excel SAP berdasarkan nomor Work Order (Order Number):
export function mergeWorkOrderFiles(iw39Rows, zvtabRows, expRows) {
  const mergedMap = new Map();

  // 1. Base header dari IW39
  iw39Rows.forEach(row => {
    const orderNo = String(row['Order'] || row['Order Number'] || '').trim();
    if (orderNo) {
      mergedMap.set(orderNo, { ...row, orderNo, activities: [], costs: [] });
    }
  });

  // 2. Masukkan rincian aktivitas dari ZVTAB
  zvtabRows.forEach(row => {
    const orderNo = String(row['Order'] || '').trim();
    if (mergedMap.has(orderNo)) {
      mergedMap.get(orderNo).activities.push(row);
    }
  });

  // 3. Masukkan realisasi biaya aktual dari 046EXP
  expRows.forEach(row => {
    const orderNo = String(row['Order'] || '').trim();
    if (mergedMap.has(orderNo)) {
      mergedMap.get(orderNo).costs.push(row);
    }
  });

  return Array.from(mergedMap.values());
}`}
            />
          </div>
        );

      case 'ik17-verification':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">Sinkronisasi &amp; Laporan</p>
            <h1 className="text-3xl font-black text-slate-900">Verifikasi Pembacaan SAP (IK17)</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              T-Code <code>IK17</code> digunakan untuk memverifikasi dokumen pengukuran (Measurement Document) yang telah berhasil di-posting ke sistem SAP.
            </p>

            <CodeSnippet
              language="sql"
              title="Kueri Pencocokan Dokumen SAP IK17 vs Input Logbook Web"
              code={`-- Mendeteksi entri jam jalan web yang belum terbit nomor dokumen SAP:
SELECT 
  plant,
  date,
  equipment,
  duration_minutes / 60.0 AS jam_input,
  synced_to_sap,
  sap_doc_num
FROM daily_logs
WHERE synced_to_sap = false 
  AND date <= CURRENT_DATE - INTERVAL '1 day'
ORDER BY date DESC, plant ASC;`}
            />
          </div>
        );

      case 'berita-acara-sop':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">Sinkronisasi &amp; Laporan</p>
            <h1 className="text-3xl font-black text-slate-900">Penerbitan Berita Acara Online</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Dokumen resmi Berita Acara Jam Operasi Bulanan diterbitkan secara otomatis dari data spreadsheet Google Sheets terintegrasi dengan penyesuaian tersimpan di Supabase Cloud.
            </p>

            <CodeSnippet
              language="javascript"
              title="Kode Integrasi: Google Sheets JSONP Loader (Berita Acara)"
              code={`export const loadGoogleSheetJSONP = (jsonpUrl) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callbackName = 'gviz_jsonp_' + Date.now();

    window[callbackName] = (data) => {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    script.src = \`\${jsonpUrl}&tqx=responseHandler:\${callbackName}\`;
    script.onerror = (err) => {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('Gagal menghubungi Google Sheets API'));
    };
    document.body.appendChild(script);
  });
};`}
            />
          </div>
        );

      case 'troubleshooting-sap':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">Sinkronisasi &amp; Laporan</p>
            <h1 className="text-3xl font-black text-slate-900">Penanganan Error &amp; Selisih Data SAP</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Panduan pemecahan masalah teknis yang sering ditemui saat impor atau sinkronisasi data dengan SAP ERP:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <h4 className="font-bold text-red-600">Error 1: "Measurement Document Already Exists"</h4>
                <p className="text-slate-600">Terjadi ketika dokumen pengukuran untuk tanggal dan equipment tersebut sudah di-post sebelumnya di SAP. Solusi: Gunakan nomor dokumen yang sudah ada atau batalkan dokumen lama di IK12.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <h4 className="font-bold text-amber-600">Error 2: "Plant Code Kosong / Tidak Terdaftar"</h4>
                <p className="text-slate-600">Data mentah tidak menyertakan kode plant. Sistem menyediakan tombol <strong>Perbaiki Plant</strong> untuk mengaitkan equipment ke plant induk secara otomatis.</p>
              </div>
            </div>

            <CodeSnippet
              language="sql"
              title="Kueri Perbaikan Data Plant yang Kosong (Repair Script)"
              code={`-- Memperbaiki logbook lama yang kode plant-nya kosong berdasarkan master kendaraan:
UPDATE vehicle_logs vl
SET plant = vm.plant
FROM vehicle_master vm
WHERE vl.vehicle_code = vm.vehicle_code
  AND (vl.plant IS NULL OR vl.plant = '');`}
            />
          </div>
        );

      case 'master-templates':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Admin &amp; Developer</p>
            <h1 className="text-3xl font-black text-slate-900">Manajemen Master EQ &amp; Template Regional</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pengaturan hierarki master data equipment pabrik dan sinkronisasi berkala dari Master Template Google Sheets Regional V.
            </p>

            <CodeSnippet
              language="javascript"
              title="Logika Parsing Kode Equipment Terstruktur"
              code={`// Format kode equipment standar: [PLANT]-[STASIUN]-[NO_URUT]
// Contoh: 5F01-ST07-EQ001 (PKS Meliau, Stasiun Boiler, Boiler 01)
export function parseStructuredEqCode(eqCode) {
  const parts = eqCode.split('-');
  return {
    plant: parts[0] || '5F01',
    station: parts[1] || 'ST-01',
    eqIndex: parts[2] || 'EQ001'
  };
}`}
            />
          </div>
        );

      case 'user-management':
        return (
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Admin &amp; Developer</p>
            <h1 className="text-3xl font-black text-slate-900">Manajemen Akun &amp; Keamanan Sandi</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Autentikasi menggunakan standar hashing kriptografi <strong>SHA-256</strong> langsung pada browser klien menggunakan Web Crypto API sebelum disimpan ke database.
            </p>

            <CodeSnippet
              language="javascript"
              title="Fungsi Kriptografi SHA-256 Hash Password"
              code={`// Hashing sandi menggunakan Web Crypto API standar W3C:
export async function hashPassword(plainText) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}`}
            />

            <CodeSnippet
              language="sql"
              title="Kueri Pembaruan Sandi & Otorisasi Pengguna"
              code={`-- Mengubah sandi pengguna dengan hash SHA-256:
UPDATE app_users 
SET 
  password_hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  updated_at = NOW()
WHERE nik = '13004627';`}
            />
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

            <CodeSnippet
              language="javascript"
              title="API Sinkronisasi Knowledge Base dengan Database Cloud"
              code={`import { supabase } from '../lib/supabase';

// Mengambil seluruh entri Knowledge Base dari Supabase Cloud
export async function fetchKnowledgeBase() {
  return await supabase
    .from('knowledge_base')
    .select('*')
    .order('created_at', { ascending: false });
}

// Menyimpan pembaruan Q&A ke Supabase Cloud
export async function saveKnowledgeBase(articles) {
  return await supabase
    .from('knowledge_base')
    .upsert(articles, { onConflict: 'id' });
}`}
            />

            <div className="space-y-3 pt-2">
              {customArticles.map((item) => (
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
