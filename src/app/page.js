"use client";

import React, { useState } from 'react';
import { 
  Upload, Image as ImageIcon, Download, 
  ChevronRight, Sparkles, AlertCircle, 
  CheckCircle, UserPlus, LogIn, ArrowLeft
} from 'lucide-react';

const QUOTES = [
  "“Art is not what you see, but what you make others see.” — Edgar Degas",
  "“Every artist was first an amateur.” — Ralph Waldo Emerson",
  "“Creativity takes courage.” — Henri Matisse",
  "“Art is the lie that enables us to realize the truth.” — Pablo Picasso",
  "Analyzing your unique features and finding the perfect artistic touch..."
];

// PROMPTS array dihapus dari sini karena sudah dipindahkan dengan aman ke backend (/api/generate.js)
const CONCEPTS = {
  originalEnhancement: {
    title: "Original Enhancement",
    desc: "Perfected version of your photo, enhanced for high-resolution printing.",
    icon: "✨",
    color: "bg-blue-100 text-blue-700",
  },
  artisticPicture: {
    title: "Original Artistic Picture",
    desc: "Transform your portrait into dramatic and modern artistic masterpieces.",
    icon: "🎨",
    color: "bg-purple-100 text-purple-700",
  },
  vintageStyle: {
    title: "Vintage Style",
    desc: "Travel back in time with classic Noir, European Old Money, and 90s styles.",
    icon: "🎞️",
    color: "bg-orange-100 text-orange-700",
  },
  cartoonStyle: {
    title: "Cartoon Style",
    desc: "Get animated! 3D Pixar, Cute Caricature, and Anime styles.",
    icon: "👾",
    color: "bg-pink-100 text-pink-700",
  },
  watercolourSketch: {
    title: "Watercolour Painting",
    desc: "Elegant and soft watercolor splashes mixed with sharp facial sketches.",
    icon: "🖌️",
    color: "bg-teal-100 text-teal-700",
  }
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentPage, setCurrentPage] = useState('home'); // home, auth, upload, concept, loading, result
  const [authMode, setAuthMode] = useState('new'); // new, existing
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [tokens, setTokens] = useState(0);
  const [userImg, setUserImg] = useState(null); // base64
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingText, setLoadingText] = useState('');

  // --- MENGHUBUNGKAN KE BACKEND API (VERCEL/NEXT.JS API ROUTES) ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!invoiceNumber.trim()) {
      setErrorMsg("Please enter a valid Etsy Invoice Number.");
      return;
    }

    try {
      // Memanggil /api/auth.js
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNumber, mode: authMode })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Terjadi kesalahan saat memverifikasi.");
        return;
      }

      setTokens(data.tokens);
      setCurrentPage('upload');
    } catch (err) {
      setErrorMsg("Network error. Pastikan server berjalan dan koneksi internet stabil.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedConcept) return;
    if (tokens <= 0) {
      setErrorMsg("You have 0 tokens left! Please use a new invoice.");
      return;
    }

    setCurrentPage('loading');
    
    // Aesthetic 2-second transition loop
    let quoteIndex = 0;
    setLoadingText(QUOTES[quoteIndex]);
    const quoteInterval = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % QUOTES.length;
      setLoadingText(QUOTES[quoteIndex]);
    }, 2500);

    try {
      // Memanggil /api/generate.js
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          invoiceNumber, 
          conceptKey: selectedConcept, 
          base64ImageRaw: userImg 
        })
      });
      
      const data = await res.json();
      clearInterval(quoteInterval);

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal meng-generate gambar. Silakan coba lagi.");
        setCurrentPage('concept');
        return;
      }

      // Update token langsung dari response backend
      setTokens(data.remainingTokens); 
      setGeneratedImages(data.images);
      setCurrentPage('result');

    } catch (err) {
      clearInterval(quoteInterval);
      setErrorMsg("Generation failed. Please check your network connection.");
      setCurrentPage('concept');
    }
  };

  // --- HANDLERS LAINNYA ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUserImg(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const downloadImage = (imgStr, quality = 'Standard') => {
    if (!imgStr) return;
    const a = document.createElement('a');
    a.href = imgStr;
    a.download = `ArtisticGen_${quality}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadPDF = (imgStr) => {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html><head><title>Print Image</title></head>
        <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;">
          <img src="${imgStr}" style="max-width:100%;max-height:100%;object-fit:contain;" />
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body></html>
      `);
      printWindow.document.close();
  }

  // --- VIEWS ---
  const renderHeader = () => (
    <header className="flex justify-between items-center p-4 bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xl">
        <Sparkles className="text-indigo-500" />
        <span>ArtisticGen</span>
      </div>
      {currentPage !== 'home' && currentPage !== 'auth' && (
        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
          <span className="text-xs font-medium text-indigo-800 uppercase tracking-wide">Tokens</span>
          <span className="font-bold text-indigo-600">{tokens}</span>
        </div>
      )}
    </header>
  );

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center p-6 max-w-md mx-auto min-h-[80vh] text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner transform rotate-3">
          <Sparkles size={40} />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Artistic Image Generator</h1>
        <p className="text-gray-500 text-base leading-relaxed">
          Transform your casual selfies into stunning, high-resolution masterpieces ready for 300dpi printing.
        </p>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full text-left space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <CheckCircle size={18} className="text-green-500" /> 3 Simple Steps:
        </h3>
        <ul className="text-sm text-gray-600 space-y-3 pl-1">
          <li className="flex items-start gap-2">
            <span className="font-bold text-indigo-600">1.</span> Verify your Etsy Invoice Number.
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-indigo-600">2.</span> Upload a clear portrait facing the camera (not blurry).
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-indigo-600">3.</span> Choose your art concept and generate!
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        <button 
          onClick={() => { setAuthMode('new'); setCurrentPage('auth'); }}
          className="flex flex-col items-center justify-center p-4 bg-indigo-600 text-white rounded-2xl shadow-md hover:bg-indigo-700 transition active:scale-95"
        >
          <UserPlus size={24} className="mb-2" />
          <span className="font-semibold text-sm">New User</span>
        </button>
        <button 
          onClick={() => { setAuthMode('existing'); setCurrentPage('auth'); }}
          className="flex flex-col items-center justify-center p-4 bg-white text-indigo-700 border-2 border-indigo-100 rounded-2xl shadow-sm hover:bg-indigo-50 transition active:scale-95"
        >
          <LogIn size={24} className="mb-2" />
          <span className="font-semibold text-sm">Existing Member</span>
        </button>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="flex flex-col items-center p-6 max-w-md mx-auto min-h-[80vh] space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="w-full">
        <button onClick={() => setCurrentPage('home')} className="text-gray-500 flex items-center gap-1 hover:text-gray-800 transition">
          <ArrowLeft size={16} /> Back
        </button>
      </div>
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          {authMode === 'new' ? 'Welcome, New User!' : 'Welcome Back!'}
        </h2>
        <p className="text-gray-500 text-sm">
          {authMode === 'new' 
            ? 'Enter your new Etsy Invoice Number to register and get 25 tokens.'
            : 'Enter your registered Etsy Invoice Number to access your remaining tokens.'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="w-full space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Etsy Invoice Number</label>
          <input 
            type="text" 
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
            placeholder="e.g. INV-123456789"
          />
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        <button 
          type="submit"
          className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition active:scale-95"
        >
          {authMode === 'new' ? 'Register & Continue' : 'Verify & Continue'}
        </button>
      </form>
    </div>
  );

  const renderUpload = () => (
    <div className="flex flex-col p-6 max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Upload Portrait</h2>
        <p className="text-gray-500 text-sm">Please upload a clear, front-facing photo of yourself. Works for all ages!</p>
      </div>

      <div className="relative w-full aspect-[3/4] bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl overflow-hidden group hover:border-indigo-400 transition-colors">
        <input 
          type="file" 
          accept="image/*"
          onChange={handleImageUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
        {userImg ? (
          <img src={userImg} alt="Uploaded portrait" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
            <div className="p-4 bg-white rounded-full shadow-sm mb-3">
              <Upload size={32} />
            </div>
            <p className="font-medium">Tap to choose image</p>
            <p className="text-xs mt-1">JPG, PNG (Max 5MB)</p>
          </div>
        )}
      </div>

      <button 
        onClick={() => setCurrentPage('concept')}
        disabled={!userImg}
        className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
          userImg 
            ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        Next Step <ChevronRight size={20} />
      </button>
    </div>
  );

  const renderConcept = () => (
    <div className="flex flex-col p-6 max-w-lg mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => setCurrentPage('upload')} className="p-2 bg-gray-100 rounded-full text-gray-600">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Choose Concept</h2>
          <p className="text-gray-500 text-sm">Select an artistic style for your generation.</p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(CONCEPTS).map(([key, concept]) => (
          <div 
            key={key}
            onClick={() => setSelectedConcept(key)}
            className={`cursor-pointer border-2 rounded-2xl p-4 flex gap-4 transition-all duration-200 ${
              selectedConcept === key ? 'border-indigo-500 bg-indigo-50/50 shadow-md transform scale-[1.02]' : 'border-gray-100 bg-white hover:border-indigo-200'
            }`}
          >
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 shadow-inner ${concept.color}`}>
              {concept.icon}
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <h4 className="font-bold text-gray-900 text-base">{concept.title}</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{concept.desc}</p>
            </div>
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedConcept === key ? 'border-indigo-500' : 'border-gray-300'}`}>
                {selectedConcept === key && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-40 max-w-lg mx-auto">
        {errorMsg && <p className="text-red-500 text-sm mb-2 text-center font-medium bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
        <button 
          onClick={handleGenerate}
          disabled={!selectedConcept}
          className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
            selectedConcept 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl active:scale-95' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Sparkles size={20} />
          Generate Images (Cost: 1 Token)
        </button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center p-6 h-screen w-full text-center space-y-8 bg-gradient-to-b from-indigo-50 to-white animate-in fade-in duration-1000">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-indigo-100 rounded-full absolute inset-0"></div>
        <div className="w-24 h-24 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="text-indigo-600 animate-pulse" size={28} />
        </div>
      </div>
      <div className="max-w-xs space-y-2">
        <h3 className="font-bold text-xl text-gray-900">Creating Masterpiece...</h3>
        <p className="text-gray-500 text-sm italic transition-opacity duration-500 h-16 flex items-center justify-center">
          {loadingText}
        </p>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="flex flex-col p-6 max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-12">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-2">
          <CheckCircle size={28} />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900">Generation Complete!</h2>
        <p className="text-gray-500 text-sm">Here are 3 variations based on <span className="font-bold">{CONCEPTS[selectedConcept]?.title}</span>.</p>
      </div>

      <div className="grid gap-8">
        {generatedImages.map((imgSrc, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 overflow-hidden">
            <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-gray-100 mb-4">
              {imgSrc ? (
                <img src={imgSrc} alt={`Variation ${idx + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                  <AlertCircle size={32} />
                  <p>Failed to generate</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => downloadImage(imgSrc, 'Standard')}
                disabled={!imgSrc}
                className="w-full py-3 bg-indigo-50 text-indigo-700 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition disabled:opacity-50"
              >
                <Download size={18} /> Download Standard (JPG)
              </button>
              
              <button 
                onClick={() => downloadPDF(imgSrc)}
                disabled={!imgSrc}
                className="w-full py-3 bg-gray-50 text-gray-700 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition disabled:opacity-50"
              >
                <Download size={18} /> Download as PDF
              </button>

              <button 
                onClick={() => {
                  alert("Processing High-Res Enhancement. This will download a 300dpi ready image.");
                  downloadImage(imgSrc, 'Enhanced_300dpi');
                }}
                disabled={!imgSrc}
                className="w-full mt-2 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50"
              >
                <Sparkles size={18} /> Enhanced Image (High-Res 300dpi)
              </button>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => setCurrentPage('concept')}
        className="mt-8 w-full py-4 text-indigo-600 font-bold border-2 border-indigo-100 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition"
      >
        <ImageIcon size={20} /> Generate Another Style
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-indigo-200">
      {currentPage !== 'loading' && renderHeader()}
      
      <main className="w-full h-full">
        {currentPage === 'home' && renderHome()}
        {currentPage === 'auth' && renderAuth()}
        {currentPage === 'upload' && renderUpload()}
        {currentPage === 'concept' && renderConcept()}
        {currentPage === 'loading' && renderLoading()}
        {currentPage === 'result' && renderResult()}
      </main>
    </div>
  );
}
