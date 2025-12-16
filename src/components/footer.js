export default function Footer() {
  return (
    <footer className="bg-white border-t border-orange-100 sm:py-8 py-4">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="text-amber-900 sm:mb-4 mb-2 max-sm:text-xs">
          © Copyright - Andreas von Knobelsdorff
        </div>
        <div className="flex justify-center sm:space-x-6 space-x-3 max-sm:text-xs">
          <a href="/Impressum" className="text-amber-900 hover:text-amber-700 transition-colors">
            Impressum
          </a>
          <a href="/Datenschutz" className="text-amber-900 hover:text-amber-700 transition-colors max-sm:text-xs">
            Datenschutz
          </a>
        </div>
      </div>
    </footer>
  );
}