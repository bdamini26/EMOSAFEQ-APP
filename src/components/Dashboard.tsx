import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ShieldAlert, 
  Users, 
  MapPin, 
  Mic, 
  MicOff, 
  Settings as SettingsIcon, 
  LogOut,
  Phone,
  MessageSquare,
  AlertTriangle,
  Activity,
  Trash2,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

import SafeZones from './SafeZones';
import Settings from './Settings';
import FakeCallOverlay from './FakeCallOverlay';
import SafetyTimer from './SafetyTimer';
import BluetoothBuddy from './BluetoothBuddy';

import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { useEmergency } from '@/lib/EmergencyContext';
import { CheckCircle2, BrainCircuit } from 'lucide-react';

interface DashboardProps {
  onLock: () => void;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  isPrimary: boolean;
}

export default function Dashboard({ onLock }: DashboardProps) {
  const { user, signIn } = useAuth();
  const { triggerEmergency, isEmergency, assessment, location, contacts, sendReachedSafely, resetEmergency, refreshLocation } = useEmergency();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [activeTab, setActiveTab] = useState('safety');
  const [serviceStatus, setServiceStatus] = useState<{ status: 'ok' | 'warning' | 'error', message: string } | null>(null);

  useEffect(() => {
    // Simulate checking external service health (Twilio/Carrier status)
    // In a real app, you could fetch this from a status page API
    const checkStatus = () => {
      // Example: If user is in Armenia, show the warning they reported
      setServiceStatus({
        status: 'warning',
        message: 'Carrier Alert: SMS delays reported for some networks (e.g. Viva Cell Armenia). Manual backup enabled.'
      });
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        setMicPermission(result.state as any);
        result.onchange = () => setMicPermission(result.state as any);
      });
    }
  }, []);

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicPermission('granted');
      toast.success('Microphone access granted');
    } catch (e) {
      setMicPermission('denied');
      setPermissionType('microphone');
      setIsPermissionGuideOpen(true);
      toast.error('Microphone access denied');
    }
  };
  
  // New Features State
  const [isFakeCallOpen, setIsFakeCallOpen] = useState(false);
  const [isWalkMeHomeActive, setIsWalkMeHomeActive] = useState(false);
  const [walkMeHomeInterval, setWalkMeHomeInterval] = useState<number | null>(null);
  const [isPermissionGuideOpen, setIsPermissionGuideOpen] = useState(false);
  const [permissionType, setPermissionType] = useState<'microphone' | 'location'>('microphone');

  const toggleWalkMeHome = () => {
    if (isWalkMeHomeActive) {
      setIsWalkMeHomeActive(false);
      if (walkMeHomeInterval) clearInterval(walkMeHomeInterval);
      setWalkMeHomeInterval(null);
      toast.success('Walk Me Home mode deactivated');
    } else {
      setIsWalkMeHomeActive(true);
      toast.success('Walk Me Home mode activated', {
        description: 'Periodic location pings will be sent to primary contact.'
      });
      // Simulate periodic pings
      const interval = window.setInterval(() => {
        console.log('Walk Me Home Ping:', location);
      }, 120000); // Every 2 minutes
      setWalkMeHomeInterval(interval);
    }
  };

  const handleTimerExpire = (label: string) => {
    triggerEmergency('TIMER_EXPIRED');
  };

  const handleBuddyLost = () => {
    triggerEmergency('BT_LOST');
  };

  const handleReachedSafely = () => {
    sendReachedSafely();
    if (isEmergency) resetEmergency();
  };

  const deleteContact = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contacts', id));
      toast.success('Contact removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'contacts');
    }
  };

  function AddContactDialog() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isPrimary, setIsPrimary] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleAdd = async () => {
      if (!user) return;
      try {
        await addDoc(collection(db, 'contacts'), {
          userId: user.uid,
          name,
          phone,
          isPrimary,
          createdAt: serverTimestamp()
        });
        toast.success('Contact added');
        setIsOpen(false);
        setName('');
        setPhone('');
        setIsPrimary(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'contacts');
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full mt-4 border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:bg-zinc-800">
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Trusted Contact</DialogTitle>
            <DialogDescription className="text-zinc-500">
              This person will be notified in case of emergency.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-400">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="e.g. Mom" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-zinc-400">Phone Number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="+1234567890" />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="primary" 
                checked={isPrimary} 
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-red-600"
              />
              <Label htmlFor="primary" className="text-zinc-400">Set as Primary Contact</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} className="bg-red-600 hover:bg-red-700 text-white">Save Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono selection:bg-red-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tighter uppercase">EMOSAFEQ</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isMonitoring ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-zinc-600'}`} />
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest">System Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onLock} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6 pb-24">
        {/* Service Status Alert */}
        <AnimatePresence>
          {serviceStatus && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={`p-3 rounded-lg border flex items-start gap-3 ${
                serviceStatus.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-red-500/10 border-red-500/30 text-red-500'
              }`}>
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="text-[10px] leading-relaxed uppercase font-bold tracking-tight">
                  {serviceStatus.message}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Risk Level & Status */}
        <section className="grid grid-cols-2 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Risk Level</span>
              <Badge variant="outline" className={`
                ${riskLevel === 'Low' ? 'border-green-500/50 text-green-500 bg-green-500/10' : ''}
                ${riskLevel === 'Medium' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' : ''}
                ${riskLevel === 'High' ? 'border-red-500/50 text-red-500 bg-red-500/10' : ''}
                px-4 py-1 rounded-full
              `}>
                {riskLevel}
              </Badge>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest">GPS Status</span>
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${location ? 'text-blue-500' : 'text-zinc-500'}`} />
                <span className="text-xs font-medium">{location ? 'Locked' : 'Searching...'}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Big Emergency Trigger */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <Button 
            onClick={() => isEmergency ? resetEmergency() : triggerEmergency()}
            className={`
              relative w-full h-48 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all active:scale-95
              ${isEmergency ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800'}
            `}
          >
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center border-4
              ${isEmergency ? 'border-white bg-red-50' : 'border-red-600/30 bg-red-600/10'}
            `}>
              <ShieldAlert className={`w-10 h-10 ${isEmergency ? 'text-red-600' : 'text-red-600'}`} />
            </div>
            <div className="text-center">
              <span className={`text-xl font-black tracking-tighter uppercase ${isEmergency ? 'text-white' : 'text-red-600'}`}>
                {isEmergency ? 'SOS ACTIVE' : 'Panic Button'}
              </span>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
                {isEmergency ? 'Tap to dismiss if safe' : 'Press in case of danger'}
              </p>
            </div>
          </Button>
        </section>

        {/* AI Assessment Display */}
        <AnimatePresence>
          {isEmergency && assessment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <Card className="bg-red-600/10 border-red-600/50 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <BrainCircuit className="w-16 h-16" />
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-[10px] uppercase tracking-widest text-red-500 flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3" />
                    AI Situation Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-600 text-white border-none text-[10px]">{assessment.threatLevel} THREAT</Badge>
                    <Badge variant="outline" className="border-red-600/50 text-red-500 text-[10px]">{assessment.emotion}</Badge>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed font-medium italic">
                    "{assessment.assessment}"
                  </p>
                  <div className="bg-red-600/20 p-2 rounded border border-red-600/30">
                    <p className="text-[10px] text-red-400 uppercase font-bold tracking-wider">Recommendation:</p>
                    <p className="text-[10px] text-zinc-300 mt-1">{assessment.recommendation}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs for Features */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <TabsTrigger value="contacts" className="flex-1 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="safety" className="flex-1 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <Shield className="w-4 h-4 mr-2" />
              Safety
            </TabsTrigger>
            <TabsTrigger value="zones" className="flex-1 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <MapPin className="w-4 h-4 mr-2" />
              Zones
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-4 space-y-4">
            {!user ? (
              <Card className="bg-zinc-900 border-zinc-800 p-8 text-center space-y-4">
                <Users className="w-12 h-12 text-zinc-700 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold">Cloud Sync Required</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Sign in to manage trusted contacts</p>
                </div>
                <Button onClick={signIn} className="w-full bg-white text-black hover:bg-zinc-200">
                  Login with Google
                </Button>
              </Card>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs uppercase tracking-widest text-zinc-500">Trusted Contacts</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ScrollArea className="h-48 pr-4">
                    <div className="space-y-3">
                      {contacts.length === 0 ? (
                        <div className="text-center py-8 text-zinc-600 text-xs italic">No contacts added yet</div>
                      ) : (
                        contacts.map((contact) => (
                          <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold">
                                {contact.name[0]}
                              </div>
                              <div>
                                <div className="text-sm font-bold flex items-center gap-2">
                                  {contact.name}
                                  {contact.isPrimary && <Badge className="bg-red-600/20 text-red-500 border-red-500/30 text-[8px] h-4">Primary</Badge>}
                                </div>
                                <div className="text-[10px] text-zinc-500">{contact.phone}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-zinc-400 hover:text-blue-500"
                                onClick={() => window.open(`tel:${contact.phone}`)}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-zinc-400 hover:text-red-500"
                                onClick={() => deleteContact(contact.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <AddContactDialog />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="safety" className="mt-4 space-y-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => setIsFakeCallOpen(true)}
                variant="outline" 
                className="h-24 flex flex-col gap-2 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white group"
              >
                <Phone className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] uppercase tracking-widest text-center">Fake Call<br/>(Simulated)</span>
              </Button>
              <Button 
                onClick={async () => {
                  if (!user?.phoneNumber && contacts.filter(c => c.isPrimary).length === 0) {
                    toast.error("No phone number found. Please add a primary contact.");
                    return;
                  }
                  const targetPhone = contacts.find(c => c.isPrimary)?.phone || user?.phoneNumber;
                  if (!targetPhone) return;

                  toast.info("Triggering real escape call...");
                  try {
                    const res = await fetch('/api/make-call', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        to: targetPhone, 
                        message: "EMOSAFEQ: This is your escape call. Use this as an excuse to leave the situation safely." 
                      })
                    });
                    const data = await res.json();
                    if (data.success) toast.success("Real call incoming!");
                    else toast.error("Call failed", { description: data.error });
                  } catch (e) {
                    toast.error("Network error");
                  }
                }}
                variant="outline" 
                className="h-24 flex flex-col gap-2 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white group"
              >
                <Phone className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] uppercase tracking-widest text-center">Escape Call<br/>(Real Twilio)</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={handleReachedSafely}
                variant="outline" 
                className="h-16 flex items-center justify-center gap-3 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white group"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Reached Safely</span>
              </Button>
              <Button 
                onClick={toggleWalkMeHome}
                variant="outline" 
                className={`h-16 flex items-center justify-center gap-3 border-zinc-800 transition-all group ${isWalkMeHomeActive ? 'bg-green-600/10 border-green-600/50 text-green-500' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                <MapPin className={`w-5 h-5 transition-transform group-hover:scale-110 ${isWalkMeHomeActive ? 'text-green-500' : 'text-zinc-500'}`} />
                <span className="text-[10px] uppercase tracking-widest font-bold">Walk Me Home</span>
              </Button>
            </div>

            <SafetyTimer onExpire={handleTimerExpire} />
            <BluetoothBuddy onBuddyLost={handleBuddyLost} />

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-zinc-500">Sensors</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMonitoring && micPermission === 'granted' ? 'bg-blue-600/10 text-blue-500' : 'bg-zinc-800 text-zinc-600'}`}>
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        Scream Detection
                        {micPermission === 'denied' && <Badge variant="destructive" className="text-[8px] h-4">Blocked</Badge>}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Monitors audio peaks</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {micPermission === 'denied' ? (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={requestMic}
                        className="rounded-full bg-red-600 hover:bg-red-700 text-white h-8 px-4 text-[10px] uppercase tracking-widest animate-pulse"
                      >
                        Fix Permission
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsMonitoring(!isMonitoring)}
                        className={`rounded-full border-zinc-700 h-8 px-4 text-[10px] uppercase tracking-widest ${isMonitoring ? 'bg-blue-600/10 text-blue-500 border-blue-600/30' : ''}`}
                      >
                        {isMonitoring ? 'Active' : 'Off'}
                      </Button>
                    )}
                  </div>
                </div>
                <Separator className="bg-zinc-800" />
                <div className="flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">Motion Detection</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Sudden impact alerts</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-500">Pro</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zones" className="mt-4 space-y-4">
            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-zinc-500">Live Map View</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-64 relative">
                {location ? (
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/view?key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&center=${location.lat},${location.lng}&zoom=15`}
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-600 gap-4">
                    <MapPin className="w-8 h-8 animate-bounce" />
                    <div className="text-center">
                      <span className="text-[10px] uppercase tracking-widest block">Awaiting GPS Lock...</span>
                      <p className="text-[8px] text-zinc-500 mt-1 max-w-[200px]">Ensure location permissions are granted in your browser.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={async () => {
                        try {
                          await refreshLocation();
                        } catch (err: any) {
                          if (err.code === 1) { // Permission denied
                            setPermissionType('location');
                            setIsPermissionGuideOpen(true);
                          }
                        }
                      }}
                      className="border-zinc-800 text-zinc-400 hover:text-white"
                    >
                      Retry Location
                    </Button>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={refreshLocation}
                    className="h-8 w-8 bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-white backdrop-blur-sm"
                  >
                    <Activity className="w-4 h-4" />
                  </Button>
                  <Badge className="bg-zinc-950/80 text-blue-500 border-blue-500/30 backdrop-blur-sm">Real-time Tracking</Badge>
                </div>
              </CardContent>
            </Card>
            <SafeZones />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Settings />
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-3 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('safety')} className={`flex flex-col items-center gap-1 ${activeTab === 'safety' ? 'text-red-500' : 'text-zinc-400'}`}>
          <Activity className="w-4 h-4" />
          <span className="text-[8px] uppercase tracking-widest">Live</span>
        </button>
        <button onClick={() => setActiveTab('zones')} className={`flex flex-col items-center gap-1 ${activeTab === 'zones' ? 'text-blue-500' : 'text-zinc-400'}`}>
          <MapPin className="w-4 h-4" />
          <span className="text-[8px] uppercase tracking-widest">Map</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-zinc-100' : 'text-zinc-400'}`}>
          <SettingsIcon className="w-4 h-4" />
          <span className="text-[8px] uppercase tracking-widest">Config</span>
        </button>
      </footer>

      <FakeCallOverlay 
        isOpen={isFakeCallOpen} 
        onClose={() => setIsFakeCallOpen(false)} 
      />

      {/* Permission Guide Modal */}
      <AnimatePresence>
        {isPermissionGuideOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPermissionGuideOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                  {permissionType === 'microphone' ? <Mic className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {permissionType === 'microphone' ? 'Microphone Blocked' : 'Location Blocked'}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {permissionType === 'microphone' 
                      ? 'EMOSAFEQ needs audio access for scream detection.' 
                      : 'EMOSAFEQ needs GPS access to track your safety and alert contacts.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">How to fix:</div>
                  <ol className="text-xs text-zinc-300 space-y-3 list-decimal list-inside">
                    <li>Look at your browser's address bar.</li>
                    <li>Click the <span className="text-blue-500 font-bold underline">Lock (🔒)</span> or <span className="text-blue-500 font-bold underline">Settings</span> icon.</li>
                    <li>Find <span className="font-bold">{permissionType === 'microphone' ? 'Microphone' : 'Location'}</span> and set it to <span className="text-green-500 font-bold">Allow</span>.</li>
                    <li>Refresh the page or click the button below.</li>
                  </ol>
                </div>

                <div className="p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                  <p className="text-[10px] text-blue-400 leading-relaxed italic">
                    {permissionType === 'microphone' 
                      ? 'Note: If you are on iPhone, go to Settings > Safari > Microphone and ensure it is set to "Allow".'
                      : 'Note: If you are on iPhone, go to Settings > Privacy > Location Services and ensure Safari is allowed.'}
                  </p>
                </div>
              </div>

              <Button 
                onClick={() => {
                  setIsPermissionGuideOpen(false);
                  window.location.reload();
                }}
                className="w-full bg-white text-black hover:bg-zinc-200 font-bold"
              >
                I've Fixed It, Refresh
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
