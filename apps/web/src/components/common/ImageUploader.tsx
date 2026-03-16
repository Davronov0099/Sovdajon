import { useState, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/services/api';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

interface UploadResponse {
  success: boolean;
  data: { urls: string[] };
}

export function ImageUploader({ images, onChange, maxImages = 8 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAdd = images.length < maxImages;

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).slice(0, maxImages - images.length);
    if (fileArray.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of fileArray) {
        formData.append('file', file);
      }

      const res = await api.post('upload/images', { body: formData }).json<UploadResponse>();
      if (res.success) {
        onChange([...images, ...res.data.urls]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [images, maxImages, onChange]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleRemove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-primary">
        Rasmlar ({images.length}/{maxImages})
      </label>

      {/* Preview Grid */}
      {images.length > 0 && (
        <div className="mb-3 grid grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div key={url} className="group relative aspect-square rounded-lg border border-border overflow-hidden">
              <img src={url} alt={`Rasm ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute right-1 top-1 rounded-full bg-danger-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Rasmni o'chirish"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      {canAdd && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
            dragOver ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-300 hover:bg-surface-secondary',
            uploading && 'pointer-events-none opacity-50',
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          aria-label="Rasm yuklash"
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Yuklanmoqda...
            </div>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-secondary">
                Rasmlarni bu yerga tashlang yoki <span className="text-primary-600">tanlang</span>
              </p>
              <p className="mt-1 text-xs text-text-muted">JPG, PNG, WebP — max 5MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
