import SiteHeader from './sections/SiteHeader'
import HeroSection from './sections/HeroSection'
import ValueSection from './sections/ValueSection'
import HowItWorks from './sections/HowItWorks'
import ComparisonSection from './sections/ComparisonSection'
import FeatureSection from './sections/FeatureSection'
import PricingSection from './sections/PricingSection'
import FAQSection from './sections/FAQSection'
import FinalCTA from './sections/FinalCTA'
import Footer from './sections/Footer'

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <HeroSection />
        <ValueSection />
        <HowItWorks />
        <ComparisonSection />
        <FeatureSection />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
