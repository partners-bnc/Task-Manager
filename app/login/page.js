import LoginPageClient from '@/app/login/LoginPageClient';

export const metadata = {
  title: 'Login',
  description: 'Centralized sign in for BNC Workspace',
};

export default function LoginPage() {
  return <LoginPageClient />;
}
