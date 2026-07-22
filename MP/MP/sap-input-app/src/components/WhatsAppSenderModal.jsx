import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, Copy, ExternalLink, Settings, Clock, Smartphone, MessageSquare, ShieldCheck } from 'lucide-react';
import { fetchWAConfig, saveWAConfig, fetchWALogs, saveWALog } from '../lib/supabaseService';

export default function WhatsAppSenderModal({ isOpen, onClose, summaryData, targetInputDate }) {
  const [targetPhone, setTargetPhone] = useState('081251334618');
  const [targetGroup, setTargetGroup] = useState('Group PM');
  const [provider, setProvider] = useState('gowa');
  const [apiToken, setApiToken] = useState('');
  const [gowaUrl, setGowaUrl] = useState('https://gowa.waterflai.my.id');
  const [gowaUser, setGowaUser] = useState('admin');
  const [gowaPass, setGowaPass] = useState('Sedap321#');
  const [gowaDevice, setGowaDevice] = useState('黄玲玲');
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const [sendTime, setSendTime] = useState('08:00 & 15:30');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('send'); // 'send', 'settings', 'logs'
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadLogs();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    const { data } = await fetchWAConfig();
    if (data) {
      if (data.targetPhone) setTargetPhone(data.targetPhone);
      if (data.targetGroup) setTargetGroup(data.targetGroup);
      if (data.provider) setProvider(data.provider);
      if (data.apiToken) setApiToken(data.apiToken);
      if (data.gowaUrl) setGowaUrl(data.gowaUrl);
      if (data.gowaUser) setGowaUser(data.gowaUser);
      if (data.gowaPass) setGowaPass(data.gowaPass);
      if (data.gowaDevice) setGowaDevice(data.gowaDevice);
      if (data.autoSendEnabled !== undefined) setAutoSendEnabled(data.autoSendEnabled);
      if (data.sendTime) setSendTime(data.sendTime);
    }
  };

  const loadLogs = async () => {
    const { data } = await fetchWALogs();
    if (data) setLogs(data);
  };

  const handleSaveConfig = async () => {
    const config = {
      targetPhone,
      targetGroup,
      provider,
      apiToken,
      gowaUrl,
      gowaUser,
      gowaPass,
      gowaDevice,
      autoSendEnabled,
      sendTime,
      updatedAt: new Date().toISOString()
    };
    const { error } = await saveWAConfig(config);
    if (error) {
      setStatusMsg({ type: 'error', text: 'Gagal menyimpan konfigurasi: ' + error.message });
    } else {
      setStatusMsg({ type: 'success', text: 'Konfigurasi WhatsApp berhasil disimpan ke database!' });
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  // Generate WA text
  const generateWAText = () => {
    let reportDateStr = '-';
    try {
      const parts = (targetInputDate || '').split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      reportDateStr = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
      reportDateStr = targetInputDate;
    }

    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;

    let text = `*Monitoring Transaksi Logbook tanggal 1 s.d ${reportDateStr} ${timeFormatted}*\n`;
    text += `*REGIONAL 5*\n`;
    text += `Target input logbook : *${reportDateStr}* (H-1)\n\n`;

    text += `\`\`\`\n`;
    text += `+-------+-------------------------+------+----------+-----+-----+--------+------------+------+\n`;
    text += `| Plant | Description             | Veh  | Total Tx | UTD | TUTD| % UTD  | Last Log   | Rank |\n`;
    text += `+-------+-------------------------+------+----------+-----+-----+--------+------------+------+\n`;

    const sorted = [...(summaryData || [])].sort((a, b) => (a.rank || 0) - (b.rank || 0));
    sorted.forEach(item => {
      const pCode = (item.plant || '').padEnd(5);
      const dDesc = (item.desc || '').length > 23 ? item.desc.substring(0, 20) + '...' : (item.desc || '').padEnd(23);
      const vCount = String(item.vehicleCount || 0).padStart(4);
      const tTx = String(item.totalTx || 0).padStart(8);
      const utd = String(item.utdCount || 0).padStart(3);
      const tutd = String(item.tutdCount || 0).padStart(3);
      const pct = `${(item.pctUtd || 0).toFixed(1)}%`.padStart(6);
      const lastD = (item.lastLogDate ? item.lastLogDate.split('-').reverse().join('/') : '-').padStart(10);
      const rk = String(item.rank || '-').padStart(4);

      text += `| ${pCode} | ${dDesc} | ${vCount} | ${tTx} | ${utd} | ${tutd} | ${pct} | ${lastD} | ${rk} |\n`;
    });

    text += `+-------+-------------------------+------+----------+-----+-----+--------+------------+------+\n`;
    text += `\`\`\`\n`;
    text += `\n_Laporan otomatis dikirim setiap jam 08:00 WIB dari https://pmreg5.afratarigan.my.id_`;

    return text;
  };

  const handleCopyText = () => {
    const text = generateWAText();
    navigator.clipboard.writeText(text);
    setStatusMsg({ type: 'success', text: 'Teks laporan WhatsApp berhasil disalin ke clipboard!' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleOpenWAWeb = () => {
    const text = generateWAText();
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSendApiNow = async () => {
    setSending(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/send-wa?target=${encodeURIComponent(targetPhone)}&token=${encodeURIComponent(apiToken)}&provider=${encodeURIComponent(provider)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Laporan berhasil dikirim ke ${targetPhone}!` });
        await saveWALog({
          timestamp: new Date().toISOString(),
          target: targetPhone,
          status: data.dispatchResult?.success ? 'SUCCESS' : 'PROCESSED',
          detail: data.dispatchResult?.detail ? JSON.stringify(data.dispatchResult.detail) : 'Teks dikirim via API',
          summaryCount: summaryData?.length || 0
        });
        loadLogs();
      } else {
        throw new Error(data.error || 'Gagal mengirim pesan');
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Gagal mengirim via API: ' + err.message + '. Gunakan tombol WA Web di bawah sebagai alternatif langsung.' });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const currentReportText = generateWAText();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600/50 p-2.5 rounded-2xl border border-emerald-400/30">
              <MessageSquare size={22} className="text-emerald-200" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-wide flex items-center gap-2">
                Otomatisasi WhatsApp Logbook
                <span className="bg-emerald-500/40 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full border border-emerald-300/30">
                  Daily 08:00 AM
                </span>
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Pengiriman Laporan Rekap Regional 5 ke {targetPhone} ({targetGroup})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
              activeTab === 'send' 
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send size={14} /> Kirim & Preview WA
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
              activeTab === 'settings' 
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings size={14} /> Pengaturan API & Jadwal 8 AM
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
              activeTab === 'logs' 
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={14} /> Riwayat Pengiriman ({logs.length})
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={`mx-6 mt-4 p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: Kirim & Preview */}
          {activeTab === 'send' && (
            <div className="space-y-4">
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Smartphone size={14} className="text-emerald-600" />
                    Target WhatsApp Rekap:
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{targetPhone}</span>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                      {targetGroup}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-300"
                  >
                    <Copy size={13} /> Salin Teks
                  </button>
                  <button
                    onClick={handleOpenWAWeb}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    <ExternalLink size={13} /> Buka di WA Web
                  </button>
                  <button
                    onClick={handleSendApiNow}
                    disabled={sending}
                    className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                  >
                    <Send size={13} /> {sending ? 'Sending...' : 'Kirim via Gateway API'}
                  </button>
                </div>
              </div>

              {/* Preview Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                  <span>Pratinjau Format Pesan WhatsApp:</span>
                  <span className="text-[10px] text-slate-500 font-normal">Monospace Table View</span>
                </label>
                <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner max-h-72 whitespace-pre">
                  {currentReportText}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp / Target Group:
                  </label>
                  <input
                    type="text"
                    value={targetPhone}
                    onChange={e => setTargetPhone(e.target.value)}
                    placeholder="081251334618"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Gunakan format 0812... atau Group ID
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Label Nama Group / Penerima:
                  </label>
                  <input
                    type="text"
                    value={targetGroup}
                    onChange={e => setTargetGroup(e.target.value)}
                    placeholder="Group PM"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Penyedia WA Gateway API:
                  </label>
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="gowa">GoWA Waterflai API Gateway (gowa.waterflai.my.id)</option>
                    <option value="fonnte">Fonnte API (fonnte.com)</option>
                    <option value="custom">Custom Webhook Endpoint</option>
                  </select>
                </div>

                {provider === 'gowa' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      GoWA Server URL:
                    </label>
                    <input
                      type="text"
                      value={gowaUrl}
                      onChange={e => setGowaUrl(e.target.value)}
                      placeholder="https://gowa.waterflai.my.id"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fonnte / Gateway Token:
                    </label>
                    <input
                      type="password"
                      value={apiToken}
                      onChange={e => setApiToken(e.target.value)}
                      placeholder="Masukkan API Token Fonnte..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {provider === 'gowa' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">GoWA Admin Username:</label>
                    <input
                      type="text"
                      value={gowaUser}
                      onChange={e => setGowaUser(e.target.value)}
                      placeholder="admin"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">GoWA Password:</label>
                    <input
                      type="password"
                      value={gowaPass}
                      onChange={e => setGowaPass(e.target.value)}
                      placeholder="Sedap321#"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Device ID:</label>
                    <input
                      type="text"
                      value={gowaDevice}
                      onChange={e => setGowaDevice(e.target.value)}
                      placeholder="黄玲玲"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Schedule Info Box */}
              <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900">
                      Jadwal Otomatis: 08:00 AM &amp; 05:15 PM (17:15 WIB)
                    </span>
                  </div>
                  <button
                    onClick={() => setAutoSendEnabled(!autoSendEnabled)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                      autoSendEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {autoSendEnabled ? 'Status: AKTIF (Vercel Cron & Task Scheduler)' : 'Status: NON-AKTIF'}
                  </button>
                </div>

                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Laporan rekap kendaraan Regional 5 secara otomatis dikirim 2x sehari (08:00 WIB &amp; 17:15 WIB) dalam format PDF 1 Halaman via GoWA Gateway (<code className="bg-emerald-100 px-1 py-0.5 rounded">https://gowa.waterflai.my.id</code>), Vercel Cron (<code className="bg-emerald-100 px-1 py-0.5 rounded">/api/send-wa</code>), dan Windows Task Scheduler (<code className="bg-emerald-100 px-1 py-0.5 rounded">PTPN_PM_Logbook_Daily_WA_Report_1715</code>).
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition"
                >
                  <ShieldCheck size={14} /> Simpan Konfigurasi
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700">Riwayat Eksekusi Pengiriman WA:</h3>
              {logs.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                  Belum ada log pengiriman tercatat.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {logs.map((log, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex justify-between items-center gap-3">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span>Target: {log.target}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(log.timestamp).toLocaleString('id-ID')} - {log.summaryCount} plant diproses
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 max-w-xs truncate">
                        {typeof log.detail === 'string' ? log.detail : JSON.stringify(log.detail)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-between items-center">
          <span className="text-[11px] text-slate-500">
            PTPN IV Regional 5 - Logbook Kendaraan Dispatcher
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
