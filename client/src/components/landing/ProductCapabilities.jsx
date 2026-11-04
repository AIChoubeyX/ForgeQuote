import { 
  ArrowRight, 
  Check, 
  Database, 
  FileCheck2, 
  GitPullRequest, 
  Lock, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

const capabilities = [
  {
    icon: Database,
    title: 'Traceable costing revisions & rate snapshots',
    description: 'Every calculation locks in effective-dated material, machine, overhead, and scrap rates. Once submitted, revisions are immutable, guaranteeing complete pricing defensibility across the lifecycle.',
    tag: 'Deterministic Rate Engine'
  },
  {
    icon: GitPullRequest,
    title: 'Manufacturing route review & approval',
    description: 'Plant heads inspect operations sequences, machine assignments, and cycle time assumptions. Any required changes require mandatory written notes, establishing mutual plant accountability.',
    tag: 'Plant Operations Gate'
  },
  {
    icon: Lock,
    title: 'Role-based access & controlled decisions',
    description: 'Distinct workspaces for Estimators, Plant Heads, Sales Heads, and Administrators prevent unauthorized changes, price leakage, or bypassing governance protocols.',
    tag: 'Strict RBAC Governance'
  },
  {
    icon: Sparkles,
    title: 'AI-assisted document extraction & review suggestions',
    description: 'Automated extraction parses customer RFQ drawings and spreadsheets into structured draft records, proposing rates and identifying routing syntax anomalies for human review.',
    tag: 'Human-in-the-Loop AI'
  },
  {
    icon: FileCheck2,
    title: 'Auditable decisions & quotation generation',
    description: 'Generate standardized, customer-ready quotation PDFs directly from approved cost models. Complete audit logs track every status transition, review decision, and rate version.',
    tag: 'AS9100 / ISO Traceable'
  }
];

export function ProductCapabilities() {
  return (
    <section id="capabilities" className="relative scroll-mt-20 border-t border-[#292D34] bg-[#080808] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        
        {/* Header */}
        <div className="max-w-3xl">
          <p className="eyebrow mb-3">Enterprise Quotation Capabilities</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F5F5]">
            Connecting technical costing to commercial sign-off.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#A3A3A3]">
            ForgeQuote eliminates spreadsheets, isolated estimation silos, and unvetted pricing drift with a single auditable manufacturing quotation platform.
          </p>
        </div>

        {/* 5-Item Responsive Grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <article 
                key={item.title}
                className="flex flex-col justify-between rounded-xl border border-[#292D34] bg-[#181818] p-6 transition-colors duration-150 hover:border-forge"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#111111] border border-[#292D34] text-white">
                      <Icon size={20} className="text-forge" />
                    </div>
                    <span className="rounded bg-[#111111] border border-[#292D34] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-[#F5F5F5]">
                    {item.title}
                  </h3>

                  <p className="mt-2.5 text-sm leading-relaxed text-[#A3A3A3]">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2 border-t border-[#292D34] pt-4 text-xs font-bold uppercase tracking-wider text-[#737373]">
                  <Check size={14} className="text-emerald-400" />
                  <span>Enforced in Workspace</span>
                </div>
              </article>
            );
          })}

          {/* 6th Card: Enterprise Governance Card */}
          <article id="governance" className="flex flex-col justify-between rounded-xl border border-[#66301C] bg-[#181818] p-6 text-white">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-forge text-white">
                  <ShieldCheck size={22} />
                </div>
                <span className="rounded bg-forge/15 border border-[#66301C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-forge">
                  Audit Ready
                </span>
              </div>

              <h3 className="font-display text-lg font-bold text-[#F5F5F5]">
                Defensible quotations, every time
              </h3>

              <p className="mt-2.5 text-sm leading-relaxed text-[#A3A3A3]">
                Protect margins against inflation and rogue discounting. Every dollar in your quotes is mathematically verified against active rate masters and authorized by plant leadership.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#292D34] flex items-center justify-between">
              <span className="text-xs text-[#737373]">Deterministic Engine</span>
              <span className="text-xs font-mono font-bold text-forge">100% Traceable</span>
            </div>
          </article>
        </div>

        {/* Final CTA Banner (Black & Industrial Orange) */}
        <div className="mt-16 rounded-2xl bg-[#181818] border border-[#66301C] p-8 sm:p-12 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <span className="eyebrow text-forge mb-2 block">Ready for production quotes</span>
              <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F5F5F5]">
                Bring rigor, speed, and governance to your next manufacturing quote.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-[#A3A3A3]">
                Experience deterministic costing, role-based reviews, and traceable quotation generation built specifically for precision manufacturing teams.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <Link
                to="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-forge px-6 py-3 text-base font-bold text-white transition-colors duration-150 hover:bg-[#E94B13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]"
              >
                <span>Sign In to ForgeQuote</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
