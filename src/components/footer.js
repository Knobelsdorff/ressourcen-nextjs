export default function Footer() {
  return (
    <footer className="bg-white border-t border-orange-100 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="text-amber-900 mb-4">
          © Copyright - Andreas von Knobelsdorff
        </div>
        <div className="flex justify-center space-x-6">
          <a href="/Impressum" className="text-amber-900 hover:text-amber-700 transition-colors">
            Impressum
          </a>
          <a href="/Datenschutz" className="text-amber-900 hover:text-amber-700 transition-colors">
            Datenschutz
          </a>
        </div>
      </div>
    </footer>
  );
}