#!/usr/bin/env bash
# ==============================================================================
# Script: setup_cron_ubuntu.sh
# Purpose: Mengaktifkan penjadwalan kirim WA 100% di server Ubuntu (Tanpa Vercel)
# Server: 43.134.84.59 (Ubuntu 24.04 LTS)
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 MENYIAPKAN PENGIRIMAN WHATSAPP OTOMATIS DI SERVER UBUNTU"
echo "=========================================================="

APP_DIR="/var/www/pmreg5"
LOG_DIR="/var/log/pmreg5"

# 1. Pastikan direktori log dan public ada
echo "📁 Memeriksa direktori log dan output..."
sudo mkdir -p "$LOG_DIR"
sudo mkdir -p "$APP_DIR/public"
sudo chown -R ubuntu:www-data "$LOG_DIR"
sudo chown -R ubuntu:www-data "$APP_DIR/public"
sudo chmod -R 775 "$LOG_DIR"

# 2. Periksa Google Chrome Stable (diperlukan untuk Puppeteer screenshot)
echo "🌐 Memeriksa Google Chrome Stable..."
if ! command -v google-chrome &> /dev/null && ! command -v google-chrome-stable &> /dev/null; then
  echo "⚠️ Google Chrome belum terpasang. Mengunduh dan memasang Google Chrome..."
  sudo apt-get update -q
  sudo apt-get install -y wget ca-certificates
  wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb
  sudo dpkg -i /tmp/chrome.deb || sudo apt-get install -f -y
  rm -f /tmp/chrome.deb
  echo "✅ Google Chrome berhasil dipasang: $(google-chrome --version 2>/dev/null || google-chrome-stable --version)"
else
  echo "✅ Google Chrome sudah terpasang: $(google-chrome --version 2>/dev/null || google-chrome-stable --version)"
fi

# 3. Cari path node binary
NODE_BIN=$(which node || echo "/usr/bin/node")
echo "🟢 Node.js binary: $NODE_BIN"

# 4. Konfigurasi Crontab
echo "⏱️ Mengatur jadwal di Linux Crontab..."

# ── PENTING: cron 3.0pl1 (Ubuntu) TIDAK mendukung variabel CRON_TZ ────────────
# Server ini memakai localtime Asia/Shanghai (CST, UTC+8), sedangkan WIB = UTC+7.
# Selisihnya 1 jam. Maka jam cron harus memakai CST = WIB + 1.
#   07:00 WIB = 08:00 CST  ->  0 8  * * *
#   08:00 WIB = 09:00 CST  ->  0 9  * * *
#   14:00 WIB = 15:00 CST  ->  0 15 * * *
#   16:00 WIB = 17:00 CST  ->  0 17 * * *
# Script run_wa_report.js tetap me-routing sendiri berdasarkan jam WIB,
# jadi kombinasi ini konsisten.
#
# ── PENTING: DEV harus digeser +20 menit dari PROD ────────────────────────────
# Capture memuat ~19 MB / 21 request REST dan butuh ~90s. Jika PROD dan DEV
# berjalan pada menit yang sama (:00), dua Chromium berebut CPU/RAM sehingga
# pemuatan melampaui timeout dan memicu retry. DEV dipindah ke menit :20.
echo "🕐 Timezone server: $(date '+%Z %z') (WIB = server -1 jam)"

# Siapkan file sementara crontab
CRON_TMP=$(mktemp)

# Ambil crontab user saat ini (jika ada), abaikan entry lama pmreg5 jika ada
crontab -l 2>/dev/null | grep -v "scripts/run_wa_report.js" | grep -v "# === PMREG5 WA AUTO-SEND ===" > "$CRON_TMP" || true

# Tambahkan entry jadwal baru (jam dalam CST / server localtime)
cat << 'EOF' >> "$CRON_TMP"

# === PMREG5 WA AUTO-SEND ===
# Server localtime = CST (UTC+8); WIB = UTC+7 (1 jam lebih awal)
# 1. 07:00 WIB & 14:00 WIB -> Reminder Teks (08:00 & 15:00 CST)
0 8,15 * * * cd /var/www/pmreg5 && /usr/bin/node scripts/run_wa_report.js >> /var/log/pmreg5/wa_report.log 2>&1
# 2. 08:00 WIB & 16:00 WIB -> Laporan HD PMReg5 + CMMS (09:00 & 17:00 CST)
0 9,17 * * * cd /var/www/pmreg5 && /usr/bin/node scripts/run_wa_report.js >> /var/log/pmreg5/wa_report.log 2>&1
# ===========================
EOF

# Pasang crontab baru
crontab "$CRON_TMP"
rm -f "$CRON_TMP"

echo "=========================================================="
echo "✅ PENJADWALAN BERHASIL DIAKTIFKAN DI CRONTAB UBUNTU!"
echo "=========================================================="
echo "Jadwal aktif saat ini di crontab:"
crontab -l | tail -n 10
echo ""
echo "📊 Pantau log pengiriman secara live dengan perintah:"
echo "   tail -f /var/log/pmreg5/wa_report.log"
echo "=========================================================="
