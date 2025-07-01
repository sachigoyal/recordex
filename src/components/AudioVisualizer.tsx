import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
  height?: number;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  stream,
  isActive,
  height = 80,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const webkitAudioContext = (
      window as typeof window & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext;
    if (!window.AudioContext && !webkitAudioContext) {
      setIsSupported(false);
      return;
    }

    const setupAudioContext = async () => {
      if (!stream || !isActive) {
        cleanup();
        return;
      }

      try {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          return;
        }

        const AudioContextClass = window.AudioContext || webkitAudioContext;
        if (!AudioContextClass) return;
        audioContextRef.current = new AudioContextClass();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.smoothingTimeConstant = 0.3;

        sourceRef.current =
          audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);

        themeObserverCleanupRef.current = draw();
      } catch (error) {
        console.error("Error setting up audio visualization:", error);
      }
    };

    setupAudioContext();

    return cleanup;
  }, [stream, isActive]);

  const themeObserverCleanupRef = useRef<(() => void) | null>(null);

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;

    if (themeObserverCleanupRef.current) {
      themeObserverCleanupRef.current();
      themeObserverCleanupRef.current = null;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const draw = () => {
    if (!analyserRef.current || !canvasRef.current) return () => {};

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const getCurrentColors = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      return {
        primary: computedStyle.getPropertyValue('--color-primary').trim(),
        foreground: computedStyle.getPropertyValue('--color-foreground').trim()
      };
    };

    let currentColors = getCurrentColors();

    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
          currentColors = getCurrentColors();
        }
      });
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    const drawFrame = () => {
      if (!analyserRef.current || !isActive) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, rect.width, rect.height);

      const visibleBars = 80;
      const barWidth = 2;
      const barSpacing = rect.width / visibleBars;
      
      const normalizedData = new Array(visibleBars);
      for (let i = 0; i < visibleBars; i++) {
        const logIndex = Math.floor(Math.pow(i / (visibleBars - 1), 1.5) * (bufferLength - 1));
        
        let sum = 0;
        let count = 0;
        const range = Math.max(1, Math.floor(bufferLength / (visibleBars * 2)));
        
        for (let j = Math.max(0, logIndex - range); j <= Math.min(bufferLength - 1, logIndex + range); j++) {
          sum += dataArray[j] || 0;
          count++;
        }
        
        normalizedData[i] = count > 0 ? sum / count : 0;
      }

      for (let i = 0; i < visibleBars; i++) {
        const x = i * barSpacing + (barSpacing - barWidth) / 2;
        
        const rawHeight = (normalizedData[i] / 255) * rect.height * 0.9;
        const barHeight = Math.max(rawHeight, 2);
        
        const gradient = ctx.createLinearGradient(0, rect.height, 0, rect.height - barHeight);
        
        const primaryRgb = currentColors.primary.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
        if (primaryRgb) {
          const [, l, c, h] = primaryRgb;
          gradient.addColorStop(0, `oklch(${l} ${c} ${h} / 0.9)`);
          gradient.addColorStop(0.6, `oklch(${l} ${c} ${h} / 0.6)`);
          gradient.addColorStop(1, `oklch(${l} ${c} ${h} / 0.2)`);
        } else {
          gradient.addColorStop(0, currentColors.primary);
          gradient.addColorStop(1, currentColors.foreground);
        }

        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.roundRect(x, rect.height - barHeight, barWidth, barHeight, [1, 1, 0, 0]);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      themeObserver.disconnect();
    };
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardContent
          className="flex items-center justify-center"
          style={{ height }}
        >
          <span className="text-xs text-muted-foreground">
            Audio visualization not supported
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("relative p-0", className)}>
      <canvas
        ref={canvasRef}
        className="w-full block"
        style={{ 
          height: `${height}px`,
          imageRendering: 'crisp-edges'
        }}
      />
      {!isActive && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/80 rounded"
          style={{ height: `${height}px` }}
        >
          <span className="text-xs text-muted-foreground">
            {stream ? "Start recording to see audio" : "No audio stream"}
          </span>
        </div>
      )}
    </div>
  );
};
