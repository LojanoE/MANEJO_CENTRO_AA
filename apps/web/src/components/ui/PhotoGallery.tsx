import { useRef, useState } from 'react'
import { uploadStorageFile, deleteStorageFile } from '../../firebase/storage'
import type { PhotoRef } from '../../config/formTemplates/types'

interface Props {
  folderPath: string
  photos: PhotoRef[]
  onChange: (next: PhotoRef[]) => void
  disabled?: boolean
  max?: number
}

function uniqueFileName(original: string): string {
  const safe = original.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_')
  return `${Date.now()}-${safe}`
}

/**
 * Galería de fotos de un bloque `photo` (p. ej. anexos de una ficha de
 * seguimiento social): sube cada archivo a Firebase Storage y guarda
 * `{ url, fileId }` por foto en las respuestas del formato.
 */
export default function PhotoGallery({ folderPath, photos, onChange, disabled = false, max = 12 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const uploaded: PhotoRef[] = []
      for (const file of files.slice(0, Math.max(0, max - photos.length))) {
        const { path, url } = await uploadStorageFile(folderPath, uniqueFileName(file.name), file)
        uploaded.push({ url, fileId: path })
      }
      onChange([...photos, ...uploaded])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove(photo: PhotoRef) {
    try {
      await deleteStorageFile(photo.fileId)
    } catch {
      // Si no se pudo borrar el archivo en Storage, igual se quita de la lista.
    }
    onChange(photos.filter((p) => p.fileId !== photo.fileId))
  }

  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p.fileId} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img src={p.url} alt="" className="h-28 w-full object-cover" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(p)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
                  title="Quitar foto"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!disabled && photos.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          📷 {uploading ? 'Subiendo…' : 'Agregar foto'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        disabled={disabled || uploading}
        className="hidden"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
