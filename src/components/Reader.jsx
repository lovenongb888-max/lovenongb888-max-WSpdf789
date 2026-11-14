import { useEffect, useRef, useState } from 'react'
import DropZone from './DropZone'
import PasswordDialog from './PasswordDialog'
import { usePdfLoader } from '../hooks/usePdfLoader'
import { formatBytes } from '../lib/format'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ImageIcon,
  PdfIcon,
  RotateIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './icons'

export default function Reader({ t, file, onFile, onConvert, onError }) {
  const { doc, loading, error, password, load, submitPassword, cancelPassword, reset } =
    usePdfLoader()
  const [pageNum, setPageNum] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [width, setWidth] = useState(0)
  const viewportRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!file) {
      reset()
      return
    }
    setPageNum(1)
    setPageInput('1')
    setZoom(1)
    setRotation(0)
    load(file)
  }, [file, load, reset])

  useEffect(() => {
    setPageInput(String(pageNum))
  }, [pageNum])

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [doc])

  useEffect(() => {
    if (!doc || !canvasRef.current || !width) return
    let cancelled = false
    let task = null

    const draw = async () => {
      try {
        const page = await doc.getPage(pageNum)
        if (cancelled || !canvasRef.current) return
        const base = page.getViewport({ scale: 1, rotation })
        const fitScale = (width - 28) / base.width
        const viewport = page.getViewport({ scale: Math.max(fitScale, 0.1) * zoom, rotation })
        const canvas = canvasRef.current
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.max(1, Math.floor(viewport.width * ratio))
        canvas.height = Math.max(1, Math.floor(viewport.height * ratio))
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        const context = canvas.getContext('2d')
        context.save()
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.restore()
        task = page.render({
          canvasContext: context,
          viewport,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null,
        })
        await task.promise
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') console.error(err)
      }
    }

    draw()

    return () => {
      cancelled = true
      try {
        task?.cancel()
      } catch {
        /* already finished */
      }
    }
  }, [doc, pageNum, zoom, rotation, width])

  const totalPages = doc?.numPages ?? 0

  const goTo = (value) => {
    if (!totalPages) return
    const next = Math.min(Math.max(1, Math.round(value)), totalPages)
    setPageNum(next)
  }

  const commitPageInput = () => {
    const parsed = parseInt(pageInput, 10)
    if (Number.isNaN(parsed)) {
      setPageInput(String(pageNum))
      return
    }
    goTo(parsed)
    setPageInput(String(Math.min(Math.max(1, parsed), totalPages)))
  }

  if (!file) {
    return (
      <>
        <DropZone
          t={t}
          onFile={onFile}
          onError={onError}
          title={t('readerEmptyTitle')}
          subtitle={t('readerEmptySub')}
        />
        <p className="note">{t('installNote')}</p>
        <PasswordDialog
          t={t}
          request={password}
          onSubmit={submitPassword}
          onCancel={cancelPassword}
        />
      </>
    )
  }

  return (
    <div className="reader">
      <div className="file-bar">
        <span className="file-chip">
          <span className="file-chip-icon">
            <PdfIcon size={18} />
          </span>
          <span className="file-chip-text">
            <strong title={file.name}>{file.name}</strong>
            <span>
              {formatBytes(file.size)}
              {totalPages ? ` • ${totalPages} ${t('pagesUnit')}` : ''}
            </span>
          </span>
        </span>
        <span className="file-bar-actions">
          <button type="button" className="btn btn-soft btn-sm" onClick={() => onConvert(file)}>
            <ImageIcon size={15} />
            {t('toConverter')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onFile(null)}>
            <CloseIcon size={15} />
            {t('closeFile')}
          </button>
        </span>
      </div>

      {loading && !doc && (
        <div className="state-card">
          <span className="spinner" aria-hidden="true" />
          <span>{t('reading')}</span>
        </div>
      )}

      {error && !doc && (
        <div className="state-card">
          <p className="field-error" role="alert">
            {t('openError')}
          </p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onFile(null)}>
            {t('convertAnother')}
          </button>
        </div>
      )}

      {doc && (
        <>
          <div className="toolbar">
            <div className="toolbar-group">
              <button
                type="button"
                className="icon-btn"
                aria-label={t('prev')}
                title={t('prev')}
                onClick={() => goTo(pageNum - 1)}
                disabled={pageNum <= 1}
              >
                <ChevronLeftIcon />
              </button>
              <span className="page-picker">
                <input
                  value={pageInput}
                  inputMode="numeric"
                  aria-label={t('page')}
                  onChange={(event) => setPageInput(event.target.value)}
                  onBlur={commitPageInput}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitPageInput()
                      event.currentTarget.blur()
                    }
                  }}
                />
                <span>
                  {t('of')} {totalPages}
                </span>
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('next')}
                title={t('next')}
                onClick={() => goTo(pageNum + 1)}
                disabled={pageNum >= totalPages}
              >
                <ChevronRightIcon />
              </button>
            </div>

            <div className="toolbar-group">
              <button
                type="button"
                className="icon-btn"
                aria-label={t('zoomOut')}
                title={t('zoomOut')}
                onClick={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.2) * 10) / 10))}
                disabled={zoom <= 0.5}
              >
                <ZoomOutIcon />
              </button>
              <span className="zoom-value">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('zoomIn')}
                title={t('zoomIn')}
                onClick={() => setZoom((value) => Math.min(3, Math.round((value + 0.2) * 10) / 10))}
                disabled={zoom >= 3}
              >
                <ZoomInIcon />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('rotate')}
                title={t('rotate')}
                onClick={() => setRotation((value) => (value + 90) % 360)}
              >
                <RotateIcon />
              </button>
            </div>
          </div>

          <div className="viewer" ref={viewportRef}>
            <canvas ref={canvasRef} className="pdf-canvas" />
          </div>
        </>
      )}

      <PasswordDialog
        t={t}
        request={password}
        onSubmit={submitPassword}
        onCancel={() => {
          cancelPassword()
          onFile(null)
        }}
      />
    </div>
  )
}
