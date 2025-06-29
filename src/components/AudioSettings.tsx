import React from 'react';
import { Settings, Mic } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { MicrophoneSelector } from '@/components/MicrophoneSelector';
import { AudioVisualizer } from '@/components/AudioVisualizer';

interface AudioSettingsProps {
  includeSystemAudio: boolean;
  includeMicrophone: boolean;
  selectedMicId: string | null;
  micStream: MediaStream | null;
  isRecording: boolean;
  onSystemAudioChange: (enabled: boolean) => void;
  onMicrophoneChange: (enabled: boolean) => void;
  onMicrophoneSelect: (micId: string | null) => void;
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({
  includeSystemAudio,
  includeMicrophone,
  selectedMicId,
  micStream,
  isRecording,
  onSystemAudioChange,
  onMicrophoneChange,
  onMicrophoneSelect
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Settings className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Audio Settings</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium">System Audio</label>
              <p className="text-xs text-muted-foreground">Capture system sounds</p>
            </div>
          </div>
          <Switch
            checked={includeSystemAudio}
            onCheckedChange={onSystemAudioChange}
            disabled={isRecording}
            className='cursor-pointer'
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium">Microphone</label>
              <p className="text-xs text-muted-foreground">Record voice audio</p>
            </div>
          </div>
          <Switch
            checked={includeMicrophone}
            onCheckedChange={onMicrophoneChange}
            disabled={isRecording}
            className='cursor-pointer'
          />
        </div>
      </div>

      {includeMicrophone && (
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Microphone Setup</span>
            </div>
            <MicrophoneSelector
              selectedMicId={selectedMicId}
              onMicrophoneSelect={onMicrophoneSelect}
              disabled={isRecording}
            />
            {micStream && (
              <AudioVisualizer
                stream={micStream}
                isActive={isRecording}
                height={50}
                className="rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 