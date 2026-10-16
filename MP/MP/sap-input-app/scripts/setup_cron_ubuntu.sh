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

# CATATAN PENTING (insiden 16 Okt 2026):
# `command -v google-chrome` TIDAK cukup. Ubuntu menyediakan /usr/bin/chromium-browser
# sebagai wrapper snap yang ADA di disk tapi GAGAL dijalankan di server headless
# ("xdg-settings: not found", dan content snap gpu-2404/gnome-46-2404 sering dilepas
# demi disk). Kalau Chrome asli tidak ada, run_wa_report.js jatuh ke wrapper rusak itu
# dan seluruh laporan 08:00/16:00 WIB gagal. Jadi verifikasi dengan MENJALANKAN binary.
chrome_ok() {
  local bin="$1"
  [ -x "$bin" ] || return 1
  "$bin" --version >/dev/null 2>&1
}

CHROME_BIN=""
for cand in /usr/bin/google-chrome-stable /usr/bin/google-chrome; do
  if chrome_ok "$cand"; then CHROME_BIN="$cand"; break; fi
done

if [ -z "$CHROME_BIN" ]; then
  echo "⚠️ Google Chrome belum terpasang (atau tidak bisa dijalankan). Memasang..."
  sudo apt-get update -q
  sudo apt-get install -y wget ca-certificates
  # Unduh .deb langsung: cara apt-key/`gpg --dearmor` GAGAL di sesi non-interaktif
  # ("gpg: cannot open '/dev/tty'"), dan `set -e` membuat seluruh script berhenti
  # sebelum crontab sempat dipasang.
  wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb
  sudo dpkg -i /tmp/chrome.deb || sudo apt-get install -f -y
  rm -f /tmp/chrome.deb

  for cand in /usr/bin/google-chrome-stable /usr/bin/google-chrome; do
    if chrome_ok "$cand"; then CHROME_BIN="$cand"; break; fi
  done
  if [ -z "$CHROME_BIN" ]; then
    echo "❌ GAGAL memasang Google Chrome. Pengiriman WA tidak akan bisa screenshot."
    exit 1
  fi
fi
echo "✅ Google Chrome siap: $CHROME_BIN ($("$CHROME_BIN" --version))"

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
# CHROME_PATH dipatok eksplisit: mencegah script jatuh ke /usr/bin/chromium-browser
# (wrapper snap) yang gagal di server headless.
cat << EOF >> "$CRON_TMP"

# === PMREG5 WA AUTO-SEND ===
# Server localtime = CST (UTC+8); WIB = UTC+7 (1 jam lebih awal)
# Browser dipatok ke Chrome asli (bukan wrapper snap chromium-browser)
CHROME_PATH=$CHROME_BIN
# 1. 07:00 WIB & 14:00 WIB -> Reminder Teks (08:00 & 15:00 CST)
0 8,15 * * * cd /var/www/pmreg5 && /usr/bin/node scripts/run_wa_report.js >> /var/log/pmreg5/wa_report.log 2>&1
# 2. 08:00 WIB & 16:00 WIB -> Laporan HD PMReg5 + CMMS (09:00 & 17:00 CST)
0 9,17 * * * cd /var/www/pmreg5 && /usr/bin/node scripts/run_wa_report.js >> /var/log/pmreg5/wa_report.log 2>&1
# ===========================
EOF

# Pasang crontab baru
crontab "$CRON_TMP"
rm -f "$CRON_TMP"

# 5. Logrotate: tanpa ini wa_report.log tumbuh tanpa batas (disk / sudah 93%).
# `copytruncate` dipakai karena script menulis dengan append (>>) dan file tidak
# dibuka ulang — tanpa copytruncate, rotasi akan membuat proses terus menulis ke
# inode lama yang sudah dipindah.
echo "🧾 Memasang logrotate untuk /var/log/pmreg5/*.log..."
sudo tee /etc/logrotate.d/pmreg5 > /dev/null << 'EOF'
/var/log/pmreg5/*.log {
  weekly
  rotate 8
  maxsize 20M
  missingok
  notifempty
  compress
  delaycompress
  copytruncate
  create 0664 ubuntu www-data
}
EOF
sudo logrotate --debug /etc/logrotate.d/pmreg5 > /dev/null 2>&1 || echo "⚠️ Konfigurasi logrotate perlu dicek manual"

echo "=========================================================="
echo "✅ PENJADWALAN BERHASIL DIAKTIFKAN DI CRONTAB UBUNTU!"
echo "=========================================================="
echo "Jadwal aktif saat ini di crontab:"
crontab -l | tail -n 10
echo ""
echo "📊 Pantau log pengiriman secara live dengan perintah:"
echo "   tail -f /var/log/pmreg5/wa_report.log"
echo "=========================================================="
