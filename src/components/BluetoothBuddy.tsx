import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link2, Unlink, Wifi, WifiOff, ShieldCheck, Bluetooth } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { NativeBridge, isNative } from '@/lib/nativeBridge';

interface BluetoothBuddyProps {
  onBuddyLost: () => void;
}

export default function BluetoothBuddy({ onBuddyLost }: BluetoothBuddyProps) {
  const { user } = useAuth();
  const [linkId, setLinkId] = useState('');
  const [activeLink, setActiveLink] = useState<string | null>(null);
  const [buddyStatus, setBuddyStatus] = useState<'offline' | 'online'>('offline');
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const startHardwareScan = async () => {
    if (!isNative) {
      toast.info('Hardware Bluetooth requires the Native App build.', {
        description: 'Using Virtual Buddy Link for now.'
      });
      return;
    }

    setIsScanning(true);
    await NativeBridge.startBuddyScan((deviceId) => {
      toast.success('Hardware Buddy Found!', { description: `Connected to ${deviceId}` });
      setBuddyStatus('online');
      setIsScanning(false);
    });
  };

  useEffect(() => {
    if (!activeLink || !user) return;

    // Update my status
    const updateInterval = setInterval(async () => {
      try {
        await setDoc(doc(db, 'buddy_links', activeLink), {
          [user.uid]: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.error('Buddy update failed', e);
      }
    }, 15000); // Every 15s

    // Listen to buddy status
    const unsubscribe = onSnapshot(doc(db, 'buddy_links', activeLink), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const buddyId = Object.keys(data).find(id => id !== user.uid);
        
        if (buddyId) {
          const buddyTimestamp = data[buddyId]?.toMillis() || 0;
          const now = Date.now();
          
          if (now - buddyTimestamp < 45000) { // 45s threshold
            setBuddyStatus('online');
            setLastSeen(buddyTimestamp);
          } else {
            if (buddyStatus === 'online') {
              setBuddyStatus('offline');
              toast.error('Buddy Link Lost!', {
                description: 'Your buddy has gone offline or lost connection.'
              });
              onBuddyLost();
            }
          }
        }
      }
    });

    return () => {
      clearInterval(updateInterval);
      unsubscribe();
    };
  }, [activeLink, user, buddyStatus, onBuddyLost]);

  const createLink = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setLinkId(id);
    setActiveLink(id);
    toast.success('Buddy Link Created', {
      description: `Share code ${id} with your friend.`
    });
  };

  const joinLink = async () => {
    if (!linkId) return;
    setActiveLink(linkId);
    toast.success('Joining Buddy Link...');
  };

  const disconnect = () => {
    setActiveLink(null);
    setBuddyStatus('offline');
    toast.info('Buddy Link Disconnected');
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Wifi className="w-3 h-3" />
          Bluetooth Buddy (Virtual Link)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {!activeLink ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Enter Code" 
                value={linkId}
                onChange={(e) => setLinkId(e.target.value)}
                className="bg-zinc-800 border-zinc-700 h-9 uppercase"
              />
              <Button onClick={joinLink} size="sm" className="bg-zinc-100 text-zinc-950 hover:bg-white">
                Join
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-zinc-900 px-2 text-zinc-500">Or</span></div>
            </div>
            <Button onClick={createLink} variant="outline" className="w-full border-zinc-800 text-zinc-400 hover:text-white">
              <Link2 className="w-4 h-4 mr-2" />
              Generate New Link
            </Button>
            <Button 
              onClick={startHardwareScan} 
              variant="secondary" 
              className="w-full bg-blue-600/10 text-blue-500 border-blue-600/30 hover:bg-blue-600/20"
              disabled={isScanning}
            >
              <Bluetooth className={`w-4 h-4 mr-2 ${isScanning ? 'animate-pulse' : ''}`} />
              {isScanning ? 'Scanning Hardware...' : 'Scan Hardware (Native Only)'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${buddyStatus === 'online' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {buddyStatus === 'online' ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    Buddy Status
                    <Badge variant="outline" className={buddyStatus === 'online' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}>
                      {buddyStatus.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                    {buddyStatus === 'online' ? 'Connection Secure' : 'Waiting for buddy...'}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={disconnect} className="text-zinc-500 hover:text-red-500">
                <Unlink className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3 text-green-500" />
                Active Link: <span className="text-white font-bold">{activeLink}</span>
              </div>
              <div className="text-[10px] text-zinc-500">
                {lastSeen ? `Last seen: ${new Date(lastSeen).toLocaleTimeString()}` : 'No data yet'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
