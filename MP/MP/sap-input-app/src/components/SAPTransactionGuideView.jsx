import React, { useState, useMemo } from 'react';
import { BookOpen, Search, Info, HelpCircle, ExternalLink, Image, Code2, AlertTriangle, PlayCircle, LogIn, FileText, Wrench, Play, Settings, Clipboard, CheckSquare, Layers, ZoomIn, ZoomOut, Plus, Minus, X, RotateCcw } from 'lucide-react';
import { Stepper, Step, StepIndicator, StepContent, StepTitle, StepDescription } from './ui/stepper';

export default function SAPTransactionGuideView() {
  const [selectedTcode, setSelectedTcode] = useState('zesthlc003pa');
  const [iw31SubTab, setIw31SubTab] = useState('pm01');
  const [zoomedImage, setZoomedImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  React.useEffect(() => {
    if (!zoomedImage) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setZoomedImage(null);
        setZoomLevel(1);
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel(prev => Math.min(prev + 0.25, 3.5));
      } else if (e.key === '-') {
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
      } else if (e.key === '0') {
        setZoomLevel(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImage]);

  const tcodeData = {
    zesthlc003pa: {
      name: 'ZESTHLC003PA - Mass Upload Logbook',
      purpose: 'Upload massal data logbook harian pabrik / kendaraan secara terintegrasi via file excel template ke dalam sistem SAP.',
      relationToLogbook: 'Digunakan oleh Regional/Unit untuk mengunggah ratusan baris data Jam Kerja dan Odometer secara sekaligus untuk efisiensi waktu entry.',
      fields: [
        { name: 'Upload File', desc: 'Unggah berkas template excel regional / unit yang sudah terisi data logbook.', required: true, example: 'REGIONAL_5_MP.xlsx' },
        { name: 'Start Row', desc: 'Baris awal pembacaan data di file excel.', required: true, example: '2' },
        { name: 'Company Code', desc: 'Kode Perusahaan PTPN.', required: true, example: 'N006 (PTPN VI)' },
        { name: 'Plant', desc: 'Kode Unit Usaha / Kebun Pabrik penerima data.', required: true, example: 'FK01 (Kebun Batang Hari)' }
      ],
      steps: [
        'Pastikan sudah memiliki file excel yang akan di input.',
        'Buka TCODE ZESTHLC003PA, kemudian enter.',
        'Pilih file yang akan di input (klik ikon kotak kecil/Browse).',
        'Select semua baris yang mau di upload, setelah itu klik Submit VRA/Logbook.',
        'Pastikan status upload sudah berwarna Hijau.',
        'Buka TCODE /NZESTHLP16PA untuk memposting Logbook yang telah di submit.',
        'Masukan Plant Unit, Vehicle Code, dan rentang tanggal upload Logbook yang telah di submit sebelumnya.',
        'Select data yang akan di Post, lalu klik Post Activity & Meas Point.',
        'Pastikan status sudah berwarna hijau semua. Apabila Error/Merah segera hubungi Keyuser PM.'
      ]
    },
    zesthlp16pa: {
      name: 'ZESTHLP16PA - Monitoring Logbook',
      purpose: 'Membuka laporan monitoring logbook kendaraan operasional untuk diekspor ke Excel.',
      relationToLogbook: 'Digunakan oleh Regional/Unit untuk menarik data logbook secara periodik dan menyimpannya sebagai arsip Excel.',
      fields: [],
      steps: [
        'Buka T-Code ZESTHLP16PA di SAP.',
        'Isi Company Code dengan "Palm".',
        'Isi Plant sesuai Unit masing-masing (atau isi "5*" untuk membuka seluruh plant).',
        'Isi Fiscal Year dengan Tahun anggaran yang ingin dibuka.',
        'Isi VRA Date dengan rentang tanggal data logbook yang ingin ditarik.',
        'Klik tombol Execute (ikon jam atau tekan F8).',
        'Untuk mengekspor hasil laporan ke Excel, pilih menu bar: List -> Export -> Spreadsheet.',
        'Pilih opsi "Export to Excel" lalu klik Save.',
        'Jika muncul pop-up SAP Security, centang opsi "Remember My Decision" dan pilih Allow.',
        'File Excel Laporan Monitoring Logbook sudah siap digunakan.'
      ]
    },
    iw31: {
      name: 'IW31 - Create Maintenance Order',
      purpose: 'Membuat Work Order (WO) pemeliharaan untuk merencanakan perbaikan mesin/alat (korektif, preventif, investasi).',
      relationToLogbook: 'Sebagai tindak lanjut logbook: status breakdown/kerusakan diteruskan menjadi Work Order (PM01/PM02/PM04) agar suku cadang dapat dicairkan dan jam kerja mekanik dapat dicatat.',
      steps: []
    },
    iw32: {
      name: 'IW32 - Change Maintenance Order',
      purpose: 'Melakukan perubahan data Work Order, menginput material suku cadang tambahan, dan memperbarui status perencanaan.',
      relationToLogbook: 'Digunakan untuk merevisi detail perbaikan, menambahkan daftar material spare part baru, mengkonfirmasi status, dan melakukan closing Technical Completion (TECO) jika perbaikan telah rampung.',
      fields: [
        { name: 'Order Number', desc: 'Nomor dokumen Work Order SAP yang ingin diubah.', required: true, example: '200000000039' },
        { name: 'Add Components', desc: 'Kode material spare part tambahan yang dibutuhkan dari gudang.', required: false, example: '82000000 (Seal Kit)' },
        { name: 'Operation details', desc: 'Detail tugas pekerjaan mekanik tambahan.', required: false, example: 'Penggantian hose hidrolik' }
      ],
      steps: [
        'Ketik t-code IW32 di command line SAP GUI.',
        'Masukkan nomor Work Order yang ingin diubah, lalu tekan Enter.',
        'Di tab "Operations", lakukan penyesuaian detail tugas jika ada perubahan rencana.',
        'Di tab "Components", masukkan suku cadang tambahan yang dibutuhkan.',
        'Untuk mengubah status menjadi Planning Completed (PCOM), klik ikon pensil / ubah status di header.',
        'Klik Save untuk menyimpan perubahan dokumen.'
      ]
    },
    iw38: {
      name: 'IW38 - Change PM Order (List Selection)',
      purpose: 'Menampilkan daftar Work Order PM dalam bentuk list untuk dilakukan perubahan data secara massal.',
      relationToLogbook: 'Memudahkan planner memonitor status banyak Work Order sekaligus, melakukan release massal, atau memperbarui parameter tanggal perbaikan.',
      fields: [
        { name: 'Planning Plant', desc: 'Kode Plant pabrik/unit untuk filter WO.', required: true, example: 'FK01' },
        { name: 'Order Type', desc: 'Filter berdasarkan tipe WO (PM01, PM02, PM04).', required: false, example: 'PM01' },
        { name: 'Created On', desc: 'Rentang tanggal pembuatan Work Order.', required: false, example: '01.07.2026 to 15.07.2026' }
      ],
      steps: [
        'Buka TCODE IW38 di SAP GUI.',
        'Masukan Periode tanggal pemeriksaan Work Order yang akan diperiksa.',
        'Masukan Plant pemeliharaan (misal: 5F22) yang akan diperiksa.',
        'Klik tombol EXECUTE (ikon jam / F8) untuk memunculkan daftar Work Order.',
        'Klik 2 kali pada Nomor Order di tabel daftar untuk membuka dan melakukan edit data.'
      ]
    },
    iw39: {
      name: 'IW39 - Display PM Order',
      purpose: 'Menampilkan daftar seluruh dokumen Work Order (display only) di sistem SAP PM.',
      relationToLogbook: 'Digunakan oleh pimpinan unit atau regional untuk memonitor perkembangan realisasi perbaikan aset PKS tanpa mengubah data.',
      fields: [
        { name: 'Planning Plant', desc: 'Kode Pabrik/Unit pemeliharaan alat.', required: true, example: 'FK01' },
        { name: 'Order Status', desc: 'Filter status WO (Outstanding, In Process, Completed).', required: true, example: 'In Process' },
        { name: 'Period', desc: 'Rentang waktu analisis pelaporan.', required: false, example: '01.07.2026 to 31.07.2026' }
      ],
      steps: [
        'Buka TCODE IW39 di SAP GUI.',
        'Masukan Periode tanggal pemeriksaan Work Order yang akan dianalisis.',
        'Masukan kode Plant (misal: 5F22) dan ketik nama Layout /LIST_PM.',
        'Klik tombol EXECUTE (ikon jam / F8) di toolbar atas untuk menjalankan laporan.',
        'Tampilan Display PM Order akan muncul untuk memeriksa seluruh Status Order dan detail pekerjaannya.'
      ]
    },
    zco_cctr_01: {
      name: 'ZCO_CCTR_01 - Cost & Activity Monitoring Report',
      purpose: 'Laporan khusus Controlling (CO) untuk memantau realisasi biaya aktual versus anggaran per Cost Center.',
      relationToLogbook: 'Biaya BBM, spare parts, dan jasa mekanik dari aktivitas harian di logbook diakumulasi dan dimonitor selisihnya melalui laporan cost center ini.',
      fields: [
        { name: 'Controlling Area', desc: 'Area controlling perusahaan.', required: true, example: 'PTPN' },
        { name: 'Cost Center', desc: 'Nomor Cost Center mesin atau unit kerja.', required: true, example: 'TEK-WORK' },
        { name: 'Fiscal Year', desc: 'Tahun buku anggaran pelaporan.', required: true, example: '2026' },
        { name: 'Period', desc: 'Bulan pelaporan (1 hingga 12).', required: true, example: '7' }
      ],
      steps: [
        'Buka TCODE ZCO_CCTR_01 di SAP GUI.',
        'Isi parameter laporan: Controlling Area (PTPN), Fiscal Year (2026), From/To Periode (misal bulan 7), dan Cost Center Group (Untuk Logbook: Reg5-LOG). Setelah itu klik EXECUTE (ikon jam / F8).',
        {
          title: 'Periksa tabel laporan unit masing-masing dengan aturan analisa penting:',
          list: [
            '(a) Jika ada COST maka harus ada ACTIVITY QUANTITY.',
            '(b) Jika ada Cost tetapi tidak ada Activity, artinya Logbook belum dibuat.',
            '(c) Jika tidak ada Cost tetapi ada Activity, artinya belum ada pembebanan biaya.'
          ]
        }
      ]
    },
    s_alr_87013611: {
      name: 'S_ALR_87013611 - Cost Centers: Actual/Plan/Variance',
      purpose: 'Menampilkan analisis perbandingan terperinci biaya aktual, rencana (plan), dan selisih (variance) per Cost Center.',
      relationToLogbook: 'Memungkinkan manajemen mengevaluasi apakah biaya perawatan mesin pabrik melebihi batas RKAP bulanan.',
      fields: [
        { name: 'Controlling Area', desc: 'Area Pengendalian Biaya.', required: true, example: 'PTPN' },
        { name: 'Fiscal Year', desc: 'Tahun anggaran.', required: true, example: '2026' },
        { name: 'From Period / To Period', desc: 'Bulan awal dan akhir penarikan laporan.', required: true, example: '1 to 12' },
        { name: 'Cost Center Group', desc: 'Grup Cost Center (misal: grup mesin pabrik / kendaraan).', required: false, example: 'FK01_VHC' }
      ],
      steps: [
        'Masuk ke t-code S_ALR_87013611 di SAP.',
        'Lengkapi Controlling Area, Fiscal Year, dan Range Periode.',
        'Masukkan kode Cost Center Group atau nomor Cost Center spesifik.',
        'Tekan F8 atau klik Execute.',
        'Menganalisis kolom "Actual" (Realisasi), "Plan" (RKAP), dan "Variance" (Selisih Biaya).'
      ]
    },
    zpmik22: {
      name: 'ZPMIK22 - Upload Jam Jalan Mesin',
      purpose: 'Mengunggah data Jam Jalan Mesin secara massal dari file excel ke sistem SAP.',
      relationToLogbook: 'Digunakan untuk mentransfer data meter reading dari format excel agar langsung masuk ke record mesin (Measuring Point) tanpa perlu input satu per satu.',
      fields: [
        { name: 'File Excel', desc: 'File excel berisi data jam jalan mesin yang akan diupload.', required: true, example: 'jam_jalan_mesin.xlsx' }
      ],
      steps: [
        'BUKA TCODE ZPMIK22',
        'Pilih file yang akan diupload Jam Jalan Mesinnya',
        'Execute (Jalankan Program)',
        'Klik Upload Data',
        'Pastikan indikator telah berwarna hijau. Artinya Jam Jalan Mesin telah berhasil diupload ke ZPMIK22.'
      ]
    }
  };

  const iw31SubData = {
    pm01: {
      name: 'PM01 - Corrective Maintenance Order',
      desc: 'Work Order untuk perbaikan kerusakan mesin yang terjadi secara mendadak / breakdown (Unplanned Maintenance).',
      fields: [
        { name: 'Order Type', val: 'PM01', desc: 'Kode jenis WO perbaikan kerusakan mendadak.' },
        { name: 'Priority', val: 'Medium / High', desc: 'Tingkat kepentingan eksekusi perbaikan.' },
        { name: 'Equipment / Func. Loc', val: '2000004264', desc: 'Nomor Equipment mesin pabrik yang rusak.' },
        { name: 'Description', val: 'Perbaikan Mobil Manager / Boiler Bocor', desc: 'Penjelasan kerusakan mesin (Maksimal 40 karakter).' },
        { name: 'PMActType', val: 'REP (Repair)', desc: 'Jenis aktivitas pemeliharaan.' },
        { name: 'Breakdown Indicator', val: 'Checked (Tick)', desc: 'Dicentang jika mesin mati total.' }
      ]
    },
    pm02: {
      name: 'PM02 - Preventive Maintenance Order',
      desc: 'Work Order untuk kegiatan perawatan terencana / servis berkala berdasarkan Running Hours / Waktu Kalender.',
      fields: [
        { name: 'Order Type', val: 'PM02', desc: 'Kode jenis WO perawatan preventif rutin.' },
        { name: 'Equipment / Func. Loc', val: '2000004265', desc: 'Nomor Equipment mesin yang akan dirawat.' },
        { name: 'Maintenance Plan Ref', val: 'MP-BOILER-01', desc: 'Referensi dokumen rencana perawatan di SAP.' },
        { name: 'Work Center', val: 'TEK-WORK', desc: 'Tim pelaksana perawatan.' },
        { name: 'Task List', val: 'TL-PREV-BOILER', desc: 'Daftar langkah-langkah perawatan wajib.' }
      ]
    },
    pm04: {
      name: 'PM04 - Investment Order',
      desc: 'Work Order untuk proyek modifikasi aset, penambahan kapasitas mesin, atau penggantian unit baru (Capital Expense).',
      fields: [
        { name: 'Order Type', val: 'PM04', desc: 'Kode jenis WO investasi modifikasi aset.' },
        { name: 'Cost Object / WBS Element', val: 'PR-N006-2026-01', desc: 'Kode WBS Element untuk penyerapan biaya kapital.' },
        { name: 'Asset Class', val: '3000 (Machinery)', desc: 'Kelas aset investasi.' },
        { name: 'Investment Profile', val: 'INV-PTPN-01', desc: 'Profil investasi proyek kapital.' }
      ]
    }
  };

  const getActiveScreenshots = () => {
    if (selectedTcode === 'zesthlc003pa') {
      return [
        { label: 'Langkah 1: Persiapan File Excel', src: '/images/zesthlc003pa/step_1.png' },
        { label: 'Langkah 2: Buka TCODE ZESTHLC003PA', src: '/images/zesthlc003pa/step_2.png' },
        { label: 'Langkah 3: Pilih File Excel Logbook', src: '/images/zesthlc003pa/step_3.png' },
        { label: 'Langkah 4: Select Baris & Klik Submit VRA/Logbook', src: '/images/zesthlc003pa/step_4.png' },
        { label: 'Langkah 5: Pastikan Status Upload Hijau', src: '/images/zesthlc003pa/step_5.png' },
        { label: 'Langkah 6: Buka TCODE /NZESTHLP16PA', src: '/images/zesthlc003pa/step_6.png' },
        { label: 'Langkah 7: Masukkan Parameter Plant & Rentang Tanggal', src: '/images/zesthlc003pa/step_7.png' },
        { label: 'Langkah 8: Select Data & Klik Post Activity', src: '/images/zesthlc003pa/step_8.png' },
        { label: 'Langkah 9: Verifikasi Status Posting Hijau Semua', src: '/images/zesthlc003pa/step_9.png' }
      ];
    }
    if (selectedTcode === 'zesthlp16pa') {
      return [
        { label: 'Langkah 1', src: '/images/zesthlp16pa/step_1.png' },
        { label: 'Langkah 2', src: '/images/zesthlp16pa/step_2.png' },
        { label: 'Langkah 3', src: '/images/zesthlp16pa/step_3.png' },
        { label: 'Langkah 4', src: '/images/zesthlp16pa/step_4.png' },
        { label: 'Langkah 5', src: '/images/zesthlp16pa/step_5.png' },
        { label: 'Langkah 6', src: '/images/zesthlp16pa/step_6.png' },
        { label: 'Langkah 7', src: '/images/zesthlp16pa/step_7.png' },
        { label: 'Langkah 8', src: '/images/zesthlp16pa/step_8.png' }
      ];
    }
    if (selectedTcode === 'iw31') {
      return [
        { label: 'Langkah 1', src: '/images/iw31/step_1.png' },
        { label: 'Langkah 2', src: '/images/iw31/step_2.png' },
        { label: 'Langkah 3', src: '/images/iw31/step_3.png' },
        { label: 'Langkah 4', src: '/images/iw31/step_4.png' },
        { label: 'Langkah 5', src: '/images/iw31/step_5.png' },
        { label: 'Langkah 6', src: '/images/iw31/step_6.png' },
        { label: 'Langkah 7', src: '/images/iw31/step_7.png' },
        { label: 'Langkah 8', src: '/images/iw31/step_8.png' }
      ];
    }
    if (selectedTcode === 'iw32') {
      return [
        { label: 'Langkah 1', src: '/images/iw32/step_1.png' },
        { label: 'Langkah 2', src: '/images/iw32/step_2.png' },
        { label: 'Langkah 3', src: '/images/iw32/step_3.png' },
        { label: 'Langkah 4', src: '/images/iw32/step_4.png' },
        { label: 'Langkah 5', src: '/images/iw32/step_5.png' }
      ];
    }
    if (selectedTcode === 'iw38') {
      return [
        { label: 'Langkah 1: Buka TCODE IW38', src: '/images/iw38/step_1.png' },
        { label: 'Langkah 2: Masukan Periode Pemeriksaan', src: '/images/iw38/step_2.png' },
        { label: 'Langkah 3: Masukan Plant Pemeriksaan', src: '/images/iw38/step_3.png' },
        { label: 'Langkah 4: Klik EXECUTE', src: '/images/iw38/step_4.png' },
        { label: 'Langkah 5: Klik 2 Kali Nomor Order untuk Edit', src: '/images/iw38/step_5.png' }
      ];
    }
    if (selectedTcode === 'iw39') {
      return [
        { label: 'Langkah 1: Buka TCODE IW39', src: '/images/iw39/step_1.png' },
        { label: 'Langkah 2: Masukan Periode Pemeriksaan', src: '/images/iw39/step_2.png' },
        { label: 'Langkah 3: Masukan Plant & Layout /LIST_PM', src: '/images/iw39/step_3.png' },
        { label: 'Langkah 4: Klik EXECUTE', src: '/images/iw39/step_4.png' },
        { label: 'Langkah 5: Tampilan Display PM Order', src: '/images/iw39/step_5.png' }
      ];
    }
    if (selectedTcode === 'zco_cctr_01') {
      return [
        { label: 'Langkah 1: Buka TCODE ZCO_CCTR_01', src: '/images/zco_cctr_01/step_1.png' },
        { label: 'Langkah 2: Isi Parameter & Klik EXECUTE', src: '/images/zco_cctr_01/step_2.png' },
        { label: 'Langkah 3: Analisa Laporan Cost vs Activity', src: '/images/zco_cctr_01/step_3.png' }
      ];
    }
    if (selectedTcode === 'zpmik22') {
      return [
        { label: 'Langkah 1: Buka TCODE ZPMIK22', src: '/tutorial/zpmik22/img_1784346160492_33y99.png' },
        { label: 'Langkah 2: Pilih File', src: '/tutorial/zpmik22/img_1784346160493_fsxz1.png' },
        { label: 'Langkah 3: Execute', src: '/tutorial/zpmik22/img_1784346160495_b68ty.png' },
        { label: 'Langkah 4: Upload Data', src: '/tutorial/zpmik22/img_1784346160502_1kgl4.png' },
        { label: 'Langkah 5: Pastikan Indikator Hijau', src: '/tutorial/zpmik22/img_1784346160509_ac75d.png' }
      ];
    }
    return null;
  };

  const activeScreenshots = getActiveScreenshots();

  return (
    <div className="bg-transparent min-h-screen p-1 sm:p-4 font-sans text-slate-800">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="text-[#064e3b]" /> Panduan T-Code ERP SAP PM
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Panduan referensi t-code standar untuk modul SAP Plant Maintenance (PM) dan pemetaannya dengan Logbook Operasional PTPN IV.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-xl border border-emerald-100">
          <Layers size={14} /> Terintegrasi ERP SAP PTPN
        </div>
      </div>

      {/* Grid Alur Mapping */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <HelpCircle size={18} className="text-[#064e3b]" /> Dimana Posisi Logbook Harian di dalam SAP PM?
        </h3>
         <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative">
          <Stepper orientation="vertical">
            <Step>
              <StepIndicator index={1} active icon={<FileText size={14} />} />
              <StepContent>
                <StepTitle className="text-[#064e3b]">Langkah 1: Logbook Fisik</StepTitle>
                <StepDescription className="mt-1">
                  <span className="block font-bold text-slate-800 text-sm mb-1.5">Pencatatan Harian di Lapangan</span>
                  Operator mencatat Jam Kerja Alat (HM), temuan kerusakan, kondisi breakdown, dan pemakaian bahan bakar secara harian pada lembar logbook fisik.
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-[10.5px] text-slate-600 font-mono space-y-1 mt-3 shadow-inner max-w-sm">
                    <p>📝 Logbook HM: 4,820.5 Hours</p>
                    <p>⚠️ Status: Breakdown (Oli Bocor)</p>
                  </div>
                </StepDescription>
              </StepContent>
            </Step>

            <Step>
              <StepIndicator index={2} active icon={<LogIn size={14} />} />
              <StepContent>
                <StepTitle className="text-[#10b981]">Langkah 2: Entry SAP</StepTitle>
                <StepDescription className="mt-1">
                  <span className="block font-bold text-slate-800 text-sm mb-1.5">Input ke Transaksi SAP PM</span>
                  Data jam jalan diinput ke ZESTHLC003PA (Mass) atau ZESTHLP16PA (Manual) untuk memperbarui sistem. Kerusakan dilaporkan lewat IW21 (Notification).
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-[10.5px] text-slate-600 font-mono space-y-1 mt-3 shadow-inner max-w-sm">
                    <p>⚙️ Tcode ZESTHLC003PA (Mass Upload)</p>
                    <p>🚨 Tcode IW21 (PM Notification)</p>
                  </div>
                </StepDescription>
              </StepContent>
            </Step>

            <Step>
              <Step>
                <StepIndicator index={3} active icon={<Wrench size={14} />} />
                <StepContent>
                  <StepTitle className="text-amber-500">Langkah 3: Perbaikan</StepTitle>
                  <StepDescription className="mt-1">
                    <span className="block font-bold text-slate-800 text-sm mb-1.5">Eksekusi & Penyelesaian Work Order</span>
                    Work Order (IW31) dibuat, material suku cadang diambil, kemudian Teknisi memperbaiki alat. Status diubah ke TECO (Technically Completed) di IW32.
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-[10.5px] text-slate-600 font-mono space-y-1 mt-3 shadow-inner max-w-sm">
                      <p>🔧 Tcode IW31 (Create WO)</p>
                      <p>✅ Tcode IW32 (Status TECO)</p>
                    </div>
                  </StepDescription>
                </StepContent>
              </Step>
            </Step>
          </Stepper>
        </div>
      </div>

      {/* Tcode Selector & Form Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Tcode Menu */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm h-fit space-y-2.5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Daftar T-Code SAP PM</h4>
          
          {Object.keys(tcodeData).map((tcode) => (
            <button
              key={tcode}
              onClick={() => setSelectedTcode(tcode)}
              className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between border ${
                selectedTcode === tcode 
                  ? 'bg-[#064e3b] border-[#064e3b] text-white shadow-md shadow-[#064e3b]/10' 
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-mono font-black tracking-wider ${
                  selectedTcode === tcode ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600 border border-slate-300'
                }`}>
                  {tcode.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold ${selectedTcode === tcode ? 'text-white' : 'text-slate-800'} truncate`}>
                    {tcodeData[tcode].name.split(' - ')[1]}
                  </p>
                </div>
              </div>
              <Play size={12} className={selectedTcode === tcode ? 'text-white' : 'text-slate-400'} />
            </button>
          ))}
        </div>

        {/* Right Detail Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header detail */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <span className="bg-[#064e3b]/10 text-[#064e3b] text-xs font-extrabold px-3 py-1 rounded-full uppercase font-mono border border-[#064e3b]/20">
                SAP GUI TRANSACTION
              </span>
              <h3 className="text-xl font-black text-slate-800 mt-2.5">
                {tcodeData[selectedTcode].name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {tcodeData[selectedTcode].purpose}
              </p>
            </div>

            {/* Steps Section with Inline Screenshots */}
            {selectedTcode !== 'iw31' && (
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Langkah-Langkah Input SAP GUI:</h4>
                <Stepper orientation="vertical">
                  {tcodeData[selectedTcode].steps.map((step, idx) => {
                    const screenshot = activeScreenshots && activeScreenshots[idx];
                    return (
                      <Step key={idx}>
                        <StepIndicator index={idx + 1} />
                        <StepContent>
                          <StepTitle className="font-sans text-xs text-slate-700 font-medium leading-relaxed">
                            {typeof step === 'string' ? (
                              step.replace(/\*\*/g, '').replace(/\*/g, '')
                            ) : typeof step === 'object' && step.title ? (
                              <div className="space-y-2">
                                <div className="font-semibold text-slate-800">{step.title}</div>
                                <ul className="space-y-1.5 pl-3 border-l-2 border-emerald-500/50 text-slate-600 font-normal">
                                  {step.list.map((item, iIdx) => (
                                    <li key={iIdx} className="leading-relaxed flex items-start gap-2">
                                      <span className="font-bold text-emerald-600 mt-0.5">•</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              step
                            )}
                          </StepTitle>
                          {screenshot && (
                            <div 
                              onClick={() => {
                                setZoomedImage(screenshot);
                                setZoomLevel(1.25);
                              }}
                              className="mt-3 mb-2 border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm cursor-pointer relative group transition-all duration-300 hover:shadow-md hover:border-emerald-300"
                              title="Klik untuk memperbesar / Zoom (+)"
                            >
                              <img src={screenshot.src} alt={screenshot.label} className="w-full max-h-[350px] object-contain group-hover:scale-[1.02] transition-transform duration-300" />
                              <div className="absolute top-2.5 right-2.5 bg-slate-900/80 group-hover:bg-[#064e3b] text-white text-[11px] font-semibold px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-lg transition-all duration-200">
                                <ZoomIn size={14} className="text-emerald-400 group-hover:text-white" />
                                <span>Klik / Zoom In (+)</span>
                              </div>
                            </div>
                          )}
                        </StepContent>
                      </Step>
                    );
                  })}
                </Stepper>
              </div>
            )}

            {selectedTcode === 'iw31' && (
              <div className="space-y-4 pt-2">
                {/* Sub-tab switcher for IW31 order types */}
                <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-1 max-w-md">
                  {Object.keys(iw31SubData).map((subKey) => (
                    <button
                      key={subKey}
                      onClick={() => setIw31SubTab(subKey)}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-colors ${
                        iw31SubTab === subKey 
                          ? 'bg-[#064e3b] text-white shadow-sm' 
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {subKey.toUpperCase()} Steps
                    </button>
                  ))}
                </div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Langkah-Langkah Membuat Work Order ({iw31SubTab.toUpperCase()}):</h4>
                <Stepper orientation="vertical">
                  {(iw31SubTab === 'pm01' 
                    ? [
                        "Buka t-code IW31 di SAP GUI.",
                        "Masukkan Order Type PM01, Priority Medium (atau sesuai urgensi), dan Equipment Number (contoh: 1000171426). Tekan Enter.",
                        "Di layar \"Central Header\", isi deskripsi pekerjaan (contoh: \"pergantian seal material pintu rebusan\"), PlannerGroup 500, Work Center TEK-WSH, Plant 5F22, dan PMActType REP (Repair).",
                        "Klik tombol pensil di sebelah kanan kolom *Notifctn* untuk membuat dokumen laporan kerusakan terintegrasi.",
                        "Pada pop-up Notification, masukkan kode kerusakan (Damage: F100 / BROKEN, Text: RUSAK, Cause: C999, Cause Text: RUSAK), lalu tekan Enter.",
                        "Pindah ke tab Components di bagian tengah. Masukkan kode material suku cadang (contoh: 82074428), jumlah kebutuhan (Qty: 27), dan Storage Location (SLoc: 0001).",
                        "Klik tombol centang status di header, pilih status 02 PCOM (Planning Completed).",
                        "Klik ikon Release (bendera hijau) pada toolbar untuk merilis WO & mendapatkan nomor Reservasi material gudang (contoh: 13070238). Klik Save."
                      ]
                    : [
                        "Jalankan transaksi IW31 di SAP.",
                        "Pilih Order Type (PM02 untuk preventif berkala, PM04 untuk investasi kapital).",
                        "Masukkan Planning Plant (misal: 5F22) dan nomor Equipment tujuan.",
                        "Lengkapi deskripsi rencana perawatan, alokasi jam kerja mekanik, dan WBS Element (untuk investasi).",
                        "Di tab \"Components\", masukkan suku cadang yang digunakan jika dibutuhkan.",
                        "Klik Release (bendera hijau) lalu klik Save untuk memposting Work Order."
                      ]
                  ).map((step, idx) => {
                    const screenshot = activeScreenshots && activeScreenshots[idx];
                    return (
                      <Step key={idx}>
                        <StepIndicator index={idx + 1} />
                        <StepContent>
                          <StepTitle className="font-sans text-xs text-slate-700 font-medium leading-relaxed">
                            {typeof step === 'string' ? (
                              step.replace(/\*\*/g, '').replace(/\*/g, '')
                            ) : typeof step === 'object' && step.title ? (
                              <div className="space-y-2">
                                <div className="font-semibold text-slate-800">{step.title}</div>
                                <ul className="space-y-1.5 pl-3 border-l-2 border-emerald-500/50 text-slate-600 font-normal">
                                  {step.list.map((item, iIdx) => (
                                    <li key={iIdx} className="leading-relaxed flex items-start gap-2">
                                      <span className="font-bold text-emerald-600 mt-0.5">•</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              step
                            )}
                          </StepTitle>
                          {screenshot && (
                            <div 
                              onClick={() => {
                                setZoomedImage(screenshot);
                                setZoomLevel(1.25);
                              }}
                              className="mt-3 mb-2 border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm cursor-pointer relative group transition-all duration-300 hover:shadow-md hover:border-emerald-300"
                              title="Klik untuk memperbesar / Zoom (+)"
                            >
                              <img src={screenshot.src} alt={screenshot.label} className="w-full max-h-[350px] object-contain group-hover:scale-[1.02] transition-transform duration-300" />
                              <div className="absolute top-2.5 right-2.5 bg-slate-900/80 group-hover:bg-[#064e3b] text-white text-[11px] font-semibold px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-lg transition-all duration-200">
                                <ZoomIn size={14} className="text-emerald-400 group-hover:text-white" />
                                <span>Klik / Zoom In (+)</span>
                              </div>
                            </div>
                          )}
                        </StepContent>
                      </Step>
                    );
                  })}
                </Stepper>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Fullscreen Image Zoom / Lightbox Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-in fade-in duration-200 select-none">
          {/* Top Bar */}
          <div className="w-full max-w-6xl flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3.5 text-white shadow-xl z-10">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0">
                ZOOM PREVIEW
              </span>
              <span className="text-sm font-bold truncate text-slate-100">{zoomedImage.label}</span>
            </div>
            <button
              onClick={() => {
                setZoomedImage(null);
                setZoomLevel(1);
              }}
              className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition-colors shrink-0 flex items-center gap-1.5 px-3 text-xs font-semibold"
              title="Tutup (Esc)"
            >
              <X size={16} />
              <span>Tutup</span>
            </button>
          </div>

          {/* Center Zoom Viewport */}
          <div 
            className="flex-1 w-full max-w-7xl overflow-auto my-4 flex items-center justify-center p-2 sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setZoomedImage(null);
                setZoomLevel(1);
              }
            }}
          >
            <div className="relative inline-block transition-transform duration-200 ease-out origin-center" style={{ transform: `scale(${zoomLevel})` }}>
              <img 
                src={zoomedImage.src} 
                alt={zoomedImage.label} 
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-white/10 bg-white" 
              />
            </div>
          </div>

          {/* Floating Zoom Toolbar Controls (+) / (-) */}
          <div className="bg-slate-900 border border-slate-700 rounded-full px-6 py-3 shadow-2xl flex items-center gap-4 text-white z-10">
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
              disabled={zoomLevel <= 0.5}
              className="p-2 bg-slate-800 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-full transition-colors flex items-center justify-center"
              title="Zoom Out (-)"
            >
              <Minus size={18} />
            </button>

            <div className="flex items-center gap-2 min-w-[110px] justify-center font-mono text-xs font-bold text-emerald-400 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
              <ZoomIn size={14} className="text-slate-400" />
              <span>{Math.round(zoomLevel * 100)}%</span>
            </div>

            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3.5))}
              disabled={zoomLevel >= 3.5}
              className="p-2 bg-slate-800 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-full transition-colors flex items-center justify-center shadow-lg hover:shadow-emerald-500/30"
              title="Zoom In (+)"
            >
              <Plus size={18} />
            </button>

            <div className="h-4 w-[1px] bg-slate-700 mx-1" />

            <button
              onClick={() => setZoomLevel(1)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Reset ke Ukuran Asli (100%)"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
