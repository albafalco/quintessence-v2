import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
  username: string;
}

export function AppShell({ children, username }: AppShellProps) {
  return (
    <div className="cosmic-bg min-h-screen text-foreground">
      <Sidebar />
      <div
        className="flex min-h-screen flex-col transition-[padding] duration-300 md:pl-[var(--sidebar-width,16rem)]"
      >
        <Navbar username={username} />
        <main className="relative flex-1 p-4 pb-28 md:p-8 md:pb-8">
          <div className="animate-fade-in mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}