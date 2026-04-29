import { Link, useLocation } from "wouter";
import { User, Bell } from "lucide-react";

export function AppHeader() {
  const [location] = useLocation();

  const getPageTitle = (path: string) => {
    switch (path) {
      case "/": return "Mirror";
      case "/dashboard": return "Dashboard";
      case "/baseline": return "Baseline";
      case "/people": return "People";
      case "/about": return "About";
      default: return "FaceSync";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/50 transition-all duration-300">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <img src="/assets/logo.png" alt="FaceSync" className="w-full h-full object-cover" />
            </div>
            <span className="font-heading font-black text-xl tracking-tighter hidden sm:block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">FaceSync</span>
          </Link>
        </div>

        <h1 className="font-heading font-semibold text-base sm:hidden">
          {getPageTitle(location)}
        </h1>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-secondary transition-colors relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
          </button>
          <button className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden">
            <User className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
