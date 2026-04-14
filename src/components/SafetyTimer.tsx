import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface SafetyTimerProps {
  onExpire: (label: string) => void;
}

export default function SafetyTimer({ onExpire }: SafetyTimerProps) {
  const [minutes, setMinutes] = useState('30');
  const [label, setLabel] = useState('Walking home');
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            onExpire(label);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, label, onExpire]);

  const startTimer = () => {
    const totalSeconds = parseInt(minutes) * 60;
    if (isNaN(totalSeconds) || totalSeconds <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }
    setTimeLeft(totalSeconds);
    setIsActive(true);
    toast.success('Safety timer started', {
      description: `Alert will fire in ${minutes} minutes if not dismissed.`
    });
  };

  const dismissTimer = () => {
    setIsActive(false);
    setTimeLeft(0);
    toast.success('Safety timer dismissed');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden relative">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Dead Man's Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <AnimatePresence mode="wait">
          {!isActive ? (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Duration (min)</Label>
                  <Input 
                    type="number" 
                    value={minutes} 
                    onChange={(e) => setMinutes(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Label</Label>
                  <Input 
                    value={label} 
                    onChange={(e) => setLabel(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 h-9"
                    placeholder="e.g. Taxi ride"
                  />
                </div>
              </div>
              <Button onClick={startTimer} className="w-full bg-zinc-100 text-zinc-950 hover:bg-white font-bold uppercase tracking-tighter">
                Activate Timer
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="active"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center py-4 gap-4"
            >
              <div className="relative">
                <div className="text-4xl font-black tracking-tighter text-white tabular-nums">
                  {formatTime(timeLeft)}
                </div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-red-500 uppercase tracking-widest font-bold animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  Monitoring
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm font-medium text-zinc-300">{label}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Dismiss when safe</div>
              </div>

              <div className="flex gap-2 w-full">
                <Button 
                  onClick={dismissTimer}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-tighter"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  I'm Safe
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
      
      {/* Background Progress Bar */}
      {isActive && (
        <div className="absolute bottom-0 left-0 h-1 bg-red-600/20 w-full">
          <motion.div 
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: parseInt(minutes) * 60, ease: 'linear' }}
            className="h-full bg-red-600"
          />
        </div>
      )}
    </Card>
  );
}
