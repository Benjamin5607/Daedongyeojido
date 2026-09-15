import { Footer } from "@/components/Footer";
import { GlobalGuideBot } from "@/components/GlobalGuideBot";
import { Navbar } from "@/components/Navbar";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className={`flex-1 ${className}`}>{children}</main>
      <Footer />
      <GlobalGuideBot />
    </div>
  );
}
