import { useState, useCallback } from 'react';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = useCallback(() => {
    setCurrent(c => (c > 0 ? c - 1 : images.length - 1));
  }, [images.length]);

  const next = useCallback(() => {
    setCurrent(c => (c < images.length - 1 ? c + 1 : 0));
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="aspect-[16/9] bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
        Brak zdjęć
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div
          className="aspect-[16/9] bg-gray-200 rounded-lg overflow-hidden cursor-pointer"
          onClick={() => setLightbox(true)}
        >
          <img
            src={images[current]}
            alt={`${title} - ${current + 1}`}
            className="w-full h-full object-cover"
          />
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
            >
              ›
            </button>
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {current + 1} / {images.length}
            </div>
          </>
        )}

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 ${
                  i === current ? 'border-blue-600' : 'border-transparent'
                }`}
              >
                <img src={img} alt={`Miniatura ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
          >
            ×
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 text-white text-4xl hover:text-gray-300"
          >
            ‹
          </button>
          <img
            src={images[current]}
            alt={`${title} - ${current + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 text-white text-4xl hover:text-gray-300"
          >
            ›
          </button>
          <div className="absolute bottom-4 text-white text-sm">
            {current + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
