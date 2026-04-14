import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { triggerSOS, EmergencyContact, sendReachedSafelyMessage } from './emergency';
import { db } from './firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { SituationAssessment } from '@/services/geminiService';

import { NativeBridge, isNative } from './nativeBridge';

interface EmergencyContextType {
  isEmergency: boolean;
  assessment: SituationAssessment | null;
  triggerEmergency: (trigger?: 'MANUAL' | 'SCREAM' | 'TIMER_EXPIRED' | 'BT_LOST') => Promise<void>;
  resetEmergency: () => void;
  sendReachedSafely: () => void;
  contacts: EmergencyContact[];
  location: { lat: number; lng: number } | null;
  refreshLocation: () => void;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isEmergency, setIsEmergency] = useState(false);
  const [assessment, setAssessment] = useState<SituationAssessment | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const refreshLocation = useCallback(async () => {
    toast.info('Requesting GPS lock...');
    try {
      const newLoc = await NativeBridge.getCurrentLocation();
      setLocation(newLoc);
      toast.success('Location updated');
    } catch (err: any) {
      console.error('Location error:', err);
      let msg = 'Could not get location';
      if (err.code === 1) msg = 'Location permission denied. Please enable GPS.';
      if (err.code === 2) msg = 'Location unavailable. Check your signal.';
      if (err.code === 3) msg = 'Location request timed out.';
      toast.error(msg);
      throw err;
    }
  }, []);

  // Sync contacts
  useEffect(() => {
    if (!user) {
      setContacts([]);
      return;
    }

    const q = query(collection(db, 'contacts'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contactsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setContacts(contactsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Track location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('Location watch error:', err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const triggerEmergency = useCallback(async (trigger: 'MANUAL' | 'SCREAM' | 'TIMER_EXPIRED' | 'BT_LOST' = 'MANUAL') => {
    setIsEmergency(true);
    const result = await triggerSOS(user?.uid, contacts, location, trigger);
    setAssessment(result);
  }, [user, contacts, location]);

  const resetEmergency = () => {
    setIsEmergency(false);
    setAssessment(null);
  };

  const sendReachedSafely = useCallback(() => {
    sendReachedSafelyMessage(contacts);
  }, [contacts]);

  return (
    <EmergencyContext.Provider value={{ 
      isEmergency, 
      assessment, 
      triggerEmergency, 
      resetEmergency, 
      sendReachedSafely,
      refreshLocation,
      contacts, 
      location 
    }}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const context = useContext(EmergencyContext);
  if (context === undefined) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
}
