import '@/app/HRM/components/styles/index.css';
import OnboardingFormClient from './OnboardingFormClient';

export default async function OnboardingTokenPage({ params }) {
  const { token } = await params;
  return <OnboardingFormClient token={token} />;
}
