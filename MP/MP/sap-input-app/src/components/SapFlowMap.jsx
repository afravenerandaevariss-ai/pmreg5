import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, Calendar, FileSpreadsheet, Image as ImageIcon, ZoomIn,
  ShieldCheck, ArrowRight, ChevronLeft, ChevronRight, Play, Pause, MousePointerClick
} from 'lucide-react';
import { FLOW_WORKFLOWS, TONE } from '../data/sapFlowWorkflows';

const BANNER_ICON = {
  alert: AlertCircle,
  calendar: Calendar,
  sheet: FileSpreadsheet
};

const BANNER_TONE = {
  rose: { chip: 'text-rose-800 bg-rose-50 border-rose-200', icon: 'text-rose-600' },
  emerald: { chip: 'text-emerald-800 bg-emerald-50 border-emerald-200', icon: 'text-emerald-700' },
  teal: { chip: 'text-teal-800 bg-teal-50 border-teal-200', icon: 'text-teal-700' }
};

/**
 * Animated "Peta Alur Kerja" journey map.
 *
 * Interaction model (PowerPoint-morph style):
 *  - A compact rail of station nodes. Only the essentials live on the node, so
 *    the map never turns into a wall of text.
 *  - Clicking a node morphs the detail panel open beneath the rail; every block
 *    inside rises in sequence so the reveal reads as motion, not a text dump.
 *  - Optional auto-play walks the whole journey hands-free.
 */
export default function SapFlowMap({
  workflowKey,
  selectedStep,
  onSelectStep,
  onOpenModule,
  onZoomImage
}) {
  const workflow = FLOW_WORKFLOWS[workflowKey] || FLOW_WORKFLOWS.corrective;
  const { stations } = workflow;
  const total = stations.length;
  const step = Math.min(Math.max(selectedStep, 1), total);
  const station = stations.find((s) => s.step === step) || stations[0];
  const tone = TONE[station.tone] || TONE.emerald;
  const bannerTone = BANNER_TONE[workflow.tone] || BANNER_TONE.emerald;
  const BannerIcon = BANNER_ICON[workflow.icon] || AlertCircle;

  const [playing, setPlaying] = useState(false);
  const railRef = useRef(null);

  // Auto-play: advance one station at a time, looping back to the start.
  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => {
      onSelectStep(step >= total ? 1 : step + 1);
    }, 4200);
    return () => clearTimeout(t);
  }, [playing, step, total, onSelectStep]);

  // Note: the parent keys this component by workflowKey, so switching the
  // workflow remounts it and auto-play resets to stopped on its own.

  // Keep the active node visible when the journey advances on its own.
  useEffect(() => {
    const el = railRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [step, workflowKey]);

  const progress = Math.round((step / total) * 100);

  return (
    <div className="p-5 md:p-7 bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200/90 space-y-5 shadow-sm relative overflow-hidden">
      {/* ── Header banner ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${bannerTone.chip}`}>
              <BannerIcon size={14} className={bannerTone.icon} />
              {workflow.banner}
            </span>
            <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {workflow.metaBadge}
            </span>
          </div>
          <h3 className="text-base md:text-lg font-black text-slate-900 mt-2">{workflow.title}</h3>
          <p className="text-xs text-slate-600 mt-0.5">{workflow.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-semibold text-slate-500 mr-1">Aktor:</span>
          {workflow.legend.map((l) => (
            <span
              key={l.label}
              className={`px-2 py-0.5 rounded-md font-medium border ${TONE[l.tone]?.pill || TONE.emerald.pill}`}
            >
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Station rail ──────────────────────────────────────────────── */}
      <div className="relative">
        {/* Animated connector track behind the nodes */}
        <div className="hidden lg:block absolute top-[30px] left-[4%] right-[4%] h-1 rounded-full z-0 opacity-70 overflow-hidden bg-slate-100">
          <div className={`h-full w-full bg-gradient-to-r ${workflow.trackGradient} morph-flow-line`} />
        </div>

        <div
          ref={railRef}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 relative z-10"
        >
          {stations.map((s, idx) => {
            const st = TONE[s.tone] || TONE.emerald;
            const active = s.step === step;
            return (
              <button
                key={s.step}
                type="button"
                data-active={active ? 'true' : 'false'}
                onClick={() => { setPlaying(false); onSelectStep(s.step); }}
                style={{ animationDelay: `${idx * 55}ms` }}
                className={`morph-card group text-left bg-white rounded-xl border px-3 py-2.5 flex flex-col gap-1.5 transition-all duration-300 cursor-pointer relative ${
                  active
                    ? `ring-2 ${st.ring} border-transparent shadow-md scale-[1.03]`
                    : `${st.cardBorder} shadow-xs hover:shadow-md hover:-translate-y-1`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-6 h-6 rounded-full ${st.nodeBg} ring-4 flex items-center justify-center font-black text-[11px] shrink-0`}>
                    {s.step}
                  </span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    active ? st.badge : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {s.statusSap}
                  </span>
                </div>

                <span className={`text-[11px] font-bold text-slate-900 leading-tight line-clamp-2 transition-colors ${st.text}`}>
                  {s.short}
                </span>

                <span className="flex items-center justify-between gap-1">
                  <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 transition-colors ${st.chip}`}>
                    {s.tcode}
                  </span>
                  <span className={`text-[9px] font-bold transition-opacity ${active ? `${st.accentText} opacity-100` : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}>
                    {active ? '● aktif' : 'lihat'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Progress + playback controls ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
        <div className="flex-1 flex items-center gap-3">
          <span className="text-[11px] font-bold text-slate-500 shrink-0">
            Stasiun {step}/{total}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${tone.gradFrom} ${tone.gradTo} transition-all duration-500 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              playing
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title={playing ? 'Hentikan animasi otomatis' : 'Putar animasi alur otomatis'}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            {playing ? 'Jeda' : 'Putar Otomatis'}
          </button>
          <button
            type="button"
            onClick={() => { setPlaying(false); onSelectStep(Math.max(1, step - 1)); }}
            disabled={step === 1}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft size={13} /> Sebelumnya
          </button>
          <button
            type="button"
            onClick={() => { setPlaying(false); onSelectStep(Math.min(total, step + 1)); }}
            disabled={step === total}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r ${tone.gradFrom} ${tone.gradTo}`}
          >
            Selanjutnya <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ── Morphing detail panel ─────────────────────────────────────── */}
      <div key={`${workflowKey}-${step}`} className="morph-detail">
        <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-5 shadow-xs">
          {/* Panel header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-4 border-b border-slate-200/80">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                  Stasiun #{station.step} dari {total}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${tone.longBadge}`}>
                  {station.role}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {station.statusLong}
                </span>
              </div>
              <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                {station.title}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <MousePointerClick size={12} className="text-slate-400" />
                {station.desc}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 text-[11px]">
              <span className="text-slate-500">⏱️ SLA</span>
              <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200">
                {station.sla}
              </span>
            </div>
          </div>

          {/* 3-column content, staggered reveal */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Column 1: SAP screen */}
            <div className="morph-rise lg:col-span-4 bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between shadow-2xs" style={{ animationDelay: '60ms' }}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon size={14} className={tone.accentText} />
                    Layar SAP Transaksi
                  </span>
                  <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${tone.badge}`}>
                    {station.tcode}
                  </span>
                </div>
                <div
                  onClick={() => onZoomImage(station.image)}
                  className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100/70 h-44 flex items-center justify-center cursor-pointer group"
                  title="Klik untuk perbesar layar penuh"
                >
                  <img src={station.image} alt={station.title} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/95 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-md">
                      <ZoomIn size={13} className={tone.accentText} /> Perbesar Layar
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">📷 {station.imageCaption}</p>
            </div>

            {/* Column 2: inputs / outputs */}
            <div className="morph-rise lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs flex flex-col justify-between" style={{ animationDelay: '130ms' }}>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block mb-1">
                    📥 Data Input yang Wajib Disiapkan:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {station.inputs.map((inp, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className={`font-bold ${tone.accentText}`}>•</span>
                        <span className="leading-relaxed">{inp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-emerald-900 block mb-1">
                    📤 Dokumen Resmi yang Diterbitkan:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {station.outputs.map((out, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-700 font-bold">✓</span>
                        <span className="leading-relaxed">{out}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>🎯 Output Utama:</span>
                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {station.output}
                </span>
              </div>
            </div>

            {/* Column 3: SOP + deep link */}
            <div className="morph-rise lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs flex flex-col justify-between" style={{ animationDelay: '200ms' }}>
              <div>
                <span className="text-xs font-bold text-slate-900 block mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className={tone.accentText} />
                  Ketentuan Kritis SOP PTPN IV:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {station.sop.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className={`font-bold shrink-0 mt-0.5 ${tone.accentText}`}>#{i + 1}</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onOpenModule(station.targetKey, station.targetPilar)}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${tone.pill} hover:brightness-95`}
                >
                  <span>🔍 Buka Panduan Lengkap {station.tcode.split(' ')[0]}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
