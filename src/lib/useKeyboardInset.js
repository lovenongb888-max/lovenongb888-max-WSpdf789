import { useEffect } from 'react';

/**
 * Keeps the app fitted to the actually visible area of the screen.
 *
 * On phones the on-screen keyboard can cover the lower part of the page
 * without resizing it (notably on iOS), which hid the password card while
 * typing. The hidden height is exposed as `--kb-inset` so the app shrinks
 * and the card stays above the keyboard.
 */
export default function useKeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const root = document.documentElement;
    const apply = () => {
      const hidden = window.innerHeight - viewport.height;
      // Ignore pinch-zoom shrink; a keyboard never takes more than ~60% of the screen.
      const inset = Math.min(Math.max(0, Math.round(hidden)), Math.round(window.innerHeight * 0.6));
      root.style.setProperty('--kb-inset', `${inset}px`);
    };

    apply();
    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);
    window.addEventListener('orientationchange', apply);

    return () => {
      viewport.removeEventListener('resize', apply);
      viewport.removeEventListener('scroll', apply);
      window.removeEventListener('orientationchange', apply);
      root.style.removeProperty('--kb-inset');
    };
  }, []);
}
