import { toast } from 'sonner';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { analyzeSituation, SituationAssessment } from '@/services/geminiService';

export interface EmergencyContact {
  name: string;
  phone: string;
  isPrimary: boolean;
}

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export async function startEvidenceRecording(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
      console.log('Evidence recording saved locally. Size:', audioBlob.size);
      // In a real app, upload to Firebase Storage
    };

    mediaRecorder.start();
    console.log('Evidence recording started');

    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }
    }, 60000);

    return 'local_storage_path_simulated';
  } catch (error) {
    console.error('Failed to start evidence recording:', error);
    return null;
  }
}

export async function triggerSOS(
  userId: string | undefined,
  contacts: EmergencyContact[],
  location: { lat: number; lng: number } | null,
  trigger: 'MANUAL' | 'SCREAM' | 'TIMER_EXPIRED' | 'BT_LOST' = 'MANUAL'
): Promise<SituationAssessment | null> {
  console.log(`🚨 SOS TRIGGERED — source: ${trigger}`);
  
  // 1. Start Evidence Recording
  const audioPath = await startEvidenceRecording();

  // 2. Perform AI Analysis
  const locationContext = location ? `Lat: ${location.lat}, Lng: ${location.lng}` : "Unknown location";
  const assessment = await analyzeSituation(trigger, locationContext);

  // 3. Save alert to Firestore
  if (userId) {
    try {
      await addDoc(collection(db, 'emergency_logs'), {
        userId,
        type: trigger,
        location: location ? { lat: location.lat, lng: location.lng } : null,
        timestamp: serverTimestamp(),
        audioCaptured: !!audioPath,
        aiAssessment: assessment
      });
    } catch (error) {
      console.error('Failed to log emergency:', error);
    }
  }

  // 4. Send SMS to ALL contacts (Simulated)
  sendEmergencyAlerts(contacts, location, trigger, assessment);

  // 5. Call primary contact
  const primary = contacts.find(c => c.isPrimary) || contacts[0];
  if (primary) {
    makeEmergencyCall(primary.phone);
  }

  return assessment;
}

export const sendEmergencyAlerts = (
  contacts: EmergencyContact[], 
  location: { lat: number; lng: number } | null,
  trigger: string = 'MANUAL',
  assessment?: SituationAssessment
) => {
  const locationLink = location 
    ? `https://maps.google.com/?q=${location.lat},${location.lng}`
    : 'Location unavailable';
  
  const triggerText = {
    'SCREAM': 'Loud sound/scream was detected',
    'TIMER_EXPIRED': 'Check-in timer expired without dismissal',
    'BT_LOST': 'Bluetooth buddy link suddenly disconnected',
    'MANUAL': 'Manual SOS triggered'
  }[trigger as keyof typeof triggerText] || 'Emergency triggered';

  let message = `🚨 EMERGENCY ALERT - EMOSAFEQ\n${triggerText}\n📍 Location: ${locationLink}\n⏰ Time: ${new Date().toLocaleString()}`;
  
  if (assessment) {
    message += `\n\nAI Assessment: ${assessment.assessment}\nThreat Level: ${assessment.threatLevel}\nRecommendation: ${assessment.recommendation}`;
  }

  console.log('Sending alerts to:', contacts.map(c => c.phone));
  
  contacts.forEach(async (contact) => {
    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: contact.phone, message })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log(`Automatic SMS sent to ${contact.name}`);
        toast.success(`Alert delivered to ${contact.name}`);
      } else {
        console.warn(`Automatic SMS failed for ${contact.name}:`, data.error);
        
        // Specific handling for provider outages/delays
        const isProviderIssue = data.details?.toLowerCase().includes('delivery') || 
                               data.details?.toLowerCase().includes('carrier');
        
        toast.error(`Automatic SMS Failed for ${contact.name}`, {
          description: isProviderIssue 
            ? "There is a known carrier delay. Switching to manual SMS backup..." 
            : "Switching to manual SMS backup...",
          duration: 6000
        });

        // Fallback to manual link
        const smsUrl = `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
        window.open(smsUrl, '_blank');
      }
    } catch (error) {
      console.error('SMS API Error:', error);
    }
  });

  toast.error('Emergency Alerts Initiated', {
    description: `Automatic alerts sent to ${contacts.length} contacts.`,
  });
};

export const sendReachedSafelyMessage = (contacts: EmergencyContact[]) => {
  const message = `✅ SAFE REACHED - EMOSAFEQ\nI have reached my destination safely. Thank you for watching over me.\n⏰ Time: ${new Date().toLocaleString()}`;
  
  const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];
  if (primaryContact) {
    const smsUrl = `sms:${primaryContact.phone}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  }
  
  toast.success('Safe Arrival Message Sent');
};

export const makeEmergencyCall = (phone: string) => {
  window.open(`tel:${phone}`, '_self');
};
