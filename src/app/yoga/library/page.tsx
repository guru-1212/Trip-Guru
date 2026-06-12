'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, BookOpen, Filter, ArrowRight, Info, CheckCircle2, Flower2, Plus, Edit2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { YogaDifficulty, YogaPose } from '@/types/yoga';
import { getYogaPoses, createYogaPose, updateYogaPose } from '@/firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

const DIFFICULTIES: { id: YogaDifficulty | 'all'; label: string }[] = [
  { id: 'all', label: 'All Levels' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const TARGET_AREAS = ['all', 'core', 'legs', 'arms', 'back', 'hips', 'shoulders', 'balance'];

const INITIAL_POSES: YogaPose[] = [
  {
    id: 'p1',
    name: 'Mountain Pose',
    sanskritName: 'Tadasana',
    difficulty: 'beginner',
    targetAreas: ['balance', 'posture'],
    benefits: ['Improves posture', 'Strengthens thighs, knees, and ankles', 'Firms abdomen and buttocks'],
    instructions: ['Stand with feet together', 'Distribute weight evenly', 'Lift through the crown of the head', 'Keep arms by sides'],
  },
  {
    id: 'p2',
    name: 'Forward Fold',
    sanskritName: 'Uttanasana',
    difficulty: 'beginner',
    targetAreas: ['hamstrings', 'back'],
    benefits: ['Calms the brain', 'Stimulates liver and kidneys', 'Stretches hamstrings and calves'],
    instructions: ['Exhale and fold forward from hips', 'Keep knees slightly bent if needed', 'Let head hang heavy', 'Touch floor or hold ankles'],
  },
  {
    id: 'p3',
    name: 'Downward Dog',
    sanskritName: 'Adho Mukha Svanasana',
    difficulty: 'beginner',
    targetAreas: ['hamstrings', 'shoulders', 'calves'],
    benefits: ['Energizes the body', 'Strengthens arms and legs', 'Stretches shoulders and hamstrings'],
    instructions: ['Start on hands and knees', 'Lift hips towards ceiling', 'Straighten legs and arms', 'Hold and breathe'],
  },
  {
    id: 'p4',
    name: 'Cobra Pose',
    sanskritName: 'Bhujangasana',
    difficulty: 'beginner',
    targetAreas: ['back', 'chest'],
    benefits: ['Strengthens the spine', 'Stretches chest and lungs', 'Stimulates abdominal organs'],
    instructions: ['Lie on belly', 'Place hands under shoulders', 'Inhale and lift chest', 'Keep elbows close to body'],
  },
  {
    id: 'p5',
    name: 'Child\'s Pose',
    sanskritName: 'Balasana',
    difficulty: 'beginner',
    targetAreas: ['back', 'hips'],
    benefits: ['Restorative pose', 'Relieves back and neck pain', 'Calms the mind'],
    instructions: ['Kneel on floor', 'Sit on heels', 'Fold forward over thighs', 'Rest forehead on floor'],
  },
  {
    id: 'p6',
    name: 'Savasana',
    sanskritName: 'Corpse Pose',
    difficulty: 'beginner',
    targetAreas: ['full body'],
    benefits: ['Deep relaxation', 'Reduces stress', 'Lowers blood pressure'],
    instructions: ['Lie on back', 'Arms at sides, palms up', 'Close eyes', 'Breathe naturally and relax every muscle'],
  },
  {
    id: 'h1',
    name: 'Butterfly',
    sanskritName: 'Baddha Konasana',
    difficulty: 'beginner',
    targetAreas: ['hips', 'groin'],
    benefits: ['Stimulates abdominal organs', 'Stretches inner thighs and knees', 'Helps relieve fatigue'],
    instructions: ['Sit with soles of feet together', 'Hold feet or ankles', 'Keep spine straight', 'Gently lower knees towards floor'],
  },
  {
    id: 'h2',
    name: 'Pigeon Pose',
    sanskritName: 'Eka Pada Rajakapotasana',
    difficulty: 'intermediate',
    targetAreas: ['hips', 'glutes'],
    benefits: ['Deep hip opener', 'Stretches thigh and groin', 'Relieves stress and anxiety'],
    instructions: ['From Downward Dog, bring one knee forward', 'Place knee behind same side wrist', 'Extend other leg back', 'Square hips and fold forward'],
  },
  {
    id: 'c1',
    name: 'Boat Pose',
    sanskritName: 'Navasana',
    difficulty: 'intermediate',
    targetAreas: ['core', 'hip flexors'],
    benefits: ['Strengthens abdomen and spine', 'Stimulates kidneys and thyroid', 'Improves digestion'],
    instructions: ['Sit with knees bent', 'Lift feet off floor, shins parallel to floor', 'Extend arms forward', 'Straighten legs for more challenge'],
  },
  {
    id: 'c2',
    name: 'Crow Pose',
    sanskritName: 'Bakasana',
    difficulty: 'advanced',
    targetAreas: ['arms', 'core', 'wrists'],
    benefits: ['Strengthens arms and wrists', 'Tones abdominal muscles', 'Improves focus'],
    instructions: ['Squat down', 'Place hands on floor', 'Lean forward and place knees on triceps', 'Lift feet off floor'],
  },
];

export default function YogaLibraryPage() {
  const [poses, setPoses] = useState<YogaPose[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<YogaDifficulty | 'all'>('all');
  const [targetArea, setTargetArea] = useState('all');

  const [selectedPose, setSelectedPose] = useState<YogaPose | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Form State
  const [editForm, setEditForm] = useState<Partial<YogaPose>>({});

  useEffect(() => {
    loadPoses();
  }, []);

  async function loadPoses() {
    setLoading(true);
    try {
      const data = await getYogaPoses();
      setPoses(data);
    } catch (error) {
      toast.error('Failed to load poses');
    } finally {
      setLoading(false);
    }
  }

  async function seedPoses() {
    setLoading(true);
    try {
      for (const pose of INITIAL_POSES) {
        await updateYogaPose(pose.id, pose);
      }
      toast.success('Library seeded with sample poses!');
      loadPoses();
    } catch (error) {
      toast.error('Failed to seed poses');
      setLoading(false);
    }
  }

  const filteredPoses = useMemo(() => {
    return poses.filter((pose) => {
      const matchesSearch = pose.name.toLowerCase().includes(search.toLowerCase()) || 
                           pose.sanskritName?.toLowerCase().includes(search.toLowerCase());
      const matchesDifficulty = difficulty === 'all' || pose.difficulty === difficulty;
      const matchesTarget = targetArea === 'all' || pose.targetAreas.some(ta => ta.toLowerCase() === targetArea.toLowerCase());
      return matchesSearch && matchesDifficulty && matchesTarget;
    });
  }, [poses, search, difficulty, targetArea]);

  const handleEdit = (pose: YogaPose) => {
    setEditForm(pose);
    setIsEditOpen(true);
  };

  const handleViewGuide = (pose: YogaPose) => {
    setSelectedPose(pose);
    setIsDetailOpen(true);
  };

  async function savePose() {
    if (!editForm.name) return toast.error('Name is required');
    
    try {
      if (editForm.id) {
        await updateYogaPose(editForm.id, editForm);
        toast.success('Pose updated!');
      } else {
        await createYogaPose(editForm as Omit<YogaPose, 'id'>);
        toast.success('New pose added!');
      }
      setIsEditOpen(false);
      loadPoses();
    } catch (error) {
      toast.error('Failed to save pose');
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-primary">Pose Library</h1>
          </div>
          <p className="text-muted-foreground font-medium">Master every asana with detailed guides.</p>
        </div>
        <div className="flex gap-2">
          {poses.length === 0 && !loading && (
            <Button variant="outline" onClick={seedPoses} className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-11 px-6">
              Seed Samples
            </Button>
          )}
          <Button 
            onClick={() => { setEditForm({ targetAreas: [], instructions: [], benefits: [] }); setIsEditOpen(true); }}
            className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4 mr-2" /> Add New Pose
          </Button>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            className="w-full bg-muted/40 border-none rounded-[20px] pl-12 pr-4 py-4 font-bold placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            placeholder="Search by English or Sanskrit name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">Difficulty</p>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-bold transition-all border uppercase tracking-wider',
                    difficulty === d.id
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/30'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">Target Area</p>
            <div className="flex flex-wrap gap-2">
              {TARGET_AREAS.map((area) => (
                <button
                  key={area}
                  onClick={() => setTargetArea(area)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-bold transition-all border uppercase tracking-wider',
                    targetArea === area
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/30'
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pose Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPoses.map((pose) => (
          <Card key={pose.id} className="group border-none bg-muted/20 hover:bg-muted/40 transition-all duration-300 rounded-[32px] overflow-hidden border border-transparent hover:border-primary/10">
            <CardContent className="p-0">
              {/* Pose Image */}
              <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center relative overflow-hidden">
                {pose.imageUrl ? (
                  <img src={pose.imageUrl} alt={pose.name} className="w-full h-full object-cover" />
                ) : (
                  <Flower2 className="h-12 w-12 text-muted-foreground/20" />
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                    pose.difficulty === 'beginner' ? 'bg-emerald-500/10 text-emerald-600' :
                    pose.difficulty === 'intermediate' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-rose-500/10 text-rose-600'
                  )}>
                    {pose.difficulty}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(pose); }}
                    className="p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-black mb-1 group-hover:text-primary transition-colors">{pose.name}</h3>
                  <p className="text-xs font-bold italic text-muted-foreground">{pose.sanskritName}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {pose.targetAreas.map((area) => (
                    <span key={area} className="px-2 py-0.5 rounded-md bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-tighter">
                      {area}
                    </span>
                  ))}
                </div>

                <div className="space-y-2 mb-6">
                  {(pose.benefits || []).slice(0, 2).map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] font-medium leading-tight text-muted-foreground/80">{benefit}</p>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => handleViewGuide(pose)}
                  variant="outline" 
                  className="w-full rounded-2xl font-bold uppercase tracking-widest text-[10px] h-10 border-primary/20 hover:bg-primary hover:text-white transition-all"
                >
                  View Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {filteredPoses.length === 0 && !loading && (
        <div className="text-center py-20 bg-muted/20 rounded-[40px] border-2 border-dashed border-muted">
          <Info className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-black text-muted-foreground">No poses found</h3>
          <p className="text-sm font-bold text-muted-foreground/60">Try adjusting your filters or search terms.</p>
        </div>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editForm.id ? 'Edit Pose' : 'Add New Pose'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Pose Name (English)</Label>
                <Input value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Sanskrit Name</Label>
                <Input value={editForm.sanskritName || ''} onChange={e => setEditForm(p => ({ ...p, sanskritName: e.target.value }))} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Image URL</Label>
              <div className="flex gap-2">
                <Input value={editForm.imageUrl || ''} onChange={e => setEditForm(p => ({ ...p, imageUrl: e.target.value }))} className="rounded-xl" placeholder="https://example.com/image.jpg" />
                {editForm.imageUrl && (
                  <div className="h-10 w-10 rounded-xl overflow-hidden border">
                    <img src={editForm.imageUrl} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Difficulty</Label>
                <select 
                  className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editForm.difficulty}
                  onChange={e => setEditForm(p => ({ ...p, difficulty: e.target.value as any }))}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Target Areas (comma separated)</Label>
                <Input value={editForm.targetAreas?.join(', ') || ''} onChange={e => setEditForm(p => ({ ...p, targetAreas: e.target.value.split(',').map(s => s.trim()) }))} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Benefits (one per line)</Label>
              <Textarea value={editForm.benefits?.join('\n') || ''} onChange={e => setEditForm(p => ({ ...p, benefits: e.target.value.split('\n') }))} className="rounded-xl min-h-[80px]" />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Instructions (one per line)</Label>
              <Textarea value={editForm.instructions?.join('\n') || ''} onChange={e => setEditForm(p => ({ ...p, instructions: e.target.value.split('\n') }))} className="rounded-xl min-h-[120px]" />
            </div>

            <Button onClick={savePose} className="rounded-2xl h-12 font-black uppercase tracking-widest text-xs">
              Save Pose
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[40px] p-0 border-none">
          {selectedPose && (
            <div className="flex flex-col">
              <div className="aspect-video bg-muted relative">
                {selectedPose.imageUrl ? (
                  <img src={selectedPose.imageUrl} alt={selectedPose.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Flower2 className="h-20 w-20 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute top-6 left-6">
                  <span className="bg-white/90 dark:bg-black/90 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl">
                    {selectedPose.difficulty}
                  </span>
                </div>
              </div>

              <div className="p-10 space-y-8">
                <div>
                  <h2 className="text-4xl font-black tracking-tight mb-2">{selectedPose.name}</h2>
                  <p className="text-xl font-bold italic text-muted-foreground">{selectedPose.sanskritName}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Instructions</h4>
                      <div className="space-y-3">
                        {selectedPose.instructions?.map((step, i) => (
                          <div key={i} className="flex gap-4 group">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                              {i + 1}
                            </span>
                            <p className="text-sm font-medium leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Key Benefits</h4>
                      <div className="grid gap-3">
                        {selectedPose.benefits?.map((benefit, i) => (
                          <div key={i} className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-400">{benefit}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Target Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedPose.targetAreas?.map((area) => (
                          <span key={area} className="px-4 py-2 rounded-xl bg-muted font-bold text-xs capitalize">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50">
                   <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="rounded-xl font-bold">
                     Close Guide
                   </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
