import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function OnboardingIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"name" | "fragment" | "fuse" | "fade">("name");
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // If user prefers reduced motion, skip the complex fragments
    if (prefersReducedMotion) {
      const timer = setTimeout(() => onComplete(), 3000);
      return () => clearTimeout(timer);
    }

    const timers = [
      setTimeout(() => setPhase("fragment"), 1200),
      setTimeout(() => setPhase("fuse"), 3200),
      // Keep the fused logo on screen for 3 seconds (was 1s)
      setTimeout(() => setPhase("fade"), 6200),
      setTimeout(() => onComplete(), 7200),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete, prefersReducedMotion]);

  // Procedural fragments for the actual logo
  const fragmentConfig = [
    { clip: "inset(0 66% 66% 0)", x: -180, y: -150, r: -45 },
    { clip: "inset(0 33% 66% 33%)", x: 40, y: -250, r: 25 },
    { clip: "inset(0 0 66% 66%)", x: 220, y: -180, r: -35 },
    { clip: "inset(33% 66% 33% 0)", x: -280, y: 20, r: 100 },
    { clip: "inset(33% 33% 33% 33%)", x: 0, y: 0, r: 0 }, 
    { clip: "inset(33% 0 33% 66%)", x: 260, y: 50, r: -70 },
    { clip: "inset(66% 66% 0 0)", x: -200, y: 220, r: 55 },
    { clip: "inset(66% 33% 0 33%)", x: -20, y: 280, r: -20 },
    { clip: "inset(66% 0 0 66%)", x: 210, y: 200, r: 40 },
  ];

  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <img 
            src="/assets/logo.png" 
            className="w-32 h-32 mx-auto mb-4 mix-blend-multiply" 
            alt="FaceSync Logo" 
          />
          <h1 className="text-4xl font-heading font-black tracking-tighter text-primary">FaceSync</h1>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, scale: 0.2, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.8, filter: "blur(15px)" }}
            transition={{ type: "spring", damping: 15, stiffness: 120, duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-7xl md:text-9xl font-heading font-black tracking-tighter text-primary drop-shadow-[0_0_40px_rgba(var(--primary),0.2)]">
              FaceSync
            </h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground font-heading font-bold uppercase tracking-[0.4em] mt-4 opacity-50"
            >
              Vision Wellness
            </motion.p>
          </motion.div>
        )}

        {(phase === "fragment" || phase === "fuse") && (
          <div className="relative w-80 h-80 flex items-center justify-center">
            {/* Real Logo Fragments */}
            {fragmentConfig.map((frag, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: frag.x * 2.5, 
                  y: frag.y * 2.5, 
                  rotate: frag.r * 2.5, 
                  opacity: 0,
                  scale: 0.4
                }}
                animate={{ 
                  x: phase === "fuse" ? 0 : frag.x, 
                  y: phase === "fuse" ? 0 : frag.y, 
                  rotate: phase === "fuse" ? 0 : frag.r,
                  opacity: 1,
                  scale: 1,
                }}
                transition={{ 
                  duration: phase === "fuse" ? 1.2 : 2.5,
                  ease: phase === "fuse" ? [0.22, 1, 0.36, 1] : "circOut",
                }}
                className="absolute inset-0"
                style={{
                  clipPath: frag.clip,
                  mixBlendMode: "multiply", // This removes the white background
                }}
              >
                <img 
                  src="/assets/logo.png" 
                  className="w-full h-full object-contain"
                  alt=""
                />
              </motion.div>
            ))}

            {/* Final Reassembled Logo with Glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, filter: "brightness(2)" }}
              animate={{ 
                opacity: phase === "fuse" ? 1 : 0, 
                scale: phase === "fuse" ? 1 : 0.9,
                filter: phase === "fuse" ? "brightness(1)" : "brightness(2)"
              }}
              transition={{ delay: 1.0, duration: 0.8 }}
              className="relative z-10"
              style={{ mixBlendMode: "multiply" }}
            >
              <img 
                src="/assets/logo.png" 
                className="w-80 h-80 drop-shadow-[0_0_80px_rgba(var(--primary),0.4)]" 
                alt="FaceSync Logo" 
              />
              <AnimatePresence>
                {phase === "fuse" && (
                   <motion.div 
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: [1, 2.8, 0], opacity: [0, 0.5, 0] }}
                     transition={{ duration: 1.5, ease: "easeOut" }}
                     className="absolute inset-0 bg-primary/40 rounded-full blur-[100px]"
                   />
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Background Ambience */}
      <motion.div 
        animate={{ 
          opacity: phase === "fade" ? 0 : [0.03, 0.08, 0.03],
        }}
        className="absolute inset-0 bg-primary/10 -z-10"
      />
    </div>
  );
}
