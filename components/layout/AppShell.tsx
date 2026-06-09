import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
  username: string;
}

export function AppShell({ children, username }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-screen flex-col md:pl-64">
        <Navbar username={username} />
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}