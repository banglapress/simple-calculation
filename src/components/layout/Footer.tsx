export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-6 mt-12">
      <div className="max-w-6xl mx-auto px-4 text-sm flex flex-col items-center justify-between gap-2 md:flex-row">
        <p>© {new Date().getFullYear()} 
          Editor: Soheil Zafar
        <br />
        Khela Media Inc. 
           <br />
    76 Bir Uttam Kazi Nuruzzaman Sarani, Dhaka 1215
    <br />
    Phone: +8801819525247 | Email: mail@khelatv.com
    <br />
        All Rights Reserved.</p>
        <p>Developed By: Soheil Zafar 💻</p>
      </div>
    </footer>
  );
}
