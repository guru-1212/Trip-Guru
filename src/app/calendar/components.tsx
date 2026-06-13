'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarEventDetails, generateDailyRRule, generateYearlyRRule } from '@/services/googleCalendarService';
import dayjs from 'dayjs';

interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: CalendarEventDetails, eventId?: string) => Promise<void>;
  initialData?: any; // Google Calendar event object
  defaultCategory?: string;
  loading?: boolean;
}

export function CalendarEventForm({ isOpen, onClose, onSubmit, initialData, defaultCategory, loading }: EventFormProps) {
  const isEditing = !!initialData;
  const [recurrence, setRecurrence] = useState<string>('none');

  const getPrefix = (category?: string) => {
    switch(category) {
      case 'water': return 'Water: ';
      case 'diet': return 'Diet: ';
      case 'birthday': return '🎂 Birthday: ';
      case 'trip': return 'Trip: ';
      default: return '';
    }
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (isOpen) {
      reset({
        summary: initialData?.summary || getPrefix(defaultCategory),
        description: initialData?.description || '',
        location: initialData?.location || '',
        startDate: initialData?.start?.dateTime ? dayjs(initialData.start.dateTime).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        startTime: initialData?.start?.dateTime ? dayjs(initialData.start.dateTime).format('HH:mm') : '09:00',
        endDate: initialData?.end?.dateTime ? dayjs(initialData.end.dateTime).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        endTime: initialData?.end?.dateTime ? dayjs(initialData.end.dateTime).format('HH:mm') : '10:00',
      });
      setRecurrence(
        initialData?.recurrence?.[0]?.includes('DAILY') ? 'daily' :
        initialData?.recurrence?.[0]?.includes('YEARLY') ? 'yearly' : 'none'
      );
    }
  }, [isOpen, initialData, defaultCategory, reset]);

  const handleFormSubmit = async (data: any) => {
    const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
    const endDateTime = new Date(`${data.endDate}T${data.endTime}`);

    // Get the user's local timezone (e.g., "America/New_York", "Asia/Kolkata")
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const eventDetails: CalendarEventDetails = {
      summary: data.summary,
      description: data.description,
      location: data.location,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: localTimeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: localTimeZone,
      },
    };

    if (recurrence === 'daily') {
      eventDetails.recurrence = [generateDailyRRule()];
    } else if (recurrence === 'yearly') {
      eventDetails.recurrence = [generateYearlyRRule()];
    }

    await onSubmit(eventDetails, initialData?.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Event Title</Label>
            <Input {...register('summary', { required: true })} placeholder="e.g., Birthday: John Doe" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...register('startDate', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" {...register('startTime', { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" {...register('endDate', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" {...register('endTime', { required: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recurrence</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue placeholder="Select recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input {...register('location')} placeholder="Optional" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register('description')} placeholder="Event details, notes, etc." className="resize-none" />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
