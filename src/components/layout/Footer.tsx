import Link from "next/link";

// Footer - Redesigned
export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-black text-white pt-12 pb-6 font-[NotoSerifBengali]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="bg-red-700 w-32 h-32 rounded-full flex items-center justify-center mr-2">
                <span className="text-white font-bold text-5xl text-center">খেলা টিভি</span>
              </div>
              {/* <h2 className=" text-3xl font-bold text-white">
                খেলা <span className="text-red-600">টিভি</span>
              </h2> */}
            </div>
            <p className="text-gray-300 mb-4">
              বাংলাদেশের প্রথম সারির ক্রীড়া সংবাদ ও বিশ্লেষণ প্লাটফর্ম
            </p>
            <div className="flex space-x-4">
            <Link href="/football" className="text-gray-300 hover:text-white transition-colors">ফুটবল</Link>
           <Link href="/cricket" className="text-gray-300 hover:text-white transition-colors">ক্রিকেট</Link>
             
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-red-600">ক্যাটেগরি</h3>
            <ul className="space-y-2">
             <li> <Link href="/football" className="text-gray-300 hover:text-white transition-colors">ফুটবল</Link></li>
              <li><Link href="/cricket" className="text-gray-300 hover:text-white transition-colors">ক্রিকেট</Link></li>
              <li><Link href="/hockey" className="text-gray-300 hover:text-white transition-colors">হকি</Link></li>
              <li><Link href="/athletics" className="text-gray-300 hover:text-white transition-colors">অ্যাথলেটিক্স</Link></li>
              <li><Link href="/othersports" className="text-gray-300 hover:text-white transition-colors">অন্যান্য খেলা</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-red-600">যোগাযোগ</h3>
            <address className="not-italic text-gray-300">
              <p className="mb-2">সম্পাদক: সোহেইল জাফর</p>
              <p className="mb-2">৭৬ বীর উত্তম কাজী নুরুজ্জামান সরণি, ঢাকা ১২১৫</p>
              <p className="mb-2">ফোন: +৮৮০১৮১৯৫২৫২৪৭</p>
              <p>ইমেইল: mail@khelatv.com</p>
            </address>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} খেলা মিডিয়া লিমিটেড | সর্বস্বত্ব সংরক্ষিত</p>
          <p className="mt-1">Published By: Khela Media PLC | Developed By: Move Up Bangladesh PLC</p>
        </div>
      </div>
    </footer>
  );
}