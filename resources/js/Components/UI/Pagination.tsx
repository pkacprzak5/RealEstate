import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaginationLink } from '@/types';

interface Props {
    links: PaginationLink[];
    currentPage: number;
    lastPage: number;
}

export default function Pagination({ links, currentPage, lastPage }: Props) {
    if (lastPage <= 1) return null;

    const pageLinks = links.slice(1, -1);

    return (
        <div className="flex items-center gap-1 justify-center">
            {currentPage > 1 && links[0].url && (
                <Link href={links[0].url} className="w-9 h-9 flex items-center justify-center rounded bg-white border border-gray-300 hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                </Link>
            )}
            {pageLinks.map((link) => (
                <Link
                    key={link.label}
                    href={link.url || '#'}
                    className={`w-9 h-9 flex items-center justify-center rounded text-sm ${
                        link.active
                            ? 'bg-navy text-white font-semibold'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
            {currentPage < lastPage && links[links.length - 1].url && (
                <Link href={links[links.length - 1].url!} className="w-9 h-9 flex items-center justify-center rounded bg-white border border-gray-300 hover:bg-gray-50">
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                </Link>
            )}
        </div>
    );
}
