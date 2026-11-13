import { useRef, useState } from 'react';
import { DownloadIcon, FileTextIcon } from './Icons.jsx';

export default function Home({
  t,
  notice,
  onPick,
  onSample,
  onDropFile,
  canInstall,
  installed,
  onInstall,
}) {
  const [dragging, setDragging] = useState(false);
  const [installNote, setInstallNote] = useState(false);
  const depth = useRef(0);

  const handleInstall = async () => {
    if (!canInstall) {
      setInstallNote(true);
      return;
    }
    const result = await onInstall();
    setInstallNote(!result?.available);
  };

  const onDragEnter = (event) => {
    event.preventDefault();
    depth.current += 1;
    setDragging(true);
  };

  const onDragLeave = (event) => {
    event.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  };

  const onDrop = (event) => {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) onDropFile(file);
  };

  return (
    <main
      className="home"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={(event) => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={onDrop}
    >
      <header className="page-head">
        <span className="eyebrow">{t.readEyebrow}</span>
        <h1>{t.heroTitle}</h1>
        <p>{t.heroSubtitle}</p>
      </header>

      {installed ? null : (
        <section className="install-card" aria-label={t.installTitle}>
          <span className="install-icon" aria-hidden="true">
            <DownloadIcon size={19} />
          </span>
          <span className="install-copy">
            <strong>{t.installTitle}</strong>
            <span>{t.installHint}</span>
          </span>
          <button type="button" className="btn primary install-btn" onClick={handleInstall}>
            <DownloadIcon size={15} />
            {t.installCta}
          </button>
          {installNote ? <p className="install-note">{t.installManual}</p> : null}
        </section>
      )}

      <div className={`dropzone${dragging ? ' is-dragging' : ''}`}>
        <span className="dropzone-icon">
          <FileTextIcon size={24} />
        </span>
        <div className="dropzone-text">
          <strong>{t.dropTitle}</strong>
          <span>{t.dropHint}</span>
        </div>
        <button type="button" className="btn primary" onClick={onPick}>
          {t.openPdf}
        </button>
        <small>{t.localOnly}</small>
      </div>

      <div className="home-links">
        <button type="button" className="link" onClick={onSample}>
          {t.sample}
        </button>
      </div>

      {notice ? (
        <p className="alert" role="alert">
          {notice}
        </p>
      ) : null}

      <ul className="features">
        {t.features.map((feature) => (
          <li key={feature.title}>
            <strong>{feature.title}</strong>
            <span>{feature.text}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
