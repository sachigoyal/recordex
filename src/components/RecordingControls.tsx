import React from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording
}) => {
  return (
    <div>
      {!isRecording ? (
        <Button
          onClick={onStartRecording}
          className="w-full text-base font-medium cursor-pointer"
          size="lg"
        >
          <Play className="w-5 h-5" />
          Start Recording
        </Button>
      ) : (
        <Button
          onClick={onStopRecording}
          variant="destructive"
          className="w-full text-base font-medium cursor-pointer"
          size="lg"
        >
          <Square className="w-5 h-5" />
          Stop Recording
        </Button>
      )}
    </div>
  );
}; 