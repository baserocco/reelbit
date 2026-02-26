import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    question: "What is ReelBit?",
    answer:
      "ReelBit is a platform where anyone can create, own, and earn from their own real-money slot machine. Using AI, you can design and launch a provably fair slot in minutes — then earn passive dividends from every spin.",
  },
  {
    question: "How does the bonding curve work?",
    answer:
      "Each slot machine has its own token launched on a bonding curve. Early supporters buy in at a lower price. As demand grows, the price rises automatically. Creators and early backers benefit from the upside while the curve provides built-in liquidity.",
  },
  {
    question: "Do I need coding or design experience?",
    answer:
      "Not at all. ReelBit's AI builder handles everything — from theme generation to math models. You just pick a concept, customize the look, and launch. No technical skills required.",
  },
  {
    question: "Is it provably fair?",
    answer:
      "Yes. Every spin outcome is determined on-chain using verifiable random functions (VRF) on Solana. Anyone can independently verify that results are fair and untampered.",
  },
  {
    question: "How do creators earn money?",
    answer:
      "Creators earn a percentage of the house edge from every spin on their slot machine — paid out automatically. Waitlist members get an enhanced 35% revenue share for the first 6 months (vs. the standard 30%).",
  },
  {
    question: "When is the launch?",
    answer:
      "We're currently in the waitlist phase. Join now to lock in exclusive founder perks including early access, bonus token allocations, and boosted revenue share. Public launch details will be announced to waitlist members first.",
  },
  {
    question: "What blockchain does ReelBit run on?",
    answer:
      "ReelBit is built on Solana for its speed, low transaction costs, and proven infrastructure for on-chain gaming. All payouts and game logic settle on Solana.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="relative py-24 lg:py-32 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-black to-black/95" />

      <div className="relative max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-neon-cyan font-orbitron text-xs tracking-widest uppercase font-semibold mb-4">
            FAQ
          </span>
          <h2 className="font-orbitron font-bold text-3xl sm:text-4xl text-white leading-tight">
            Frequently Asked{" "}
            <span className="gradient-text">Questions</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="glass-card border border-white/5 rounded-xl px-6 overflow-hidden data-[state=open]:border-neon-cyan/20"
            >
              <AccordionTrigger className="text-white font-inter font-medium text-left text-sm sm:text-base hover:no-underline hover:text-neon-cyan py-5 [&>svg]:text-neon-cyan">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-white/50 font-inter text-sm leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
