import { LandingHeader } from '../components/landing/LandingHeader.jsx';
import { HeroSection } from '../components/landing/HeroSection.jsx';
import { WorkflowSection } from '../components/landing/WorkflowSection.jsx';
import { ProductCapabilities } from '../components/landing/ProductCapabilities.jsx';
import { LandingFooter } from '../components/landing/LandingFooter.jsx';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink antialiased">
      <LandingHeader />
      <main>
        <HeroSection />
        <WorkflowSection />
        <ProductCapabilities />
      </main>
      <LandingFooter />
    </div>
  );
}
