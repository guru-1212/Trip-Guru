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
import { FirebaseError } from 'firebase/app';
import { registerWithEmail } from '@/firebase/auth';

const schema = z
  .object({
    name: z.string().min(2, 'Name required'),
    email: z.string().email('Invalid email'),
    phone: z
      .string()
      .min(10, 'Enter a valid 10-digit mobile number')
      .refine((val) => val.replace(/\D/g, '').length >= 10, {
        message: 'Enter a valid 10-digit mobile number',
      }),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
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
      await registerWithEmail(data.email, data.password, data.name, data.phone);
      router.push('/dashboard');
    } catch (e) {
      if (e instanceof FirebaseError && e.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try signing in.');
        return;
      }
      const msg = (e as { message?: string }).message ?? 'Registration failed';
      setError(msg);
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
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>Create account with Gmail / email, mobile & password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" autoComplete="name" {...register('name')} />
            {errors.name && (
              <p className="text-danger text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
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
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="10-digit mobile"
              autoComplete="tel"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-danger text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-danger text-sm mt-1">{errors.password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-danger text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
