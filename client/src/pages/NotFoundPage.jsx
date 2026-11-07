import { Link } from 'react-router-dom';
import { PixelField } from '../components/brand/PixelField.jsx';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-16 sm:px-10">
        <h1 className="display-xl text-ink">404</h1>
        <p className="my-4 text-[15px] text-ink">This page does not exist in the quotation system.</p>
        <Link className="button button-primary w-fit" to="/">Return home</Link>
      </div>
      <div className="relative hidden lg:block">
        <PixelField cell={36} density={0.42} />
      </div>
    </div>
  );
}
