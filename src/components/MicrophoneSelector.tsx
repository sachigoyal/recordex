import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MicrophoneSelectorProps {
  onMicrophoneSelect: (deviceId: string | null) => void;
  selectedMicId: string | null;
  disabled?: boolean;
}

const MICROPHONE_STORAGE_KEY = 'recordex-selected-microphone';

export const MicrophoneSelector: React.FC<MicrophoneSelectorProps> = ({
  onMicrophoneSelect,
  selectedMicId,
  disabled = false
}) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [defaultDevice, setDefaultDevice] = useState<MediaDeviceInfo | null>(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = deviceList.filter(device => 
          device.kind === 'audioinput' && 
          device.deviceId !== 'default' && 
          device.deviceId !== 'communications'
        );
        setDevices(audioInputs);
        const defaultDeviceInfo = deviceList.find(device => 
          device.kind === 'audioinput' && device.deviceId === 'default'
        );
        setDefaultDevice(defaultDeviceInfo || null);

        if (!selectedMicId) {
          const savedMicId = localStorage.getItem(MICROPHONE_STORAGE_KEY);
          if (savedMicId) {
            const deviceExists = savedMicId === 'default' || 
              audioInputs.some(device => device.deviceId === savedMicId);
            
            if (deviceExists) {
              onMicrophoneSelect(savedMicId === 'default' ? null : savedMicId);
            }
          }
        }
      } catch (error) {
        console.error('Error getting audio devices:', error);
      }
    };

    getDevices();

    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, [selectedMicId, onMicrophoneSelect]);

  const handleMicrophoneChange = (value: string) => {
    const deviceId = value === "default" ? null : value;
    
    localStorage.setItem(MICROPHONE_STORAGE_KEY, value);
    
    onMicrophoneSelect(deviceId);
  };

  return (
    <Select
      value={selectedMicId || "default"}
      onValueChange={handleMicrophoneChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full cursor-pointer">
        <div className="flex items-center space-x-2">
          <SelectValue placeholder="Select microphone" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">
          <div className="flex items-center space-x-2 cursor-pointer">
            <Mic className="w-4 h-4" />
            <span>
              {defaultDevice?.label 
                ? defaultDevice.label 
                : 'Default Microphone'
              }
            </span>
          </div>
        </SelectItem>
        {devices.map((device) => (
          <SelectItem key={device.deviceId} value={device.deviceId}>
            <div className="flex items-center space-x-2 cursor-pointer">
              <Mic className="w-4 h-4" />
              <span>{device.label || `Microphone ${device.deviceId.slice(-4)}`}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}; 