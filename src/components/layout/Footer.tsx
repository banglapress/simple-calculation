export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-6 mt-12">
      <div className="max-w-6xl mx-auto px-4 text-sm flex flex-col items-center justify-between gap-2 md:flex-row">        
          <p>Editor: Soheil Zafar <br />
        Khela Media Inc. 76 Bir Uttam Kazi Nuruzzaman Sarani, Dhaka 1215
    <br />
    Phone: +8801819525247<br /> Email: mail@khelatv.com
    <br />
</p>
<p> © {new Date().getFullYear()} All Rights Reserved. 
  <br /> Developed By: Move Up Bangladesh Inc.</p>
      </div>
    </footer>
  );
}
