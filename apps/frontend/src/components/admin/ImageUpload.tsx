'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadImage } from '@/lib/api-client';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: 'square' | 'bottle';
}

/**
 * Загрузка изображения через /uploads/image с предпросмотром.
 * aspect="bottle" даёт вертикальный формат (этикетка бутылки).
 */
export default function ImageUpload({
  value,
  onChange,
  label = 'Фото',
  aspect = 'square',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch {
      setError('Не удалось загрузить изображение');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-wine-300 hover:text-wine-400 transition-colors disabled:opacity-60 ${
            aspect === 'bottle' ? 'w-20 h-28' : 'w-24 h-24'
          }`}
        >
          {uploading ? (
            <Loader2 size={22} className="animate-spin" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={label}
              className={`w-full h-full ${aspect === 'bottle' ? 'object-contain' : 'object-cover'}`}
            />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <ImagePlus size={20} />
              <span className="text-[10px]">{label}</span>
            </div>
          )}
        </button>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-wine-500 hover:underline"
          >
            {value ? 'Заменить' : 'Загрузить'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-gray-400 hover:text-red-500 inline-flex items-center gap-1"
            >
              <X size={12} /> Убрать
            </button>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
