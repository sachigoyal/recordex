import { isWindows } from './platform';

export interface AudioMixerConfig {
  includeSystemAudio: boolean;
  includeMicrophone: boolean;
  displayStream: MediaStream;
  microphoneStream?: MediaStream | null;
}

export class AudioMixer {
  private audioContext: AudioContext | null = null;
  private mixer: MediaStreamAudioDestinationNode | null = null;

  async setupMixedAudioStream(config: AudioMixerConfig): Promise<MediaStream> {
    const { includeSystemAudio, includeMicrophone, displayStream, microphoneStream } = config;
    
    const webkitAudioContext = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const AudioContextClass = window.AudioContext || webkitAudioContext;
    
    if (!AudioContextClass) {
      throw new Error('AudioContext not supported');
    }

    const isWindowsPlatform = isWindows();
    const contextOptions = isWindowsPlatform ? {
      sampleRate: 44100,
      latencyHint: 'balanced' as AudioContextLatencyCategory
    } : {
      sampleRate: 48000,
      latencyHint: 'playback' as AudioContextLatencyCategory
    };

    this.audioContext = new AudioContextClass(contextOptions);
    this.mixer = this.audioContext.createMediaStreamDestination();

    let hasMixedAudio = false;

    if (includeSystemAudio) {
      const systemAudioTracks = displayStream.getAudioTracks();
      if (systemAudioTracks.length > 0) {
        const systemSource = this.audioContext.createMediaStreamSource(
          new MediaStream(systemAudioTracks)
        );
        
        if (isWindowsPlatform) {
          const gainNode = this.audioContext.createGain();
          gainNode.gain.value = 0.8;
          systemSource.connect(gainNode);
          gainNode.connect(this.mixer);
        } else {
          systemSource.connect(this.mixer);
        }
        hasMixedAudio = true;
      }
    }

    if (includeMicrophone && microphoneStream) {
      const micAudioTracks = microphoneStream.getAudioTracks();
      if (micAudioTracks.length > 0) {
        const micSource = this.audioContext.createMediaStreamSource(
          new MediaStream(micAudioTracks)
        );
        
        if (isWindowsPlatform) {
          const micGainNode = this.audioContext.createGain();
          micGainNode.gain.value = 0.7;
          micSource.connect(micGainNode);
          micGainNode.connect(this.mixer);
        } else {
          micSource.connect(this.mixer);
        }
        hasMixedAudio = true;
      }
    }

    const videoTracks = displayStream.getVideoTracks();
    const finalTracks = [...videoTracks];
    
    if (hasMixedAudio && this.mixer) {
      finalTracks.push(...this.mixer.stream.getAudioTracks());
    }

    return new MediaStream(finalTracks);
  }

  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.mixer = null;
  }
}

export const createAudioMixer = () => new AudioMixer(); 