import { useState, useEffect, useMemo, useRef } from 'react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import logo from './assets/logo_mesa_ayuda.png'; 
import './App.css';

// --- SUGERENCIAS ---
const TICKET_SUGGESTIONS = [
  { keywords: ["menu", "huella", "sensor", "menú"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/67cc646ab88ae", label: "Falla en Huella/Menú" },
  { keywords: ["morpho", "idemia", "top", "slim", "sensor de huellas"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/694a4f054d153", label: "Falla Sensor Morpho/Idemia" },
  { keywords: ["escaner", "digitalizador", "2600", "2500", "scanner"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/694a502a91853", label: "Falla Escáner" },
  { keywords: ["signpad", "singpad", "pinpad", "firma", "firmar"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/694b71beeabbf", label: "Falla Signpad/Firma" },
  { keywords: ["ultimo", "fecha", "desempleo"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/694b72d17b122", label: "Error Fecha Desempleo" },
  { keywords: ["traspaso", "afiliacion", "grabacion"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/694b73ff38348", label: "Falla Grabación/Traspaso" },
  { keywords: ["plataforma", "captura de huellas", "se queda cargando"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/686ece88990b1", label: "Plataforma Lenta/Cargando" },
  { keywords: ["camara", "cámara", "web", "hd", "cam"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/694b7dd993359", label: "Falla Cámara Web" },
  { keywords: ["folio sms", "sms", "mensaje"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/694b7d7046560", label: "No llega SMS Folio" },
  { keywords: ["autoservicio", "selfservice"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/6951afd512c94", label: "Falla Autoservicio" },
  { keywords: ["consulta saldos", "saldo", "no disponible"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/6847993a8acd0", label: "Saldos No Disponibles" },
  { keywords: ["500", "error 500"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/68479aef1cc43", label: "Error 500" },
  { keywords: ["modalidades", "modalidades en 0"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/68479ee4964c5", label: "Modalidades en 0" },
  { keywords: ["se cierra", "automático", "cierra"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/68adf8d5b5508", label: "Se Cierra Solo" },
  { keywords: ["l016", "arroja l016"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/68e7f3c442157", label: "Error L016" },
  { keywords: ["expediente valido"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/68e8009e65adc", label: "No cuenta con expediente" },
  { keywords: ["respuesta folio", "servicio de folio"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/68e8035d5cc69", label: "Sin Respuesta Folio" },
  { keywords: ["folio sms autoservicio"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/690fce1b75024", label: "SMS Autoservicio" },
  { keywords: ["código de autenticación", "autenticación"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/690fd09962551", label: "Código Autenticación" },
  { keywords: ["confirmación", "correo"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/690fe3be14cf2", label: "Correo Confirmación" },
  { keywords: ["turnos", "administrador"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/696155476a064", label: "Admin Turnos" },
  { keywords: ["obtencion de clave", "consar"], link: "https://servicedesk.coppel.com/incident/create/index/quick-request/69643617f0720", label: "Obtención Clave" },
];

const Icons = {
  Bell: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
  Chat: () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  Books: () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
  Megaphone: () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>,
  Chart: () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  ArrowRight: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  Send: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
  ChevronLeft: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
  ChevronRight: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
  ExternalLink: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  Pencil: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Magic: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>,
  Image: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  Copy: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  MoreVertical: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>,
  Paste: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>,
  User: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Store: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18v-8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"></path><path d="M9 10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"></path><path d="M3 7l2-4h14l2 4"></path></svg>,
  Clock: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  File: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Wifi: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>,
  Phone: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
  List: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  Bot: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>
};

// --- UTILS ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(); 
  } catch (e) { return dateString; }
};

const compressAndConvertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; 
        const scaleSize = MAX_WIDTH / img.width;
        const newWidth = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
        const newHeight = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- FUNCIÓN DE LIMPIEZA DE MARKDOWN (Negritas y Links) ---
const renderFormattedMessage = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      if (!line.trim()) return <br key={index} />;
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <div key={index} style={{ marginBottom: '6px', lineHeight: '1.5' }}>
          {parts.map((part, i) => {
            if (i % 2 === 1) {
              return <strong key={i} style={{ color: '#0F69C4' }}>{part}</strong>;
            }
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const textParts = part.split(urlRegex);
            return (
              <span key={i}>
                {textParts.map((fragment, j) => {
                  if (fragment.match(urlRegex)) {
                    return (
                      <a key={j} href={fragment} target="_blank" rel="noopener noreferrer" style={{ color: '#0F69C4', textDecoration: 'underline', fontWeight: 'bold', display:'inline-flex', alignItems:'center', gap:'3px' }}>
                        {fragment} <Icons.ExternalLink />
                      </a>
                    );
                  }
                  return fragment;
                })}
              </span>
            );
          })}
        </div>
      );
    });
};

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('analista_seguimiento'); 
  const [userName, setUserName] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // VARIABLES DE LOGIN
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // ANUNCIOS & CAROUSEL
  const [announcements, setAnnouncements] = useState([]); 
  const [currentSlide, setCurrentSlide] = useState(0);    
  const [isAdPanelOpen, setIsAdPanelOpen] = useState(false);
  const [isBannerMenuOpen, setIsBannerMenuOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false); 
  
  // FORMULARIO ANUNCIOS
  const [isEditing, setIsEditing] = useState(false);
  const [currentAdId, setCurrentAdId] = useState(null);
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdImage, setNewAdImage] = useState('');
  const [newAdMessage, setNewAdMessage] = useState(''); 
  const [newAdLink, setNewAdLink] = useState('');
  const [isSolidColor, setIsSolidColor] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#0F69C4');
  const palette = ['#0F69C4', '#FFD045', '#1e293b', '#64748B', '#10b981', '#ef4444'];
  const [adPromptInput, setAdPromptInput] = useState(''); 
  const [isProcessingImg, setIsProcessingImg] = useState(false); 

  // --- LOGICA CHAT / GUIONES / CALL LOG ---
  const [toolMode, setToolMode] = useState('scripts'); // 1. scripts (Diálogos), 2. call_log (Llamadas), 3. chat (Chat IA)
  const [manualInstrucciones, setManualInstrucciones] = useState([]); // AHORA ES ARRAY/JSON
  const [messages, setMessages] = useState([{role: 'bot', text: 'Hola, soy tu Copiloto TI. ¿En qué puedo apoyarte hoy?'}]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef(null);

  // VARIABLES DE TICKET (DOBLE SLOT)
  const [activeSlot, setActiveSlot] = useState(1); 
  const [ticketsData, setTicketsData] = useState({
      1: { cliente: '', tienda: '', asunto: '', duracion: '0', agente: '', searchTerm: '' },
      2: { cliente: '', tienda: '', asunto: '', duracion: '0', agente: '', searchTerm: '' }
  });
  const [copiedIndex, setCopiedIndex] = useState(null);

  // --- CALL LOG STATE ---
  const [callLogs, setCallLogs] = useState(() => {
      const saved = localStorage.getItem('callLogs');
      return saved ? JSON.parse(saved) : [];
  });
  const [newLog, setNewLog] = useState({ tienda: '', ip: '', empleado: '', incidente: '', solucion: '' });
  const [suggestedTicket, setSuggestedTicket] = useState(null);

  useEffect(() => {
      localStorage.setItem('callLogs', JSON.stringify(callLogs));
  }, [callLogs]);

  useEffect(() => {
      const interval = setInterval(() => {
          const now = Date.now();
          const currentDate = new Date();
          if (currentDate.getDay() === 0 && currentDate.getHours() === 23 && currentDate.getMinutes() === 59) {
              setCallLogs([]);
              return;
          }
          setCallLogs(prev => prev.filter(log => {
              if (log.expiresAt && log.expiresAt < now) return false; 
              return true; 
          }));
      }, 10000); 
      return () => clearInterval(interval);
  }, []);

  const [hostDatabase, setHostDatabase] = useState([]);

  const filteredRemoteResults = useMemo(() => {
      const activeSearchTerm = ticketsData[activeSlot].searchTerm;
      if (!activeSearchTerm || hostDatabase.length === 0) return [];
      const q = activeSearchTerm.toString().toLowerCase().trim();
      const isNumeric = /^\d+$/.test(q); 
      const matches = hostDatabase.filter(item => {
          if (item.tienda === q) return true;
          if (isNumeric && q.length < 4) {
              const paddedQ = q.padStart(4, '0');
              if (item.hostname.toLowerCase().startsWith(paddedQ)) return true;
              return false; 
          }
          return item.ip.includes(q) || item.hostname.toLowerCase().includes(q);
      });
      return matches.slice(0, 50); 
  }, [ticketsData, activeSlot, hostDatabase]);

  const callLogFormIps = useMemo(() => {
      if (!newLog.tienda || hostDatabase.length === 0) return [];
      return hostDatabase.filter(h => h.tienda === newLog.tienda);
  }, [newLog.tienda, hostDatabase]);

  useEffect(() => {
      if (!newLog.incidente) { setSuggestedTicket(null); return; }
      const text = newLog.incidente.toLowerCase();
      const match = TICKET_SUGGESTIONS.find(sug => sug.keywords.some(k => text.includes(k)));
      setSuggestedTicket(match || null);
  }, [newLog.incidente]);

  const registerCall = () => {
      if (!newLog.tienda || !newLog.incidente) {
          alert("Completa al menos Tienda e Incidente");
          return;
      }
      const newItem = { 
          ...newLog, 
          id: Date.now(), 
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          expiresAt: null, 
          isChecked: false,
          suggestion: suggestedTicket 
      };
      setCallLogs(prev => [newItem, ...prev]);
      setNewLog({ tienda: '', ip: '', empleado: '', incidente: '', solucion: '' });
  };

  const removeCallLog = (id) => {
      setCallLogs(prev => prev.filter(log => log.id !== id));
  };

  const toggleCallCheck = (id) => {
      setCallLogs(prev => prev.map(log => {
          if (log.id === id) {
              const newChecked = !log.isChecked;
              return {
                  ...log,
                  isChecked: newChecked,
                  expiresAt: newChecked ? Date.now() + (5 * 60 * 1000) : null 
              };
          }
          return log;
      }));
  };

  const [scripts, setScripts] = useState([
      { id: '1', title: "👋 Bienvenida", bg: '#ffffff', bodyTemplate: "Buen día [CLIENTE], le doy la bienvenida al mensajero de Mesa de Servicio atención Afore Sistemas, le atiende Lic. [AGENTE], ¿En qué le puedo ayudar con su [ASUNTO]?" },
      { id: '2', title: "🚫 No responde", bg: '#ffffff', bodyTemplate: "[CLIENTE], por fines de calidad en el servicio nuestra conversación deberá ser terminada para dar continuidad al servicio y atender a otros usuarios, le invito a comunicarse nuevamente y un analista le apoyará con mucho gusto, gracias por su compresión. Le atendió [AGENTE]. ¡Qué tenga un excelente día!" },
      { id: '3', title: "💻 Remoto", bg: '#ffffff', bodyTemplate: "Entiendo [CLIENTE]. ¿Me podría apoyar con la conexión remota, por favor?" },
      { id: '4', title: "📄 Información", bg: '#ffffff', bodyTemplate: "Gracias por la información [CLIENTE], permítame un momento para revisar." },
      { id: '5', title: "✅ Despedida", bg: '#ffffff', bodyTemplate: "Ha sido un gusto atenderle [CLIENTE]. La duración de la atención fue de [DURACION] minutos y se le brindó apoyo con su [ASUNTO]. Al finalizar la conversación se le invita a contestar una encuesta para calificar el servicio. Fue atendido por [AGENTE]. ¡Qué tenga un excelente día!" },
      { id: '6', title: "🚪 Despedida (No responde)", bg: '#ffffff', bodyTemplate: "[CLIENTE] se le brindó apoyo con su [ASUNTO]. La duración de la atención fue de [DURACION] minutos. Por fines de calidad en el servicio nuestra conversación deberá ser terminada para dar continuidad al servicio y atender a otros usuarios. Le atendió [AGENTE]. ¡Qué tenga un excelente día!" },
      { id: '7', title: "📝 Reporte", bg: '#ffffff', bodyTemplate: "Entiendo, [CLIENTE] este detalle se debe a una intermitencia en el sistema. ¿Me apoya con CURP, NSS e IP para realizar un reporte, por favor?." },
      { id: '8', title: "➡️ Heredar", bg: '#ffffff', bodyTemplate: "[CLIENTE], a partir de este momento, su solicitud será enlazada al área de operaciones afore. Por nuestra parte, estaremos brindando el acompañamiento para que el área especialista le brinde una solución lo más pronto posible." }
  ]);

  const [draggedItem, setDraggedItem] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null); 

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        const docRef = doc(db, "usuarios_permitidos", currentUser.email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setIsApproved(data.aprobado === true);
            let userRole = data.rol || 'analista';
            if (userRole === 'agente') userRole = 'analista'; 
            setRole(userRole);
            setUserName(data.nombre || currentUser.email.split('@')[0]);
            const agentName = data.nombre || currentUser.email.split('@')[0];
            setTicketsData(prev => ({
                1: { ...prev[1], agente: agentName, searchTerm: '' },
                2: { ...prev[2], agente: agentName, searchTerm: '' }
            }));
            if (data.personal_scripts) setScripts(data.personal_scripts);
        } else {
            setIsApproved(false);
            setUserName(currentUser.email);
        }
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const fetchHosts = async () => {
        try {
            const docRef = doc(db, "configuracion", "red_tiendas");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setHostDatabase(docSnap.data().lista_hosts || []);
            }
        } catch (e) { console.error("Error cargando hosts DB", e); }
    };

    const fetchManual = async () => {
        try {
          const docRef = doc(db, "configuracion", "manual_operativo");
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            let rawData = data.base_conocimiento || data.contenido || [];
            if (typeof rawData === 'string') {
              try {
                const parsed = JSON.parse(rawData);
                if (Array.isArray(parsed) || typeof parsed === 'object') {
                    rawData = parsed;
                }
              } catch (e) {
                console.warn("Manual cargado como texto plano (no JSON estructurado).");
              }
            }
            setManualInstrucciones(rawData); 
          }
        } catch (e) {
          console.error("Error cargando manual operativo", e);
        }
    };

    fetchHosts();
    fetchManual();
    return () => unsub();
  }, []);

  const fetchAnnouncements = async () => {
      try {
        const adQuery = query(collection(db, "anuncios"), orderBy("fecha", "desc"));
        const querySnapshot = await getDocs(adQuery);
        const adsList = [];
        querySnapshot.forEach((doc) => adsList.push({ id: doc.id, ...doc.data() }));
        if (adsList.length === 0) {
            adsList.push({
                titulo: "Nuevo Portal MAS TI 2.0",
                mensaje: "Hemos actualizado la plataforma.",
                link: "", 
                fecha: new Date().toISOString(),
                imagen: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
            });
        }
        setAnnouncements(adsList);
      } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  useEffect(() => {
      if (announcements.length <= 1 || isPaused) return;
      const timer = setInterval(() => {
          setCurrentSlide((prev) => (prev + 1) % announcements.length);
      }, 5000); 
      return () => clearInterval(timer);
  }, [announcements.length, isPaused]);

  // --- LOGICA DE LOGIN (Agregada) ---
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "usuarios_permitidos", cred.user.email), { 
            aprobado: false, 
            fecha: new Date().toISOString(), 
            rol: 'analista', 
            nombre: fullName 
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) { alert(err.message); }
  };

  const handleSearchChange = (val) => {
      setTicketsData(prev => ({
          ...prev,
          [activeSlot]: { ...prev[activeSlot], searchTerm: val }
      }));
  };

  const parseTicketInfo = (text) => {
      const lines = text.split('\n').map(l => l.trim());
      const data = { ...ticketsData[activeSlot] };

      const nameIndex = lines.findIndex(line => line.startsWith("Nombre:"));
      if (nameIndex !== -1 && lines[nameIndex + 1]) {
          let rawName = lines[nameIndex + 1];
          let formattedName = rawName.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          data.cliente = formattedName.split(' ')[0];
      }

      const storeIndex = lines.findIndex(line => line.startsWith("Sucursal:"));
      if (storeIndex !== -1 && lines[storeIndex + 1]) {
          const rawStore = lines[storeIndex + 1];
          const storeNumberMatch = rawStore.match(/^(\d+)/); 
          if (storeNumberMatch) {
              const fullNum = storeNumberMatch[1];
              let tiendaDetectada = fullNum;
              if (fullNum.length > 2) tiendaDetectada = fullNum.slice(0, -2);
              data.tienda = tiendaDetectada;
              data.searchTerm = tiendaDetectada;
          }
      }

      const subjectIndex = lines.findIndex(line => line.startsWith("Asunto:"));
      if (subjectIndex !== -1 && lines[subjectIndex + 1]) data.asunto = lines[subjectIndex + 1];

      const agentIndex = lines.lastIndexOf("Nombre:");
      if (agentIndex !== -1 && agentIndex !== nameIndex && lines[agentIndex + 1]) {
           let rawAgent = lines[agentIndex + 1];
           data.agente = rawAgent.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
      }

      const dateLineIndex = lines.findIndex(line => line.startsWith("Día/hora:"));
      if (dateLineIndex !== -1 && lines[dateLineIndex + 1]) {
          const dateStr = lines[dateLineIndex + 1].replace(/[^\x00-\x7F]/g, "").trim(); 
          try {
              const regex = /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})\s+(\d{1,2}):(\d{2})\s*([ap]\.?\s*m\.?|pm|am)?/i;
              const parts = dateStr.match(regex);
              if (parts) {
                  let p1 = parseInt(parts[1]); let p2 = parseInt(parts[2]); let year = parseInt(parts[3]);
                  let hour = parseInt(parts[4]); let min = parseInt(parts[5]);
                  let ampm = parts[6] ? parts[6].toLowerCase().replace(/\./g, '').replace(/\s/g, '') : '';
                  
                  let day, month;
                  if (p2 > 12) { month = p1 - 1; day = p2; }
                  else { day = p1; month = p2 - 1; } 

                  if (ampm.includes('p') && hour < 12) hour += 12;
                  if (ampm.includes('a') && hour === 12) hour = 0;

                  const ticketTime = new Date(year, month, day, hour, min);
                  const now = new Date();
                  const diffMs = now - ticketTime;
                  const diffMins = Math.floor(diffMs / 60000);
                  data.duracion = diffMins > 0 ? diffMins : 0;
              }
          } catch (e) { console.error("Error fecha", e); }
      }

      setTicketsData(prev => ({ ...prev, [activeSlot]: data }));
  };

  const handlePasteTicket = async () => {
      try { const text = await navigator.clipboard.readText(); if (text) parseTicketInfo(text); } catch (err) { alert("Permiso denegado. Pega manualmente."); }
  };

  const saveScriptsToFirebase = async (newScripts) => {
      if (user) {
          try { await updateDoc(doc(db, "usuarios_permitidos", user.email), { personal_scripts: newScripts }); } catch (e) {}
      }
  };

  const handleDragStart = (e, index) => {
      setDraggedItem(index);
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => { e.target.classList.add('dragging'); }, 0);
  };

  const handleDragOver = (e, index) => {
      e.preventDefault();
      const draggedOverItem = index;
      if (draggedItem === null || draggedItem === draggedOverItem) return;
      let newScripts = [...scripts];
      const itemDragged = newScripts[draggedItem];
      newScripts.splice(draggedItem, 1);
      newScripts.splice(draggedOverItem, 0, itemDragged);
      setDraggedItem(draggedOverItem);
      setScripts(newScripts);
  };

  const handleDrop = (e) => {
      e.preventDefault();
      setDraggedItem(null);
      document.querySelectorAll('.script-card').forEach(el => el.classList.remove('dragging'));
      saveScriptsToFirebase(scripts);
  };

  const updateScriptColor = (id, color) => {
      const newScripts = scripts.map(s => s.id === id ? { ...s, bg: color } : s);
      setScripts(newScripts);
      setShowColorPicker(null);
      saveScriptsToFirebase(newScripts);
  };

  const getRenderedBody = (template) => {
      const data = ticketsData[activeSlot];
      return template
          .replace(/\[CLIENTE\]/g, data.cliente || '[Cliente]')
          .replace(/\[AGENTE\]/g, data.agente || '[Agente]')
          .replace(/\[ASUNTO\]/g, data.asunto || '[Asunto]')
          .replace(/\[DURACION\]/g, data.duracion || '0')
          .replace(/\[TIENDA\]/g, data.tienda || '[Tienda]');
  };

  const copyScript = (text, idx) => {
    const processedText = getRenderedBody(text);
    copyText(processedText, true, idx);
  };

  const copyText = (text, isScript = false, idx = null) => {
      if(!text) return;
      navigator.clipboard.writeText(text);
      if (isScript) {
          setCopiedIndex(idx);
          setTimeout(() => setCopiedIndex(null), 1500);
      }
  };

  const handleDurationChange = (e) => {
      const newDuration = e.target.value;
      setTicketsData(prev => ({ ...prev, [activeSlot]: { ...prev[activeSlot], duracion: newDuration } }));
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    let blob = null;
    for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf("image") !== -1) { blob = items[i].getAsFile(); break; } }
    if (blob) {
        setIsProcessingImg(true); e.preventDefault(); 
        try {
            const base64Image = await compressAndConvertToBase64(blob);
            setNewAdImage(base64Image); setIsSolidColor(false); setIsProcessingImg(false);
        } catch (error) { alert("Error al procesar la imagen."); setIsProcessingImg(false); }
    }
  };

  const resetForm = () => {
      setNewAdTitle(''); setNewAdImage(''); setNewAdMessage(''); setNewAdLink(''); setAdPromptInput('');
      setIsEditing(false); setCurrentAdId(null); setIsSolidColor(false); setIsAdPanelOpen(false); setIsBannerMenuOpen(false);
  };

  const startEditing = () => {
      const ad = announcements[currentSlide];
      setNewAdTitle(ad.titulo); setNewAdMessage(ad.mensaje || ''); setNewAdLink(ad.link || '');
      if (ad.imagen && ad.imagen.startsWith('#')) { setIsSolidColor(true); setSelectedColor(ad.imagen); setNewAdImage(''); } 
      else { setIsSolidColor(false); setNewAdImage(ad.imagen); }
      setIsEditing(true); setCurrentAdId(ad.id); setIsAdPanelOpen(true); setIsBannerMenuOpen(false);
  };

  const handleDeleteAd = async () => {
      if(!window.confirm("¿Seguro que quieres eliminar este anuncio?")) return;
      const adId = announcements[currentSlide].id;
      try {
          await deleteDoc(doc(db, "anuncios", adId));
          alert("Anuncio eliminado.");
          const newAds = announcements.filter(a => a.id !== adId);
          setAnnouncements(newAds);
          setCurrentSlide(0);
          setIsBannerMenuOpen(false);
      } catch (err) { alert("Error al borrar: " + err.message); }
  };

  const handleSubmitAd = async (e) => {
    e.preventDefault();
    if (!newAdTitle.trim()) return;
    if (isProcessingImg) return;
    let finalImageValue = isSolidColor ? selectedColor : newAdImage;
    if (!finalImageValue && !isSolidColor) finalImageValue = "https://placehold.co/800x400/e2e8f0/1e293b?text=Sin+Imagen"; 
    
    const adData = { titulo: newAdTitle, mensaje: newAdMessage, link: newAdLink, imagen: finalImageValue, creador: userName };
    try {
        if (isEditing && currentAdId) { await updateDoc(doc(db, "anuncios", currentAdId), adData); alert("Actualizado."); } 
        else { await addDoc(collection(db, "anuncios"), { ...adData, fecha: new Date().toISOString() }); alert("Publicado."); }
        fetchAnnouncements(); resetForm();
    } catch (err) { if(err.message.includes("exceeds")) alert("Imagen muy grande."); else alert("Error: " + err.message); }
  };

  const handleCopyPrompt = () => {
      if(!adPromptInput.trim()) { alert("Escribe una idea."); return; }
      const prompt = `Flat vector illustration with bold black outlines... Scene: ${adPromptInput}...`;
      navigator.clipboard.writeText(prompt);
      alert("Prompt copiado.");
  };

  const nextSlide = (e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev + 1) % announcements.length); };
  const prevSlide = (e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev - 1 + announcements.length) % announcements.length); };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newHistory = [...messages, { role: 'user', text: input }];
    setMessages(newHistory);
    setInput('');
    setThinking(true);
    
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" }); 
      
      const knowledgeBaseString = typeof manualInstrucciones === 'object' 
        ? JSON.stringify(manualInstrucciones, null, 2) 
        : manualInstrucciones; npm install gh-pages --save-dev

      const systemPrompt = `
      ERES UN ASISTENTE DE SOPORTE TI EXPERTO EN AFORE COPPEL.
      TU OBJETIVO: Analizar el error reportado por el usuario (Agente TI) y buscar la solución EXACTA en tu Base de Conocimiento JSON.
      BASE DE CONOCIMIENTO (JSON): ${knowledgeBaseString}
      INSTRUCCIONES ESTRICTAS:
      1. Busca en el JSON el error que coincida semánticamente con la descripción del usuario.
      2. SI ENCUENTRAS EL ERROR, responde con formato exacto:
         **Error Detectado:** [Nombre del error]
         **Módulo:** [Modulo]
         **Acción Técnica:** [Accion]
         **Diálogo para Asesor:** [Dialogo]
         **Ticket Guía:** [Ticket o N/A]
      3. SI NO ENCUENTRAS EL ERROR: "Este error no está registrado..."
      4. NO INVENTES RESPUESTAS.
      `;

      const chatContext = newHistory.slice(-4).map(m => `${m.role === 'user' ? 'AGENTE' : 'SISTEMA'}: ${m.text}`).join('\n');
      const fullPrompt = `${systemPrompt}\n\nHISTORIAL RECIENTE:\n${chatContext}\n\nAGENTE (User Input): ${input}`;
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      
      setMessages([...newHistory, { role: 'bot', text: response.text() }]);
    } catch (error) { 
        console.error(error);
        setMessages([...newHistory, { role: 'bot', text: "Lo siento, tuve un error de conexión con la base de conocimientos." }]); 
    }
    setThinking(false);
  };

  const getRoleLabel = () => { return role === 'admin' ? 'Administrador' : role === 'analista_seguimiento' ? 'Analista Seguimiento' : 'Analista'; };
  const canEditAds = role === 'admin' || role === 'analista_seguimiento';

  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontFamily:'Poppins, sans-serif'}}>Cargando...</div>;

  // --- VISTA DE LOGIN (SI NO HAY USUARIO) ---
  if (!user || !isApproved) {
    if (user && !isApproved) return <div className="main-card"><h3>Cuenta Pendiente</h3><p>Tu cuenta ({user.email}) está en revisión.</p><button className="btn-logout" onClick={() => signOut(auth)}>Salir</button></div>;
    
    return (
        <div className="main-card">
            <img src={logo} alt="Logo" className="brand-logo" />
            <h2 className="login-title">{isRegistering ? "Crear Cuenta" : "Bienvenido"}</h2>
            <p className="login-subtitle">{isRegistering ? "Regístrate para acceder" : "Ingresa tus credenciales"}</p>
            <form onSubmit={handleAuth}>
                {isRegistering && (
                    <div style={{marginBottom:'15px'}}>
                        <label className="label-modern">Nombre Completo</label>
                        <input className="input-modern" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </div>
                )}
                <div style={{marginBottom:'15px'}}>
                    <label className="label-modern">Correo Electrónico</label>
                    <input className="input-modern" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div style={{marginBottom:'25px'}}>
                    <label className="label-modern">Contraseña</label>
                    <input className="input-modern" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary">{isRegistering ? "Registrarse" : "Ingresar"}</button>
            </form>
            <span className="toggle-link" onClick={() => setIsRegistering(!isRegistering)}>
                {isRegistering ? "¿Ya tienes cuenta? Ingresa aquí" : "¿No tienes cuenta? Regístrate"}
            </span>
        </div>
    );
  }

  // --- VISTA PRINCIPAL (DASHBOARD) ---
  return (
    <>
      <nav className="global-navbar">
        <div className="nav-brand-area"><img src={logo} alt="Logo" className="nav-logo" /><span className="nav-title">Mesa de Servicios</span></div>
        <div className="nav-right">
            <div className="user-badge">
                <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
                <div className="user-details"><span className="user-name">{userName}</span><span className="user-role">{getRoleLabel()}</span></div>
            </div>
            <button className="btn-logout" onClick={() => signOut(auth)}>Salir</button>
        </div>
      </nav>

      <div className="dashboard-container">
        {currentView === 'dashboard' && (
            <>
                <div className="welcome-header">
                    <h1 className="welcome-title">Hola, {userName.split(' ')[0]} 👋</h1>
                    <p className="welcome-subtitle">Resumen de hoy.</p>
                </div>

                <div className="hero-wrapper" onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onMouseLeave={() => setIsPaused(false)}>
                    {announcements.length > 1 && (
                        <div className="story-progress-container">
                            {announcements.map((_, idx) => (
                                <div key={idx} className={`story-bar-bg ${idx === currentSlide ? 'active' : ''} ${idx < currentSlide ? 'filled' : ''}`}>
                                    <div className="story-bar-fill" style={{ animationPlayState: isPaused ? 'paused' : 'running' }}></div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="tag-date-floating">NOVEDAD • {formatDate(announcements[currentSlide]?.fecha)}</div>
                    {canEditAds && (
                        <div className="banner-menu-container">
                            <button className="menu-trigger-btn" onClick={(e) => { e.stopPropagation(); setIsBannerMenuOpen(!isBannerMenuOpen); }}><Icons.MoreVertical /></button>
                            {isBannerMenuOpen && (
                                <div className="banner-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                    <button className="dropdown-item create" onClick={() => { resetForm(); setIsAdPanelOpen(true); }}><Icons.Plus size={16}/> Crear Anuncio</button>
                                    <button className="dropdown-item" onClick={startEditing}><Icons.Pencil size={16} /> Editar</button>
                                    <button className="dropdown-item delete" onClick={handleDeleteAd}><Icons.Trash size={16} /> Borrar</button>
                                </div>
                            )}
                        </div>
                    )}
                    {announcements.length > 1 && (
                        <>
                            <button className="story-nav-btn left" onClick={prevSlide}><Icons.ChevronLeft /></button>
                            <button className="story-nav-btn right" onClick={nextSlide}><Icons.ChevronRight /></button>
                        </>
                    )}
                    <div className="announcement-banner">
                        {announcements[currentSlide]?.imagen?.startsWith('#') 
                            ? <div className="banner-bg-img" style={{backgroundColor: announcements[currentSlide].imagen, width:'100%', height:'100%'}}></div>
                            : <img src={announcements[currentSlide]?.imagen} alt="Banner" className="banner-bg-img" key={announcements[currentSlide]?.imagen} />
                        }
                        <div className="overlay-gradient"></div>
                        <div className="banner-content">
                            <h2 className="banner-title">{announcements[currentSlide]?.titulo}</h2>
                            {announcements[currentSlide]?.mensaje && <p className="banner-message">{announcements[currentSlide].mensaje}</p>}
                            {announcements[currentSlide]?.link && (<a href={announcements[currentSlide].link} target="_blank" rel="noopener noreferrer" className="banner-cta">Acceder <Icons.ExternalLink /></a>)}
                        </div>
                    </div>
                    
                    <div className={`admin-panel-slide ${isAdPanelOpen ? 'active' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                            <h3 style={{margin:0, color:'var(--primary)'}}>{isEditing ? 'Editar Anuncio' : 'Crear Nueva Publicación'}</h3>
                            <button onClick={resetForm} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
                        </div>
                        <form onSubmit={handleSubmitAd} className="form-grid">
                            <div style={{gridColumn:'span 2', display:'flex', gap:'20px', marginBottom:'10px'}}>
                                <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}><input type="radio" checked={!isSolidColor} onChange={() => setIsSolidColor(false)} /> Imagen</label>
                                <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}><input type="radio" checked={isSolidColor} onChange={() => setIsSolidColor(true)} /> Color Sólido</label>
                            </div>
                            {!isSolidColor && (
                                <div className="ai-tool-box">
                                    <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                        <input className="input-modern" placeholder="Idea para IA..." value={adPromptInput} onChange={e => setAdPromptInput(e.target.value)} />
                                        <button type="button" className="btn-icon-small" onClick={handleCopyPrompt} title="Copiar Prompt"><Icons.Magic /></button>
                                    </div>
                                    <div className="paste-zone" onPaste={handlePaste} tabIndex="0" style={{border:'2px dashed #0F69C4', padding:'15px', textAlign:'center', background:'white', borderRadius:'8px', cursor:'pointer'}}>
                                            <p style={{margin:0, fontSize:'0.85rem', color:'#64748b'}}>Haz clic y presiona <b>Ctrl + V</b> para pegar</p>
                                    </div>
                                </div>
                            )}
                            {isSolidColor && (
                                <div style={{gridColumn:'span 2'}}><label className="label-modern">Selecciona un Color</label><div className="color-palette">{palette.map(color => (<div key={color} className={`color-swatch ${selectedColor === color ? 'selected' : ''}`} style={{backgroundColor: color}} onClick={() => setSelectedColor(color)}></div>))}</div></div>
                            )}
                            <div><label className="label-modern">Título</label><input className="input-modern" value={newAdTitle} onChange={e => setNewAdTitle(e.target.value)} required /></div>
                            <div><label className="label-modern">Mensaje (Opcional)</label><input className="input-modern" value={newAdMessage} onChange={e => setNewAdMessage(e.target.value)} /></div>
                            <div style={{gridColumn:'span 2'}}><label className="label-modern">Link (Opcional)</label><input className="input-modern" value={newAdLink} onChange={e => setNewAdLink(e.target.value)} /></div>
                            <div style={{gridColumn:'span 2', display:'flex', gap:'10px', marginTop:'10px'}}>
                                <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{flex:1}} disabled={isProcessingImg}>{isProcessingImg ? 'Procesando...' : (isEditing ? 'Guardar Cambios' : 'Publicar')}</button>
                            </div>
                        </form>
                    </div>
                </div>

                <h3 className="cards-section-title">Herramientas Operativas</h3>
                <div className={`panels-grid ${role === 'analista' ? 'layout-analista' : ''} ${role === 'analista_seguimiento' ? 'layout-seguimiento' : ''}`}>
                    <div className="feature-card card-blue" onClick={() => setCurrentView('chat')}><div><div className="card-icon-circle"><Icons.Chat /></div><h3 className="card-title">Copiloto & Guiones</h3><p className="card-desc">Chat IA y Scripts.</p></div><div className="card-arrow"><Icons.ArrowRight /></div></div>
                    <div className="feature-card card-green" onClick={() => setCurrentView('cursos')}><div><div className="card-icon-circle"><Icons.Books /></div><h3 className="card-title">Capacitación</h3><p className="card-desc">Cursos y manuales.</p></div><div className="card-arrow"><Icons.ArrowRight /></div></div>
                    {(role === 'analista_seguimiento' || role === 'admin') && (<div className="feature-card card-yellow" onClick={() => setCurrentView('seguimiento')}><div><div className="card-icon-circle"><Icons.Megaphone /></div><h3 className="card-title">Seguimiento</h3><p className="card-desc">Avisos globales.</p></div><div className="card-arrow"><Icons.ArrowRight /></div></div>)}
                    {role === 'admin' && (<div className="feature-card card-purple" onClick={() => setCurrentView('gestion')}><div><div className="card-icon-circle"><Icons.Chart /></div><h3 className="card-title">Gestión</h3><p className="card-desc">Admin.</p></div><div className="card-arrow"><Icons.ArrowRight /></div></div>)}
                </div>
            </>
        )}
        
        {/* --- VISTA TRIPLE: GUIONES, CHAT, LLAMADAS --- */}
        {currentView === 'chat' && (
            <div className="chat-container">
                <div className="chat-header">
                    <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                        <button className="btn-back" onClick={() => setCurrentView('dashboard')}>
                            <Icons.ChevronLeft /> Panel
                        </button>
                        <div className="tool-switcher">
                            <button className={`switch-item ${toolMode==='scripts' ? 'active' : ''}`} onClick={() => setToolMode('scripts')}>Diálogos</button>
                            <button className={`switch-item ${toolMode==='call_log' ? 'active' : ''}`} onClick={() => setToolMode('call_log')}>Llamadas</button>
                            <button className={`switch-item ${toolMode==='chat' ? 'active' : ''}`} onClick={() => setToolMode('chat')}>Chat IA</button>
                        </div>
                    </div>
                    <div style={{fontSize:'0.9rem', color:'#64748b', fontWeight:'600'}}>
                       {toolMode === 'chat' && 'Copiloto Inteligente'}
                       {toolMode === 'scripts' && 'Scripts de Atención'}
                       {toolMode === 'call_log' && 'Registro de Llamadas'}
                    </div>
                </div>

                {toolMode === 'chat' && (
                    <>
                        <div className="chat-messages">
                            {messages.map((m, i) => (
                                <div key={i} className={`msg-row ${m.role==='user'?'row-user':'row-bot'}`}>
                                    {m.role === 'bot' && <div className="chat-avatar bot"><Icons.Bot /></div>}
                                    <div style={{display:'flex', flexDirection:'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth:'85%'}}>
                                        {/* NOMBRE ARRIBA DEL MENSAJE (MODIFICADO) */}
                                        {m.role === 'user' && (
                                            <span style={{fontSize:'0.75rem', color:'#64748b', marginBottom:'4px', marginRight:'10px'}}>
                                                {userName}
                                            </span>
                                        )}
                                        <div className={`msg-bubble ${m.role==='user'?'msg-user':'msg-bot'}`}>
                                            {m.role === 'user' ? m.text : renderFormattedMessage(m.text)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {thinking && (
                                <div className="msg-row row-bot">
                                    <div className="chat-avatar bot"><Icons.Bot /></div>
                                    <div className="msg-bubble msg-loading">
                                        <div className="typing-indicator">
                                            <span></span><span></span><span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="chat-input-zone"><input className="input-chat" placeholder="Escribe tu consulta..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} /><button className="btn-send" onClick={sendMessage}><Icons.Send /></button></div>
                    </>
                )}

                {toolMode === 'scripts' && (
                    <div style={{padding:'20px', overflowY:'auto'}}>
                         <div style={{background:'#f0f9ff', border:'1px dashed #0F69C4', borderRadius:'12px', padding:'15px', marginBottom:'20px'}}>
                            <div style={{display:'flex', gap:'10px', marginBottom:'10px', justifyContent:'center'}}>
                                <button className={`btn-secondary ${activeSlot===1?'active-slot':''}`} style={{flex:1, background: activeSlot===1?'var(--primary)':'white', color:activeSlot===1?'white':'var(--text-dark)'}} onClick={() => setActiveSlot(1)}>Chat 1</button>
                                <button className={`btn-secondary ${activeSlot===2?'active-slot':''}`} style={{flex:1, background: activeSlot===2?'var(--primary)':'white', color:activeSlot===2?'white':'var(--text-dark)'}} onClick={() => setActiveSlot(2)}>Chat 2</button>
                            </div>
                            <button className="btn-primary" style={{width:'100%', justifyContent:'center'}} onClick={handlePasteTicket}><Icons.Paste /> Pegar Datos del Ticket ({activeSlot})</button>
                        </div>
                        <div className="ticket-context-card">
                            <div className="context-left">
                                <div className="ticket-info-grid">
                                    <div className="info-item"><span className="info-label"><Icons.User /> Cliente</span><span className="info-value">{ticketsData[activeSlot].cliente || '---'}</span></div>
                                    <div className="info-item"><span className="info-label"><Icons.Store /> Tienda</span><span className="info-value">{ticketsData[activeSlot].tienda || '---'}</span></div>
                                    <div className="info-item"><span className="info-label"><Icons.File /> Asunto</span><span className="info-value">{ticketsData[activeSlot].asunto || '---'}</span></div>
                                    <div className="info-item"><span className="info-label"><Icons.Clock /> Duración (min)</span>
                                        <input type="number" className="info-input-edit" value={ticketsData[activeSlot].duracion} onChange={handleDurationChange} onClick={(e) => e.target.select()} />
                                    </div>
                                </div>
                            </div>
                            <div className="context-right">
                                <div className="remote-header"><Icons.Wifi /> SOPORTE REMOTO</div>
                                <div className="search-compact-wrapper">
                                    <div className="search-icon-pos"><Icons.Search /></div>
                                    <input className="search-compact-input" placeholder="Buscar IP/Host..." value={ticketsData[activeSlot].searchTerm} onChange={(e) => handleSearchChange(e.target.value)} />
                                </div>
                                <div className="host-list-header"><span>HOSTNAME</span><span>IP</span></div>
                                <div className="host-list-scroll">
                                    {filteredRemoteResults.length > 0 ? (
                                        filteredRemoteResults.map((r, i) => (
                                            <div key={i} className="host-item-row">
                                                <span className="host-name" onClick={() => copyText(r.hostname)} title="Copiar Hostname">{r.hostname}</span>
                                                <span className="host-ip" onClick={() => copyText(r.ip)} title="Copiar IP">{r.ip}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{padding:'10px', textAlign:'center', color:'#94a3b8', fontSize:'0.75rem'}}>{ticketsData[activeSlot].searchTerm ? 'Sin resultados' : 'Escribe o pega ticket'}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="scripts-grid">
                            {scripts.map((script, idx) => (
                                <div key={script.id} className={`script-card ${copiedIndex === idx ? 'copied' : ''}`} style={{backgroundColor: script.bg || 'white'}} draggable="true" onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={handleDrop} onClick={() => copyScript(script.bodyTemplate, idx)}>
                                    <div className="script-header">
                                        <h4 className="script-title">{script.title}</h4>
                                        <div style={{position:'relative'}} onClick={(e) => e.stopPropagation()}>
                                            <button className="color-picker-trigger" onClick={() => setShowColorPicker(showColorPicker === script.id ? null : script.id)}><Icons.Settings /></button>
                                            {showColorPicker === script.id && (
                                                <div className="color-popover">
                                                    {['#ffffff', '#bfdbfe', '#bbf7d0', '#fde047', '#fca5a5', '#fdba74', '#d8b4fe'].map(c => (
                                                        <div key={c} className="mini-swatch" style={{background:c}} onClick={() => updateScriptColor(script.id, c)}></div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {copiedIndex === idx && <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(255,255,255,0.8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#10b981', fontWeight:'bold'}}>Copiado <Icons.Check /></div>}
                                    <p className="script-body">{getRenderedBody(script.bodyTemplate)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {toolMode === 'call_log' && (
                    <div className="call-log-container" style={{padding:'20px', overflowY:'auto'}}>
                        <div className="compact-form-container">
                            <h4 style={{margin:'0 0 15px 0', color:'var(--primary)', display:'flex', alignItems:'center', gap:'10px'}}><Icons.Phone /> Nuevo Registro</h4>
                            <div className="compact-form-grid">
                                <div><label className="compact-label">Tienda</label><input className="compact-input" value={newLog.tienda} onChange={(e) => setNewLog({...newLog, tienda: e.target.value})} /></div>
                                <div><label className="compact-label">IP (Auto)</label><select className="compact-input" value={newLog.ip} onChange={(e) => setNewLog({...newLog, ip: e.target.value})}><option value="">IP...</option>{callLogFormIps.map((h, i) => (<option key={i} value={h.ip}>{h.ip} - {h.hostname}</option>))}</select></div>
                                <div><label className="compact-label">Empleado</label><input className="compact-input" value={newLog.empleado} onChange={(e) => setNewLog({...newLog, empleado: e.target.value})} /></div>
                            </div>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px'}}>
                                <div><label className="compact-label">Incidente</label><input className="compact-input" value={newLog.incidente} onChange={(e) => setNewLog({...newLog, incidente: e.target.value})} /></div>
                                <div><label className="compact-label">Solución</label><input className="compact-input" value={newLog.solucion} onChange={(e) => setNewLog({...newLog, solucion: e.target.value})} /></div>
                            </div>
                            {suggestedTicket && (
                                <div className="compact-suggestion" style={{marginTop:'10px', padding:'8px', background:'#eff6ff', borderRadius:'6px', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.8rem'}}>
                                    <span style={{color:'var(--primary)', fontWeight:'bold'}}>💡 {suggestedTicket.label}</span>
                                    <a href={suggestedTicket.link} target="_blank" rel="noreferrer" style={{color:'var(--primary)', textDecoration:'none', fontWeight:'bold', display:'flex', alignItems:'center', gap:'4px'}}>Crear <Icons.ExternalLink /></a>
                                </div>
                            )}
                            <button className="btn-primary" style={{marginTop:'15px', padding:'10px'}} onClick={registerCall}><Icons.Plus /> Registrar Llamada</button>
                        </div>
                        <div className="history-section" style={{marginTop:'25px'}}>
                            <h4 style={{margin:'0 0 10px 0', color:'#64748b', display:'flex', alignItems:'center', gap:'8px'}}><Icons.List /> Historial Reciente ({callLogs.length})</h4>
                            <div className="history-table-container">
                                <table className="history-table">
                                    <thead><tr><th>Hora</th><th>Tda</th><th>IP</th><th>Empleado</th><th>Incidente / Sugerencia</th><th>Solución</th><th>Estado</th><th></th></tr></thead>
                                    <tbody>
                                        {callLogs.map(log => (
                                            <tr key={log.id} className={log.isChecked ? 'history-row-active' : ''}>
                                                <td style={{fontFamily:'monospace', fontSize:'0.75rem'}}>{log.timestamp}</td>
                                                <td style={{fontWeight:'bold'}}>{log.tienda}</td>
                                                <td style={{fontSize:'0.75rem', cursor:'pointer'}} title="Copiar IP" onClick={() => copyText(log.ip)} className="hover-cell">{log.ip}</td>
                                                <td style={{cursor:'pointer'}} title="Copiar Empleado" onClick={() => copyText(log.empleado)} className="hover-cell">{log.empleado}</td>
                                                <td style={{maxWidth:'200px'}}>
                                                    <div style={{fontWeight:'500', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={log.incidente}>{log.incidente}</div>
                                                    {log.suggestion && (<a href={log.suggestion.link} target="_blank" rel="noreferrer" style={{fontSize:'0.7rem', color:'var(--primary)', textDecoration:'none', display:'flex', alignItems:'center', gap:'3px', marginTop:'2px'}}><Icons.Magic /> {log.suggestion.label}</a>)}
                                                </td>
                                                <td style={{maxWidth:'150px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={log.solucion}>{log.solucion}</td>
                                                <td>{log.isChecked ? (<span className="status-badge-green" onClick={() => toggleCallCheck(log.id)} style={{cursor:'pointer'}}>Registrada ✅</span>) : (<button className="btn-icon-tiny" onClick={() => toggleCallCheck(log.id)} title="Marcar como registrada" style={{color:'#cbd5e1'}}><div style={{border:'2px solid #cbd5e1', width:'14px', height:'14px', borderRadius:'4px'}}></div></button>)}</td>
                                                <td><button className="btn-icon-tiny" onClick={() => removeCallLog(log.id)} title="Borrar"><Icons.Trash /></button></td>
                                            </tr>
                                        ))}
                                        {callLogs.length === 0 && (<tr><td colSpan="8" style={{textAlign:'center', padding:'20px', color:'#94a3b8'}}>Sin llamadas registradas</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </>
  );
}

export default App;