import LoginPageClient from '@/app/login/LoginPageClient';

export const metadata = {
  title: 'Login',
  description: 'Centralized sign in for Sanctum Enterprise Suite',
};

export default function LoginPage() {
  return <LoginPageClient />;
}
