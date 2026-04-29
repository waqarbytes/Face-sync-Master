import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useZen } from "@/context/ZenContext";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { zenState, intervention } = useZen();

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background text-foreground font-sans selection:bg-primary/10 overflow-hidden">
      {/* Zen Mode Background Effects */}
      <AnimatePresence>
        {zenState !== "normal" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-1000 ${
              zenState === "zen" ? "bg-blue-500/5" : "bg-orange-500/5"
            }`}
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className={`absolute -top-[20%] -left-[20%] w-[80%] h-[80%] rounded-full blur-[120px] ${
                zenState === "zen" ? "bg-blue-400/20" : "bg-orange-400/20"
              }`}
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                rotate: [0, -90, 0],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className={`absolute -bottom-[20%] -right-[20%] w-[80%] h-[80%] rounded-full blur-[120px] ${
                zenState === "zen" ? "bg-primary/20" : "bg-red-400/10"
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wellness Intervention Popup */}
      <AnimatePresence>
        {intervention && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: -80, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
          >
            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-primary/20 rounded-3xl p-6 shadow-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Activity className="w-6 h-6 text-primary" />
                </motion.div>
              </div>
              <div>
                <h4 className="font-heading font-black text-sm uppercase tracking-widest text-primary">Wellness Tip</h4>
                <p className="text-foreground font-bold leading-tight mt-1">{intervention}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppHeader />
      
      <main className="flex-1 pb-20 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.02, y: -8 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20
            }}
            className="container max-w-screen-xl px-4 py-6 md:px-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
