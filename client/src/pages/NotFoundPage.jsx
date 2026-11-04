import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#080808] text-center px-5">
      <div>
        <h1 className="font-display text-6xl font-black text-[#F5F5F5]">
          4<span className="text-forge">0</span>4
        </h1>
        <p className="my-3 text-[#A3A3A3]">This page does not exist in the quotation system.</p>
        <Link className="inline-flex items-center gap-1 font-semibold text-forge hover:text-[#E94B13] transition-colors" to="/">
          Return home →
        </Link>
      </div>
    </div>
  );
}
