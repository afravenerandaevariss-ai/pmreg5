import { useState, useMemo, useRef, useEffect, useCallback, useId } from 'react';
import { ChevronDown, ChevronUp, FileText, Search, X } from 'lucide-react';
import {
  SAP_TCODE_CATEGORIES,
  SAP_TCODE_CATALOG,
  dedupeSapTcodeCatalog,
} from '../data/sapTcodeCatalog';

export default function SapTcodeDropdown({
  items = SAP_TCODE_CATALOG,
  selectedCode = '',
  selectedItemId = '',
  onSelect,
  buttonLabel = 'Daftar T-Code PM',
  isOpen,
  onOpenChange,
  isLoading = false,
  error = null,
  onRetry,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [panelGeometry, setPanelGeometry] = useState(null);

  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : internalOpen;

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listContainerRef = useRef(null);

  const instanceId = useId();
  const panelId = `${instanceId}-panel`;
  const searchInputId = `${instanceId}-search`;

  const setOpen = useCallback(
    (nextOpen) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  // Deduplicate entries so repeated source items such as IE02 appear once.
  const cleanedItems = useMemo(() => dedupeSapTcodeCatalog(items), [items]);

  const categoriesWithCounts = useMemo(() => {
    const counts = new Map();
    for (const item of cleanedItems) {
      counts.set(item.categoryKey, (counts.get(item.categoryKey) || 0) + 1);
    }

    const ordered = [];
    for (const cat of SAP_TCODE_CATEGORIES) {
      const count = counts.get(cat.key) || 0;
      if (count > 0) {
        ordered.push({ ...cat, count });
      }
    }

    // Preserve extra categories passed outside the default seven PM groups.
    for (const item of cleanedItems) {
      if (!ordered.some((c) => c.key === item.categoryKey)) {
        ordered.push({
          key: item.categoryKey,
          label: item.category || item.categoryKey,
          shortLabel: item.category || item.categoryKey,
          count: counts.get(item.categoryKey) || 1,
        });
      }
    }

    return ordered;
  }, [cleanedItems]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    return cleanedItems.filter((item) => {
      if (activeCategory !== 'all' && item.categoryKey !== activeCategory) {
        return false;
      }
      if (!q) return true;

      const haystack = [
        item.code,
        item.fileName,
        item.description,
        item.category,
        item.relatedTcode,
        ...(item.keywords || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [cleanedItems, activeCategory, query]);

  const groupedItems = useMemo(() => {
    const groupsMap = new Map();

    for (const cat of categoriesWithCounts) {
      groupsMap.set(cat.key, {
        key: cat.key,
        label: cat.label,
        items: [],
      });
    }

    for (const item of filteredItems) {
      if (!groupsMap.has(item.categoryKey)) {
        groupsMap.set(item.categoryKey, {
          key: item.categoryKey,
          label: item.category || item.categoryKey,
          items: [],
        });
      }
      groupsMap.get(item.categoryKey).items.push(item);
    }

    return Array.from(groupsMap.values()).filter((group) => group.items.length > 0);
  }, [categoriesWithCounts, filteredItems]);

  const updatePanelGeometry = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const margin = vw < 640 ? 12 : 16;
    const mainEl = triggerRef.current.closest('main');
    const mainRect = mainEl ? mainEl.getBoundingClientRect() : null;
    const minLeft = mainRect ? Math.max(margin, mainRect.left + margin) : margin;
    const maxRight = mainRect ? Math.min(vw - margin, mainRect.right - margin) : vw - margin;
    const availableWidth = Math.max(260, maxRight - minLeft);
    const panelWidth = Math.min(460, availableWidth);
    const clampedViewportLeft = Math.max(minLeft, Math.min(rect.left, maxRight - panelWidth));

    setPanelGeometry({
      left: Math.round(clampedViewportLeft - rect.left),
      width: Math.round(panelWidth),
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    updatePanelGeometry();
    const rafId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });

    const handlePointerOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleResize = () => {
      updatePanelGeometry();
    };

    document.addEventListener('mousedown', handlePointerOutside);
    document.addEventListener('touchstart', handlePointerOutside, { passive: true });
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', handlePointerOutside);
      document.removeEventListener('touchstart', handlePointerOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, setOpen, updatePanelGeometry]);

  const handleSelectItem = (item) => {
    onSelect?.(item);
    setOpen(false);
    setQuery('');
    setActiveCategory('all');
  };

  const handleResetFilters = () => {
    setQuery('');
    setActiveCategory('all');
    searchInputRef.current?.focus();
  };

  const handleClearSearch = () => {
    setQuery('');
    searchInputRef.current?.focus();
  };

  // Move focus between search input and visible option buttons with arrow keys.
  const handlePanelKeyDown = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const listEl = listContainerRef.current;
    if (!listEl) return;

    const optionButtons = Array.from(listEl.querySelectorAll('button[data-tcode-item="true"]'));
    if (optionButtons.length === 0) return;

    const activeEl = document.activeElement;
    const currentIndex = optionButtons.indexOf(activeEl);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (currentIndex === -1) {
        optionButtons[0].focus();
      } else {
        optionButtons[Math.min(currentIndex + 1, optionButtons.length - 1)].focus();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (currentIndex <= 0) {
        searchInputRef.current?.focus();
      } else {
        optionButtons[currentIndex - 1].focus();
      }
    }
  };

  const normalizedSelected = String(selectedCode || '').trim().toUpperCase();

  return (
    <div ref={containerRef} className={`relative ${open ? 'z-50' : 'z-auto'}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? panelId : undefined}
        style={{ transition: 'none' }}
        className={`group inline-flex min-h-[44px] lg:min-h-0 lg:h-9 shrink-0 cursor-pointer items-center gap-1 2xl:gap-2 rounded-lg border px-2 2xl:px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
          open
            ? 'border-emerald-900 bg-emerald-800 text-white shadow-xs'
            : 'border-emerald-600 bg-white text-emerald-900 hover:border-emerald-700 hover:bg-emerald-50 active:bg-emerald-100'
        }`}
      >
        <span>{buttonLabel}</span>
        <span
          className={`rounded-md px-1.5 py-0.5 font-mono text-[0.6875rem] font-bold tabular-nums leading-none ${
            open ? 'bg-white text-emerald-900' : 'bg-emerald-100 text-emerald-900'
          }`}
        >
          {cleanedItems.length}
        </span>
        {open ? (
          <ChevronUp size={14} aria-hidden="true" className="text-white shrink-0" />
        ) : (
          <ChevronDown size={14} aria-hidden="true" className="text-emerald-800 shrink-0" />
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Menu Pencarian Daftar T-Code dan Dokumen SAP PM"
          onKeyDown={handlePanelKeyDown}
          style={
            panelGeometry
              ? { left: `${panelGeometry.left}px`, width: `${panelGeometry.width}px` }
              : undefined
          }
          className="absolute top-full right-0 mt-2 z-50 w-[min(460px,calc(100vw-1.5rem))] rounded-2xl border border-slate-300 bg-white text-slate-900 shadow-2xl"
        >
          <div className="border-b border-slate-200 p-3 space-y-2.5 bg-white rounded-t-2xl">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={searchInputId}
                className="text-xs font-bold text-slate-800"
              >
                Cari T-Code atau Dokumen SOP
              </label>
              <span className="font-mono text-[0.6875rem] font-semibold text-slate-600 tabular-nums">
                {filteredItems.length} / {cleanedItems.length} item
              </span>
            </div>

            <div className="relative">
              <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />
              <input
                ref={searchInputRef}
                id={searchInputId}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search T-Code or description..."
                className="min-h-[44px] lg:min-h-[40px] w-full rounded-xl border border-slate-500 bg-white pl-9 pr-12 lg:pr-10 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-600 focus:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-emerald-700"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Hapus kata kunci pencarian"
                  className="absolute right-0 lg:right-1.5 top-1/2 -translate-y-1/2 inline-flex min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:h-8 lg:w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 focus-visible:outline-2 focus-visible:outline-emerald-700"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="Filter kategori T-Code"
              className="flex items-center gap-2 lg:gap-1.5 overflow-x-auto px-0.5 py-1"
            >
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                aria-pressed={activeCategory === 'all'}
                style={{ transition: 'none' }}
                className={`min-h-[44px] lg:min-h-[34px] shrink-0 cursor-pointer rounded-lg border px-2.5 py-1 text-[0.6875rem] font-semibold focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                  activeCategory === 'all'
                    ? 'border-emerald-900 bg-emerald-800 text-white'
                    : 'border-slate-500 bg-slate-100 text-slate-800 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                Semua ({cleanedItems.length})
              </button>

              {categoriesWithCounts.map((cat) => {
                const isSelected = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(cat.key)}
                    aria-pressed={isSelected}
                    style={{ transition: 'none' }}
                    className={`min-h-[44px] lg:min-h-[34px] shrink-0 cursor-pointer rounded-lg border px-2.5 py-1 text-[0.6875rem] font-semibold focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                      isSelected
                        ? 'border-emerald-900 bg-emerald-800 text-white'
                        : 'border-slate-500 bg-white text-slate-800 hover:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
                    }`}
                  >
                    {cat.shortLabel} ({cat.count})
                  </button>
                );
              })}
            </div>
          </div>

          <div
            ref={listContainerRef}
            className="max-h-[min(22.5rem,55vh)] overflow-y-auto overscroll-contain p-2 space-y-3"
          >
            {isLoading && (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center"
              >
                <div className="h-6 w-6 rounded-full border-2 border-emerald-200 border-t-emerald-700 animate-spin motion-reduce:animate-none" />
                <p className="text-xs font-semibold text-slate-800">
                  Memuat daftar T-Code SAP PM...
                </p>
              </div>
            )}

            {!isLoading && error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-700 bg-rose-50 p-4 text-left space-y-2"
              >
                <p className="text-xs font-bold text-rose-900">
                  Gagal memuat daftar T-Code
                </p>
                <p className="text-xs text-rose-800">
                  {typeof error === 'string' ? error : 'Terjadi kendala saat membaca data referensi.'}
                </p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="min-h-[44px] lg:min-h-[36px] inline-flex cursor-pointer items-center rounded-lg border border-rose-800 bg-white px-3 py-1.5 text-xs font-bold text-rose-900 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-rose-800"
                  >
                    Coba lagi
                  </button>
                )}
              </div>
            )}

            {!isLoading && !error && cleanedItems.length === 0 && (
              <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-8 text-center space-y-1.5">
                <p className="text-xs font-bold text-slate-900">
                  Katalog T-Code belum tersedia
                </p>
                <p className="text-xs text-slate-600">
                  Tambahkan minimal satu T-Code atau dokumen referensi untuk ditampilkan.
                </p>
              </div>
            )}

            {!isLoading && !error && cleanedItems.length > 0 && groupedItems.length === 0 && (
              <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-8 text-center space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">
                    Tidak ada hasil yang cocok
                  </p>
                  <p className="text-xs text-slate-600">
                    Tidak ditemukan T-Code atau dokumen untuk kata kunci{' '}
                    {query.trim() ? (
                      <span className="font-mono font-bold text-slate-900">&quot;{query.trim()}&quot;</span>
                    ) : (
                      'pada kategori terpilih'
                    )}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="min-h-[44px] lg:min-h-[36px] inline-flex cursor-pointer items-center justify-center rounded-lg border border-emerald-900 bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 active:bg-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Reset pencarian &amp; filter
                </button>
              </div>
            )}

            {!isLoading &&
              !error &&
              groupedItems.map((group) => (
                <section key={group.key} aria-label={group.label} className="space-y-1">
                  <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5">
                    <span className="text-xs font-bold text-slate-900">{group.label}</span>
                    <span className="font-mono text-[0.6875rem] font-bold text-slate-700 tabular-nums">
                      {group.items.length}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isDoc = item.type === 'document';
                      const isActive = selectedItemId
                        ? item.id === selectedItemId
                        : !isDoc &&
                          normalizedSelected !== '' &&
                          normalizedSelected
                            .split('/')
                            .map((part) => part.trim())
                            .includes(item.code.toUpperCase());

                      return (
                        <button
                          key={item.id || item.fileName || item.code}
                          type="button"
                          data-tcode-item="true"
                          onClick={() => handleSelectItem(item)}
                          className={`w-full min-h-[44px] cursor-pointer rounded-xl border px-2.5 py-2 text-left transition-colors flex items-start gap-2.5 focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                            isActive
                              ? 'border-emerald-700 bg-emerald-50 text-slate-900'
                              : 'border-transparent bg-white text-slate-900 hover:border-emerald-600 hover:bg-emerald-50 active:bg-emerald-100'
                          }`}
                        >
                          {isDoc ? (
                            <span className="mt-0.5 inline-flex min-w-[4.5rem] shrink-0 items-center justify-center gap-1 rounded-md border border-amber-700 bg-amber-50 px-2 py-1 font-mono text-[0.6875rem] font-bold text-amber-900">
                              <FileText size={12} aria-hidden="true" />
                              <span>DOCX</span>
                            </span>
                          ) : (
                            <span
                              className={`mt-0.5 inline-flex min-w-[4.5rem] shrink-0 items-center justify-center rounded-md border px-2 py-1 font-mono text-xs font-bold ${
                                isActive
                                  ? 'border-emerald-900 bg-emerald-800 text-white'
                                  : 'border-emerald-600 bg-emerald-50 text-emerald-900'
                              }`}
                            >
                              {item.code}
                            </span>
                          )}

                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-slate-900 leading-snug break-words">
                              {isDoc ? item.fileName : item.description}
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] text-slate-600">
                              <span>
                                {isDoc
                                  ? item.description
                                  : item.hasDirectGuide
                                    ? 'Panduan SAP GUI tersedia'
                                    : item.targetKey === 'troubleshoot'
                                      ? 'Terkait Klinik Troubleshooting'
                                      : 'Referensi modul SAP PM'}
                              </span>
                              {isActive && (
                                <span className="font-bold text-emerald-900">
                                  (Aktif)
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
