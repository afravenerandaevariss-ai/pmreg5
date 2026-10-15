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
  sudo apt-get install -y wget gnupg ca-certificates
  wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
  sudo apt-get update -q
  sudo apt-get install -y google-chrome-stable
  echo "✅ Google Chrome berhasil dipasang: $(google-chrome --version)"
else
  echo "✅ Google Chrome sudah terpasang: $(google-chrome --version 2>/dev/null || google-chrome-stable --version)"
fi

# 3. Cari path node binary
NODE_BIN=$(which node || echo "/usr/bin/node")
echo "🟢 Node.js binary: $NODE_BIN"

# 4. Konfigurasi Crontab
echo "⏱️ Mengatur jadwal di Linux Crontab..."

# Siapkan file sementara crontab
CRON_TMP=$(mktemp)

# Ambil crontab user saat ini (jika ada), abaikan entry lama pmreg5 jika ada
crontab -l 2>/dev/null | grep -v "scripts/run_wa_report.js" | grep -v "# === PMREG5 WA AUTO-SEND ===" > "$CRON_TMP" || true

# Tambahkan entry jadwal baru dengan Timezone Asia/Jakarta
cat << 'EOF' >> "$CRON_TMP"

# === PMREG5 WA AUTO-SEND ===
CRON_TZ=Asia/Jakarta
# 1. Jam 07:00 & 14:00 WIB - Reminder Teks Disiplin Input Logbook
0 7,14 * * * cd /var/www/pmreg5 && /usr/bin/node scripts/run_wa_report.js >> /var/log/pmreg5/wa_report.log 2>&1
# 2. Jam 08:00 & 16:00 WIB - Laporan HD Rekap Logbook PMReg5 & Jam Jalan CMMS
0 8,16 * * * cd /var/www/pmreg5 && /usr/bin/node scripts/run_wa_report.js >> /var/log/pmreg5/wa_report.log 2>&1
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
