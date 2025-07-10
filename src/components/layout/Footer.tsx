export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-6 mt-12">
      <div className="max-w-6xl mx-auto px-4 text-sm flex flex-col items-center justify-between gap-2 md:flex-row">
        <p>© {new Date().getFullYear()} খেলাধুলা সংবাদ. সর্বস্বত্ব সংরক্ষিত।</p>
        <p>ডেভেলপ করেছেন: আপনি 💻</p>
      </div>
    </footer>
  );
}
