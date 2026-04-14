import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Home, School, Briefcase, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SafeZone {
  id: string;
  name: string;
  address: string;
  type: 'home' | 'work' | 'college' | 'other';
}

export default function SafeZones() {
  const [zones, setZones] = useState<SafeZone[]>([
    { id: '1', name: 'Home', address: '123 Safety St', type: 'home' },
    { id: '2', name: 'Campus', address: 'University Ave', type: 'college' },
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'home': return <Home className="w-4 h-4" />;
      case 'college': return <School className="w-4 h-4" />;
      case 'work': return <Briefcase className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs uppercase tracking-widest text-zinc-400">Safe Zones</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="space-y-3">
          {zones.map((zone) => (
            <div key={zone.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center text-blue-500">
                  {getIcon(zone.type)}
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-100">{zone.name}</div>
                  <div className="text-[10px] text-zinc-400">{zone.address}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Zone Name" className="bg-zinc-800 border-zinc-700 text-xs h-9" />
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs h-9">
            Add Current
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
