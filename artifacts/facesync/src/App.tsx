import { Switch, Route, Router as WouterRouter } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ZenProvider } from "@/context/ZenContext";

import { Layout } from "@/components/Layout";
import LiveMirror from "@/pages/LiveMirror";
import Dashboard from "@/pages/Dashboard";
import SessionDetail from "@/pages/SessionDetail";
import Baseline from "@/pages/Baseline";
import About from "@/pages/About";
import People from "@/pages/People";
import History from "@/pages/History";
import VoiceLab from "@/components/VoiceLab";
import NotFound from "@/pages/not-found";
import { OnboardingIntro } from "@/components/OnboardingIntro";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={LiveMirror} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/sessions/:id" component={SessionDetail} />
        <Route path="/baseline" component={Baseline} />
        <Route path="/people" component={People} />
        <Route path="/history" component={History} />
        <Route path="/voice" component={VoiceLab} />
        <Route path="/about" component={About} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ZenProvider>
          <AnimatePresence>
            {showOnboarding && (
              <OnboardingIntro onComplete={handleOnboardingComplete} />
            )}
          </AnimatePresence>
          
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </ZenProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
