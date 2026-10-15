import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, Search, Info, HelpCircle, ExternalLink, Image as ImageIcon, Code2, AlertTriangle, 
  PlayCircle, LogIn, FileText, Wrench, Play, Settings, Clipboard, CheckSquare, 
  Layers, ZoomIn, ZoomOut, Plus, Minus, X, RotateCcw, ChevronDown, ChevronUp, ChevronRight,
  Download, Copy, Check, Clock, ShieldCheck, Tag, Terminal, Cpu, Database,
  ArrowRight, FileSpreadsheet, RefreshCw, Sparkles, Filter, CheckCircle2, AlertCircle,
  Eye, EyeOff, Maximize2, Minimize2, Truck, Gauge, Activity, ListChecks
} from 'lucide-react';
import SAPAnnotatedImage from './SAPAnnotatedImage';
import SapAnnotationLayer from './SapAnnotationLayer';
import { getImageAnnotation } from '../data/sapImageAnnotations';
import SapFlowMap from './SapFlowMap';

// ─────────────────────────────────────────────────────────────
// Tema visual per pilar untuk halaman Katalog SOP (18 Modul).
// Kelas Tailwind ditulis lengkap (bukan dirangkai) agar tetap
// terdeteksi oleh scanner JIT Tailwind v4.
// ─────────────────────────────────────────────────────────────
const PILLAR_ORDER = ['pilar1', 'pilar2', 'pilar3'];

const PILLAR_THEME = {
  pilar1: {
    key: 'pilar1',
    label: 'Pilar 1: Master Data',
    short: 'Master Data',
    range: 'Modul 01–08',
    desc: 'Fondasi struktur aset: hierarki lokasi fungsional, master equipment, BOM suku cadang, work center, titik ukur HM/KM, class & characteristic, katalog kerusakan, dan task list standar.',
    bar: 'from-emerald-500 to-teal-500',
    text: 'text-emerald-700',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    softBorder: 'border-emerald-200',
    btn: 'bg-emerald-700 hover:bg-emerald-800',
    cardHover: 'hover:border-emerald-300',
    segActive: 'bg-emerald-700 text-white shadow-xs',
    tipBg: 'border-emerald-400 bg-emerald-50/60 text-emerald-900',
  },
  pilar2: {
    key: 'pilar2',
    label: 'Pilar 2: Planning & Preventif',
    short: 'Planning & Preventif',
    range: 'Modul 09–11, 17',
    desc: 'Perencanaan pemeliharaan berkala: maintenance strategy, maintenance plan otomatis, deadline monitoring IP30, serta pencatatan measurement document HM/KM harian.',
    bar: 'from-sky-500 to-cyan-500',
    text: 'text-sky-700',
    chip: 'border-sky-200 bg-sky-50 text-sky-700',
    dot: 'bg-sky-500',
    softBorder: 'border-sky-200',
    btn: 'bg-sky-700 hover:bg-sky-800',
    cardHover: 'hover:border-sky-300',
    segActive: 'bg-sky-700 text-white shadow-xs',
    tipBg: 'border-sky-400 bg-sky-50/60 text-sky-900',
  },
  pilar3: {
    key: 'pilar3',
    label: 'Pilar 3: Bisnis Proses & Eksekusi',
    short: 'Bisnis Proses',
    range: 'Modul 12–16, 18',
    desc: 'Eksekusi pekerjaan harian di lapangan: notification kerusakan, work order PM01–PM04, release order, confirmation & TECO, hingga logbook kendaraan VRA dan kontrol cost center.',
    bar: 'from-violet-500 to-purple-500',
    text: 'text-violet-700',
    chip: 'border-violet-200 bg-violet-50 text-violet-700',
    dot: 'bg-violet-500',
    softBorder: 'border-violet-200',
    btn: 'bg-violet-700 hover:bg-violet-800',
    cardHover: 'hover:border-violet-300',
    segActive: 'bg-violet-700 text-white shadow-xs',
    tipBg: 'border-violet-400 bg-violet-50/60 text-violet-900',
  },
};

export default function SAPTransactionGuideView() {
  // Dev-only check: strictly true in local dev / localhost only
  const isLocalDev = Boolean(
    import.meta.env.DEV || 
    (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname))
  );

  // Navigation State
  const [activeTab, setActiveTab] = useState('pilar3'); // 'flow' | 'pilar1' | 'pilar2' | 'pilar3' | 'troubleshoot' | 'catalog'
  const [selectedTcodeKey, setSelectedTcodeKey] = useState('iw31');
  const [detailViewMode, setDetailViewMode] = useState('steps'); // 'steps' | 'fields' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeWorkflow, setActiveWorkflow] = useState('corrective'); // 'corrective' | 'preventive' | 'logbook'
  const [selectedFlowStep, setSelectedFlowStep] = useState(1);
  const [catalogFilter, setCatalogFilter] = useState('all'); // 'all' | 'pilar1' | 'pilar2' | 'pilar3'
  const [catalogSearch, setCatalogSearch] = useState(''); // Pencarian lokal khusus halaman Katalog SOP
  const [showTcodeSidebar, setShowTcodeSidebar] = useState(false); // Hidden by default for wider right area
  const [activeDropdown, setActiveDropdown] = useState(null); // 'flow' | 'pilar1' | 'pilar2' | 'pilar3' | 'troubleshoot' | 'catalog' | null
  // Image Lightbox / Zoom Modal State
  const [zoomedImage, setZoomedImage] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [modalShowArrows, setModalShowArrows] = useState(true);
  const [modalNatural, setModalNatural] = useState(null);

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Keyboard shortcut Ctrl+K to focus search and Esc to close zoom modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('sap-guide-search-input')?.focus();
      }
      if (e.key === 'Escape' && zoomedImage) {
        setZoomedImage(null);
        setZoomScale(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImage]);

  // Database of 18 SAP PM Modules with Step-by-Step Images
  const modulesDatabase = {
    // -------------------------------------------------------------
    // PILAR 1: MASTER DATA OBJEK TEKNIS (01 - 08)
    // -------------------------------------------------------------
    il01: {
      tcode: 'IL01',
      title: 'Create Functional Location',
      moduleNo: '01',
      moduleName: 'Functional Location',
      pilar: 'pilar1',
      pilarName: 'Master Data Objek Teknis',
      role: 'Planner / Master Data Admin',
      difficulty: 'Menengah',
      purpose: 'Membuat lokasi fungsional (Functional Location) baru untuk memetakan struktur hierarki area pemeliharaan, pabrik, kebun, stasiun, hingga blok/ruang penempatan equipment.',
      ptpnStandard: 'Edit Mask PTPN: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (Contoh: N011-KP05-GD01-ST01 = Stasiun Gilingan Pabrik Kanigoro).',
      pdfFile: '01. PM-UM-02_Master Data-Functional Location v02.pdf',
      fields: [
        { name: 'Functional Loc.', type: 'Required', example: 'N011-KP05-GD01-ST01', desc: 'Kode hierarki lokasi sesuai edit mask standar PTPN.' },
        { name: 'Description', type: 'Required', example: 'STASIUN GILINGAN', desc: 'Deskripsi nama lokasi fungsional (maks. 40 karakter).' },
        { name: 'MaintPlant', type: 'Required', example: '5F01 / KP05', desc: 'Kode Maintenance Plant lokasi pabrik atau kebun.' },
        { name: 'Cost Center', type: 'Required', example: 'PTPNPG01 / 5F01ST01', desc: 'Pusat biaya penampung beban pemeliharaan di lokasi ini.' },
        { name: 'Planning Plant', type: 'Required', example: '5F01 / KP05', desc: 'Plant tempat perencanaan pemeliharaan dijalankan.' },
        { name: 'Planner Group', type: 'Required', example: 'F01 / K02', desc: 'Grup perencana yang bertanggung jawab pada lokasi ini.' },
        { name: 'Main WorkCtr', type: 'Required', example: 'TEK-GILN', desc: 'Work Center teknisi utama pelaksana perawatan di lokasi.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Navigasi Transaksi IL01 di Menu SAP',
          desc: 'Ketik T-Code IL01 di kolom command SAP GUI atau pilih menu: Logistics ➔ Plant Maintenance ➔ Management of Technical Objects ➔ Functional Location ➔ IL01 - Create, lalu tekan Enter.',
          image: '/images/il01/step_1.png',
          imgCaption: 'Layar SAP Easy Access: Menu Path Pembuatan Functional Location IL01'
        },
        {
          num: 2,
          title: 'Initial Screen: Input Kode Lokasi Sesuai Edit Mask',
          desc: 'Pada layar Initial Screen, masukkan kode Functional Location yang akan dibuat. Kode wajib mengikuti Edit Mask PTPN (XXXX-XXXX-XXXX-XXXX-XXXX-XXXX), misal: N011-KP05-GD01-ST01. Tekan Enter.',
          image: '/images/il01/step_2.png',
          imgCaption: 'Layar Initial Screen IL01: Memasukkan Kode Hierarki Functional Location'
        },
        {
          num: 3,
          title: 'Isi Tab General & Tab Organization',
          desc: 'Masukkan Deskripsi (maks 40 karakter, contoh: ST. GILINGAN). Di Tab General isi MaintPlant (KP05) dan Cost Center (PTPNPG01). Di Tab Organization isi Planning Plant, Planner Group (K02), dan Main Work Center (TEK-GILN).',
          image: '/images/il01/step_3.png',
          imgCaption: 'Layar Master Data IL01: Mengisi Parameter Tab General & Organization'
        },
        {
          num: 4,
          title: 'Simpan Dokumen (Save)',
          desc: 'Klik ikon Save (Ctrl+S). Sistem akan kembali ke layar awal dengan pesan hijau di status bar kiri bawah: "Functional location N011-KP05-GD01-ST01 created".',
          image: '/images/il01/step_4.png',
          imgCaption: 'Notifikasi Sukses Pembuatan Functional Location'
        },
        {
          num: 5,
          title: 'Lampirkan Dokumen / Gambar Teknik via GOS Attachment',
          desc: 'Untuk melampirkan foto denah atau gambar teknik, klik tombol Services for Object (di sebelah kiri judul layar) ➔ Create ➔ Create Attachment, lalu pilih file PDF/foto.',
          image: '/images/il01/step_5.png',
          imgCaption: 'Fitur GOS (Generic Object Services) untuk Melampirkan Dokumen Fisik'
        }
      ],
      tips: 'Untuk menampilkan struktur hierarki keseluruhan dalam bentuk diagram pohon stasiun, gunakan transaksi IH01 (Structural Display).'
    },

    ie01: {
      tcode: 'IE01',
      title: 'Create Equipment Master',
      moduleNo: '02',
      moduleName: 'Equipment',
      pilar: 'pilar1',
      pilarName: 'Master Data Objek Teknis',
      role: 'Planner / Traksi / Teknik Pabrik',
      difficulty: 'Menengah',
      purpose: 'Membuat nomor aset fisik alat/mesin individual (Mesin Pabrik, Kendaraan Angkutan, Alat Berat, Genset) agar riwayat kerusakan dan jam jalannya dapat dimonitor.',
      ptpnStandard: 'Equipment Type: 2 (Kendaraan/Traksi) atau M (Mesin Pabrik). Menggunakan referensi Copy Equipment untuk mempercepat input.',
      pdfFile: '02. PM-UM-02_Master Data-Equipment v02.pdf',
      fields: [
        { name: 'Valid From', type: 'Required', example: '01.01.2026', desc: 'Tanggal mulai berlaku operasional equipment.' },
        { name: 'Equipment Type', type: 'Required', example: '2 (Kendaraan) / M (Mesin)', desc: 'Kategori jenis equipment.' },
        { name: 'Reference Eq.', type: 'Optional', example: '2000021501', desc: 'Nomor equipment referensi untuk meng-copy parameter default.' },
        { name: 'Description', type: 'Required', example: 'Dump Truck Hino Dutro 130 HD', desc: 'Nama unit kendaraan / mesin pabrik.' },
        { name: 'Functional Loc.', type: 'Conditional', example: '5F01-TR01-TK01', desc: 'Lokasi fungsional tempat equipment ini dipasang/ditugaskan.' },
        { name: 'Cost Center', type: 'Required', example: '5E02QUT008', desc: 'Kode Cost Center beban biaya bahan bakar dan spare part.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Initial Screen IE01: Tipe Equipment & Referensi',
          desc: 'Ketik T-Code IE01 di command line SAP, tekan Enter. Pilih Equipment Type (misal 2 untuk Kendaraan Traksi). Masukkan nomor Reference Equipment jika ingin copy template master sebelumnya.',
          image: '/images/ie01/step_1.png',
          imgCaption: 'Layar Initial Screen IE01: Pemilihan Equipment Type & Copy Reference'
        },
        {
          num: 2,
          title: 'Tab General: Deskripsi & Manufaktur Unit',
          desc: 'Ketikkan nama deskripsi equipment (misal: Dump Truck No. 08 - KB 8812 GA). Isi merk pabrikan, tipe model, nomor rangka/mesin, dan tahun perolehan pada kolom yang tersedia.',
          image: '/images/ie01/step_2.png',
          imgCaption: 'Layar Master Data IE01: Tab General Data Kendaraan / Mesin'
        },
        {
          num: 3,
          title: 'Tab Organization: Alokasi Cost Center Beban Biaya',
          desc: 'Buka tab Organization. Masukkan kode Cost Center pemilik anggaran (misal: 5E02QUT008 untuk kendaraan unit). Masukkan Planning Plant dan Work Center pelaksana perawatan unit.',
          image: '/images/ie01/step_3.png',
          imgCaption: 'Layar IE01: Penentuan Cost Center & Work Center Unit'
        },
        {
          num: 4,
          title: 'Tab Location: Pemasangan ke Functional Location',
          desc: 'Pasangkan equipment ke lokasi fungsional penugasannya (Functional Location) di Tab Location. Klik tombol Save untuk menyimpan. SAP akan menerbitkan 10 digit nomor equipment otomatis.',
          image: '/images/ie01/step_4.png',
          imgCaption: 'Pemasangan Equipment ke Struktur Lokasi & Penyimpanan'
        }
      ],
      tips: 'Tersedia script VBS otomatisasi untuk pendaftaran massal puluhan equipment traksi tanpa input manual (lihat tab Troubleshooting).'
    },

    ib01: {
      tcode: 'IB01 / CS01',
      title: 'Bill of Material (BOM) Equipment',
      moduleNo: '03',
      moduleName: 'Bill of Material',
      pilar: 'pilar1',
      pilarName: 'Master Data Objek Teknis',
      role: 'Planner / Gudang Sparepart',
      difficulty: 'Tinggi',
      purpose: 'Menghubungkan daftar suku cadang (spare part) resmi dari master material gudang ke spesifik mesin/alat, sehingga saat teknisi membuat WO, spare part langsung muncul dalam katalog pilih.',
      ptpnStandard: 'Material spare part harus sudah terdaftar di master MM PTPN dan berstatus aktif di plant terkait.',
      pdfFile: '03. PM-UM-02_Master Data-Bill of Material v02.pdf',
      fields: [
        { name: 'Equipment', type: 'Required', example: '2000001205', desc: 'Nomor equipment mesin yang akan dibuatkan daftar part-nya.' },
        { name: 'Plant', type: 'Required', example: '5F01', desc: 'Kode Plant gudang penyimpan material.' },
        { name: 'BOM Usage', type: 'Required', example: '4 (Plant Maintenance)', desc: 'Penggunaan BOM khusus modul pemeliharaan.' },
        { name: 'Item Category', type: 'Required', example: 'L (Stock Item)', desc: 'Kategori barang gudang stok.' },
        { name: 'Component', type: 'Required', example: '82000142', desc: 'Kode material spare part SAP (misal: Bearing, Seal, Filter).' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Buka IB01: Tentukan Nomor Mesin & Usage',
          desc: 'Buka T-Code IB01 untuk BOM Equipment. Masukkan nomor Equipment mesin, Plant gudang, dan BOM Usage = 4 (Plant Maintenance), lalu tekan Enter.',
          image: '/images/ib01/step_1.png',
          imgCaption: 'Form Header BOM Equipment: Penentuan Objek & Plant'
        },
        {
          num: 2,
          title: 'Input Daftar Komponen Suku Cadang',
          desc: 'Pada tabel komponen, isi Item Category "L" (Stock Item), masukkan kode nomor material spare part pada kolom Component, dan tentukan jumlah kuantitas default per servis.',
          image: '/images/ib01/step_2.png',
          imgCaption: 'Tabel Komponen: Pengkatalogan Spare Part Resmi Mesin'
        },
        {
          num: 3,
          title: 'Atur Item Details & Satuan Ukuran',
          desc: 'Periksa satuan unit spare part (PC, SET, LTR, KG). Pastikan status material relevan untuk Plant Maintenance.',
          image: '/images/ib01/step_3.png',
          imgCaption: 'Detail Item Suku Cadang & Validasi Parameter Gudang'
        },
        {
          num: 4,
          title: 'Simpan Master BOM Mesin',
          desc: 'Klik Save. Untuk mengecek ledakan struktur part di kemudian hari, gunakan transaksi IH05 (BOM Explosion).',
          image: '/images/ib01/step_4.png',
          imgCaption: 'Penyimpanan Master BOM Pemeliharaan Berhasil'
        }
      ],
      tips: 'BOM yang rapi memangkas 70% waktu pembuatan Work Order karena planner tidak perlu mencari kode part manual di transaksi MM.'
    },

    ir01: {
      tcode: 'IR01',
      title: 'Create Work Center (Bengkel / Regu Teknisi)',
      moduleNo: '04',
      moduleName: 'Work Center',
      pilar: 'pilar1',
      pilarName: 'Master Data Objek Teknis',
      role: 'Planner / Kepala Bengkel',
      difficulty: 'Menengah',
      purpose: 'Mendefinisikan unit pelaksana kerja pemeliharaan (Bengkel Traksi, Teknisi Listrik, Mekanik Pabrik, Welder) beserta kapasitas jam kerja, kalender kerja, dan tarif alokasi biaya per jam.',
      ptpnStandard: 'Work Center Category: 0005 (Plant Maintenance). Standar Work Center PTPN: TEK-WSH (Workshop), TEK-ELC (Elektrik), TEK-TRA (Traksi).',
      pdfFile: '04. PM-UM-02_Master Data-Work Center v02.pdf',
      fields: [
        { name: 'Plant', type: 'Required', example: '5F01 / 5E01', desc: 'Kode Plant bengkel berada.' },
        { name: 'Work Center', type: 'Required', example: 'TEK-WSH', desc: 'Kode singkat identitas bengkel/regu teknisi (maks. 8 karakter).' },
        { name: 'Work Center Cat.', type: 'Required', example: '0005', desc: 'Kategori khusus Plant Maintenance.' },
        { name: 'Cost Center', type: 'Required', example: '5F01WSH01', desc: 'Pusat biaya penampung beban upah teknisi.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Initial Screen IR01: Plant & Work Center Category',
          desc: 'Ketik IR01 di SAP GUI, masukkan kode Plant, kode Work Center yang ingin dibuat (misal: TEK-WSH), dan pilih Category 0005. Tekan Enter.',
          image: '/images/ir01/step_1.png',
          imgCaption: 'Layar Initial Screen IR01: Penentuan Nama Bengkel & Kategori 0005'
        },
        {
          num: 2,
          title: 'Tab Basic Data: Deskripsi & Person Responsible',
          desc: 'Isi deskripsi bengkel (contoh: WORKSHOP MEKANIK PABRIK). Pilih Person Responsible dan tentukan Standar Value Key (SAP0).',
          image: '/images/ir01/step_2.png',
          imgCaption: 'Tab Basic Data: Deskripsi Nama Bengkel & Penanggung Jawab'
        },
        {
          num: 3,
          title: 'Tab Capacities: Jam Kerja & Jumlah Teknisi',
          desc: 'Masuk ke tab Capacities. Tentukan jam mulai kerja, jam istirahat, kapasitas jam harian (misal: 7 Jam/hari), dan jumlah tenaga kerja mekanik.',
          image: '/images/ir01/step_3.png',
          imgCaption: 'Tab Capacities: Pengaturan Kapasitas Jam Teknisi & Shift Kerja'
        },
        {
          num: 4,
          title: 'Tab Costing: Alokasi Pusat Biaya & Tarif Jam',
          desc: 'Buka tab Costing. Hubungkan dengan Cost Center bengkel dan tentukan Activity Type untuk pembebanan biaya mekanik saat konfirmasi jam kerja (IW41). Klik Save.',
          image: '/images/ir01/step_4.png',
          imgCaption: 'Tab Costing: Integrasi Biaya Upah ke Cost Center & Penyimpanan'
        }
      ],
      tips: 'Setiap teknisi yang mencatat jam kerja di transaksi IW41 akan membebankan biaya berdasarkan tarif per jam yang dikonfigurasi di tab Costing ini.'
    },

    ik01: {
      tcode: 'IK01',
      title: 'Create Measuring Point & Counter',
      moduleNo: '05',
      moduleName: 'Measuring Point',
      pilar: 'pilar1',
      pilarName: 'Master Data Objek Teknis',
      role: 'Planner / Operator Logbook',
      difficulty: 'Menengah',
      purpose: 'Membuat titik ukur fisik pada alat/mesin: Hour Meter (HM Jam Jalan) untuk mesin pabrik/genset, dan Odometer (KM) untuk kendaraan operasional, sebagai acuan perawatan preventif.',
      ptpnStandard: 'Measuring Point Category: M. Centang "Measuring point is a counter" agar nilai pembacaan bertambah terus secara akumulatif.',
      pdfFile: '05. PM-UM-02_Master Data-Measuring Point v02.pdf',
      fields: [
        { name: 'Equipment', type: 'Required', example: '2000001205', desc: 'Nomor equipment mesin yang dipasang titik ukur.' },
        { name: 'MeasPoint Category', type: 'Required', example: 'M', desc: 'Kategori titik ukur pemeliharaan.' },
        { name: 'Point is Counter', type: 'Required', example: 'Centang (Checked)', desc: 'Wajib dicentang untuk Jam Jalan / Odometer akumulatif.' },
        { name: 'Characteristic', type: 'Required', example: 'RUNNING_HOUR / ODOMETER', desc: 'Satuan karakteristik pengukuran.' },
        { name: 'Unit of Measure', type: 'Required', example: 'HR (Hour) / KM (Kilometer)', desc: 'Satuan unit ukur standar.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Initial Screen IK01: Tipe Kategori Titik Ukur',
          desc: 'Ketik IK01 di command line SAP GUI, masukkan nomor Equipment target dan MeasPoint Category = M, tekan Enter.',
          image: '/images/ik01/step_1.png',
          imgCaption: 'Layar Initial Screen IK01: Penentuan Target Equipment'
        },
        {
          num: 2,
          title: 'Konfigurasi Counter & Karakteristik Pengukuran',
          desc: 'Beri tanda centang pada checkbox "Measuring point is a counter". Masukkan Characteristic (misal RUNNING_HOUR untuk jam jalan atau ODOMETER untuk kendaraan).',
          image: '/images/ik01/step_2.png',
          imgCaption: 'Konfigurasi Titik Ukur Akumulatif & Satuan Jam/KM'
        },
        {
          num: 3,
          title: 'Pengaturan Target Nilai & Toleransi',
          desc: 'Isi perkiraan pembacaan tahunan (Annual Estimate) dan batas maksimum angka odometer sebelum roll-over (Counter Overflow).',
          image: '/images/ik01/step_3.png',
          imgCaption: 'Pengaturan Estimasi Jam Tahunan & Counter Overflow'
        },
        {
          num: 4,
          title: 'Simpan & Dapatkan Nomor Measuring Point',
          desc: 'Simpan dengan tombol Save. Catat nomor Measuring Point yang dihasilkan sistem SAP untuk digunakan setiap hari di transaksi IK11 / ZEST.',
          image: '/images/ik01/step_4.png',
          imgCaption: 'Penyimpanan Master Measuring Point Berhasil'
        }
      ],
      tips: 'Jika salah input akumulasi counter di masa mendatang, jangan ubah master IK01, melainkan lakukan koreksi dokumen via IK11/IK12.'
    },

    qs41: {
      tcode: 'QS41 / QS51',
      title: 'Catalog Kerusakan & Gejala (Catalog Groups)',
      moduleNo: '07',
      moduleName: 'Catalog & Codes',
      pilar: 'pilar1',
      pilarName: 'Master Data Objek Teknis',
      role: 'Planner / Master Data Admin',
      difficulty: 'Dasar',
      purpose: 'Standarisasi kamus kode kerusakan mesin: Jenis Kerusakan (Damage Code), Bagian Objek yang Rusak (Object Part), Penyebab Kerusakan (Cause Code), dan Tindakan Penanggulangan (Activity Code).',
      ptpnStandard: 'Catalog Type: B (Object Parts), C (Damage/Gejala), 5 (Causes/Penyebab), A (Activities/Tindakan).',
      pdfFile: '07. PM-UM-02_Master Data-Catalog v02.pdf',
      fields: [
        { name: 'Catalog Type', type: 'Required', example: 'C (Damages) / 5 (Causes)', desc: 'Tipe katalog master kode.' },
        { name: 'Catalog Group', type: 'Required', example: 'ENG (Engine) / HYD (Hydraulic)', desc: 'Grup komponen sistem mesin.' },
        { name: 'Code', type: 'Required', example: '0010, 0020, 0030', desc: 'Nomor kode unik kerusakan.' },
        { name: 'Short Text', type: 'Required', example: 'Overheat / Bocor / Patah', desc: 'Penjelasan nama kerusakan standar.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Pilih Catalog Type di Transaksi QS41',
          desc: 'Ketik QS41 di SAP GUI. Pilih Catalog Type yang ingin dikonfigurasi: C untuk Gejala Kerusakan, 5 untuk Penyebab, atau A untuk Tindakan Perbaikan. Tekan Enter.',
          image: '/images/qs41/step_1.png',
          imgCaption: 'Layar Awal QS41: Pemilihan Catalog Type Standar'
        },
        {
          num: 2,
          title: 'Buat Code Group Komponen Mesin',
          desc: 'Klik New Entries untuk membuat Code Group baru (misal: PM-MILL untuk mesin pabrik, PM-TRUK untuk kendaraan). Beri status 2 (Released).',
          image: '/images/qs41/step_2.png',
          imgCaption: 'Pembuatan Code Group & Penetapan Status Rilis'
        },
        {
          num: 3,
          title: 'Daftarkan Kode Kerusakan Detail & Simpan',
          desc: 'Klik dua kali folder Codes di sisi kiri. Masukkan daftar kode: 0010 (Mesin Mati Total), 0020 (Bocor Oli), 0030 (Getaran Berlebih). Klik tombol Save.',
          image: '/images/qs41/step_3.png',
          imgCaption: 'Daftar Kode Kerusakan Standar Holding PTPN Tersimpan'
        }
      ],
      tips: 'Penggunaan kode katalog seragam sangat penting agar laporan Pareto Failure Analysis (analisa mesin paling sering rusak) di seluruh kebun dan pabrik dapat ditarik secara akurat.'
    },

    // -------------------------------------------------------------
    // PILAR 2: PERENCANAAN & PREVENTIF (09 - 11)
    // -------------------------------------------------------------
    ia01: {
      tcode: 'IA01 / IA05',
      title: 'Maintenance Task List (SOP Langkah Servis)',
      moduleNo: '08',
      moduleName: 'Task List SOP',
      pilar: 'pilar2',
      pilarName: 'Perencanaan & Strategi',
      role: 'Maintenance Planner',
      difficulty: 'Menengah',
      purpose: 'Membuat SOP instruksi kerja pemeliharaan standar yang merinci langkah perbaikan per mesin, durasi jam mekanik, alat kerja (PRT), dan daftar suku cadang yang wajib diganti.',
      ptpnStandard: 'Tipe Task List: IA01 (Equipment Task List), IA05 (General Maintenance Task List untuk servis umum seperti Ganti Oli 250 Jam).',
      pdfFile: '08. PM-UM-02_Master Data-Task List v02.pdf',
      fields: [
        { name: 'Equipment / Group', type: 'Required', example: '2000001205 / GEN-250H', desc: 'Objek mesin atau identitas grup servis.' },
        { name: 'Planning Plant', type: 'Required', example: '5F01 / 5E01', desc: 'Plant tempat SOP ini berlaku.' },
        { name: 'Status', type: 'Required', example: '4 (Released)', desc: 'Wajib rilis agar dapat dipanggil di Maintenance Plan.' },
        { name: 'Operations', type: 'Required', example: 'Langkah kerja mekanik', desc: 'Rincian instruksi tahapan teknisi.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Buka Transaksi IA01 / IA05: Tentukan Objek Mesin',
          desc: 'Ketik IA01 (untuk mesin spesifik) atau IA05 (untuk SOP umum), masukkan kode Plant dan tekan Enter.',
          image: '/images/ia01/step_1.png',
          imgCaption: 'Initial Screen Task List: Penentuan Objek & Plant'
        },
        {
          num: 2,
          title: 'Header Task List: Status Rilis & Work Center',
          desc: 'Isi deskripsi SOP (contoh: SERVIS BERKALA 250 JAM HM). Pilih Work Center pelaksana dan ubah Status menjadi "4 - Released".',
          image: '/images/ia01/step_2.png',
          imgCaption: 'Header Data Task List: Pengaturan Status 4 (Released)'
        },
        {
          num: 3,
          title: 'Operations: Rincian Instruksi & Durasi Jam',
          desc: 'Tuliskan tahapan perbaikan: Operasi 0010 (Kuras oli mesin - 1 Jam), Operasi 0020 (Ganti filter solar - 0.5 Jam), Operasi 0030 (Greasing nepel - 1 Jam).',
          image: '/images/ia01/step_3.png',
          imgCaption: 'Rincian Operasi Kerja & Estimasi Waktu Mekanik'
        },
        {
          num: 4,
          title: 'Alokasi Suku Cadang Standar & Simpan',
          desc: 'Hubungkan suku cadang yang otomatis terpesan saat SOP ini dipanggil. Klik tombol Save untuk menyimpan template SOP.',
          image: '/images/ia01/step_4.png',
          imgCaption: 'Penyimpanan Dokumen Task List SOP Pemeliharaan'
        }
      ],
      tips: 'Menghubungkan Task List ke Maintenance Plan menghemat waktu pembuatan Work Order karena instruksi dan material part otomatis tercopy lengkap.'
    },

    ip01: {
      tcode: 'IP01 / IP10',
      title: 'Maintenance Plan (Rencana Perawatan Berkala)',
      moduleNo: '10',
      moduleName: 'Maintenance Plan',
      pilar: 'pilar2',
      pilarName: 'Perencanaan & Strategi',
      role: 'Maintenance Planner',
      difficulty: 'Menengah',
      purpose: 'Menggabungkan Objek Mesin (Equipment/FL), Strategi Perawatan (Siklus Jam/Hari), dan SOP Pekerjaan (Task List IA01) menjadi satu rencana jadwal pemeliharaan rutin otomatis.',
      ptpnStandard: 'Tipe: Single Cycle Plan (siklus tunggal sederhana misal per 250 Jam) atau Strategy Plan (siklus berjenjang 250H, 500H, 1000H).',
      pdfFile: '10. PM-UM-02_Master Data-Maintenance Plan v02.pdf',
      fields: [
        { name: 'Maintenance Plan', type: 'Required', example: 'Otomatis di-generate SAP', desc: 'Nomor dokumen rencana pemeliharaan.' },
        { name: 'Plan Category', type: 'Required', example: 'PM (Maintenance Order)', desc: 'Jenis dokumen output yang diterbitkan otomatis.' },
        { name: 'Cycle / Unit', type: 'Required', example: '250 HR / 30 DAY', desc: 'Interval jadwal perawatan.' },
        { name: 'Equipment', type: 'Required', example: '2000001205', desc: 'Unit mesin/alat target rencana perawatan.' },
        { name: 'Task List', type: 'Required', example: 'Nomor task list dari IA01', desc: 'SOP pekerjaan yang akan dimasukkan ke dalam order.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Buat Maintenance Plan di Transaksi IP01',
          desc: 'Buka IP01, pilih Maintenance Plan Category = PM (Maintenance Order), tekan Enter. Beri judul deskripsi rencana servis berkala.',
          image: '/images/ip01/step_1.png',
          imgCaption: 'Form Pembuatan Rencana Pemeliharaan Preventif'
        },
        {
          num: 2,
          title: 'Tentukan Siklus & Objek Mesin Target',
          desc: 'Tentukan siklus perawatan (misal setiap 250 Jam atau 30 Hari). Masukkan nomor Equipment dan hubungkan dengan Measuring Point Jam Jalan.',
          image: '/images/ip01/step_2.png',
          imgCaption: 'Penghubungan Objek Mesin & Siklus Servis Berkala'
        },
        {
          num: 3,
          title: 'Hubungkan dengan Task List SOP Servis',
          desc: 'Pilih nomor Task List yang telah dibuat di IA01/IA05 agar saat order terbit, rincian teknisi dan part langsung terisi.',
          image: '/images/ip01/step_3.png',
          imgCaption: 'Integrasi Task List SOP ke dalam Maintenance Plan'
        },
        {
          num: 4,
          title: 'Simpan & Lakukan Penjadwalan Awal (IP10)',
          desc: 'Simpan rencana pemeliharaan. Lakukan penjadwalan start siklus pertama via transaksi IP10 (Maintenance Plan Scheduling) lalu klik tombol Start.',
          image: '/images/ip01/step_4.png',
          imgCaption: 'Aktivasi Jadwal Siklus Perawatan Mesin di Transaksi IP10'
        }
      ],
      tips: 'Maintenance Plan yang terhubung dengan Measuring Point otomatis menghitung mundur sisa jam jalan mesin hingga jatuh tempo servis berikutnya.'
    },

    ip30: {
      tcode: 'IP30',
      title: 'Maintenance Scheduling (Deadline Monitoring Batch)',
      moduleNo: '11',
      moduleName: 'Maintenance Schedule',
      pilar: 'pilar2',
      pilarName: 'Perencanaan & Strategi',
      role: 'Planner Pemeliharaan',
      difficulty: 'Menengah',
      purpose: 'Menjalankan kalkulasi massal (Deadline Monitoring) untuk memeriksa seluruh rencana perawatan (Maintenance Plan) dan menerbitkan Work Order preventif (PM02) secara otomatis saat tiba waktu servis.',
      ptpnStandard: 'Dijalankan secara batch berkala oleh planner atau otomatis via scheduled background job server.',
      pdfFile: '11. PM-UM-02_Maintenance Schedule v02.pdf',
      fields: [
        { name: 'Maintenance Plan', type: 'Optional', example: 'Kosongkan untuk semua plan plant', desc: 'Filter nomor plan tertentu.' },
        { name: 'Interval', type: 'Required', example: '30 Days', desc: 'Rentang waktu ke depan yang ingin dipindai jadwalnya.' },
        { name: 'Planning Plant', type: 'Required', example: '5F01 / 5E01', desc: 'Kode Plant target pemindaian.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Buka IP30 & Masukkan Parameter Plant',
          desc: 'Ketik IP30 di SAP GUI, masukkan Planning Plant unit kerja Anda dan tentukan interval hari pemantauan ke depan (misal: 30 hari).',
          image: '/images/ip30/step_1.png',
          imgCaption: 'Layar Parameter Eksekusi Deadline Monitoring IP30'
        },
        {
          num: 2,
          title: 'Pilih Mode Batch Call Maintenance Order',
          desc: 'Pastikan opsi "Call Objects" aktif agar sistem langsung menerbitkan dokumen Work Order tipe PM02 untuk mesin yang sudah jatuh tempo.',
          image: '/images/ip30/step_2.png',
          imgCaption: 'Konfigurasi Parameter Batch Call Order'
        },
        {
          num: 3,
          title: 'Eksekusi Pemindaian Jatuh Tempo (Execute F8)',
          desc: 'Klik tombol Execute (F8). Sistem akan memindai seluruh jam jalan mesin dan mencocokkannya dengan siklus Maintenance Plan.',
          image: '/images/ip30/step_3.png',
          imgCaption: 'Pemrosesan Batch Call Order Pemeliharaan'
        },
        {
          num: 4,
          title: 'Work Order Preventif PM02 Otomatis Terbit',
          desc: 'Mesin yang sudah jatuh tempo otomatis diterbitkan dokumen Work Order PM02 baru di sistem SAP lengkap dengan reservasi spare part gudang.',
          image: '/images/ip30/step_4.png',
          imgCaption: 'Hasil Terbitnya Daftar Work Order PM02 Otomatis'
        }
      ],
      tips: 'Jalankan IP30 setiap hari Senin pagi untuk memetakan seluruh beban kerja pemeliharaan preventif selama satu minggu ke depan.'
    },

    ik11: {
      tcode: 'IK11 / IK17',
      title: 'Entry Measurement Document (Input Jam Jalan / KM Aktual)',
      moduleNo: '17',
      moduleName: 'Measurement Document',
      pilar: 'pilar2',
      pilarName: 'Perencanaan & Strategi',
      role: 'Operator Logbook / Traksi / Teknisi Pabrik',
      difficulty: 'Dasar',
      purpose: 'Mencatat nilai aktual angka pembacaan Hour Meter (HM Jam Jalan) mesin pabrik dan Odometer (KM) kendaraan operasional harian ke sistem SAP untuk memicu jadwal servis preventif.',
      ptpnStandard: 'Wajib diinput setiap hari atau setiap selesai shift operasi. Nilai counter tidak boleh lebih kecil dari pembacaan sebelumnya.',
      pdfFile: '17. PM-UM-02_Measurement Document v02.pdf',
      fields: [
        { name: 'Measuring Point', type: 'Required', example: '0000000124', desc: 'Nomor titik ukur target dari IK01.' },
        { name: 'Reading Date/Time', type: 'Required', example: 'Tanggal & Jam Pencatatan', desc: 'Waktu aktual pembacaan di lapangan.' },
        { name: 'Counter Reading', type: 'Required', example: '12450 HR / 85600 KM', desc: 'Angka pembacaan total pada alat ukur fisik.' },
        { name: 'Text / Keterangan', type: 'Optional', example: 'Operasi shift pagi normal', desc: 'Catatan kondisi operasional mesin.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Buka Transaksi IK11: Input Nomor Measuring Point',
          desc: 'Ketik T-Code IK11 di command line SAP, masukkan nomor Measuring Point mesin atau kendaraan, lalu tekan Enter.',
          image: '/images/ik11/step_1.png',
          imgCaption: 'Layar Initial Screen IK11: Penentuan Nomor Titik Ukur'
        },
        {
          num: 2,
          title: 'Input Angka Pembacaan Aktual (Counter Reading)',
          desc: 'Masukkan tanggal/jam pembacaan. Pada kolom Counter Reading, ketikkan angka total HM atau Odometer yang terbaca pada dashboard mesin.',
          image: '/images/ik11/step_2.png',
          imgCaption: 'Layar Entri Nilai Counter Jam Jalan / KM'
        },
        {
          num: 3,
          title: 'Periksa Selisih Jam Operasi (Difference HR/KM)',
          desc: 'Sistem akan otomatis mengkalkulasi selisih jam jalan sejak pembacaan terakhir. Periksa apakah selisih masuk akal dengan durasi jam shift.',
          image: '/images/ik11/step_3.png',
          imgCaption: 'Kalkulasi Selisih Jam Kerja Mesin Harian'
        },
        {
          num: 4,
          title: 'Simpan Dokumen Pengukuran (Save Ctrl+S)',
          desc: 'Klik tombol Save. Di status bar akan muncul nomor dokumen: "Measurement document 00000008912 created". Nilai counter resmi terupdate.',
          image: '/images/ik11/step_4.png',
          imgCaption: 'Konfirmasi Tersimpannya Dokumen Pengukuran di SAP'
        }
      ],
      tips: 'Untuk memasukkan jam jalan puluhan mesin sekaligus dalam satu tabel, gunakan transaksi IK17 (Collective Entry Measurement Document).'
    },

    // -------------------------------------------------------------
    // PILAR 3: BISNIS PROSES & EKSEKUSI HARIAN (12 - 18)
    // -------------------------------------------------------------
    iw21: {
      tcode: 'IW21 / IW28',
      title: 'Create Maintenance Notification (Laporan Kerusakan)',
      moduleNo: '12',
      moduleName: 'Maintenance Notification',
      pilar: 'pilar3',
      pilarName: 'Bisnis Proses & Eksekusi',
      role: 'Operator Mesin / Mandor / Teknisi',
      difficulty: 'Dasar',
      purpose: 'Membuat dokumen pemberitahuan kerusakan resmi (Notification) saat terjadi gangguan teknis atau mesin breakdown untuk meminta tindakan perbaikan kepada bagian bengkel/planner.',
      ptpnStandard: 'Tipe Notifikasi: M1 (Maintenance Request), M2 (Malfunction Report - Breakdown Darurat), M3 (Activity Report).',
      pdfFile: '12. PM-UM-02_Bisnis Proses-Maintenance Notification v02.pdf',
      fields: [
        { name: 'Notification Type', type: 'Required', example: 'M1 (Permintaan) / M2 (Breakdown)', desc: 'Kategori laporan gangguan mesin.' },
        { name: 'Equipment / FL', type: 'Required', example: '1000171426', desc: 'Nomor mesin yang mengalami masalah.' },
        { name: 'Description', type: 'Required', example: 'Motor conveyor panas & bergetar', desc: 'Uraian ringkas gejala kerusakan.' },
        { name: 'Breakdown Flag', type: 'Conditional', example: 'Centang jika mesin mati stop pabrik', desc: 'Status mesin berhenti total.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Initial Screen IW21: Pilih Notification Type',
          desc: 'Ketik IW21 di SAP GUI. Pilih tipe notifikasi: M1 untuk perbaikan biasa, atau M2 untuk kondisi breakdown darurat. Tekan Enter.',
          image: '/images/iw21/step_1.png',
          imgCaption: 'Initial Screen IW21: Pemilihan Tipe Notifikasi M1 / M2'
        },
        {
          num: 2,
          title: 'Input Mesin, Deskripsi Masalah & Prioritas',
          desc: 'Masukkan nomor Equipment mesin yang rusak. Ketikkan deskripsi kerusakan (maks. 40 karakter). Tentukan tingkat prioritas (High, Medium, Low).',
          image: '/images/iw21/step_2.png',
          imgCaption: 'Pengisian Objek Mesin, Deskripsi Kerusakan & Prioritas'
        },
        {
          num: 3,
          title: 'Tab Malfunction: Waktu Kerusakan & Kode Gejala',
          desc: 'Jika mesin breakdown, beri centang pada kotak "Breakdown" dan isi jam mulai stop. Pilih kode Damage dan Cause dari katalog QS41.',
          image: '/images/iw21/step_3.png',
          imgCaption: 'Pencatatan Waktu Breakdown & Kode Katalog QS41'
        },
        {
          num: 4,
          title: 'Simpan Notifikasi atau Langsung Buat Work Order',
          desc: 'Klik Save untuk menyimpan dokumen Notifikasi (10 digit). Atau klik ikon "Create Order" di toolbar atas untuk langsung mengonversinya menjadi Work Order.',
          image: '/images/iw21/step_4.png',
          imgCaption: 'Penyimpanan Notifikasi & Opsi Konversi Cepat ke Work Order'
        }
      ],
      tips: 'Untuk memantau seluruh daftar laporan kerusakan yang belum ditindaklanjuti planner, gunakan transaksi IW28 (Change Notifications List).'
    },

    iw31: {
      tcode: 'IW31',
      title: 'Create Maintenance Order (Work Order)',
      moduleNo: '13',
      moduleName: 'Maintenance Order',
      pilar: 'pilar3',
      pilarName: 'Bisnis Proses & Eksekusi',
      role: 'Maintenance Planner / Asisten Teknik',
      difficulty: 'Tinggi',
      purpose: 'Membuat dokumen Work Order resmi untuk merencanakan tenaga mekanik, durasi jam kerja, suku cadang gudang (PR/Reservasi otomatis), dan alokasi pembebanan biaya.',
      ptpnStandard: 'Order Type: PM01 (Corrective/Breakdown), PM02 (Preventive Servis Rutin), PM03 (Kalibrasi/Prediktif), PM04 (Overhaul Besar/Investasi Capex).',
      pdfFile: '13. PM-UM-02_Bisnis Proses-Maintenance Order v02.pdf',
      fields: [
        { name: 'Order Type', type: 'Required', example: 'PM01 (Corrective) / PM02 (Preventive)', desc: 'Jenis Work Order pemeliharaan.' },
        { name: 'Planning Plant', type: 'Required', example: '5F01 / 5E01', desc: 'Plant tempat pekerjaan direncanakan.' },
        { name: 'Equipment', type: 'Required', example: '1000171426', desc: 'Mesin sasaran perbaikan.' },
        { name: 'Main WorkCtr', type: 'Required', example: 'TEK-WSH / 5F22', desc: 'Regu teknisi pelaksana.' },
        { name: 'Components (Part)', type: 'Conditional', example: '82000142 (Seal Kit Pintu Rebusan)', desc: 'Kode material suku cadang yang diminta dari gudang.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Initial Screen: Order Type & Target Equipment',
          desc: 'Ketik T-Code IW31 di SAP GUI. Isi Order Type = PM01 (untuk perbaikan mendesak/breakdown) atau PM02 (preventif). Masukkan nomor Equipment mesin pabrik / kendaraan.',
          image: '/images/iw31/step_1.png',
          imgCaption: 'Layar Initial Screen IW31: Penentuan Order Type & Equipment'
        },
        {
          num: 2,
          title: 'Central Header: Deskripsi Kerusakan & Malfunction Time',
          desc: 'Ketikkan judul pekerjaan (misal: "pergantian seal material pintu rebusan"). Isi PM Activity Type = RPL (Replacement). Jika mesin breakdown, centang Breakdown dan isi jam mulai/selesai breakdown.',
          image: '/images/iw31/step_2.png',
          imgCaption: 'Tab Central Header: Deskripsi Masalah & Waktu Breakdown'
        },
        {
          num: 3,
          title: 'Tab Operations: Rincian Jam Kerja & Teknisi',
          desc: 'Masuk ke tab Operations. Tentukan tahapan pekerjaan (Operation Text), kode Work Center regu pelaksana (TEK-WSH), jumlah personil, dan estimasi durasi jam kerja (Work durtn).',
          image: '/images/iw31/step_3.png',
          imgCaption: 'Tab Operations: Rencana Tugas & Jam Teknisi'
        },
        {
          num: 4,
          title: 'Tab Components: Permintaan Suku Cadang Gudang Stok',
          desc: 'Masuk ke tab Components. Masukkan kode material suku cadang (Component), jumlah unit (Reqmt Qty), dan Item Category "L" (Stock Item). Sistem otomatis membuatkan nomor RESERVASI gudang.',
          image: '/images/iw31/step_4.png',
          imgCaption: 'Tab Components: Pemesanan Spare Part Gudang Resmi'
        },
        {
          num: 5,
          title: 'Settlement Rule & Pembebanan Biaya',
          desc: 'Klik ikon Settlement Rule di header (atau menu Header ➔ Settlement Rule). Pastikan Category terisi "CTR" (Cost Center) dan Settlement Receiver terisi kode Cost Center mesin penanggung biaya.',
          image: '/images/iw31/step_5.png',
          imgCaption: 'Settlement Rule: Alokasi Beban Biaya Perbaikan'
        },
        {
          num: 6,
          title: 'Simpan Work Order (Ctrl+S)',
          desc: 'Klik ikon Save. Di status bar kiri bawah akan muncul pesan konfirmasi dengan nomor order resmi: "Order 200000000039 saved with status CRTD". Catat nomor ini untuk pengeluaran barang.',
          image: '/images/iw31/step_6.png',
          imgCaption: 'Notifikasi Sukses: Dokumen Work Order Terbit'
        }
      ],
      tips: 'Menyimpan komponen suku cadang di IW31 otomatis menerbitkan Reservation Number di modul Gudang (MM). Gudang dapat langsung memproses pengeluaran barang (Goods Issue) menggunakan nomor reservasi tersebut.'
    },

    iw32: {
      tcode: 'IW32 / Release',
      title: 'Change & Release Maintenance Order (REL) & TECO',
      moduleNo: '15',
      moduleName: 'Release Maintenance Order',
      pilar: 'pilar3',
      pilarName: 'Bisnis Proses & Eksekusi',
      role: 'Asisten Kepala / Manajer / Planner',
      difficulty: 'Menengah',
      purpose: 'Melakukan perubahan data order, merilis otorisasi pekerjaan (Status REL) agar gudang bisa mengeluarkan suku cadang, serta melakukan penutupan teknis (TECO) setelah pekerjaan selesai.',
      ptpnStandard: 'Status Order: CRTE (Created) ➔ REL (Released) ➔ TECO (Technically Completed) ➔ CLSD (Closed).',
      pdfFile: '15. PM-UM-02_Bisnis Proses-Release Maintenance Order v02.pdf',
      fields: [
        { name: 'Order', type: 'Required', example: '200000000039', desc: 'Nomor Work Order yang akan diedit, dirilis, atau di-TECO.' },
        { name: 'Status Flag', type: 'Required', example: 'REL (Ikon Bendera Hijau)', desc: 'Otorisasi resmi untuk memulai pekerjaan fisik & pengambilan part.' },
        { name: 'Technical Complete', type: 'Required', example: 'TECO (Ikon Bendera Catur)', desc: 'Penutupan teknis setelah pekerjaan fisik 100% tuntas.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Buka IW32 & Masukkan Nomor Order',
          desc: 'Ketik T-Code IW32 pada command field, masukkan nomor Work Order yang akan ditutup (contoh: 200000757404), lalu tekan Enter. Pastikan pekerjaan sudah selesai dilakukan di lapangan sebelum TECO.',
          image: '/images/iw32/step_1.png',
          imgCaption: 'Change Order: Initial Screen — Input Nomor Order'
        },
        {
          num: 2,
          title: 'Pilih Menu Order ➔ Complete ➔ Complete (technically)',
          desc: 'Pada menu bar klik Order ➔ Complete ➔ Complete (technically), atau tekan Ctrl+F12. Order yang ditutup pada contoh ini adalah Perbaikan Separator 610.',
          image: '/images/iw32/step_2.png',
          imgCaption: 'Menu Complete (technically) pada Order Perbaikan Separator 610'
        },
        {
          num: 3,
          title: 'Cek Status Order di IW38: Kriteria Seleksi',
          desc: 'Buka IW38 (Change PM Orders) untuk memeriksa hasilnya. Centang Order status: Outstanding, In process, dan Completed. Isi Period 01.06.2026 sampai 29.06.2026, lalu tekan Enter.',
          image: '/images/iw32/step_3.png',
          imgCaption: 'IW38 — Kriteria Seleksi Order status & Period'
        },
        {
          num: 4,
          title: 'Isi Maintenance Plant 5* & Layout /EUT IW38',
          desc: 'Isi Maintenance Plant dengan 5* agar mencakup seluruh plant Regional 5. Pada bagian Others, ketik Layout /EUT IW38 supaya kolom System Status ikut tampil, lalu tekan Enter.',
          image: '/images/iw32/step_4.png',
          imgCaption: 'IW38 — Filter Maintenance Plant 5* & Layout /EUT IW38'
        },
        {
          num: 5,
          title: 'Verifikasi Status TECO pada Daftar Order',
          desc: 'Daftar order tampil. Periksa kolom System Status: order yang berhasil ditutup menampilkan TECO. Penutupan teknis selesai.',
          image: '/images/iw32/step_5.png',
          imgCaption: 'IW38 — System Status TECO pada Daftar Order'
        }
      ],
      tips: 'Jika terjadi kesalahan closing atau ada bon suku cadang susulan, jangan panik! Anda bisa membatalkan TECO kapan saja (lihat panduan Cancel TECO di tab Troubleshooting).'
    },

    migo: {
      tcode: 'MIGO / MB1A',
      title: 'Goods Issue Suku Cadang Gudang Terhadap Work Order',
      moduleNo: '13B',
      moduleName: 'Pengambilan Part Gudang',
      pilar: 'pilar3',
      pilarName: 'Bisnis Proses & Eksekusi',
      role: 'Petugas Gudang Spare Part / Teknisi',
      difficulty: 'Menengah',
      purpose: 'Mengeluarkan suku cadang fisik dari gudang sentral/unit berdasarkan nomor reservasi resmi yang diterbitkan oleh Work Order (IW31/IW32).',
      ptpnStandard: 'Movement Type: 261 (Goods Issue for Order). Wajib menyertakan nomor reservasi Work Order.',
      pdfFile: '13. PM-UM-02_Bisnis Proses-Maintenance Order v02.pdf',
      fields: [
        { name: 'Transaction', type: 'Required', example: 'A07 Goods Issue', desc: 'Aktivitas pengeluaran barang.' },
        { name: 'Reference Document', type: 'Required', example: 'R09 Reservation / Order', desc: 'Dokumen acuan pengeluaran.' },
        { name: 'Order / Resv Number', type: 'Required', example: '200000000039 / 00000142', desc: 'Nomor Order atau nomor reservasi.' },
        { name: 'Storage Location', type: 'Required', example: 'SL01 (Gudang Part)', desc: 'Lokasi gudang penyimpanan barang.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Buka MIGO: Pilih Goods Issue & Reservation',
          desc: 'Ketik MIGO di SAP GUI. Pada dropdown pojok kiri atas pilih "A07 Goods Issue", dan dropdown kedua pilih "R09 Reservation" atau "R08 Order".',
          image: '/images/migo/step_1.png',
          imgCaption: 'Layar MIGO: Goods Issue against Reservation'
        },
        {
          num: 2,
          title: 'Periksa Item Suku Cadang & Storage Location',
          desc: 'Masukkan nomor reservasi Work Order. Sistem akan menampilkan rincian suku cadang. Periksa kuantitas fisik dan isi Storage Location gudang.',
          image: '/images/migo/step_2.png',
          imgCaption: 'Pemeriksaan Rincian Spare Part & Gudang Asal'
        },
        {
          num: 3,
          title: 'Centang "Item OK" dan Klik Post',
          desc: 'Beri tanda centang pada kotak "Item OK" di bagian bawah layar untuk setiap suku cadang yang diserahkan. Klik tombol Post untuk memotong stok gudang.',
          image: '/images/migo/step_3.png',
          imgCaption: 'Verifikasi Item OK & Posting Pengeluaran Barang'
        }
      ],
      tips: 'Setelah di-post di MIGO, biaya suku cadang otomatis tercatat membebani Cost Center mesin di Work Order tersebut.'
    },

    iw38: {
      tcode: 'IW38',
      title: 'Change PM Orders List (Monitoring & Edit Massal Order)',
      moduleNo: '13C',
      moduleName: 'Monitoring Order List',
      pilar: 'pilar3',
      pilarName: 'Bisnis Proses & Eksekusi',
      role: 'Planner / Manajer Teknik / Asisten Kepala',
      difficulty: 'Dasar',
      purpose: 'Memantau seluruh daftar Work Order aktif di unit kerja, melihat progres perbaikan, merilis order secara massal, atau mengubah status TECO dalam satu layar kerja.',
      ptpnStandard: 'Filter Maintenance Plant 5* untuk seluruh unit Regional 5. Layout resmi: /EUT IW38.',
      pdfFile: '13. PM-UM-02_Bisnis Proses-Maintenance Order v02.pdf',
      fields: [
        { name: 'Order Status', type: 'Required', example: 'Outstanding, In process, Completed', desc: 'Status siklus hidup order yang ingin ditampilkan.' },
        { name: 'Maintenance Plant', type: 'Required', example: '5* (Semua) / 5F01 / 5E02', desc: 'Filter plant unit kerja pemeliharaan.' },
        { name: 'Period', type: 'Required', example: '01.07.2026 to 31.07.2026', desc: 'Rentang waktu tanggal pembuatan order.' },
        { name: 'Layout', type: 'Optional', example: '/EUT IW38', desc: 'Tata letak kolom standar tampilan laporan.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Navigasi ke Transaksi IW38',
          desc: 'Ketik T-Code IW38 di kolom command line SAP GUI, tekan Enter untuk membuka form seleksi daftar pemeliharaan.',
          image: '/images/iw38/step_1.png',
          imgCaption: 'Layar SAP Easy Access: Membuka Transaksi IW38'
        },
        {
          num: 2,
          title: 'Tentukan Status Order & Rentang Periode',
          desc: 'Centang status order yang ingin dimonitor (Outstanding = belum rilis, In process = sedang dikerjakan, Completed = sudah TECO). Tentukan rentang tanggal periode.',
          image: '/images/iw38/step_2.png',
          imgCaption: 'Penentuan Status Order (CRTD/REL/TECO) & Tanggal Periode'
        },
        {
          num: 3,
          title: 'Filter Maintenance Plant & Pilih Tata Letak (Layout)',
          desc: 'Ketik kode plant pada kolom Maintenance Plant (misal: 5* untuk seluruh regional atau 5F01 untuk satu pabrik). Pada kolom Layout di bagian bawah, ketik /EUT IW38.',
          image: '/images/iw38/step_3.png',
          imgCaption: 'Filter Maintenance Plant Regional & Pemilihan Layout Standar'
        },
        {
          num: 4,
          title: 'Eksekusi Pencarian (Execute F8)',
          desc: 'Klik ikon Execute (tombol jam dengan centang hijau di pojok kiri atas) atau tekan tombol F8 di keyboard.',
          image: '/images/iw38/step_4.png',
          imgCaption: 'Tombol Execute (F8) untuk Memproses Tarikan Data'
        },
        {
          num: 5,
          title: 'Tabel Rekapitulasi Work Order Siap Kerja',
          desc: 'Tabel menampilkan daftar nomor order, deskripsi perbaikan, unit pabrik/kebun, cost center, dan status sistem (REL/TECO). Dari sini Anda bisa klik dua kali pada nomor order untuk langsung mengedit.',
          image: '/images/iw38/step_5.png',
          imgCaption: 'Layar Rekapitulasi Work Order Real-Time: Siap Monitoring & Tindakan'
        }
      ],
      tips: 'Anda dapat merilis puluhan order sekaligus di layar ini dengan memblok baris-baris order lalu klik ikon bendera hijau (Release) di toolbar atas.'
    },

    iw39: {
      tcode: 'IW39',
      title: 'Display PM Orders List (Laporan & Analisa Order)',
      moduleNo: '13D',
      moduleName: 'Reporting Order List',
      pilar: 'pilar3',
      pilarName: 'Bisnis Proses & Eksekusi',
      role: 'Manajer / Asisten / Auditor',
      difficulty: 'Dasar',
      purpose: 'Menampilkan laporan historis seluruh pekerjaan pemeliharaan dalam mode baca (Display Only) untuk keperluan audit biaya, analisa downtime mesin, dan evaluasi bulanan.',
      ptpnStandard: 'Fungsi sama seperti IW38 namun dalam mode proteksi baca sehingga aman dari perubahan tidak sengaja.',
      pdfFile: '13. PM-UM-02_Bisnis Proses-Maintenance Order v02.pdf',
      fields: [
        { name: 'Order Status', type: 'Required', example: 'Completed & Historical', desc: 'Status pekerjaan yang sudah tuntas.' },
        { name: 'Plant', type: 'Required', example: '5F01 / 5E01 / 5*', desc: 'Unit usaha sasaran pelaporan.' },
        { name: 'Period', type: 'Required', example: 'Bulan berjalan', desc: 'Rentang waktu pelaporan evaluasi.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Buka Transaksi IW39 di SAP GUI',
          desc: 'Ketik T-Code IW39 di kolom command line SAP, lalu tekan Enter.',
          image: '/images/iw39/step_1.png',
          imgCaption: 'Navigasi Menu IW39: Display PM Orders'
        },
        {
          num: 2,
          title: 'Tentukan Kriteria Filter Periode & Objek',
          desc: 'Pilih status order (Completed/Historical) dan tentukan rentang tanggal evaluasi perbaikan.',
          image: '/images/iw39/step_2.png',
          imgCaption: 'Form Seleksi Parameter Pelaporan Evaluasi'
        },
        {
          num: 3,
          title: 'Masukkan Plant & Layout Tampilan',
          desc: 'Tentukan kode unit usaha (Plant) dan pilih layout kolom yang rapi untuk diekspor ke Excel.',
          image: '/images/iw39/step_3.png',
          imgCaption: 'Filter Plant & Pilihan Format Kolom Laporan'
        },
        {
          num: 4,
          title: 'Eksekusi Laporan (F8)',
          desc: 'Klik tombol Execute (F8) untuk menjalankan pemrosesan query data.',
          image: '/images/iw39/step_4.png',
          imgCaption: 'Eksekusi Query Rekap Data Pemeliharaan'
        },
        {
          num: 5,
          title: 'Tampilan Laporan & Ekspor ke Excel',
          desc: 'Gunakan menu List ➔ Export ➔ Spreadsheet untuk mengunduh rekapitulasi data pekerjaan ini ke format Microsoft Excel.',
          image: '/images/iw39/step_5.png',
          imgCaption: 'Daftar Laporan Siap Ekspor ke Excel Spreadsheet'
        }
      ],
      tips: 'Gunakan IW39 saat menyiapkan materi rapat bulanan manajemen atau laporan pertanggungjawaban realisasi anggaran pemeliharaan pabrik/kebun.'
    },

    zesthlc003pa: {
      tcode: 'ZESTHLC003PA',
      title: 'Mass Upload Logbook Kendaraan (VRA)',
      moduleNo: '18',
      moduleName: 'Vehicle Activity Logbook',
      pilar: 'pilar3',
      pilarName: 'Bisnis Proses & Eksekusi',
      role: 'Operator Logbook / Asisten Traksi Unit',
      difficulty: 'Menengah',
      purpose: 'Mengunggah ratusan transaksi logbook kendaraan (HM, Odometer, BBM, dan utilitas) secara sekaligus via template Excel ke dalam sistem SAP tanpa input manual satu per satu.',
      ptpnStandard: 'Menggunakan template excel resmi VRA PTPN. Status baris wajib berwarna hijau sebelum dapat diposting via ZESTHLP16PA.',
      pdfFile: '18. PM-UM-02_Vehicle Activity_Logbook v02.pdf',
      fields: [
        { name: 'Upload File', type: 'Required', example: 'REGIONAL_5_MP.xlsx', desc: 'Berkas template excel logbook unit yang sudah tervalidasi.' },
        { name: 'Start Row', type: 'Required', example: '2', desc: 'Baris awal pembacaan data di excel.' },
        { name: 'Company Code', type: 'Required', example: 'N006 / Palm', desc: 'Kode entitas perusahaan PTPN.' },
        { name: 'Plant', type: 'Required', example: '5E01 / 5F01', desc: 'Kode Unit Usaha Kebun/Pabrik.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Siapkan Berkas Template Excel VRA',
          desc: 'Buka template Excel resmi VRA. Isi Company Code (PALM), Plant (misal 5E14), Vehicle Code (nomor equipment 2000014504), tanggal, dan nilai HM/KM.',
          image: '/images/zesthlc003pa/step_1.png',
          imgCaption: 'Template Berkas Excel VRA Logbook Resmi PTPN'
        },
        {
          num: 2,
          title: 'Buka Transaksi ZESTHLC003PA & Browse File',
          desc: 'Ketik ZESTHLC003PA di SAP GUI. Klik ikon Browse File, pilih file Excel logbook kendaraan yang telah diisi, lalu tentukan Start Row = 2.',
          image: '/images/zesthlc003pa/step_2.png',
          imgCaption: 'Layar Utama ZESTHLC003PA & Pemilihan Berkas Excel'
        },
        {
          num: 3,
          title: 'Tandai Semua Baris Data & Klik Submit',
          desc: 'Klik tombol Select All untuk menandai seluruh baris kendaraan. Setelah semua terblok kuning, klik tombol "Submit VRA/Logbook".',
          image: '/images/zesthlc003pa/step_4.png',
          imgCaption: 'Proses Submit Data Logbook ke Buffer SAP'
        },
        {
          num: 4,
          title: 'Verifikasi Status Baris Berwarna Hijau',
          desc: 'Pastikan status seluruh baris data berubah menjadi HIJAU. Jika ada baris MERAH, periksa format tanggal atau angka odometer yang meloncat/lebih rendah dari rekaman sebelumnya.',
          image: '/images/zesthlc003pa/step_8.png',
          imgCaption: 'Status Upload Hijau: Data Valid & Siap Diposting'
        }
      ],
      tips: 'Setelah status hijau di ZESTHLC003PA, wajib dilanjutkan dengan memposting transaksi di ZESTHLP16PA agar odometer kendaraan resmi masuk ke pembukuan SAP.'
    },

    zesthlp16pa: {
      tcode: 'ZESTHLP16PA',
      title: 'Posting & Monitoring Logbook Kendaraan',
      moduleNo: '18B',
      moduleName: 'Vehicle Activity Logbook',
      pilar: 'pilar3',
      pilarName: 'Bisnis Proses & Eksekusi',
      role: 'Asisten Traksi / Monitoring Regional',
      difficulty: 'Dasar',
      purpose: 'Memposting transaksi logbook yang telah disubmit via ZESTHLC003PA serta menarik laporan monitoring seluruh armada kendaraan untuk diekspor ke Excel.',
      ptpnStandard: 'Digunakan Regional 5 untuk monitoring harian (rekap WA jam 08:00 WIB). Filter Plant dapat menggunakan 5* untuk seluruh unit.',
      pdfFile: '18. PM-UM-02_Vehicle Activity_Logbook v02.pdf',
      fields: [
        { name: 'Company Code', type: 'Required', example: 'Palm', desc: 'Kode entitas holding kelapa sawit.' },
        { name: 'Plant', type: 'Required', example: '5* (Semua unit) / 5E01', desc: 'Kode unit kerja pemeliharaan.' },
        { name: 'Fiscal Year', type: 'Required', example: '2026', desc: 'Tahun anggaran berjalan.' },
        { name: 'VRA Date', type: 'Required', example: 'Rentang tanggal (01.10.2026 - 31.10.2026)', desc: 'Periode waktu data logbook.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Initial Screen ZESTHLP16PA',
          desc: 'Ketik ZESTHLP16PA di command line SAP GUI, tekan Enter. Isi Company Code = "Palm", Plant = unit kerja (atau 5* untuk seluruh regional), dan rentang tanggal VRA Date.',
          image: '/images/zesthlp16pa/step_1.png',
          imgCaption: 'Filter Parameter Logbook ZESTHLP16PA'
        },
        {
          num: 2,
          title: 'Posting Activity & Measuring Point',
          desc: 'Untuk MEMPOSTING: Tandai baris data yang telah diunggah, lalu klik tombol "Post Activity & Meas Point" di toolbar atas. Pastikan status seluruhnya berubah menjadi hijau.',
          image: '/images/zesthlp16pa/step_4.png',
          imgCaption: 'Posting Transaksi Odometer & Konsumsi BBM'
        },
        {
          num: 3,
          title: 'Ekspor Hasil Laporan ke Excel Spreadsheet',
          desc: 'Untuk MENGEKSPOR: Klik tombol Execute (F8). Pada tabel hasil monitoring, klik menu bar atas: List ➔ Export ➔ Spreadsheet. Pilih "Export to Excel" lalu simpan file.',
          image: '/images/zesthlp16pa/step_8.png',
          imgCaption: 'Menu Ekspor Laporan Logbook ke Format Spreadsheet Excel'
        }
      ],
      tips: 'File hasil ekspor spreadsheet dari transaksi inilah yang diolah secara otomatis oleh sistem web devpmreg5 menjadi laporan gambar rekap HD harian jam 08:00 WIB.'
    },

    zco_cctr_01: {
      tcode: 'ZCO_CCTR_01',
      title: 'Report Monitoring Actual Cost & Actual Activity Traksi',
      moduleNo: '18C',
      moduleName: 'Cost & Activity Report',
      pilar: 'pilar3',
      pilarName: 'Bisnis Proses & Eksekusi',
      role: 'Asisten Kepala / Manajer / Keuangan Unit',
      difficulty: 'Dasar',
      purpose: 'Memantau realisasi biaya operasional armada kendaraan (Total Cost) dan utilisasi jam kerja (Activity Quantity) per unit Cost Center kebun dan pabrik.',
      ptpnStandard: 'Controlling Area: PTPN. Cost Center Group: REG5-LOG / REGION 5 LOG RATE.',
      pdfFile: '18. PM-UM-02_Vehicle Activity_Logbook v02.pdf',
      fields: [
        { name: 'Controlling Area', type: 'Required', example: 'PTPN', desc: 'Area pengendalian holding.' },
        { name: 'Fiscal Year', type: 'Required', example: '2026', desc: 'Tahun buku anggaran.' },
        { name: 'Cost Center Group', type: 'Required', example: 'REG5-LOG', desc: 'Grup pusat biaya armada regional.' },
        { name: 'From/To Period', type: 'Required', example: '1 s/d 12', desc: 'Bulan pembukuan.' }
      ],
      stepsData: [
        {
          num: 1,
          title: 'Akses Transaksi ZCO_CCTR_01',
          desc: 'Ketik ZCO_CCTR_01 di command line SAP GUI, tekan Enter untuk membuka form seleksi monitoring biaya.',
          image: '/images/zco_cctr_01/step_1.png',
          imgCaption: 'Navigasi Transaksi ZCO_CCTR_01'
        },
        {
          num: 2,
          title: 'Input Parameter Controlling Area & Cost Center Group',
          desc: 'Isi Controlling Area = PTPN, Fiscal Year = tahun berjalan, dan Cost Center Group = REG5-LOG. Klik tombol Execute (F8).',
          image: '/images/zco_cctr_01/step_2.png',
          imgCaption: 'Form Parameter Seleksi Biaya & Aktivitas Kendaraan'
        },
        {
          num: 3,
          title: 'Analisa Realisasi Biaya (Total Cost) & Jam Kerja (Activity Qty)',
          desc: 'Laporan menampilkan rincian biaya per nopol/unit truk (misal KB 7612 AA di 5E03DTR002), total rupiah biaya perbaikan/BBM, dan jam aktivitas terlaksana.',
          image: '/images/zco_cctr_01/step_3.png',
          imgCaption: 'Tabel Realisasi Biaya & Utilisasi Kendaraan Regional 5'
        }
      ],
      tips: 'Sangat berguna untuk mengevaluasi efisiensi biaya rupiah per jam kerja alat (Cost/Hour Rate) di tiap-tiap kebun dan pabrik kelapa sawit.'
    }
  };

  // Ensiklopedi & Matriks 18 Modul Resmi SAP PM (100% Web SOP)
  const sopCatalog = [
    {
      no: '01',
      pilarKey: 'pilar1',
      title: 'Master Data - Functional Location (Lokasi Fungsional)',
      tcodes: ['IL01', 'IL02', 'IL03', 'IH01'],
      targetKey: 'il01',
      role: 'Planner / Master Data Admin',
      scope: 'Pemetaan struktur hierarki stasiun, gedung, dan edit mask lokasi fungsional pabrik/kebun.',
      keyRules: [
        'Edit Mask PTPN: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX',
        'Contoh kode: N011-KP05-GD01-ST01 (Stasiun Gilingan)',
        'Wajib mengisi Maintenance Plant, Cost Center, dan Planner Group'
      ],
      highlights: 'Gunakan IH01 untuk melihat struktur pohon hierarki pabrik secara menyeluruh.'
    },
    {
      no: '02',
      pilarKey: 'pilar1',
      title: 'Master Data - Equipment (Aset Fisik Mesin & Kendaraan)',
      tcodes: ['IE01', 'IE02', 'IE03', 'IH08'],
      targetKey: 'ie01',
      role: 'Teknik / Master Data Admin',
      scope: 'Pendaftaran nomor aset fisik mesin, traktor, truk, dan alat berat.',
      keyRules: [
        'Category: M (Machines) atau V (Vehicles)',
        'Wajib dipasang (install) pada Functional Location induk',
        'Mengisi Data Teknis (Manufacturer, Model, Serial Number, Year)'
      ],
      highlights: 'Gunakan IH08 untuk mencari nomor equipment berdasarkan plat nomor atau deskripsi.'
    },
    {
      no: '03',
      pilarKey: 'pilar1',
      title: 'Master Data - Bill of Material (BOM Suku Cadang)',
      tcodes: ['IB01', 'IB02', 'IB03', 'CS01'],
      targetKey: 'ib01',
      role: 'Perencana Suku Cadang / Gudang',
      scope: 'Daftar katalog spare part yang terpasang pada equipment atau functional location.',
      keyRules: [
        'BOM Usage: 4 (Plant Maintenance)',
        'Item Category: L (Stock Item)',
        'Komponen wajib terdaftar di Material Master MM'
      ],
      highlights: 'BOM mempermudah teknisi memilih spare part langsung saat pembuatan Work Order.'
    },
    {
      no: '04',
      pilarKey: 'pilar1',
      title: 'Master Data - Work Center (Bengkel & Pelaksana)',
      tcodes: ['IR01', 'IR02', 'IR03'],
      targetKey: 'ir01',
      role: 'Asisten Teknik / Bengkel',
      scope: 'Pengaturan bengkel pelaksana, kapasitas jam kerja mekanik, dan kalkulasi tarif upah internal.',
      keyRules: [
        'Work Center Category: 0005 (Plant Maintenance)',
        'Cost Center penampung biaya tenaga kerja langsung',
        'Formula kalkulasi durasi dan kapasitas jam orang (Man-hours)'
      ],
      highlights: 'Dasar pembebanan biaya internal jasa pemeliharaan pada Work Order.'
    },
    {
      no: '05',
      pilarKey: 'pilar1',
      title: 'Master Data - Measuring Point (Titik Ukur HM / KM)',
      tcodes: ['IK01', 'IK02', 'IK03'],
      targetKey: 'ik01',
      role: 'Admin Teknik / Planner',
      scope: 'Titik ukur Hour Meter (HM) jam operasi mesin dan Odometer KM kendaraan.',
      keyRules: [
        'Position: 1 (HM) atau 2 (KM)',
        'Characteristic: PTPN_HM (Jam) / PTPN_KM (Kilometer)',
        'Centang Counter jika nilai terus bertambah (akumulatif)'
      ],
      highlights: 'Menjadi pemicu otomatis jadwal preventif berbasis jam kerja.'
    },
    {
      no: '06',
      pilarKey: 'pilar1',
      title: 'Master Data - Class & Characteristic (Spesifikasi Teknis)',
      tcodes: ['CT04', 'CL02', 'CL03'],
      targetKey: 'ie01',
      role: 'Master Data Admin',
      scope: 'Klasifikasi spesifikasi teknis mesin (daya HP, kapasitas debit m3/jam, tegangan Volt, rasio gear).',
      keyRules: [
        'Class Type: 002 (Equipment) atau 003 (Functional Location)',
        'Karakteristik standar: DAYA_KW, KAPASITAS, VOLTASE, SPEED_RPM',
        'Memudahkan analisa perbandingan performa mesin sejenis'
      ],
      highlights: 'Dihubungkan ke Equipment via Tab Classification di transaksi IE01/IE02.'
    },
    {
      no: '07',
      pilarKey: 'pilar1',
      title: 'Master Data - Maintenance Catalog (Katalog Kerusakan)',
      tcodes: ['QS41', 'QS42', 'QS51'],
      targetKey: 'qs41',
      role: 'Planner / Ka. Bagian Teknik',
      scope: 'Standarisasi kode kerusakan (Damages), penyebab (Causes), dan aktivitas tindakan (Activities).',
      keyRules: [
        'Catalog Type B: Part of Object (Bagian objek yang rusak)',
        'Catalog Type C: Damage (Gejala/bentuk kerusakan)',
        'Catalog Type 5: Cause (Penyebab akar masalah)',
        'Catalog Type A: Activity (Tindakan perbaikan yang dilakukan)'
      ],
      highlights: 'Katalog wajib diisi saat pembuatan Notification agar riwayat MTBF/MTTR akurat.'
    },
    {
      no: '08',
      pilarKey: 'pilar1',
      title: 'Master Data - Task List (Daftar SOP Perbaikan Standar)',
      tcodes: ['IA01', 'IA02', 'IA05'],
      targetKey: 'ia01',
      role: 'Maintenance Engineer / Planner',
      scope: 'Kumpulan urutan instruksi kerja, estimasi waktu, dan teknisi yang dibutuhkan untuk servis standar.',
      keyRules: [
        'Task List Type: E (Equipment Task List) atau A (General Task List)',
        'Status: 4 (Released) agar bisa dipanggil ke Work Order',
        'Memuat komponen spare part standar yang otomatis tereservasi'
      ],
      highlights: 'Task List dipanggil saat Preventif Maintenance agar SOP perbaikan konsisten.'
    },
    {
      no: '09',
      pilarKey: 'pilar2',
      title: 'Maintenance Strategy (Strategi Interval Berkala)',
      tcodes: ['IP11', 'IP12'],
      targetKey: 'ip01',
      role: 'Maintenance Planner',
      scope: 'Strategi interval pemeliharaan berkala time-based (kalender) & performance-based (jam jalan/KM).',
      keyRules: [
        'Strategy Unit: H (Jam Kerja HM) atau D/M (Hari/Bulan)',
        'Package: Paket servis bertingkat (contoh: 250 Jam, 500 Jam, 1000 Jam, 2000 Jam)',
        'Hierarki siklus pemeliharaan berkelanjutan'
      ],
      highlights: 'Dasar pembuatan Maintenance Plan IP01 berjenjang untuk genset, boiler, dan kendaraan.'
    },
    {
      no: '10',
      pilarKey: 'pilar2',
      title: 'Maintenance Plan (Rencana Perawatan Preventif Otomatis)',
      tcodes: ['IP01', 'IP02', 'IP10'],
      targetKey: 'ip01',
      role: 'Maintenance Planner',
      scope: 'Penggabungan Technical Object, Task List, dan Jadwal Siklus agar sistem menerbitkan order preventif.',
      keyRules: [
        'Plan Type: Strategy-Controlled atau Single Cycle',
        'Order Type yang akan terbit: PM02 (Preventive Maintenance)',
        'Scheduling Parameters: Call Horizon (contoh 85% untuk early reminder)'
      ],
      highlights: 'Menjamin perawatan mesin terjadwal tanpa menunggu alat rusak mendadak.'
    },
    {
      no: '11',
      pilarKey: 'pilar2',
      title: 'Maintenance Schedule - Monitoring IP30 (Deadline Monitoring)',
      tcodes: ['IP30', 'IP24'],
      targetKey: 'ip30',
      role: 'Planner / Operator PM',
      scope: 'Eksekusi batch deadline monitoring kalkulasi tanggal jatuh tempo untuk men-generate Work Order otomatis.',
      keyRules: [
        'Interval Call: Menentukan rentang hari ke depan yang akan diproses',
        'Pilih Maintenance Plan / Equipment / Maintenance Plant',
        'Sistem otomatis mengubah scheduled call menjadi actual Work Order'
      ],
      highlights: 'Dijalankan secara berkala (harian/mingguan) oleh planner agar order preventif terbit tepat waktu.'
    },
    {
      no: '12',
      pilarKey: 'pilar3',
      title: 'Bisnis Proses - Maintenance Notification (Laporan Kerusakan)',
      tcodes: ['IW21', 'IW22', 'IW28'],
      targetKey: 'iw21',
      role: 'Operator Mesin / Mandor / Krani',
      scope: 'Pencatatan resmi adanya indikasi gangguan, kebocoran, atau kerusakan alat di lapangan.',
      keyRules: [
        'Tipe M1: Maintenance Request (Permohonan perbaikan rutin)',
        'Tipe M2: Malfunction Report (Breakdown darurat / mesin stop)',
        'Tipe M3: Activity Report (Pencatatan riwayat pekerjaan)'
      ],
      highlights: 'Notification menjadi dasar bagi Asisten/Planner untuk merilis Work Order (IW31).'
    },
    {
      no: '13',
      pilarKey: 'pilar3',
      title: 'Bisnis Proses - Maintenance Order (Work Order Perbaikan)',
      tcodes: ['IW31', 'IW32', 'IW38', 'IW39'],
      targetKey: 'iw31',
      role: 'Asisten Teknik / Planner',
      scope: 'Surat perintah kerja resmi perbaikan, alokasi mekanik bengkel, dan reservasi suku cadang gudang.',
      keyRules: [
        'Order Type PM01: Corrective Maintenance (Perbaikan kerusakan)',
        'Order Type PM02: Preventive Maintenance (Perawatan berkala)',
        'Order Type PM03: Breakdown Emergency',
        'Order Type PM04: Pekerjaan Investasi / Overhaul'
      ],
      highlights: 'Work order mengikat jam kerja internal dan nomor reservasi spare part gudang.'
    },
    {
      no: '14',
      pilarKey: 'pilar3',
      title: 'Bisnis Proses - Investment Order PM04 (Overhaul & Kapitalisasi)',
      tcodes: ['IW31 (PM04)', 'IW32', 'KO02'],
      targetKey: 'iw31',
      role: 'Manajer Teknik / Finance Akuntansi',
      scope: 'Work Order khusus pekerjaan renovasi besar, rekondisi mesin, atau proyek kapitalisasi aset pabrik.',
      keyRules: [
        'Wajib settlement ke WBS Element (Proyek Investasi) atau Nomor Aset Fisik (Asset under Construction)',
        'Anggaran terikat ke RKAP Capex / Investasi Perusahaan',
        'Memerlukan otorisasi level pimpinan unit'
      ],
      highlights: 'Biaya tidak dibebankan ke biaya operasional rutin (Opex), melainkan dikapitalisasi ke aset.'
    },
    {
      no: '15',
      pilarKey: 'pilar3',
      title: 'Bisnis Proses - Release Maintenance Order (Penerbitan Izin Kerja)',
      tcodes: ['IW32 (REL)'],
      targetKey: 'iw32',
      role: 'Masinis Kepala / Asisten Kepala',
      scope: 'Otorisasi resmi penerbitan Work Order agar suku cadang di gudang dapat diambil via MIGO/MB1A.',
      keyRules: [
        'Status order berubah dari CRTD (Created) menjadi REL (Released)',
        'Reservasi barang gudang aktif dan material dapat dikeluarkan',
        'Mekanik diperbolehkan memulai eksekusi pekerjaan'
      ],
      highlights: 'Tanpa status REL, gudang tidak berhak mengeluarkan suku cadang pemeliharaan.'
    },
    {
      no: '16',
      pilarKey: 'pilar3',
      title: 'Confirmation & Technical Completion (TECO & Cancel TECO)',
      tcodes: ['IW41', 'IW32', 'Klinik Troubleshooting'],
      targetKey: 'troubleshoot',
      role: 'Teknisi / Mandor Bengkel / Planner',
      scope: 'Konfirmasi jam kerja aktual teknisi, pengembalian suku cadang sisa, dan penutupan teknis (TECO).',
      keyRules: [
        'IW41: Konfirmasi actual hours teknisi pelaksana',
        'Status TECO: Menandai pekerjaan fisik selesai 100%',
        'Cancel TECO: Membuka kembali status order jika ada suku cadang/jam kerja susulan yang perlu diposting'
      ],
      highlights: 'Lihat tab Klinik Troubleshooting untuk panduan bergambar lengkap Cancel TECO.'
    },
    {
      no: '17',
      pilarKey: 'pilar2',
      title: 'Measurement Document (Pencatatan Aktual HM & KM Harian)',
      tcodes: ['IK11', 'IK12', 'IK17'],
      targetKey: 'ik11',
      role: 'Operator Kendaraan / Krani Transport',
      scope: 'Pencatatan angka meteran aktual Hour Meter (HM) alat berat dan Odometer (KM) kendaraan operasional.',
      keyRules: [
        'Nilai counter tidak boleh lebih rendah dari dokumen sebelumnya (kecuali penggantian meteran)',
        'Nilai Difference mencatat selisih jam jalan harian',
        'Menjadi input kalkulasi otomatis jadwal servis berkala IP30'
      ],
      highlights: 'Entry harian wajib disiplin agar kalkulasi preventif akurat.'
    },
    {
      no: '18',
      pilarKey: 'pilar3',
      title: 'Vehicle Activity & Logbook (Upload VRA & Cost Center Report)',
      tcodes: ['ZESTHLC003PA', 'ZESTHLP16PA', 'ZCO_CCTR_01'],
      targetKey: 'zesthlc003pa',
      role: 'Krani Kendaraan / Asisten Transport',
      scope: 'Pengelolaan massal logbook kendaraan VRA kebun, upload template Excel, posting, dan kontrol biaya.',
      keyRules: [
        'ZESTHLC003PA: Upload Excel template logbook VRA harian ke SAP staging',
        'ZESTHLP16PA: Posting massal transaksi logbook ke dokumen SAP',
        'ZCO_CCTR_01: Verifikasi pembebanan biaya kendaraan ke masing-masing Cost Center kebun'
      ],
      highlights: 'Sistem logbook terintegrasi penuh dengan pemakaian BBM dan jam kerja traktor/truk.'
    }
  ];

  // ── Katalog SOP: pencarian lokal + pengelompokan per pilar ──
  const catalogQuery = catalogSearch.trim().toLowerCase();
  const catalogModules = sopCatalog.filter((mod) => {
    if (catalogFilter !== 'all' && mod.pilarKey !== catalogFilter) return false;
    if (!catalogQuery) return true;
    return [mod.no, mod.title, mod.scope, mod.role, mod.highlights, ...mod.tcodes, ...mod.keyRules]
      .join(' ')
      .toLowerCase()
      .includes(catalogQuery);
  });
  const catalogGroups = PILLAR_ORDER
    .map((key) => ({ ...PILLAR_THEME[key], modules: catalogModules.filter((mod) => mod.pilarKey === key) }))
    .filter((group) => group.modules.length > 0);
  const catalogTcodeCount = sopCatalog.reduce((acc, mod) => acc + mod.tcodes.length, 0);

  const jumpToCatalogModule = (no) => {
    document.getElementById(`modul-${no}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Filtered T-Codes based on search and active tab
  const filteredTcodes = useMemo(() => {
    let list = Object.entries(modulesDatabase).map(([key, data]) => ({ key, ...data }));
    
    if (activeTab === 'pilar1' || activeTab === 'pilar2' || activeTab === 'pilar3') {
      list = list.filter(item => item.pilar === activeTab);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.tcode.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.moduleName.toLowerCase().includes(q) ||
        item.purpose.toLowerCase().includes(q) ||
        item.fields.some(f => f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeTab, searchQuery]);

  // Keep selectedTcodeKey valid
  const activeTcode = modulesDatabase[selectedTcodeKey] || modulesDatabase.iw31;

  // Auto-switch selected tcode when tab changes if current tcode not in new tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'pilar1' && modulesDatabase[selectedTcodeKey]?.pilar !== 'pilar1') {
      setSelectedTcodeKey('il01');
    } else if (tab === 'pilar2' && modulesDatabase[selectedTcodeKey]?.pilar !== 'pilar2') {
      setSelectedTcodeKey('ip01');
    } else if (tab === 'pilar3' && modulesDatabase[selectedTcodeKey]?.pilar !== 'pilar3') {
      setSelectedTcodeKey('iw31');
    }
   };
 
  // CMMS Dropdown Selection Handler
  const handleDropdownSelect = (tab, tcodeKey = null, workflowKey = null) => {
    setActiveTab(tab);
    if (tcodeKey) {
      setSelectedTcodeKey(tcodeKey);
    }
    if (workflowKey) {
      setActiveWorkflow(workflowKey);
      setSelectedFlowStep(1);
    }
    setActiveDropdown(null);
  };

  const handleOpenFromCatalog = (mod) => {
    if (mod.targetKey === 'troubleshoot') {
      setActiveTab('troubleshoot');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (modulesDatabase[mod.targetKey]) {
      setActiveTab(modulesDatabase[mod.targetKey].pilar);
      setSelectedTcodeKey(mod.targetKey);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderPilarContent = () => (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
      {/* Header T-Code */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200">
                      Modul {activeTcode.moduleNo}: {activeTcode.moduleName}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      {activeTcode.role}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
                    <span className="font-mono text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-xl border border-emerald-200">
                      {activeTcode.tcode}
                    </span>
                    {activeTcode.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(activeTcode.tcode, 'header_tcode')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'header_tcode' ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                    <span>{copiedKey === 'header_tcode' ? 'Tersalin!' : 'Salin T-Code'}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
                    title="Lihat matriks 18 modul resmi"
                  >
                    <BookOpen size={14} className="text-teal-600" />
                    <span>Matriks Modul {activeTcode.moduleNo}</span>
                  </button>
                </div>
              </div>


              {/* Sub-Nav View Mode */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <button
                  onClick={() => setDetailViewMode('steps')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    detailViewMode === 'steps' ? 'bg-emerald-800 text-white border border-emerald-900' : 'bg-transparent text-emerald-950 hover:bg-emerald-50'
                  }`}
                >
                  <ImageIcon size={14} />
                  <span>📸 Panduan Layar Bergambar ({activeTcode.stepsData?.length || 0} Langkah)</span>
                </button>
                <button
                  onClick={() => setDetailViewMode('fields')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    detailViewMode === 'fields' ? 'bg-emerald-800 text-white border border-emerald-900' : 'bg-transparent text-emerald-950 hover:bg-emerald-50'
                  }`}
                >
                  <TableIcon size={14} />
                  <span>📑 Aturan Field SAP & Contoh ({activeTcode.fields?.length || 0} Field)</span>
                </button>
                <button
                  onClick={() => setDetailViewMode('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    detailViewMode === 'all' ? 'bg-emerald-800 text-white border border-emerald-900' : 'bg-transparent text-emerald-950 hover:bg-emerald-50'
                  }`}
                >
                  <Eye size={14} />
                  <span>Tampilkan Semua</span>
                </button>
              </div>

              {/* Purpose & PTPN Standard Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 pb-3">
                <div className="space-y-1 pl-3.5 border-l-2 border-slate-300 max-w-prose">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Info size={14} className="text-emerald-700" />
                    <span>Tujuan & Skenario Bisnis</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{activeTcode.purpose}</p>
                </div>
                <div className="space-y-1 pl-3.5 border-l-2 border-emerald-500 max-w-prose">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <ShieldCheck size={14} className="text-emerald-700" />
                    <span>Standar Resmi PTPN IV</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{activeTcode.ptpnStandard}</p>
                </div>
              </div>

              {/* 📸 PANDUAN BERGAMBAR (STEP-BY-STEP DENGAN SCREENSHOT ASLI SAP GUI) */}
              {(detailViewMode === 'steps' || detailViewMode === 'all') && activeTcode.stepsData && (
                <div className="space-y-6 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                      <ImageIcon size={16} className="text-emerald-700" />
                      Langkah-Langkah Dilengkapi Tangkapan Layar SAP GUI
                    </h3>
                    <span className="text-[11px] text-emerald-700 font-semibold">Klik gambar untuk memperbesar (Zoom)</span>
                  </div>

                  <div className="space-y-6">
                    {activeTcode.stepsData.map((step) => (
                      <div key={step.num} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-xs hover:border-slate-300 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-emerald-600/20">
                            {step.num}
                          </span>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                            <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed max-w-4xl">{step.desc}</p>
                          </div>
                        </div>

                        {/* Screenshot Display */}
                        {/* Screenshot Display dengan Panah & Keterangan Informatif */}
                        {step.image && (
                          <div className="mt-3">
                            <SAPAnnotatedImage
                              image={step.image}
                              alt={step.title}
                              caption={step.imgCaption || step.title}
                              stepData={step}
                              onZoom={(img) => { setZoomedImage(img); setZoomScale(1); }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 📑 TABEL ATURAN FIELD STANDAR PTPN */}
              {(detailViewMode === 'fields' || detailViewMode === 'all') && activeTcode.fields && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <TableIcon size={14} className="text-emerald-700" />
                    Aturan Pengisian Field SAP (R/O/C & Contoh Nilai PTPN)
                  </h3>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Nama Field SAP</th>
                          <th className="py-3 px-4">Status (R/O/C)</th>
                          <th className="py-3 px-4">Contoh Data PTPN</th>
                          <th className="py-3 px-4">Deskripsi & Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {activeTcode.fields.map((f, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{f.name}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                                f.type === 'Required' ? 'bg-red-50 text-red-700 border border-red-200' :
                                f.type === 'Conditional' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {f.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-emerald-700 font-bold">{f.example}</td>
                            <td className="py-3 px-4 text-slate-600 leading-relaxed">{f.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tips & Catatan Penting Lapangan */}
              {activeTcode.tips && (
                <div className="flex items-start gap-3 py-3 px-4 rounded-xl bg-amber-50/60 border-l-4 border-amber-400 text-amber-950 max-w-prose">
                  <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-amber-900">Tips & Rekomendasi Lapangan</h4>
                    <p className="text-sm text-amber-900/90 leading-relaxed">{activeTcode.tips}</p>
                  </div>
                </div>
              )}

    </div>
  );

  return (
    <div className="relative bg-[#f8fafc] border-slate-200/80 shadow-sm text-slate-800 min-h-screen rounded-2xl border overflow-clip font-sans">
      
      {/* ─────────────────────────────────────────────────────────────
          DECORATIVE AMBIENT ATMOSPHERE
      ───────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <div className="absolute -top-40 right-[-5%] w-[700px] h-[700px] rounded-full bg-emerald-100/40 blur-[140px]" />
        <div className="absolute top-[25%] -left-32 w-[750px] h-[750px] rounded-full bg-teal-100/30 blur-[150px]" />
        <div className="absolute top-[55%] right-[5%] w-[800px] h-[800px] rounded-full bg-emerald-50/50 blur-[140px]" />
        <div className="absolute -bottom-32 left-[15%] w-[650px] h-[650px] rounded-full bg-slate-100/60 blur-[120px]" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BANNER (Light Modern Corporate Theme)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-white/90 backdrop-blur-xs p-6 md:p-8 border-b border-emerald-100/80 relative z-10 overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className={`relative z-10 ${isLocalDev ? 'max-w-[1720px]' : 'max-w-7xl'} mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6`}>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <BookOpen size={24} />
              </span>
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200">
                  Dokumentasi Resmi PTPN IV Regional 5
                </span>
                <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
                  Pusat Panduan & SOP SAP Plant Maintenance (PM)
                </h1>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-600 max-w-xl leading-relaxed">
              Panduan interaktif 18 modul SAP PM standar PTPN IV, dilengkapi tangkapan layar asli SAP GUI dan solusi lapangan.
            </p>
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-80">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="sap-guide-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari T-Code, Error, Modul... (Ctrl+K)"
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
              <span>💡 Coba: <strong className="text-emerald-700 font-semibold cursor-pointer hover:underline" onClick={() => { setSearchQuery('IW32'); setActiveTab('pilar3'); setSelectedTcodeKey('iw32'); }}>IW32</strong>, <strong className="text-emerald-700 font-semibold cursor-pointer hover:underline" onClick={() => setActiveTab('troubleshoot')}>Cancel TECO</strong>, <strong className="text-emerald-700 font-semibold cursor-pointer hover:underline" onClick={() => { setSearchQuery('Logbook'); setActiveTab('pilar3'); setSelectedTcodeKey('zesthlc003pa'); }}>Logbook</strong></span>
              <span className="text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">18 Modul</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. NAVBAR SOP PM REGIONAL 5 (Light Enterprise Clean Style)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-800 sticky top-0 z-40 shadow-xs">
        <div className={`${isLocalDev ? 'max-w-[1720px]' : 'max-w-7xl'} mx-auto px-4 flex items-center justify-between h-14 md:h-16 relative`}>
          
          {/* Left Brand / Section Indicator */}
          <div className="flex items-center gap-2.5 shrink-0 mr-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-xs">
              <BookOpen size={16} className="text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-xs tracking-wide text-slate-900">SOP PM</span>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200">REG 5</span>
              </div>
              <span className="text-xs text-slate-500 leading-tight block mt-0.5">Navigasi Terpadu</span>
            </div>
          </div>

          {/* Center: Dropdown Navigation Pills */}
          <nav className="flex items-center gap-1 py-1 flex-1 max-w-4xl relative overflow-visible">
            {activeDropdown && (
              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDropdown(null)} />
            )}

            {/* 1. PETA ALUR KERJA */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'flow' ? null : 'flow')}
                className={`group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
                  activeTab === 'flow' || activeDropdown === 'flow'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Peta Alur Kerja</span>
                {activeDropdown === 'flow' ? <ChevronUp size={13} className="text-emerald-700" /> : <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600" />}
              </button>
              {activeDropdown === 'flow' && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl min-w-[270px] flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Pilih Alur Kerja:
                  </div>
                  {[
                    { label: '⚡ Corrective Maintenance (PM01)', key: 'corrective', desc: 'Breakdown & Perbaikan Mesin' },
                    { label: '📅 Preventive Maintenance (PM02)', key: 'preventive', desc: 'Perawatan Berkala Siklus HM' },
                    { label: '🚛 Logbook Traksi Regional 5', key: 'logbook', desc: 'Rekap Jam Jalan Kendaraan' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => handleDropdownSelect('flow', null, item.key)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer flex flex-col ${
                        activeTab === 'flow' && activeWorkflow === item.key
                          ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. PILAR 1: MASTER DATA */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'pilar1' ? null : 'pilar1')}
                className={`group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
                  activeTab === 'pilar1' || activeDropdown === 'pilar1'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Pilar 1: Master Data</span>
                {activeDropdown === 'pilar1' ? <ChevronUp size={13} className="text-emerald-700" /> : <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600" />}
              </button>
              {activeDropdown === 'pilar1' && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl min-w-[290px] max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Modul 01 - 08 (Master Data):
                  </div>
                  {Object.entries(modulesDatabase)
                    .filter(([_, d]) => d.pilar === 'pilar1')
                    .map(([k, d]) => (
                      <button
                        key={k}
                        onClick={() => handleDropdownSelect('pilar1', k)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer flex items-center justify-between ${
                          activeTab === 'pilar1' && selectedTcodeKey === k
                            ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-mono font-bold mr-1.5 text-slate-900">{d.tcode}</span>
                          <span className="text-[11px] text-slate-600 truncate">{d.title.split('(')[0]}</span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 ml-2 border border-slate-200/80">M{d.moduleNo}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* 3. PILAR 2: PLANNING */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'pilar2' ? null : 'pilar2')}
                className={`group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
                  activeTab === 'pilar2' || activeDropdown === 'pilar2'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Pilar 2: Planning</span>
                {activeDropdown === 'pilar2' ? <ChevronUp size={13} className="text-emerald-700" /> : <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600" />}
              </button>
              {activeDropdown === 'pilar2' && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl min-w-[290px] flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Modul 09 - 11 (Planning & Preventif):
                  </div>
                  {Object.entries(modulesDatabase)
                    .filter(([_, d]) => d.pilar === 'pilar2')
                    .map(([k, d]) => (
                      <button
                        key={k}
                        onClick={() => handleDropdownSelect('pilar2', k)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer flex items-center justify-between ${
                          activeTab === 'pilar2' && selectedTcodeKey === k
                            ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-mono font-bold mr-1.5 text-slate-900">{d.tcode}</span>
                          <span className="text-[11px] text-slate-600 truncate">{d.title.split('(')[0]}</span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 ml-2 border border-slate-200/80">M{d.moduleNo}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* 4. PILAR 3: BISNIS PROSES */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'pilar3' ? null : 'pilar3')}
                className={`group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
                  activeTab === 'pilar3' || activeDropdown === 'pilar3'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Pilar 3: Bisnis Proses</span>
                {activeDropdown === 'pilar3' ? <ChevronUp size={13} className="text-emerald-700" /> : <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600" />}
              </button>
              {activeDropdown === 'pilar3' && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl min-w-[320px] max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Modul 12 - 18 (Bisnis Proses & Eksekusi):
                  </div>
                  {Object.entries(modulesDatabase)
                    .filter(([_, d]) => d.pilar === 'pilar3')
                    .map(([k, d]) => (
                      <button
                        key={k}
                        onClick={() => handleDropdownSelect('pilar3', k)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer flex items-center justify-between ${
                          activeTab === 'pilar3' && selectedTcodeKey === k
                            ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-mono font-bold mr-1.5 text-slate-900">{d.tcode}</span>
                          <span className="text-[11px] text-slate-600 truncate">{d.title.split('(')[0]}</span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 ml-2 border border-slate-200/80">M{d.moduleNo}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* 5. KLINIK TROUBLESHOOTING */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'troubleshoot' ? null : 'troubleshoot')}
                className={`group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
                  activeTab === 'troubleshoot' || activeDropdown === 'troubleshoot'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Troubleshooting</span>
                {activeDropdown === 'troubleshoot' ? <ChevronUp size={13} className="text-emerald-700" /> : <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600" />}
              </button>
              {activeDropdown === 'troubleshoot' && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl min-w-[280px] flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Klinik Solusi Masalah:
                  </div>
                  {[
                    { label: 'Cancel TECO Order (IW32)', desc: 'Membatalkan status TECO yang keliru' },
                    { label: 'Koreksi Reservasi MM', desc: 'Penyesuaian suku cadang gudang' },
                    { label: 'Selisih Jam Kerja Real vs Plan', desc: 'Koreksi input HM & mekanik IW41' },
                    { label: 'Error Settlement Biaya', desc: 'Validasi cost center sebelum closing' }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleDropdownSelect('troubleshoot')}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer flex flex-col text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                    >
                      <span className="font-semibold text-emerald-800">{item.label}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 6. KATALOG & MATRIKS SOP */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'catalog' ? null : 'catalog')}
                className={`group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
                  activeTab === 'catalog' || activeDropdown === 'catalog'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Katalog SOP</span>
                {activeDropdown === 'catalog' ? <ChevronUp size={13} className="text-emerald-700" /> : <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600" />}
              </button>
              {activeDropdown === 'catalog' && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl min-w-[260px] flex flex-col gap-1">
                  <button
                    onClick={() => handleDropdownSelect('catalog')}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer flex flex-col text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                  >
                    <span className="font-bold text-emerald-800">Matriks 18 Modul Resmi</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">Lihat matriks SOP & relasi bisnis proses</span>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Right Side Status Badges */}
          <div className="flex items-center gap-2 shrink-0 ml-auto pl-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-500">Modul:</span>
              <span className="text-slate-900 font-mono font-bold">{activeTcode.tcode}</span>
              <span className="text-slate-500 font-mono">M{activeTcode.moduleNo}</span>
            </div>
          </div>

        </div>
      </div>
      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT AREA (100% Full Width, Clean & Spacious)
      ───────────────────────────────────────────────────────────── */}
      <div className={`relative z-10 ${isLocalDev ? 'max-w-[1720px]' : 'max-w-7xl'} mx-auto p-4 md:p-8 space-y-6`}>
        {activeTab === 'flow' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Peta Alur Kerja Proses SAP Plant Maintenance</h2>
                <p className="text-xs text-slate-600 mt-1">Pilih jenis alur pemeliharaan untuk melihat urutan dokumen transaksi dari awal hingga selesai.</p>
              </div>
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs">
                <button
                  onClick={() => { setActiveWorkflow('corrective'); setSelectedFlowStep(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeWorkflow === 'corrective' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-transparent text-emerald-950 hover:bg-emerald-50'
                  }`}
                >
                  ⚡ Corrective (PM01)
                </button>
                <button
                  onClick={() => { setActiveWorkflow('preventive'); setSelectedFlowStep(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeWorkflow === 'preventive' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-transparent text-emerald-950 hover:bg-emerald-50'
                  }`}
                >
                  📅 Preventive (PM02)
                </button>
                <button
                  onClick={() => { setActiveWorkflow('logbook'); setSelectedFlowStep(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeWorkflow === 'logbook' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-transparent text-emerald-950 hover:bg-emerald-50'
                  }`}
                >
                  🚛 Logbook Traksi
                </button>
              </div>
            </div>

            {activeWorkflow && (
              <SapFlowMap
                key={activeWorkflow}
                workflowKey={activeWorkflow}
                selectedStep={selectedFlowStep}
                onSelectStep={setSelectedFlowStep}
                onZoomImage={setZoomedImage}
                onOpenModule={(key, pilar) => {
                  if (modulesDatabase[key]) {
                    setActiveTab(pilar || "pilar3");
                    setSelectedTcodeKey(key);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              />
            )}
          </div>
        )}

        {(activeTab === 'pilar1' || activeTab === 'pilar2' || activeTab === 'pilar3') && (
          <div className="w-full animate-in fade-in-50 duration-200">
            {renderPilarContent()}
          </div>
        )}

        {activeTab === 'troubleshoot' && (
          <div className="space-y-8 animate-in fade-in-50 duration-200">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div>
                <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-3 py-1 rounded-full border border-amber-200 uppercase tracking-wider">
                  Troubleshooting & Kasus Lapangan
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">Klinik Penanganan Masalah & Solusi Nyata SAP PM</h2>
                <p className="text-xs text-slate-600 mt-1">Lengkap dengan gambar screenshot langkah demi langkah sesuai dokumen resmi.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-800 font-bold bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                  5 Kasus Siap Solusi
                </span>
              </div>
            </div>

            {/* KASUS 1: CARA CANCEL TECO DENGAN GAMBAR ASLI */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-sm">
                    1
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Cara Membatalkan Status TECO (Cancel Technical Completion)</h3>
                    <p className="text-xs text-slate-500">Kasus: Work Order sudah terlanjur di-TECO padahal masih ada suku cadang susulan atau salah jam kerja mekanik.</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200">
                  T-Code: IW32
                </span>
              </div>

              {/* Langkah 1 & Gambar 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">Langkah 1</span>
                  <h4 className="text-xs font-bold text-slate-900">Buka Transaksi IW32 & Masukkan Nomor Order</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ketik <strong>IW32</strong> pada command field (atau <strong className="font-mono text-emerald-700">/NIW32</strong> jika sedang di layar lain). Masukkan nomor Work Order yang statusnya ingin dibatalkan dari TECO, lalu tekan <strong>Enter</strong>.
                  </p>
                </div>
                <div className="w-full">
                  <SAPAnnotatedImage
                    image="/images/cancel_teco/step_1.png"
                    alt="Layar Input IW32"
                    caption="Masukkan /NIW32 dan Nomor Order"
                    onZoom={(img) => { setZoomedImage(img); setZoomScale(1); }}
                  />
                </div>
              </div>

              {/* Langkah 2 & Gambar 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">Langkah 2</span>
                  <h4 className="text-xs font-bold text-slate-900">Pilih Menu Bar: Order ➔ Function ➔ Complete ➔ Cancel Technical Completion</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pada menu bar atas layar SAP GUI, klik menu: <br/>
                    <strong className="text-amber-800 font-semibold">Order ➔ Function ➔ Complete ➔ Cancel Technical</strong>.<br/>
                    Status order seketika kembali menjadi <strong>REL (Released)</strong>. Klik tombol <strong>Save</strong>. Suku cadang tambahan sekarang sudah bisa diinput kembali.
                  </p>
                </div>
                <div className="w-full">
                  <SAPAnnotatedImage
                    image="/images/cancel_teco/step_2.png"
                    alt="Menu Cancel TECO di IW32"
                    caption="Menu Bar: Order ➔ Function ➔ Complete ➔ Cancel Technical"
                    onZoom={(img) => { setZoomedImage(img); setZoomScale(1); }}
                  />
                </div>
              </div>
            </div>

            {/* KASUS 2: ATURAN STANDAR RECUTOVER KODE UNIT PTPN */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center justify-center font-bold text-sm">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Standar Kode Unit Recutover PTPN IV (Kebun & Pabrik)</h3>
                    <p className="text-xs text-slate-500">Aturan resmi penulisan Planning Plant dan Maintenance Plant regional.</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200">
                  Standar SAP Holding
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                  <h5 className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                    🌿 Kategori Kebun: Menggunakan Huruf "E"
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Sesuai dokumen standar recutover PTPN (Modul 01 Tabel 3), seluruh kode unit kebun lama yang berawalan huruf <strong>K</strong> dikonversi menjadi huruf <strong>E</strong>:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-800 pt-1 font-semibold">
                    <div>• 5E01: Kebun G. Meliau</div>
                    <div>• 5E02: Kebun Gunung Mas</div>
                    <div>• 5E03: Kebun Sungai Dekan</div>
                    <div>• 5E04: Kebun Rimba Belian</div>
                    <div>• 5E11: Kebun Danau Salak</div>
                    <div>• 5E14: Kebun Pamukan</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                  <h5 className="text-xs font-bold text-amber-800 flex items-center gap-2">
                    🏭 Kategori Pabrik: Menggunakan Huruf "F"
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Seluruh kode unit pabrik kelapa sawit (PKS) lama yang berawalan huruf <strong>P</strong> dikonversi menjadi huruf <strong>F</strong>:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-800 pt-1 font-semibold">
                    <div>• 5F01: PKS Gunung Meliau</div>
                    <div>• 5F02: PKS Gunung Mas</div>
                    <div>• 5F03: PKS Sungai Dekan</div>
                    <div>• 5F04: PKS Rimba Belian</div>
                    <div>• 5F09: PKS Mariri</div>
                    <div>• 5F22: PKS Long Pinang</div>
                  </div>
                </div>
              </div>
            </div>

            {/* KASUS 3: GOS ATTACHMENT */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-sm">
                    3
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Cara Melampirkan Foto & Dokumen PDF ke Objek SAP (GOS Attachment)</h3>
                    <p className="text-xs text-slate-500">Untuk melampirkan foto fisik kerusakan atau manual book mesin langsung ke master equipment / work order.</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  Fitur GOS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-2">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Fitur <strong>Services for Object (GOS)</strong> berada di pojok kiri atas jendela SAP GUI (tepat di samping judul transaksi):
                  </p>
                  <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5 font-medium">
                    <li>Klik ikon kotak kecil bertingkat di pojok kiri atas <strong>[Services for Object]</strong></li>
                    <li>Pilih menu <strong>Create ➔ Create Attachment</strong></li>
                    <li>Pilih file foto (.JPG, .PNG) atau dokumen (.PDF) dari komputer Anda</li>
                    <li>File otomatis tersimpan di server SAP dan dapat dibuka siapa pun yang melihat transaksi ini</li>
                  </ol>
                </div>
                <div className="w-full">
                  <SAPAnnotatedImage
                    image="/images/il01/step_5.png"
                    alt="GOS Attachment Menu"
                    caption="Menu Service for Object ➔ Create Attachment"
                    onZoom={(img) => { setZoomedImage(img); setZoomScale(1); }}
                  />
                </div>
              </div>
            </div>

            {/* KASUS 4: OTOMASI SCRIPTING VBS SAP GUI (IE01/IE02) */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-sm">
                    4
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Otomasi Script VBScript SAP GUI (Input Massal Cepat)</h3>
                    <p className="text-xs text-slate-500">Dokumen asli menyertakan script VBS untuk input massal equipment tanpa ketik manual (C:\Logbook\ie01.vbs).</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(`If Not IsObject(application) Then
   Set SapGuiAuto  = GetObject("SAPGUI")
   Set application = SapGuiAuto.GetScriptingEngine
End If
If Not IsObject(connection) Then
   Set connection = application.Children(0)
End If
If Not IsObject(session) Then
   Set session    = connection.Children(0)
End If
If IsObject(WScript) Then
   WScript.ConnectObject session,     "on"
   WScript.ConnectObject application, "on"
End If
session.findById("wnd[0]").maximize
session.findById("wnd[0]/tbar[0]/okcd").text = "ie01"
session.findById("wnd[0]").sendVKey 0`, 'vbs_code')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
                >
                  {copiedKey === 'vbs_code' ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                  <span>{copiedKey === 'vbs_code' ? 'Tersalin!' : 'Salin Contoh VBS'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-700 leading-relaxed mb-3">
                  Di SAP GUI, Anda dapat mengaktifkan <strong>Script Recording and Playback</strong> (Alt+F12 ➔ Script Recording and Playback) untuk merekam dan menjalankan otomatisasi penginputan ratusan master data sekaligus dari file Excel.
                </p>
                <pre className="p-3 bg-slate-900 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto border border-slate-800 shadow-inner">
{`' Header Koneksi SAP GUI Scripting Engine Resmi
Set SapGuiAuto  = GetObject("SAPGUI")
Set application = SapGuiAuto.GetScriptingEngine
Set connection = application.Children(0)
Set session    = connection.Children(0)
session.findById("wnd[0]/tbar[0]/okcd").text = "ie01"
session.findById("wnd[0]").sendVKey 0`}
                </pre>
              </div>
            </div>

            {/* KASUS 5: PANDUAN WARNA STATUS BAR SAP */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-sm">
                    5
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Panduan Arti Kode & Warna Notifikasi Status Bar SAP</h3>
                    <p className="text-xs text-slate-500">Membedakan pesan Informasi, Peringatan (Warning), dan Kesalahan (Error/Abort).</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-700" /> Pesan Hijau: (I) Information
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Dokumen berhasil disimpan (misal: "Order 200000000039 saved"). Sistem siap melanjutkan transaksi berikutnya.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                    <AlertTriangle size={16} className="text-amber-700" /> Pesan Kuning: (W) Warning
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Pemberitahuan peringatan (misal: "Check dates/budget"). Anda dapat melewatinya dengan <strong>menekan tombol Enter sekali lagi</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                    <AlertCircle size={16} className="text-rose-700" /> Pesan Merah: (E / A) Error
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Transaksi terblokir (misal: "Cost Center invalid", "Budget exceeded"). Perbaiki field bertanda merah sebelum bisa lanjut.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* ── HERO: Ensiklopedi & Matriks SOP ─────────────────── */}
            <div className="relative overflow-hidden rounded-3xl border border-teal-200/70 bg-gradient-to-br from-teal-50 via-emerald-50/50 to-white p-6 shadow-xs md:p-8">
              <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-200/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-teal-100/40 blur-3xl" />

              <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-800">
                    <Layers size={12} className="text-teal-600" />
                    Matriks SOP Terintegrasi Web
                  </span>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-[28px]">
                    Ensiklopedi &amp; Matriks 18 Modul Standar SAP Plant Maintenance
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                    Seluruh materi panduan, aturan input data, alur bisnis proses, dan standar PTPN IV dari 18 modul PDF telah dipindahkan secara lengkap ke dalam sistem web ini tanpa perlu mengunduh file dokumen manual.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { Icon: BookOpen, label: 'Modul Terdokumentasi', value: String(sopCatalog.length) },
                      { Icon: Layers, label: 'Pilar Kompetensi', value: String(PILLAR_ORDER.length) },
                      { Icon: Terminal, label: 'T-Code Referensi', value: `${catalogTcodeCount}+` },
                      { Icon: Gauge, label: 'Panduan Berbasis Web', value: '100%' },
                    ].map(({ Icon, label, value }) => (
                      <div key={label} className="rounded-2xl bg-white px-3.5 py-3 shadow-2xs">
                        <Icon size={15} className="text-teal-600" />
                        <div className="mt-1.5 font-mono text-xl font-black leading-none text-slate-900">{value}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Peta kompetensi: lompat cepat ke pilar */}
                <div className="rounded-2xl bg-white p-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <ListChecks size={13} className="text-teal-600" />
                    Peta Kompetensi
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {PILLAR_ORDER.map((key) => {
                      const theme = PILLAR_THEME[key];
                      const count = sopCatalog.filter((mod) => mod.pilarKey === key).length;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCatalogFilter(key)}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
                        >
                          <span className={`h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b ${theme.bar}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold text-slate-900">{theme.short}</span>
                            <span className="block font-mono text-[10px] text-slate-500">{theme.range}</span>
                          </span>
                          <span className={`shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[11px] font-black ${theme.chip}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── TOOLBAR: Filter pilar + pencarian modul ─────────── */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                {[
                  { key: 'all', label: 'Semua Modul', count: sopCatalog.length, activeClass: 'bg-slate-900 text-white shadow-xs' },
                  ...PILLAR_ORDER.map((key) => ({
                    key,
                    label: PILLAR_THEME[key].short,
                    count: sopCatalog.filter((mod) => mod.pilarKey === key).length,
                    activeClass: PILLAR_THEME[key].segActive,
                  })),
                ].map((seg) => (
                  <button
                    key={seg.key}
                    onClick={() => setCatalogFilter(seg.key)}
                    className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      catalogFilter === seg.key ? seg.activeClass : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <span>{seg.label}</span>
                    <span
                      className={`rounded-md px-1.5 py-px font-mono text-[10px] font-black ${
                        catalogFilter === seg.key ? 'bg-white/25 text-white' : 'bg-white text-slate-500'
                      }`}
                    >
                      {seg.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative lg:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Cari modul, T-Code, atau aturan SOP..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none"
                />
                {catalogSearch && (
                  <button
                    onClick={() => setCatalogSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-700"
                    title="Bersihkan pencarian"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* ── BODY: Daftar isi + modul per pilar ──────────────── */}
            <div className="grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start">
              {/* Daftar isi modul */}
              <aside className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <ListChecks size={13} className="text-teal-600" />
                    Daftar Isi Modul
                  </div>
                  <div className="mt-3 space-y-4">
                    {catalogGroups.map((group) => (
                      <div key={group.key}>
                        <div className="flex items-center gap-2 px-1">
                          <span className={`h-2 w-2 rounded-full ${group.dot}`} />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{group.short}</span>
                        </div>
                        <div className="mt-1.5 space-y-0.5 border-l border-slate-200 pl-2">
                          {group.modules.map((mod) => (
                            <button
                              key={mod.no}
                              onClick={() => jumpToCatalogModule(mod.no)}
                              className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
                            >
                              <span className="mt-px font-mono text-[10px] font-black text-slate-400">{mod.no}</span>
                              <span className="text-[11px] font-medium leading-snug text-slate-600">
                                {mod.title.replace(/^(Master Data|Bisnis Proses) - /, '')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {catalogGroups.length === 0 && (
                      <p className="px-1 text-[11px] text-slate-500">Tidak ada modul yang cocok dengan filter saat ini.</p>
                    )}
                  </div>
                </div>
              </aside>

              {/* Modul per pilar */}
              <div className="space-y-8">
                {catalogGroups.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <Search size={22} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-700">Modul tidak ditemukan</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Coba kata kunci lain, misalnya <span className="font-mono font-bold text-slate-700">IW31</span>,{' '}
                      <span className="font-mono font-bold text-slate-700">BOM</span>, atau{' '}
                      <span className="font-mono font-bold text-slate-700">logbook</span>.
                    </p>
                  </div>
                )}

                {catalogGroups.map((group) => (
                  <section key={group.key} id={`pilar-${group.key}`} className="scroll-mt-24 space-y-4">
                    {/* Judul pilar */}
                    <div className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between ${group.softBorder}`}>
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${group.bar}`}>
                          <Layers size={18} />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-black tracking-tight text-slate-900">{group.label}</h3>
                            <span className={`rounded-lg border px-2 py-0.5 font-mono text-[10px] font-black ${group.chip}`}>
                              {group.modules.length} modul
                            </span>
                          </div>
                          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-slate-600">{group.desc}</p>
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-bold text-slate-400">{group.range}</span>
                    </div>

                    {/* Kartu modul */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {group.modules.map((mod) => (
                        <article
                          key={mod.no}
                          id={`modul-${mod.no}`}
                          className={`group relative flex scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${group.cardHover}`}
                        >
                          <div className={`h-1 w-full bg-gradient-to-r ${group.bar}`} />
                          <span className="pointer-events-none absolute right-4 top-4 select-none font-mono text-4xl font-black leading-none text-slate-100">
                            {mod.no}
                          </span>

                          <div className="relative z-10 flex flex-1 flex-col gap-3 p-5">
                            <div className="flex flex-wrap items-center gap-2 pr-12">
                              <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 font-mono text-[10px] font-black ${group.chip}`}>
                                MODUL {mod.no}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                <ShieldCheck size={11} className="text-slate-400" />
                                {mod.role}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold leading-snug text-slate-900">{mod.title}</h4>

                            <p className="text-xs leading-relaxed text-slate-600">{mod.scope}</p>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {mod.tcodes.map((tc) => (
                                <span key={tc} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-extrabold text-slate-700">
                                  {tc}
                                </span>
                              ))}
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                                <ListChecks size={12} className={group.text} />
                                SOP &amp; Aturan Kunci
                              </div>
                              <ul className="mt-2 space-y-1">
                                {mod.keyRules.map((rule, rIdx) => (
                                  <li key={rIdx} className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-600">
                                    <CheckCircle2 size={12} className={`mt-0.5 shrink-0 ${group.text}`} />
                                    <span>{rule}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {mod.highlights && (
                              <div className={`flex items-start gap-2 rounded-xl border-l-4 px-3 py-2 ${group.tipBg}`}>
                                <Sparkles size={13} className="mt-0.5 shrink-0" />
                                <p className="text-[11px] leading-relaxed">{mod.highlights}</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {mod.tcodes.length} T-Code · {mod.keyRules.length} aturan
                            </span>
                            <button
                              onClick={() => handleOpenFromCatalog(mod)}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-all ${group.btn}`}
                            >
                              <span>Buka Panduan ({mod.tcodes[0]})</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. FULLSCREEN IMAGE ZOOM LIGHTBOX MODAL
      ───────────────────────────────────────────────────────────── */}
      {zoomedImage && (() => {
        const modalAnnotations = getImageAnnotation(zoomedImage);
        const hasModalAnnotations = Array.isArray(modalAnnotations) && modalAnnotations.length > 0;
        return (
          <div 
            className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setZoomedImage(null); setZoomScale(1); }}
          >
            <div 
              className="relative max-w-5xl w-full max-h-[94vh] bg-white rounded-2xl border border-slate-200 p-3 shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Controls */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-2 gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2 truncate">
                  <ImageIcon size={14} className="text-emerald-700 shrink-0" />
                  <span className="truncate">Tangkapan Layar SAP GUI Resolusi Penuh</span>
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {hasModalAnnotations && (
                    <button
                      type="button"
                      onClick={() => setModalShowArrows(!modalShowArrows)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        modalShowArrows 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title={modalShowArrows ? 'Sembunyikan Panah & Keterangan' : 'Tampilkan Panah & Keterangan'}
                    >
                      {modalShowArrows ? <EyeOff size={13} className="text-rose-600" /> : <Eye size={13} className="text-slate-500" />}
                      <span>{modalShowArrows ? 'Sembunyikan Panah' : 'Tampilkan Panah'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setZoomScale(s => Math.min(s + 0.25, 2.5))}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    title="Perbesar (Zoom In)"
                  >
                    <ZoomIn size={15} />
                  </button>
                  <button
                    onClick={() => setZoomScale(s => Math.max(s - 0.25, 0.75))}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    title="Perkecil (Zoom Out)"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <button
                    onClick={() => setZoomScale(1)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    title="Reset Ukuran"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    onClick={() => { setZoomedImage(null); setZoomScale(1); }}
                    className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 ml-1 cursor-pointer"
                    title="Tutup (Esc)"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Image Display Viewport */}
              <div className="overflow-auto flex-1 flex flex-col items-center justify-center p-2 bg-slate-100/70 rounded-xl min-h-[380px]">
                <div 
                  className="relative inline-block transition-transform duration-200 max-w-full leading-none"
                  style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
                >
                  <img
                    src={zoomedImage}
                    alt="Layar SAP Zoom"
                    className="max-w-full max-h-[76vh] object-contain shadow-sm rounded-lg block select-none"
                    onLoad={(e) => setModalNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight, src: zoomedImage })}
                  />

                  {/* Layer anotasi merah (kotak, panah, keterangan) di modal.
                      Ukuran asli dicocokkan dengan src: saat pengguna membuka
                      gambar lain, ukuran gambar sebelumnya tidak boleh dipakai
                      (kalau dipakai, kotak sempat digambar dengan skala salah). */}
                  {modalShowArrows && hasModalAnnotations && modalNatural && modalNatural.src === zoomedImage && (
                    <SapAnnotationLayer
                      annotations={modalAnnotations}
                      naturalWidth={modalNatural.w}
                      naturalHeight={modalNatural.h}
                      imageSrc={zoomedImage}
                      zIndex={30}
                    />
                  )}
                </div>
              </div>

              <div className="text-center text-[11px] text-slate-500 mt-2">
                Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 text-slate-700 font-mono">Esc</kbd> atau klik di luar untuk menutup
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

// Icon helper
function TableIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v18" />
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </svg>
  );
}
