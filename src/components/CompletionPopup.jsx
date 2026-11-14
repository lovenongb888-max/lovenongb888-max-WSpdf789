import { useEffect, useRef } from 'react'
import { CheckIcon, CloseIcon, DownloadIcon } from './icons'

export default function CompletionPopup({ open, t, summary, onDownloadAll, onViewResults, onClose }) {
  const primaryRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const focusId = window.setTimeout(() => primaryRef.current?.focus(), 90)
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusId)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-backdrop modal-backdrop-pop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal done-modal" role="dialog" aria-modal="true" aria-labelledby="done-title">
        <button type="button" className="modal-close" aria-label={t('dismiss')} onClick={onClose}>
          <CloseIcon size={18} />
        </button>
        <span className="done-badge">
          <CheckIcon size={26} />
        </span>
        <h2 id="done-title">{t('doneTitle')}</h2>
        <p className="done-summary">{summary}</p>
        <p className="modal-sub">{t('doneHint')}</p>
        <button ref={primaryRef} type="button" className="btn btn-primary btn-wide" onClick={onDownloadAll}>
          <DownloadIcon size={18} />
          {t('downloadAll')}
        </button>
        <button type="button" className="link-button" onClick={onViewResults}>
          {t('viewResults')}
        </button>
      </div>
    </div>
  )
}
