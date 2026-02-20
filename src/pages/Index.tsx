import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import SlotDemoSection from "@/components/SlotDemoSection";
import EarningsSimulator from "@/components/EarningsSimulator";
import WaitlistSection from "@/components/WaitlistSection";
import Footer from "@/components/Footer";

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
        <SlotDemoSection />
        <div className="section-divider" />
        <EarningsSimulator />
        <div className="section-divider" />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
