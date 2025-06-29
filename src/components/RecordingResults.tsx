import React from 'react';
import { Download, Eye, MonitorX, Video, Clock, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface RecordingResultsProps {
  recordingTime: number;
  mimeType: string;
  hasSystemAudio: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onClear: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const RecordingResults: React.FC<RecordingResultsProps> = ({
  recordingTime,
  mimeType,
  hasSystemAudio,
  onPreview,
  onDownload,
  onClear
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Recording Complete</CardTitle>
              <p className="text-sm text-muted-foreground">Your recording is ready</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(recordingTime)}</span>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="outline" className="text-xs">
              {mimeType.includes('mp4') ? 'MP4' : 'WebM'}
            </Badge>
            {hasSystemAudio && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="outline" className="text-xs">
                  <Waves className="w-3 h-3 mr-1" />
                  Audio
                </Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <Button
            onClick={onPreview}
            variant="outline"
            className="flex items-center justify-center cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
          
          <Button
            onClick={onDownload}
            className="flex items-center justify-center cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          
          <Button
            onClick={onClear}
            variant="outline"
            className="flex items-center justify-center cursor-pointer"
          >
            <MonitorX className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 