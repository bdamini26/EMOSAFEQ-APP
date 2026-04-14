import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

interface ScreamDetectorProps {
  onScreamDetected: () => void;
  isActive: boolean;
}

export default function ScreamDetector({ onScreamDetected, isActive }: ScreamDetectorProps) {
  const [amplitude, setAmplitude] = useState(0);
  const isNative = Capacitor.isNativePlatform();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const SCREAM_THRESHOLD = 0.7; // Normalized threshold (0 to 1)

  useEffect(() => {
    if (isActive) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    return () => stopMonitoring();
  }, [isActive]);

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        let max = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = Math.abs(dataArray[i] - 128) / 128;
          if (val > max) max = val;
        }

        setAmplitude(max);

        if (max > SCREAM_THRESHOLD) {
          onScreamDetected();
          // Debounce scream detection to avoid multiple alerts
          stopMonitoring();
          setTimeout(() => {
            if (isActive) startMonitoring();
          }, 5000);
        } else {
          animationFrameRef.current = requestAnimationFrame(checkAudio);
        }
      };

      checkAudio();
    } catch (err) {
      console.error('Microphone access denied:', err);
      toast.error('Microphone access required', {
        description: 'Please go to the Safety tab and click "FIX PERMISSION" to enable scream detection.'
      });
    }
  };

  const stopMonitoring = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    analyserRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
  };

  return null; // This is a headless component
}
