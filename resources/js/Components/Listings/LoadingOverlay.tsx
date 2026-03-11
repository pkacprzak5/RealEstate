export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg px-6 py-4 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-600">Ładowanie...</span>
      </div>
    </div>
  );
}
