import { router } from '@inertiajs/react';
import { PaginationLink } from '@/types';

interface PaginationProps {
  links: PaginationLink[];
  currentPage: number;
  lastPage: number;
}

export default function Pagination({ links, currentPage, lastPage }: PaginationProps) {
  if (lastPage <= 1) return null;

  const navigate = (url: string | null) => {
    if (url) {
      router.get(url, {}, { preserveState: true, preserveScroll: true });
    }
  };

  return (
    <nav className="flex justify-center items-center gap-1 mt-6">
      {links.map((link, i) => {
        const isNav = i === 0 || i === links.length - 1;
        const label = link.label
          .replace('&laquo;', '«')
          .replace('&raquo;', '»')
          .replace('Previous', 'Poprzednia')
          .replace('Next', 'Następna');

        return (
          <button
            key={i}
            onClick={() => navigate(link.url)}
            disabled={!link.url}
            className={`px-3 py-1.5 text-sm rounded-md ${
              link.active
                ? 'bg-blue-600 text-white'
                : link.url
                  ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  : 'text-gray-400 cursor-not-allowed'
            } ${isNav ? 'hidden sm:inline-flex' : ''}`}
            dangerouslySetInnerHTML={{ __html: label }}
          />
        );
      })}

      {/* Mobile: simplified prev/next */}
      <div className="flex sm:hidden gap-2">
        <button
          onClick={() => navigate(links[0]?.url)}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm rounded-md bg-white border border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          « Poprzednia
        </button>
        <span className="px-3 py-2 text-sm text-gray-600">
          {currentPage} / {lastPage}
        </span>
        <button
          onClick={() => navigate(links[links.length - 1]?.url)}
          disabled={currentPage === lastPage}
          className="px-4 py-2 text-sm rounded-md bg-white border border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Następna »
        </button>
      </div>
    </nav>
  );
}
