'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MemoryType } from '@/types/memory';
import { uploadMemoryFile } from '@/firebase/storage';
import { useAppDispatch } from '@/store';
import { addMemoryThunk } from '@/features/memories/memoriesThunks';
import { Upload } from 'lucide-react';

interface MemoryUploadProps {
  tripId: string;
  uploadedBy: string;
  onSuccess?: () => void;
}

export function MemoryUpload({ tripId, uploadedBy, onSuccess }: MemoryUploadProps) {
  const dispatch = useAppDispatch();
  const [type, setType] = useState<MemoryType>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const memoryId = `mem_${Date.now()}`;
      let fileURL = '';

      if (type === 'note') {
        fileURL = noteText;
      } else if (file) {
        fileURL = await uploadMemoryFile(tripId, memoryId, file);
      } else {
        setError('Please select a file');
        setSubmitting(false);
        return;
      }

      await dispatch(
        addMemoryThunk({
          tripId,
          uploadedBy,
          type,
          fileURL,
          caption,
        })
      ).unwrap();

      setFile(null);
      setCaption('');
      setNoteText('');
      onSuccess?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border">
      <div>
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as MemoryType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="photo">Photo</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="voice">Voice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {type === 'note' ? (
        <div>
          <Label>Note text</Label>
          <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} />
        </div>
      ) : (
        <div>
          <Label>File</Label>
          <Input
            type="file"
            accept={
              type === 'photo'
                ? 'image/*'
                : type === 'video'
                  ? 'video/*'
                  : 'audio/*'
            }
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      <div>
        <Label>Caption</Label>
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      <Button onClick={handleSubmit} disabled={submitting}>
        <Upload className="h-4 w-4 mr-2" />
        {submitting ? 'Uploading...' : 'Upload memory'}
      </Button>
    </div>
  );
}
