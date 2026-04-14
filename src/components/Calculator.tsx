import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, Equal } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface CalculatorProps {
  onUnlock: () => void;
}

export default function Calculator({ onUnlock }: CalculatorProps) {
  const { user } = useAuth();
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isResult, setIsResult] = useState(false);
  const [secretCode, setSecretCode] = useState('1111');

  useEffect(() => {
    if (!user) return;
    const fetchCode = async () => {
      const docRef = doc(db, 'settings', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSecretCode(docSnap.data().unlockCode || '1111');
      }
    };
    fetchCode();
  }, [user]);

  const handleNumber = (num: string) => {
    if (isResult) {
      setDisplay(num);
      setIsResult(false);
    } else {
      setDisplay(prev => (prev === '0' ? num : prev + num));
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setIsResult(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setIsResult(false);
  };

  const handleEqual = () => {
    if (display === secretCode) {
      onUnlock();
      return;
    }

    try {
      // Simple eval-like logic for a basic calculator
      const fullEquation = equation + display;
      // We'll just simulate a result for the disguise
      const result = eval(fullEquation.replace('×', '*').replace('÷', '/'));
      setDisplay(String(result));
      setEquation('');
      setIsResult(true);
    } catch (e) {
      setDisplay('Error');
      setIsResult(true);
    }
  };

  const buttons = [
    { label: 'C', action: handleClear, className: 'text-orange-500' },
    { label: '±', action: () => {}, className: 'text-orange-500' },
    { label: '%', action: () => {}, className: 'text-orange-500' },
    { label: '÷', action: () => handleOperator('÷'), className: 'text-orange-500' },
    { label: '7', action: () => handleNumber('7') },
    { label: '8', action: () => handleNumber('8') },
    { label: '9', action: () => handleNumber('9') },
    { label: '×', action: () => handleOperator('×'), className: 'text-orange-500' },
    { label: '4', action: () => handleNumber('4') },
    { label: '5', action: () => handleNumber('5') },
    { label: '6', action: () => handleNumber('6') },
    { label: '-', action: () => handleOperator('-'), className: 'text-orange-500' },
    { label: '1', action: () => handleNumber('1') },
    { label: '2', action: () => handleNumber('2') },
    { label: '3', action: () => handleNumber('3') },
    { label: '+', action: () => handleOperator('+'), className: 'text-orange-500' },
    { label: '0', action: () => handleNumber('0'), className: 'col-span-2' },
    { label: '.', action: () => handleNumber('.') },
    { label: '=', action: handleEqual, className: 'bg-orange-500 text-white rounded-full' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs bg-zinc-900 rounded-[2.5rem] p-6 shadow-2xl border border-zinc-800"
      >
        <div className="h-32 flex flex-col justify-end items-end mb-6 px-4">
          <div className="text-zinc-500 text-sm mb-1 h-6">{equation}</div>
          <div className="text-white text-6xl font-light tracking-tighter overflow-hidden whitespace-nowrap">
            {display}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              className={`h-16 flex items-center justify-center text-xl font-medium rounded-full transition-all active:scale-95 ${
                btn.className || 'bg-zinc-800 text-white hover:bg-zinc-700'
              } ${btn.label === '0' ? 'col-span-2 justify-start px-7' : ''}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </motion.div>
      <div className="mt-8 text-zinc-700 text-xs uppercase tracking-widest font-medium">
        Standard Calculator
      </div>
    </div>
  );
}
