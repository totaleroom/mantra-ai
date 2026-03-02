import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import About from "@/components/landing/About";
import Pricing from "@/components/landing/Pricing";
import PaymentScheme from "@/components/landing/PaymentScheme";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import LazySection from "@/components/landing/LazySection";
import ChatDemo from "@/components/landing/ChatDemo";
import AdminCostCalculator from "@/components/landing/AdminCostCalculator";
import ROICalculator from "@/components/landing/ROICalculator";
import FAQ from "@/components/landing/FAQ";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <LazySection><ChatDemo /></LazySection>
        <Problem />
        <LazySection><AdminCostCalculator /></LazySection>
        <Features />
        <LazySection><ROICalculator /></LazySection>
        <HowItWorks />
        <Testimonials />
        <About />
        <Pricing />
        <PaymentScheme />
        <LazySection><FAQ /></LazySection>
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
