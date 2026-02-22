import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import AdminCostCalculator from "@/components/landing/AdminCostCalculator";
import Features from "@/components/landing/Features";
import ROICalculator from "@/components/landing/ROICalculator";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import PaymentScheme from "@/components/landing/PaymentScheme";
import About from "@/components/landing/About";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Problem />
      <AdminCostCalculator />
      <Features />
      <ROICalculator />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <PaymentScheme />
      <About />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
