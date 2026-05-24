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
      // Reset position/scale when new image is uploaded
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

      // --- 1. DRAW UPLOADED PHOTO (Masked as a Circle) with offset & scale ---
      ctx.save();
      ctx.beginPath();
      ctx.arc(CIRCLE_CENTER_X, CIRCLE_CENTER_Y, CIRCLE_RADIUS, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      const imgSize = CIRCLE_RADIUS * 2.2 * photoScale;
      const imgX = CIRCLE_CENTER_X - imgSize / 2 + photoOffset.x;
      const imgY = CIRCLE_CENTER_Y - imgSize / 2 + photoOffset.y;
      ctx.drawImage(userImg, imgX, imgY, imgSize, imgSize);
      ctx.restore();

      // --- 2. DRAW THE TRANSPARENT PNG TEMPLATE OVER IT ---
      const templateImg = new Image();
      templateImg.src = '/template.png';
      templateImg.onload = () => {
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

        // --- 3. DRAW THE TEXT FIELDS ---
        //ctx.font = '900 38px "Noto Serif Bengali", serif';
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const textStartX = 690;
        const pill1Y = 610;
        const pill2Y = 685;
        const pill3Y = 760;

        // Name — heavier & larger
ctx.font = '900 38px "Noto Serif Bengali", serif';
ctx.fillText(name || 'আপনার নাম', textStartX, pill1Y);

// Department & Session — original weight
ctx.font = 'bold 36px "Noto Serif Bengali", serif';
ctx.fillText(department || 'বিভাগ', textStartX, pill2Y);
ctx.fillText(session || 'সেশন', textStartX, pill3Y);
      };
    });
  }, [imageSrc, name, department, session, photoOffset, photoScale]);

  // Get the ratio between internal canvas size and displayed size
  const getCanvasScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    return 1080 / canvas.getBoundingClientRect().width;
  }, []);

  // Check if pointer is inside the circle area (in canvas coords)
  const isInsideCircle = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const scale = getCanvasScale();
    const cx = (clientX - rect.left) * scale;
    const cy = (clientY - rect.top) * scale;
    const dx = cx - CIRCLE_CENTER_X;
    const dy = cy - CIRCLE_CENTER_Y;
    return Math.sqrt(dx * dx + dy * dy) <= CIRCLE_RADIUS;
  }, [getCanvasScale]);

  // --- Mouse Events ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageSrc) return;
    isDragging.current = true;
    setIsDraggingState(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
  }, [imageSrc]);

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

  // --- Scroll to Zoom (wheel) ---
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    setPhotoScale(prev => Math.min(5, Math.max(0.3, prev - e.deltaY * 0.002)));
  }, [imageSrc]);

  // --- Touch Events ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      isDragging.current = true;
      setIsDraggingState(true);
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPinchDist.current = null;
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      setIsDraggingState(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [imageSrc]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
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
    const link = document.createElement('a');
    link.download = `${name || 'gbc-guest'}-photocard.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleReset = () => {
    setPhotoOffset({ x: 0, y: 0 });
    setPhotoScale(1);
  };
  const departments = [
    '',
    'এইচএসসি (বিজ্ঞান)',
    'এইচএসসি (ব্যবসায় শিক্ষা)',
    'এইচএসসি (মানবিক)',
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
    // Convert to Bengali digits
    const toBengali = (n: number) =>
      String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[+d]);
    sessions.push(`${toBengali(y)}-${toBengali((y + 1) % 100).padStart(2, '০')}`);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        .font-bengali { font-family: 'Noto Serif Bengali', serif; }

        body { margin: 0; background: #f0f4ff; }

        .card { background: #fff; border-radius: 2rem; padding: 2rem; box-shadow: 0 8px 40px rgba(80,60,180,0.10); border: 1px solid #e8e4ff; width: 100%; max-width: 540px; margin: 0 auto; }

        .page-title { font-size: 1.7rem; font-weight: 700; color: #2d1a6e; margin-bottom: 0.25rem; text-align: center; }
        .page-sub { color: #e85d75; font-weight: 600; font-size: 1rem; text-align: center; margin-bottom: 1.8rem; }

        label.field-label { display: block; font-size: 0.82rem; font-weight: 700; color: #6b5e9e; margin-bottom: 0.35rem; letter-spacing: 0.01em; }

        input[type="text"] {
          width: 100%; padding: 0.75rem 1rem;
          background: #f7f5ff; border: 1.5px solid #d8d0f5;
          border-radius: 0.85rem; font-size: 1rem;
          font-family: 'Noto Serif Bengali', serif;
          color: #2d1a6e; outline: none;
          transition: border-color 0.2s;
        }
        input[type="text"]:focus { border-color: #7c5cbf; background: #fff; }
        input[type="text"]::placeholder { color: #b0a8d0; }

        .field-row { display: flex; gap: 1rem; }
        .field-row > div { flex: 1; }

        .upload-btn-wrapper { position: relative; margin-top: 0.5rem; }
        .upload-btn-wrapper input[type="file"] {
          position: absolute; inset: 0; width: 100%; height: 100%;
          opacity: 0; cursor: pointer; z-index: 10;
        }
        .upload-btn-inner {
          width: 100%; padding: 0.85rem 1.2rem;
          background: #f0ebff; border: 2px dashed #b39ddb;
          border-radius: 0.85rem; display: flex; align-items: center;
          justify-content: center; gap: 0.6rem; color: #6d4fc2;
          font-weight: 600; font-size: 0.97rem; cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .upload-btn-inner:hover { background: #e4d8ff; border-color: #7c5cbf; }
        .upload-icon { font-size: 1.3rem; }

        /* Canvas preview area */
        .preview-area {
          background: linear-gradient(135deg, #f0ebff 0%, #e8f0ff 100%);
          border-radius: 1.25rem; padding: 1rem;
          border: 1.5px solid #dcd4f7;
          display: flex; flex-direction: column; align-items: center;
          min-height: 180px; justify-content: center;
          position: relative; overflow: hidden;
        }
        .preview-empty { text-align: center; color: #9e90c8; padding: 2.5rem 0; }
        .preview-empty .empty-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }

        canvas {
          width: 100%; aspect-ratio: 1/1; border-radius: 0.9rem;
          box-shadow: 0 4px 20px rgba(80,60,180,0.13);
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        canvas.dragging { cursor: grabbing; }
        canvas.can-drag { cursor: grab; }

        /* Adjustment hint bar */
        .adjust-hint {
          display: flex; align-items: center; justify-content: space-between;
          background: #f0ebff; border-radius: 0.75rem;
          padding: 0.55rem 0.9rem; margin-top: 0.65rem; width: 100%;
          font-size: 0.82rem; color: #7c5cbf; font-weight: 600;
          gap: 0.5rem;
        }
        .hint-icons { display: flex; align-items: center; gap: 0.5rem; }
        .hint-icon { font-size: 1rem; }
        .reset-btn {
          background: #fff; border: 1.5px solid #c4b0f0; color: #6d4fc2;
          border-radius: 0.5rem; padding: 0.2rem 0.65rem; font-size: 0.78rem;
          font-weight: 700; cursor: pointer; font-family: 'Noto Serif Bengali', serif;
          transition: background 0.15s;
        }
        .reset-btn:hover { background: #e9deff; }

        /* Scale indicator */
        .scale-bar { width: 100%; margin-top: 0.5rem; }
        .scale-track {
          width: 100%; height: 6px; background: #e2d9f7;
          border-radius: 99px; position: relative; cursor: pointer;
        }
        .scale-fill {
          height: 100%; background: linear-gradient(90deg, #7c5cbf, #b39ddb);
          border-radius: 99px; transition: width 0.1s;
        }
        .scale-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: #9e90c8; margin-top: 0.25rem; }

        /* Download button */
        .download-btn {
          width: 100%; margin-top: 1.25rem;
          background: linear-gradient(135deg, #5b35b8 0%, #9b59b6 100%);
          color: #fff; font-weight: 700; font-size: 1.05rem;
          padding: 1rem 1.5rem; border-radius: 1rem; border: none;
          cursor: pointer; font-family: 'Noto Serif Bengali', serif;
          box-shadow: 0 4px 18px rgba(91,53,184,0.30);
          transition: transform 0.15s, box-shadow 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 0.6rem;
        }
        .download-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(91,53,184,0.38); }
        .download-btn:active { transform: translateY(0); }

        .space-y > * + * { margin-top: 1rem; }
        .mt-6 { margin-top: 1.5rem; }
        .main-wrap {
          min-height: 100vh; display: flex; align-items: center;
          justify-content: center; padding: 1.5rem;
          font-family: 'Noto Serif Bengali', serif;
        }
      `}} />

      <main className="main-wrap">
        <div className="card">

          <div>
            <p className="page-title">গভঃ বাংলা কলেজ মিলনমেলা</p>
            <p className="page-sub">ফটোকার্ড জেনারেটর</p>
          </div>

          <div className="space-y">

            {/* Name */}
            <div>
              <label className="field-label">নাম: (বাংলায়)</label>
              <input
                type="text"
                placeholder="E.x: মোঃ আতিকুর রহমান"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Department + Session */}
            <div className="field-row">
              <div>
                <label className="field-label">বিভাগ:</label>
                <select
                  value={department}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val.startsWith('──') && val !== departments[0]) setDepartment(val);
                  }}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    background: '#f7f5ff', border: '1.5px solid #d8d0f5',
                    borderRadius: '0.85rem', fontSize: '1rem',
                    fontFamily: "'Noto Serif Bengali', serif",
                    color: department ? '#2d1a6e' : '#b0a8d0',
                    outline: 'none', cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237c5cbf' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                  }}
                >
                  {departments.map((d, i) => (
                    <option
                      key={i}
                      value={d}
                      disabled={d === '' || d.startsWith('──')}
                      style={{ color: d.startsWith('──') ? '#9e90c8' : '#2d1a6e' }}
                    >
                      {d === '' ? 'বিভাগ নির্বাচন করুন' : d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">সেশন:</label>
                <select
                  value={session}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== sessions[0]) setSession(val);
                  }}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    background: '#f7f5ff', border: '1.5px solid #d8d0f5',
                    borderRadius: '0.85rem', fontSize: '1rem',
                    fontFamily: "'Noto Serif Bengali', serif",
                    color: session ? '#2d1a6e' : '#b0a8d0',
                    outline: 'none', cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237c5cbf' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                  }}
                >
                  {sessions.map((s, i) => (
                    <option key={i} value={s} disabled={s === ''} style={{ color: '#2d1a6e' }}>
                      {s === '' ? 'সেশন নির্বাচন করুন' : s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload */}
            <div>
              <label className="field-label">আপনার ছবি আপলোড করুন:</label>
              <div className="upload-btn-wrapper">
                <input type="file" accept="image/*" onChange={handleImageUpload} />
                <div className="upload-btn-inner">
                  <span className="upload-icon">📷</span>
                  <span>ছবি নির্বাচন করুন</span>
                </div>
              </div>
            </div>

          </div>

          {/* Preview */}
          <div className="mt-6">
            <div className="preview-area">
              {!imageSrc ? (
                <div className="preview-empty">
                  <div className="empty-icon">🖼️</div>
                  <p>ছবি আপলোড করার পর প্রিভিউ দেখা যাবে</p>
                </div>
              ) : (
                <>
                  <canvas
                    ref={canvasRef}
                    className={isDraggingState ? 'dragging' : 'can-drag'}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />

                  {/* Adjust hint bar */}
                  <div className="adjust-hint">
                    <div className="hint-icons">
                      <span className="hint-icon">✋</span>
                      <span>ছবি টেনে সরান</span>
                      <span style={{ margin: '0 4px', opacity: 0.4 }}>|</span>
                      <span className="hint-icon">🔍</span>
                      <span>পিঞ্চ / স্ক্রল করে জুম করুন</span>
                    </div>
                    <button className="reset-btn" onClick={handleReset}>রিসেট</button>
                  </div>

                  {/* Zoom slider */}
                  <div className="scale-bar">
                    <input
                      type="range"
                      min="0.3"
                      max="5"
                      step="0.01"
                      value={photoScale}
                      onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: '#7c5cbf',
                        cursor: 'pointer',
                        margin: '0.4rem 0 0.1rem',
                      }}
                    />
                    <div className="scale-label">
                      <span>ছোট</span>
                      <span>{Math.round(photoScale * 100)}%</span>
                      <span>বড়</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Download */}
          {imageSrc && (
            <button className="download-btn" onClick={handleDownload}>
              <span>⬇️</span>
              <span>ডাউনলোড করুন ও শেয়ার করুন</span>
            </button>
          )}

        </div>
      </main>
    </>
  );
}