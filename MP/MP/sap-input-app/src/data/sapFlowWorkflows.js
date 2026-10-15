// Peta Alur Kerja (journey map) data for SAPTransactionGuideView.
// Each workflow: header copy + ordered station list. Every station carries the
// short node card copy AND the long detail-panel copy, so the map and the
// inspector stay in sync from a single source.

export const FLOW_WORKFLOWS = {
  corrective: {
    key: 'corrective',
    tone: 'rose',
    icon: 'alert',
    banner: 'Jalur Eksekusi: Corrective Maintenance (Order Type: PM01)',
    metaBadge: '6 Stasiun Terintegrasi',
    title: 'Peta Perjalanan Penanganan Kerusakan Mesin Pabrik / Traksi',
    subtitle:
      'Alur pertukaran dokumen resmi antar bagian dari deteksi kerusakan hingga penutupan teknis (TECO).',
    legend: [
      { label: '👷‍♂️ Mandor', tone: 'amber' },
      { label: '📋 Planner', tone: 'blue' },
      { label: '📦 Gudang MM', tone: 'purple' },
      { label: '🔧 Mekanik', tone: 'cyan' },
      { label: '👔 Askep', tone: 'emerald' }
    ],
    trackGradient:
      'from-amber-400 via-blue-400 via-indigo-400 via-purple-400 via-cyan-400 to-emerald-500',
    stations: [
      {
        step: 1,
        short: 'Notifikasi Kerusakan',
        desc: 'Laporan kerusakan mendadak di stasiun kerja',
        tcode: 'IW21',
        nodeRole: '👷‍♂️ Mandor / Operator',
        statusSap: 'CRTD',
        statusLabel: 'Created',
        output: 'No. Notif (10xxxxxx)',
        tone: 'amber',
        title: 'Notifikasi Kerusakan (Maintenance Notification)',
        role: '👷‍♂️ Mandor / Operator Lapangan',
        statusLong: 'CRTD (Created)',
        image: '/images/iw21/step_1.png',
        imageCaption: 'Layar Input Notifikasi Kerusakan IW21 di SAP GUI',
        sla: '< 30 Menit sejak mesin breakdown',
        inputs: [
          'Notification Type: M1 (Breakdown) atau M2 (Kerusakan Normal)',
          'Functional Location & Equipment ID mesin target (IH08)',
          'Gejala kerusakan, uraian masalah, & jam mulai breakdown'
        ],
        outputs: [
          'Nomor Dokumen Notifikasi Resmi SAP (10xxxxxx)',
          'Notifikasi otomatis masuk ke daftar antrean Planner (IW28)'
        ],
        sop: [
          'Operator wajib lapor secepatnya, dilarang menunda hingga pergantian shift.',
          'Pilih Damage Code & Cause Code sesuai katalog standar QS41.',
          'Jam breakdown wajib sinkron dengan catatan logbook fisik pabrik.'
        ],
        targetKey: 'iw21',
        targetPilar: 'pilar3'
      },
      {
        step: 2,
        short: 'Terbitkan Work Order',
        desc: 'Rencana tenaga kerja & reservasi part',
        tcode: 'IW31',
        nodeRole: '📋 Asisten / Planner',
        statusSap: 'ORDR',
        statusLabel: 'Order Plan',
        output: 'No. WO (40xxxxxx)',
        tone: 'blue',
        title: 'Terbitkan Work Order (Maintenance Order)',
        role: '📋 Asisten Teknik / Maintenance Planner',
        statusLong: 'ORDR (Order Planned)',
        image: '/images/iw31/step_1.png',
        imageCaption: 'Layar Header Pembuatan Work Order PM01 di IW31',
        sla: '< 2 Jam setelah Notifikasi terbit',
        inputs: [
          'Order Type: PM01 (Corrective Breakdown)',
          'Main Work Center pelaksana (TEK-WSH) & Planner Group',
          'Estimasi durasi perbaikan & daftar part gudang yang dibutuhkan'
        ],
        outputs: [
          'Nomor Dokumen Work Order SAP (40xxxxxx)',
          'Nomor Reservasi Suku Cadang Gudang MM otomatis terbit'
        ],
        sop: [
          'Validasi ketersediaan stok suku cadang gudang sebelum order disetujui.',
          'Pastikan Cost Center pembebanan sesuai stasiun unit pabrik.',
          'Hubungkan nomor Notifikasi ke Header Order agar riwayat terlacak.'
        ],
        targetKey: 'iw31',
        targetPilar: 'pilar3'
      },
      {
        step: 3,
        short: 'Rilis Order (REL)',
        desc: 'Otorisasi eksekusi & buka reservasi gudang',
        tcode: 'IW32 (REL)',
        nodeRole: '🚀 Asisten / Askep',
        statusSap: 'REL',
        statusLabel: 'Released',
        output: 'Reservasi Aktif',
        tone: 'indigo',
        title: 'Rilis Order Pemeliharaan (Order Release)',
        role: '🚀 Asisten Teknik / Askep Pabrik',
        statusLong: 'REL (Released)',
        image: '/images/iw32/step_1.png',
        imageCaption: 'Otorisasi & Rilis Status Order di Layar IW32',
        sla: '< 1 Jam sebelum pembongkaran mesin dimulai',
        inputs: [
          'Nomor Work Order SAP (40xxxxxx)',
          'Verifikasi kesiapan tim mekanik & ketersediaan suku cadang'
        ],
        outputs: [
          'Status internal order berubah menjadi REL (Released)',
          'Reservasi suku cadang di gudang terbuka dan siap diambil fisik'
        ],
        sop: [
          'Status REL adalah izin resmi bagi mekanik untuk mulai bekerja.',
          'Gudang dilarang mengeluarkan sparepart jika status belum REL.',
          'Cetak SPK Work Order dan serahkan ke mandor mekanik pelaksana.'
        ],
        targetKey: 'iw32',
        targetPilar: 'pilar3'
      },
      {
        step: 4,
        short: 'Pengeluaran Sparepart',
        desc: 'Goods Issue part gudang fisik via reservasi',
        tcode: 'MIGO / MB1A',
        nodeRole: '📦 Petugas Gudang (MM)',
        statusSap: 'GMPS',
        statusLabel: 'Goods Issue',
        output: 'Material Doc & Debet',
        tone: 'purple',
        title: 'Pengeluaran Suku Cadang (Goods Issue)',
        role: '📦 Petugas Gudang / Logistik (MM)',
        statusLong: 'GMPS (Goods Movement Posted)',
        image: '/images/migo/step_1.png',
        imageCaption: 'Layar Transaksi MIGO Movement Type 261 untuk Work Order',
        sla: '< 1 Jam setelah permintaan dari regu bengkel',
        inputs: [
          'Nomor Reservasi Gudang dari Work Order (Movement Type 261)',
          'Kode Material Part & Jumlah Fisik Pengeluaran'
        ],
        outputs: [
          'Dokumen Material SAP No. 50xxxxxx',
          'Biaya sparepart otomatis didebet ke Cost Center mesin target'
        ],
        sop: [
          'Wajib mencocokkan fisik part dengan nomor SAP sebelum serah terima.',
          'Suku cadang bekas yang diganti wajib disimpan untuk evaluasi scrap.',
          'Dilarang mengeluarkan part tanpa dasar nomor reservasi yang valid.'
        ],
        targetKey: 'migo',
        targetPilar: 'pilar3'
      },
      {
        step: 5,
        short: 'Konfirmasi Jam Kerja',
        desc: 'Catat jam nyata mekanik & hasil perbaikan',
        tcode: 'IW41',
        nodeRole: '🔧 Mekanik Bengkel',
        statusSap: 'CNF',
        statusLabel: 'Confirmed',
        output: 'Realisasi HM / Jam',
        tone: 'cyan',
        title: 'Konfirmasi Jam Kerja Mekanik (Confirmation)',
        role: '🔧 Mekanik Bengkel / Mandor Traksi',
        statusLong: 'CNF (Confirmed)',
        image: '/images/iw32/step_3.png',
        imageCaption: 'Layar Konfirmasi Jam Kerja Aktual Teknisi di IW41',
        sla: 'Maksimal di akhir shift kerja hari yang sama',
        inputs: [
          'Nomor Work Order & Nomor Operasi Pekerjaan (0010)',
          'Jumlah personil mekanik & jam kerja nyata (Actual Work Hours)'
        ],
        outputs: [
          'Dokumen Konfirmasi Jam Kerja SAP terposting resmi',
          'Biaya tenaga kerja internal teralokasi akurat ke order'
        ],
        sop: [
          'Catat jam mulai dan selesai pekerjaan sesuai realisasi fisik lapangan.',
          'Gunakan status PCNF (Partial) jika pekerjaan belum tuntas 100%.',
          'Tuliskan catatan teknis jika waktu perbaikan melebihi estimasi awal.'
        ],
        targetKey: 'iw32',
        targetPilar: 'pilar3'
      },
      {
        step: 6,
        short: 'Penutupan Teknis (TECO)',
        desc: 'Validasi fisik tuntas & siap settlement biaya',
        tcode: 'IW32 (TECO)',
        nodeRole: '👔 Askep / Maskep',
        statusSap: 'TECO',
        statusLabel: 'Tech. Complete',
        output: 'Order Siap Closing',
        tone: 'emerald',
        title: 'Penutupan Teknis (Technical Completion / TECO)',
        role: '👔 Masinis Kepala / Askep Pabrik',
        statusLong: 'TECO (Technically Completed)',
        image: '/images/cancel_teco/step_1.png',
        imageCaption: 'Menu Penutupan Teknis TECO pada Transaksi IW32',
        sla: '< 24 Jam setelah mesin running normal kembali',
        inputs: [
          'Verifikasi mesin telah diuji coba beban dan running normal',
          'Seluruh part dan jam kerja mekanik telah selesai dikonfirmasi'
        ],
        outputs: [
          'Status order terkunci menjadi TECO (Selesai Teknis)',
          'Order siap diproses settlement finansial akhir (KO88)'
        ],
        sop: [
          'Jangan TECO order jika masih ada suku cadang yang belum diambil.',
          'Jika keliru melakukan TECO, batalkan via Cancel TECO sebelum closing akuntansi.',
          'Status TECO wajib selesai sebelum penutupan pembukuan bulanan.'
        ],
        targetKey: 'iw32',
        targetPilar: 'pilar3'
      }
    ]
  },

  preventive: {
    key: 'preventive',
    tone: 'emerald',
    icon: 'calendar',
    banner: 'Jalur Siklus: Perawatan Berkala Jam Jalan (PM02)',
    metaBadge: 'Otomatisasi via IP30',
    title: 'Siklus Pemeliharaan Rutin Preventif Mesin Pabrik',
    subtitle:
      'Pencegahan kerusakan terencana berbasis jadwal interval kalender & akumulasi jam kerja (Hour Meter).',
    legend: [
      { label: '🚜 Operator HM', tone: 'amber' },
      { label: '📋 Planner Task List', tone: 'blue' },
      { label: '⚡ IP30 Batch', tone: 'violet' },
      { label: '🔧 Mekanik', tone: 'emerald' }
    ],
    trackGradient:
      'from-amber-400 via-blue-400 via-indigo-400 via-violet-400 via-emerald-400 to-teal-600',
    stations: [
      {
        step: 1,
        short: 'Catat HM Jam Jalan',
        desc: 'Input akumulasi jam kerja harian',
        tcode: 'IK11',
        nodeRole: '🚜 Mandor HM',
        statusSap: 'MEAS',
        statusLabel: 'Measurement',
        output: 'Counter Update',
        tone: 'amber',
        title: 'Catat HM Jam Jalan (Measurement Reading)',
        role: '🚜 Mandor HM / Operator Traksi',
        statusLong: 'MEAS (Measurement Updated)',
        image: '/images/ik11/step_1.png',
        imageCaption: 'Input Dokumen Pengukuran HM Mesin di IK11',
        sla: 'Harian (Setiap pagi jam 07:00 WIB)',
        inputs: [
          'Measuring Point ID mesin/kendaraan pabrik',
          'Nilai counter Hour Meter (HM) aktual harian',
          'Pembacaan total jam operasi kumulatif'
        ],
        outputs: [
          'Dokumen Pengukuran SAP terposting resmi',
          'Akumulasi counter mesin ter-update real-time'
        ],
        sop: [
          'Catat angka HM sesuai jarum fisik tachometer mesin.',
          'Dilarang estimasi angka tanpa verifikasi fisik.',
          'Laporkan segera jika jarum meteran mati/rusak.'
        ],
        targetKey: 'ik11',
        targetPilar: 'pilar2'
      },
      {
        step: 2,
        short: 'SOP & Task List',
        desc: 'Daftar instruksi kerja servis',
        tcode: 'IA01 / IA05',
        nodeRole: '📋 Asisten Teknik',
        statusSap: 'TLST',
        statusLabel: 'Task List',
        output: 'Katalog Operasi',
        tone: 'blue',
        title: 'SOP & Task List Pemeliharaan (Task List)',
        role: '📋 Asisten Teknik Pabrik',
        statusLong: 'TLST (Task List Defined)',
        image: '/images/ia01/step_1.png',
        imageCaption: 'Daftar Operasi Standar & Suku Cadang Task List IA01',
        sla: 'Sebelum jadwal preventif disetujui',
        inputs: [
          'Equipment Group / Functional Location mesin',
          'Daftar rincian pekerjaan servis berkala',
          'Daftar sparepart standar (filter, oli, seal)'
        ],
        outputs: [
          'Dokumen Task List tersimpan di SAP',
          'Dapat digunakan berulang kali untuk siklus preventif'
        ],
        sop: [
          'Task list mengacu pada manual book pabrikan mesin.',
          'Tentukan kualifikasi mekanik yang dibutuhkan.',
          'Standarisasi kode material suku cadang rutin.'
        ],
        targetKey: 'ia01',
        targetPilar: 'pilar2'
      },
      {
        step: 3,
        short: 'Maintenance Plan',
        desc: 'Jadwal siklus (250 / 500 HM)',
        tcode: 'IP01 / IP10',
        nodeRole: '🗓️ Planner Pabrik',
        statusSap: 'PLAN',
        statusLabel: 'Scheduled',
        output: 'Siklus Aktif',
        tone: 'indigo',
        title: 'Maintenance Plan & Strategi Siklus',
        role: '🗓️ Planner Pabrik',
        statusLong: 'PLAN (Plan Scheduled)',
        image: '/images/ip01/step_1.png',
        imageCaption: 'Penyusunan Strategi Interval Siklus IP01',
        sla: 'Tahunan / Semesteran',
        inputs: [
          'Strategi Pemeliharaan (250 HM, 500 HM, 1000 HM)',
          'Task List standar yang telah disetujui',
          'Toleransi call interval (% lead/lag)'
        ],
        outputs: [
          'Maintenance Plan ID terdaftar resmi',
          'Jadwal siklus preventif aktif otomatis'
        ],
        sop: [
          'Tetapkan siklus sesuai jam operasi bulanan rata-rata.',
          'Gunakan strategi berbasis counter untuk mesin pabrik.',
          'Evaluasi efektivitas siklus tiap semester.'
        ],
        targetKey: 'ip01',
        targetPilar: 'pilar2'
      },
      {
        step: 4,
        short: 'Auto Call Order',
        desc: 'Pemindaian jatuh tempo siklus',
        tcode: 'IP30',
        nodeRole: '⚡ Sistem Batch',
        statusSap: 'AUTO',
        statusLabel: 'Auto',
        output: 'WO Ter-generate',
        tone: 'violet',
        title: 'Auto Call Order via Background Job (Scheduling)',
        role: '⚡ Sistem Batch / Planner',
        statusLong: 'AUTO (Auto Generated)',
        image: '/images/ip30/step_1.png',
        imageCaption: 'Pemindaian Interval Jatuh Tempo di Layar IP30',
        sla: 'Otomatis harian jam 00:00 WIB',
        inputs: [
          'Horizon interval pemindaian (misal: 30 hari ke depan)',
          'Maintenance Plan ID mesin target'
        ],
        outputs: [
          'Work Order PM02 terbit otomatis tanpa ketik manual',
          'Notifikasi pemeliharaan preventif ter-generate'
        ],
        sop: [
          'IP30 dijalankan terjadwal otomatis di server SAP.',
          'Planner wajib cek daftar order yang ter-call tiap pagi.',
          'Pastikan counter HM harian sudah masuk sebelum IP30 jalan.'
        ],
        targetKey: 'ip30',
        targetPilar: 'pilar2'
      },
      {
        step: 5,
        short: 'Rilis Order PM02',
        desc: 'Otorisasi & reservasi gudang',
        tcode: 'IW32 (REL)',
        nodeRole: '🚀 Asisten Teknik',
        statusSap: 'REL',
        statusLabel: 'Released',
        output: 'Reservasi Ready',
        tone: 'emerald',
        title: 'Rilis Order PM02 (Order Release)',
        role: '🚀 Asisten Teknik',
        statusLong: 'REL (Released)',
        image: '/images/iw32/step_1.png',
        imageCaption: 'Rilis Otorisasi Servis Preventif di IW32',
        sla: '< 1 Hari sebelum tanggal jatuh tempo servis',
        inputs: [
          'Nomor Work Order PM02 hasil call IP30',
          'Jadwal kesiapan mesin stop pemeliharaan'
        ],
        outputs: [
          'Status order berubah ke REL (Released)',
          'Reservasi oli dan filter di gudang aktif'
        ],
        sop: [
          'Koordinasikan jadwal stop mesin dengan Masinis Kepala.',
          'Pastikan tim teknisi sudah dialokasikan.',
          'Ambil cetak SPK untuk tim pelaksana servis.'
        ],
        targetKey: 'iw32',
        targetPilar: 'pilar3'
      },
      {
        step: 6,
        short: 'Servis Preventif',
        desc: 'Ganti oli, filter, pelumasan',
        tcode: 'MIGO / MEK',
        nodeRole: '🔧 Tim Bengkel',
        statusSap: 'GMPS',
        statusLabel: 'Material Issued',
        output: 'Material Issued',
        tone: 'purple',
        title: 'Eksekusi Servis Berkala (Service Execution)',
        role: '🔧 Tim Bengkel Lapangan',
        statusLong: 'GMPS (Material Issued)',
        image: '/images/migo/step_1.png',
        imageCaption: 'Pengambilan Suku Cadang Servis via MIGO',
        sla: 'Sesuai durasi jendela stop pemeliharaan',
        inputs: ['SPK Work Order PM02', 'Daftar part reservasi (Oli, filter, grease)'],
        outputs: [
          'Fisik mesin diservis & dibersihkan',
          'Pengeluaran material gudang terposting resmi'
        ],
        sop: [
          'Lakukan servis sesuai butir checklist Task List.',
          'Cek kondisi komponen lain untuk deteksi dini.',
          'Uji coba putaran mesin sebelum diserahkan.'
        ],
        targetKey: 'migo',
        targetPilar: 'pilar3'
      },
      {
        step: 7,
        short: 'Konfirmasi Jam',
        desc: 'Catat waktu kerja teknisi',
        tcode: 'IW41',
        nodeRole: '⏱️ Mandor Bengkel',
        statusSap: 'CNF',
        statusLabel: 'Confirmed',
        output: 'Jam Nyata CNF',
        tone: 'cyan',
        title: 'Konfirmasi Jam Kerja (Confirmation)',
        role: '⏱️ Mandor Bengkel',
        statusLong: 'CNF (Confirmed)',
        image: '/images/iw32/step_3.png',
        imageCaption: 'Pencatatan Jam Servis Preventif di IW41',
        sla: 'Hari yang sama setelah servis tuntas',
        inputs: ['Nomor Order PM02', 'Realisasi jam mekanik & catatan hasil servis'],
        outputs: [
          'Konfirmasi jam kerja terposting',
          'Biaya upah terdistribusi ke order mesin'
        ],
        sop: [
          'Pastikan jam kerja mekanik tercatat akurat.',
          'Cantumkan rekomendasi perbaikan untuk siklus berikutnya.'
        ],
        targetKey: 'iw32',
        targetPilar: 'pilar3'
      },
      {
        step: 8,
        short: 'TECO & Reset',
        desc: 'Counter reset siklus berikutnya',
        tcode: 'IW32 (TECO)',
        nodeRole: '👔 Maskep Pabrik',
        statusSap: 'TECO',
        statusLabel: 'Cycle Reset',
        output: 'Siklus Berikutnya',
        tone: 'teal',
        title: 'TECO & Reset Counter Siklus (Cycle Reset)',
        role: '👔 Masinis Kepala Pabrik',
        statusLong: 'TECO (Cycle Reset)',
        image: '/images/cancel_teco/step_1.png',
        imageCaption: 'Penutupan Teknis & Aktivasi Siklus Berikutnya',
        sla: '< 24 Jam setelah mesin diserahkan',
        inputs: [
          'Pemeriksaan hasil servis & uji jalan mesin',
          'Seluruh administrasi part dan jam selesai'
        ],
        outputs: [
          'Status order PM02 menjadi TECO',
          'Counter siklus berikutnya otomatis aktif menghitung'
        ],
        sop: [
          'Order TECO mereset counter untuk siklus servis selanjutnya.',
          'Wajib selesai sebelum tutup buku bulanan akuntansi.'
        ],
        targetKey: 'iw32',
        targetPilar: 'pilar3'
      }
    ]
  },

  logbook: {
    key: 'logbook',
    tone: 'teal',
    icon: 'sheet',
    banner: 'Jalur Transaksi: Logbook Traksi Kendaraan Regional 5',
    metaBadge: 'Kolektif Excel VRA',
    title: 'Alur Upload Massal Jam Operasi & Biaya Traksi',
    subtitle:
      'Siklus unggah data ratusan kendaraan dari template Excel VRA hingga pelaporan WA otomatis harian.',
    legend: [
      { label: '✍️ Kerani Unit', tone: 'amber' },
      { label: '💻 Operator Traksi', tone: 'blue' },
      { label: '💰 KTU / Keuangan', tone: 'purple' },
      { label: '📱 Cron WhatsApp', tone: 'emerald' }
    ],
    trackGradient:
      'from-amber-400 via-blue-400 via-teal-400 via-indigo-400 via-purple-400 to-emerald-500',
    stations: [
      {
        step: 1,
        short: 'Pengisian Excel VRA',
        desc: 'Input template jam jalan & BBM',
        tcode: 'EXCEL VRA',
        nodeRole: '✍️ Kerani Traksi',
        statusSap: 'RAW',
        statusLabel: 'Prepared',
        output: 'File VRA Siap',
        tone: 'amber',
        title: 'Pengisian Spreadsheet Excel VRA (Logbook Input)',
        role: '✍️ Kerani Traksi / Unit Kebun',
        statusLong: 'RAW (Data Prepared)',
        image: '/images/zesthlc003pa/step_1.png',
        imageCaption: 'Template Standar Excel VRA Logbook Traksi Regional 5',
        sla: 'Harian (Maks. jam 08:30 WIB)',
        inputs: [
          'Data jam kerja kendaraan operasional harian',
          'Konsumsi BBM solar (Liter) & pengisian kupon',
          'Angka odometer KM / HM awal & akhir'
        ],
        outputs: [
          'File Spreadsheet Excel VRA terisi lengkap',
          'Data siap diunggah massal ke sistem SAP'
        ],
        sop: [
          'Gunakan format template resmi Regional 5 tanpa edit kolom.',
          'Pastikan tidak ada baris tanggal yang terlewat.',
          'Validasi total solar sesuai fisik tangki solar unit.'
        ],
        targetKey: 'zesthlc003pa',
        targetPilar: 'pilar3'
      },
      {
        step: 2,
        short: 'Upload Massal',
        desc: 'Unggah file via ZESTHLC003PA',
        tcode: 'ZESTHLC003PA',
        nodeRole: '💻 Operator Traksi',
        statusSap: 'UPLD',
        statusLabel: 'Buffer',
        output: 'Buffer Data',
        tone: 'blue',
        title: 'Upload Massal Spreadsheet (Data Upload)',
        role: '💻 Operator Traksi Unit',
        statusLong: 'UPLD (Buffer Uploaded)',
        image: '/images/zesthlc003pa/step_2.png',
        imageCaption: 'Pemilihan File & Upload via Transaksi ZESTHLC003PA',
        sla: '< 15 Menit setelah file Excel siap',
        inputs: [
          'File Excel VRA yang telah divalidasi',
          'Kode Plant Unit Kebun / PKS (5E01 / 5F01)'
        ],
        outputs: [
          'Data buffer tersimpan sementara di SAP',
          'Tabel pratinjau verifikasi baris terbuka otomatis'
        ],
        sop: [
          'Tutup file di Microsoft Excel sebelum menekan tombol upload.',
          'Periksa koneksi jaringan server SAP stabil.',
          'Pastikan periode bulan transaksi masih berstatus Open.'
        ],
        targetKey: 'zesthlc003pa',
        targetPilar: 'pilar3'
      },
      {
        step: 3,
        short: 'Validasi Baris',
        desc: 'Pastikan status baris HIJAU',
        tcode: 'STATUS HIJAU',
        nodeRole: '🟢 Sistem SAP',
        statusSap: 'VALID',
        statusLabel: 'Zero Error',
        output: '0 Baris Error',
        tone: 'teal',
        title: 'Validasi Baris Hijau (Row Validation)',
        role: '🟢 Sistem SAP Terintegrasi',
        statusLong: 'VALID (Zero Error)',
        image: '/images/zesthlc003pa/step_3.png',
        imageCaption: 'Verifikasi Semua Baris Berstatus Hijau Bebas Error',
        sla: 'Langsung setelah proses upload',
        inputs: [
          'Tabel hasil parsing upload massal',
          'Validasi kecocokan nomor polisi kendaraan & Cost Center'
        ],
        outputs: [
          'Lampu indikator hijau pada seluruh baris data',
          'Nol baris merah (100% siap posting)'
        ],
        sop: [
          'Jika terdapat baris merah, klik untuk melihat pesan error spesifik.',
          'Dilarang melanjutkan posting jika masih terdapat baris merah.',
          'Perbaiki data master equipment jika nomor unit tidak dikenali.'
        ],
        targetKey: 'zesthlc003pa',
        targetPilar: 'pilar3'
      },
      {
        step: 4,
        short: 'Posting Logbook',
        desc: 'Post Activity & Meas Point',
        tcode: 'ZESTHLP16PA',
        nodeRole: '🚀 Kerani Unit',
        statusSap: 'POST',
        statusLabel: 'Posted',
        output: 'Doc Posted',
        tone: 'emerald',
        title: 'Posting Logbook Kolektif (Posting Activity)',
        role: '🚀 Kerani Unit Traksi',
        statusLong: 'POST (Posted)',
        image: '/images/zesthlp16pa/step_1.png',
        imageCaption: 'Eksekusi Tombol Post Activity Logbook di SAP',
        sla: 'Maks. jam 10:00 WIB setiap hari',
        inputs: [
          'Kumpulan baris data valid berstatus hijau',
          'Konfirmasi nomor batch transaksi'
        ],
        outputs: [
          'Dokumen logbook resmi terposting di SAP',
          'Nomor dokumen transaksi diterbitkan sistem'
        ],
        sop: [
          'Klik tombol Simpan / Post hanya satu kali untuk mencegah duplikasi.',
          'Simpan nomor dokumen batch posting untuk arsip unit.',
          'Laporkan ke Asisten jika terjadi kendala timeout posting.'
        ],
        targetKey: 'zesthlp16pa',
        targetPilar: 'pilar3'
      },
      {
        step: 5,
        short: 'Odometer Sync',
        desc: 'Counter KM/HM tersimpan di IK11',
        tcode: 'IK11 / ODO',
        nodeRole: '⏱️ Pengawas Traksi',
        statusSap: 'SYNC',
        statusLabel: 'Synced',
        output: 'HM/KM Tersimpan',
        tone: 'indigo',
        title: 'Sinkronisasi Odometer KM/HM (Counter Sync)',
        role: '⏱️ Pengawas Traksi Unit',
        statusLong: 'SYNC (Odometer Synced)',
        image: '/images/ik11/step_1.png',
        imageCaption: 'Pengecekan Nilai Odometer Ter-update di IK11',
        sla: 'Otomatis pasca-posting logbook',
        inputs: ['Nilai KM/HM akhir dari dokumen posting logbook'],
        outputs: [
          'Measuring Point kendaraan di SAP ter-update otomatis',
          'Riwayat jarak tempuh kumulatif tercatat'
        ],
        sop: [
          'Periksa konsistensi angka odometer, tidak boleh mundur dari hari kemarin.',
          'Nilai odometer menjadi acuan jadwal servis berkala PM02.',
          'Jika terjadi rollover meteran, sesuaikan parameter counter.'
        ],
        targetKey: 'ik11',
        targetPilar: 'pilar2'
      },
      {
        step: 6,
        short: 'Ekspor Rekap',
        desc: 'Tarik laporan utilitas armada',
        tcode: 'EXCEL EXPORT',
        nodeRole: '📊 Asisten Traksi',
        statusSap: 'REPT',
        statusLabel: 'Report Ready',
        output: 'Laporan XLS',
        tone: 'cyan',
        title: 'Ekspor Rekap Utilitas Armada (Spreadsheet Export)',
        role: '📊 Asisten Traksi',
        statusLong: 'REPT (Report Ready)',
        image: '/images/zesthlp16pa/step_4.png',
        imageCaption: 'Ekspor Laporan Monitoring Utilitas & Konsumsi Solar',
        sla: 'Harian & Mingguan',
        inputs: ['Periode tanggal laporan & filter kode unit traksi'],
        outputs: [
          'File spreadsheet monitoring efisiensi traksi',
          'Data rasio konsumsi BBM (Ltr/KM atau Ltr/HM)'
        ],
        sop: [
          'Analisis rasio efisiensi pemakaian solar per jam jalan.',
          'Identifikasi unit kendaraan dengan utilitas rendah (< 4 Jam/hari).',
          'Gunakan data rekap untuk evaluasi kesiapan armada panen.'
        ],
        targetKey: 'zesthlp16pa',
        targetPilar: 'pilar3'
      },
      {
        step: 7,
        short: 'Monitoring Biaya',
        desc: 'Cek Total Cost di Cost Center',
        tcode: 'ZCO_CCTR_01',
        nodeRole: '💰 KTU / Keuangan',
        statusSap: 'COST',
        statusLabel: 'Verified',
        output: 'Biaya Terkontrol',
        tone: 'purple',
        title: 'Monitoring Biaya Unit & Cost Center (Cost Control)',
        role: '💰 KTU / Keuangan Kebun',
        statusLong: 'COST (Cost Verified)',
        image: '/images/zco_cctr_01/step_1.png',
        imageCaption: 'Pemeriksaan Beban Biaya Cost Center di ZCO',
        sla: 'Mingguan & Tutup Buku Bulanan',
        inputs: [
          'Cost Center unit traksi (Afdeling / PKS)',
          'Akun beban biaya solar, oli, dan pemeliharaan'
        ],
        outputs: [
          'Laporan realisasi anggaran operasional traksi',
          'Verifikasi tidak ada salah pembebanan Cost Center'
        ],
        sop: [
          'Cocokkan total biaya SAP dengan pembukuan kas bank kebun.',
          'Telusuri jika terjadi lonjakan biaya pada unit tertentu.',
          'Wajib clear sebelum tutup buku akuntansi bulanan.'
        ],
        targetKey: 'zco_cctr_01',
        targetPilar: 'pilar3'
      },
      {
        step: 8,
        short: 'Rekap WA Otomatis',
        desc: 'Jadwal 08:00 WIB ke Grup Unit',
        tcode: 'CRON WA',
        nodeRole: '📱 Bot Otomatis',
        statusSap: 'NOTIF',
        statusLabel: 'Delivered',
        output: 'WA Delivered',
        tone: 'emerald',
        title: 'Pengiriman Rekap WhatsApp Otomatis (Cron Notification)',
        role: '📱 Bot Otomatis Regional 5',
        statusLong: 'NOTIF (Delivered)',
        image: '/images/zesthlp16pa/step_8.png',
        imageCaption: 'Laporan Ringkasan Terkirim ke WhatsApp Manajemen',
        sla: 'Setiap hari jam 08:00 WIB',
        inputs: ['Rekapitulasi data upload harian seluruh unit kebun/PKS'],
        outputs: [
          'Pesan ringkasan terkirim otomatis ke WhatsApp Group Manajemen',
          'Daftar unit yang belum upload terlaporkan otomatis'
        ],
        sop: [
          'Manajemen menerima rekap langsung tanpa perlu login web/SAP.',
          'Unit yang terlambat upload otomatis mendapat reminder.',
          'Bot beroperasi otonom di server background cloud 24/7.'
        ],
        targetKey: 'zesthlp16pa',
        targetPilar: 'pilar3'
      }
    ]
  }
};

// ── Presentation tokens ───────────────────────────────────────────────────
// Tailwind can only see literal class strings, so every tone is expanded here.

export const TONE = {
  amber: {
    nodeBg: 'bg-amber-500 text-white ring-amber-100',
    cardBorder: 'border-amber-300 hover:border-amber-500 hover:shadow-amber-100/60',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    longBadge: 'bg-amber-100 text-amber-900 border-amber-300',
    pill: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'group-hover:text-amber-700',
    chip: 'group-hover:bg-amber-50 group-hover:text-amber-800 group-hover:border-amber-200',
    dot: 'bg-amber-500',
    ring: 'ring-amber-500',
    selectedBg: 'bg-amber-50/25',
    softBg: 'bg-amber-50',
    accentText: 'text-amber-700',
    accentBorder: 'border-amber-200',
    gradFrom: 'from-amber-500',
    gradTo: 'to-amber-600'
  },
  blue: {
    nodeBg: 'bg-blue-500 text-white ring-blue-100',
    cardBorder: 'border-blue-300 hover:border-blue-500 hover:shadow-blue-100/60',
    badge: 'bg-blue-50 text-blue-800 border-blue-200',
    longBadge: 'bg-blue-100 text-blue-900 border-blue-300',
    pill: 'bg-blue-50 text-blue-800 border-blue-200',
    text: 'group-hover:text-blue-700',
    chip: 'group-hover:bg-blue-50 group-hover:text-blue-800 group-hover:border-blue-200',
    dot: 'bg-blue-500',
    ring: 'ring-blue-500',
    selectedBg: 'bg-blue-50/25',
    softBg: 'bg-blue-50',
    accentText: 'text-blue-700',
    accentBorder: 'border-blue-200',
    gradFrom: 'from-blue-500',
    gradTo: 'to-blue-600'
  },
  indigo: {
    nodeBg: 'bg-indigo-500 text-white ring-indigo-100',
    cardBorder: 'border-indigo-300 hover:border-indigo-500 hover:shadow-indigo-100/60',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    longBadge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    pill: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    text: 'group-hover:text-indigo-700',
    chip: 'group-hover:bg-indigo-50 group-hover:text-indigo-800 group-hover:border-indigo-200',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-500',
    selectedBg: 'bg-indigo-50/25',
    softBg: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    accentBorder: 'border-indigo-200',
    gradFrom: 'from-indigo-500',
    gradTo: 'to-indigo-600'
  },
  purple: {
    nodeBg: 'bg-purple-500 text-white ring-purple-100',
    cardBorder: 'border-purple-300 hover:border-purple-500 hover:shadow-purple-100/60',
    badge: 'bg-purple-50 text-purple-800 border-purple-200',
    longBadge: 'bg-purple-100 text-purple-900 border-purple-300',
    pill: 'bg-purple-50 text-purple-800 border-purple-200',
    text: 'group-hover:text-purple-700',
    chip: 'group-hover:bg-purple-50 group-hover:text-purple-800 group-hover:border-purple-200',
    dot: 'bg-purple-500',
    ring: 'ring-purple-500',
    selectedBg: 'bg-purple-50/25',
    softBg: 'bg-purple-50',
    accentText: 'text-purple-700',
    accentBorder: 'border-purple-200',
    gradFrom: 'from-purple-500',
    gradTo: 'to-purple-600'
  },
  violet: {
    nodeBg: 'bg-violet-500 text-white ring-violet-100',
    cardBorder: 'border-violet-300 hover:border-violet-500 hover:shadow-violet-100/60',
    badge: 'bg-violet-50 text-violet-800 border-violet-200',
    longBadge: 'bg-violet-100 text-violet-900 border-violet-300',
    pill: 'bg-violet-50 text-violet-800 border-violet-200',
    text: 'group-hover:text-violet-700',
    chip: 'group-hover:bg-violet-50 group-hover:text-violet-800 group-hover:border-violet-200',
    dot: 'bg-violet-500',
    ring: 'ring-violet-500',
    selectedBg: 'bg-violet-50/25',
    softBg: 'bg-violet-50',
    accentText: 'text-violet-700',
    accentBorder: 'border-violet-200',
    gradFrom: 'from-violet-500',
    gradTo: 'to-violet-600'
  },
  cyan: {
    nodeBg: 'bg-cyan-500 text-white ring-cyan-100',
    cardBorder: 'border-cyan-300 hover:border-cyan-500 hover:shadow-cyan-100/60',
    badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    longBadge: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    pill: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    text: 'group-hover:text-cyan-700',
    chip: 'group-hover:bg-cyan-50 group-hover:text-cyan-800 group-hover:border-cyan-200',
    dot: 'bg-cyan-500',
    ring: 'ring-cyan-500',
    selectedBg: 'bg-cyan-50/25',
    softBg: 'bg-cyan-50',
    accentText: 'text-cyan-700',
    accentBorder: 'border-cyan-200',
    gradFrom: 'from-cyan-500',
    gradTo: 'to-cyan-600'
  },
  teal: {
    nodeBg: 'bg-teal-600 text-white ring-teal-100',
    cardBorder: 'border-teal-300 hover:border-teal-500 hover:shadow-teal-100/60',
    badge: 'bg-teal-50 text-teal-800 border-teal-200',
    longBadge: 'bg-teal-100 text-teal-950 border-teal-300',
    pill: 'bg-teal-50 text-teal-800 border-teal-200',
    text: 'group-hover:text-teal-700',
    chip: 'group-hover:bg-teal-50 group-hover:text-teal-800 group-hover:border-teal-200',
    dot: 'bg-teal-600',
    ring: 'ring-teal-500',
    selectedBg: 'bg-teal-50/25',
    softBg: 'bg-teal-50',
    accentText: 'text-teal-700',
    accentBorder: 'border-teal-200',
    gradFrom: 'from-teal-500',
    gradTo: 'to-teal-600'
  },
  emerald: {
    nodeBg: 'bg-emerald-600 text-white ring-emerald-100',
    cardBorder: 'border-emerald-300 hover:border-emerald-500 hover:shadow-emerald-100/60',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    longBadge: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    text: 'group-hover:text-emerald-700',
    chip: 'group-hover:bg-emerald-50 group-hover:text-emerald-800 group-hover:border-emerald-200',
    dot: 'bg-emerald-600',
    ring: 'ring-emerald-500',
    selectedBg: 'bg-emerald-50/25',
    softBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-200',
    gradFrom: 'from-emerald-500',
    gradTo: 'to-emerald-600'
  },
  rose: {
    nodeBg: 'bg-rose-500 text-white ring-rose-100',
    cardBorder: 'border-rose-300 hover:border-rose-500 hover:shadow-rose-100/60',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    longBadge: 'bg-rose-100 text-rose-900 border-rose-300',
    pill: 'bg-rose-50 text-rose-800 border-rose-200',
    text: 'group-hover:text-rose-700',
    chip: 'group-hover:bg-rose-50 group-hover:text-rose-800 group-hover:border-rose-200',
    dot: 'bg-rose-500',
    ring: 'ring-rose-500',
    selectedBg: 'bg-rose-50/25',
    softBg: 'bg-rose-50',
    accentText: 'text-rose-700',
    accentBorder: 'border-rose-200',
    gradFrom: 'from-rose-500',
    gradTo: 'to-rose-600'
  }
};
