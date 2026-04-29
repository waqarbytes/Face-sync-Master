import { Link, useLocation } from "wouter";

export function Nav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Mirror" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/baseline", label: "Baseline" },
    { href: "/people", label: "People" },
    { href: "/about", label: "About" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-xl items-center px-4 md:px-8">
        <Link href="/" className="mr-8 flex items-center space-x-2">
          <span className="font-serif text-xl font-medium tracking-tight text-primary">FaceSync</span>
        </Link>
        <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-foreground/80 ${
                location === item.href ? "text-foreground" : "text-foreground/60"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
