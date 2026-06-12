import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="cosmic-bg text-foreground">
      <Sidebar />
      <div
        className="flex min-h-[100dvh] min-w-0 flex-col overflow-x-hidden transition-[padding] duration-300 md:pl-[var(--sidebar-width,16rem)]"
      >
        <Navbar />
        <main className="relative min-w-0 flex-1 overflow-x-hidden px-3 py-4 pb-mobile-nav md:p-8 md:pb-8">
          <div className="animate-fade-in mx-auto w-full min-w-0 max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}