import { useLocation, Link } from "wouter";
import { LayoutDashboard, Clock, Plus, User, AlertTriangle, Activity, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/92993302/KbooDNEHZac63fVcFBRUy9/vitalmeta_logo_main_822ee86f.png";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/glycemia", icon: Activity, label: "Glicemia" },
  { href: "/insights", icon: Lightbulb, label: "Insights" },
  { href: "/log", icon: Plus, label: "Log", isCenter: true },
  { href: "/timeline", icon: Clock, label: "Timeline" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="VitalMeta" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-lg" style={{ fontFamily: "'Poppins', sans-serif" }}>
            <span className="text-foreground">Vital</span>
            <span className="text-primary">Meta</span>
          </span>
        </div>
        <Link href="/sos">
          <button className="relative p-2 rounded-full bg-destructive/20 hover:bg-destructive/30 transition-colors" aria-label="SOS Emergência">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <Link key={item.href} href={item.href}>
                  <button className="relative -mt-6 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg glow-cyan transition-transform hover:scale-105 active:scale-95">
                    <Icon className="w-7 h-7 text-primary-foreground" />
                  </button>
                </Link>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <button className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
