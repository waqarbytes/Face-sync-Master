import { Link, useLocation } from "wouter";
import { Camera, LayoutDashboard, Activity, Users, Info, Mic } from "lucide-react";
import { motion } from "framer-motion";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Mirror", icon: Camera },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/voice", label: "Voice", icon: Mic },
    { href: "/history", label: "History", icon: Activity },
    { href: "/people", label: "People", icon: Users },
    { href: "/about", label: "About", icon: Info },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border/50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 group">
              <div className={`relative p-1 rounded-xl transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-foreground'}`}>
                <Icon className="w-6 h-6" />
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none transition-colors duration-300 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
