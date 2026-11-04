import { 
  FileText, 
  Calculator, 
  Factory, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight,
  UserCheck
} from 'lucide-react';

const workflowStages = [
  {
    step: '01',
    title: 'RFQ INTAKE',
    role: 'Estimator & AI Parsing',
    description: 'Customer requirements enter the system through an RFQ document or manually registered request. AI-assisted extraction proposes relevant fields for human verification.',
    icon: FileText
  },
  {
    step: '02',
    title: 'COST ESTIMATION',
    role: 'Estimator & Rate Masters',
    description: 'The estimator reviews the RFQ, manufacturing operations, material requirements, and effective-dated rate masters. The costing engine calculates the cost breakdown and selling price using deterministic financial calculations.',
    icon: Calculator
  },
  {
    step: '03',
    title: 'PLANT REVIEW',
    role: 'Plant Head Governance',
    description: 'The plant head reviews the proposed manufacturing route and operation details. The plant head can approve the route or return it for revision with a mandatory explanation.',
    icon: Factory
  },
  {
    step: '04',
    title: 'SALES APPROVAL',
    role: 'Sales Head Commercial Sign-off',
    description: 'The sales head reviews the plant-approved costing, evaluates the commercial proposal, and makes the final commercial decision. An approved quotation can be generated as a PDF.',
    icon: CheckCircle2
  }
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="relative scroll-mt-20 border-t border-[#292D34] bg-[#111111] py-16 sm:py-20 lg:py-28 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-12 lg:mb-16 text-center max-w-3xl mx-auto">
          <p className="eyebrow mb-3">Structured Manufacturing Governance</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F5F5]">
            The Quotation Engineering Workflow
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#A3A3A3]">
            A continuous, auditable progression where automated intelligence assists, deterministic calculations guarantee accuracy, and human department heads hold final authority.
          </p>
        </div>

        {/* WORKFLOW INFOGRAPHIC */}
        <div className="grid gap-10 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] lg:items-center">
          
          {/* LEFT: LARGE CENTRAL CONCENTRIC CIRCLE (Black & Industrial Orange) */}
          <div className="relative flex flex-col items-center justify-center">
            
            {/* Multi-Ring Concentric Circle Container */}
            <div className="relative flex h-60 w-60 sm:h-76 sm:w-76 md:h-88 md:w-88 lg:h-96 lg:w-96 items-center justify-center rounded-full bg-[#181818] p-4 sm:p-5 ring-4 sm:ring-8 ring-[#292D34]">
              
              {/* Outer Accent Orbit Ring Arc in Vivid Orange */}
              <div 
                className="absolute inset-1 rounded-full border-2 sm:border-4 border-[#292D34] border-t-forge border-r-forge animate-none" 
                aria-hidden="true"
              />

              {/* Secondary Concentric Ring */}
              <div 
                className="absolute inset-3 sm:inset-5 rounded-full border border-[#292D34] bg-gradient-to-br from-[#111111] to-[#080808]"
                aria-hidden="true" 
              />

              {/* Inner Circle Content */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6">
                <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-forge mb-1">
                  FORGEQUOTE
                </span>
                
                <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-[#F5F5F5] leading-tight">
                  RFQ TO<br />QUOTATION
                </h3>

                <div className="my-2 sm:my-3 h-0.5 w-10 sm:w-12 bg-forge rounded-full" />

                <p className="text-[11px] sm:text-xs md:text-sm font-medium text-[#A3A3A3] italic max-w-[180px] sm:max-w-[210px]">
                  &ldquo;One connected manufacturing workflow&rdquo;
                </p>

                <div className="mt-2.5 sm:mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#181818] border border-[#292D34] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-semibold text-[#A3A3A3]">
                  <ShieldCheck size={12} className="text-forge shrink-0" />
                  <span>Deterministic Engine</span>
                </div>
              </div>
            </div>

            {/* Orbit Connector Label */}
            <div className="mt-5 text-center text-xs font-semibold uppercase tracking-wider text-[#737373]">
              End-to-End Governance Model
            </div>
          </div>

          {/* RIGHT: FOUR DISTINCT WORKFLOW STAGES (Charcoal & Orange Capsules) */}
          <div className="relative space-y-4 sm:space-y-5 lg:space-y-6">
            
            {/* Desktop Curved Connector SVG in Vivid Orange */}
            <div className="pointer-events-none absolute -left-10 top-0 bottom-0 hidden lg:block w-10" aria-hidden="true">
              <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 40 480" fill="none">
                <path d="M 0 240 C 20 240, 20 60, 40 60" stroke="#FF5A1F" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="40" cy="60" r="4" fill="#FF5A1F" />
                
                <path d="M 0 240 C 20 240, 25 180, 40 180" stroke="#FF5A1F" strokeWidth="2" />
                <circle cx="40" cy="180" r="4" fill="#FF5A1F" />

                <path d="M 0 240 C 20 240, 25 300, 40 300" stroke="#FF5A1F" strokeWidth="2" />
                <circle cx="40" cy="300" r="4" fill="#FF5A1F" />

                <path d="M 0 240 C 20 240, 20 420, 40 420" stroke="#22C55E" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="40" cy="420" r="4" fill="#22C55E" />
              </svg>
            </div>

            {/* The 4 Capsules */}
            {workflowStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <article
                  key={stage.step}
                  className="group relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-2xl sm:rounded-full bg-[#181818] text-[#F5F5F5] transition-colors duration-150 hover:border-forge border border-[#292D34] p-2 sm:p-2.5"
                >
                  {/* Left Circular Icon Badge in Vivid Orange */}
                  <div className="flex items-center gap-3 p-1.5 sm:p-0">
                    <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 shrink-0 items-center justify-center rounded-full bg-forge text-white ring-2 sm:ring-4 ring-[#080808]">
                      <Icon size={22} className="text-white drop-shadow-sm sm:w-6 sm:h-6" />
                      {/* Step Number Dot Overlay */}
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#080808] border border-[#66301C] font-mono text-[10px] sm:text-[11px] font-black text-forge">
                        {stage.step}
                      </span>
                    </div>

                    {/* Mobile Title View */}
                    <div className="sm:hidden min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-forge block truncate">
                        {stage.role}
                      </span>
                      <h3 className="font-display text-sm font-bold text-[#F5F5F5] truncate">
                        {stage.step} — {stage.title}
                      </h3>
                    </div>
                  </div>

                  {/* Capsule Body Content */}
                  <div className="flex-1 px-2 sm:px-5 py-1.5 sm:py-2 min-w-0">
                    <div className="hidden sm:flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-display text-base lg:text-lg font-bold tracking-tight text-[#F5F5F5]">
                        {stage.step} — {stage.title}
                      </h3>
                      <span className="rounded-full bg-[#111111] border border-[#292D34] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3] shrink-0">
                        {stage.role}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
                      {stage.description}
                    </p>
                  </div>

                  {/* Flow Direction Indicator */}
                  <div className="hidden sm:flex items-center pr-4 text-[#737373] group-hover:text-forge transition-colors shrink-0" aria-hidden="true">
                    <ChevronRight size={18} />
                  </div>
                </article>
              );
            })}

          </div>
        </div>

        {/* Human Authority Assurance Banner */}
        <div className="mt-12 rounded-2xl border border-[#292D34] bg-[#181818] p-4 sm:p-6 text-center text-sm text-[#F5F5F5] max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forge text-white">
              <UserCheck size={18} />
            </div>
            <p className="text-left font-medium text-[#A3A3A3] text-xs sm:text-sm">
              <strong className="text-[#F5F5F5]">Human Authority Remains Decisive:</strong>{' '}
              AI extraction and deterministic algorithms assist by checking rate masters and verifying operation syntax, but only authorized human estimators, plant heads, and sales leaders can sign off and issue binding commercial quotations.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
