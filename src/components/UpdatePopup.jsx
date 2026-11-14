import { CloseIcon, PdfIcon } from './icons'

export default function UpdatePopup({ t, update, onClose }) {
  if (!update) return null

  return (
    <div
      className="modal-backdrop modal-backdrop-pop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal update-modal" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <button type="button" className="modal-close" aria-label={t('dismiss')} onClick={onClose}>
          <CloseIcon size={18} />
        </button>
        <span className="modal-icon">
          <PdfIcon size={22} />
        </span>
        <h2 id="update-title">{t('updateTitle')}</h2>
        <p className="modal-sub">{t('updateBody', { version: update.version })}</p>
        {Array.isArray(update.notes) && update.notes.length > 0 && (
          <ul className="update-notes">
            {update.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn-primary btn-wide" onClick={onClose}>
          {t('updateLater')}
        </button>
      </div>
    </div>
  )
}
