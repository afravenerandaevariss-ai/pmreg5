import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, Plus, Search, Edit3, Trash2, Copy, Check, RefreshCw, 
  Download, Upload, HelpCircle, Tag, X, Save, AlertCircle, CheckCircle, 
  Sparkles, Layers, FileText, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { fetchKnowledgeBase, saveKnowledgeBase } from '../lib/supabaseService';

export const DEFAULT_KNOWLEDGE_BASE = [
  {
    id: 'kb-1',
    category: 'Logbook Harian (IK11)',
    q: 'Batas waktu pengisian Logbook Harian?',
    a: 'Pengisian logbook harian mesin pabrik dan operasional wajib diselesaikan maksimal H+1 pukul 09:00 WIB setiap harinya untuk memastikan sinkronisasi data regional berjalan lancar.',
    tags: ['logbook', 'deadline', 'h+1', 'waktu', 'jam']
  },
  {
    id: 'kb-2',
    category: 'Kendaraan & Alat Berat',
    q: 'T-Code untuk input HM Kendaraan dan Alat Berat?',
    a: 'Untuk input HM kendaraan dan alat berat, gunakan T-Code ZESTHLP16PA pada modul SAP Front End. File ekspor logbook dari SAP ini kemudian dapat diunggah ke menu Logbook Kendaraan di web.',
    tags: ['kendaraan', 'alat berat', 'zesthlp16pa', 'hm', 't-code']
  },
  {
    id: 'kb-3',
    category: 'Berita Acara',
    q: 'Bagaimana prosedur pembuatan Berita Acara Equipment?',
    a: '1. Masuk ke menu Berita Acara pada bagian Sinkronisasi & Laporan.\n2. Pilih unit/kebun Anda lalu klik "Muat Data".\n3. Klik "Edit di Google Sheets" untuk verifikasi/koreksi catatan.\n4. Kembali ke web dan klik "Muat Ulang Data".\n5. Klik "Cetak PDF" untuk mengunduh dokumen resmi siap tanda tangan.',
    tags: ['berita acara', 'ba', 'pdf', 'cetak', 'prosedur']
  },
  {
    id: 'kb-4',
    category: 'SAP PM & Otorisasi',
    q: 'Plant atau Unit tidak muncul saat input di SAP?',
    a: 'Pastikan user ID / NIK Bapak/Ibu sudah memiliki otorisasi untuk Plant yang dituju. Jika belum memiliki otorisasi, silakan ajukan form penambahan role/otorisasi SAP ke tim Key User PM Regional 5.',
    tags: ['plant', 'otorisasi', 'user id', 'nik', 'hak akses']
  },
  {
    id: 'kb-5',
    category: 'Verifikasi SAP (IK17)',
    q: 'Cara mengatasi error selisih atau invalid date pada IK17?',
    a: 'Jika terjadi error pada sinkronisasi IK17, pastikan urutan tanggal Measurement Time tidak terbalik dengan pembacaan sebelumnya. Tanggal dan jam pencatatan harus selalu bergerak maju secara kronologis.',
    tags: ['ik17', 'verifikasi', 'error', 'selisih', 'measurement']
  },
  {
    id: 'kb-6',
    category: 'Biaya & Rekonsiliasi (ZCO)',
    q: 'Format file apa yang digunakan untuk Verifikasi Biaya ZCO?',
    a: 'Gunakan ekspor SAP ZCO_CCTR_01 dalam format file Excel (.xlsx). Pastikan kolom Plant, Cost Center, dan Biaya Pemeliharaan terisi lengkap untuk rekonsiliasi biaya unit.',
    tags: ['zco', 'zco_cctr_01', 'biaya', 'cost center', 'rekonsiliasi']
  },
  {
    id: 'kb-7',
    category: 'Work Order (IW39)',
    q: 'Bagaimana alur integrasi Work Order di dashboard web?',
    a: 'Data realisasi WO diperbarui melalui upload 3 file referensi SAP: IW39 (Daftar Order), ZVTAB (Tabel Kendaraan), dan 046EXP (Realisasi Biaya WO). Status WO mencakup CRTD, REL, TECO, dan CLSD.',
    tags: ['iw39', 'zvtab', '046exp', 'work order', 'wo', 'teco']
  },
  {
    id: 'kb-8',
    category: 'Troubleshooting & Akun',
    q: 'Lupa password atau akun tidak dapat login?',
    a: 'Gunakan password default awal (123) atau klik link bantuan WhatsApp Key User di halaman login. Admin/DEV dapat mereset password melalui menu Pengaturan > Manajemen User.',
    tags: ['password', 'login', 'reset', 'akun', 'bantuan']
  }
];

const CATEGORY_COLORS = {
  'Logbook Harian (IK11)': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Kendaraan & Alat Berat': 'bg-amber-50 text-amber-700 border-amber-200',
  'Berita Acara': 'bg-teal-50 text-teal-700 border-teal-200',
  'SAP PM & Otorisasi': 'bg-blue-50 text-blue-700 border-blue-200',
  'Verifikasi SAP (IK17)': 'bg-purple-50 text-purple-700 border-purple-200',
  'Biaya & Rekonsiliasi (ZCO)': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Work Order (IW39)': 'bg-orange-50 text-orange-700 border-orange-200',
  'Troubleshooting & Akun': 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function KnowledgeBaseManager({ currentUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    category: 'SAP PM & Otorisasi',
    customCategory: '',
    q: '',
    a: '',
    tags: ''
  });

  const fileInputRef = useRef(null);

  const loadData = async (force = false) => {
    setLoading(true);
    try {
      const { data, error } = await fetchKnowledgeBase(force);
      if (data && Array.isArray(data) && data.length > 0) {
        setItems(data);
      } else {
        setItems(DEFAULT_KNOWLEDGE_BASE);
      }
    } catch (e) {
      console.error('Error loading Knowledge Base:', e);
      setItems(DEFAULT_KNOWLEDGE_BASE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach(it => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const qText = (item.q || '').toLowerCase();
      const aText = (item.a || '').toLowerCase();
      const catText = (item.category || '').toLowerCase();
      const tagsText = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : (item.tags || '').toLowerCase();

      return qText.includes(q) || aText.includes(q) || catText.includes(q) || tagsText.includes(q);
    });
  }, [items, selectedCategory, searchQuery]);

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.q.trim() || !formData.a.trim()) {
      showToast('error', 'Pertanyaan dan Jawaban wajib diisi!');
      return;
    }

    const cat = formData.customCategory.trim() ? formData.customCategory.trim() : formData.category;
    const tagArray = typeof formData.tags === 'string' 
      ? formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : (formData.tags || []);

    let updatedList;
    if (editingItem) {
      updatedList = items.map(it => it.id === editingItem.id ? {
        ...it,
        category: cat,
        q: formData.q.trim(),
        a: formData.a.trim(),
        tags: tagArray,
        updated_at: new Date().toISOString(),
        updated_by: currentUser?.name || currentUser?.nik || 'DEV'
      } : it);
    } else {
      const newItem = {
        id: 'kb-' + Date.now(),
        category: cat,
        q: formData.q.trim(),
        a: formData.a.trim(),
        tags: tagArray,
        created_at: new Date().toISOString(),
        created_by: currentUser?.name || currentUser?.nik || 'DEV'
      };
      updatedList = [newItem, ...items];
    }

    setSaving(true);
    const { error } = await saveKnowledgeBase(updatedList);
    setSaving(false);

    if (error) {
      showToast('error', 'Gagal menyimpan ke server: ' + (error.message || error));
    } else {
      setItems(updatedList);
      setIsModalOpen(false);
      setEditingItem(null);
      showToast('success', editingItem ? 'Item Knowledge Base berhasil diperbarui!' : 'Item Knowledge Base baru berhasil ditambahkan!');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus item Knowledge Base ini?')) return;
    const updatedList = items.filter(it => it.id !== id);
    setSaving(true);
    const { error } = await saveKnowledgeBase(updatedList);
    setSaving(false);

    if (error) {
      showToast('error', 'Gagal menghapus: ' + (error.message || error));
    } else {
      setItems(updatedList);
      showToast('success', 'Item berhasil dihapus dari Knowledge Base.');
    }
  };

  const handleResetDefault = async () => {
    if (!window.confirm('Reset Knowledge Base ke template default awal? Perubahan kustom akan ditimpa.')) return;
    setSaving(true);
    const { error } = await saveKnowledgeBase(DEFAULT_KNOWLEDGE_BASE);
    setSaving(false);

    if (error) {
      showToast('error', 'Gagal mereset: ' + (error.message || error));
    } else {
      setItems(DEFAULT_KNOWLEDGE_BASE);
      showToast('success', 'Knowledge Base berhasil direset ke template default.');
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Knowledge_Base_SAP_PM_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'File JSON Knowledge Base berhasil diunduh.');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!Array.isArray(parsed)) throw new Error('Format file harus berupa array JSON');
        
        setSaving(true);
        const { error } = await saveKnowledgeBase(parsed);
        setSaving(false);

        if (error) {
          showToast('error', 'Gagal mengimpor data: ' + (error.message || error));
        } else {
          setItems(parsed);
          showToast('success', 'Berhasil mengimpor ' + parsed.length + ' item Knowledge Base!');
        }
      } catch (err) {
        showToast('error', 'File JSON tidak valid: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      category: item.category || 'SAP PM & Otorisasi',
      customCategory: '',
      q: item.q || '',
      a: item.a || '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '')
    });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      category: 'SAP PM & Otorisasi',
      customCategory: '',
      q: '',
      a: '',
      tags: ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* ── Header ── */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <BookOpen size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold tracking-tight text-white">Knowledge Base & FAQ Engine</h3>
                <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  DEV ONLY
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pusat referensi & basis pengetahuan otomatis yang terintegrasi dengan Live Chatbot Asisten PM.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenCreate}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              Tambah Q&A
            </button>
            <button
              onClick={handleExportJSON}
              title="Ekspor Backup JSON"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={14} />
              Ekspor
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Impor Backup JSON"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload size={14} />
              Impor
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              className="hidden"
              onChange={handleImportJSON}
            />
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              title="Segarkan data dari Cloud"
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Artikel</span>
            <p className="text-lg font-black text-emerald-300">{items.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kategori</span>
            <p className="text-lg font-black text-teal-300">{categories.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status Sync</span>
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle size={12} /> Terhubung Cloud
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Template</span>
              <p className="text-xs text-slate-300 mt-0.5">Default 8 FAQ</p>
            </div>
            <button
              onClick={handleResetDefault}
              className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Toast Notification ── */}
      {statusMsg && (
        <div className={`mx-6 mt-4 p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all shadow-sm ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ── Controls (Search & Category Chips) ── */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/60 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari pertanyaan, kata kunci, T-Code..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] shadow-sm transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-800">{filteredItems.length}</strong> dari {items.length} artikel
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-[#064e3b] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Semua Kategori ({items.length})
          </button>
          {categories.map(cat => {
            const count = items.filter(i => i.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#064e3b] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Knowledge Base Items List ── */}
      <div className="p-6 space-y-3.5">
        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-emerald-600" />
            <p className="text-xs font-semibold">Memuat Knowledge Base...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <HelpCircle size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-bold text-slate-600">Tidak ada artikel yang cocok</p>
            <p className="text-xs text-slate-400 mt-1">Coba gunakan kata kunci lain atau tambahkan tanya-jawab baru.</p>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isExpanded = expandedId === item.id || searchQuery.trim().length > 0;
            const badgeClass = CATEGORY_COLORS[item.category] || 'bg-slate-100 text-slate-700 border-slate-200';

            return (
              <div 
                key={item.id}
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl transition-all shadow-sm overflow-hidden"
              >
                <div 
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="p-4 cursor-pointer flex items-start justify-between gap-4 select-none hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-xs font-bold text-slate-400 mt-0.5">#{idx + 1}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>
                          {item.category}
                        </span>
                        {item.updated_by && (
                          <span className="text-[10px] text-slate-400">
                            Diperbarui oleh: {item.updated_by}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 leading-snug">
                        {item.q}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleCopy(item.id, item.a)}
                      title="Salin Jawaban"
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedId === item.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      title="Edit Q&A"
                      className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Hapus"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Answer Content */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100">
                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs font-sans">
                      {item.a}
                    </div>

                    {/* Tags */}
                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                        <Tag size={11} className="text-slate-400" />
                        {item.tags.map((t, i) => (
                          <span key={i} className="text-[10px] bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded font-mono">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal Dialog: Tambah / Edit ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  {editingItem ? <Edit3 size={16} /> : <Plus size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {editingItem ? 'Edit Item Knowledge Base' : 'Tambah Tanya-Jawab Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Sinkronisasi instan ke chatbot dan pusat bantuan</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value, customCategory: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="SAP PM & Otorisasi">SAP PM & Otorisasi</option>
                    <option value="Logbook Harian (IK11)">Logbook Harian (IK11)</option>
                    <option value="Kendaraan & Alat Berat">Kendaraan & Alat Berat</option>
                    <option value="Verifikasi SAP (IK17)">Verifikasi SAP (IK17)</option>
                    <option value="Biaya & Rekonsiliasi (ZCO)">Biaya & Rekonsiliasi (ZCO)</option>
                    <option value="Work Order (IW39)">Work Order (IW39)</option>
                    <option value="Berita Acara">Berita Acara</option>
                    <option value="Troubleshooting & Akun">Troubleshooting & Akun</option>
                    <option value="Custom">-- Ketik Kategori Lain --</option>
                  </select>

                  {formData.category === 'Custom' && (
                    <input
                      type="text"
                      required
                      placeholder="Nama kategori kustom..."
                      value={formData.customCategory}
                      onChange={e => setFormData({ ...formData, customCategory: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </div>
              </div>

              {/* Question */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Pertanyaan / Topik *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bagaimana cara input HM alat berat?"
                  value={formData.q}
                  onChange={e => setFormData({ ...formData, q: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Jawaban / Solusi Lengkap *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tuliskan jawaban, instruksi langkah-demi-langkah, atau penjelasan SOP..."
                  value={formData.a}
                  onChange={e => setFormData({ ...formData, a: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs leading-relaxed"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Kunci / Tags <span className="text-slate-400 font-normal">(Pisahkan dengan koma)</span>
                </label>
                <input
                  type="text"
                  placeholder="sap, logbook, ik11, format, error"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#064e3b] hover:bg-[#047857] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      Simpan ke Cloud
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
