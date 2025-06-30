"use client";
import React, { useState } from 'react';
import { AlertCircle, Monitor, Waves } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRecording } from '@/hooks/useRecording';
import { RecordingStatus } from '@/components/RecordingStatus';
import { AudioSettings } from '@/components/AudioSettings';
import { RecordingControls } from '@/components/RecordingControls';
import { RecordingResults } from '@/components/RecordingResults';
import { VideoPreviewDialog } from '@/components/VideoPreviewDialog';

const ScreenRecorderApp = () => {
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
  const [includeMicrophone, setIncludeMicrophone] = useState(false);
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const recording = useRecording({
    includeSystemAudio,
    includeMicrophone,
    selectedMicId
  });

  const handlePreview = () => setShowPreview(true);

  if (!recording.isSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl">Browser Not Supported</CardTitle>
              <CardDescription>
                Please use Chrome, Firefox, or Edge for screen recording.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-1">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-foreground/5 border-foreground/10 rounded-xl flex items-center justify-center">
              <Monitor className="w-8 h-8 text-foreground" />
            </div>
          </div>
          <div className="flex flex-col items-start">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Recordex</h1>
            <p className="text-md text-muted-foreground font-medium">Screen Recorder</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        <VideoPreviewDialog
          isOpen={showPreview}
          onOpenChange={setShowPreview}
          previewUrl={recording.previewUrl}
          onError={recording.setError}
        />
        {recording.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{recording.error}</AlertDescription>
          </Alert>
        )}
        {includeSystemAudio && !recording.isRecording && (
          <Alert>
            <Waves className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Tip: Select a browser tab when prompted to capture system audio.</span>
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <RecordingStatus
              isRecording={recording.isRecording}
              recordingTime={recording.recordingTime}
              hasRecording={recording.recordedChunks.length > 0}
              hasSystemAudio={recording.hasSystemAudio}
            />
          </CardHeader>
          
          <CardContent className="space-y-5">
            <AudioSettings
              includeSystemAudio={includeSystemAudio}
              includeMicrophone={includeMicrophone}
              selectedMicId={selectedMicId}
              micStream={recording.micStream}
              isRecording={recording.isRecording}
              onSystemAudioChange={setIncludeSystemAudio}
              onMicrophoneChange={setIncludeMicrophone}
              onMicrophoneSelect={setSelectedMicId}
            />

            <RecordingControls
              isRecording={recording.isRecording}
              onStartRecording={recording.startRecording}
              onStopRecording={recording.stopRecording}
            />
          </CardContent>
        </Card>
        {recording.recordedChunks.length > 0 && !recording.isRecording && (
          <RecordingResults
            recordingTime={recording.recordingTime}
            mimeType={recording.mimeType}
            hasSystemAudio={recording.hasSystemAudio}
            onPreview={handlePreview}
            onDownload={recording.downloadRecording}
            onClear={recording.clearRecording}
          />
        )}
      </div>
    </div>
  );
};

export default ScreenRecorderApp;
