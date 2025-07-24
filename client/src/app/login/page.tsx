'use client';

import AuthForm from '@/components/authForm/AuthForm';

export default function LoginPage() {
  const handleLogin = (data: any) => {
    // Call API
  };

  return <AuthForm mode="login" onSubmit={handleLogin} />;
}
