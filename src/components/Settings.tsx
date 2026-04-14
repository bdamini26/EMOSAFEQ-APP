import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, Bell, Lock, EyeOff, Save, Smartphone } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function Settings() {
  const { user } = useAuth();
  const [unlockCode, setUnlockCode] = useState('1111');
  const [stealthMode, setStealthMode] = useState(true);
  const [autoSms, setAutoSms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<{ configured: boolean, sidMasked: string, phoneMasked: string, isIndianNumber: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUnlockCode(data.unlockCode || '1111');
        setStealthMode(data.stealthMode ?? true);
        setAutoSms(data.autoSms ?? true);
      }
    };
    fetchSettings();

    // Fetch Twilio status
    fetch('/api/twilio-status')
      .then(res => res.json())
      .then(data => setTwilioStatus(data))
      .catch(err => console.error('Failed to fetch Twilio status:', err));
  }, [user]);

  const saveSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', user.uid), {
        unlockCode,
        stealthMode,
        autoSms,
        updatedAt: new Date()
      }, { merge: true });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const testTwilio = async () => {
    if (!testPhone) {
      toast.error('Enter a phone number to test');
      return;
    }
    setTestLoading(true);
    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: testPhone, 
          message: 'EMOSAFEQ: This is a test message to verify your Twilio configuration.' 
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Test SMS sent successfully!');
      } else {
        toast.error('Test SMS failed', { description: data.details || data.error });
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setTestLoading(false);
    }
  };

  const testVoice = async () => {
    if (!testPhone) {
      toast.error('Enter a phone number to test');
      return;
    }
    setVoiceLoading(true);
    try {
      const response = await fetch('/api/make-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: testPhone, 
          message: 'EMOSAFEQ: This is a test voice call. Your automated alert system is working correctly.' 
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Test Voice Call triggered!');
      } else {
        toast.error('Voice Call failed', { description: data.details || data.error });
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setVoiceLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-zinc-500">Security Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Calculator Unlock Code</Label>
              <div className="flex gap-2">
                <Input 
                  type="text" 
                  maxLength={4} 
                  value={unlockCode} 
                  onChange={(e) => setUnlockCode(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 h-10 font-mono text-xl tracking-[0.5em] text-center" 
                  placeholder="1111"
                />
              </div>
              <p className="text-[10px] text-zinc-500 italic">This code unlocks the app from the calculator screen.</p>
            </div>
            <Button 
              onClick={saveSettings} 
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Update Unlock Code
            </Button>
          </div>
          <Separator className="bg-zinc-800" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EyeOff className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-200">Stealth Mode</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setStealthMode(!stealthMode)}
              className={`rounded-full border-zinc-700 ${stealthMode ? 'bg-green-500/10 text-green-500 border-green-500/50' : 'text-zinc-500'}`}
            >
              {stealthMode ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-zinc-500">Alert Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-200">Auto-SMS on Scream</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAutoSms(!autoSms)}
              className={`rounded-full border-zinc-700 ${autoSms ? 'bg-blue-500/10 text-blue-500 border-blue-500/50' : 'text-zinc-500'}`}
            >
              {autoSms ? 'On' : 'Off'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-zinc-500">Twilio SMS Gateway</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {twilioStatus && (
            <div className="p-3 rounded bg-zinc-800/50 border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-zinc-500 uppercase">Config Status:</span>
                <span className={`text-[10px] font-bold ${twilioStatus.configured ? 'text-green-500' : 'text-red-500'}`}>
                  {twilioStatus.configured ? 'CONNECTED' : 'NOT CONFIGURED'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-zinc-500 uppercase">Twilio SID:</span>
                <span className="text-[10px] font-mono text-zinc-300">{twilioStatus.sidMasked}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-zinc-500 uppercase">Twilio Phone:</span>
                <span className={`text-[10px] font-mono ${twilioStatus.isIndianNumber ? 'text-red-400' : 'text-zinc-300'}`}>
                  {twilioStatus.phoneMasked}
                </span>
              </div>
              {twilioStatus.isIndianNumber && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-[9px] text-red-400 leading-tight">
                  ⚠️ <strong>COMMON MISTAKE:</strong> You are using your Indian number (+91) as the SENDER. 
                  You must use the <strong>US number</strong> (+1) that Twilio gave you.
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Test Connection</Label>
              <div className="flex gap-2">
                <Input 
                  type="tel" 
                  value={testPhone} 
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 h-10" 
                  placeholder="+91 8500710149"
                />
                <Button 
                  onClick={testTwilio} 
                  disabled={testLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {testLoading ? '...' : 'Test SMS'}
                </Button>
                <Button 
                  onClick={testVoice} 
                  disabled={voiceLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {voiceLoading ? '...' : 'Test Voice'}
                </Button>
              </div>
              <p className="text-[10px] text-zinc-500 italic">IMPORTANT: Include your country code (e.g., +91 for India).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button 
          onClick={saveSettings} 
          disabled={loading}
          className="flex-1 bg-zinc-100 text-zinc-950 hover:bg-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save All Config'}
        </Button>
        <Button variant="destructive" className="flex-1 bg-red-600/10 text-red-500 border border-red-500/30 hover:bg-red-600/20">
          Reset Data
        </Button>
      </div>
    </div>
  );
}
