import { Link, Head } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function AppLayout({ children, title }: PropsWithChildren<{ title?: string }>) {
  return (
    <>
      <Head title={title ? `${title} | Nieruchomości Kraków` : 'Nieruchomości Kraków'} />

      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Nieruchomości Kraków
              </Link>
              <div className="text-sm text-gray-500 hidden sm:block">
                Mieszkania i domy na sprzedaż i wynajem
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </>
  );
}
