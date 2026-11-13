import { useRef, useState } from 'react';
import { FileTextIcon } from './Icons.jsx';

export default function Home({ t, notice, onPick, onSample, onDropFile }) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

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

      <p className="install-hint">{t.installHint}</p>
    </main>
  );
}
