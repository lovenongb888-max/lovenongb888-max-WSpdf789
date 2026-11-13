import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { pdfjs } from '../lib/pdf.js';
import { formatFileSize } from '../lib/version.js';
import { DownloadIcon, FileTextIcon, ImageIcon, LockIcon, UploadIcon } from './Icons.jsx';

const FORMATS = [
  { id: 'png', mime: 'image/png', labelKey: 'formatPng', hintKey: 'hintPng', ext: 'png' },
  { id: 'jpg', mime: 'image/jpeg', labelKey: 'formatJpg', hintKey: 'hintJpg', ext: 'jpg' },
  { id: 'webp', mime: 'image/webp', labelKey: 'formatWebp', hintKey: 'hintWebp', ext: 'webp' },
];

const RESOLUTIONS = [
  { id: 'low', scale: 1.2, labelKey: 'resLow' },
  { id: 'medium', scale: 2, labelKey: 'resMedium' },
  { id: 'high', scale: 3, labelKey: 'resHigh' },
];

const MAX_SIDE = 12000;

function outputName(baseName, page, ext) {
  return `${baseName}-${String(page).padStart(3, '0')}.${ext}`;
}

function triggerDownload(url, filename) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function Converter({ t }) {
  const [file, setFile] = useState(null);
  const [formatId, setFormatId] = useState('png');
  const [resolutionId, setResolutionId] = useState('high');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [zipping, setZipping] = useState(false);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef(null);
  const urlsRef = useRef([]);
  const cancelRef = useRef(false);

  const format = FORMATS.find((item) => item.id === formatId) || FORMATS[0];
  const resolution = RESOLUTIONS.find((item) => item.id === resolutionId) || RESOLUTIONS[2];
  const baseName = (file?.name || 'document').replace(/\.pdf$/i, '');

  const clearResults = () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
    setResults([]);
    setProgress({ done: 0, total: 0 });
    setStatus('idle');
  };

  useEffect(
    () => () => {
      cancelRef.current = true;
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const pickFile = async (nextFile) => {
    if (!nextFile) return;
    if (!/\.pdf$/i.test(nextFile.name) && nextFile.type !== 'application/pdf') {
      setError(t.errNotPdf);
      return;
    }
    try {
      const header = new Uint8Array(await nextFile.slice(0, 5).arrayBuffer());
      if (String.fromCharCode(...header) !== '%PDF-') {
        setError(t.errNotPdf);
        return;
      }
    } catch {
      setError(t.errNotPdf);
      return;
    }
    clearResults();
    setError('');
    setFile(nextFile);
  };

  const chooseFormat = (nextFormat) => {
    setFormatId(nextFormat);
    clearResults();
    setError('');
  };

  const chooseResolution = (nextResolution) => {
    setResolutionId(nextResolution);
    clearResults();
    setError('');
  };

  const convert = async () => {
    if (!file || status === 'working') return;
    clearResults();
    setError('');
    cancelRef.current = false;
    setStatus('working');

    let doc = null;
    try {
      const data = await file.arrayBuffer();
      doc = await pdfjs.getDocument({ data }).promise;
      const total = doc.numPages;
      setProgress({ done: 0, total });
      const generated = [];

      for (let index = 1; index <= total; index += 1) {
        if (cancelRef.current) break;
        const page = await doc.getPage(index);
        const unscaled = page.getViewport({ scale: 1 });
        const scale = Math.min(
          resolution.scale,
          MAX_SIDE / Math.max(unscaled.width, unscaled.height),
        );
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const context = canvas.getContext('2d', { alpha: false });
        if (format.id !== 'png') {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        await page.render({ canvasContext: context, viewport }).promise;

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, format.mime, 0.92),
        );
        page.cleanup();
        if (!blob) throw new Error('unsupported-format');

        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        generated.push({ page: index, blob, url });
        setResults(generated.slice());
        setProgress({ done: index, total });
      }

      setStatus('done');
    } catch (err) {
      if (err?.name === 'PasswordException') setError(t.errLocked);
      else if (err?.message === 'unsupported-format') setError(t.errFormat);
      else setError(t.errConvert);
      setStatus('idle');
    } finally {
      try {
        await doc?.destroy();
      } catch {
        /* document already released */
      }
    }
  };

  const downloadAll = async () => {
    if (results.length === 0 || zipping) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      results.forEach((item) => {
        zip.file(outputName(baseName, item.page, format.ext), item.blob);
      });
      const archive = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(archive);
      triggerDownload(url, `${baseName}-${format.ext}.zip`);
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      setError(t.errConvert);
    } finally {
      setZipping(false);
    }
  };

  const working = status === 'working';
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <main className="convert">
      <header className="page-head">
        <span className="eyebrow">{t.convertEyebrow}</span>
        <h1>{t.convertTitle}</h1>
        <p>{t.convertSubtitle}</p>
      </header>

      <section className="converter-card">
        <div className="setting-row">
          <span className="setting-label">{t.formatLabel}</span>
          <div className="segmented" role="group" aria-label={t.formatLabel}>
            {FORMATS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={formatId === option.id}
                onClick={() => chooseFormat(option.id)}
              >
                <span>{t[option.labelKey]}</span>
                <small>{t[option.hintKey]}</small>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`dropzone compact${dragging ? ' is-dragging' : ''}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget === event.target) setDragging(false);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pickFile(event.dataTransfer?.files?.[0]);
          }}
        >
          {file ? (
            <div className="picked-file">
              <span className="picked-icon">
                <FileTextIcon size={18} />
              </span>
              <span className="picked-text">
                <strong>{file.name}</strong>
                <small>{formatFileSize(file.size)}</small>
              </span>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => inputRef.current?.click()}
              >
                {t.changeFile}
              </button>
            </div>
          ) : (
            <>
              <span className="dropzone-icon">
                <UploadIcon size={20} />
              </span>
              <strong>{t.convertDrop}</strong>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => inputRef.current?.click()}
              >
                {t.chooseFile}
              </button>
            </>
          )}
        </div>

        <div className="setting-row">
          <span className="setting-label">{t.resolutionLabel}</span>
          <div className="segmented" role="group" aria-label={t.resolutionLabel}>
            {RESOLUTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={resolutionId === option.id}
                onClick={() => chooseResolution(option.id)}
              >
                <span>{t[option.labelKey]}</span>
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="btn primary wide"
          onClick={convert}
          disabled={!file || working}
        >
          {working ? `${t.converting} ${progress.done}/${progress.total}` : t.convertBtn}
        </button>

        {working ? (
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
        ) : null}
      </section>

      <section className="results">
        <div className="results-head">
          <h2>{t.resultsTitle}</h2>
          {results.length > 0 ? (
            <button
              type="button"
              className="btn ghost small"
              onClick={downloadAll}
              disabled={zipping}
            >
              <DownloadIcon size={15} />
              {zipping ? t.zipping : t.downloadAll}
            </button>
          ) : null}
        </div>

        {results.length === 0 ? (
          <div className="results-empty">
            <ImageIcon size={22} />
            <p>{t.resultsEmpty}</p>
          </div>
        ) : (
          <div className="results-grid">
            {results.map((item) => (
              <figure className="result" key={item.page}>
                <img src={item.url} alt={`${t.pageWord} ${item.page}`} loading="lazy" />
                <figcaption>
                  <span>
                    {t.pageWord} {item.page}
                  </span>
                  <a
                    className="icon-btn"
                    href={item.url}
                    download={outputName(baseName, item.page, format.ext)}
                    aria-label={t.downloadOne}
                    title={t.downloadOne}
                  >
                    <DownloadIcon size={15} />
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <p className="security">
        <LockIcon size={15} />
        {t.security}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </main>
  );
}
