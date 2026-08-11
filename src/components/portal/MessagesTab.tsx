import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Check, ShieldCheck, RefreshCw, User } from 'lucide-react';
import { useNotification } from '../NotificationProvider';

interface MessagesTabProps {
  patientData: any;
}

export default function MessagesTab({ patientData }: MessagesTabProps) {
  const { notify } = useNotification();
  const [inputText, setInputText] = useState('');
  const [category, setCategory] = useState('Question');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'clinic',
      senderName: 'Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon)',
      text: 'Hello Aditya! How is your orthodontic bracket alignment feeling? Is there any localized pain on the back molars?',
      time: 'Yesterday, 10:30 AM',
      category: 'Care Checkup'
    },
    {
      id: 2,
      sender: 'patient',
      senderName: 'Aditya Sharma',
      text: 'Hi Doctor! It felt tight for the first 3 days but now it is quite stable. No bleeding or ulcerations on the cheeks.',
      time: 'Yesterday, 11:15 AM',
      category: 'Care Checkup'
    },
    {
      id: 3,
      sender: 'clinic',
      senderName: 'SCDC Reception Desk',
      text: 'Excellent! Keep wearing the auxiliary elastic rings. We have uploaded your Panoramic OPG Radiograph to your Clinical Documents vault. Let us know if you need any printed copy.',
      time: 'Yesterday, 02:45 PM',
      category: 'Document Upload'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      sender: 'patient',
      senderName: patientData?.name || 'Aditya Sharma',
      text: inputText,
      time: 'Just Now',
      category: category
    };

    setMessages(prev => [...prev, newMessage]);
    const originalText = inputText;
    setInputText('');
    setSending(true);

    // Simulate Clinic Auto-Responder
    setTimeout(() => {
      let responseText = "Thanks for your message! SCDC clinic administrators have received your inquiry regarding " + category.toLowerCase() + ". We will review with Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon) and respond within 1 hour.";
      
      if (category === 'Document Request') {
        responseText = "Understood. We are compiling your treatment record sheet and will upload it directly to your Documents vault momentarily. A WhatsApp confirmation will follow.";
      } else if (category === 'Billing query') {
        responseText = "Our accounts desk has noted your billing question. We will cross-reference with your active ledger balance and call you shortly.";
      }

      const clinicResponse = {
        id: messages.length + 2,
        sender: 'clinic',
        senderName: 'SCDC Front Desk Desk',
        text: responseText,
        time: 'Just Now',
        category: category
      };

      setMessages(prev => [...prev, clinicResponse]);
      setSending(false);
      notify('success', 'Inquiry Dispatched', 'A secure encrypted alert has been delivered to SCDC Reception node.');
    }, 1500);
  };

  return (
    <div id="messages-tab-container" className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* 1. DISPATCH OPTIONS SIDEBAR */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 h-fit">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3">
          <MessageSquare size={14} className="text-teal-600" /> New Secured Dispatch
        </span>

        <form onSubmit={handleSendMessage} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Inquiry Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 cursor-pointer"
            >
              <option value="Question">Question for Surgeon</option>
              <option value="Document Request">Request clinical document copies</option>
              <option value="Billing query">Billing & GST Invoice Query</option>
              <option value="Emergency alert">Urgent Orthodontic Wire Pain</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Message description</label>
            <textarea
              required
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Outline your questions, drug clarifications or document request specifics..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full h-9 bg-teal-600 hover:bg-teal-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {sending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            <span>Send Secure Message</span>
          </button>
        </form>

        <div className="pt-2 border-t text-[10px] text-slate-450 leading-relaxed font-semibold">
          🛡️ <strong>E2EE HIPAA Vault</strong>: Communication is protected by secure transport SSL layers directly inside Sri Chaitanya clinical node servers.
        </div>
      </div>

      {/* 2. CHAT FEED BLOCK */}
      <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[520px] overflow-hidden">
        
        {/* Chat Feed Header */}
        <div className="bg-slate-50 px-5 py-3.5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Secured SCDC Support Feed</h4>
          </div>
          <span className="px-2 py-0.5 bg-emerald-150/15 border border-emerald-150/50 text-emerald-700 rounded text-[9px] font-bold flex items-center gap-0.5 uppercase tracking-wide">
            <ShieldCheck size={11} /> Connected Securely
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
          {messages.map((msg) => {
            const isClinic = msg.sender === 'clinic';
            return (
              <div key={msg.id} className={`flex ${isClinic ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-md rounded-2xl p-4 space-y-1.5 shadow-2xs border ${
                  isClinic 
                    ? 'bg-white border-slate-200 text-slate-800 rounded-tl-none' 
                    : 'bg-teal-600 border-teal-600 text-white rounded-tr-none'
                }`}>
                  <div className="flex items-center gap-1.5 justify-between">
                    <span className={`text-[9.5px] font-extrabold flex items-center gap-1 ${isClinic ? 'text-teal-700' : 'text-teal-100'}`}>
                      {isClinic ? '🏥' : <User size={9} />} {msg.senderName}
                    </span>
                    <span className={`text-[8.5px] font-mono ${isClinic ? 'text-slate-400' : 'text-teal-200'}`}>
                      {msg.category}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed font-semibold">{msg.text}</p>
                  <p className={`text-[8.5px] font-mono text-right ${isClinic ? 'text-slate-400' : 'text-teal-200'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

    </div>
  );
}
