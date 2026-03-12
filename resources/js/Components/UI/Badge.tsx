import React from 'react';

const variants = {
    property: 'bg-navy-50 text-navy',
    market: 'bg-emerald-50 text-emerald-700',
    neutral: 'bg-gray-100 text-gray-700',
} as const;

interface BadgeProps {
    children: React.ReactNode;
    variant?: keyof typeof variants;
}

export default function Badge({ children, variant = 'neutral' }: BadgeProps) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
            {children}
        </span>
    );
}
