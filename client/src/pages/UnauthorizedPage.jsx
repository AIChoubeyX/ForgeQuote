import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-5 text-center">
      <div className="max-w-md border border-line bg-surface p-8">
        <h1 className="page-title">Access restricted</h1>
        <p className="my-3 text-sm text-ink-soft">Your current role does not have permission to view this resource.</p>
        <Link className="button button-primary mt-3 inline-flex" to="/app">
          Return to workspace
        </Link>
      </div>
    </div>
  );
}
