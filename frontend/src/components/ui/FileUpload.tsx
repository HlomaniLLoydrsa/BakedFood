import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  accept?: string;
  onChange: (file: File | null) => void;
  error?: string;
  hint?: string;
  currentUrl?: string;
  value?: File | null;
}

export function FileUpload({ label, accept, onChange, error, hint, currentUrl, value }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    onChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const isImage = value?.type.startsWith('image/') || (currentUrl && !currentUrl.endsWith('.pdf'));
  const isPdf = value?.type === 'application/pdf' || currentUrl?.endsWith('.pdf');

  return (
    <div className="w-full">
      {label && <p className="label-base">{label}</p>}

      {/* Preview */}
      {(value || currentUrl) && (
        <div className="mb-3 relative inline-block">
          {isImage ? (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-200">
              <img
                src={value ? URL.createObjectURL(value) : currentUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute top-1 right-1 p-0.5 bg-white rounded-full shadow-sm border border-zinc-200 hover:bg-red-50"
              >
                <X size={12} className="text-zinc-500" />
              </button>
            </div>
          ) : isPdf ? (
            <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <FileText size={20} className="text-zinc-500" />
              <span className="text-sm text-zinc-700">{value?.name || 'Uploaded file'}</span>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="ml-auto p-0.5 hover:bg-zinc-200 rounded"
              >
                <X size={12} className="text-zinc-500" />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Drop zone */}
      {!value && !currentUrl && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dragOver
              ? 'border-zinc-900 bg-zinc-50'
              : error
              ? 'border-red-300 bg-red-50'
              : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
            {accept?.includes('pdf') ? (
              <FileText size={16} className="text-zinc-500" />
            ) : (
              <Image size={16} className="text-zinc-500" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-900">Click to upload</p>
            <p className="text-xs text-zinc-500 mt-0.5">{hint || 'or drag and drop'}</p>
          </div>
        </div>
      )}

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-xs text-zinc-500 hover:text-red-500 flex items-center gap-1"
        >
          <X size={12} /> Remove file
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
