import { useState, useRef, useCallback } from 'react'
import { uploadStorageFile, deleteStorageFile } from '../../firebase/storage'

export interface ImageUploadValue {
  fileId: string | null
  url: string | null
}

interface ImageUploadProps {
  folderPath: string
  fileName?: string
  value: ImageUploadValue
  onChange: (value: ImageUploadValue) => void
  label?: string
  accept?: string
  disabled?: boolean
}

function uniqueFileName(original: string, prefix = ''): string {
  const ts = Date.now()
  const safe = original.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_')
  const dot = safe.lastIndexOf('.')
  const ext = dot > 0 ? safe.slice(dot) : ''
  const base = dot > 0 ? safe.slice(0, dot) : safe
  return `${prefix}${base}-${ts}${ext}`
}

export default function ImageUpload({
  folderPath,
  fileName,
  value,
  onChange,
  label = 'Imagen / Comprobante',
  accept = 'image/*',
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setUploading(true)
      setError(null)
      try {
        const name = fileName ? fileName : uniqueFileName(file.name)
        const { path, url } = await uploadStorageFile(folderPath, name, file)
        if (value.fileId && value.fileId !== path) {
          try {
            await deleteStorageFile(value.fileId)
          } catch {
            // Si no se pudo borrar la anterior, no falla el flujo principal.
          }
        }
        onChange({ fileId: path, url })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al subir imagen')
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [folderPath, fileName, onChange, value.fileId],
  )

  const handleRemove = useCallback(async () => {
    if (!value.fileId) return
    setUploading(true)
    setError(null)
    try {
      await deleteStorageFile(value.fileId)
      onChange({ fileId: null, url: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar imagen')
    } finally {
      setUploading(false)
    }
  }, [value.fileId, onChange])

  return (
    <div className="space-y-2">
      <label className="form-label">{label}</label>
      {value.url ? (
        <div className="relative inline-block rounded-xl border border-slate-200 bg-slate-50 p-2">
          <img
            src={value.url}
            alt={label}
            className="max-h-48 rounded-lg object-contain"
          />
          <div className="mt-2 flex items-center gap-2">
            <a
              href={value.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Ver original
            </a>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {uploading ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {uploading ? 'Subiendo…' : 'Seleccionar imagen'}
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
