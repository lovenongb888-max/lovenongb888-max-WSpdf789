import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pdfjs } from '../lib/pdf.js';
import PdfPage from './PdfPage.jsx';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FitIcon,
  FolderOpenIcon,
  LockIcon,
  RotateIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './Icons.jsx';

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

export default function PdfReader({ file, t, onOpenAnother, onReset }) {
  const [pdf, setPdf] = useState(null);
  const [errorKey, setErrorKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordWrong, setPasswordWrong] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState('fit');
  const [rotation, setRotation] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [baseSize, setBaseSize] = useState({ width: 612, height: 792 });
  const [stageWidth, setStageWidth] = useState(0);

  const taskRef = useRef(null);
  const passwordUpdateRef = useRef(null);
  const stageRef = useRef(null);
  const scrollFrame = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setErrorKey('');
    setLoading(true);
    setNeedsPassword(false);
    setPassword('');
    setPasswordWrong(false);
    setPage(1);
    setPageInput('1');
    setRotation(0);
    setMode('fit');
    setZoom(1);

    const load = async () => {
      try {
        const data = await file.arrayBuffer();
        if (cancelled) return;

        const task = pdfjs.getDocument({ data });
        taskRef.current = task;
        task.onPassword = (updatePassword, reason) => {
          if (cancelled) return;
          passwordUpdateRef.current = updatePassword;
          setPasswordWrong(reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD);
          setNeedsPassword(true);
          setLoading(false);
        };

        const doc = await task.promise;
        if (cancelled) {
          doc.destroy();
          return;
        }

        const firstPage = await doc.getPage(1);
        const firstViewport = firstPage.getViewport({ scale: 1, rotation: 0 });
        setBaseSize({ width: firstViewport.width, height: firstViewport.height });
        setPdf(doc);
        setNeedsPassword(false);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        if (error?.name === 'PasswordException') {
          setLoading(false);
          return;
        }
        setErrorKey(error?.name === 'InvalidPDFException' ? 'errInvalid' : 'errLoad');
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      try {
        taskRef.current?.destroy();
      } catch {
        /* already destroyed */
      }
      taskRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => setStageWidth(stage.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [pdf, needsPassword]);

  const fitScale = useMemo(() => {
    const available = Math.max(stageWidth - 24, 220);
    const pageWidth = rotation % 180 === 0 ? baseSize.width : baseSize.height;
    return Math.min(Math.max(available / pageWidth, MIN_ZOOM), MAX_ZOOM);
  }, [stageWidth, baseSize, rotation]);

  const scale = mode === 'fit' ? fitScale : zoom;

  const zoomIn = () => {
    setMode('custom');
    setZoom(Math.min(MAX_ZOOM, Number((scale + ZOOM_STEP).toFixed(2))));
  };

  const zoomOut = () => {
    setMode('custom');
    setZoom(Math.max(MIN_ZOOM, Number((scale - ZOOM_STEP).toFixed(2))));
  };

  const goToPage = useCallback(
    (target) => {
      if (!pdf) return;
      const next = Math.min(Math.max(Math.round(target) || 1, 1), pdf.numPages);
      setPage(next);
      setPageInput(String(next));
      const stage = stageRef.current;
      const element = stage?.querySelector(`[data-page="${next}"]`);
      if (!stage || !element) return;
      const top =
        element.getBoundingClientRect().top -
        stage.getBoundingClientRect().top +
        stage.scrollTop -
        8;
      stage.scrollTo({ top, behavior: 'smooth' });
    },
    [pdf],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !pdf) return undefined;
    const onScroll = () => {
      if (scrollFrame.current) return;
      scrollFrame.current = window.requestAnimationFrame(() => {
        scrollFrame.current = 0;
        const stageTop = stage.getBoundingClientRect().top;
        let current = 1;
        for (const element of stage.querySelectorAll('[data-page]')) {
          const rect = element.getBoundingClientRect();
          if (rect.bottom - stageTop > 120) {
            current = Number(element.dataset.page);
            break;
          }
        }
        setPage((previous) => (previous === current ? previous : current));
      });
    };
    onScroll();
    stage.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      stage.removeEventListener('scroll', onScroll);
      if (scrollFrame.current) window.cancelAnimationFrame(scrollFrame.current);
    };
  }, [pdf]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    const onKey = (event) => {
      if (needsPassword) return;
      const tag = event.target instanceof HTMLElement ? event.target.tagName : '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        goToPage(page + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goToPage(page - 1);
      } else if (event.key === '+' || event.key === '=') {
        zoomIn();
      } else if (event.key === '-') {
        zoomOut();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const submitPassword = (event) => {
    event.preventDefault();
    if (!password || !passwordUpdateRef.current) return;
    setNeedsPassword(false);
    setLoading(true);
    setPasswordWrong(false);
    passwordUpdateRef.current(password);
    setPassword('');
  };

  if (errorKey) {
    return (
      <main className="reader-state">
        <div className="state-card">
          <h1>{t[errorKey]}</h1>
          <button type="button" className="btn primary" onClick={onOpenAnother}>
            {t.openPdf}
          </button>
          <button type="button" className="link" onClick={onReset}>
            {t.backHome}
          </button>
        </div>
      </main>
    );
  }

  if (!pdf) {
    return (
      <main className="reader-state">
        <div className="state-card">
          {needsPassword ? (
            <form className="password-card" onSubmit={submitPassword}>
              <span className="lock-badge">
                <LockIcon size={20} />
              </span>
              <h1>{t.passwordTitle}</h1>
              <p>{t.passwordHint}</p>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t.passwordPlaceholder}
                aria-label={t.passwordPlaceholder}
              />
              {passwordWrong ? (
                <p className="field-error" role="alert">
                  {t.passwordWrong}
                </p>
              ) : null}
              <div className="password-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setNeedsPassword(false);
                    onReset();
                  }}
                >
                  {t.passwordCancel}
                </button>
                <button type="submit" className="btn primary" disabled={!password}>
                  {t.passwordSubmit}
                </button>
              </div>
            </form>
          ) : (
            <>
              <span className="spinner" aria-hidden="true" />
              <h1>{t.loading}</h1>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="reader">
      <div className="toolbar">
        <div className="tool-group">
          <button type="button" className="tool-btn" onClick={onOpenAnother} title={t.openAnother}>
            <FolderOpenIcon size={16} />
            <span className="tool-text">{t.openAnother}</span>
          </button>
        </div>

        <span className="divider" aria-hidden="true" />

        <div className="tool-group page-nav">
          <button
            type="button"
            className="tool-btn icon"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            aria-label={t.prevPage}
          >
            <ChevronLeftIcon size={16} />
          </button>
          <input
            className="page-input"
            inputMode="numeric"
            value={pageInput}
            aria-label={t.page}
            onChange={(event) => setPageInput(event.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                goToPage(Number(pageInput) || 1);
                event.currentTarget.blur();
              }
            }}
            onBlur={() => goToPage(Number(pageInput) || page)}
          />
          <span className="page-total">/ {pdf.numPages}</span>
          <button
            type="button"
            className="tool-btn icon"
            onClick={() => goToPage(page + 1)}
            disabled={page >= pdf.numPages}
            aria-label={t.nextPage}
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>

        <span className="spacer" />

        <div className="tool-group">
          <button type="button" className="tool-btn icon" onClick={zoomOut} aria-label={t.zoomOut}>
            <ZoomOutIcon size={16} />
          </button>
          <span className="zoom-value">{Math.round(scale * 100)}%</span>
          <button type="button" className="tool-btn icon" onClick={zoomIn} aria-label={t.zoomIn}>
            <ZoomInIcon size={16} />
          </button>
          <button
            type="button"
            className={`tool-btn icon${mode === 'fit' ? ' is-active' : ''}`}
            onClick={() => setMode('fit')}
            aria-label={t.fitWidth}
            aria-pressed={mode === 'fit'}
          >
            <FitIcon size={16} />
          </button>
          <button
            type="button"
            className="tool-btn icon"
            onClick={() => setRotation((value) => (value + 90) % 360)}
            aria-label={t.rotate}
          >
            <RotateIcon size={16} />
          </button>
        </div>
      </div>

      <div className={`stage${needsPassword ? ' has-modal' : ''}`} ref={stageRef}>
        {needsPassword ? (
          <form className="password-card" onSubmit={submitPassword}>
            <span className="lock-badge">
              <LockIcon size={20} />
            </span>
            <h2>{t.passwordTitle}</h2>
            <p>{t.passwordHint}</p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t.passwordPlaceholder}
              aria-label={t.passwordPlaceholder}
            />
            {passwordWrong ? (
              <p className="field-error" role="alert">
                {t.passwordWrong}
              </p>
            ) : null}
            <div className="password-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setNeedsPassword(false);
                  onReset();
                }}
              >
                {t.passwordCancel}
              </button>
              <button type="submit" className="btn primary" disabled={!password}>
                {t.passwordSubmit}
              </button>
            </div>
          </form>
        ) : (
          <div className="pages">
            {Array.from({ length: pdf.numPages }, (_, index) => (
              <PdfPage
                key={index + 1}
                pdf={pdf}
                pageNumber={index + 1}
                scale={scale}
                rotation={rotation}
                baseSize={baseSize}
                stageRef={stageRef}
              />
            ))}
          </div>
        )}
      </div>

    </main>
  );
}
