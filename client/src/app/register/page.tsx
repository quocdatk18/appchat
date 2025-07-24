'use client';

import AuthForm from '@/components/authForm/AuthForm';

export default function RegisterPage() {
  const handleRegister = (data: any) => {
    // Call API
  };

  return <AuthForm mode="register" onSubmit={handleRegister} />;
}
