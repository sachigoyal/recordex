"use client";
import React, { useState, useRef } from 'react';
import { Play, Square, Download, AlertCircle, Mic, Settings, Eye, MonitorX, Video, Clock, Waves, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { MicrophoneSelector } from '@/components/MicrophoneSelector';
import { AudioVisualizer } from '@/components/AudioVisualizer';


const ScreenRecorderApp = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [mimeType, setMimeType] = useState('');
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
  const [includeMicrophone, setIncludeMicrophone] = useState(false);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mixerRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  React.useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setIsSupported(false);
      setError('Screen recording is not supported in this browser. Please use Chrome, Firefox, or Edge.');
      return;
    }

    const supportedTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4'
    ];

    for (const type of supportedTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        setMimeType(type);
        break;
      }
    }
  }, []);

  React.useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const setupMixedAudioStream = async (displayStream: MediaStream, microphoneStream?: MediaStream | null): Promise<MediaStream> => {
    const webkitAudioContext = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const AudioContextClass = window.AudioContext || webkitAudioContext;
    
    if (!AudioContextClass) {
      throw new Error('AudioContext not supported');
    }

    audioContextRef.current = new AudioContextClass();
    const audioContext = audioContextRef.current;
    
    mixerRef.current = audioContext.createMediaStreamDestination();
    const mixer = mixerRef.current;

    let hasMixedAudio = false;

    const systemAudioTracks = displayStream.getAudioTracks();
    if (systemAudioTracks.length > 0) {
      const systemSource = audioContext.createMediaStreamSource(
        new MediaStream(systemAudioTracks)
      );
      systemSource.connect(mixer);
      hasMixedAudio = true;
    }

    if (includeMicrophone && microphoneStream) {
      const micAudioTracks = microphoneStream.getAudioTracks();
      if (micAudioTracks.length > 0) {
        const micSource = audioContext.createMediaStreamSource(
          new MediaStream(micAudioTracks)
        );
        micSource.connect(mixer);
        hasMixedAudio = true;
      }
    }

    const videoTracks = displayStream.getVideoTracks();
    const finalTracks = [...videoTracks];
    
    if (hasMixedAudio) {
      finalTracks.push(...mixer.stream.getAudioTracks());
    }

    return new MediaStream(finalTracks);
  };

  const startRecording = async () => {
    try {
      setError('');
      setRecordedChunks([]);
      setRecordingTime(0);
      setHasSystemAudio(false);
      setShowPreview(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }

      if (!window.isSecureContext) {
        setError('Screen recording requires HTTPS. Please use https:// or localhost.');
        return;
      }

      let currentMicStream: MediaStream | null = null;
      if (includeMicrophone) {
        try {
          const micConstraints: MediaStreamConstraints = {
            audio: selectedMicId 
              ? { 
                  deviceId: { exact: selectedMicId },
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                  sampleRate: 48000
                }
              : {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                  sampleRate: 48000
                }
          };
          currentMicStream = await navigator.mediaDevices.getUserMedia(micConstraints);
          setMicStream(currentMicStream);
        } catch (micError) {
          console.warn('Could not access microphone:', micError);
          setError('Could not access microphone. Recording will continue without microphone audio.');
          setMicStream(null);
        }
      }

      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: includeSystemAudio ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        } : false
      };

      const displayStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      const hasAudio = displayStream.getAudioTracks().length > 0;
      setHasSystemAudio(hasAudio);
      
      if (includeSystemAudio && !hasAudio) {
        setError('System audio not captured. Make sure to select "Share audio" and choose a browser tab (not entire screen) for best audio capture.');
      }

      let finalStream: MediaStream;

      if ((hasAudio || includeSystemAudio) && includeMicrophone && currentMicStream) {
        try {
          finalStream = await setupMixedAudioStream(displayStream, currentMicStream);
        } catch (mixError) {
          console.warn('Audio mixing failed, falling back to simple stream:', mixError);
          const videoTracks = displayStream.getVideoTracks();
          const systemAudioTracks = displayStream.getAudioTracks();
          const micAudioTracks = currentMicStream?.getAudioTracks() || [];
          finalStream = new MediaStream([...videoTracks, ...systemAudioTracks, ...micAudioTracks]);
        }
      } else {
        finalStream = displayStream;
      }

      streamRef.current = finalStream;
      const firstVideoTrack = finalStream.getVideoTracks()[0];
      const settings = firstVideoTrack?.getSettings();
      const width = settings?.width || 1920;
      const height = settings?.height || 1080;
      const pixelCount = width * height;
      const videoBitrate = Math.min(Math.max(pixelCount * 0.1 * 30, 2000000), 8000000);

      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType: mimeType,
        videoBitsPerSecond: videoBitrate,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available, size:', event.data.size);
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, chunks:', chunks.length);
        setRecordedChunks(chunks);
        setIsRecording(false);
        
        if (chunks.length > 0) {
          const blobType = mimeType || 'video/webm';
          const blob = new Blob(chunks, { type: blobType });
          console.log('Created blob:', blob.size, 'bytes, type:', blob.type);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (micStream) {
          micStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          setMicStream(null);
        }
        if (currentMicStream) {
          currentMicStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
      };

      const videoTrack = finalStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          stopRecording();
        });
      }

      mediaRecorder.start(100);
      setIsRecording(true);

      console.log('Recording started with mimeType:', mimeType);

    } catch (err) {
      console.error('Error starting recording:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permission denied. You need to allow screen recording and check "Share audio" if you want system audio.');
        } else if (err.name === 'NotFoundError') {
          setError('No screen available to record. Please make sure you have a display connected.');
        } else if (err.name === 'AbortError') {
          setError('Screen sharing was cancelled. Please try again and make sure to select a screen/window to share.');
        } else if (err.name === 'NotSupportedError') {
          setError('Screen recording is not supported in this browser or context. Try Chrome, Firefox, or Edge with HTTPS.');
        } else {
          setError(`Failed to start recording: ${err.message}. Please refresh the page and try again.`);
        }
      } else {
        setError('Failed to start recording. Please refresh the page and try again.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const openPreview = () => {
    setShowPreview(true);
  };



  const downloadRecording = () => {
    if (recordedChunks.length === 0) return;
    const blobType = mimeType || 'video/webm';
    const blob = new Blob(recordedChunks, { type: blobType });
    let extension = 'webm';
    if (mimeType.includes('mp4')) {
      extension = 'mp4';
    } else if (mimeType.includes('webm')) {
      extension = 'webm';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screen-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearRecording = () => {
    setRecordedChunks([]);
    setRecordingTime(0);
    setError('');
    setHasSystemAudio(false);
    setShowPreview(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    if (micStream) {
      micStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setMicStream(null);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  if (!isSupported) {
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
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Recording Preview</span>
              </DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <video
                ref={videoRef}
                src={previewUrl}
                controls
                preload="metadata"
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: 'calc(90vh - 120px)' }}
                onError={(e) => {
                  console.error('Video preview error:', e);
                  setError('Video preview failed. The recording may be corrupted. Try a different browser or record at lower quality.');
                }}
                onLoadedMetadata={() => {
                  console.log('Video metadata loaded successfully');
                }}
              >
                Your browser does not support video playback.
              </video>
            </div>
          </DialogContent>
        </Dialog>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {includeSystemAudio && !isRecording && (
          <Alert>
            <Waves className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Tip:</span> Select a browser tab when prompted to capture system audio.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Badge 
                  variant={isRecording ? "default" : recordedChunks.length > 0 ? "secondary" : "outline"}
                  className={`px-3 py-1.5 ${isRecording ? 'animate-pulse' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full mr-1 mt-0.5 ${
                    isRecording 
                      ? 'bg-red-500 animate-pulse' 
                      : recordedChunks.length > 0 
                        ? 'bg-green-500' 
                        : 'bg-muted-foreground'
                  }`} />
                  {isRecording ? 'Recording' : recordedChunks.length > 0 ? 'Complete' : 'Ready'}
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
          </CardHeader>
          
          <CardContent className="space-y-5">
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
                    onCheckedChange={setIncludeSystemAudio}
                    disabled={isRecording}
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
                    onCheckedChange={setIncludeMicrophone}
                    disabled={isRecording}
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
                      onMicrophoneSelect={setSelectedMicId}
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

            <div>
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="w-full text-base font-medium"
                  size="lg"
                >
                  <Play className="w-5 h-5" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="w-full text-base font-medium"
                  size="lg"
                >
                  <Square className="w-5 h-5" />
                  Stop Recording
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {recordedChunks.length > 0 && !isRecording && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Recording Complete</CardTitle>
                    <p className="text-sm text-muted-foreground">Your recording is ready</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono">{formatTime(recordingTime)}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <Badge variant="outline" className="text-xs">
                    {mimeType.includes('mp4') ? 'MP4' : 'WebM'}
                  </Badge>
                  {hasSystemAudio && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <Badge variant="outline" className="text-xs">
                        <Waves className="w-3 h-3 mr-1" />
                        Audio
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  onClick={openPreview}
                  variant="outline"
                  className="flex items-center justify-center"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </Button>
                
                <Button
                  onClick={downloadRecording}
                  className="flex items-center justify-center"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                
                <Button
                  onClick={clearRecording}
                  variant="outline"
                  className="flex items-center justify-center"
                >
                  <MonitorX className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ScreenRecorderApp;
