import { useCallback, useEffect, useRef, useState } from 'react';
import Converter from './components/Converter.jsx';
import Home from './components/Home.jsx';
import PdfReader from './components/PdfReader.jsx';
import UpdatePopup from './components/UpdatePopup.jsx';
import { BookOpenIcon, CheckIcon, ImageIcon, XIcon } from './components/Icons.jsx';
import { APP_NAME, APP_VERSION, BRAND_LINE, LANG_KEY, UPDATE_SEEN_KEY } from './config/app.js';
import { LANGUAGES, getStrings } from './lib/i18n.js';
import useInstallPrompt from './lib/useInstallPrompt.js';
import useKeyboardInset from './lib/useKeyboardInset.js';
import { compareVersions, fetchLatestVersion } from './lib/version.js';

const LEGACY_LANG_KEY = 'wspdf88.lang';

function readStoredLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY) || localStorage.getItem(LEGACY_LANG_KEY);
    return stored === 'en' ? 'en' : 'th';
  } catch {
    return 'th';
  }
}

function markUpdateSeen(version) {
  try {
    if (version) localStorage.setItem(UPDATE_SEEN_KEY, version);
  } catch {
    /* storage is optional */
  }
}

export default function App() {
  const [lang, setLang] = useState(readStoredLang);
  const [view, setView] = useState('read');
  const [file, setFile] = useState(null);
  const [notice, setNotice] = useState('');
  const [closed, setClosed] = useState(false);
  const [update, setUpdate] = useState(null);

  const inputRef = useRef(null);
  const t = getStrings(lang);
  const { canInstall, installed, install } = useInstallPrompt();

  useKeyboardInset();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${APP_NAME} — ${t.tagline}`;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* language preference is optional */
    }
  }, [lang, t.tagline]);

  useEffect(() => {
    let cancelled = false;
    fetchLatestVersion()
      .then((latest) => {
        if (cancelled || !latest?.version) return;
        if (compareVersions(latest.version, APP_VERSION) <= 0) return;
        let seen = null;
        try {
          seen = localStorage.getItem(UPDATE_SEEN_KEY);
        } catch {
          /* storage is optional */
        }
        if (seen !== latest.version) setUpdate(latest);
      })
      .catch(() => {
        /* version metadata is optional */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openFile = useCallback(
    async (nextFile) => {
      if (!nextFile) return;
      const looksLikePdf = /\.pdf$/i.test(nextFile.name) || nextFile.type === 'application/pdf';
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
      setView('read');
      setFile(nextFile);
    },
    [t],
  );

  useEffect(() => {
    if (!('launchQueue' in window) || typeof window.launchQueue?.setConsumer !== 'function') {
      return;
    }
    window.launchQueue.setConsumer(async (params) => {
      const launchFile = params?.files?.[0];
      if (!launchFile) return;
      try {
        const opened = await launchFile.getFile();
        openFile(opened);
      } catch {
        /* ignore files the OS cannot hand over */
      }
    });
  }, [openFile]);

  const openSample = async () => {
    try {
      const response = await fetch('/sample.pdf');
      if (!response.ok) throw new Error('sample unavailable');
      const blob = await response.blob();
      await openFile(new File([blob], 'wspdf789-sample.pdf', { type: 'application/pdf' }));
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

  const dismissUpdate = () => {
    markUpdateSeen(update?.version);
    setUpdate(null);
  };

  const applyUpdate = async () => {
    markUpdateSeen(update?.version);
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
    } catch {
      /* the reload still picks up fresh assets */
    }
    window.location.reload();
  };

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
            <span className="brand-line">
              <span className="brand-name">{APP_NAME}</span>
              <span className="version-chip">v{APP_VERSION}</span>
            </span>
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

      <nav className="tabs" aria-label={t.menu}>
        <button
          type="button"
          aria-pressed={view === 'read'}
          onClick={() => setView('read')}
        >
          <BookOpenIcon size={15} />
          {t.tabRead}
        </button>
        <button
          type="button"
          aria-pressed={view === 'convert'}
          onClick={() => setView('convert')}
        >
          <ImageIcon size={15} />
          {t.tabConvert}
        </button>
      </nav>

      <div className="content">
        {view === 'convert' ? (
          <Converter t={t} />
        ) : file ? (
          <PdfReader
            key={`${file.name}-${file.size}-${file.lastModified}`}
            file={file}
            t={t}
            onOpenAnother={() => inputRef.current?.click()}
            onReset={() => {
              setFile(null);
              setNotice('');
            }}
          />
        ) : (
          <Home
            t={t}
            notice={notice}
            onPick={() => inputRef.current?.click()}
            onSample={openSample}
            onDropFile={openFile}
            canInstall={canInstall}
            installed={installed}
            onInstall={install}
          />
        )}
      </div>

      <footer className="app-foot">
        <span className="foot-brand">{BRAND_LINE}</span>
        <span className="dot" aria-hidden="true" />
        <span>{t.footerNote}</span>
        <span className="dot" aria-hidden="true" />
        <span className="foot-version">v{APP_VERSION}</span>
      </footer>

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

      {update ? (
        <UpdatePopup
          t={t}
          lang={lang}
          installedVersion={APP_VERSION}
          latest={update}
          onLater={dismissUpdate}
          onUpdate={applyUpdate}
        />
      ) : null}
    </div>
  );
}
