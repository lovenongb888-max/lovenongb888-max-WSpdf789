import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Converter from './components/Converter'
import Reader from './components/Reader'
import UpdatePopup from './components/UpdatePopup'
import { BrandMark, InstallIcon } from './components/icons'
import { APP_NAME, APP_VERSION } from './config/app'
import { LANGS, makeTranslator } from './i18n'
import { compareVersions } from './lib/format'

export default function App() {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('wspdf789-lang') || 'th'
    } catch {
      return 'th'
    }
  })
  const t = useMemo(() => makeTranslator(lang), [lang])
  const [tab, setTab] = useState('reader')
  const [readerFile, setReaderFile] = useState(null)
  const [converterFile, setConverterFile] = useState(null)
  const [notice, setNotice] = useState(null)
  const [update, setUpdate] = useState(null)
  const [installPrompt, setInstallPrompt] = useState(null)
  const noticeTimer = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem('wspdf789-lang', lang)
    } catch {
      /* storage blocked */
    }
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  useEffect(() => {
    if (!('launchQueue' in window) || typeof window.launchQueue.setConsumer !== 'function') return
    window.launchQueue.setConsumer(async (params) => {
      const handle = params?.files?.[0]
      if (!handle) return
      try {
        const file = await handle.getFile()
        setReaderFile(file)
        setTab('reader')
      } catch {
        /* file unavailable */
      }
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/version.json', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data || cancelled) return
        let dismissed = null
        try {
          dismissed = localStorage.getItem('wspdf789-update-dismissed')
        } catch {
          /* storage blocked */
        }
        if (compareVersions(data.version, APP_VERSION) > 0 && dismissed !== data.version) {
          setUpdate(data)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const notify = useCallback((message) => {
    if (!message) return
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
  }, [])

  const install = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    try {
      await installPrompt.userChoice
    } catch {
      /* dismissed */
    }
    setInstallPrompt(null)
  }

  const convertFile = useCallback((file) => {
    setConverterFile(file)
    setTab('convert')
  }, [])

  const closeUpdate = () => {
    try {
      if (update?.version) localStorage.setItem('wspdf789-update-dismissed', update.version)
    } catch {
      /* storage blocked */
    }
    setUpdate(null)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <BrandMark size={38} />
          <span className="brand-text">
            <span className="brand-name">{APP_NAME}</span>
            <span className="brand-tag">{t('tagline')}</span>
          </span>
        </div>
        <div className="topbar-actions">
          {installPrompt && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={install}>
              <InstallIcon size={16} />
              <span className="install-label">{t('install')}</span>
            </button>
          )}
          <div className="lang-switch" role="group" aria-label={t('langLabel')}>
            {LANGS.map((item) => (
              <button
                key={item.code}
                type="button"
                className={lang === item.code ? 'is-active' : ''}
                aria-pressed={lang === item.code}
                onClick={() => setLang(item.code)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <span className="hero-badge">{t('heroBadge')}</span>
          <h1>{t('heroTitle')}</h1>
          <p>{t('heroSub')}</p>
        </section>

        <div className="tabs" role="tablist" aria-label={t('tagline')}>
          <button
            type="button"
            role="tab"
            id="tab-reader"
            aria-controls="panel"
            aria-selected={tab === 'reader'}
            className={tab === 'reader' ? 'is-active' : ''}
            onClick={() => setTab('reader')}
          >
            {t('tabReader')}
          </button>
          <button
            type="button"
            role="tab"
            id="tab-convert"
            aria-controls="panel"
            aria-selected={tab === 'convert'}
            className={tab === 'convert' ? 'is-active' : ''}
            onClick={() => setTab('convert')}
          >
            {t('tabConvert')}
          </button>
        </div>

        <section className="panel" id="panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'reader' ? (
            <Reader
              t={t}
              file={readerFile}
              onFile={setReaderFile}
              onConvert={convertFile}
              onError={notify}
            />
          ) : (
            <Converter t={t} file={converterFile} onFile={setConverterFile} onError={notify} />
          )}
        </section>

        <footer className="foot">
          <span>{t('fileNote')}</span>
          <span className="version">v{APP_VERSION}</span>
        </footer>
      </main>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}

      <UpdatePopup t={t} update={update} onClose={closeUpdate} />
    </div>
  )
}
