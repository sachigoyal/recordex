import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordingStatusProps {
  isRecording: boolean;
  recordingTime: number;
  hasRecording: boolean;
  hasSystemAudio: boolean;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const RecordingStatus: React.FC<RecordingStatusProps> = ({
  isRecording,
  recordingTime,
  hasRecording,
  hasSystemAudio
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-1">
        <Badge 
          variant={isRecording ? "default" : hasRecording ? "secondary" : "outline"}
          className="px-3 py-1.5"
        >
          <div className={cn(
            "w-2 h-2 rounded-full mr-1 mt-0.5",
            isRecording && "bg-red-500 animate-pulse",
            hasRecording && !isRecording && "bg-green-500",
            !isRecording && !hasRecording && "bg-muted-foreground"
          )} />
          {isRecording ? 'Recording' : hasRecording ? 'Complete' : 'Ready'}
          {isRecording && hasSystemAudio && (
            <Waves className="w-3 h-3 ml-1 animate-pulse" />
          )}
        </Badge>
      </div>
      
      {(isRecording || recordingTime > 0) && (
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-muted/50 rounded-lg">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono text-sm tabular-nums">{formatTime(recordingTime)}</span>
        </div>
      )}
    </div>
  );
}; 