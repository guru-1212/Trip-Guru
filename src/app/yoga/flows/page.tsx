'use client';

import { useState, useEffect, useMemo } from 'react';
import { Activity, Clock, Zap, Play, ArrowRight, Info, CheckCircle2, Star, X, Plus, Edit2, Search, Trash2, Flower2, Upload, FileJson, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { YogaDifficulty, YogaFlow, YogaPose, YogaFlowItem } from '@/types/yoga';
import { YogaSessionPlayer } from '@/components/yoga/YogaSessionPlayer';
import { getYogaFlows, createYogaFlow, updateYogaFlow, getYogaPoses } from '@/firebase/firestore';
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

const SAMPLE_FLOWS_DATA: Omit<YogaFlow, 'id' | 'createdAt'>[] = [
  {
    name: 'Full Body Energy Flow',
    description: 'A comprehensive sequence to energize every muscle and focus your mind.',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    poses: [
      { poseId: 'p1', poseName: 'Mountain Pose', durationSeconds: 60 },
      { poseId: 'p2', poseName: 'Forward Fold', durationSeconds: 60 },
      { poseId: 'p3', poseName: 'Downward Dog', durationSeconds: 60 },
      { poseId: 'p11', poseName: 'Plank Pose', durationSeconds: 30 },
      { poseId: 'p4', poseName: 'Cobra Pose', durationSeconds: 45 },
      { poseId: 'p5', poseName: 'Child\'s Pose', durationSeconds: 60 },
      { poseId: 'p7', poseName: 'Warrior I', durationSeconds: 60 },
      { poseId: 'p8', poseName: 'Warrior II', durationSeconds: 60 },
      { poseId: 'p9', poseName: 'Triangle Pose', durationSeconds: 60 },
      { poseId: 'p6', poseName: 'Savasana', durationSeconds: 120 },
    ],
  },
  {
    name: 'Hip & Back Relief',
    description: 'Focus on releasing tension in the lower body and spine with deep stretches.',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    poses: [
      { poseId: 'p5', poseName: 'Child\'s Pose', durationSeconds: 60 },
      { poseId: 'p3', poseName: 'Downward Dog', durationSeconds: 60 },
      { poseId: 'h1', poseName: 'Butterfly', durationSeconds: 90 },
      { poseId: 'h2', poseName: 'Pigeon Pose', durationSeconds: 120 },
      { poseId: 'p12', poseName: 'Bridge Pose', durationSeconds: 60 },
      { poseId: 'p2', poseName: 'Forward Fold', durationSeconds: 60 },
      { poseId: 'p9', poseName: 'Triangle Pose', durationSeconds: 60 },
      { poseId: 'p4', poseName: 'Cobra Pose', durationSeconds: 60 },
      { poseId: 'p1', poseName: 'Mountain Pose', durationSeconds: 45 },
      { poseId: 'p6', poseName: 'Savasana', durationSeconds: 180 },
    ],
  },
  {
    name: 'Core & Balance Power',
    description: 'Build strength and stability with this intense sequence targeting your core.',
    difficulty: 'advanced',
    estimatedMinutes: 18,
    poses: [
      { poseId: 'p1', poseName: 'Mountain Pose', durationSeconds: 30 },
      { poseId: 'p11', poseName: 'Plank Pose', durationSeconds: 60 },
      { poseId: 'p13', poseName: 'Side Plank', durationSeconds: 45 },
      { poseId: 'c1', poseName: 'Boat Pose', durationSeconds: 60 },
      { poseId: 'c2', poseName: 'Crow Pose', durationSeconds: 45 },
      { poseId: 'p14', poseName: 'Warrior III', durationSeconds: 45 },
      { poseId: 'p10', poseName: 'Tree Pose', durationSeconds: 60 },
      { poseId: 'p3', poseName: 'Downward Dog', durationSeconds: 60 },
      { poseId: 'p4', poseName: 'Cobra Pose', durationSeconds: 30 },
      { poseId: 'p6', poseName: 'Savasana', durationSeconds: 120 },
    ],
  },
];

const AI_PROMPT_TEMPLATE = `Act as a Yoga Content Architect. Generate a JSON array containing 5 unique Yoga Flows. The output must be valid JSON and follow this exact structure:

{
  "name": "string",
  "description": "string",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimatedMinutes": number,
  "imageUrl": "string (optional flow cover image URL)",
  "poses": [
    {
      "poseId": "string (unique slug, e.g., mountain-pose)",
      "poseName": "string",
      "durationSeconds": number,
      "imageUrl": "string (direct link to GIF/image)"
    }
  ]
}

Instructions:
1. Create flows for different goals (e.g., Deep Sleep, Core Power).
2. For pose imageUrl, use high-quality direct links to Yoga GIFs or images.
3. Return ONLY the raw JSON array.`;

export default function YogaFlowsPage() {
  const [flows, setFlows] = useState<YogaFlow[]>([]);
  const [poses, setPoses] = useState<YogaPose[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<YogaDifficulty | 'all'>('all');
  const [activeFlow, setActiveFlow] = useState<YogaFlow | null>(null);
  
  // Dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [editForm, setEditForm] = useState<Partial<YogaFlow>>({
    name: '',
    description: '',
    difficulty: 'beginner',
    estimatedMinutes: 10,
    poses: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [flowsData, posesData] = await Promise.all([
        getYogaFlows(),
        getYogaPoses()
      ]);
      setFlows(flowsData);
      setPoses(posesData);
    } catch (error) {
      toast.error('Failed to load yoga data');
    } finally {
      setLoading(false);
    }
  }

  async function seedFlows() {
    setLoading(true);
    try {
      console.log('Starting seed process with:', SAMPLE_FLOWS_DATA);
      let count = 0;
      for (const flow of SAMPLE_FLOWS_DATA) {
        await createYogaFlow(flow);
        count++;
      }
      toast.success(`Successfully seeded ${count} flows!`);
      loadData();
    } catch (error: any) {
      console.error('Seeding Error Details:', error);
      toast.error(`Seeding Failed: ${error.message || 'Firestore write error'}`);
      setLoading(false);
    }
  }

  const filteredFlows = flows.filter(f => filter === 'all' || f.difficulty === filter);

  const handleEdit = (flow: YogaFlow) => {
    setEditForm(flow);
    setIsEditOpen(true);
  };

  const handleAddPose = (pose: YogaPose) => {
    const newItem: YogaFlowItem = {
      poseId: pose.id,
      poseName: pose.name,
      durationSeconds: 30,
      imageUrl: pose.imageUrl || '',
    };
    setEditForm(prev => ({
      ...prev,
      poses: [...(prev.poses || []), newItem]
    }));
  };

  const handleRemovePose = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      poses: (prev.poses || []).filter((_, i) => i !== index)
    }));
  };

  const handleUpdatePoseItem = (index: number, updates: Partial<YogaFlowItem>) => {
    setEditForm(prev => {
      const newPoses = [...(prev.poses || [])];
      newPoses[index] = { ...newPoses[index], ...updates };
      return { ...prev, poses: newPoses };
    });
  };

  async function saveFlow() {
    if (!editForm.name) return toast.error('Flow name is required');
    if (!editForm.poses || editForm.poses.length === 0) return toast.error('Add at least one pose');

    try {
      if (editForm.id) {
        await updateYogaFlow(editForm.id, editForm);
        toast.success('Flow updated!');
      } else {
        await createYogaFlow(editForm as Omit<YogaFlow, 'id'>);
        toast.success('Flow created!');
      }
      setIsEditOpen(false);
      loadData();
    } catch (error) {
      toast.error('Failed to save flow');
    }
  }

  async function handleBulkImport() {
    const lenientJsonParse = (raw: string) => {
      let s = raw.trim();
      
      // 1. Strip Markdown code blocks if they exist
      s = s.replace(/^```[a-z]*\n?|```$/g, '').trim();
      
      // 2. Fix trailing commas (e.g., [1, 2,] -> [1, 2])
      s = s.replace(/,\s*([\]}])/g, '$1');

      // 3. Robust Extraction: Find the actual JSON block if there's junk text around it
      const firstBracket = s.indexOf('[');
      const firstBrace = s.indexOf('{');
      let start = -1;
      let end = -1;
      
      if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        start = firstBracket;
        end = s.lastIndexOf(']');
      } else if (firstBrace !== -1) {
        start = firstBrace;
        end = s.lastIndexOf('}');
      }
      
      if (start !== -1 && end !== -1 && end > start) {
        s = s.substring(start, end + 1);
      }

      return JSON.parse(s);
    };

    try {
      setLoading(true);
      const parsed = lenientJsonParse(importJson);
      const flowsToImport = Array.isArray(parsed) ? parsed : [parsed];
      
      let count = 0;
      for (const rawFlow of flowsToImport) {
        if (!rawFlow.name || !rawFlow.poses || !Array.isArray(rawFlow.poses)) continue;

        const formattedPoses = rawFlow.poses.map((p: any) => ({
          poseId: p.poseId || (p.poseName ? p.poseName.toLowerCase().replace(/\s+/g, '-') : `pose-${Math.random().toString(36).substr(2, 5)}`),
          poseName: p.poseName || 'Unnamed Pose',
          durationSeconds: Number(p.durationSeconds) || 30,
          imageUrl: p.imageUrl || ''
        }));

        const flowToCreate: Omit<YogaFlow, 'id' | 'createdAt'> = {
          name: rawFlow.name,
          description: rawFlow.description || '',
          difficulty: rawFlow.difficulty || 'beginner',
          estimatedMinutes: Number(rawFlow.estimatedMinutes) || 10,
          imageUrl: rawFlow.imageUrl || '',
          poses: formattedPoses
        };

        await createYogaFlow(flowToCreate);
        count++;
      }
      
      toast.success(`Successfully imported ${count} flows!`);
      setIsImportOpen(false);
      setImportJson('');
      loadData();
    } catch (error: any) {
      console.error('Import Error:', error);
      toast.error(`Import Failed: ${error.message.includes('JSON') ? 'Check your JSON format (ensure all brackets are closed)' : error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
    toast.success('AI Prompt copied to clipboard!');
  };

  return (
    <div className="space-y-8">
      {activeFlow && (
        <YogaSessionPlayer 
          flow={activeFlow} 
          onClose={() => setActiveFlow(null)} 
        />
      )}
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-rose-500/10 p-2 rounded-xl text-rose-500">
              <Activity className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-primary">Yoga Flows</h1>
          </div>
          <p className="text-muted-foreground font-medium">Follow structured sequences designed for your goals.</p>
        </div>
        <div className="flex gap-2">
          {!loading && (
            <Button 
              variant="outline" 
              onClick={seedFlows} 
              className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-11 px-6 border-amber-500/20 text-amber-600 hover:bg-amber-50"
            >
              Seed Latest Flows (10 Poses)
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-11 px-6 border-rose-500/20 text-rose-500 hover:bg-rose-50"
          >
            <Upload className="h-4 w-4 mr-2" /> Bulk Import
          </Button>
          <Button 
            onClick={() => { setEditForm({ name: '', description: '', difficulty: 'beginner', estimatedMinutes: 10, poses: [] }); setIsEditOpen(true); }}
            className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg shadow-rose-500/20 bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> Create Flow
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div>
        <div className="flex flex-wrap gap-2">
          {['all', 'beginner', 'intermediate', 'advanced'].map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d as any)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-bold transition-all border uppercase tracking-wider',
                filter === d
                  ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-background border-border text-muted-foreground hover:border-rose-500/30'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Flows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredFlows.map((flow) => (
          <Card key={flow.id} className="group border-none bg-muted/20 hover:bg-muted/40 transition-all duration-300 rounded-[32px] overflow-hidden border border-transparent hover:border-rose-500/10">
            <CardContent className="p-0 flex flex-col md:flex-row h-full">
              {/* Image side */}
              <div className="w-full md:w-48 bg-muted/50 flex items-center justify-center relative overflow-hidden shrink-0">
                {flow.imageUrl ? (
                  <img src={flow.imageUrl} alt={flow.name} className="w-full h-full object-cover" />
                ) : (
                  <Zap className="h-10 w-10 text-muted-foreground/20" />
                )}
                <div className="absolute top-4 left-4">
                  <div className="bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Premium</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleEdit(flow)}
                  className="absolute bottom-4 right-4 p-2 rounded-full bg-white/90 dark:bg-black/80 shadow-sm hover:scale-110 transition-transform"
                >
                  <Edit2 className="h-3 text-rose-500" />
                </button>
              </div>
              
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
                    <span className={cn(
                      'px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest',
                      flow.difficulty === 'beginner' ? 'bg-emerald-500/10 text-emerald-600' :
                      flow.difficulty === 'intermediate' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-rose-500/10 text-rose-600'
                    )}>
                      {flow.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {flow.estimatedMinutes}m
                    </span>
                  </div>
                </div>

                <h3 className="text-2xl font-black mb-3 group-hover:text-rose-500 transition-colors">{flow.name}</h3>
                <p className="text-sm font-medium text-muted-foreground/80 mb-6 leading-relaxed">
                  {flow.description}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    {flow.poses.length} Poses included
                  </span>
                  <Button 
                    onClick={() => setActiveFlow(flow)}
                    className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-10 px-6 bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform"
                  >
                    <Play className="h-3.5 w-3.5 mr-2 fill-current" />
                    Start Flow
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
        </div>
      )}

      {filteredFlows.length === 0 && !loading && (
        <div className="text-center py-20 bg-muted/20 rounded-[40px] border-2 border-dashed border-muted">
          <Info className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-black text-muted-foreground">No flows found</h3>
          <p className="text-sm font-bold text-muted-foreground/60">Try adjusting your filters.</p>
        </div>
      )}

      {/* Edit Flow Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-none overflow-hidden">
          <div className="flex flex-col h-full max-h-[90vh]">
            <div className="p-8 bg-rose-500 text-white">
              <DialogTitle className="text-3xl font-black tracking-tight">{editForm.id ? 'Edit Flow' : 'Create New Flow'}</DialogTitle>
              <p className="text-rose-100 font-medium text-sm mt-1">Design your sequence and set custom GIFs for each pose.</p>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Side: Flow Details */}
              <div className="w-full md:w-1/2 p-8 space-y-6 overflow-y-auto border-r">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Flow Name</Label>
                    <Input 
                      value={editForm.name || ''} 
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} 
                      placeholder="e.g. Energizing Morning Flow"
                      className="rounded-2xl border-muted bg-muted/20 h-12 font-bold" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Description</Label>
                    <Textarea 
                      value={editForm.description || ''} 
                      onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} 
                      placeholder="What is this flow for?"
                      className="rounded-2xl border-muted bg-muted/20 min-h-[100px] font-medium" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Difficulty</Label>
                      <select 
                        className="w-full bg-muted/20 border-muted border rounded-2xl px-4 h-12 text-sm font-bold focus:ring-2 focus:ring-rose-500/20 outline-none appearance-none"
                        value={editForm.difficulty}
                        onChange={e => setEditForm(p => ({ ...p, difficulty: e.target.value as any }))}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Duration (Min)</Label>
                      <Input 
                        type="number"
                        value={editForm.estimatedMinutes || 10} 
                        onChange={e => setEditForm(p => ({ ...p, estimatedMinutes: parseInt(e.target.value) }))} 
                        className="rounded-2xl border-muted bg-muted/20 h-12 font-bold" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Flow Cover URL (Optional)</Label>
                    <Input 
                      value={editForm.imageUrl || ''} 
                      onChange={e => setEditForm(p => ({ ...p, imageUrl: e.target.value }))} 
                      placeholder="https://..."
                      className="rounded-2xl border-muted bg-muted/20 h-12 font-medium" 
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-black text-sm uppercase tracking-widest">Sequence ({editForm.poses?.length || 0})</h4>
                  <div className="space-y-3">
                    {editForm.poses?.map((item, idx) => (
                      <div key={idx} className="bg-muted/30 p-4 rounded-[24px] space-y-3 relative group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <p className="font-bold text-sm">{item.poseName}</p>
                          </div>
                          <button onClick={() => handleRemovePose(idx)} className="text-muted-foreground hover:text-rose-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-4 space-y-1">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Secs</Label>
                            <Input 
                              type="number" 
                              value={item.durationSeconds} 
                              onChange={e => handleUpdatePoseItem(idx, { durationSeconds: parseInt(e.target.value) })}
                              className="h-8 rounded-lg text-xs font-bold"
                            />
                          </div>
                          <div className="col-span-8 space-y-1">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Custom GIF URL</Label>
                            <Input 
                              value={item.imageUrl || ''} 
                              onChange={e => handleUpdatePoseItem(idx, { imageUrl: e.target.value })}
                              placeholder="GIF URL..."
                              className="h-8 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                        
                        {item.imageUrl && (
                          <div className="h-20 w-full rounded-xl overflow-hidden border border-muted-foreground/10 bg-black">
                             <img src={item.imageUrl} alt="preview" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    ))}
                    {(!editForm.poses || editForm.poses.length === 0) && (
                      <div className="text-center py-10 border-2 border-dashed border-muted rounded-[32px]">
                        <Flower2 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs font-bold text-muted-foreground/60">Select poses from the library on the right</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Pose Library Picker */}
              <div className="w-full md:w-1/2 p-8 bg-muted/10 overflow-y-auto">
                <div className="mb-6 sticky top-0 bg-background/50 backdrop-blur-md p-1 rounded-2xl z-10">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search Pose Library..." 
                      className="pl-10 h-12 rounded-2xl border-none bg-background shadow-sm font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {poses.map(pose => (
                    <button
                      key={pose.id}
                      onClick={() => handleAddPose(pose)}
                      className="text-left bg-background p-4 rounded-[24px] border border-transparent hover:border-rose-500/20 hover:shadow-lg transition-all group"
                    >
                      <div className="aspect-square bg-muted/40 rounded-2xl mb-3 flex items-center justify-center overflow-hidden">
                        {pose.imageUrl ? (
                          <img src={pose.imageUrl} alt={pose.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <Zap className="h-6 w-6 text-muted-foreground/20" />
                        )}
                      </div>
                      <h5 className="font-black text-xs group-hover:text-rose-500 transition-colors">{pose.name}</h5>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{pose.difficulty}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t bg-background flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-8">
                Cancel
              </Button>
              <Button onClick={saveFlow} className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-10 bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-500/20">
                {editForm.id ? 'Update Flow' : 'Create Flow'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl rounded-[32px]">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle className="text-2xl font-black">Bulk Import Flows</DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyPrompt}
              className="rounded-xl border-rose-500/20 text-rose-500 hover:bg-rose-50 h-9 px-4 font-bold text-[10px] uppercase tracking-widest"
            >
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy AI Prompt
            </Button>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-4 rounded-2xl">
              <div className="flex gap-3 text-amber-800 dark:text-amber-400">
                <Info className="h-5 w-5 shrink-0" />
                <div className="text-xs space-y-2">
                  <p className="font-bold uppercase tracking-widest">Senior Dev Tip:</p>
                  <p>Paste a JSON array of flows generated by AI. Ensure each flow has a <strong>name</strong>, <strong>difficulty</strong>, and a <strong>poses</strong> array.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">JSON Data</Label>
              <Textarea 
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='[{"name": "Power Flow", "difficulty": "advanced", "poses": [...]}]'
                className="min-h-[300px] font-mono text-[11px] rounded-2xl bg-muted/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setIsImportOpen(false)} className="rounded-xl font-bold">Cancel</Button>
              <Button onClick={handleBulkImport} disabled={!importJson || loading} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold px-8">
                {loading ? 'Importing...' : 'Execute Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
