'use client';

import { useState, useEffect } from 'react';
import { Camera, Upload, Calendar, ArrowRight, History, Info, CheckCircle2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  createPosturePhotoLog, 
  getPosturePhotoLogs, 
  getYogaPoses 
} from '@/firebase/firestore';
import { uploadYogaPosturePhoto } from '@/firebase/storage';
import { PosturePhotoLog, YogaPose } from '@/types/yoga';
import toast from 'react-hot-toast';

export default function YogaProgressPage() {
  const { uid } = useAuth();
  const [poses, setPoses] = useState<YogaPose[]>([]);
  const [logs, setLogs] = useState<PosturePhotoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [selectedPoseId, setSelectedPoseId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!uid) return;
      try {
        const [posesData, logsData] = await Promise.all([
          getYogaPoses(),
          getPosturePhotoLogs(uid)
        ]);
        setPoses(posesData);
        setLogs(logsData);
      } catch (error) {
        console.error('Failed to load progress data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [uid]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    URL.revokeObjectURL(previewUrl);
  };

  const handleUpload = async () => {
    if (!uid || !selectedFile || !selectedPoseId) {
      toast.error('Please select a pose and an image');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadYogaPosturePhoto(uid, selectedPoseId, selectedFile);
      const pose = poses.find(p => p.id === selectedPoseId);
      
      const newLog: Omit<PosturePhotoLog, 'id' | 'createdAt'> = {
        uid,
        poseId: selectedPoseId,
        poseName: pose?.name || 'Unknown Pose',
        date: new Date().toISOString().split('T')[0],
        imageUrl,
        notes,
      };

      const id = await createPosturePhotoLog(uid, newLog);
      
      // Update local state
      setLogs([{ ...newLog, id, createdAt: new Date() as any } as PosturePhotoLog, ...logs]);
      
      toast.success('Progress photo saved!');
      clearSelection();
      setNotes('');
      setSelectedPoseId('');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Journey...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-500">
            <Camera className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Posture Journey</h1>
        </div>
        <p className="text-muted-foreground font-medium">Track your flexibility and alignment over time.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card className="border-none bg-muted/20 rounded-[40px] overflow-hidden">
          <CardContent className="p-8">
            <h2 className="text-xl font-black mb-6">New Progress Entry</h2>
            
            <div className="space-y-6">
              {/* Image Picker */}
              <div className="relative aspect-square md:aspect-video rounded-3xl bg-muted/40 border-2 border-dashed border-muted overflow-hidden group">
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={clearSelection}
                      className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/60 transition-all">
                    <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-bold text-muted-foreground">Select Posture Photo</p>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                  </label>
                )}
              </div>

              {/* Pose Selection */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">Select Asana</p>
                <select 
                  className="w-full bg-background border border-border rounded-2xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                  value={selectedPoseId}
                  onChange={(e) => setSelectedPoseId(e.target.value)}
                >
                  <option value="">Choose a pose...</option>
                  {poses.map(pose => (
                    <option key={pose.id} value={pose.id}>{pose.name}</option>
                  ))}
                  <option value="other">Other / General</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">Notes (Optional)</p>
                <textarea 
                  className="w-full bg-background border border-border rounded-2xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
                  placeholder="How did this feel? Any breakthroughs?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button 
                className="w-full rounded-2xl font-black uppercase tracking-widest text-xs h-14 bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all"
                disabled={uploading || !selectedFile || !selectedPoseId}
                onClick={handleUpload}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Save Progress Entry'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-black">History</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <History className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">{logs.length} Entries</span>
            </div>
          </div>

          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.map((log) => (
              <Card key={log.id} className="border-none bg-muted/10 rounded-3xl overflow-hidden border border-border/50">
                <CardContent className="p-0 flex items-stretch">
                  <div className="w-24 md:w-32 bg-muted/30 shrink-0 overflow-hidden">
                    <img src={log.imageUrl} alt={log.poseName} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-black text-sm">{log.poseName}</h4>
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {log.date}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">"{log.notes}"</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {logs.length === 0 && (
              <div className="text-center py-20 bg-muted/5 rounded-[40px] border-2 border-dashed border-muted/50">
                <Camera className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm font-bold text-muted-foreground/50">No progress photos yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
