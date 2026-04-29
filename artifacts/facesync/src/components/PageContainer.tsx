import { ReactNode } from "react";

export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`container mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12 ${className}`}>
      {children}
    </main>
  );
}
