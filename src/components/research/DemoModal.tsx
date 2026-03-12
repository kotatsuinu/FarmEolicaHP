/**
 * DemoModal — iframeでデモアプリを表示するフルスクリーンモーダル
 * Astro側の data-demo-trigger ボタンからURLを受け取り開く
 */
import { useState, useEffect, useCallback } from 'react';

export default function DemoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const open = useCallback((demoUrl: string, demoTitle: string) => {
    setUrl(demoUrl);
    setTitle(demoTitle);
    setIsLoading(true);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setUrl('');
    setTitle('');
    document.body.style.overflow = '';
  }, []);

  // Listen for data-demo-trigger clicks
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const trigger = (e.target as HTMLElement).closest('[data-demo-trigger]');
      if (!trigger) return;
      const demoUrl = trigger.getAttribute('data-demo-url');
      const demoTitle = trigger.getAttribute('data-demo-title') || 'Demo';
      if (demoUrl) open(demoUrl, demoTitle);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      class="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Header Bar */}
      <div class="flex items-center justify-between px-4 md:px-6 py-3 bg-stone-white/95 backdrop-blur-sm border-b border-warm-gray-200">
        <div class="flex items-center gap-3">
          <span class="font-mono text-[10px] tracking-widest text-warm-gray-400">DEMO</span>
          <span class="font-serif text-sm text-wet-soil">{title}</span>
        </div>
        <div class="flex items-center gap-4">
          {/* Open in new tab */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            class="font-mono text-[10px] tracking-widest text-warm-gray-400 hover:text-eolica-green transition-colors duration-200 hidden sm:flex items-center gap-1"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            NEW TAB
          </a>
          {/* Close */}
          <button
            onClick={close}
            class="flex items-center justify-center w-8 h-8 text-warm-gray-400 hover:text-wet-soil transition-colors duration-200"
            aria-label="Close demo"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* iframe Container */}
      <div class="flex-1 relative">
        {isLoading && (
          <div class="absolute inset-0 flex items-center justify-center bg-stone-white">
            <div class="text-center">
              <div class="w-8 h-8 border-2 border-eolica-green/30 border-t-eolica-green rounded-full animate-spin mx-auto mb-4" />
              <p class="font-mono text-xs tracking-widest text-warm-gray-400">LOADING</p>
            </div>
          </div>
        )}
        <iframe
          src={url}
          class="w-full h-full border-0"
          title={`${title} Demo`}
          onLoad={() => setIsLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      {/* Demo Notice */}
      <div class="px-4 py-2 bg-amber-50 border-t border-amber-200 text-center">
        <p class="font-mono text-[10px] tracking-wide text-amber-700">
          This is a demo with sample data — no real backend connection
        </p>
      </div>
    </div>
  );
}
