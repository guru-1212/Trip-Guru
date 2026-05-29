'use client';

import { motion } from 'framer-motion';
import { Memory } from '@/types/memory';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Mic, Video } from 'lucide-react';
import dayjs from 'dayjs';

interface MemoryGridProps {
  memories: Memory[];
  currentUserId: string;
  onDelete?: (id: string) => void;
}

export function MemoryGrid({ memories, currentUserId, onDelete }: MemoryGridProps) {
  if (memories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {memories.map((memory, index) => (
        <motion.div
          key={memory.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {memory.type === 'photo' && memory.fileURL && (
                <img
                  src={memory.fileURL}
                  alt={memory.caption}
                  className="w-full aspect-square object-cover"
                />
              )}
              {memory.type === 'video' && memory.fileURL && (
                <video src={memory.fileURL} controls className="w-full aspect-square" />
              )}
              {(memory.type === 'note' || memory.type === 'voice') && (
                <div className="aspect-square flex flex-col items-center justify-center bg-muted p-4">
                  {memory.type === 'note' ? (
                    <FileText className="h-12 w-12 text-primary mb-2" />
                  ) : (
                    <Mic className="h-12 w-12 text-primary mb-2" />
                  )}
                  {memory.type === 'voice' && memory.fileURL && (
                    <audio src={memory.fileURL} controls className="w-full mt-2" />
                  )}
                  {memory.type === 'note' && (
                    <p className="text-sm text-center line-clamp-4">{memory.fileURL || memory.caption}</p>
                  )}
                </div>
              )}
              <div className="p-3">
                {memory.caption && (
                  <p className="text-sm line-clamp-2">{memory.caption}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {dayjs(memory.createdAt.toDate()).format('MMM D, YYYY')}
                </p>
                {memory.uploadedBy === currentUserId && onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-danger"
                    onClick={() => onDelete(memory.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
