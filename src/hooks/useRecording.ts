import { useState, useRef, useEffect } from 'react';
import { isWindows } from '@/lib/utils/platform';
import { 
  getSupportedMimeType, 
  calculateBitrates, 
  getDisplayMediaOptions, 
  getMicrophoneConstraints,
  generateFileName,
  type VideoSettings 
} from '@/lib/utils/recording-config';
import { createAudioMixer, type AudioMixerConfig } from '@/lib/utils/audio-mixer';

export interface UseRecordingOptions {
  includeSystemAudio: boolean;
  includeMicrophone: boolean;
  selectedMicId: string | null;
}

export interface UseRecordingReturn {
  isRecording: boolean;
  recordedChunks: Blob[];
  recordingTime: number;
  error: string;
  isSupported: boolean;
  mimeType: string;
  hasSystemAudio: boolean;
  previewUrl: string;
  micStream: MediaStream | null;
  
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  downloadRecording: () => void;
  clearRecording: () => void;
  setPreviewUrl: (url: string) => void;
  setError: (error: string) => void;
}

export const useRecording = (options: UseRecordingOptions): UseRecordingReturn => {
  const { includeSystemAudio, includeMicrophone, selectedMicId } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [mimeType, setMimeType] = useState('');
  const [hasSystemAudio, setHasSystemAudio] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioMixerRef = useRef(createAudioMixer());

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setIsSupported(false);
      setError('Screen recording is not supported in this browser. Please use Chrome, Firefox, or Edge.');
      return;
    }

    const supportedMimeType = getSupportedMimeType();
    setMimeType(supportedMimeType);
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const startRecording = async () => {
    try {
      setError('');
      setRecordedChunks([]);
      setRecordingTime(0);
      setHasSystemAudio(false);
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
          const micConstraints = getMicrophoneConstraints(selectedMicId);
          currentMicStream = await navigator.mediaDevices.getUserMedia(micConstraints);
          setMicStream(currentMicStream);
        } catch (micError) {
          console.warn('Could not access microphone:', micError);
          setError('Could not access microphone. Recording will continue without microphone audio.');
          setMicStream(null);
        }
      }

      const displayMediaOptions = getDisplayMediaOptions(includeSystemAudio);
      const displayStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      const hasAudio = displayStream.getAudioTracks().length > 0;
      setHasSystemAudio(hasAudio);
      
      if (includeSystemAudio && !hasAudio) {
        setError('System audio not captured. Make sure to select "Share audio" and choose a browser tab (not entire screen) for best audio capture.');
      }

      let finalStream: MediaStream;

      if ((hasAudio || includeSystemAudio) && includeMicrophone && currentMicStream) {
        try {
          const audioMixerConfig: AudioMixerConfig = {
            includeSystemAudio: hasAudio,
            includeMicrophone,
            displayStream,
            microphoneStream: currentMicStream
          };
          finalStream = await audioMixerRef.current.setupMixedAudioStream(audioMixerConfig);
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
      const videoSettings: VideoSettings = {
        width: settings?.width || 1920,
        height: settings?.height || 1080,
        frameRate: settings?.frameRate || 30
      };
      
      const bitrates = calculateBitrates(videoSettings);

      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType: mimeType,
        videoBitsPerSecond: bitrates.video,
        audioBitsPerSecond: bitrates.audio
      });

      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setRecordedChunks(chunks);
        setIsRecording(false);
        
        if (chunks.length > 0) {
          const blobType = mimeType || 'video/webm';
          const blob = new Blob(chunks, { type: blobType });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }

        cleanup();
      };

      mediaRecorder.onerror = () => {
        const errorMsg = isWindows() 
          ? 'Recording error occurred. On Windows, try: 1) Use Chrome instead of Edge, 2) Lower your display resolution, 3) Close other video applications, 4) Disable hardware acceleration in browser settings.'
          : 'Recording error occurred. Please try again.';
        setError(errorMsg);
      };

      const videoTrack = finalStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          stopRecording();
        });
      }

      mediaRecorder.start(1000);
      setIsRecording(true);

    } catch (err) {
      console.error('Error starting recording:', err);
      handleRecordingError(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const downloadRecording = () => {
    if (recordedChunks.length === 0) return;
    
    const blobType = mimeType || 'video/mp4';
    const blob = new Blob(recordedChunks, { type: blobType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = generateFileName(mimeType);
    
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
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    cleanup();
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
    if (micStream) {
      micStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setMicStream(null);
    }
    audioMixerRef.current.cleanup();
  };

  const handleRecordingError = (err: unknown) => {
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
  };

  return {
    isRecording,
    recordedChunks,
    recordingTime,
    error,
    isSupported,
    mimeType,
    hasSystemAudio,
    previewUrl,
    micStream,
    
    startRecording,
    stopRecording,
    downloadRecording,
    clearRecording,
    setPreviewUrl,
    setError,
  };
}; 