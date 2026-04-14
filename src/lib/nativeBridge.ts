import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Geolocation } from '@capacitor/geolocation';
import { toast } from 'sonner';

export const isNative = Capacitor.isNativePlatform();

export const NativeBridge = {
  // Initialize Native Plugins
  async init() {
    if (!isNative) return;
    
    try {
      await BleClient.initialize();
      console.log('Native BLE Initialized');
    } catch (e) {
      console.error('Native Init Error:', e);
    }
  },

  // Real Bluetooth Scanning (Native Only)
  async startBuddyScan(onDeviceFound: (id: string) => void) {
    if (!isNative) {
      console.log('Bluetooth hardware access requires native app build.');
      return;
    }

    try {
      await BleClient.requestLEScan({}, (result) => {
        if (result.device.name?.includes('EMOSAFEQ')) {
          onDeviceFound(result.device.deviceId);
        }
      });
      
      setTimeout(async () => {
        await BleClient.stopLEScan();
      }, 10000);
    } catch (e) {
      toast.error('Bluetooth Scan Failed', { description: 'Ensure Bluetooth and Location are enabled.' });
    }
  },

  // High-Accuracy Location (Native Geolocation Plugin)
  async getCurrentLocation() {
    if (isNative) {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      return { lat: coordinates.coords.latitude, lng: coordinates.coords.longitude };
    } else {
      return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true }
        );
      });
    }
  }
};
