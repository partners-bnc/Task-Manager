import { Navbar } from '@/app/components-homepage/Navbar';
import { Hero } from '@/app/components-homepage/Hero';
import { LogoTicker } from '@/app/components-homepage/LogoTicker';
import { FeatureSteps } from '@/app/components-homepage/FeatureSteps';
import { Footer } from '@/app/components-homepage/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <LogoTicker />
      <FeatureSteps />
      <Footer />
    </>
  );
}


