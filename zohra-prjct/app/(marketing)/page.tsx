import HeroSection from "@/app/(marketing)/_components/hero";
import Navbar from "@/app/(marketing)/_components/navbar";

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen ">
      <Navbar />
      <HeroSection />
    </main>
  );
}