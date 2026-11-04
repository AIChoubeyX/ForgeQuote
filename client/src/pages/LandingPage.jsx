import { LandingHeader } from '../components/landing/LandingHeader.jsx';
import { HeroSection } from '../components/landing/HeroSection.jsx';
import { WorkflowSection } from '../components/landing/WorkflowSection.jsx';
import { ProductCapabilities } from '../components/landing/ProductCapabilities.jsx';
import { LandingFooter } from '../components/landing/LandingFooter.jsx';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F5] antialiased selection:bg-forge selection:text-white">
      {/* Editorial Navigation Header */}
      <LandingHeader />

      {/* Main Content Area */}
      <main>
        {/* Section 1: Hero Section with Black & Industrial Orange Theme */}
        <HeroSection />

        {/* Section 2: Manufacturing Workflow Infographic */}
        <WorkflowSection />

        {/* Section 3: Product Capabilities & Governance Reinforcement */}
        <ProductCapabilities />
      </main>

      {/* Enterprise Footer */}
      <LandingFooter />
    </div>
  );
}
