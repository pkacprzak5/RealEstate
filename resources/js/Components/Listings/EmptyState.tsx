export default function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-gray-400 text-5xl mb-4">🏠</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Brak wyników</h3>
      <p className="text-sm text-gray-500">
        Nie znaleziono ogłoszeń dla podanych kryteriów. Spróbuj zmienić filtry lub rozszerzyć wyszukiwanie.
      </p>
    </div>
  );
}
