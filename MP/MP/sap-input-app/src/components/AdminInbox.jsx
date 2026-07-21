import React, { useState, useEffect, useRef } from 'react';
import { fetchLiveChats, saveLiveChats } from '../lib/supabaseService';
import { supabase } from '../lib/supabase';
import { Send, User } from 'lucide-react';

export default function AdminInbox({ currentUser }) {
  const [chats, setChats] = useState([]);
  const [selectedUserNik, setSelectedUserNik] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const loadChats = async () => {
    const { data } = await fetchLiveChats();
    setChats(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadChats();
    const channel = supabase
      .channel('public:hierarchy_data')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hierarchy_data', filter: 'id=eq.11' }, (payload) => {
        setChats(payload.new.data || []);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (selectedUserNik) {
      markAsRead(selectedUserNik);
    }
  }, [chats, selectedUserNik]);

  const markAsRead = async (nik) => {
    const hasUnread = chats.some(c => c.user_nik === nik && c.sender_type === 'user' && !c.is_read);
    if (!hasUnread) return;
    
    const updated = chats.map(c => {
      if (c.user_nik === nik && c.sender_type === 'user') return { ...c, is_read: true };
      return c;
    });
    setChats(updated);
    await saveLiveChats(updated);
  };

  const handleSend = async () => {
    if (!replyText.trim() || !selectedUserNik) return;
    
    const targetChat = chats.find(c => c.user_nik === selectedUserNik);
    const newMsg = {
      id: crypto.randomUUID(),
      user_nik: selectedUserNik,
      user_name: targetChat?.user_name || 'User',
      plant: targetChat?.plant || '',
      sender_type: 'admin',
      text: replyText.trim(),
      is_read: true,
      created_at: new Date().toISOString()
    };
    
    const updated = [...chats, newMsg];
    setChats(updated);
    setReplyText('');
    await saveLiveChats(updated);
  };

  const userMap = {};
  chats.forEach(c => {
    if (!userMap[c.user_nik]) userMap[c.user_nik] = {
      nik: c.user_nik,
      name: c.user_name,
      plant: c.plant,
      messages: [],
      unreadCount: 0,
      lastMessageAt: c.created_at
    };
    userMap[c.user_nik].messages.push(c);
    if (c.created_at > userMap[c.user_nik].lastMessageAt) {
      userMap[c.user_nik].lastMessageAt = c.created_at;
    }
    if (c.sender_type === 'user' && !c.is_read) {
      userMap[c.user_nik].unreadCount++;
    }
  });

  const userList = Object.values(userMap).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  const activeConversation = selectedUserNik ? userMap[selectedUserNik] : null;

  if (loading) return <div className="p-8 text-center text-slate-500 font-semibold">Memuat inbox...</div>;

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-bold text-slate-800">Inbox Bantuan</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {userList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Belum ada percakapan</div>
          ) : (
            userList.map(u => (
              <button 
                key={u.nik}
                onClick={() => setSelectedUserNik(u.nik)}
                className={`w-full text-left p-4 border-b border-slate-100 hover:bg-emerald-50 transition-colors flex items-center justify-between ${selectedUserNik === u.nik ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''}`}
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{u.name}</h4>
                  <p className="text-xs text-slate-500">{u.plant} - {u.nik}</p>
                </div>
                {u.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {u.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {activeConversation ? (
          <>
            <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3 shadow-sm z-10">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{activeConversation.name}</h3>
                <p className="text-xs text-slate-500">{activeConversation.plant} - NIK {activeConversation.nik}</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {activeConversation.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${msg.sender_type === 'admin' ? 'bg-[#064e3b] text-white rounded-br-sm' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'}`}>
                    {msg.text}
                    <div className={`text-[10px] mt-1 flex justify-end ${msg.sender_type === 'admin' ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ketik balasan..."
                  className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button 
                  onClick={handleSend}
                  disabled={!replyText.trim()}
                  className="bg-[#064e3b] hover:bg-[#065f46] text-white p-2.5 rounded-xl disabled:opacity-50 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Pilih percakapan dari panel kiri untuk mulai membalas
          </div>
        )}
      </div>
    </div>
  );
}
