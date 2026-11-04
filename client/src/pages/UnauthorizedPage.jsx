import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#080808] text-center px-5">
      <div className="rounded-xl border border-[#292D34] bg-[#181818] p-8 max-w-md shadow-2xl">
        <h1 className="font-display text-3xl font-bold text-[#F5F5F5]">Access restricted</h1>
        <p className="my-3 text-sm text-[#A3A3A3]">Your current role does not have permission to view this resource.</p>
        <Link className="button button-primary mt-3 inline-flex" to="/app">
          Return to workspace
        </Link>
      </div>
    </div>
  );
}
