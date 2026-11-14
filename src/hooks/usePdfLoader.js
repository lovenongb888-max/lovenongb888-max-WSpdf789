import { useCallback, useEffect, useRef, useState } from 'react'
import { PASSWORD_REASONS, pdfjsLib } from '../lib/pdfjs'

export function usePdfLoader() {
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState(null)
  const taskRef = useRef(null)
  const updateRef = useRef(null)
  const passwordKeyRef = useRef(0)

  const destroyTask = useCallback(() => {
    const task = taskRef.current
    taskRef.current = null
    updateRef.current = null
    if (task) {
      try {
        task.destroy()
      } catch {
        /* already gone */
      }
    }
  }, [])

  const load = useCallback(
    async (file) => {
      destroyTask()
      setDoc(null)
      setError(null)
      setPassword(null)
      setLoading(true)

      let bytes
      try {
        bytes = new Uint8Array(await file.arrayBuffer())
      } catch {
        setLoading(false)
        setError('file')
        return null
      }

      const task = pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false })
      taskRef.current = task
      task.onPassword = (updatePassword, reason) => {
        updateRef.current = updatePassword
        passwordKeyRef.current += 1
        setLoading(false)
        setPassword({
          wrong: reason === PASSWORD_REASONS.INCORRECT_PASSWORD,
          key: passwordKeyRef.current,
        })
      }

      try {
        const pdf = await task.promise
        if (taskRef.current !== task) return null
        setDoc(pdf)
        setPassword(null)
        return pdf
      } catch (err) {
        if (err?.name === 'PasswordException' || err?.name === 'AbortException') return null
        setError('file')
        return null
      } finally {
        setLoading(false)
      }
    },
    [destroyTask],
  )

  const submitPassword = useCallback((value) => {
    if (!updateRef.current) return
    setPassword((prev) => ({ ...(prev || {}), wrong: false, pending: true }))
    updateRef.current(value)
  }, [])

  const cancelPassword = useCallback(() => {
    destroyTask()
    setPassword(null)
    setLoading(false)
  }, [destroyTask])

  useEffect(() => destroyTask, [destroyTask])

  const reset = useCallback(() => {
    destroyTask()
    setDoc(null)
    setError(null)
    setPassword(null)
    setLoading(false)
  }, [destroyTask])

  return { doc, loading, error, password, load, submitPassword, cancelPassword, reset }
}
