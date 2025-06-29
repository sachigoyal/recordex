import { isWindows } from './platform';

export interface VideoSettings {
  width: number;
  height: number;
  frameRate: number;
}

export interface BitrateConfig {
  video: number;
  audio: number;
}

export const getSupportedMimeType = (): string => {
  const supportedTypes = isWindows() ? [
    // Windows-safe codecs first
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',  // Baseline H.264 - most compatible
    'video/mp4;codecs=avc1.640028,mp4a.40.2',  // Main profile
    'video/mp4',
    'video/webm;codecs=vp8,opus',              // VP8 more stable than VP9 on Windows
    'video/webm'
  ] : [
    // Non-Windows optimized selection
    'video/mp4;codecs=avc1.64002A,mp4a.40.2', 
    'video/mp4;codecs=avc1.640028,mp4a.40.2', 
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];

  for (const type of supportedTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  return 'video/webm'; // fallback
};

export const calculateBitrates = (videoSettings: VideoSettings): BitrateConfig => {
  const { width, height } = videoSettings;
  const pixelCount = width * height;
  const isWindowsPlatform = isWindows();
  
  let videoBitrate: number;
  
  if (isWindowsPlatform) {
    // More conservative bitrates for Windows to prevent corruption
    if (pixelCount >= 3840 * 2160) { 
      videoBitrate = 15000000; // 15 Mbps instead of 25
    } else if (pixelCount >= 2560 * 1440) {
      videoBitrate = 10000000; // 10 Mbps instead of 16
    } else if (pixelCount >= 1920 * 1080) {
      videoBitrate = 6000000;  // 6 Mbps instead of 8
    } else {
      videoBitrate = 3000000;  // 3 Mbps instead of 5
    }
  } else {
    // Original bitrates for other platforms
    if (pixelCount >= 3840 * 2160) { 
      videoBitrate = 25000000; 
    } else if (pixelCount >= 2560 * 1440) {
      videoBitrate = 16000000; 
    } else if (pixelCount >= 1920 * 1080) {
      videoBitrate = 8000000;
    } else {
      videoBitrate = 5000000; 
    }
  }
  
  const audioBitrate = isWindowsPlatform ? 256000 : 320000;
  
  return {
    video: videoBitrate,
    audio: audioBitrate
  };
};

export const getDisplayMediaOptions = (includeSystemAudio: boolean): DisplayMediaStreamOptions => {
  const isWindowsPlatform = isWindows();
  
  return {
    video: {
      width: { ideal: isWindowsPlatform ? 1920 : 2560, max: isWindowsPlatform ? 2560 : 3840 },
      height: { ideal: isWindowsPlatform ? 1080 : 1440, max: isWindowsPlatform ? 1440 : 2160 },
      frameRate: { ideal: isWindowsPlatform ? 30 : 60, max: isWindowsPlatform ? 30 : 60 },
      facingMode: 'environment'
    },
    audio: includeSystemAudio ? {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: isWindowsPlatform ? 44100 : 48000,
      channelCount: isWindowsPlatform ? 1 : 2,
      sampleSize: 16
    } : false
  };
};

export const getMicrophoneConstraints = (selectedMicId?: string | null): MediaStreamConstraints => {
  const isWindowsPlatform = isWindows();
  
  const audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: isWindowsPlatform ? 44100 : 48000,
    channelCount: isWindowsPlatform ? 1 : 2,
    sampleSize: 16
  };

  return {
    audio: selectedMicId 
      ? { deviceId: { exact: selectedMicId }, ...audioConstraints }
      : audioConstraints
  };
};

export const getFileExtension = (mimeType: string): string => {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  return 'mp4'; // fallback
};

export const generateFileName = (mimeType: string): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const qualityTag = mimeType.includes('mp4') ? 'MP4' : 'WebM';
  const extension = getFileExtension(mimeType);
  
  return `screen-recording-${qualityTag}-${timestamp}.${extension}`;
}; 