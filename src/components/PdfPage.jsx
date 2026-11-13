import { useEffect, useRef, useState } from 'react';

export default function PdfPage({ pdf, pageNumber, scale, rotation, baseSize, stageRef }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [dims, setDims] = useState(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: stageRef.current, rootMargin: '600px 0px' },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [stageRef]);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    let task = null;
    let pdfPage = null;
    setReady(false);
    setFailed(false);
    setDims(null);

    const draw = async () => {
      pdfPage = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
      canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      setDims({ width: Math.floor(viewport.width), height: Math.floor(viewport.height) });
      task = pdfPage.render({
        canvasContext: context,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
      });
      await task.promise;
      if (!cancelled) setReady(true);
    };

    draw().catch((error) => {
      if (!cancelled && error?.name !== 'RenderingCancelledException') setFailed(true);
    });

    return () => {
      cancelled = true;
      try {
        task?.cancel();
      } catch {
        /* render already finished */
      }
      try {
        pdfPage?.cleanup();
      } catch {
        /* page already released */
      }
    };
  }, [pdf, pageNumber, scale, rotation, visible]);

  const portrait = rotation % 180 === 0;
  const width = dims?.width ?? Math.round((portrait ? baseSize.width : baseSize.height) * scale);
  const height = dims?.height ?? Math.round((portrait ? baseSize.height : baseSize.width) * scale);

  return (
    <div
      ref={hostRef}
      className={`page${ready ? ' is-ready' : ''}`}
      data-page={pageNumber}
      style={{ width, height }}
    >
      {!ready && !failed ? <span className="page-skeleton" aria-hidden="true" /> : null}
      {failed ? <span className="page-failed">PDF</span> : null}
      <canvas ref={canvasRef} />
    </div>
  );
}
