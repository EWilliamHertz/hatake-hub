import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PostGalleryProps {
  mediaUrls: string[];
  mediaTypes: string[];
}

export const PostGallery = ({ mediaUrls, mediaTypes }: PostGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Filter to only show images in the gallery
  const images = mediaUrls
    .map((url, index) => ({
      url,
      type: mediaTypes[index] || '',
      originalIndex: index
    }))
    .filter(item => item.type?.startsWith('image/'));

  // Get videos separately
  const videos = mediaUrls
    .map((url, index) => ({
      url,
      type: mediaTypes[index] || ''
    }))
    .filter(item => item.type?.startsWith('video/'));

  if (images.length === 0 && videos.length === 0) return null;

  // Single media item
  if (images.length === 1 && videos.length === 0) {
    return (
      <div className="my-4 rounded-lg overflow-hidden bg-muted">
        <img
          src={images[0].url}
          alt="Post media"
          className="w-full h-auto max-h-[500px] object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // Single video
  if (images.length === 0 && videos.length === 1) {
    return (
      <div className="my-4 rounded-lg overflow-hidden bg-muted">
        <video
          controls
          className="w-full h-auto max-h-[500px] object-contain"
          preload="metadata"
        >
          <source src={videos[0].url} type={videos[0].type} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // Gallery with multiple images
  return (
    <div className="my-4">
      {/* Main image display */}
      <div className="relative rounded-lg overflow-hidden bg-muted mb-2">
        <img
          src={images[activeIndex].url}
          alt={`Gallery image ${activeIndex + 1}`}
          className="w-full h-auto max-h-[500px] object-contain"
          loading="lazy"
        />
        
        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90"
              onClick={() => setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90"
              onClick={() => setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Image counter */}
            <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs">
              {activeIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-all ${
                index === activeIndex
                  ? 'border-primary scale-105'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <img
                src={image.url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Videos below gallery if present */}
      {videos.length > 0 && (
        <div className="mt-4 space-y-2">
          {videos.map((video, index) => (
            <div key={index} className="rounded-lg overflow-hidden bg-muted">
              <video
                controls
                className="w-full h-auto max-h-[500px] object-contain"
                preload="metadata"
              >
                <source src={video.url} type={video.type} />
                Your browser does not support the video tag.
              </video>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
