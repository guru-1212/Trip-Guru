'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInWithEmailOrPhone } from '@/firebase/auth';
import { isEmail } from '@/lib/utils';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Enter your Gmail or email address')
    .refine((val) => isEmail(val.trim()), {
      message: 'Enter a valid Gmail or email address',
    }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    setLoading(true);
    try {
      await signInWithEmailOrPhone(data.email, data.password);
      router.push('/dashboard');
    } catch (e) {
      const msg = (e as { message?: string }).message ?? 'Login failed';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setError('Invalid email/mobile or password.');
      } else if (msg.includes('auth/user-not-found')) {
        setError('No account found. Please register first.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Plane className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in with Gmail / email and password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Gmail / Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="yourname@gmail.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-danger text-sm mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-danger text-sm mt-1">{errors.password.message}</p>
            )}
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Create account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
