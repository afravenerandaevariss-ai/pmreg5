import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, ChevronDown } from 'lucide-react';
import { fetchLiveChats, saveLiveChats } from '../lib/supabaseService';
import { supabase } from '../lib/supabase';

export default function AfraChatbot({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'welcome', sender_type: 'admin', text: 'Halo! Saya Key User PM. Ada pertanyaan terkait modul SAP Plant Maintenance?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef(null);

  const loadMessages = async () => {
    if (!currentUser?.nik) return;
    const { data } = await fetchLiveChats();
    const myChats = (data || []).filter(c => c.user_nik === currentUser.nik);
    if (myChats.length > 0) {
      setMessages([
        { id: 'welcome', sender_type: 'admin', text: 'Halo! Saya Key User PM. Ada pertanyaan terkait modul SAP Plant Maintenance?' },
        ...myChats
      ]);
    }
  };

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel('public:hierarchy_data_chat')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hierarchy_data', filter: 'id=eq.11' }, (payload) => {
        if (!currentUser?.nik) return;
        const myChats = (payload.new.data || []).filter(c => c.user_nik === currentUser.nik);
        if (myChats.length > 0) {
          setMessages([
            { id: 'welcome', sender_type: 'admin', text: 'Halo! Saya Key User PM. Ada pertanyaan terkait modul SAP Plant Maintenance?' },
            ...myChats
          ]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const presetQuestions = [
    {
      q: "Batas waktu pengisian Logbook?",
      a: "Pengisian logbook harian wajib diselesaikan maksimal H+1 pukul 09:00 pagi setiap harinya untuk memastikan sinkronisasi berjalan lancar."
    },
    {
      q: "T-Code input HM alat berat?",
      a: "Untuk input HM kendaraan dan alat berat, gunakan T-Code ZESTHLP16PA pada modul SAP Front End."
    },
    {
      q: "Bagaimana cara membuat Berita Acara Equipment?",
      a: "Silakan pilih menu Berita Acara pada bagian Sinkronisasi & Laporan -> pilih unit/kebun -> muat data -> edit di G-sheet -> kembali ke web -> muat data -> cetak PDF. Data sudah otomatis tersimpan di web."
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 30;
    setIsAtBottom(isBottom);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (text) => {
    const userText = text || inputValue;
    if (!userText.trim() || !currentUser?.nik) return;

    const presetMatch = presetQuestions.find(pq => pq.q === userText);
    
    const newMsg = {
      id: crypto.randomUUID(),
      user_nik: currentUser.nik,
      user_name: currentUser.name || 'User',
      plant: currentUser.plant || '',
      sender_type: 'user',
      text: userText,
      is_read: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    setInputValue('');

    const { data } = await fetchLiveChats();
    let updatedDb = [...(data || []), newMsg];
    
    if (presetMatch) {
      const autoReply = {
        id: crypto.randomUUID(),
        user_nik: currentUser.nik,
        user_name: currentUser.name || 'User',
        plant: currentUser.plant || '',
        sender_type: 'admin',
        text: presetMatch.a,
        is_read: true,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, autoReply]);
      updatedDb.push(autoReply);
    } else {
      try {
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: "YOUR_WEB3FORMS_ACCESS_KEY_HERE",
            subject: `Pesan Baru dari ${currentUser.name} di SAP PM Chat`,
            from_name: "SAP PM Live Chat",
            message: `Ada pesan baru masuk di Inbox Bantuan web SAP PM.\n\nPengirim: ${currentUser.name} (${currentUser.nik})\nUnit: ${currentUser.plant}\n\nPesan:\n"${userText}"\n\nSilakan buka Dashboard Admin untuk membalas.`,
            to: "afravenerandaevariss@gmail.com"
          })
        });
      } catch (e) {
        console.error("Email notification failed", e);
      }
    }
    
    await saveLiveChats(updatedDb);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 group">
          {/* Speech Bubble */}
          <div 
            onClick={() => setIsOpen(true)}
            className="bg-white text-slate-700 px-3 py-1.5 rounded-2xl rounded-br-sm shadow-lg text-[10px] font-bold border border-slate-100 flex items-center justify-center cursor-pointer hover:-translate-y-1 transition-transform animate-bounce hover:animate-none"
            style={{ animationDuration: '2s' }}
          >
            Hi, butuh bantuan? 👋
          </div>
          
          <button
            onClick={() => setIsOpen(true)}
            className="bg-[#064e3b] hover:bg-[#065f46] text-white p-1 rounded-full shadow-2xl hover:shadow-xl transition-all duration-300 flex items-center justify-center w-14 h-14 shrink-0 hover:scale-110"
            title="Tanya Key User PM"
          >
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse z-10" />
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/30 relative">
              <img src="/afra.png" alt="Key User PM" className="w-full h-full object-cover" style={{ transform: 'scale(2.8)', transformOrigin: '50% 18%' }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
            </div>
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[340px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-[#064e3b] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                  <img src="/afra.png" alt="Key User" className="w-full h-full object-cover" style={{ transform: 'scale(2.8)', transformOrigin: '50% 18%' }} onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=Key+User&background=10b981&color=fff&size=40" }} />
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#064e3b]" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Key User PM</h3>
                <p className="text-[10px] text-emerald-100/90 font-medium">Aktif membalas</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4 relative" 
            onScroll={handleScroll}
            style={{ backgroundColor: '#e8efe5', backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5d5c0' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
          >
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">
                Hari ini
              </span>
            </div>

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {msg.sender_type === 'admin' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0 mb-1 overflow-hidden">
                    <img src="/afra.png" alt="Key User" className="w-full h-full object-cover" style={{ transform: 'scale(2.8)', transformOrigin: '50% 18%' }} onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=K+U&background=10b981&color=fff&size=24" }} />
                  </div>
                )}
                
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.sender_type === 'user' 
                    ? 'bg-[#064e3b] text-white rounded-br-sm' 
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Questions Menu (Suggested) */}
          <div 
            className={`flex flex-col gap-2 overflow-y-auto transition-all duration-300 ease-in-out ${isAtBottom ? 'max-h-[240px] opacity-100 p-3 pb-2' : 'max-h-0 opacity-0 p-0 m-0 overflow-hidden'}`} 
            style={{ backgroundColor: '#e8efe5', backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5d5c0' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
          >
            {presetQuestions.map((pq, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(pq.q)}
                className="text-left bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                {pq.q}
              </button>
            ))}
            
            <a 
              href="https://wa.me/6281234567890?text=Halo,%20saya%20ingin%20bertanya%20seputar%20SAP%20PM" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-center bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm mt-2 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Chat Langsung via WhatsApp
            </a>
          </div>

          {/* Input Area */}
          <div className="bg-white p-3 border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ketik pertanyaan..."
              className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={() => handleSend()}
              disabled={!inputValue.trim()}
              className="w-8 h-8 rounded-full bg-[#064e3b] hover:bg-[#065f46] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={14} className="mr-0.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
