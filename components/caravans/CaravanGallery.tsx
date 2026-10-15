'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { CloudinaryImage } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function CaravanGallery({ images, title }: { images: CloudinaryImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-400 md:h-96">
        No photos available
      </div>
    );
  }

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div>
      <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-slate-100 md:h-[420px]">
        <Image
          src={images[index].url}
          alt={`${title} — photo ${index + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover"
          priority
        />
        <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-semibold text-white">
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow transition hover:bg-white"
        >
          <Expand className="h-3.5 w-3.5" /> View full size
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition hover:bg-white"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition hover:bg-white"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="scrollbar-thin mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.publicId}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition',
                i === index ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <Modal open={lightboxOpen} onClose={() => setLightboxOpen(false)} size="xl" title={<span className="truncate font-semibold">{title}</span>}>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
          <Image
            src={images[index].url}
            alt=""
            fill
            sizes="90vw"
            className="object-contain"
          />
        </div>
        {images.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button type="button" onClick={prev} className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50" aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-500">
              {index + 1} / {images.length}
            </span>
            <button type="button" onClick={next} className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50" aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
