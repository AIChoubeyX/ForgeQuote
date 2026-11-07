import { Link } from 'react-router-dom';
import { IsoTile } from '../brand/IsoTile.jsx';
import { PixelField } from '../brand/PixelField.jsx';
import { LaptopMockup } from './LaptopMockup.jsx';
import { CAPABILITIES, ROLES } from './content.js';

const TONES = ['#0B5DC3', '#1E66BE', '#054A9E', '#2A70C6', '#0A4FA6'];

const PROOFS = [
  ['Zero rate drift', 'Effective-dated rate masters lock raw material, machine hours and scrap at the revision timestamp.'],
  ['Dual sign-off', 'Plant heads inspect routing cycle times. Sales heads govern commercial discount thresholds.'],
  ['Human authority', 'AI assists document parsing and routing checks. People hold full release authority.']
];

function Workspace() {
  return (
    <section data-nav="light" className="grid lg:grid-cols-[2fr_3fr]">
      <div className="flex flex-col justify-center gap-8 px-5 py-14 sm:px-10">
        <div>
          <p className="eyebrow mb-4">Deterministic financial core</p>
          <h2 className="display-lg">Every number traces back to its source.</h2>
        </div>
        <dl className="border-t border-line">
          {PROOFS.map(([title, text]) => (
            <div key={title} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-sm font-medium">{title}</dt>
              <dd className="text-sm leading-relaxed text-ink-soft">{text}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="relative overflow-hidden bg-forge px-4 py-10 sm:px-10 lg:py-16">
        <PixelField cell={44} density={0.85} colors={TONES} />
        <div className="relative mx-auto max-w-3xl">
          <LaptopMockup />
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  const [lead, ...rest] = CAPABILITIES;
  return (
    <section id="capabilities" data-nav="light" className="scroll-mt-12 border-t border-line px-5 py-14 sm:px-10 lg:py-20">
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-10">
        <h2 className="display-lg">From technical costing to commercial sign-off.</h2>
        <p className="max-w-xl text-[15px] leading-relaxed">
          ForgeQuote replaces spreadsheets, isolated estimation silos and unvetted pricing drift with a single auditable quotation platform.
        </p>
      </div>
      <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
        <article className="flex flex-col bg-paper sm:col-span-2 lg:row-span-2">
          <div className="aspect-[5/3] min-h-0 flex-1">
            <IsoTile hue={lead.hue} cubes={lead.cubes} seed={1} />
          </div>
          <div className="p-5 lg:p-6">
            <p className="eyebrow mb-2">{lead.tag}</p>
            <h3 className="font-display text-2xl leading-tight lg:text-[1.75rem]">{lead.title}</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">{lead.description}</p>
          </div>
        </article>
        {rest.map((item, i) => (
          <article key={item.title} className="flex flex-col bg-paper">
            <div className="aspect-[5/3]">
              <IsoTile hue={item.hue} cubes={item.cubes} seed={i + 2} />
            </div>
            <div className="p-4">
              <h3 className="font-display text-lg leading-snug">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Governance() {
  return (
    <section id="governance" data-nav="light" className="scroll-mt-12 border-t border-line px-5 py-14 sm:px-10 lg:py-20">
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-10">
        <h2 className="display-lg">Defensible quotations, every time.</h2>
        <p className="max-w-xl text-[15px] leading-relaxed">
          AI extraction and deterministic algorithms check rate masters and verify operation syntax. Only authorized people can sign off and issue binding commercial quotations.
        </p>
      </div>
      <div className="mt-10 grid border-t border-dashed border-line-strong sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
        {ROLES.map((role, i) => (
          <div
            key={role.title}
            className={`border-b border-dashed border-line-strong py-5 sm:px-5 lg:border-b-0 lg:py-6 ${i % 2 === 0 ? 'sm:pl-0' : 'sm:border-l'} ${i % 4 !== 0 ? 'lg:border-l' : ''} ${i === 0 ? 'lg:pl-0' : 'lg:pl-5'}`}
          >
            <p className="font-mono text-xs">{`0${i + 1}`}</p>
            <h3 className="mt-8 font-display text-2xl">{role.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{role.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <Link to="/login" className="button button-primary">Sign in to the workspace</Link>
      </div>
    </section>
  );
}

export function ProductCapabilities() {
  return (
    <>
      <Workspace />
      <Capabilities />
      <Governance />
    </>
  );
}
