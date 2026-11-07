import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo.jsx';
import { PixelField } from '../brand/PixelField.jsx';
import { STAGES } from './content.js';

const linkClass = 'inline-block py-1 text-sm transition-opacity hover:opacity-70';

export function LandingFooter() {
  return (
    <footer data-nav="dark" className="grid bg-forge text-paper lg:grid-cols-[8.5%_1fr]">
      <div className="relative h-16 lg:h-auto">
        <PixelField cell={34} density={0.45} />
      </div>

      <div className="min-w-0 border-paper/40 lg:border-l">
        <div className="flex flex-col gap-8 border-b border-paper/40 px-5 py-14 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:py-20">
          <h2 className="display-xl max-w-3xl">Bring rigor to your next quote.</h2>
          <Link to="/login" className="button button-invert w-fit shrink-0">Sign in to ForgeQuote</Link>
        </div>

        <div className="grid gap-10 px-5 py-10 sm:grid-cols-2 sm:px-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Quotation engineering for precision manufacturing, from RFQ intake to commercial release.
            </p>
          </div>
          <div>
            <h3 className="mb-3 font-display text-xl">Workflow</h3>
            <ul>
              {STAGES.map((stage, i) => (
                <li key={stage.step}><a className={linkClass} href={`#stage-${i + 1}`}>{stage.title}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-display text-xl">Platform</h3>
            <ul>
              <li><a className={linkClass} href="#capabilities">Capabilities</a></li>
              <li><a className={linkClass} href="#governance">Governance</a></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-display text-xl">Workspace</h3>
            <ul>
              <li><Link className={linkClass} to="/login">Sign in</Link></li>
            </ul>
          </div>
        </div>

        <p className="px-5 pb-6 pt-10 text-xs sm:px-10 sm:text-right lg:pt-20">
          © {new Date().getFullYear()} ForgeQuote Technologies. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
