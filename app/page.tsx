import { BenefitsSection } from "@/components/landing/benefits-section";
import { FaqSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { Navbar } from "@/components/landing/navbar";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0B0F19] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[170px]" />
        <div className="absolute right-[-10rem] top-[20%] h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-[160px]" />
      </div>
      <Navbar />
      <main className="relative z-10">
        <HeroSection />
        <BenefitsSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
