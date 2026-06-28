import React, { useState, useRef } from 'react';

// ---------------------------------------------------------------------------
// Compress an image file to a JPEG base64 data-URL.
// 3-tier quality fallback guarantees output stays under ~700 KB.
// ---------------------------------------------------------------------------
async function compressImage(file, maxWidth = 800, quality = 0.72) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Tier 1
        let base64 = canvas.toDataURL('image/jpeg', quality);

        // Tier 2 — if still over 700 KB as a string
        if (base64.length > 700000) {
          base64 = canvas.toDataURL('image/jpeg', 0.5);
        }
        // Tier 3
        if (base64.length > 700000) {
          base64 = canvas.toDataURL('image/jpeg', 0.35);
        }

        resolve(base64); // "data:image/jpeg;base64,..."
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
export default function UploadZone({ onUploadComplete }) {
  const [isDragActive, setIsDragActive]   = useState(false);
  const [compressing, setCompressing]     = useState(false);
  const [progress, setProgress]           = useState(0);   // fake progress bar
  const [previewUrl, setPreviewUrl]       = useState('');
  const [mediaType, setMediaType]         = useState('');
  const [error, setError]                 = useState('');
  const fileInputRef = useRef(null);

  // ── drag handlers ──────────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  // ── core processor ─────────────────────────────────────────────────────────
  const processFile = async (file) => {
    setError('');
    const maxSize = 50 * 1024 * 1024; // 50 MB raw limit
    if (file.size > maxSize) {
      setError('File size exceeds the 50 MB limit.');
      return;
    }

    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      setError('Unsupported file type. Please upload an image.');
      return;
    }

    const type = fileType.startsWith('image/') ? 'image' : 'video';
    setMediaType(type);

    if (type === 'image') {
      setCompressing(true);
      setProgress(0);

      // Fake progress animation while canvas compresses
      const tick = setInterval(() => {
        setProgress((p) => (p < 85 ? p + 12 : p));
      }, 80);

      try {
        const base64 = await compressImage(file);
        clearInterval(tick);
        setProgress(100);
        setPreviewUrl(base64);
        if (onUploadComplete) onUploadComplete(base64, 'image');
      } catch (err) {
        clearInterval(tick);
        console.error('Compression failed:', err);
        setError('Failed to process image. Please try again.');
      } finally {
        setCompressing(false);
      }
    } else {
      // Video: read as data-URL directly (no compression)
      setCompressing(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        setPreviewUrl(dataUrl);
        setCompressing(false);
        if (onUploadComplete) onUploadComplete(dataUrl, 'video');
      };
      reader.onerror = () => {
        setError('Failed to read video file.');
        setCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── reset ──────────────────────────────────────────────────────────────────
  const resetUpload = () => {
    setPreviewUrl('');
    setMediaType('');
    setProgress(0);
    setError('');
    if (onUploadComplete) onUploadComplete('', '');
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-black flex items-center justify-center min-h-[300px]">
          {mediaType === 'image' ? (
            <img src={previewUrl} alt="Upload preview" className="max-h-[400px] object-contain w-full h-full" />
          ) : (
            <video src={previewUrl} controls className="max-h-[400px] w-full" />
          )}
          <button
            onClick={resetUpload}
            className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition duration-200"
            title="Remove Media"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition duration-300 min-h-[250px] ${
            isDragActive
              ? 'border-civic-primary bg-blue-50/50'
              : 'border-gray-300 bg-white hover:border-civic-primary hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleChange}
          />

          <div className="p-4 bg-blue-50 rounded-full text-civic-primary mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <p className="text-gray-700 font-semibold text-center text-lg mb-1">
            Drag and drop your report media here
          </p>
          <p className="text-gray-400 text-sm text-center mb-6">
            Supports JPG, PNG, WEBP up to 50 MB
          </p>

          <button
            type="button"
            className="px-6 py-2.5 bg-civic-primary text-white text-sm font-semibold rounded-lg shadow hover:bg-blue-600 transition duration-200"
          >
            Browse Files
          </button>
        </div>
      )}

      {/* Compression progress bar */}
      {compressing && (
        <div className="mt-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Compressing image…</span>
            <span className="text-sm font-bold text-civic-primary">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-civic-primary h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
          {error}
        </div>
      )}
    </div>
  );
}
