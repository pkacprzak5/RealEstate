export default function LoadingOverlay() {
    return (
        <div className="absolute inset-0 z-30 bg-white/60 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
    );
}
