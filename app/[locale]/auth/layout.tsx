import { AuthBranding } from '@/components/auth/AuthBranding';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cosmic-bg relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden p-4 pb-safe">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-accent/8 blur-[80px]" />
      </div>
      <AuthBranding />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}