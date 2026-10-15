/**
 * sapAnnotationLayout
 * -----------------------------------------------------------------------------
 * Menghitung geometri anotasi (kotak penanda, kotak keterangan, panah) dalam
 * KOORDINAT PIXEL gambar asli.
 *
 * Prinsip (urut prioritas):
 *  1. Keterangan TIDAK BOLEH menutupi teks/ikon SAP pada tangkapan layar.
 *     Ini diukur, bukan ditebak: pemanggil menyerahkan sampler "tinta"
 *     (kepadatan piksel gelap) lewat opts.ink.
 *  2. Keterangan tidak boleh saling menimpa dan tidak boleh menutupi kotak
 *     penanda lain — teks harus selalu terbaca.
 *  3. Keterangan tetap berada dalam area gambar ATAU margin kosong di
 *     sekeliling gambar (opts.margin), supaya bisa diletakkan di luar layar SAP
 *     tanpa menghalangi tulisan.
 *  4. Panah menghubungkan keterangan ke kotak targetnya tanpa celah.
 *
 * Cara kerja: dua fase.
 *   Fase 1 — kandidat "klasik" di kanan/kiri/atas/bawah kotak (dekat kotak).
 *            Dipakai bila sudah bersih (tanpa tabrakan, tanpa menutupi teks).
 *   Fase 2 — sapuan grid (sweep) di seluruh area gambar + margin, dipilih
 *            posisi berbiaya minimum. Biaya = tabrakan + tinta tertutup + jarak.
 *
 * Keluaran memakai ruang piksel gambar (0..naturalWidth, 0..naturalHeight)
 * sehingga bisa dipakai langsung sebagai viewBox SVG tanpa distorsi. Koordinat
 * `x` pada label adalah TEPI KIRI (bukan titik anchor), dan boleh bernilai
 * negatif / lebih besar dari naturalWidth bila label berada di margin.
 */

export const ARROW_INSET = 0;    // panah berhenti tepat di tepi kotak (px)
export const LABEL_FONT_PX = 11; // ukuran font acuan keterangan (px, ruang gambar asli)
export const LABEL_PAD_X = 5;    // padding horizontal acuan (px)
export const LABEL_PAD_Y = 1.5;  // padding vertikal acuan (px)

/** Batas minimum yang dipakai renderer (px LAYAR) — harus sama dengan SapAnnotationLayer. */
export const MIN_FONT_SCREEN_PX = 9;
export const MIN_PAD_X_SCREEN_PX = 3;
export const MIN_PAD_Y_SCREEN_PX = 1;

/**
 * Perkiraan lebar rata-rata 1 karakter (fraksi dari ukuran font), font semibold.
 * Diukur dari label yang benar-benar ter-render: 0.436–0.506 (median ~0.47).
 * Dipakai 0.52 (sedikit lebih lebar) supaya planner tidak pernah menganggap
 * label lebih sempit dari kenyataan — itu penyebab label saling menimpa.
 */
export const LABEL_CHAR_W = 0.52;

// --- Bobot biaya penempatan keterangan -------------------------------------
// Skala biaya sengaja dibuat supaya MENUTUPI TULISAN selalu lebih mahal daripada
// menarik garis pemimpin lebih panjang: menutupi teks merusak keterbacaan
// tangkapan layar, sedangkan keterangan di margin hanya menambah panjang panah.
export const COST_LABEL_OVERLAP = 100000; // menimpa keterangan lain: terlarang
export const COST_BOX_OVERLAP = 20000;    // menutupi kotak penanda lain
export const COST_INK = 40000;            // per unit fraksi tinta (0..1) yang tertutup
export const COST_DISTANCE = 1;           // per px jarak keterangan dari kotak target
export const INK_CLEAN = 0.02;            // tinta di bawah batas ini dianggap bersih

/**
 * Ukuran font keterangan yang BENAR-BENAR ter-render, dinyatakan dalam px ruang
 * gambar asli.
 *
 * Renderer memakai clamp minimum 9 px LAYAR. Pada skala tampilan kecil
 * (viewScale < 9/11 ≈ 0.818) font layar tertahan di 9 px, sehingga dalam ruang
 * gambar asli font menjadi 9/viewScale — lebih besar dari LABEL_FONT_PX.
 *
 * Planner WAJIB memakai angka ini, bukan LABEL_FONT_PX, supaya lebar perkiraan
 * sama dengan lebar nyata. Sebelumnya planner memakai 11 px natural sementara
 * renderer menggambar ~16.5 px natural, jadi label ~50% lebih lebar dari
 * perkiraan: label saling bertabrakan, lalu algoritma anti-tabrakan memindah-
 * mindahkannya — penyebab keterangan tampak "lari-lari".
 */
export function effectiveLabelFontPx(viewScale = 1) {
  const vs = viewScale > 0 ? viewScale : 1;
  return Math.max(MIN_FONT_SCREEN_PX, LABEL_FONT_PX * vs) / vs;
}

/** Padding efektif keterangan dalam px ruang gambar asli (mengikuti clamp renderer). */
export function effectiveLabelPad(viewScale = 1) {
  const vs = viewScale > 0 ? viewScale : 1;
  return {
    x: Math.max(MIN_PAD_X_SCREEN_PX, LABEL_PAD_X * vs) / vs,
    y: Math.max(MIN_PAD_Y_SCREEN_PX, LABEL_PAD_Y * vs) / vs,
    border: 1 / vs // border 1 px layar -> px natural
  };
}

/** Perkiraan lebar kotak keterangan (px) pada ruang gambar asli. */
export function estimateLabelWidth(text, fontPx = LABEL_FONT_PX, padX = LABEL_PAD_X, border = 0) {
  const t = String(text || '');
  return Math.max(24, t.length * fontPx * LABEL_CHAR_W + padX * 2 + border * 2);
}

/** Tinggi kotak keterangan (px) pada ruang gambar asli. */
export function estimateLabelHeight(fontPx = LABEL_FONT_PX, padY = LABEL_PAD_Y, border = 0) {
  return fontPx * 1.25 + padY * 2 + border * 2;
}

/** Jarak keterangan dari kotak; proporsional agar tetap terlihat pada gambar besar. */
export function labelGap(nw, scale = 1) {
  return Math.max(8, Math.min(22, nw * 0.015)) * scale;
}

const overlaps = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

/** Rect keterangan; `x` sudah berupa tepi kiri. */
function rectOfLabel(l) {
  return { x: l.x, y: l.y - l.h / 2, w: l.w, h: l.h };
}

const inside = (outer, inner) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

/** Titik pada tepi rect yang paling dekat ke (px, py). */
function nearestOnRect(r, px, py) {
  return {
    x: Math.max(r.x, Math.min(px, r.x + r.w)),
    y: Math.max(r.y, Math.min(py, r.y + r.h)),
  };
}

/**
 * @param {Array} annotations { box:{x,y,w,h}, label:{text,side?} } dalam persen
 * @param {number} nw lebar asli gambar (px)
 * @param {number} nh tinggi asli gambar (px)
 * @param {{
 *   scale?: number,
 *   viewScale?: number,
 *   ink?: (x:number,y:number,w:number,h:number)=>number,
 *   margin?: {left?:number,right?:number,top?:number,bottom?:number}
 * }} opts
 *   viewScale = px layar per px gambar asli. Dipakai agar perkiraan ukuran
 *   keterangan identik dengan yang benar-benar digambar renderer.
 *   ink       = sampler kepadatan tinta (0..1) pada area px gambar.
 *   margin    = ruang kosong di sekeliling gambar (px gambar) yang boleh
 *               dipakai untuk menaruh keterangan.
 */
export function buildAnnotationLayout(annotations, nw, nh, opts = {}) {
  if (!Array.isArray(annotations) || !nw || !nh) return { boxes: [], labels: [], arrows: [] };
  const scale = opts.scale || 1;
  const viewScale = opts.viewScale > 0 ? opts.viewScale : 1;
  const ink = typeof opts.ink === 'function' ? opts.ink : null;
  const margin = {
    left: Math.max(0, (opts.margin && opts.margin.left) || 0),
    right: Math.max(0, (opts.margin && opts.margin.right) || 0),
    top: Math.max(0, (opts.margin && opts.margin.top) || 0),
    bottom: Math.max(0, (opts.margin && opts.margin.bottom) || 0),
  };

  // Metrik nyata (bukan asumsi) — lihat effectiveLabelFontPx().
  const fontPx = effectiveLabelFontPx(viewScale);
  const ePad = effectiveLabelPad(viewScale);
  const lh = estimateLabelHeight(fontPx, ePad.y, ePad.border);

  const gap = labelGap(nw, scale) + ePad.border * 2;
  const pad = Math.max(2, 3 * scale) + ePad.border * 2;

  const boxes = [];
  const items = [];
  for (const item of annotations) {
    if (!item || !item.box) continue;
    const bx = item.box.x / 100 * nw;
    const by = item.box.y / 100 * nh;
    const bw = item.box.w / 100 * nw;
    const bh = item.box.h / 100 * nh;
    boxes.push({ x: bx, y: by, w: bw, h: bh });
    items.push({ box: boxes[boxes.length - 1], label: item.label, arrow: item.arrow, index: boxes.length - 1 });
  }

  // Batas area yang boleh ditempati keterangan (gambar + margin).
  const minX = -margin.left + pad;
  const minY = -margin.top + pad;
  const maxX = nw + margin.right - pad;
  const maxY = nh + margin.bottom - pad;

  // Keterangan ditempatkan dari kotak paling atas ke paling bawah supaya
  // penumpukan (stacking) mengalir alami.
  const order = items.map((it, i) => i).sort((a, b) => items[a].box.y - items[b].box.y || items[a].box.x - items[b].box.x);

  const labels = [];
  const arrows = [];
  const placed = []; // { rect }

  for (const idx of order) {
    const it = items[idx];
    if (!it.label || !it.label.text) continue;
    const text = it.label.text;
    const lw = estimateLabelWidth(text, fontPx, ePad.x, ePad.border);
    const b = it.box;
    const cy = b.y + b.h / 2;

    const costOf = (cand) => {
      const r = rectOfLabel(cand);
      let c = 0;
      for (const o of placed) if (overlaps(r, o.rect)) c += COST_LABEL_OVERLAP;
      for (const o of boxes) if (o !== b && overlaps(r, o)) c += COST_BOX_OVERLAP;
      if (ink) c += COST_INK * ink(r.x, r.y, r.w, r.h);
      const dx = Math.max(0, Math.max(b.x - (r.x + r.w), r.x - (b.x + b.w)));
      const dy = Math.max(0, Math.max(b.y - (r.y + r.h), r.y - (b.y + b.h)));
      c += COST_DISTANCE * Math.hypot(dx, dy);
      return c;
    };

    let best = null;
    const consider = (cand) => {
      const r = rectOfLabel(cand);
      if (r.x < minX || r.y < minY || r.x + r.w > maxX || r.y + r.h > maxY) return null;
      const c = costOf(cand);
      if (!best || c < best.cost - 1e-9) best = { cand, cost: c };
      return c;
    };

    // ── Fase 1: kandidat dekat kotak (kanan/kiri, lalu atas/bawah) ──────────
    const roomRight = nw - (b.x + b.w) - gap;
    const roomLeft = b.x - gap;
    const prefer = it.label.side === 'left' ? 'left' : it.label.side === 'right' ? 'right' : (roomRight >= roomLeft ? 'right' : 'left');
    const step = lh + Math.max(2, 4 * scale);
    const offsets = [0, -step, step, -2 * step, 2 * step, -3 * step, 3 * step];
    let clean = false;
    for (const side of (prefer === 'right' ? ['right', 'left'] : ['left', 'right'])) {
      const lx = side === 'right' ? b.x + b.w + gap : b.x - gap - lw;
      for (const off of offsets) {
        const ly = Math.max(lh / 2 + pad, Math.min(nh - lh / 2 - pad, cy + off));
        const c = consider({ x: lx, y: ly, w: lw, h: lh });
        if (c !== null && c <= INK_CLEAN * COST_INK) { clean = true; break; }
      }
      if (clean) break;
    }
    if (!clean) {
      for (const side of ['below', 'above']) {
        const ly = side === 'below' ? b.y + b.h + gap + lh / 2 : b.y - gap - lh / 2;
        if (ly < lh / 2 + pad || ly > nh - lh / 2 - pad) continue;
        for (const hx of [0, -lw / 2, -lw, lw / 2]) {
          const lx = Math.max(minX, Math.min(maxX - lw, b.x + hx));
          const c = consider({ x: lx, y: ly, w: lw, h: lh });
          if (c !== null && c <= INK_CLEAN * COST_INK) { clean = true; break; }
        }
        if (clean) break;
      }
    }

    // ── Fase 2: sapuan grid seluruh area (termasuk margin kosong) ───────────
    // Grid kasar untuk menemukan wilayah, lalu diperhalus di sekitarnya.
    if (!clean) {
      const sx = Math.max(8, lw * 0.25);
      const sy = Math.max(4, lh * 0.4);
      const grid = (stepX, stepY, fromX, fromY, toX, toY) => {
        for (let y = fromY; y + lh <= toY; y += stepY) {
          for (let x = fromX; x + lw <= toX; x += stepX) {
            consider({ x, y: y + lh / 2, w: lw, h: lh });
          }
        }
      };
      grid(sx, sy, minX, minY, maxX, maxY);
      // Tepi kanan & kiri area (kolom paling luar) sering paling rapi.
      for (const x of [minX, maxX - lw]) {
        for (let y = minY; y + lh <= maxY; y += sy) consider({ x, y: y + lh / 2, w: lw, h: lh });
      }
      // Perhalus di sekitar kandidat terbaik: grid kasar bisa melewati celah
      // kosong sempit (baris antar-field SAP) sehingga label mendarat di teks.
      if (best) {
        const bx = best.cand.x, by = best.cand.y - lh / 2;
        grid(Math.max(2, sx / 6), Math.max(1, sy / 6),
          Math.max(minX, bx - sx), Math.max(minY, by - sy),
          Math.min(maxX - lw, bx + sx) + lw, Math.min(maxY - lh, by + sy) + lh);
      }
    }

    if (!best) continue;
    const chosen = best.cand;

    // Rapikan: keterangan yang berada di margin diselaraskan ke satu kolom di
    // tepi gambar supaya diagram tidak terlihat acak.
    if (chosen.x >= nw) chosen.x = Math.min(nw + gap, maxX - lw);
    else if (chosen.x + lw <= 0) chosen.x = Math.max(-gap - lw, minX);

    labels.push({ text, x: chosen.x, y: chosen.y, w: lw, h: lh });
    placed.push({ rect: rectOfLabel(chosen) });

    // Panah: garis lurus dari tepi keterangan ke tepi kotak target. Berlaku
    // untuk semua posisi (kanan, kiri, atas, bawah, margin) tanpa kasus khusus.
    const r = rectOfLabel(chosen);
    if (it.arrow !== false && !inside(b, r)) {
      const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const lc = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      const from = nearestOnRect(r, bc.x, bc.y);
      const to = nearestOnRect(b, lc.x, lc.y);
      // Mundur sedikit ke dalam kotak supaya ujung kepala panah menyentuh tepi.
      const dx = to.x - from.x, dy = to.y - from.y;
      const len = Math.hypot(dx, dy);
      if (len > 2) {
        const t = ARROW_INSET / len;
        arrows.push({ x1: from.x, y1: from.y, x2: to.x + dx * t, y2: to.y + dy * t });
      }
    }
  }

  return { boxes, labels, arrows };
}
