'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  Settings, 
  RefreshCw, 
  Droplets, 
  Utensils, 
  Plane, 
  Cake, 
  ExternalLink,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  History
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  listCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  CalendarEventDetails 
} from '@/services/googleCalendarService';
import { linkGoogleWithCalendarScope } from '@/firebase/auth';
import { CalendarEventForm } from './components';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

import { updateProfileLocal } from '@/features/auth/authSlice';
import { useAppDispatch } from '@/store';

type EventCategory = 'water' | 'diet' | 'trip' | 'birthday' | 'other';

function categorizeEvent(summary: string): EventCategory {
  const s = summary?.toLowerCase() || '';
  if (s.includes('water')) return 'water';
  if (s.includes('diet') || s.includes('meal')) return 'diet';
  if (s.includes('trip') || s.includes('travel')) return 'trip';
  if (s.includes('birthday') || s.includes('🎂')) return 'birthday';
  return 'other';
}

export default function CalendarManagementPage() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [defaultCategory, setDefaultCategory] = useState<string>('');
  const [formLoading, setFormLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming'>('today');

  const fetchEvents = async () => {
    if (!user?.googleCalendarLinked || !user?.googleAccessToken) return;
    setLoading(true);
    try {
      const accessToken = user.googleAccessToken;
      
      // Always fetch from primary to get "all my events"
      let allEvents = await listCalendarEvents(accessToken, 'primary', 250, true);
      allEvents = allEvents.map(e => ({ ...e, _calendarId: 'primary' }));
      
      // If we have a dedicated app calendar, fetch those too and combine
      if (user.googleCalendarId && user.googleCalendarId !== 'primary') {
        try {
          let appEvents = await listCalendarEvents(accessToken, user.googleCalendarId, 250, true);
          appEvents = appEvents.map(e => ({ ...e, _calendarId: user.googleCalendarId }));
          // Combine and deduplicate just in case
          const eventMap = new Map();
          [...allEvents, ...appEvents].forEach(e => {
            eventMap.set(e.id, e);
          });
          allEvents = Array.from(eventMap.values());
        } catch (err) {
          console.error('Failed to fetch dedicated calendar events', err);
        }
      }
      
      setEvents(allEvents);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.googleCalendarLinked && user?.googleAccessToken) {
      fetchEvents();
    }
  }, [user?.googleCalendarLinked, user?.googleAccessToken]);

  const handleCreateOrUpdateEvent = async (eventDetails: CalendarEventDetails, eventId?: string) => {
    let accessToken = user?.googleAccessToken;
    
    if (!accessToken) {
      try {
        const result = await linkGoogleWithCalendarScope();
        dispatch(updateProfileLocal({ googleAccessToken: result.accessToken }));
        accessToken = result.accessToken;
      } catch (err) {
        console.error(err);
        toast.error('Please connect your Google Calendar first.');
        return;
      }
    }

    setFormLoading(true);
    try {
      const calendarId = editingEvent?._calendarId || user?.googleCalendarId || 'primary';
      if (eventId) {
        await updateCalendarEvent(accessToken, calendarId, eventId, eventDetails);
        toast.success('Event updated!');
      } else {
        await createCalendarEvent(accessToken, eventDetails, calendarId);
        toast.success('Event created!');
      }
      
      // Refresh events immediately after saving
      fetchEvents();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save event');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, calendarId: string) => {
    let accessToken = user?.googleAccessToken;
    if (!accessToken) return;
    
    if (!confirm('Are you sure you want to delete this event from Google Calendar?')) return;
    
    try {
      await deleteCalendarEvent(accessToken, calendarId, eventId);
      toast.success('Event deleted');
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete event');
    }
  };

  const openNewEventModal = (category: string) => {
    setEditingEvent(null);
    setDefaultCategory(category);
    setIsFormOpen(true);
  };

  const openEditEventModal = (event: any) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  // Group events by category
  const groupedEvents = useMemo(() => {
    const groups: Record<EventCategory, any[]> = {
      water: [],
      diet: [],
      trip: [],
      birthday: [],
      other: []
    };
    
    const now = dayjs();
    const startOfToday = now.startOf('day');
    const endOfToday = now.endOf('day');

    events.forEach(e => {
      const eventDate = dayjs(e.start?.dateTime || e.start?.date);
      
      // Apply date filter
      if (dateFilter === 'today') {
        if (!eventDate.isBetween(startOfToday, endOfToday, null, '[]') && !e.recurrence) return;
      } else if (dateFilter === 'upcoming') {
        if (eventDate.isBefore(startOfToday) && !e.recurrence) return;
      }

      groups[categorizeEvent(e.summary)].push(e);
    });
    
    // Sort each group (newest first for standard display)
    Object.keys(groups).forEach(key => {
      groups[key as EventCategory].sort((a, b) => {
        const dA = new Date(a.start?.dateTime || a.start?.date).getTime();
        const dB = new Date(b.start?.dateTime || b.start?.date).getTime();
        return dB - dA;
      });
    });
    
    return groups;
  }, [events, dateFilter]);

  const EventSection = ({ title, category, icon: Icon, colorClass }: any) => {
    const sectionEvents = groupedEvents[category as EventCategory];
    
    return (
      <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
        <CardHeader className="border-b border-border/40 bg-muted/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-muted/50 ${colorClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-black tracking-tight">{title}</CardTitle>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={() => openNewEventModal(category)}>
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sectionEvents.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-muted-foreground">No events found in this category.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40 max-h-[400px] overflow-y-auto">
              {sectionEvents.map(event => (
                <div key={event.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0 border border-primary/10">
                      <span className="text-[10px] font-black text-primary leading-none uppercase">
                        {dayjs(event.start.dateTime || event.start.date).format('MMM')}
                      </span>
                      <span className="text-lg font-black text-primary leading-tight">
                        {dayjs(event.start.dateTime || event.start.date).format('DD')}
                      </span>
                    </div>
                    <div className="min-w-0 pr-4">
                      <h4 className="font-bold text-sm leading-tight mb-1 truncate">{event.summary || 'Untitled Event'}</h4>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        {event.start.dateTime ? dayjs(event.start.dateTime).format('hh:mm A') : 'All day'}
                        {event.recurrence && <RefreshCw className="h-3 w-3 inline ml-1 opacity-50" />}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditEventModal(event)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-danger" onClick={() => handleDeleteEvent(event.id, event._calendarId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Sync Center</h1>
              <p className="text-muted-foreground font-medium">Manage all your Google Calendar events centrally</p>
            </div>
            <CalendarStatus onConnect={fetchEvents} />
          </header>

          {!user?.googleCalendarLinked ? (
            <Card className="rounded-[32px] border-border/40 p-12 text-center bg-muted/5">
              <CalendarIcon className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-bold mb-2">Connect Your Calendar</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Link your Google account to view, manage, and create isolated app events directly from this dashboard.
              </p>
            </Card>
          ) : loading && events.length === 0 ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm font-bold text-muted-foreground mt-4">Loading your calendar...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 p-1 bg-muted/30 rounded-xl w-fit">
                <Button 
                  variant={dateFilter === 'today' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setDateFilter('today')}
                  className="rounded-lg font-bold"
                >
                  Today
                </Button>
                <Button 
                  variant={dateFilter === 'upcoming' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setDateFilter('upcoming')}
                  className="rounded-lg font-bold"
                >
                  Upcoming
                </Button>
                <Button 
                  variant={dateFilter === 'all' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setDateFilter('all')}
                  className="rounded-lg font-bold"
                >
                  All Events
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EventSection title="Friend's Birthdays" category="birthday" icon={Cake} colorClass="text-pink-500" />
                <EventSection title="Water Reminders" category="water" icon={Droplets} colorClass="text-blue-500" />
                <EventSection title="Diet & Meals" category="diet" icon={Utensils} colorClass="text-orange-500" />
                <EventSection title="Trips & Travel" category="trip" icon={Plane} colorClass="text-indigo-500" />
                <div className="lg:col-span-2">
                  <EventSection title="Historical & Other Events" category="other" icon={History} colorClass="text-slate-500" />
                </div>
              </div>
            </div>
          )}
        </div>

        <CalendarEventForm 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreateOrUpdateEvent}
          initialData={editingEvent}
          defaultCategory={defaultCategory}
          loading={formLoading}
        />
      </AppShell>
    </ProtectedRoute>
  );
}

function CalendarStatus({ onConnect }: { onConnect: () => void }) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await linkGoogleWithCalendarScope();
      dispatch(updateProfileLocal({ googleAccessToken: result.accessToken }));
      toast.success('Calendar linked successfully!');
      onConnect();
    } catch (err) {
      toast.error('Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  if (user?.googleCalendarLinked && user?.googleAccessToken) {
    return (
      <Badge variant="success" className="h-10 px-4 rounded-full text-sm font-bold flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        Connected to Google Calendar
      </Badge>
    );
  }

  return (
    <Button 
      onClick={handleConnect} 
      disabled={connecting}
      className="rounded-full font-bold px-6 shadow-lg shadow-primary/20"
    >
      {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarIcon className="h-4 w-4 mr-2" />}
      {user?.googleCalendarLinked ? 'Refresh Calendar Connection' : 'Connect Google Calendar'}
    </Button>
  );
}
