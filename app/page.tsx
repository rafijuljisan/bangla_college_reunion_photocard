'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function Home() {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [session, setSession] = useState('');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [photoScale, setPhotoScale] = useState(1);
  const [isDraggingState, setIsDraggingState] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const userImgRef = useRef<HTMLImageElement | null>(null);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  // Circle config (canvas coords)
  const CIRCLE_CENTER_X = 330;
  const CIRCLE_CENTER_Y = 510;
  const CIRCLE_RADIUS = 255;

  // Load user image into ref once
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      userImgRef.current = img;
      setPhotoOffset({ x: 0, y: 0 });
      setPhotoScale(1);
    };
  }, [imageSrc]);

  // Redraw canvas whenever anything changes
  useEffect(() => {
    if (!imageSrc || !userImgRef.current) return;

    document.fonts.ready.then(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1080;
      canvas.height = 1080;

      const userImg = userImgRef.current!;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- 1. DRAW UPLOADED PHOTO ---
      ctx.save();
      ctx.beginPath();
      ctx.arc(CIRCLE_CENTER_X, CIRCLE_CENTER_Y, CIRCLE_RADIUS, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      const baseSize = CIRCLE_RADIUS * 2.2;
      const aspectRatio = userImg.naturalWidth / userImg.naturalHeight;

      let drawWidth, drawHeight;
      if (aspectRatio >= 1) {
        drawHeight = baseSize * photoScale;
        drawWidth = drawHeight * aspectRatio;
      } else {
        drawWidth = baseSize * photoScale;
        drawHeight = drawWidth / aspectRatio;
      }

      const imgX = CIRCLE_CENTER_X - drawWidth / 2 + photoOffset.x;
      const imgY = CIRCLE_CENTER_Y - drawHeight / 2 + photoOffset.y;
      ctx.drawImage(userImg, imgX, imgY, drawWidth, drawHeight);
      ctx.restore();

      // --- 2. DRAW TEMPLATE ---
      const templateImg = new Image();
      templateImg.src = '/template.png';
      templateImg.onload = () => {
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

        // --- 3. DRAW TEXT FIELDS ---
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const textStartX = 690;
        const pill1Y = 610;
        const pill2Y = 685;
        const pill3Y = 760;

        ctx.font = '900 34px "Noto Serif Bengali", serif';
        ctx.fillText(name || 'আপনার নাম', textStartX, pill1Y);

        ctx.font = 'bold 34px "Noto Serif Bengali", serif';
        ctx.fillText(department || 'বিভাগ', textStartX, pill2Y);
        ctx.fillText(session || 'সেশন', textStartX, pill3Y);
      };
    });
  }, [imageSrc, name, department, session, photoOffset, photoScale]);

  const getCanvasScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    return 1080 / canvas.getBoundingClientRect().width;
  }, []);
  // Check if pointer is inside the photo circle area
  const isInsideCircle = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const scale = getCanvasScale();
    
    // Get mouse/touch coordinates relative to the internal 1080x1080 canvas
    const cx = (clientX - rect.left) * scale;
    const cy = (clientY - rect.top) * scale;
    
    // Calculate distance from the center of the photo circle
    const dx = cx - CIRCLE_CENTER_X;
    const dy = cy - CIRCLE_CENTER_Y;
    
    // If distance is less than radius, they are touching the photo
    return Math.sqrt(dx * dx + dy * dy) <= CIRCLE_RADIUS;
  }, [getCanvasScale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageSrc) return;
    
    // IF OUTSIDE THE CIRCLE: Do nothing, allow normal clicking
    if (!isInsideCircle(e.clientX, e.clientY)) return;

    isDragging.current = true;
    setIsDraggingState(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
  }, [imageSrc, isInsideCircle]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!imageSrc) return;
    
    // Only check the first touch point
    const touch = e.touches[0];
    
    // IF OUTSIDE THE CIRCLE: Let the browser handle it (Allows page scrolling!)
    if (!isInsideCircle(touch.clientX, touch.clientY)) return;

    // IF INSIDE THE CIRCLE: Prevent scrolling and start dragging/zooming
    e.preventDefault(); 
    
    if (e.touches.length === 1) {
      isDragging.current = true;
      setIsDraggingState(true);
      lastPointer.current = { x: touch.clientX, y: touch.clientY };
      lastPinchDist.current = null;
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      setIsDraggingState(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [imageSrc, isInsideCircle]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!imageSrc) return;

    // IF OUTSIDE THE CIRCLE: Allow normal page scrolling with the mouse wheel
    if (!isInsideCircle(e.clientX, e.clientY)) return;

    e.preventDefault();
    setPhotoScale(prev => Math.min(5, Math.max(0.3, prev - e.deltaY * 0.002)));
  }, [imageSrc, isInsideCircle]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const scale = getCanvasScale();
    const dx = (e.clientX - lastPointer.current.x) * scale;
    const dy = (e.clientY - lastPointer.current.y) * scale;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setPhotoOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, [getCanvasScale]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    setIsDraggingState(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!imageSrc) return;
    if (e.touches.length === 1 && isDragging.current) {
      const scale = getCanvasScale();
      const dx = (e.touches[0].clientX - lastPointer.current.x) * scale;
      const dy = (e.touches[0].clientY - lastPointer.current.y) * scale;
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setPhotoOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const delta = newDist - lastPinchDist.current;
      lastPinchDist.current = newDist;
      setPhotoScale(prev => Math.min(5, Math.max(0.3, prev + delta * 0.005)));
    }
  }, [imageSrc, getCanvasScale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      isDragging.current = false;
      setIsDraggingState(false);
      lastPinchDist.current = null;
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fileName = `${name || 'gbc-guest'}-photocard.png`;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // iOS → use native share sheet
      if (isIOS && navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'সরকারি বাংলা কলেজ' });
            return;
          } catch (error) {
            if ((error as Error).name === 'AbortError') return; // user canceled
          }
        }
      }

      // Android + Desktop → direct download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    }, 'image/png');
  };

  const departments = [
    '',
    'এইচএসসি (বিজ্ঞান)',
    'এইচএসসি (ব্যবসায় শিক্ষা)',
    'এইচএসসি (মানবিক)',
    '── ডিগ্রী ──',
    'বি.বি.এস (ডিগ্রী)',
    'বি.এ (ডিগ্রী)',
    'বি.কম (ডিগ্রী)',
    'বি.এস.সি (ডিগ্রী)',
    'বি.এস.এস (ডিগ্রী)',
    '── মানবিক ও সামাজিক বিজ্ঞান অনুষদ ──',
    'বাংলা', 'ইংরেজি', 'ইতিহাস', 'ইসলামের ইতিহাস ও সংস্কৃতি',
    'ইসলামিক স্টাডিজ', 'দর্শন', 'অর্থনীতি', 'রাষ্ট্রবিজ্ঞান', 'সমাজকর্ম',
    '── বিজ্ঞান অনুষদ ──',
    'রসায়ন', 'পদার্থবিজ্ঞান', 'উদ্ভিদবিজ্ঞান', 'প্রাণিবিদ্যা',
    'গণিত', 'মৃত্তিকাবিজ্ঞান', 'ভূগোল ও পরিবেশ',
    '── ব্যবসায় শিক্ষা অনুষদ ──',
    'ব্যবস্থাপনা', 'হিসাববিজ্ঞান', 'ফিন্যান্স ও ব্যাংকিং', 'মার্কেটিং',
  ];

  const sessions = [''];
  for (let y = 1962; y <= 2025; y++) {
    const toBengali = (n: number) => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[+d]);
    sessions.push(`${toBengali(y)}-${toBengali((y + 1) % 100).padStart(2, '০')}`);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700;900&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Noto Serif Bengali', serif; }
        body { background: #f4f6fc; overflow-x: hidden; }

        /* Background & Layout */
        .app-layout { position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 5%; }
        .bg-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: url('/bg.jpg') center/cover no-repeat; z-index: -2; }
        .bg-overlay { 
          position: fixed; 
          top: 0; 
          left: 0; 
          width: 100%; 
          height: 100vh; 
          /* Vibrant, lighter purple-to-cyan gradient with lower opacity */
          background: linear-gradient(135deg, rgba(91, 108, 249, 0.45) 0%, rgba(56, 189, 248, 0.3) 100%); 
          /* Increased blur for a smoother, glossier frosted glass look */
          backdrop-filter: blur(10px); 
          -webkit-backdrop-filter: blur(10px);
          z-index: -1; 
        }
        .bg-shapes { position: fixed; bottom: -100px; left: -100px; width: 500px; height: 500px; background: rgba(255,255,255,0.4); filter: blur(80px); border-radius: 50%; z-index: -1; }

        /* Desktop specific side elements */
        .desktop-header { position: absolute; top: 3rem; left: 4rem; display: flex; align-items: center; gap: 1rem; }
        .desktop-logo { width: 60px; height: 60px; background: #fff; border-radius: 50%; padding: 5px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .desktop-title h1 { font-size: 1.5rem; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.3); font-weight: 700; margin-bottom: 0.2rem; }
        .desktop-title p { font-size: 1rem; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }

        .floating-badge { position: absolute; bottom: 3rem; left: 4rem; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); padding: 1rem 1.5rem; border-radius: 1rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .badge-icon { width: 45px; height: 45px; background: #5b6cf9; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
        .badge-text h4 { font-size: 1.1rem; color: #2d1a6e; margin-bottom: 0.2rem; }
        .badge-text p { font-size: 0.9rem; color: #6b5e9e; }

        /* Main Card */
        .card { background: #fff; border-radius: 1.5rem; padding: 2.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.15); width: 100%; max-width: 600px; z-index: 10; position: relative; }
        
        .card-header { text-align: center; margin-bottom: 2rem; position: relative; }
        .card-header h2 { font-size: 1.8rem; font-weight: 800; color: #2d1a6e; margin-bottom: 0.5rem; }
        .card-header p { font-size: 1.1rem; color: #5b6cf9; font-weight: 600; }
        .grad-icon { position: absolute; right: 0; top: -10px; width: 50px; opacity: 0.9; }

        /* Form Inputs */
        .form-group { margin-bottom: 1.2rem; }
        .form-row { display: flex; gap: 1rem; }
        .form-row > div { flex: 1; }
        label.field-label { display: block; font-size: 0.9rem; font-weight: 600; color: #4a5568; margin-bottom: 0.5rem; }
        
        .input-wrapper { position: relative; }
        .input-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; color: #a0aec0; pointer-events: none; }
        .input-wrapper input, .input-wrapper select {
          width: 100%; padding: 0.9rem 1rem 0.9rem 2.8rem; border: 1px solid #e2e8f0; border-radius: 0.75rem;
          font-size: 1rem; color: #2d3748; background: #fff; outline: none; transition: all 0.2s;
          appearance: none;
        }
        .input-wrapper input::placeholder {
          opacity: 0.5; /* যত কমাবে তত হালকা হবে */
        }
        .input-wrapper input:focus, .input-wrapper select:focus { border-color: #5b6cf9; box-shadow: 0 0 0 3px rgba(91,108,249,0.1); }
        .input-wrapper select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a0aec0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; background-size: 1em; }

        /* Upload Box */
        .upload-area { position: relative; border: 2px dashed #cbd5e1; border-radius: 0.75rem; background: #f8fafc; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.2s; margin-top: 0.5rem; }
        .upload-area:hover { border-color: #5b6cf9; background: #f0f4ff; }
        .upload-area input[type="file"] { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .upload-content { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none; }
        .upload-content .cloud-icon { width: 28px; height: 28px; color: #5b6cf9; }
        .upload-content h4 { font-size: 1rem; color: #1e293b; font-weight: 600; }
        .upload-content p { font-size: 0.8rem; color: #94a3b8; }

        /* Canvas Preview */
        .preview-area { margin-top: 1.5rem; border-radius: 1rem; overflow: hidden; position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.08); background: #f8fafc; }
        canvas { width: 100%; aspect-ratio: 1/1; touch-action: none; display: block; }
        .controls-overlay { padding: 1rem; background: #fff; border-top: 1px solid #f1f5f9; }

        /* Action Button */
        .btn-primary { width: 100%; padding: 1rem; background: #5b6cf9; color: white; border: none; border-radius: 0.75rem; font-size: 1.1rem; font-weight: 700; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 0.5rem; transition: transform 0.1s, box-shadow 0.2s; margin-top: 1.5rem; box-shadow: 0 4px 15px rgba(91,108,249,0.3); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(91,108,249,0.4); }
        .btn-primary:active { transform: translateY(0); }
        
        .trust-badge { display: flex; align-items: center; justify-content: center; gap: 0.4rem; margin-top: 1rem; font-size: 0.85rem; color: #64748b; }
        .trust-badge svg { color: #10b981; width: 16px; height: 16px; }

        /* Footer Credits */
        .credits { text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9; }
        .credits p { font-size: 0.85rem; color: #64748b; margin-bottom: 0.3rem; }
        .credits a { color: #5b6cf9; text-decoration: none; font-weight: 700; }

        /* Mobile specific styles */
        .mobile-header, .mobile-nav { display: none; }

        @media (max-width: 768px) {
          .app-layout { padding: 0; align-items: flex-start; justify-content: center; background: #f4f6fc; }
          .bg-layer { height: 40vh; position: absolute; z-index: 0; }
          .bg-overlay, .bg-shapes, .desktop-header, .floating-badge { display: none; }
          
          /* Mobile Top Bar Overlay */
          .mobile-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; position: absolute; top: 0; width: 100%; z-index: 10; }
          .mobile-time { color: white; font-weight: 600; font-family: sans-serif; }
          .hamburger { background: rgba(255,255,255,0.9); padding: 0.5rem; border-radius: 0.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); cursor: pointer; }
          
          .card { max-width: 100%; border-radius: 2rem 2rem 0 0; margin-top: 30vh; padding: 2rem 1.5rem; padding-bottom: 100px; box-shadow: 0 -10px 40px rgba(0,0,0,0.1); z-index: 5; min-height: 70vh; }
          .form-row { flex-direction: column; gap: 0; }
          
          /* Mobile Bottom Navigation */
          .mobile-nav { display: none; position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; box-shadow: 0 -5px 20px rgba(0,0,0,0.05); z-index: 50; padding: 0.8rem 1.5rem; justify-content: space-between; align-items: center; border-radius: 1.5rem 1.5rem 0 0; }
          .nav-item { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; color: #a0aec0; font-size: 0.75rem; cursor: pointer; }
          .nav-item.active { color: #5b6cf9; }
          .nav-icon-wrap { padding: 0.5rem; border-radius: 50%; }
          .nav-item.active .nav-icon-wrap { background: rgba(91,108,249,0.1); color: #5b6cf9; }
          .nav-create { background: #5b6cf9; color: white; padding: 0.8rem; border-radius: 50%; transform: translateY(-20px); box-shadow: 0 5px 15px rgba(91,108,249,0.3); }
        }
        `
      }} />

      <div className="app-layout">
        <div className="bg-layer"></div>
        <div className="bg-overlay"></div>
        <div className="bg-shapes"></div>

        {/* Desktop Absolute Elements */}
        <div className="desktop-header">
          {/* Fallback college logo placeholder if logo.png is missing */}
          <div className="desktop-logo">
             <img src="/logo.png" alt="Logo" style={{width:'100%', height:'100%', objectFit:'contain', borderRadius:'50%'}} onError={(e) => { e.currentTarget.style.display='none'; }}/>
          </div>
          <div className="desktop-title">
            <h1>সরকারি বাঙলা কলেজ</h1>
            <p>প্রাক্তন শিক্ষার্থীদের প্রথম মিলনমেলা-২০২৬</p>
          </div>
        </div>

        <div className="floating-badge">
          <div className="badge-icon">👥</div>
          <div className="badge-text">
            <h4>স্মৃতির টানে, প্রিয় প্রাঙ্গনে</h4>
            <p>এই মূল সুরকে ধারণ করে দিনব্যাপী এই উৎসবের আয়োজন করা হয়েছে। ❤️</p>
          </div>
        </div>

        {/* Mobile Header elements */}
        <div className="mobile-header">
          <div className="mobile-time"></div>
          <div className="hamburger">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2d1a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </div>
        </div>

        {/* Main Interface Form */}
        <div className="card">
          <div className="card-header">
            <h2>সরকারি বাঙলা কলেজ</h2>
            <p>প্রাক্তন শিক্ষার্থীদের প্রথম মিলনমেলা-২০২৬</p>
            <div style={{color: '#6b5e9e', fontSize: '0.9rem', marginTop: '0.5rem'}}>ফটোকার্ড জেনারেটর</div>
          </div>

          {/* Form Fields */}
          <div className="form-group">
            <label className="field-label">নাম (বাঙলায়)</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <input type="text" placeholder="যেমন: মোঃ আতিকুর রহমান" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="field-label">বিভাগ</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <select value={department} onChange={(e) => {
                    const val = e.target.value;
                    if (!val.startsWith('──') && val !== departments[0]) setDepartment(val);
                  }}>
                  {departments.map((d, i) => (
                    <option key={i} value={d} disabled={d === '' || d.startsWith('──')} style={{ color: d.startsWith('──') ? '#9e90c8' : '#2d1a6e' }}>
                      {d === '' ? 'বিভাগ নির্বাচন করুন' : d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">সেশন</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <select value={session} onChange={(e) => {
                    const val = e.target.value;
                    if (val !== sessions[0]) setSession(val);
                  }}>
                  {sessions.map((s, i) => (
                    <option key={i} value={s} disabled={s === ''} style={{ color: '#2d1a6e' }}>
                      {s === '' ? 'সেশন নির্বাচন করুন' : s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="field-label">আপনার ছবি আপলোড করুন</label>
            <div className="upload-area">
              <input type="file" accept="image/*" onChange={handleImageUpload} />
              <div className="upload-content">
                <svg className="cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <h4>ছবি নির্বাচন করুন</h4>
                <p>JPG, PNG বা WEBP (সর্বোচ্চ 5MB)</p>
              </div>
            </div>
          </div>

          {/* Canvas Preview Area (Appears after upload) */}
          {imageSrc && (
            <div className="preview-area">
              <canvas
                ref={canvasRef}
                className={isDraggingState ? 'dragging' : 'can-drag'}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                onWheel={handleWheel} onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                style={{ cursor: isDraggingState ? 'grabbing' : 'grab' }}
              />
              <div className="controls-overlay">
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <div style={{fontSize:'0.9rem', color:'#4a5568', fontWeight: 600}}>ছবি জুম করুন:</div>
                    <button onClick={() => { setPhotoOffset({ x: 0, y: 0 }); setPhotoScale(1); }} style={{background:'#f0f4ff', border:'none', color:'#5b6cf9', fontWeight:700, cursor:'pointer', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', transition: 'background 0.2s'}}>রিসেট</button>
                 </div>
                 
                 {/* Restored Zoom Slider */}
                 <input
                   type="range"
                   min="0.3"
                   max="5"
                   step="0.01"
                   value={photoScale}
                   onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
                   style={{
                     width: '100%',
                     accentColor: '#5b6cf9',
                     cursor: 'pointer',
                     height: '6px',
                     background: '#e2e8f0',
                     borderRadius: '10px',
                     appearance: 'auto'
                   }}
                 />
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem', fontWeight: 600 }}>
                   <span>ছোট</span>
                   <span style={{ color: '#5b6cf9' }}>{Math.round(photoScale * 100)}%</span>
                   <span>বড়</span>
                 </div>
                 
                 <div style={{fontSize:'0.8rem', color:'#64748b', textAlign: 'center', marginTop: '1rem'}}>
                   <span style={{opacity: 0.7}}>☝️</span> ছবি টেনে সঠিক স্থানে বসান
                 </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button className="btn-primary" onClick={handleDownload}>
            {isIOS ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                ফটোকার্ড শেয়ার / সেভ করুন
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                ফটোকার্ড ডাউনলোড করুন
              </>
            )}
          </button>
          
          <div className="trust-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
            আপনার তথ্য সম্পূর্ণ নিরাপদ এবং গোপনীয়
          </div>

          <div className="credits">
            <p>সৌজন্যে: সরকারি বাঙলা কলেজ পরিবার</p>
            <p>Developed by <a href="https://jisan.openwindowbd.com" target="_blank" rel="noreferrer">Jisan Sheikh</a></p>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="mobile-nav">
          <div className="nav-item">
            <div className="nav-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>
            <span>হোম</span>
          </div>
          <div className="nav-item">
            <div className="nav-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>
            <span>গ্যালারি</span>
          </div>
          <div className="nav-item active" style={{marginTop:'-15px'}}>
            <div className="nav-create"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z"></path></svg></div>
            <span style={{marginTop:'5px', color:'#5b6cf9'}}>তৈরি করুন</span>
          </div>
          <div className="nav-item">
            <div className="nav-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
            <span>প্রোফাইল</span>
          </div>
        </div>

      </div>
    </>
  );
}