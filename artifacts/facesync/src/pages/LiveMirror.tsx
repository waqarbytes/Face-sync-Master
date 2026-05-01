import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useFaceTracker } from "@/hooks/useFaceTracker";
import { useReadingBatcher } from "@/hooks/useReadingBatcher";
import {
  useGetBaseline,
  useCreateSession,
  useEndSession,
  useListProfiles,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Camera, Loader2, StopCircle, UserCircle2, UserPlus, Zap, Smile, Meh, Frown, Angry, Ghost, Wind, Sparkles, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { useFaceIdentity } from "@/hooks/useFaceIdentity";
import { Link } from "wouter";
import { useZen } from "@/context/ZenContext";

export default function LiveMirror() {
  const [, setLocation] = useLocation();
  const { data: baselineData, isLoading: baselineLoading } = useGetBaseline();
  const baseline = baselineData || {
    earOpen: 0.32,
    marClosed: 0.05,
    neutralPitch: 0,
    neutralYaw: 0,
  };
  const { data: profiles } = useListProfiles();
  const { zenState, setZenState, showIntervention } = useZen();

  const createSessionMutation = useCreateSession();
  const endSessionMutation = useEndSession();

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [manualProfileId, setManualProfileId] = useState<number | null>(null);

  const [activeBaseline, setActiveBaseline] = useState<any>(null);
  
  useEffect(() => {
    if (baseline && !activeBaseline) {
      setActiveBaseline(baseline);
    }
  }, [baseline, activeBaseline]);

  const { videoRef, canvasRef, status, allMetrics, start, stop } =
    useFaceTracker(activeBaseline);

  const identity = useFaceIdentity(videoRef, status === "ready");

  const { push } = useReadingBatcher(activeSessionId);
  const lastSyncTime = useRef(0);
  const [sparkline, setSparkline] = useState<number[]>([]);
  const [learningProfiles, setLearningProfiles] = useState<Record<number, boolean>>({});

  // Identity logic
  const identifiedProfileId = identity.identities[0]?.match?.profile.id;
  const currentProfileId = manualProfileId || identifiedProfileId;
  const currentProfileName = profiles?.find(p => p.id === currentProfileId)?.name || "Unknown";

  // Intervention Logic Refs
  const badPostureStart = useRef<number>(0);
  const highStressStart = useRef<number>(0);
  const eyeFatigueStart = useRef<number>(0);
  const lastInterventionTime = useRef<number>(0);

  // Accumulate metrics for summary
  const metricsAcc = useRef({
    count: 0,
    earSum: 0,
    marSum: 0,
    posturePenaltySum: 0,
    emotionMap: {} as Record<string, number>,
  });

  useEffect(() => {
    if (allMetrics.length > 0 && activeSessionId) {
      const now = Date.now();
      const primary = allMetrics[0]!;

      // 1. MONITORING (Continuous)
      if (primary.posture !== "upright") {
        if (!badPostureStart.current) badPostureStart.current = now;
      } else {
        badPostureStart.current = 0;
      }

      if (primary.ear < (activeBaseline?.earOpen * 0.75)) {
        if (!eyeFatigueStart.current) eyeFatigueStart.current = now;
      } else {
        eyeFatigueStart.current = 0;
      }

      if (primary.emotion === "sad" || primary.emotion === "tired" || primary.emotion === "focused") {
        if (!highStressStart.current) highStressStart.current = now;
      } else {
        highStressStart.current = 0;
      }

      // 2. TRIGGERING (With Cooldown)
      if (now - lastInterventionTime.current > 45000) {
        if (badPostureStart.current && (now - badPostureStart.current > 8000)) {
          showIntervention("Your posture is dipping. A quick stretch might help!");
          lastInterventionTime.current = now;
          badPostureStart.current = 0;
        } 
        else if (eyeFatigueStart.current && (now - eyeFatigueStart.current > 12000)) {
          showIntervention("Eye strain detected. Try blinking or looking away for a moment.");
          lastInterventionTime.current = now;
          eyeFatigueStart.current = 0;
        }
        else if (highStressStart.current && (now - highStressStart.current > 15000)) {
          setZenState("zen");
          showIntervention("High tension detected. Activating Zen Mode to help you relax.");
          lastInterventionTime.current = now;
          highStressStart.current = 0;
        }
      }

      if (zenState === "zen" && primary.emotion === "happy") {
        setZenState("normal");
      }

      // 3. SYNCING (Every 2s)
      const perfNow = performance.now();
      if (perfNow - lastSyncTime.current >= 2000) {
        lastSyncTime.current = perfNow;
        push({
          ear: primary.ear,
          mar: primary.mar,
          yaw: primary.yaw,
          pitch: primary.pitch,
          roll: primary.roll,
          posture: primary.posture,
          emotion: primary.emotion,
          emotionConfidence: primary.emotionConfidence,
          wellnessScore: primary.wellnessScore,
        });
        setSparkline((prev) => [...prev.slice(-14), primary.wellnessScore]);
        metricsAcc.current.count++;
        metricsAcc.current.earSum += primary.ear;
        metricsAcc.current.marSum += primary.mar;
        let pen = 0;
        if (primary.posture === "tilted") pen = 10;
        if (primary.posture === "slouch") pen = 18;
        if (primary.posture === "forward_head") pen = 22;
        metricsAcc.current.posturePenaltySum += pen;
        metricsAcc.current.emotionMap[primary.emotion] =
          (metricsAcc.current.emotionMap[primary.emotion] || 0) + 1;
      }
    }
  }, [allMetrics, activeSessionId, push, activeBaseline, setZenState, showIntervention, zenState]);

  // Multi-user Continuous Learning
  const lastLearningTimes = useRef<Record<number, number>>({});
  useEffect(() => {
    identity.identities.forEach((idState) => {
      if (idState.match && idState.descriptor && idState.match.distance < 0.4) {
        const now = performance.now();
        const profileId = idState.match.profile.id;
        const lastSync = lastLearningTimes.current[profileId] || 0;
        if (now - lastSync > 15000) {
          lastLearningTimes.current[profileId] = now;
          setLearningProfiles(prev => ({ ...prev, [profileId]: true }));
          fetch(`/api/profiles/${profileId}/refine`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ descriptor: idState.descriptor })
          }).then(() => {
            setTimeout(() => {
              setLearningProfiles(prev => ({ ...prev, [profileId]: false }));
            }, 2000);
          }).catch(err => {
            console.error("Learning sync failed:", err);
            setLearningProfiles(prev => ({ ...prev, [profileId]: false }));
          });
        }
        if (idState.match.profile.earOpen && !activeBaseline?.isPersonalized) {
          setActiveBaseline({
            ...idState.match.profile,
            isPersonalized: true
          });
        }
      }
    });
  }, [identity.identities, activeBaseline]);

  // Dynamic Identity Locking
  const isProfileLocked = useRef(false);
  const lastSyncId = useRef<number | null>(null);
  const currentIdentifiedId = identity.identities[0]?.match?.profile.id;

  useEffect(() => {
    if (activeSessionId && !isProfileLocked.current) {
      const match = identity.identities[0]?.match;
      if (match) { 
        console.log(`[MIRROR_SYNC] Attempting to lock session ${activeSessionId} to ${match.profile.name} (id: ${match.profile.id})`);
        
        // Prevent redundant syncs
        if (lastSyncId.current === match.profile.id) return;
        lastSyncId.current = match.profile.id;

        fetch(`/api/sessions/${activeSessionId}/identify`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: match.profile.id })
        })
        .then(res => {
          if (res.ok) {
            console.log(`[MIRROR_SYNC] Successfully locked session ${activeSessionId}`);
            isProfileLocked.current = true;
          } else {
            console.warn(`[MIRROR_SYNC] Failed to lock session: ${res.status}`);
          }
        })
        .catch(err => console.error("[MIRROR_SYNC] Network error during identity lock:", err));
      }
    }
    if (!activeSessionId) {
      isProfileLocked.current = false;
      lastSyncId.current = null;
    }
  }, [activeSessionId, identity.identities]);

  const handleStart = () => {
    const targetId = manualProfileId || currentIdentifiedId;
    console.log(`[SESSION_START] Creating session. Target ID: ${targetId}`);
    
    createSessionMutation.mutate(
      { data: { profileId: targetId || null } },
      {
        onSuccess: (session) => {
          console.log(`[SESSION_START] Session created successfully. ID: ${session.id}`);
          setActiveSessionId(session.id);
          setSessionStartTime(Date.now());
          isProfileLocked.current = !!targetId;
          metricsAcc.current = {
            count: 0, earSum: 0, marSum: 0, posturePenaltySum: 0, emotionMap: {},
          };
          setSparkline([]);
          start();
        },
        onError: (err) => {
          console.error("[SESSION_START] Mutation error:", err);
          alert("Failed to start session. Check your connection.");
        }
      }
    );
  };

  const handleEnd = () => {
    if (!activeSessionId || !sessionStartTime) return;
    stop();
    const acc = metricsAcc.current;
    const dur = Math.floor((Date.now() - sessionStartTime) / 1000);
    const cnt = Math.max(1, acc.count);
    let domEmotion = "neutral";
    let maxEm = 0;
    for (const [em, val] of Object.entries(acc.emotionMap)) {
      if (val > maxEm) { maxEm = val; domEmotion = em; }
    }
    const avgScore = sparkline.length > 0 ? sparkline.reduce((a, b) => a + b, 0) / sparkline.length : 100;

    // Final attempt to bind profile: use manual choice first, then AI identified ID
    const finalProfileId = manualProfileId || currentIdentifiedId;

    console.log(`[SESSION_END] Ending session ${activeSessionId}. Final Profile Bind: ${finalProfileId}`);
    
    endSessionMutation.mutate(
      {
        id: activeSessionId,
        data: {
          wellnessScore: avgScore,
          avgEar: acc.earSum / cnt,
          avgMar: acc.marSum / cnt,
          avgPosturePenalty: acc.posturePenaltySum / cnt,
          dominantEmotion: domEmotion as any,
          durationSec: dur,
          neutralPitch: allMetrics[0]?.pitch || 0,
          neutralYaw: allMetrics[0]?.yaw || 0,
          // Explicitly pass the profileId to ensure attribution
          profileId: finalProfileId || null,
        } as any,
      },
      {
        onSuccess: () => {
          console.log(`[SESSION_END] Session ${activeSessionId} saved successfully with profile: ${finalProfileId}`);
          setLocation(`/sessions/${activeSessionId}`);
          setActiveSessionId(null);
        },
        onError: (err) => {
          console.error("[SESSION_END] Failed to save session:", err);
          alert("Failed to save session data. Please try again.");
        }
      }
    );
  };

  if (baselineLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  // Removed full-screen baseline blocker to ensure mirror always shows.
  // Warning is now shown inside the main UI instead.

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6 pb-6 px-3 sm:px-0">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-foreground">Live Mirror</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1 text-xs sm:text-base">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> Real-time wellness monitoring
            </p>
          </div>
        </div>

        {!baselineData && !baselineLoading && (
          <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
             <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
             <p className="text-[10px] font-bold text-amber-600/80 uppercase tracking-tight leading-tight">
               Calibration Missing. Using default profile for now.
               <Link href="/baseline" className="ml-2 underline hover:text-amber-700">Setup Now</Link>
             </p>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {!activeSessionId && (
            <div className="flex items-center bg-secondary/10 border border-border/40 p-1 rounded-2xl flex-shrink min-w-0">
              <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-background/50 border border-border/20 shadow-sm">
                <UserCircle2 className={`w-4 h-4 shrink-0 ${currentProfileId ? 'text-primary' : 'text-muted-foreground'}`} />
                <select 
                  value={currentProfileId || ""}
                  onChange={(e) => setManualProfileId(e.target.value ? parseInt(e.target.value) : null)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer pr-6 outline-none text-foreground min-w-0 max-w-[100px] sm:max-w-[120px]"
                >
                  <option value="">{identifiedProfileId ? "Auto Verified" : "Who are you?"}</option>
                  {profiles?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {currentProfileId && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-[-20px] pointer-events-none" />}
              </div>
            </div>
          )}

          {!activeSessionId ? (
            <Button 
              onClick={handleStart} 
              size="lg" 
              className="rounded-2xl h-10 sm:h-12 px-4 sm:px-8 font-heading font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm sm:text-base flex-shrink-0"
            >
              <Camera className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> <span className="hidden xs:inline">Start </span>Mirroring
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleEnd}
              size="lg"
              className="rounded-2xl h-10 sm:h-12 px-4 sm:px-8 font-heading font-bold shadow-xl shadow-destructive/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm sm:text-base flex-shrink-0"
            >
              <StopCircle className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Stop Session
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Camera Immersive View */}
        <div className="relative group">
          <Card className="overflow-hidden border-border/40 bg-black/5 backdrop-blur-sm rounded-3xl shadow-2xl ring-1 ring-border/20">
            <div className="relative aspect-[4/3] sm:aspect-video bg-black">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover scale-x-[-1] opacity-90"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="absolute inset-0 h-full w-full object-cover scale-x-[-1] pointer-events-none"
              />

              {/* Multi-Person Overlays */}
              <AnimatePresence mode="popLayout">
                {status === "ready" && allMetrics.map((m, i) => (
                  <motion.div
                    key={`overlay-${i}`}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute z-20 pointer-events-none"
                    style={{ 
                      left: i === 0 ? '6%' : i === 1 ? 'auto' : '50%',
                      right: i === 1 ? '6%' : 'auto',
                      top: i === 2 ? 'auto' : '6%',
                      bottom: i === 2 ? '6%' : 'auto',
                      transform: i === 2 ? 'translateX(-50%)' : 'none',
                      width: '260px'
                    }}
                  >
                    <div className="rounded-[2rem] bg-black/50 border border-white/20 p-5 text-white shadow-2xl backdrop-blur-3xl ring-1 ring-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${i === 0 ? 'from-primary to-primary/50' : 'from-blue-500 to-blue-300'} flex items-center justify-center shadow-lg shadow-black/20 relative`}>
                             <UserCircle2 className="h-6 w-6 text-white" />
                             {(learningProfiles[identity.identities[i]?.match?.profile.id || -1] || (i === 0 && isProfileLocked.current)) && (
                               <motion.div 
                                 initial={{ scale: 0 }}
                                 animate={{ scale: 1 }}
                                 className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-white"
                               >
                                 <div className="absolute inset-0 bg-primary rounded-full animate-ping" />
                               </motion.div>
                             )}
                           </div>
                           <div>
                             <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
                               User ID
                               {isProfileLocked.current && i === 0 && (
                                 <span className="text-[8px] bg-green-500/20 text-green-400 px-1 rounded">Locked</span>
                               )}
                               {learningProfiles[identity.identities[i]?.match?.profile.id || -1] && (
                                 <span className="text-[8px] bg-primary/20 text-primary px-1 rounded animate-pulse">Studying...</span>
                               )}
                             </div>
                              <div className="text-sm font-bold tracking-tight flex items-center gap-2">
                                {identity.identities[i]?.match?.profile.name || (
                                  <>
                                    <span className="text-white/40 italic">Unknown</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => setLocation('/people')}
                                      className="h-5 px-1.5 text-[8px] bg-primary/20 text-primary hover:bg-primary/40 pointer-events-auto"
                                    >
                                      Enroll Now
                                    </Button>
                                  </>
                                )}
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">Wellness</div>
                           <div className="text-xl font-heading font-bold text-primary">{Math.round(m.wellnessScore)}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                           <div className="text-[8px] font-bold text-white/30 uppercase mb-1 tracking-widest">Behavior</div>
                           <div className="text-xs font-bold capitalize truncate flex items-center gap-1.5">
                             <div className={`w-1.5 h-1.5 rounded-full ${m.posture === 'upright' ? 'bg-green-400' : 'bg-orange-400'}`} />
                             {m.posture.replace("_", " ")}
                           </div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                           <div className="text-[8px] font-bold text-white/30 uppercase mb-1 tracking-widest">Emotion</div>
                           <div className="text-xs font-bold capitalize truncate flex items-center gap-1.5">
                             {m.emotion === 'happy' && <Smile className="w-3.5 h-3.5 text-yellow-400" />}
                             {m.emotion === 'neutral' && <Meh className="w-3.5 h-3.5 text-blue-400" />}
                             {m.emotion === 'sad' && <Frown className="w-3.5 h-3.5 text-indigo-400" />}
                             {m.emotion === 'surprised' && <Ghost className="w-3.5 h-3.5 text-purple-400" />}
                             {(m.emotion !== 'happy' && m.emotion !== 'neutral' && m.emotion !== 'sad' && m.emotion !== 'surprised') && <Activity className="w-3.5 h-3.5 text-primary" />}
                             {m.emotion}
                           </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Status Overlays */}
              <AnimatePresence>
                {(status === "idle" && !activeSessionId) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-xl"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-inner ring-1 ring-primary/20">
                      <Camera className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="font-heading text-2xl font-bold text-foreground">Ready to start?</h3>
                    <p className="text-muted-foreground font-medium mt-2">Align yourself in the frame</p>
                  </motion.div>
                )}

                {status === "loading" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-2xl"
                  >
                    <div className="relative">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                        className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
                      />
                    </div>
                    <p className="text-foreground font-heading font-bold text-xl mt-6">Initializing AI Vision</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sidebar Metrics (Primary User Only) */}
              {allMetrics[0] && (
                <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-6 flex items-end justify-between pointer-events-none">
                   <div className="space-y-1.5 sm:space-y-2">
                     <div className="px-2 sm:px-3 py-1 rounded-lg bg-black/30 border border-white/5 backdrop-blur-md text-[8px] sm:text-[10px] font-bold text-white/50 uppercase tracking-widest">
                       Primary User Vitals
                     </div>
                     <div className="flex gap-1.5 sm:gap-2">
                        <div className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl text-white shadow-2xl">
                           <div className="text-[8px] sm:text-[10px] text-white/40 font-bold uppercase tracking-tighter">Posture</div>
                           <div className="text-xs sm:text-sm font-bold capitalize text-primary-foreground">{allMetrics[0].posture.replace("_", " ")}</div>
                        </div>
                        <div className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl text-white shadow-2xl">
                           <div className="text-[8px] sm:text-[10px] text-white/40 font-bold uppercase tracking-tighter">Focus</div>
                           <div className="text-xs sm:text-sm font-bold text-primary-foreground">{allMetrics[0].emotion}</div>
                        </div>
                     </div>
                   </div>
                   
                   <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 border border-white/20">
                      <div className="text-center">
                        <div className="text-[8px] sm:text-[10px] text-white/60 font-bold leading-none">SCORE</div>
                        <div className="text-base sm:text-xl font-heading font-bold text-white leading-none mt-0.5 sm:mt-1">{Math.round(allMetrics[0].wellnessScore)}</div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Metrics */}
        <div className="space-y-6">
          <Card className="rounded-3xl border-border/40 bg-card/60 backdrop-blur-sm shadow-xl shadow-black/5 overflow-hidden">
            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Calibration</h4>
                   <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Active</span>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-foreground/70 uppercase">Posture Alignment</span>
                      <span className="text-sm font-bold text-primary">
                        {allMetrics[0] ? (allMetrics[0].posture === "upright" ? "Perfect" : allMetrics[0].posture === "tilted" ? "Fair" : "Poor") : "--"}
                      </span>
                    </div>
                    <Progress 
                      value={allMetrics[0] ? (allMetrics[0].posture === "upright" ? 100 : allMetrics[0].posture === "tilted" ? 60 : 30) : 0} 
                      className="h-3 rounded-full bg-primary/10" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-foreground/70 uppercase">Eye Clarity</span>
                      <span className="text-sm font-bold text-primary">
                        {allMetrics[0] ? Math.round(Math.min(100, (allMetrics[0].ear / baseline.earOpen) * 100)) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={allMetrics[0] ? Math.min(100, (allMetrics[0].ear / baseline.earOpen) * 100) : 0} 
                      className="h-3 rounded-full bg-primary/10" 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-foreground/70 uppercase">Focus Intensity</span>
                      <span className="text-sm font-bold text-primary">
                        {allMetrics[0] ? Math.round(allMetrics[0].emotionConfidence * 100) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={allMetrics[0] ? allMetrics[0].emotionConfidence * 100 : 0} 
                      className="h-3 rounded-full bg-primary/10" 
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Summary Card at bottom of sidebar */}
            <div className="bg-secondary/40 border-t border-border/50 p-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-background shadow-sm border border-border/50 text-primary">
                     <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Session Points</div>
                    <div className="text-lg font-heading font-bold">{sparkline.length * 10}</div>
                  </div>
               </div>
            </div>
          </Card>
          
          <div className="px-2">
             <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed font-medium">
               Vision AI analyzes facial landmarks 30 times per second to provide medical-grade posture and focus insights.
             </p>
          </div>
        </div>
      </div>
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
