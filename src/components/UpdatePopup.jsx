import { SparkIcon } from './Icons.jsx';

export default function UpdatePopup({ t, lang, installedVersion, latest, onLater, onUpdate }) {
  const notes = latest.notes?.[lang] || latest.notes?.th || [];

  return (
    <div className="modal-backdrop" role="presentation" onClick={onLater}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="modal-icon">
          <SparkIcon size={22} />
        </span>
        <h2 id="update-title">{t.updateTitle}</h2>
        <p className="modal-versions">
          {t.updateInstalled} <b>v{installedVersion}</b>
          <span className="dot" aria-hidden="true" />
          {t.updateLatest} <b>v{latest.version}</b>
        </p>

        {notes.length > 0 ? (
          <>
            <span className="modal-label">{t.updateNotes}</span>
            <ul className="update-notes">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onLater}>
            {t.updateLater}
          </button>
          <button type="button" className="btn primary" onClick={onUpdate}>
            {t.updateNow}
          </button>
        </div>
      </div>
    </div>
  );
}
