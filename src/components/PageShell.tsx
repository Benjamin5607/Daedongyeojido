import { Footer } from "@/components/Footer";
import { GlobalGuideBot } from "@/components/GlobalGuideBot";
import { Navbar } from "@/components/Navbar";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip">
      <Navbar />
      <main className={`w-full min-w-0 flex-1 ${className}`}>{children}</main>
      <Footer />
      <GlobalGuideBot />
    </div>
  );
}
