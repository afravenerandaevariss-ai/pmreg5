import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { fetchLiveChats, saveLiveChats } from '../lib/supabaseService';
import { supabase } from '../lib/supabase';

// ─── Knowledge Base ──────────────────────────────────────────────────────────
const FAQ = [
  {
    q: "Batas waktu pengisian Logbook?",
    a: "Pengisian logbook harian wajib diselesaikan maksimal H+1 pukul 09:00 pagi setiap harinya untuk memastikan sinkronisasi berjalan lancar."
  },
  {
    q: "T-Code input HM alat berat?",
    a: "Untuk input HM kendaraan dan alat berat, gunakan T-Code ZESTHLP16PA pada modul SAP Front End."
  },
  {
    q: "Cara membuat Berita Acara Equipment?",
    a: "Pilih menu Berita Acara pada bagian Sinkronisasi & Laporan → pilih unit/kebun → muat data → edit di G-sheet → kembali ke web → muat data → cetak PDF. Data sudah otomatis tersimpan di web."
  },
  {
    q: "Plant tidak muncul di SAP?",
    a: "Pastikan Bapak/Ibu sudah memiliki otorisasi untuk Plant tersebut. Jika belum, silakan ajukan form penambahan otorisasi ke tim Keyuser."
  },
  {
    q: "Cara perbaiki error IK17?",
    a: "Jika error pada IK17, pastikan urutan tanggal Measurement Time tidak terbalik dengan data sebelumnya. Tanggal harus maju secara kronologis."
  }
];

const WA_URL = "https://wa.me/6281251334618?text=Halo,%20saya%20ingin%20bertanya%20seputar%20SAP%20PM";

const WA_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5d5c0' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

// ─── Component ───────────────────────────────────────────────────────────────
export default function AfraChatbot({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFaq, setShowFaq] = useState(true);
  // conversation = array of { id, role: 'user'|'bot', text }
  const [conversation, setConversation] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Load persisted chats from Supabase on open
  const loadMessages = async () => {
    if (!currentUser?.nik) return;
    const { data } = await fetchLiveChats();
    const mine = (data || []).filter(c => c.user_nik === currentUser.nik);
    if (mine.length > 0) {
      setConversation(mine.map(c => ({ id: c.id, role: c.sender_type === 'user' ? 'user' : 'bot', text: c.text })));
    }
  };

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel('public:hierarchy_data_chat')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hierarchy_data', filter: 'id=eq.11' }, (payload) => {
        if (!currentUser?.nik) return;
        const mine = (payload.new.data || []).filter(c => c.user_nik === currentUser.nik);
        if (mine.length > 0) {
          setConversation(mine.map(c => ({ id: c.id, role: c.sender_type === 'user' ? 'user' : 'bot', text: c.text })));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isOpen]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (text) => {
    const userText = (text || inputValue).trim();
    if (!userText || !currentUser?.nik) return;
    setInputValue('');

    const userEntry = { id: crypto.randomUUID(), role: 'user', text: userText };
    const faqMatch = FAQ.find(f => f.q === userText);

    // Hide FAQ chips when a question is sent
    setShowFaq(false);

    let botEntry;
    if (faqMatch) {
      botEntry = { id: crypto.randomUUID(), role: 'bot', text: faqMatch.a };
    } else {
      botEntry = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: null,
        isWaRedirect: true
      };
      // Show FAQ again after WA redirect so user can try another question
      setTimeout(() => setShowFaq(true), 800);
    }

    setConversation(prev => [...prev, userEntry, botEntry]);

    // Persist to Supabase
    const { data: dbData } = await fetchLiveChats();
    const toSave = [
      ...(dbData || []),
      { id: userEntry.id, user_nik: currentUser.nik, user_name: currentUser.name || 'User', plant: currentUser.plant || '', sender_type: 'user', text: userText, is_read: false, created_at: new Date().toISOString() },
      { id: botEntry.id, user_nik: currentUser.nik, user_name: currentUser.name || 'User', plant: currentUser.plant || '', sender_type: 'admin', text: faqMatch ? faqMatch.a : '→ WA redirect', is_read: true, created_at: new Date().toISOString() }
    ];
    await saveLiveChats(toSave);
  };

  // ── Avatar helper ─────────────────────────────────────────────────────────
  const Avatar = ({ size = 6 }) => (
    <div className={`w-${size} h-${size} rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      <img src="/afra.png" alt="Key User" className="w-full h-full object-cover"
        style={{ transform: 'scale(2.8)', transformOrigin: '50% 18%' }}
        onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=K+U&background=10b981&color=fff&size=24"; }} />
    </div>
  );

  const WaBtn = () => (
    <a href={WA_URL} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm mt-1">
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
      Chat Langsung via WhatsApp
    </a>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          <div onClick={() => setIsOpen(true)}
            className="bg-white text-slate-700 px-3 py-1.5 rounded-2xl rounded-br-sm shadow-lg text-[10px] font-bold border border-slate-100 cursor-pointer hover:-translate-y-1 transition-transform animate-bounce hover:animate-none"
            style={{ animationDuration: '2s' }}>
            Hi, butuh bantuan? 👋
          </div>
          <button onClick={() => setIsOpen(true)}
            className="relative bg-[#064e3b] hover:bg-[#065f46] text-white p-1 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center w-14 h-14 shrink-0 hover:scale-110"
            title="Tanya Key User PM">
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse z-10" />
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/30">
              <img src="/afra.png" alt="Key User PM" className="w-full h-full object-cover"
                style={{ transform: 'scale(2.8)', transformOrigin: '50% 18%' }}
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
            </div>
          </button>
        </div>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[340px] h-[520px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 bg-white">

          {/* Header */}
          <div className="bg-[#064e3b] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-emerald-500 rounded-full border-2 border-white shadow-sm overflow-hidden">
                  <img src="/afra.png" alt="Key User" className="w-full h-full object-cover"
                    style={{ transform: 'scale(2.8)', transformOrigin: '50% 18%' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=Key+User&background=10b981&color=fff&size=40"; }} />
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#064e3b]" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Key User PM</h3>
                <p className="text-[10px] text-emerald-100/90 font-medium">Aktif membalas</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Single scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto"
            style={{ backgroundColor: '#e8efe5', backgroundImage: WA_PATTERN }}>
            <div className="flex flex-col p-4 gap-3">

              {/* ── Welcome card (always shown at top) ─────────────────── */}
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex-shrink-0 overflow-hidden mb-1">
                  <img src="/afra.png" alt="" className="w-full h-full object-cover"
                    style={{ transform: 'scale(2.8)', transformOrigin: '50% 18%' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=K+U&background=10b981&color=fff&size=28"; }} />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-slate-100 max-w-[82%]">
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                    Halo! Saya Key User PM. Ada pertanyaan terkait modul SAP Plant Maintenance?
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Pilih pertanyaan di bawah atau ketik sendiri.</p>
                </div>
              </div>

              {/* ── Suggested FAQ chips ─────────────────────────────────── */}
              {conversation.length === 0 && (
                <div className="flex flex-col gap-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Contoh pertanyaan</p>
                  {FAQ.map((faq, idx) => (
                    <button key={idx}
                      onClick={() => handleSend(faq.q)}
                      className="text-left bg-white/90 hover:bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 px-4 py-3 text-xs font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-px"
                      style={{
                        borderRadius: idx === 0 ? '12px 12px 0 0' : idx === FAQ.length - 1 ? '0 0 12px 12px' : '0',
                        borderTopWidth: idx === 0 ? '1px' : '0',
                      }}
                    >
                      {faq.q}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Conversation ────────────────────────────────────────── */}
              {conversation.map((msg) => (
                <div key={msg.id}>
                  {msg.role === 'user' ? (
                    /* User bubble */
                    <div className="flex justify-end">
                      <div className="bg-[#064e3b] text-white px-3.5 py-2.5 rounded-2xl rounded-br-sm text-xs leading-relaxed shadow-sm max-w-[80%]">
                        {msg.text}
                      </div>
                    </div>
                  ) : msg.isWaRedirect ? (
                    /* Bot → WA redirect */
                    <div className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 flex-shrink-0 mb-1 overflow-hidden">
                        <img src="/afra.png" alt="" className="w-full h-full object-cover"
                          style={{ transform: 'scale(2.8)', transformOrigin: '50% 18%' }}
                          onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=K+U&background=10b981&color=fff&size=24"; }} />
                      </div>
                      <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm border border-slate-100 max-w-[80%] flex flex-col gap-2">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Pertanyaan ini belum ada di Knowledge Base kami. Anda bisa <strong>tunggu sebentar</strong> untuk balasan dari tim, atau langsung hubungi Key User PM via WhatsApp.
                        </p>
                        <WaBtn />
                      </div>
                    </div>
                  ) : (
                    /* Bot → FAQ answer */
                    <div className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 flex-shrink-0 mb-1 overflow-hidden">
                        <img src="/afra.png" alt="" className="w-full h-full object-cover"
                          style={{ transform: 'scale(2.8)', transformOrigin: '50% 18%' }}
                          onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=K+U&background=10b981&color=fff&size=24"; }} />
                      </div>
                      <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm border border-slate-100 text-xs text-slate-700 leading-relaxed max-w-[80%]">
                        {msg.text}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* FAQ chips — hidden when user is focused on a Q&A, shown via showFaq */}
              {showFaq && (
                <div className="flex flex-col gap-0 mt-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">
                    {conversation.length === 0 ? 'Contoh pertanyaan' : 'Pertanyaan lainnya'}
                  </p>
                  {FAQ.map((faq, idx) => (
                    <button key={idx}
                      onClick={() => handleSend(faq.q)}
                      className="text-left bg-white/90 hover:bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 px-4 py-3 text-xs font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-px"
                      style={{
                        borderRadius: idx === 0 ? '12px 12px 0 0' : idx === FAQ.length - 1 ? '0 0 12px 12px' : '0',
                        borderTopWidth: idx === 0 ? '1px' : '0',
                      }}
                    >
                      {faq.q}
                    </button>
                  ))}
                  {/* Button to show FAQ again if hidden */}
                </div>
              )}

              {/* Show FAQ button when hidden after answering */}
              {!showFaq && conversation.length > 0 && (
                <button
                  onClick={() => setShowFaq(true)}
                  className="text-[10px] text-emerald-700 font-semibold hover:underline text-center py-1 select-none"
                >
                  ↩ Pertanyaan lainnya
                </button>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Fixed input */}
          <div className="bg-white p-3 border-t border-slate-200 flex items-center gap-2 flex-shrink-0">
            <input type="text" placeholder="Ketik pertanyaan..."
              className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
            <button onClick={() => handleSend()} disabled={!inputValue.trim()}
              className="w-8 h-8 rounded-full bg-[#064e3b] hover:bg-[#065f46] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <Send size={14} className="mr-0.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
