import { useEffect, useRef, useState } from 'react'
import { EyeIcon, EyeOffIcon, LockIcon } from './icons'

export default function PasswordDialog({ t, request, onSubmit, onCancel }) {
  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(false)
  const inputRef = useRef(null)
  const wrong = Boolean(request?.wrong)
  const pending = Boolean(request?.pending)

  useEffect(() => {
    if (!request) return
    setValue('')
    setVisible(false)
    const id = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(id)
  }, [request?.key])

  useEffect(() => {
    if (!request) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [request, onCancel])

  if (!request) return null

  const submit = (event) => {
    event.preventDefault()
    const password = value.trim()
    if (!password) return
    onSubmit(password)
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <form
        className="modal password-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-title"
        onSubmit={submit}
      >
        <span className="modal-icon modal-icon-lock">
          <LockIcon size={22} />
        </span>
        <h2 id="password-title">{t('passwordTitle')}</h2>
        <p className="modal-sub">{t('passwordSub')}</p>

        <label className="field">
          <span className="field-label">{t('passwordLabel')}</span>
          <span className={`input-with-action${wrong ? ' is-invalid' : ''}`}>
            <input
              ref={inputRef}
              type={visible ? 'text' : 'password'}
              value={value}
              autoComplete="off"
              spellCheck={false}
              placeholder={t('passwordPlaceholder')}
              aria-invalid={wrong}
              aria-describedby={wrong ? 'password-error' : undefined}
              onChange={(event) => setValue(event.target.value)}
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? t('passwordHide') : t('passwordShow')}
              aria-pressed={visible}
              title={visible ? t('passwordHide') : t('passwordShow')}
            >
              {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </span>
        </label>

        {wrong && (
          <p className="field-error" id="password-error" role="alert">
            {t('passwordWrong')}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || !value.trim()}>
            {pending ? '…' : t('passwordSubmit')}
          </button>
        </div>
      </form>
    </div>
  )
}
