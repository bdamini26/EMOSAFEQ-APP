/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Calculator from './components/Calculator';
import Dashboard from './components/Dashboard';
import ScreamDetector from './components/ScreamDetector';
import { Toaster, toast } from 'sonner';
import { useEmergency } from './lib/EmergencyContext';
import { NativeBridge } from './lib/nativeBridge';
import { useEffect } from 'react';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isScreamDetectionActive, setIsScreamDetectionActive] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const { triggerEmergency } = useEmergency();

  useEffect(() => {
    NativeBridge.init();
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
    setIsScreamDetectionActive(true);
  };

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      setIsScreamDetectionActive(true);
      
      // Proactively request location and microphone on first interaction
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => console.log('Location permission granted'),
          (err) => {
            console.warn('Location permission denied or error:', err);
            if (err.code === 1) {
              toast.error('Location Access Required', {
                description: 'Please enable GPS to allow EMOSAFEQ to track your safety.'
              });
            }
          }
        );
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            console.log('Microphone permission granted');
            // Stop the stream immediately, we just wanted the permission
            stream.getTracks().forEach(track => track.stop());
          })
          .catch((err) => console.warn('Microphone permission denied or error:', err));
      }
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
  };

  const handleScreamDetected = () => {
    triggerEmergency('SCREAM');
  };

  return (
    <div className="min-h-screen bg-black" onClick={handleInteraction}>
      {!isUnlocked ? (
        <Calculator onUnlock={handleUnlock} />
      ) : (
        <Dashboard onLock={handleLock} />
      )}
      
      {/* Scream detector runs in the background if active and app is unlocked (or even if locked if we want) */}
      {/* For safety, we might want it always active once the user has granted permission */}
      <ScreamDetector 
        isActive={isScreamDetectionActive} 
        onScreamDetected={handleScreamDetected} 
      />
      
      <Toaster position="top-center" theme="dark" />
    </div>
  );
}

