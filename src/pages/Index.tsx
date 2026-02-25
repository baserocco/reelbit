import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import WaitlistSection from "@/components/WaitlistSection";
import Footer from "@/components/Footer";

const SlotDemoSection = lazy(() => import("@/components/SlotDemoSection"));
const EarningsSimulator = lazy(() => import("@/components/EarningsSimulator"));

const SectionFallback = () => (
  <div className="py-24 lg:py-32 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main>
        <HeroSection />
        <div className="section-divider" />
        <ProblemSection />
        <div className="section-divider" />
        <SolutionSection />
        <div className="section-divider" />
        <Suspense fallback={<SectionFallback />}>
          <SlotDemoSection />
        </Suspense>
        <div className="section-divider" />
        <Suspense fallback={<SectionFallback />}>
          <EarningsSimulator />
        </Suspense>
        <div className="section-divider" />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
