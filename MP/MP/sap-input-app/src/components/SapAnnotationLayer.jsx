import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  buildAnnotationLayout,
  LABEL_FONT_PX,
  LABEL_PAD_X,
  LABEL_PAD_Y,
  MIN_FONT_SCREEN_PX,
  MIN_PAD_X_SCREEN_PX,
  MIN_PAD_Y_SCREEN_PX,
} from './sapAnnotationLayout';
import { buildInkSampler, getCachedInkSampler, putCachedInkSampler } from './imageInkSampler';

/**
 * SapAnnotationLayer
 * -----------------------------------------------------------------------------
 * Menggambar kotak penanda merah, panah merah, dan kotak keterangan merah di atas
 * gambar SAP.
 *
 * Penempatan:
 * - Posisi kotak memakai PERSENTASE dari ukuran gambar asli, dan lapisan ini
 *   selalu berukuran persis sama dengan gambar yang ter-render. Jadi anotasi
 *   presisi baik saat gambar dikecilkan (max-height) maupun diperbesar di modal.
 * - Posisi keterangan dihitung buildAnnotationLayout() dengan dua masukan yang
 *   membuatnya tidak pernah menutupi tulisan SAP:
 *     1. `ink` — peta tinta (piksel gelap) dari gambar itu sendiri, sehingga
 *        kandidat yang menutupi teks langsung dihukum.
 *     2. `margin` — ruang kosong kiri/kanan gambar yang DIUKUR SENDIRI oleh
 *        layer ini dari kontainer pembungkusnya, sehingga keterangan bisa
 *        diletakkan DI LUAR area SAP tanpa menghalangi tulisan.
 * - Ukuran teks/padding dihitung dari skala tampilan nyata (ResizeObserver),
 *   sehingga label tidak membesar/mengecil liar mengikuti layar.
 */
export default function SapAnnotationLayer({
  annotations,
  naturalWidth,
  naturalHeight,
  scale = 1,
  zIndex = 20,
  boxClassName = 'border-2 border-[#cc0000]',
  imageSrc = '',
}) {
  const rootRef = useRef(null);
  const [shownWidth, setShownWidth] = useState(0);
  const [gutter, setGutter] = useState({ left: 0, right: 0 });
  // Peta tinta gambar INI, disimpan bersama kuncinya (src + ukuran asli).
  // Kunci dipakai saat render untuk memastikan peta tinta gambar lain tidak
  // pernah dipakai: kalau kuncinya tidak cocok, peta dianggap belum siap dan
  // keterangan menunggu — bukan digambar dulu lalu berpindah.
  const [ink, setInk] = useState(null);
  // Gutter diukur di useLayoutEffect (sebelum paint), jadi nilainya sudah final
  // saat frame pertama; flag ini hanya memastikan keterangan menunggu satu
  // pengukuran yang sah sebelum digambar.
  const [gutterReady, setGutterReady] = useState(false);

  const inkKey = naturalWidth && naturalHeight ? `${imageSrc}|${naturalWidth}x${naturalHeight}` : null;
  // Baca cache saat render (murni baca): gambar yang sudah pernah dibuka tidak
  // perlu membangun ulang peta tinta.
  const cachedInk = inkKey ? getCachedInkSampler(imageSrc, naturalWidth, naturalHeight) : null;
  const inkSettled = !!cachedInk || !!(ink && ink.key === inkKey);
  const inkSampler = cachedInk || (ink && ink.key === inkKey ? ink.sampler : null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const read = () => setShownWidth(el.clientWidth || 0);
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalWidth]);

  // Ukur ruang kosong kiri/kanan gambar (selisih lebar kontainer pembungkus
  // dengan lebar gambar). Ruang ini boleh dipakai menaruh keterangan supaya
  // tidak menutupi tulisan SAP. Struktur DOM: gambar dan layer ini bersaudara
  // di dalam wrapper berukuran gambar, dan wrapper itu berada di kontainer
  // selebar area tampilan (kartu panduan maupun modal zoom).
  useLayoutEffect(() => {
    const layer = rootRef.current;
    if (!layer) return;
    const wrapper = layer.parentElement;
    const container = wrapper && wrapper.parentElement;
    if (!wrapper || !container) {
      // Struktur DOM tak terduga: jangan biarkan keterangan tidak pernah
      // digambar — pakai margin nol dan lanjutkan.
      setGutterReady(true);
      return;
    }

    const read = () => {
      const cs = typeof getComputedStyle === 'function' ? getComputedStyle(container) : null;
      const padL = cs ? parseFloat(cs.paddingLeft) || 0 : 0;
      const padR = cs ? parseFloat(cs.paddingRight) || 0 : 0;
      const usable = container.clientWidth - padL - padR;
      const free = Math.max(0, (usable - wrapper.clientWidth) / 2);
      setGutter((prev) => (Math.abs(prev.left - free) < 1 ? prev : { left: free, right: free }));
      setGutterReady(true);
    };

    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(container);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [naturalWidth, shownWidth]);

  // Bangun peta tinta gambar lalu simpan ke cache. Mengembalikan null bila
  // peta tidak bisa dibuat (mis. kanvas tidak tersedia / gambar lintas-origin);
  // anotasi tetap jalan memakai jalur cadangan tanpa peta tinta.
  const buildInk = useCallback((img) => {
    const sampler = buildInkSampler(img);
    return sampler ? putCachedInkSampler(imageSrc, naturalWidth, naturalHeight, sampler) : null;
  }, [imageSrc, naturalWidth, naturalHeight]);

  useEffect(() => {
    if (typeof document === 'undefined' || !inkKey) return;
    if (getCachedInkSampler(imageSrc, naturalWidth, naturalHeight)) return;
    const el = rootRef.current;
    const img = el && el.parentElement ? el.parentElement.querySelector('img') : null;
    const settle = (sampler) => setInk({ key: inkKey, sampler });
    // Gambar sudah selesai dimuat (termasuk kasus gambar tidak ditemukan —
    // buildInk mengembalikan null): tentukan hasil sekarang, jangan menggantung.
    if (!img || (img.complete && img.naturalWidth)) { settle(buildInk(img)); return; }
    const onLoad = () => settle(buildInk(img));
    img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [inkKey, imageSrc, naturalWidth, naturalHeight, buildInk]);

  if (!Array.isArray(annotations) || !annotations.length) return null;
  if (!naturalWidth || !naturalHeight) return null;
  // Tunggu sampai lebar tampilan terukur: sebelum itu viewScale belum diketahui,
  // jadi menggambar lebih dulu akan memakai metrik salah lalu meloncat.
  if (!shownWidth) return <div ref={rootRef} className="absolute inset-0 pointer-events-none select-none" style={{ zIndex }} />;

  // Skala tampilan nyata: berapa px layar untuk 1 px gambar asli.
  const viewScale = shownWidth / naturalWidth;

  // Layout dihitung dengan metrik yang SAMA dengan yang digambar di bawah,
  // supaya lebar/tinggi keterangan tidak pernah meleset. Margin (ruang kosong
  // di kiri/kanan gambar) diterima dalam px LAYAR lalu dikonversi ke px gambar.
  const marginPx = {
    left: Math.max(0, gutter.left / viewScale),
    right: Math.max(0, gutter.right / viewScale),
    top: 0,
    bottom: 0,
  };

  const { boxes, labels, arrows } = buildAnnotationLayout(annotations, naturalWidth, naturalHeight, {
    scale,
    viewScale,
    ink: inkSampler ? inkSampler.rect : null,
    margin: marginPx,
  });

  const pctX = (v) => `${(v / naturalWidth) * 100}%`;
  const pctY = (v) => `${(v / naturalHeight) * 100}%`;

  const unit = Math.max(1, naturalWidth / 600) * scale;
  const strokeW = Math.max(1, 1.2 * unit * viewScale);
  const headSize = Math.max(6, 9 * unit * viewScale);
  const fontPx = Math.max(MIN_FONT_SCREEN_PX, LABEL_FONT_PX * viewScale);
  const padX = Math.max(MIN_PAD_X_SCREEN_PX, LABEL_PAD_X * viewScale);
  const padY = Math.max(MIN_PAD_Y_SCREEN_PX, LABEL_PAD_Y * viewScale);
  const markerId = 'sap-red-arrowhead';
  // Keterangan + panah penunjuk baru digambar setelah peta tinta dan margin
  // siap. Keduanya masukan planner; menggambar sebelum siap = posisi salah yang
  // lalu meloncat. Kotak merah tidak ikut menunggu karena posisinya persentase.
  const labelsReady = gutterReady && inkSettled;

  return (
    <div ref={rootRef} className="absolute inset-0 pointer-events-none select-none" style={{ zIndex }}>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9.5"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth={headSize / viewScale}
            markerHeight={headSize / viewScale}
            orient="auto"
          >
            <path d="M 0 1.2 L 10 5 L 0 8.8 z" fill="#cc0000" />
          </marker>
        </defs>

        {labelsReady && arrows.map((a, i) => (
          <line
            key={`ar${i}`}
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            stroke="#cc0000"
            strokeWidth={strokeW / viewScale}
            strokeLinecap="butt"
            markerEnd={`url(#${markerId})`}
          />
        ))}
      </svg>

      {boxes.map((b, i) => (
        <div
          key={`bx${i}`}
          className={`absolute pointer-events-none select-none ${boxClassName}`}
          style={{
            left: pctX(b.x),
            top: pctY(b.y),
            width: pctX(b.w),
            height: pctY(b.h),
            boxSizing: 'border-box',
          }}
        />
      ))}

      {labelsReady && labels.map((l, i) => (
        <div
          key={`lb${i}`}
          className="absolute whitespace-nowrap bg-white/95 border border-[#cc0000] text-[#cc0000] font-semibold leading-tight shadow-xs"
          style={{
            left: pctX(l.x),
            top: pctY(l.y - l.h / 2),
            fontSize: `${fontPx}px`,
            padding: `${padY}px ${padX}px`,
            borderRadius: 2,
            boxSizing: 'border-box',
          }}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
}
