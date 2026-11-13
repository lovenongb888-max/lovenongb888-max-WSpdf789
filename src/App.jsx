import { useCallback, useEffect, useRef, useState } from 'react';
import PdfReader from './components/PdfReader.jsx';
import { CheckIcon, FileTextIcon, FolderOpenIcon, XIcon } from './components/Icons.jsx';
import { LANGUAGES, getStrings } from './lib/i18n.js';

const LANG_KEY = 'wspdf88.lang';

function readStoredLang() {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'th';
  } catch {
    return 'th';
  }
}

export default function App() {
  const [lang, setLang] = useState(readStoredLang);
  const [file, setFile] = useState(null);
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);
  const [closed, setClosed] = useState(false);

  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const t = getStrings(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === 'th' ? 'WSPdf88 — อ่าน PDF' : 'WSPdf88 — PDF Reader';
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* language preference is optional */
    }
  }, [lang]);

  const openFile = useCallback(
    async (nextFile) => {
      if (!nextFile) return;
      const looksLikePdf =
        /\.pdf$/i.test(nextFile.name) ||
        nextFile.type === 'application/pdf';
      if (!looksLikePdf) {
        setNotice(t.errNotPdf);
        return;
      }
      try {
        const header = new Uint8Array(await nextFile.slice(0, 5).arrayBuffer());
        if (String.fromCharCode(...header) !== '%PDF-') {
          setNotice(t.errNotPdf);
          return;
        }
      } catch {
        setNotice(t.errNotPdf);
        return;
      }
      setNotice('');
      setFile(nextFile);
    },
    [t],
  );

  const openSample = async () => {
    try {
      const response = await fetch('/sample.pdf');
      if (!response.ok) throw new Error('sample unavailable');
      const blob = await response.blob();
      await openFile(new File([blob], 'wspdf88-sample.pdf', { type: 'application/pdf' }));
    } catch {
      setNotice(t.errLoad);
    }
  };

  const closeApp = useCallback(() => {
    try {
      window.close();
    } catch {
      /* some browsers refuse to close a tab that a script did not open */
    }
    window.setTimeout(() => {
      if (window.closed) return;
      setClosed(true);
    }, 250);
  }, []);

  const handleDragEnter = (event) => {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const dropped = event.dataTransfer?.files?.[0];
    openFile(dropped);
  };

  const openAnother = () => inputRef.current?.click();

  if (closed) {
    return (
      <div className="app app-closed">
        <div className="closed-card">
          <span className="closed-icon">
            <CheckIcon size={26} />
          </span>
          <h1>{t.closeTitle}</h1>
          <p>{t.closeBody}</p>
          <button type="button" className="link" onClick={() => setClosed(false)}>
            {t.reopen}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            WS
          </span>
          <span className="brand-text">
            <span className="brand-name">WSPdf88</span>
            <span className="brand-tag">{t.tagline}</span>
          </span>
        </div>

        <div className="header-actions">
          <div className="lang" role="group" aria-label={t.language}>
            {LANGUAGES.map((option) => (
              <button
                key={option.code}
                type="button"
                aria-pressed={lang === option.code}
                onClick={() => setLang(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="close-btn" onClick={closeApp} aria-label={t.close}>
            <XIcon size={15} />
            <span className="close-label">{t.close}</span>
          </button>
        </div>
      </header>

      {file ? (
        <PdfReader
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          t={t}
          onOpenAnother={openAnother}
          onReset={() => {
            setFile(null);
            setNotice('');
          }}
        />
      ) : (
        <main
          className="main"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <section className="hero">
            <div className="hero-card">
              <span className="hero-badge">{t.localBadge}</span>
              <span className="hero-icon">
                <FileTextIcon size={32} />
              </span>
              <h1>{t.heroTitle}</h1>
              <p className="hero-sub">{t.heroSubtitle}</p>

              {notice ? (
                <p className="alert" role="alert">
                  {notice}
                </p>
              ) : null}

              <div className={`dropzone${dragging ? ' is-dragging' : ''}`}>
                <span className="dropzone-icon">
                  <FolderOpenIcon size={22} />
                </span>
                <div className="dropzone-text">
                  <strong>{t.dropTitle}</strong>
                  <span>{t.dropHint}</span>
                </div>
                <button type="button" className="btn primary" onClick={openAnother}>
                  {t.openPdf}
                </button>
                <small>{t.localOnly}</small>
              </div>

              <button type="button" className="link" onClick={openSample}>
                {t.sample}
              </button>
            </div>
            <p className="hero-foot">{t.footer}</p>
          </section>
        </main>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => {
          openFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
