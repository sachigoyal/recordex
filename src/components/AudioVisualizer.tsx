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
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;

        sourceRef.current =
          audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);

        draw();
      } catch (error) {
        console.error("Error setting up audio visualization:", error);
      }
    };

    setupAudioContext();

    return cleanup;
  }, [stream, isActive]);

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

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const draw = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const drawFrame = () => {
      if (!analyserRef.current || !isActive) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = ((dataArray[i] || 0) / 255) * canvas.height * 0.8;

        const gradient = ctx.createLinearGradient(
          0,
          canvas.height,
          0,
          canvas.height - barHeight
        );
        gradient.addColorStop(0, "#3b82f6");
        gradient.addColorStop(1, "#3b82f680");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
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
    <div className={cn("p-0", className)}>
      <canvas
        ref={canvasRef}
        width={300}
        height={height}
        className="w-full"
        style={{ height: `${height}px` }}
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
