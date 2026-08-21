import { useState, useEffect } from 'react'
import type { DocumentData } from 'firebase/firestore'
import Modal from './Modal'
import { useConfirm } from './ConfirmProvider'

interface JsonEditorProps {
  open: boolean
  id: string | null
  data: DocumentData | null
  onClose: () => void
  onSave: (id: string, data: DocumentData) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export default function JsonEditor({ open, id, data, onClose, onSave, onDelete }: JsonEditorProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const confirm = useConfirm()

  useEffect(() => {
    if (open && data) {
      setText(JSON.stringify(data, null, 2))
      setError(null)
    }
  }, [open, data])

  async function handleSave() {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      const parsed = JSON.parse(text) as DocumentData
      await onSave(id, parsed)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || !onDelete) return
    const ok = await confirm({
      title: 'Eliminar documento',
      message: `¿Eliminar documento "${id}"? Esta acción no se puede deshacer.`,
    })
    if (!ok) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete(id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal open={open} title={id ? `Editar: ${id}` : 'Documento'} onClose={onClose} size="xl">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        <div>
          <label className="form-label">JSON del documento</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="form-textarea font-mono text-xs"
            rows={18}
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">
            Cerrar
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="btn-secondary w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50"
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || deleting}
            className="btn-primary w-full sm:w-auto"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
