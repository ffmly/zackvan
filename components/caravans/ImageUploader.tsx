'use client';

import Image from 'next/image';
import { CloudUpload, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  fetchUploadSignature,
  uploadToCloudinary,
} from '@/lib/cloudinary';
import type { CloudinaryImage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UploadingItem {
  key: string;
  name: string;
  progress: number;
}

const MAX_IMAGES = 8;
const MAX_SIZE_MB = 5;

export default function ImageUploader({
  value,
  onChange,
  maxImages = MAX_IMAGES,
  folder,
  label = 'Click or drag photos here',
}: {
  value: CloudinaryImage[];
  onChange: (images: CloudinaryImage[]) => void;
  maxImages?: number;
  folder?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  function validate(file: File): string | null {
    if (!file.type.startsWith('image/')) return `${file.name} is not an image.`;
    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return `${file.name} exceeds ${MAX_SIZE_MB} MB.`;
    return null;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const room = maxImages - value.length - uploading.length;
    if (room <= 0) {
      setError(`You can upload up to ${maxImages} image${maxImages === 1 ? '' : 's'}.`);
      return;
    }

    const accepted = Array.from(files).slice(0, room);
    for (const file of accepted) {
      const invalid = validate(file);
      if (invalid) {
        setError(invalid);
        continue;
      }
      const key = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setUploading((prev) => [...prev, { key, name: file.name, progress: 0 }]);
      try {
        const signature = await fetchUploadSignature(folder);
        const image = await uploadToCloudinary(file, signature, (percent) => {
          setUploading((prev) =>
            prev.map((u) => (u.key === key ? { ...u, progress: percent } : u)),
          );
        });
        onChange([...value, image]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        setUploading((prev) => prev.filter((u) => u.key !== key));
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  const busy = uploading.length > 0;

  return (
    <div>
      <div
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50',
          busy && 'pointer-events-none opacity-60',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <CloudUpload className="h-8 w-8 text-brand-600" />
        <p className="text-sm font-medium text-slate-700">
          {label}
        </p>
        <p className="text-xs text-slate-400">
          JPG, PNG, WEBP — up to {MAX_SIZE_MB} MB each, max {maxImages} image{maxImages === 1 ? '' : 's'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>
      )}

      {(value.length > 0 || busy) && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((img, index) => (
            <div
              key={img.publicId}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200"
            >
              <Image
                src={img.url}
                alt={`Photo ${index + 1}`}
                fill
                sizes="200px"
                className="object-cover"
                unoptimized
              />
              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-bold text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-rose-600 opacity-0 shadow transition group-hover:opacity-100"
                aria-label="Remove photo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {uploading.map((u) => (
            <div
              key={u.key}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2"
            >
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] text-slate-400">
                {u.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
