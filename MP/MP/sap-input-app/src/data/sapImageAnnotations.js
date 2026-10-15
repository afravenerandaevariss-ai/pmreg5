/**
 * SAP Image Annotations Registry (Calibrated & Verified)
 * -----------------------------------------------------------------------------
 * Anotasi kotak penanda merah untuk tangkapan layar SAP GUI pada segmen
 * "Panduan T-Code SAP PM".
 *
 * Koordinat ditentukan dengan mengukur gambar, bukan diperkirakan:
 *   1. Kotak merah yang sudah tercetak pada tangkapan layar asli (hasil render
 *      PDF SOP PTPN) dideteksi per piksel dan dipakai sebagai acuan utama.
 *   2. Elemen tanpa kotak tercetak dilokalisasi dengan membaca gambar + grid
 *      persen, lalu diverifikasi berulang pada gambar yang digambar ulang.
 *   3. Kotak yang elemennya tidak ada di gambar dihapus, bukan ditebak.
 *
 * Struktur per gambar: array { box, label }.
 *   box   : { x, y, w, h } dalam persen ukuran gambar asli
 *   label : { text, side }  side = preferensi sisi kotak keterangan
 *
 * Posisi kotak keterangan dan panah TIDAK ditulis manual: keduanya dihitung
 * oleh buildAnnotationLayout(), yang juga menjamin keterangan selalu berada
 * di dalam area gambar dan panah selalu menempel pada tepi kotak target.
 */

export const sapImageAnnotations = {
  "/images/il01/step_1.png": [
    {
      box: { x: 7.4, y: 1.4, w: 26.2, h: 4.7 },
      label: { text: "Ketik T-Code IL01 di kolom command", side: 'right' }
    },
    {
      box: { x: 19.6, y: 80.8, w: 22.1, h: 4.2 },
      label: { text: "Pilih menu IL01 - Create", side: 'right' }
    },
  ],
  "/images/il01/step_2.png": [
    {
      box: { x: 1.3, y: 9.2, w: 6.3, h: 8.9 },
      label: { text: "Klik tombol Enter", side: 'right' }
    },
    {
      box: { x: 21, y: 56, w: 55, h: 11.1 },
      label: { text: "Ketik Functional Loc: N011-KP05-GD01-ST01", side: 'right' }
    },
  ],
  "/images/il01/step_3.png": [
    {
      box: { x: 19.6, y: 19.7, w: 17.8, h: 5.5 },
      label: { text: "Ketik Deskripsi: ST. GILINGAN", side: 'right' }
    },
    {
      box: { x: 4.3, y: 33.2, w: 12.2, h: 6.1 },
      label: { text: "Klik tab General", side: 'right' }
    },
    {
      box: { x: 20.6, y: 46.1, w: 8.2, h: 6.8 },
      label: { text: "Isi kolom MaintPlant dengan KP05", side: 'right' }
    },
    {
      box: { x: 21.2, y: 87.3, w: 12, h: 5.3 },
      label: { text: "Isi Planner Group K02", side: 'right' }
    },
  ],
  "/images/il01/step_4.png": [
    {
      box: { x: 38.6, y: 1.2, w: 2.6, h: 4.3 },
      label: { text: "Klik ikon Save", side: 'right' }
    },
    {
      box: { x: 19.8, y: 92.6, w: 20.6, h: 4.2 },
      label: { text: "Klik menu IL03 - Display", side: 'right' }
    },
  ],
  "/images/il01/step_5.png": [
    {
      box: { x: 6.3, y: 0.8, w: 20.7, h: 4.5 },
      label: { text: "Ketik IH06 pada Command Field", side: 'right' }
    },
    {
      box: { x: 19.1, y: 93.1, w: 17.9, h: 3.7 },
      label: { text: "Pilih IH06 - Display", side: 'right' }
    },
  ],
  "/images/ie01/step_1.png": [
    {
      box: { x: 17.6, y: 91.4, w: 28.8, h: 4.4 },
      label: { text: "Pilih menu IE01 - Create (General)", side: 'right' }
    },
    {
      box: { x: 1.1, y: 2.3, w: 4.1, h: 5 },
      label: { text: "Klik tombol Enter", side: 'right' }
    },
  ],
  "/images/ie01/step_2.png": [
    {
      box: { x: 28.5, y: 87, w: 52.2, h: 5.4 },
      label: { text: "Ketik pada kolom Material", side: 'left' }
    },
  ],
  "/images/ie01/step_3.png": [
    {
      box: { x: 29.8, y: 30.1, w: 15.4, h: 5.4 },
      label: { text: "Klik tab Organization", side: 'right' }
    },
    {
      box: { x: 5.2, y: 28.7, w: 11.5, h: 6.8 },
      label: { text: "Klik tab General", side: 'right' }
    },
  ],
  "/images/ie01/step_4.png": [
    {
      box: { x: 0.7, y: 1.2, w: 5.9, h: 7.3 },
      label: { text: "Klik tombol Enter", side: 'right' }
    },
    {
      box: { x: 27.2, y: 54.8, w: 16.8, h: 5.2 },
      label: { text: "Isi Valid On: 01.01.2016", side: 'right' }
    },
    {
      box: { x: 27.7, y: 61, w: 16, h: 7 },
      label: { text: "Ketik Equipment category: 2", side: 'right' }
    },
  ],
  "/images/ib01/step_1.png": [
    {
      box: { x: 6.2, y: 1.2, w: 21.8, h: 4 },
      label: { text: "Ketik T-Code IB01", side: 'right' }
    },
    {
      box: { x: 20.5, y: 91.3, w: 18.1, h: 3.6 },
      label: { text: "Klik IB01 - Create", side: 'right' }
    },
  ],
  "/images/ib01/step_2.png": [
    {
      box: { x: 20.4, y: 91.1, w: 19.8, h: 3.1 },
      label: { text: "Pilih menu IB02 - Change", side: 'right' }
    },
  ],
  "/images/ib01/step_3.png": [
    {
      box: { x: 20.5, y: 93, w: 23.3, h: 4.1 },
      label: { text: "Pilih menu IB03 - Display", side: 'right' }
    },
  ],
  "/images/ib01/step_4.png": [
    {
      box: { x: 10.5, y: 14.1, w: 4, h: 4.4 },
      label: { text: "Klik ikon Copy", side: 'right' }
    },
  ],
  "/images/ir01/step_1.png": [
    {
      box: { x: 34, y: 90.8, w: 25.8, h: 3.6 },
      label: { text: "Klik menu IR01 - Create", side: 'right' }
    },
  ],
  "/images/ir01/step_2.png": [
    {
      box: { x: 33.5, y: 90.4, w: 22.6, h: 3.5 },
      label: { text: "Klik menu IR02 - Change", side: 'right' }
    },
  ],
  "/images/ir01/step_3.png": [
    {
      box: { x: 26.7, y: 93.3, w: 20, h: 3.8 },
      label: { text: "Klik menu IR03 - Display", side: 'right' }
    },
  ],
  "/images/ir01/step_4.png": [
    {
      box: { x: 25.7, y: 93.4, w: 26.6, h: 3.5 },
      label: { text: "Pilih CR05 - Work Center List", side: 'right' }
    },
  ],
  "/images/ik01/step_1.png": [
    {
      box: { x: 70.7, y: 12.7, w: 21.4, h: 3.8 },
      label: { text: "Klik tombol Assign users", side: 'left' }
    },
    {
      box: { x: 22.7, y: 87.1, w: 15.3, h: 4 },
      label: { text: "Klik menu IK01 - Create", side: 'right' }
    },
  ],
  "/images/ik01/step_2.png": [
    {
      box: { x: 4, y: 81, w: 60, h: 10.5 },
      label: { text: "Pilih 2000000193 TRAKTOR - AE1111K", side: 'right' }
    },
  ],
  "/images/ik01/step_3.png": [
    {
      box: { x: 21.6, y: 47.8, w: 37.5, h: 4 },
      label: { text: "Ketik ZPM_HOURMETER pada kolom Characteristic", side: 'right' }
    },
    {
      box: { x: 40.1, y: 88.5, w: 9.4, h: 4.6 },
      label: { text: "Ketik Annual Estimate: 4380,00", side: 'right' }
    },
  ],
  "/images/ik01/step_4.png": [
    {
      box: { x: 30.2, y: 92.2, w: 25.1, h: 3.7 },
      label: { text: "Pilih menu IK02 - Change", side: 'right' }
    },
  ],
  "/images/qs41/step_1.png": [
    {
      box: { x: 23, y: 95, w: 16.5, h: 4.2 },
      label: { text: "Klik QS41 - Edit", side: 'right' }
    },
  ],
  "/images/qs41/step_2.png": [
    {
      box: { x: 56.7, y: 14.1, w: 12, h: 7.3 },
      label: { text: "Klik tombol Long Text", side: 'left' }
    },
    {
      box: { x: 29.8, y: 60, w: 57.5, h: 11.6 },
      label: { text: "Pilih baris ZPMCAUSE PTPN General Cause", side: 'left' }
    },
  ],
  "/images/qs41/step_3.png": [
    {
      box: { x: 42.4, y: 12.7, w: 3.1, h: 2.4 },
      label: { text: "Klik tombol Add to Favorites", side: 'right' }
    },
  ],
  "/images/ia01/step_1.png": [
    {
      box: { x: 23.7, y: 84.7, w: 21.8, h: 3.7 },
      label: { text: "Klik menu IA05 - Create", side: 'right' }
    },
  ],
  "/images/ia01/step_2.png": [
    {
      box: { x: 38.3, y: 30.9, w: 23.3, h: 12.7 },
      label: { text: "Isi Work Center: TRAKTOR", side: 'right' }
    },
    {
      box: { x: 40.3, y: 80.5, w: 30, h: 12.3 },
      label: { text: "Isi Key date: 01.01.2016", side: 'left' }
    },
  ],
  "/images/ia01/step_3.png": [
    {
      box: { x: 19.6, y: 6, w: 15.6, h: 5.3 },
      label: { text: "Klik tombol Operation", side: 'right' }
    },
    {
      box: { x: 27.5, y: 35.1, w: 48.7, h: 4.1 },
      label: { text: "Ketik tahapan perbaikan pada kolom External ID", side: 'left' }
    },
  ],
  "/images/ia01/step_4.png": [
    {
      box: { x: 23.3, y: 88.4, w: 20.3, h: 3.5 },
      label: { text: "Klik menu IA06 - Change", side: 'right' }
    },
  ],
  "/images/ip01/step_1.png": [
    {
      box: { x: 22.4, y: 83.5, w: 27.1, h: 4.2 },
      label: { text: "Klik IP41 - Single Cycle Plan", side: 'right' }
    },
  ],
  "/images/ip01/step_2.png": [
    {
      box: { x: 22, y: 73.5, w: 25.2, h: 3.6 },
      label: { text: "Klik IP42 - Strategy Plan", side: 'right' }
    },
  ],
  "/images/ip01/step_3.png": [
    {
      box: { x: 22.5, y: 78, w: 29.1, h: 4.5 },
      label: { text: "Pilih IP43 - Multiple Counter Plan", side: 'right' }
    },
  ],
  "/images/ip01/step_4.png": [
    {
      box: { x: 18.1, y: 76.7, w: 22.5, h: 3.6 },
      label: { text: "Pilih IP03 - Display", side: 'right' }
    },
  ],
  "/images/ip30/step_1.png": [
    {
      box: { x: 18.5, y: 77, w: 22.3, h: 4.1 },
      label: { text: "Klik menu IP10 - Schedule", side: 'right' }
    },
  ],
  "/images/ip30/step_2.png": [
    {
      box: { x: 17.8, y: 81.3, w: 30.6, h: 5 },
      label: { text: "Pilih IP30 - Deadline Monitoring", side: 'right' }
    },
  ],
  "/images/ip30/step_3.png": [
    {
      box: { x: 21.9, y: 90.3, w: 20.6, h: 3.6 },
      label: { text: "Klik IP24 - List Display", side: 'right' }
    },
  ],
  "/images/ip30/step_4.png": [
    {
      box: { x: 22.7, y: 87.3, w: 44, h: 4.1 },
      label: { text: "Klik IP19 - Scheduling Overview and Simulation", side: 'right' }
    },
  ],
  "/images/ik11/step_1.png": [
    {
      box: { x: 23.1, y: 94.1, w: 15.5, h: 4.1 },
      label: { text: "Pilih menu IK11 - Create", side: 'right' }
    },
  ],
  "/images/ik11/step_2.png": [
    {
      box: { x: 1.4, y: 14.4, w: 5.7, h: 9.5 },
      label: { text: "Klik tombol Expand/Collapse Header", side: 'right' }
    },
    {
      box: { x: 26.1, y: 46.1, w: 25.5, h: 11.1 },
      label: { text: "Ketik Measuring point 100000000202", side: 'right' }
    },
  ],
  "/images/ik11/step_3.png": [
    {
      box: { x: 20.3, y: 61.1, w: 31, h: 5.5 },
      label: { text: "Periksa nilai Difference: 12", side: 'right' }
    },
  ],
  "/images/ik11/step_4.png": [
    {
      box: { x: 37.6, y: 0.8, w: 4.1, h: 4.5 },
      label: { text: "Klik tombol Save", side: 'right' }
    },
  ],
  "/images/iw21/step_1.png": [
    {
      box: { x: 23.1, y: 85.2, w: 35, h: 4.7 },
      label: { text: "Klik IW21 - Create (General)", side: 'right' }
    },
  ],
  "/images/iw21/step_2.png": [
    {
      box: { x: 47.8, y: 49.8, w: 5.6, h: 5.8 },
      label: { text: "Ketik Notification type: M1", side: 'left' }
    },
  ],
  "/images/iw21/step_3.png": [
    {
      box: { x: 47.6, y: 76.4, w: 12.5, h: 2 },
      label: { text: "Centang kotak Breakdown", side: 'left' }
    },
    {
      box: { x: 38.4, y: 24.3, w: 17.1, h: 2.9 },
      label: { text: "Klik tab Location data", side: 'right' }
    },
  ],
  "/images/iw21/step_4.png": [
    {
      box: { x: 51.5, y: 14.1, w: 4.1, h: 7.3 },
      label: { text: "Klik tombol Subtotal", side: 'left' }
    },
    {
      box: { x: 27.6, y: 14.1, w: 4.1, h: 7.3 },
      label: { text: "Klik tombol Order", side: 'right' }
    },
  ],
  "/images/iw31/step_1.png": [
    {
      box: { x: 14.1, y: 29.8, w: 5.2, h: 4.4 },
      label: { text: "Isi Order Type dengan PM01", side: 'right' }
    },
    {
      box: { x: 14.1, y: 39.6, w: 23, h: 5.8 },
      label: { text: "Isi kolom Func. Loc.", side: 'right' }
    },
  ],
  "/images/iw31/step_2.png": [
    {
      box: { x: 27.7, y: 10.8, w: 37, h: 4.2 },
      label: { text: "Ketik judul pekerjaan di kolom deskripsi", side: 'right' }
    },
    {
      box: { x: 54.7, y: 32.4, w: 4.8, h: 3.1 },
      label: { text: "Isi PM Activity Type: RPL", side: 'left' }
    },
    {
      box: { x: 10.8, y: 74, w: 22.7, h: 4.2 },
      label: { text: "Isi tanggal dan jam selesai breakdown", side: 'right' }
    },
  ],
  "/images/iw31/step_3.png": [
    {
      box: { x: 14.2, y: 18.2, w: 10.6, h: 2.1 },
      label: { text: "Klik tab Operations", side: 'right' }
    },
    {
      box: { x: 12.1, y: 30.1, w: 7.7, h: 2.5 },
      label: { text: "Ketik Work Center: TEK-WSH", side: 'right' }
    },
  ],
  "/images/iw31/step_4.png": [
    {
      box: { x: 32.4, y: 52.9, w: 4.6, h: 7.9 },
      label: { text: "Ketik kode Damage F100", side: 'right' }
    },
    {
      box: { x: 36.4, y: 15.1, w: 51.6, h: 7.4 },
      label: { text: "Periksa Notification short text", side: 'left' }
    },
  ],
  "/images/iw31/step_5.png": [
    {
      box: { x: 21.6, y: 20.6, w: 2.4, h: 6.3 },
      label: { text: "Klik ikon Settlement Rule", side: 'right' }
    },
    {
      box: { x: 84.3, y: 78, w: 3.8, h: 6.7 },
      label: { text: "Isi kolom Stor dengan 0001", side: 'left' }
    },
  ],
  "/images/iw31/step_6.png": [
    {
      box: { x: 60.3, y: 26.4, w: 4.7, h: 5.2 },
      label: { text: "Klik ikon Check", side: 'left' }
    },
    {
      box: { x: 3.4, y: 95.9, w: 3.2, h: 1.9 },
      label: { text: "Periksa nomor item 0140", side: 'right' }
    },
  ],
  "/images/iw32/step_1.png": [
    {
      box: { x: 39.1, y: 67.6, w: 33.8, h: 13 },
      label: { text: "Ketik nomor Order 200000757404", side: 'left' }
    },
  ],
  "/images/iw32/step_5.png": [
    {
      box: { x: 22.9, y: 50.7, w: 2.3, h: 3.4 },
      label: { text: "Periksa status order menjadi TECO", side: 'right' }
    },
  ],
  "/images/migo/step_1.png": [
    {
      box: { x: 11.2, y: 9.3, w: 10.6, h: 4.7 },
      label: { text: "Pilih A07 Goods Issue", side: 'right' }
    },
    {
      box: { x: 22.1, y: 9.3, w: 10.3, h: 4.7 },
      label: { text: "Pilih R09 Reservation", side: 'right' }
    },
    {
      box: { x: 32.9, y: 9.3, w: 7.1, h: 4.7 },
      label: { text: "Ketik Nomor Reservasi: 13072640", side: 'right' }
    },
  ],
  "/images/migo/step_2.png": [
    {
      box: { x: 19.3, y: 62.3, w: 5.7, h: 4.3 },
      label: { text: "Klik tab Quantity", side: 'right' }
    },
  ],
  "/images/migo/step_3.png": [
    {
      box: { x: 16.6, y: 96.9, w: 3.8, h: 2.2 },
      label: { text: "Centang kotak Item OK", side: 'right' }
    },
    {
      box: { x: 27.8, y: 4.8, w: 3.3, h: 2.6 },
      label: { text: "Klik tombol Post", side: 'right' }
    },
  ],
  "/images/iw38/step_1.png": [
    {
      box: { x: 6.5, y: 9.6, w: 26.8, h: 20.7 },
      label: { text: "Ketik T-Code IW38", side: 'right' }
    },
  ],
  "/images/iw38/step_2.png": [
    {
      box: { x: 1.5, y: 27.7, w: 46.9, h: 8.5 },
      label: { text: "Centang pilihan Order status", side: 'right' }
    },
    {
      box: { x: 1.4, y: 78.5, w: 63.1, h: 5.5 },
      label: { text: "Isi rentang tanggal Period", side: 'right' }
    },
  ],
  "/images/iw38/step_3.png": [
    {
      box: { x: 2.5, y: 18.3, w: 36.1, h: 2.4 },
      label: { text: "Isi Maintenance Plant dengan 5*", side: 'right' }
    },
    {
      box: { x: 2.1, y: 93.5, w: 43.3, h: 3.1 },
      label: { text: "Ketik Layout: /EUT IW38", side: 'right' }
    },
  ],
  "/images/iw38/step_4.png": [
    {
      box: { x: 1.3, y: 17, w: 4.3, h: 6.6 },
      label: { text: "Klik ikon Execute (F8)", side: 'right' }
    },
  ],
  "/images/iw38/step_5.png": [
    {
      box: { x: 29.3, y: 50.1, w: 9.3, h: 5.8 },
      label: { text: "Klik dua kali nomor order 200000760689", side: 'right' }
    },
  ],
  "/images/iw39/step_1.png": [
    {
      box: { x: 7.6, y: 9, w: 17.4, h: 13.5 },
      label: { text: "Ketik T-Code IW39", side: 'right' }
    },
  ],
  "/images/iw39/step_2.png": [
    {
      box: { x: 1.5, y: 27.7, w: 46.9, h: 8.5 },
      label: { text: "Centang status order Completed dan Historical", side: 'right' }
    },
  ],
  "/images/iw39/step_3.png": [
    {
      box: { x: 2.2, y: 7.7, w: 39.3, h: 8.6 },
      label: { text: "Ketik Maintenance Plant dengan 5*", side: 'right' }
    },
    {
      box: { x: 1.4, y: 81.2, w: 42.3, h: 7.5 },
      label: { text: "Ketik Layout: /LIST_PM", side: 'right' }
    },
  ],
  "/images/iw39/step_4.png": [
    {
      box: { x: 1.3, y: 17, w: 4.3, h: 6.6 },
      label: { text: "Klik tombol Execute (F8)", side: 'right' }
    },
  ],
  "/images/iw39/step_5.png": [
    {
      box: { x: 40.5, y: 7.7, w: 1.4, h: 4.1 },
      label: { text: "Klik tombol Spreadsheet / Export Excel", side: 'above' }
    },
  ],
  "/images/zesthlc003pa/step_1.png": [
    {
      box: { x: 26.6, y: 80.7, w: 7.3, h: 7.6 },
      label: { text: "Ketik KS pada kolom Komoditi", side: 'right' }
    },
    {
      box: { x: 48.7, y: 3.7, w: 12.3, h: 5.2 },
      label: { text: "Buka template Excel resmi VRA", side: 'left' }
    },
  ],
  "/images/zesthlc003pa/step_2.png": [
    {
      box: { x: 6, y: 15.7, w: 20.8, h: 19.4 },
      label: { text: "Ketik kode transaksi ZESTHLC003PA", side: 'right' }
    },
  ],
  "/images/zesthlc003pa/step_4.png": [
    {
      box: { x: 0.4, y: 60.6, w: 2.3, h: 16.8 },
      label: { text: "Klik tombol Select All", side: 'right' }
    },
    {
      box: { x: 46.9, y: 43.8, w: 17.1, h: 16.8 },
      label: { text: "Klik tombol Submit VRA/Logbook", side: 'left' }
    },
  ],
  "/images/zesthlc003pa/step_8.png": [
    {
      box: { x: 1.3, y: 21.0, w: 4.8, h: 68.0 },
      label: { text: "Pastikan seluruh status baris HIJAU", side: 'right' }
    },
  ],
  "/images/zesthlp16pa/step_1.png": [
    {
      box: { x: 4.6, y: 48.6, w: 27.2, h: 2.4 },
      label: { text: "Pilih CJ03 - Display Work Breakdown Structure", side: 'right' }
    },
  ],
  "/images/zesthlp16pa/step_4.png": [
    {
      box: { x: 15, y: 18, w: 14.4, h: 3 },
      label: { text: "Klik Post Activity Alloc & Meas Point", side: 'right' }
    },
  ],
  "/images/zesthlp16pa/step_8.png": [
    {
      box: { x: 1.3, y: 37.1, w: 97.7, h: 4.4 },
      label: { text: "Periksa baris data hasil ekspor Excel", side: 'left' }
    },
  ],
  "/images/zco_cctr_01/step_1.png": [
    {
      box: { x: 7.2, y: 12.8, w: 19.6, h: 8.7 },
      label: { text: "Ketik ZCO_CCTR_01 di command line", side: 'right' }
    },
  ],
  "/images/zco_cctr_01/step_2.png": [
    {
      box: { x: 2.1, y: 9.7, w: 6.1, h: 10.6 },
      label: { text: "Klik tombol Execute (F8)", side: 'right' }
    },
  ],
  "/images/zco_cctr_01/step_3.png": [
    {
      box: { x: 53, y: 20.1, w: 29.3, h: 8.3 },
      label: { text: "Periksa kolom Total Cost dan Activity Qty", side: 'left' }
    },
  ],
  "/images/cancel_teco/step_1.png": [
    {
      box: { x: 24.3, y: 76.6, w: 13, h: 7.2 },
      label: { text: "Ketik Nomor Order: 200000776277", side: 'right' }
    },
  ],
  "/images/cancel_teco/step_2.png": [
    {
      box: { x: 50.8, y: 30.1, w: 33.7, h: 2.7 },
      label: { text: "Pilih Cancel technical completion", side: 'left' }
    },
  ],
  // ── IW32: penutupan teknis (TECO) & verifikasi di IW38 ────────────────────
  // Layar IW32 dengan menu Order ➔ Complete terbuka. Kotak merah tercetak
  // menandai kolom deskripsi order yang akan ditutup.
  "/images/iw32/step_2.png": [
    {
      box: { x: 50.3, y: 28.8, w: 33.2, h: 2.8 },
      label: { text: "Pilih Complete (technically) — Ctrl+F12", side: 'left' }
    },
    {
      box: { x: 28.25, y: 17.79, w: 36.18, h: 3.05 },
      label: { text: "Pastikan order yang ditutup: Perbaikan Separator 610", side: 'right' }
    },
  ],
  // Layar IW38 "Change PM Orders: Selection of Orders" — sama dengan iw38/step_2.
  "/images/iw32/step_3.png": [
    {
      box: { x: 0.96, y: 15.86, w: 40.03, h: 12.05 },
      label: { text: "Centang pilihan Order status", side: 'right' }
    },
    {
      box: { x: 33.01, y: 80.34, w: 12.65, h: 5.71 },
      label: { text: "Isi tanggal awal Period", side: 'right' }
    },
    {
      box: { x: 56.95, y: 80.55, w: 13.89, h: 5.92 },
      label: { text: "Isi tanggal akhir Period", side: 'right' }
    },
  ],
  // Layar IW38 parameter seleksi — sama dengan iw38/step_3.
  "/images/iw32/step_4.png": [
    {
      box: { x: 1, y: 18.95, w: 40, h: 3.32 },
      label: { text: "Isi Maintenance Plant dengan 5*", side: 'right' }
    },
    {
      box: { x: 1.14, y: 94.54, w: 47.57, h: 3.64 },
      label: { text: "Ketik Layout: /EUT IW38", side: 'right' }
    },
  ],
  // Layar ZESTHLC003PA pemilihan berkas: kotak merah tercetak pada kolom File.
  "/images/zesthlc003pa/step_3.png": [
    {
      box: { x: 39.8, y: 57.75, w: 53.78, h: 12.83 },
      label: { text: "Pilih berkas Excel VRA/Logbook", side: 'left' }
    },
  ],
};

export function getImageAnnotation(imagePath) {
  if (!imagePath) return [];
  const normalized = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
  // Hanya kunci PERSIS yang dipakai. Pencocokan berdasarkan nama berkas pernah
  // dipakai sebagai cadangan, dan akibatnya gambar yang belum terdaftar
  // (mis. /images/iw32/step_2.png) mewarisi anotasi gambar lain yang kebetulan
  // bernama step_2.png — keterangan pun menempel pada elemen yang salah.
  // Gambar tanpa entri sekarang sengaja tidak beranotasi.
  return sapImageAnnotations[normalized] || [];
}
