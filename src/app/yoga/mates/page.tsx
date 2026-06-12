'use client';

import { useState, useEffect } from 'react';
import { Users, Mail, UserPlus, Check, X, Loader2, Trash2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { 
  inviteYogaMate, 
  getYogaMatesForOwner, 
  removeYogaMate, 
  getPendingYogaInvitesForUser,
  acceptYogaMate,
  declineYogaMate
} from '@/firebase/firestore';
import toast from 'react-hot-toast';

export default function YogaMatesPage() {
  const { uid, user } = useAuth();
  const [mates, setMates] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setUploading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  useEffect(() => {
    loadMates();
  }, [uid]);

  async function loadMates() {
    if (!uid || !user) return;
    setLoading(true);
    try {
      const [matesData, invitesData] = await Promise.all([
        getYogaMatesForOwner(uid),
        getPendingYogaInvitesForUser(user.email)
      ]);
      setMates(matesData);
      setPendingInvites(invitesData);
    } catch (error) {
      console.error('Failed to load yoga mates:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !user) return;
    if (!inviteEmail) return toast.error('Email is required');

    setUploading(true);
    try {
      await inviteYogaMate(uid, user.name, { email: inviteEmail, name: inviteName || 'Yogi' });
      toast.success('Invitation sent!');
      setInviteEmail('');
      setInviteName('');
      loadMates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invite');
    } finally {
      setUploading(false);
    }
  };

  const handleAccept = async (inviteId: string) => {
    if (!uid) return;
    try {
      await acceptYogaMate(inviteId, uid);
      toast.success('Welcome to the group!');
      loadMates();
    } catch (error) {
      toast.error('Failed to accept invite');
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      await declineYogaMate(inviteId);
      toast.success('Invite declined');
      loadMates();
    } catch (error) {
      toast.error('Failed to decline invite');
    }
  };

  const handleRemove = async (partnerId: string) => {
    if (!uid) return;
    if (!confirm('Are you sure you want to remove this yoga mate?')) return;
    try {
      await removeYogaMate(uid, partnerId);
      toast.success('Yoga mate removed');
      loadMates();
    } catch (error) {
      toast.error('Failed to remove yoga mate');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Finding Mates...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <Users className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Yoga Mates</h1>
        </div>
        <p className="text-muted-foreground font-medium">Practice together, grow together.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Left Column: Invite & Incoming */}
        <div className="lg:col-span-1 space-y-10">
          {/* Send Invite */}
          <section className="space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Invite Yogi
            </h2>
            <form onSubmit={handleInvite} className="bg-muted/20 p-6 rounded-[32px] space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Mate Name</p>
                <Input 
                  placeholder="e.g. Rahul" 
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="rounded-2xl border-none bg-background shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Email Address</p>
                <Input 
                  placeholder="rahul@example.com" 
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="rounded-2xl border-none bg-background shadow-sm"
                />
              </div>
              <Button 
                type="submit" 
                disabled={inviting}
                className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-2" /> Send Invite</>}
              </Button>
            </form>
          </section>

          {/* Incoming Invites */}
          {pendingInvites.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-500" />
                Incoming Invites
              </h2>
              <div className="space-y-3">
                {pendingInvites.map((inv) => (
                  <Card key={inv.id} className="border-none bg-amber-50 dark:bg-amber-500/5 rounded-3xl overflow-hidden border border-amber-100 dark:border-amber-500/10">
                    <CardContent className="p-5">
                      <p className="text-sm font-bold mb-3">
                        <span className="text-amber-600">{inv.invitedBy}</span> invited you to be their Yoga Mate!
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleAccept(inv.id)}
                          className="flex-1 rounded-xl h-9 bg-emerald-500 hover:bg-emerald-600 text-xs font-bold"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Accept
                        </Button>
                        <Button 
                          onClick={() => handleDecline(inv.id)}
                          variant="outline"
                          className="flex-1 rounded-xl h-9 text-xs font-bold border-amber-200 hover:bg-amber-100 dark:hover:bg-amber-500/10"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Your Mates */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black flex items-center gap-2 px-1">
            <Users className="h-5 w-5 text-primary" />
            Your Zen Circle
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {mates.map((mate) => (
              <Card key={mate.id} className="border-none bg-muted/20 hover:bg-muted/30 transition-all rounded-[32px] overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-black">
                      {mate.partnerName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black truncate">{mate.partnerName}</h3>
                      <p className="text-xs font-medium text-muted-foreground truncate">{mate.partnerEmail}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter",
                          mate.inviteStatus === 'accepted' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                        )}>
                          {mate.inviteStatus}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemove(mate.partnerId || mate.id)}
                      className="rounded-xl opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {mates.length === 0 && (
              <div className="sm:col-span-2 py-20 bg-muted/5 rounded-[40px] border-2 border-dashed border-muted text-center space-y-3">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto text-muted-foreground/30">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-muted-foreground/60">No yoga mates yet</h3>
                <p className="text-sm font-medium text-muted-foreground/40 max-w-xs mx-auto">Invite friends to share your journey and keep each other motivated!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
