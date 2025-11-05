'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authAPI } from '@/lib/api';
import { setToken, setStoredUser, isAuthenticated } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await authAPI.login(data.email, data.password);
      const { token, data: userData } = response.data;

      setToken(token);
      setStoredUser(userData);
      
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background-primary to-primary-100 px-4 py-12">
      <div className="max-w-md w-full bg-background-primary rounded-2xl shadow-large border border-border-light p-8 animate-fadeIn">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="mb-6">
            <Image
              src="/uploads/sutraLogo-Color.svg"
              alt="SUTRA.ai Logo"
              width={200}
              height={60}
              className="h-auto w-48"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-main to-primary-hover bg-clip-text text-transparent mb-2">
            Resource Management
          </h1>
          <p className="text-sm text-text-muted">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-text-heading mb-2">
              Email Address
            </label>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              type="email"
              id="email"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              placeholder="your.email@example.com"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-priority-critical-text flex items-center gap-1">
                <span className="text-priority-critical-text">•</span>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-text-heading mb-2">
              Password
            </label>
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              type="password"
              id="password"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-2 text-sm text-priority-critical-text flex items-center gap-1">
                <span className="text-priority-critical-text">•</span>
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-main to-primary-hover text-white py-3.5 rounded-xl font-semibold hover:from-primary-hover hover:to-primary-main/90 focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 transition-all shadow-soft hover:shadow-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-primary-main disabled:hover:to-primary-hover"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Logging in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
