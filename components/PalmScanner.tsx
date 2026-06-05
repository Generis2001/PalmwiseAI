"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
  preview?: string | null;
}

export function PalmScanner({ onFile, disabled, preview }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<"select" | "camera" | "gallery">("select");

  const handleFile = useCallback(
    (f: File) => {
      if (!f.type.startsWith("image/")) return;
      onFile(f);
    },
    [onFile]
  );

  // Show the right hidden input based on mode
  if (mode === "camera") {
    return (
      <div className="w-full">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            setMode("select");
          }}
        />
        {!preview && (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={disabled}
              className="w-full max-w-xs aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#19D184] bg-[#19D184]/10 transition-all cursor-pointer"
            >
              <svg className="w-14 h-14 text-[#19D184] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[#19D184] text-sm font-medium">Open Camera</span>
              <span className="text-gray-500 text-xs mt-1">Tap when ready</span>
            </button>
            <button
              onClick={() => setMode("select")}
              className="text-sm text-gray-500 hover:text-gray-300 transition"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Camera input (hidden, triggered by camera button) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {/* Gallery input (hidden, triggered by upload button) */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-[#19D184]/40 aspect-square max-w-xs mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Palm preview"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <button
              onClick={() => setMode("select")}
              className="absolute bottom-3 right-3 px-3 py-1.5 text-xs rounded-md bg-black/70 text-white border border-white/20 hover:bg-black/90 transition"
            >
              Change
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {/* Drop zone */}
          <button
            disabled={disabled}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`w-full max-w-xs aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              dragging
                ? "border-[#19D184] bg-[#19D184]/10"
                : "border-gray-700 hover:border-[#19D184]/60 hover:bg-[#19D184]/5"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-gray-400 text-sm text-center px-4">
              Drop your palm photo here
            </span>
            <span className="text-gray-600 text-xs mt-1">
              Or choose an option below
            </span>
          </button>

          {/* Camera / Gallery buttons */}
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={() => {
                if (disabled) return;
                cameraRef.current?.click();
              }}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm hover:border-[#19D184]/60 hover:text-[#19D184] transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              Camera
            </button>
            <button
              onClick={() => {
                if (disabled) return;
                galleryRef.current?.click();
              }}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm hover:border-[#19D184]/60 hover:text-[#19D184] transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Gallery
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
