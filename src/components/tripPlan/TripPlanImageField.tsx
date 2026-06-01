'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadTripPlanImage } from '@/firebase/storage';
import { resolvePlanImage } from '@/lib/tripPlanImages';

export function TripPlanImageField({
  tripId,
  storageKey,
  label = 'Image',
  imageUrl,
  imageKeyword,
  onChange,
  compact,
}: {
  tripId: string;
  storageKey: string;
  label?: string;
  imageUrl?: string;
  imageKeyword?: string;
  onChange: (url: string | undefined) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const preview =
    imageUrl?.trim() || resolvePlanImage(imageKeyword, storageKey);

  const handleFile = async (file: File) => {
    setError('');
    setUploading(true);
    try {
      const url = await uploadTripPlanImage(tripId, storageKey, file);
      onChange(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {preview && (
        <div
          className={
            compact
              ? 'relative h-20 w-20 rounded-xl overflow-hidden border'
              : 'relative h-28 w-full rounded-xl overflow-hidden border'
          }
        >
          <Image
            src={preview}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4 mr-1" />
          )}
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-xl"
          disabled={uploading}
          onClick={() =>
            onChange(resolvePlanImage(imageKeyword, storageKey))
          }
        >
          <Sparkles className="h-4 w-4 mr-1" />
          Stock
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-destructive"
            onClick={() => onChange(undefined)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
      <Input
        placeholder="Or paste image URL"
        value={imageUrl ?? ''}
        className="rounded-xl text-sm"
        onChange={(e) => onChange(e.target.value.trim() || undefined)}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
