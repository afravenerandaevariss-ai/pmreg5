/**
 * imageInkSampler
 * -----------------------------------------------------------------------------
 * Membangun peta "tinta" (piksel gelap = teks/ikon SAP) dari sebuah <img> yang
 * sudah ter-load, lalu menyediakan sampler kepadatan tinta per area.
 *
 * Dipakai buildAnnotationLayout() supaya kotak keterangan tidak diletakkan di
 * atas tulisan pada tangkapan layar SAP.
 *
 * Implementasi: gambar dirender sekali ke canvas offscreen, lalu diubah menjadi
 * summed-area table (integral image) sehingga kepadatan tinta pada sembarang
 * rect bisa dihitung O(1) — planner bisa menguji ratusan kandidat posisi tanpa
 * membaca ulang piksel.
 */

/** Ambang luminance: piksel di bawah nilai ini dianggap tinta (teks/gambar). */
export const INK_LUMINANCE = 205;

/** Cache per gambar (src + ukuran asli) supaya tidak dihitung ulang tiap render. */
const cache = new Map();
// Setiap entri menyimpan summed-area table sebesar (w+1)*(h+1) int32. Untuk
// tangkapan layar terbesar di panduan (~1800x680) itu ~5 MB, jadi cache dijaga
// kecil supaya memori tidak membengkak saat pengguna membuka banyak modul.
const CACHE_MAX = 8;

export function getCachedInkSampler(src, naturalWidth, naturalHeight) {
  const key = `${src}|${naturalWidth}x${naturalHeight}`;
  const hit = cache.get(key);
  if (hit) return hit;
  return null;
}

export function putCachedInkSampler(src, naturalWidth, naturalHeight, sampler) {
  const key = `${src}|${naturalWidth}x${naturalHeight}`;
  cache.set(key, sampler);
  if (cache.size > CACHE_MAX) {
    // Buang entri tertua (Map menjaga urutan penyisipan).
    cache.delete(cache.keys().next().value);
  }
  return sampler;
}

/**
 * Buat sampler tinta dari elemen gambar.
 * @returns {{rect:(x:number,y:number,w:number,h:number)=>number, width:number, height:number}|null}
 *   rect() mengembalikan fraksi 0..1. Area di luar gambar dianggap 0 (kosong),
 *   karena margin gambar memang ruang kosong.
 */
export function buildInkSampler(img) {
  if (typeof document === 'undefined' || !img) return null;
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(img, 0, 0, w, h);
  } catch {
    return null; // gambar lintas-origin: canvas tercemar, anotasi jalan tanpa peta tinta
  }

  let data;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null;
  }

  // Integral image dengan 1 px border nol: sat[(y+1)*(w+1)+(x+1)]
  const sat = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      rowSum += lum < INK_LUMINANCE ? 1 : 0;
      sat[(y + 1) * (w + 1) + (x + 1)] = sat[y * (w + 1) + (x + 1)] + rowSum;
    }
  }

  const rect = (x, y, rw, rh) => {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(w, Math.ceil(x + rw));
    const y1 = Math.min(h, Math.ceil(y + rh));
    if (x1 <= x0 || y1 <= y0) return 0; // seluruhnya di margin = kosong
    const s = sat[y1 * (w + 1) + x1] - sat[y0 * (w + 1) + x1] - sat[y1 * (w + 1) + x0] + sat[y0 * (w + 1) + x0];
    return s / ((x1 - x0) * (y1 - y0));
  };

  return { rect, width: w, height: h };
}
