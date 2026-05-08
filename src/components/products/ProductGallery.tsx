import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface GalleryImage {
  src: string;
  width?: number;
  height?: number;
}

interface CommonProps {
  images: GalleryImage[];
  productName: string;
}

const noCopyStyle: React.CSSProperties = {
  WebkitUserDrag: 'none',
  KhtmlUserDrag: 'none',
  MozUserSelect: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
} as React.CSSProperties;

const preventCopyHandlers = {
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  onDragStart: (e: React.DragEvent) => e.preventDefault(),
  draggable: false as const,
};

function Lightbox({
  images,
  initialIndex,
  productName,
  onClose,
}: {
  images: GalleryImage[];
  initialIndex: number;
  productName: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % images.length),
    [images.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, prev, next]);

  // body 直下に portal してヘッダー等の stacking context を回避
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 cursor-zoom-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center text-white/80 hover:text-white transition-colors z-10"
        aria-label="閉じる"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {images.length > 1 && (
        <span className="absolute top-6 left-6 font-mono text-sm text-white/80 select-none">
          {index + 1} / {images.length}
        </span>
      )}

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 md:left-8 w-12 h-12 flex items-center justify-center text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition z-10"
            aria-label="前の写真"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 md:right-8 w-12 h-12 flex items-center justify-center text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition z-10"
            aria-label="次の写真"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      <img
        src={images[index].src}
        alt={`${productName} ${index + 1}`}
        className="max-w-[90vw] max-h-[90vh] object-contain cursor-default"
        onClick={(e) => e.stopPropagation()}
        style={noCopyStyle}
        {...preventCopyHandlers}
      />
    </div>,
    document.body,
  );
}

export function ProductGalleryHero({
  images,
  productName,
  isDiscontinued = false,
  intervalMs = 4000,
}: CommonProps & { isDiscontinued?: boolean; intervalMs?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const safeImages = images && images.length > 0 ? images : [];

  useEffect(() => {
    if (safeImages.length <= 1 || paused || lightboxIndex !== null) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % safeImages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [safeImages.length, paused, lightboxIndex, intervalMs]);

  if (safeImages.length === 0) {
    return (
      <div className="aspect-[3/4] overflow-hidden bg-warm-gray-100 shadow-lab-lg flex flex-col items-center justify-center text-warm-gray-400">
        <svg
          className="w-20 h-20 mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="font-mono text-sm">画像準備中</span>
      </div>
    );
  }

  const prev = () =>
    setIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const next = () => setIndex((i) => (i + 1) % safeImages.length);

  return (
    <>
      <div
        className={`relative aspect-[3/4] overflow-hidden bg-warm-gray-100 shadow-lab-lg ${
          isDiscontinued ? 'opacity-70' : ''
        }`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => window.setTimeout(() => setPaused(false), 3000)}
      >
        {safeImages.map((img, i) => (
          <img
            key={i}
            src={img.src}
            alt={`${productName} ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 cursor-zoom-in ${
              i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } ${isDiscontinued ? 'grayscale' : ''}`}
            onClick={() => setLightboxIndex(i)}
            style={noCopyStyle}
            {...preventCopyHandlers}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}

        {safeImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full transition opacity-70 hover:opacity-100 z-10"
              aria-label="前の写真"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full transition opacity-70 hover:opacity-100 z-10"
              aria-label="次の写真"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {safeImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    i === index
                      ? 'bg-white w-6'
                      : 'bg-white/50 hover:bg-white/80 w-2'
                  }`}
                  aria-label={`${i + 1}枚目`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={safeImages}
          initialIndex={lightboxIndex}
          productName={productName}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

export function ProductGalleryGrid({
  images,
  productName,
}: CommonProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div
        className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[680px] overflow-y-auto pr-2 scroll-smooth"
        style={{ scrollbarWidth: 'thin' }}
      >
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="aspect-square overflow-hidden bg-warm-gray-100 group relative cursor-zoom-in"
            aria-label={`${productName} ${i + 1}枚目を拡大表示`}
          >
            <img
              src={img.src}
              alt={`${productName} ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={noCopyStyle}
              {...preventCopyHandlers}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
          </button>
        ))}
      </div>

      {images.length > 6 && (
        <p className="font-mono text-[10px] text-warm-gray-400 mt-3 text-center">
          ↓ スクロールでさらに見る ({images.length}枚)
        </p>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          productName={productName}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
