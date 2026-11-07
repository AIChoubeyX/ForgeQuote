import { Calculator, CheckCircle2, Database, Factory, FileCheck2, FileText, GitPullRequest, Lock, Sparkles } from 'lucide-react';

export const STAGES = [
  {
    step: '01',
    title: 'RFQ intake',
    role: 'Estimator and AI parsing',
    summary: 'Requirements in, verified fields out.',
    description: 'Customer requirements enter through an RFQ document or a manually registered request. AI-assisted extraction proposes the relevant fields for human verification.',
    icon: FileText
  },
  {
    step: '02',
    title: 'Cost estimation',
    role: 'Estimator and rate masters',
    summary: 'Deterministic cost and selling price.',
    description: 'The costing engine calculates the cost breakdown and selling price from operations, material requirements and effective-dated rate masters, using deterministic calculations.',
    icon: Calculator
  },
  {
    step: '03',
    title: 'Plant review',
    role: 'Plant head',
    summary: 'Routes approved or returned with notes.',
    description: 'The plant head reviews the proposed manufacturing route and operation details, then approves it or returns it for revision with a mandatory explanation.',
    icon: Factory
  },
  {
    step: '04',
    title: 'Sales approval',
    role: 'Sales head',
    summary: 'Final decision, quotation PDF.',
    description: 'The sales head evaluates the plant-approved costing and makes the final commercial decision. An approved quotation can be generated as a PDF.',
    icon: CheckCircle2
  }
];

export const CAPABILITIES = [
  {
    title: 'Traceable costing revisions and rate snapshots',
    description: 'Every calculation locks in effective-dated material, machine, overhead and scrap rates. Once submitted, revisions are immutable, so pricing stays defensible across the lifecycle.',
    tag: 'Deterministic rate engine',
    icon: Database,
    hue: '#D9825B',
    cubes: [
      { x: 112, y: 92, s: 32, icon: Database },
      { x: 205, y: 125, s: 48, icon: Calculator },
      { x: 298, y: 82, s: 28, icon: FileText }
    ]
  },
  {
    title: 'Manufacturing route review and approval',
    description: 'Plant heads inspect operation sequences, machine assignments and cycle time assumptions. Any required change needs a written note.',
    tag: 'Plant operations gate',
    icon: GitPullRequest,
    hue: '#6366C9',
    cubes: [
      { x: 120, y: 120, s: 46, icon: Factory },
      { x: 285, y: 95, s: 46, icon: GitPullRequest }
    ]
  },
  {
    title: 'Role-based access and controlled decisions',
    description: 'Distinct workspaces for estimators, plant heads, sales heads and administrators prevent unauthorized changes and price leakage.',
    tag: 'Role-based governance',
    icon: Lock,
    hue: '#7E8799',
    cubes: [{ x: 200, y: 105, s: 66, icon: Lock }]
  },
  {
    title: 'AI-assisted extraction and review suggestions',
    description: 'Extraction parses customer RFQ drawings and spreadsheets into structured drafts, and flags routing anomalies for human review.',
    tag: 'Human in the loop',
    icon: Sparkles,
    hue: '#4F9B78',
    cubes: [
      { x: 90, y: 85, s: 30, icon: FileText },
      { x: 200, y: 125, s: 50, icon: Sparkles },
      { x: 315, y: 75, s: 34, icon: FileCheck2 }
    ]
  },
  {
    title: 'Auditable decisions and quotation generation',
    description: 'Generate customer-ready quotation PDFs from approved cost models. Audit logs track every status transition, review decision and rate version.',
    tag: 'Traceable by default',
    icon: FileCheck2,
    hue: '#2F7BD1',
    cubes: [
      { x: 135, y: 105, s: 40, icon: CheckCircle2 },
      { x: 265, y: 110, s: 54, icon: FileCheck2 }
    ]
  }
];

export const ROLES = [
  { title: 'Estimator', text: 'Registers RFQs, verifies AI-proposed fields and prepares costing against effective-dated rate masters.' },
  { title: 'Plant head', text: 'Inspects operation sequences, machines and cycle times. Approves routes or returns them with mandatory notes.' },
  { title: 'Sales head', text: 'Reviews plant-approved costing, governs discount decisions and gives the final commercial sign-off.' },
  { title: 'Administrator', text: 'Manages users and rate master schedules, and holds the complete audit history.' }
];
