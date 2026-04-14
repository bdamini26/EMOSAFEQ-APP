import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FakeCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  callerName?: string;
}

export default function FakeCallOverlay({ isOpen, onClose, callerName = "Mom" }: FakeCallOverlayProps) {
  const [status, setStatus] = useState<'incoming' | 'active'>('incoming');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: number;
    if (status === 'active') {
      interval = window.setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-between py-20 px-6 font-sans"
      >
        {/* Caller Info */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
            <User className="w-12 h-12 text-zinc-400" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-light text-white">{callerName}</h2>
            <p className="text-zinc-500 mt-2">
              {status === 'incoming' ? 'Mobile' : formatTime(timer)}
            </p>
          </div>
        </div>

        {/* Status Message */}
        {status === 'incoming' && (
          <motion.div 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-zinc-400 text-sm uppercase tracking-widest"
          >
            Incoming Call...
          </motion.div>
        )}

        {/* Controls */}
        <div className="w-full flex justify-around items-center max-w-xs">
          {status === 'incoming' ? (
            <>
              <div className="flex flex-col items-center gap-2">
                <Button 
                  onClick={onClose}
                  variant="destructive" 
                  className="w-16 h-16 rounded-full p-0 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20"
                >
                  <PhoneOff className="w-8 h-8 text-white" />
                </Button>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button 
                  onClick={() => setStatus('active')}
                  className="w-16 h-16 rounded-full p-0 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20"
                >
                  <Phone className="w-8 h-8 text-white" />
                </Button>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Accept</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Button 
                onClick={onClose}
                variant="destructive" 
                className="w-20 h-20 rounded-full p-0 bg-red-600 hover:bg-red-700 shadow-xl shadow-red-900/40"
              >
                <PhoneOff className="w-10 h-10 text-white" />
              </Button>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">End Call</span>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="grid grid-cols-3 gap-8 w-full max-w-xs opacity-50">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center">
              <span className="text-xs">Mute</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center">
              <span className="text-xs">Keypad</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center">
              <span className="text-xs">Speaker</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
