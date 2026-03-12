import { Link } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { PropsWithChildren } from 'react';

export default function AppLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="sticky top-0 z-50 h-16 bg-white border-b border-gray-200">
                <div className="h-full max-w-[1440px] mx-auto px-8 flex items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-navy" />
                        <span className="text-lg font-bold text-navy tracking-tight">
                            NieruchomościKRK
                        </span>
                    </Link>
                </div>
            </nav>
            <main className="relative z-0">{children}</main>
        </div>
    );
}
