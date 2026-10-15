import { useState, useEffect, useRef } from 'react';
import { Maximize2, Eye, EyeOff } from 'lucide-react';
import { getImageAnnotation } from '../data/sapImageAnnotations';
import SapAnnotationLayer from './SapAnnotationLayer';

/**
 * SAPAnnotatedImage
 * -------------------------------------------------------------
 * Menampilkan tangkapan layar SAP GUI dengan anotasi kotak penanda merah,
 * panah merah, dan kotak keterangan merah persis standar tutorial teknis SAP.
 *
 * Geometri anotasi dihitung dalam piksel gambar asli (naturalWidth/Height)
 * sehingga tidak pernah meleset walau ukuran tampilan berubah.
 *
 * Kontainer gambar sengaja TIDAK memakai `overflow-hidden`: kotak keterangan
 * boleh diletakkan di ruang kosong kiri/kanan gambar supaya tidak menutupi
 * tulisan pada tangkapan layar SAP (diukur oleh SapAnnotationLayer).
 */
export default function SAPAnnotatedImage({
  image,
  alt = 'Tangkapan Layar SAP',
  caption = '',
  onZoom = null,
  defaultShowAnnotations = true,
  className = ''
}) {
  const [showAnnotations, setShowAnnotations] = useState(defaultShowAnnotations);
  const [natural, setNatural] = useState(null);
  const imgRef = useRef(null);

  const annotations = getImageAnnotation(image);
  const hasAnnotations = Array.isArray(annotations) && annotations.length > 0;

  // Ukuran asli gambar disimpan BERSAMA nama berkasnya. React memakai ulang
  // elemen <img> yang sama saat `image` berganti, dan `naturalWidth` masih
  // memegang ukuran gambar LAMA sampai gambar baru selesai di-decode. Karena itu
  // pembacaan hanya diterima saat `complete` benar (gambar untuk src SEKARANG
  // sudah selesai dimuat) dan hasilnya ditandai dengan src-nya. Ukuran gambar
  // lama jadi tidak pernah dipakai untuk anotasi gambar baru — itulah penyebab
  // kotak/keterangan merah terlihat meloncat.
  const activeNatural = natural && natural.src === image ? natural : null;

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const read = () => {
      if (el.complete && el.naturalWidth && el.naturalHeight) {
        setNatural({ w: el.naturalWidth, h: el.naturalHeight, src: image });
      }
    };
    read();
    el.addEventListener('load', read);
    return () => el.removeEventListener('load', read);
  }, [image]);

  return (
    <div className={`w-full rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs transition-all ${className}`}>
      {/* Kanvas Gambar SAP. Keterangan diletakkan di gutter (padding) kontainer
          ini, jadi tetap berada di dalam kartu dan tidak pernah terpotong. */}
      <div
        className="w-full bg-slate-100/60 overflow-hidden flex items-center justify-center cursor-pointer group p-2"
        onClick={() => onZoom && onZoom(image)}
      >
        {/* Wrapper berukuran persis sama dengan gambar yang ter-render */}
        <div className="relative inline-block max-w-full leading-none">
          <img
            ref={imgRef}
            src={image}
            alt={alt}
            className="w-auto h-auto max-w-full max-h-[520px] object-contain block select-none shadow-xs rounded-lg mx-auto"
            loading="lazy"
          />

          {/* Layer anotasi: kotak merah, panah merah, kotak keterangan merah */}
          {showAnnotations && hasAnnotations && activeNatural && (
            <SapAnnotationLayer
              annotations={annotations}
              naturalWidth={activeNatural.w}
              naturalHeight={activeNatural.h}
              imageSrc={image}
            />
          )}

          {/* Hover Quick Action Indicator */}
          <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-lg">
            <span className="bg-white/95 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-md">
              <Maximize2 size={13} className="text-emerald-700" /> Klik untuk Perbesar Layar
            </span>
          </div>
        </div>
      </div>

      {/* Bar Caption & Kontrol di Bawah Gambar */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between font-medium">
        <span className="flex items-center gap-2 truncate">
          <span className="text-slate-400 shrink-0">📷</span>
          <span className="truncate font-semibold text-slate-700">{caption || alt}</span>
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {hasAnnotations && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowAnnotations(!showAnnotations); }}
              className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-200/60 transition-colors text-xs cursor-pointer"
              title={showAnnotations ? 'Sembunyikan Panah & Keterangan' : 'Tampilkan Panah & Keterangan'}
            >
              {showAnnotations ? <EyeOff size={13} className="text-rose-600" /> : <Eye size={13} className="text-slate-500" />}
              <span>{showAnnotations ? 'Sembunyikan Panah' : 'Tampilkan Panah'}</span>
            </button>
          )}

          {onZoom && (
            <button
              type="button"
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer hover:underline text-xs"
              onClick={(e) => { e.stopPropagation(); onZoom(image); }}
            >
              <Maximize2 size={13} /> Buka Layar Penuh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
