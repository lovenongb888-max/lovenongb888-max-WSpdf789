import { useRef, useState } from 'react'
import { LockIcon, UploadIcon } from './icons'

export default function DropZone({ t, onFile, onError, title, subtitle, showSamples = true }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [sampleBusy, setSampleBusy] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    const looksLikePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (!looksLikePdf) {
      onError?.(t('unsupported'))
      return
    }
    onFile(file)
  }

  const openPicker = () => inputRef.current?.click()

  const loadSample = async (path, name) => {
    setSampleBusy(true)
    try {
      const response = await fetch(path, { cache: 'no-store' })
      if (!response.ok) throw new Error('sample')
      handleFile(new File([await response.blob()], name, { type: 'application/pdf' }))
    } catch {
      onError?.(t('openError'))
    } finally {
      setSampleBusy(false)
    }
  }

  return (
    <>
      <div
        className={`dropzone${dragging ? ' is-dragging' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={t('chooseFile')}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPicker()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          handleFile(event.dataTransfer.files?.[0])
        }}
      >
        <span className="dropzone-icon">
          <UploadIcon size={24} />
        </span>
        <h2 className="dropzone-title">{title}</h2>
        <p className="dropzone-sub">{subtitle}</p>
        <span className="dropzone-cta">{t('chooseFile')}</span>
        <p className="dropzone-hint">{t('dropHere')}</p>

        {showSamples && (
          <div
            className="sample-row"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="btn btn-soft btn-sm"
              disabled={sampleBusy}
              onClick={() => loadSample('/sample.pdf', 'WSPdf789-sample.pdf')}
            >
              {t('sample')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={sampleBusy}
              onClick={() => loadSample('/sample-locked.pdf', 'WSPdf789-locked.pdf')}
            >
              <LockIcon size={15} />
              {t('sampleLocked')}
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </>
  )
}
