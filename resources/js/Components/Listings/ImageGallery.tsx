import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ImageOff } from 'lucide-react';

interface Props {
    images: string[];
    title: string;
}

export default function ImageGallery({ images, title }: Props) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

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
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
                    <button
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <button
                        onClick={() => setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                        className="absolute left-4 text-white hover:text-gray-300 transition-colors"
                    >
                        <ChevronLeft className="w-10 h-10" />
                    </button>

                    <img
                        src={images[activeIndex]}
                        alt={`${title} ${activeIndex + 1}`}
                        className="max-h-[85vh] max-w-[90vw] object-contain"
                    />

                    <button
                        onClick={() => setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                        className="absolute right-4 text-white hover:text-gray-300 transition-colors"
                    >
                        <ChevronRight className="w-10 h-10" />
                    </button>

                    <div className="absolute bottom-4 text-white text-sm">
                        {activeIndex + 1} / {images.length}
                    </div>
                </div>
            )}
        </>
    );
}
