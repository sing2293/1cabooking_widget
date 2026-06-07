import { useEffect, useRef, useState } from 'react';

/* lottie-web is loaded from a CDN at runtime (typed as a plain string so
   TypeScript/Vite don't try to resolve it as a bundled module). This keeps
   the ~60KB-gz player out of the eager App bundle — it's only fetched when a
   confirmation tick actually renders. */
const LOTTIE_CDN: string = 'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/+esm';
const ANIMATION_PATH = '/animations/blue_merci.json';

interface Props {
  /** Square size in px. */
  size?: number;
  className?: string;
}

/** Confirmation checkmark rendered as a Lottie animation (blue_merci.json).
 *  Falls back to a static SVG check if the player or animation can't load. */
export default function LottieTick({ size = 112, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let anim: { destroy: () => void } | null = null;
    let cancelled = false;

    import(/* @vite-ignore */ LOTTIE_CDN)
      .then((mod) => {
        const lottie = mod.default ?? mod;
        if (cancelled || !ref.current) return;
        anim = lottie.loadAnimation({
          container: ref.current,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          path: ANIMATION_PATH,
        });
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, []);

  if (failed) {
    return (
      <div
        className={`rounded-full bg-emerald-50 flex items-center justify-center ring-4 ring-emerald-100 ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" className="w-1/2 h-1/2 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    );
  }

  return <div ref={ref} className={className} style={{ width: size, height: size }} aria-hidden="true" />;
}
