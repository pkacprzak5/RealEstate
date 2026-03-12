import { useEffect, useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ImageOff } from 'lucide-react';

interface Props {
    images: string[];
    title: string;
}

export default function ImageGallery({ images, title }: Props) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const goNext = useCallback(() => {
        setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }, [images.length]);

    const goPrev = useCallback(() => {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    }, [images.length]);

    const closeLightbox = useCallback(() => setLightboxOpen(false), []);

    // Keyboard navigation
    useEffect(() => {
        if (!lightboxOpen) return;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'ArrowLeft') goPrev();
        };

        document.addEventListener('keydown', handleKey);
        // Prevent body scroll while lightbox is open
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [lightboxOpen, goNext, goPrev, closeLightbox]);

    if (images.length === 0) {
        return (
            <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
                <ImageOff className="w-16 h-16 text-gray-300" />
            </div>
        );
    }

    const openLightbox = (index: number) => {
        setActiveIndex(index);
        setLightboxOpen(true);
    };

    const displayImages = images.slice(0, 4);
    const extraCount = images.length - 4;

    return (
        <>
            <div className="grid grid-cols-3 gap-2" style={{ height: '400px' }}>
                {/* Main image */}
                <div
                    className="col-span-2 relative rounded-lg overflow-hidden cursor-pointer bg-gray-100"
                    onClick={() => openLightbox(0)}
                >
                    <img
                        src={images[0]}
                        alt={title}
                        className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                </div>

                {/* Side thumbnails */}
                <div className="flex flex-col gap-2 min-h-0">
                    {displayImages.slice(1).map((img, i) => (
                        <div
                            key={i}
                            className="relative flex-1 min-h-0 rounded-lg overflow-hidden cursor-pointer bg-gray-100"
                            onClick={() => openLightbox(i + 1)}
                        >
                            <img
                                src={img}
                                alt={`${title} ${i + 2}`}
                                className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                            {i === displayImages.length - 2 && extraCount > 0 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white text-lg font-semibold">
                                        +{extraCount} zdjęć
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={(e) => {
                        // Close when clicking the backdrop (not the image or buttons)
                        if (e.target === e.currentTarget) closeLightbox();
                    }}
                >
                    {/* Close button — top-left, well clear of navbar */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-20 left-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/90 text-gray-900 hover:bg-white shadow-lg transition-colors"
                        aria-label="Zamknij"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Previous */}
                    <button
                        onClick={goPrev}
                        className="absolute left-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                        aria-label="Poprzednie zdjęcie"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>

                    <img
                        src={images[activeIndex]}
                        alt={`${title} ${activeIndex + 1}`}
                        className="max-h-[85vh] max-w-[90vw] object-contain"
                    />

                    {/* Next */}
                    <button
                        onClick={goNext}
                        className="absolute right-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                        aria-label="Następne zdjęcie"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>

                    {/* Counter + keyboard hint */}
                    <div className="absolute bottom-4 flex flex-col items-center gap-1">
                        <span className="text-white text-sm font-medium">
                            {activeIndex + 1} / {images.length}
                        </span>
                        <span className="text-white/50 text-xs">
                            ← → nawigacja &middot; Esc zamknij
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}
