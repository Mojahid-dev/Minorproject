import DashboardPage from "@/app/(app)/dashboard/page";
import HeroSection from "@/app/(marketing)/_components/hero";
import CoreFeatures from "@/app/(marketing)/_components/core-features";
import ExperienceAtlas from "@/app/(marketing)/_components/experience-atlas";
import FaqSection from "@/app/(marketing)/_components/faq-section";
import FinalCta from "@/app/(marketing)/_components/final-cta";
import Footer from "@/app/(marketing)/_components/footer";
import Navbar from "@/app/(marketing)/_components/navbar";
import ProblemSection from "@/app/(marketing)/_components/problem-section";
import ProductShowcase from "@/app/(marketing)/_components/product-showcase";
import PricingSection from "@/app/(marketing)/_components/pricing-section";
import SocialProofSection from "@/app/(marketing)/_components/social-proof";
import SolutionSection from "@/app/(marketing)/_components/solution-section";
import WhyAtlas from "@/app/(marketing)/_components/why-atlas";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function LandingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    return <DashboardPage />;
  }

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <ProductShowcase />
      <SocialProofSection />
      <CoreFeatures />
      <ExperienceAtlas />
      <WhyAtlas />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
