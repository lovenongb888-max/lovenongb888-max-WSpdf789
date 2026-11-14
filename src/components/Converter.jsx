import { useCallback, useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'
import CompletionPopup from './CompletionPopup'
import DropZone from './DropZone'
import PasswordDialog from './PasswordDialog'
import { usePdfLoader } from '../hooks/usePdfLoader'
import { baseName, formatBytes } from '../lib/format'
import { downloadUrl } from '../lib/download'
import { CloseIcon, DownloadIcon, PdfIcon } from './icons'

const FORMATS = [
  { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png' },
  { id: 'jpeg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'webp', label: 'WEBP', mime: 'image/webp', ext: 'webp' },
]

const RESOLUTIONS = [96, 150, 200]

export default function Converter({ t, file, onFile, onError }) {
  const { doc, error, password, load, submitPassword, cancelPassword, reset } = usePdfLoader()
  const [format, setFormat] = useState('png')
  const [dpi, setDpi] = useState(150)
  const [quality, setQuality] = useState(0.9)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState([])
  const [zip, setZip] = useState(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [localError, setLocalError] = useState(null)
  const resultsRef = useRef(null)
  const pendingRef = useRef(false)
  const urlsRef = useRef([])

  const clearResults = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    urlsRef.current = []
    setResults([])
    setZip(null)
  }, [])

  useEffect(() => {
    reset()
    clearResults()
    pendingRef.current = false
    setBusy(false)
    setPhase('idle')
    setProgress({ done: 0, total: 0 })
    setPopupOpen(false)
    setLocalError(null)
  }, [file, reset, clearResults])

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = []
    }
  }, [])

  const runConversion = useCallback(
    async (pdf) => {
      if (!file) return
      const active = FORMATS.find((item) => item.id === format) || FORMATS[0]
      setBusy(true)
      setPhase('rendering')
      setPopupOpen(false)
      setLocalError(null)
      clearResults()
      setProgress({ done: 0, total: pdf.numPages })

      const created = []
      try {
        for (let index = 1; index <= pdf.numPages; index += 1) {
          const page = await pdf.getPage(index)
          const viewport = page.getViewport({ scale: dpi / 72 })
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.floor(viewport.width))
          canvas.height = Math.max(1, Math.floor(viewport.height))
          const context = canvas.getContext('2d')
          context.fillStyle = '#ffffff'
          context.fillRect(0, 0, canvas.width, canvas.height)
          await page.render({ canvasContext: context, viewport }).promise
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, active.mime, active.id === 'png' ? undefined : quality),
          )
          page.cleanup()
          if (!blob) throw new Error('render failed')
          const url = URL.createObjectURL(blob)
          urlsRef.current.push(url)
          created.push({
            page: index,
            blob,
            url,
            filename: `${baseName(file.name)}-${String(index).padStart(2, '0')}.${active.ext}`,
          })
          setResults([...created])
          setProgress({ done: index, total: pdf.numPages })
          await new Promise((resolve) => setTimeout(resolve, 0))
        }

        setPhase('packing')
        const archive = new JSZip()
        created.forEach((item) => archive.file(item.filename, item.blob))
        const zipBlob = await archive.generateAsync({ type: 'blob' })
        const zipUrl = URL.createObjectURL(zipBlob)
        urlsRef.current.push(zipUrl)
        setZip({
          url: zipUrl,
          name: `${baseName(file.name)}-${active.id}.zip`,
          size: zipBlob.size,
        })
        setPhase('idle')
        setBusy(false)
        setPopupOpen(true)
      } catch (err) {
        console.error(err)
        setPhase('idle')
        setBusy(false)
        setLocalError(t('convertError'))
      }
    },
    [clearResults, dpi, file, format, quality, t],
  )

  useEffect(() => {
    if (doc && pendingRef.current) {
      pendingRef.current = false
      runConversion(doc)
    }
  }, [doc, runConversion])

  const start = () => {
    if (!file || busy) return
    setLocalError(null)
    if (doc) {
      runConversion(doc)
      return
    }
    pendingRef.current = true
    load(file)
  }

  const cancelPasswordInput = () => {
    pendingRef.current = false
    cancelPassword()
  }

  const percent = phase === 'packing'
    ? 100
    : progress.total
      ? Math.round((progress.done / progress.total) * 100)
      : 0

  const totalSize = results.reduce((sum, item) => sum + item.blob.size, 0)
  const summary = `${results.length} ${t('pagesUnit')} • ${format.toUpperCase()} • ${formatBytes(totalSize)}`

  const downloadAll = () => {
    if (!zip) return
    downloadUrl(zip.url, zip.name)
    setPopupOpen(false)
  }

  const viewResults = () => {
    setPopupOpen(false)
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="converter">
      {!file && (
        <DropZone
          t={t}
          onFile={onFile}
          onError={onError}
          title={t('convertEmptyTitle')}
          subtitle={t('convertEmptySub')}
        />
      )}

      {file && (
        <>
          <div className="file-bar">
            <span className="file-chip">
              <span className="file-chip-icon">
                <PdfIcon size={18} />
              </span>
              <span className="file-chip-text">
                <strong title={file.name}>{file.name}</strong>
                <span>
                  {formatBytes(file.size)}
                  {doc ? ` • ${doc.numPages} ${t('pagesUnit')}` : ''}
                </span>
              </span>
            </span>
            <span className="file-bar-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onFile(null)}
                disabled={busy}
              >
                <CloseIcon size={15} />
                {t('convertAnother')}
              </button>
            </span>
          </div>

          <div className="settings">
            <div className="setting-block">
              <span className="setting-label">{t('format')}</span>
              <div className="chips">
                {FORMATS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`chip${format === item.id ? ' is-active' : ''}`}
                    aria-pressed={format === item.id}
                    disabled={busy}
                    onClick={() => setFormat(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-block">
              <span className="setting-label">{t('resolution')}</span>
              <div className="chips">
                {RESOLUTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip${dpi === value ? ' is-active' : ''}`}
                    aria-pressed={dpi === value}
                    disabled={busy}
                    onClick={() => setDpi(value)}
                  >
                    {value} DPI
                  </button>
                ))}
              </div>
            </div>

            {format !== 'png' && (
              <label className="setting-block">
                <span className="setting-label">
                  <span>{t('quality')}</span>
                  <strong>{Math.round(quality * 100)}%</strong>
                </span>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="5"
                  value={Math.round(quality * 100)}
                  disabled={busy}
                  onChange={(event) => setQuality(Number(event.target.value) / 100)}
                />
              </label>
            )}

            <button type="button" className="btn btn-primary btn-convert" onClick={start} disabled={busy}>
              {busy
                ? `${t('converting')} ${progress.done}/${progress.total}`
                : t('convertBtn')}
            </button>
          </div>

          {busy && (
            <div className="progress-card">
              <div className="progress-head">
                <span>
                  {phase === 'packing'
                    ? t('packing')
                    : `${t('converting')} ${progress.done}/${progress.total}`}
                </span>
                <span>{percent}%</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <div className="progress-fill" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}

          {localError && (
            <p className="field-error" role="alert">
              {localError}
            </p>
          )}
          {error && (
            <p className="field-error" role="alert">
              {t('openError')}
            </p>
          )}

          {results.length > 0 && (
            <section className="results" ref={resultsRef}>
              <header className="results-head">
                <h2>
                  {t('resultsTitle')}
                  <span className="count">
                    {results.length} {t('convertedPages')}
                  </span>
                </h2>
                {zip && (
                  <button
                    type="button"
                    className="btn btn-soft btn-sm"
                    onClick={() => downloadUrl(zip.url, zip.name)}
                  >
                    <DownloadIcon size={16} />
                    {t('downloadAll')}
                  </button>
                )}
              </header>
              <div className="results-grid">
                {results.map((item) => (
                  <figure className="result-card" key={item.page}>
                    <span className="result-thumb">
                      <img src={item.url} alt={`${t('page')} ${item.page}`} loading="lazy" />
                    </span>
                    <figcaption>
                      <span className="result-page">
                        {t('page')} {item.page}
                      </span>
                      <span className="result-size">{formatBytes(item.blob.size)}</span>
                    </figcaption>
                    <a className="result-download" href={item.url} download={item.filename}>
                      <DownloadIcon size={14} />
                      {t('downloadPage')}
                    </a>
                  </figure>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <CompletionPopup
        open={popupOpen && results.length > 0}
        t={t}
        summary={summary}
        onDownloadAll={downloadAll}
        onViewResults={viewResults}
        onClose={() => setPopupOpen(false)}
      />
      <PasswordDialog
        t={t}
        request={password}
        onSubmit={submitPassword}
        onCancel={cancelPasswordInput}
      />
    </div>
  )
}
