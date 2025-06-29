import React, { useRef } from 'react';
import { Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface VideoPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string;
  onError: (error: string) => void;
}

export const VideoPreviewDialog: React.FC<VideoPreviewDialogProps> = ({
  isOpen,
  onOpenChange,
  previewUrl,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video preview error:', e);
    onError('Video preview failed. The recording may be corrupted. Try a different browser or record at lower quality.');
  };

  const handleVideoLoadedMetadata = () => {
    console.log('Video metadata loaded successfully');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>Recording Preview</span>
          </DialogTitle>
        </DialogHeader>
        <div>
          <video
            ref={videoRef}
            src={previewUrl}
            controls
            preload="metadata"
            className="w-full rounded-lg bg-black"
            style={{ maxHeight: 'calc(90vh - 120px)' }}
            onError={handleVideoError}
            onLoadedMetadata={handleVideoLoadedMetadata}
          >
            Your browser does not support video playback.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 