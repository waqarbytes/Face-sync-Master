import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetBaseline, useUpdateBaseline, getGetBaselineQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFaceLandmarker } from "@/lib/face/landmarker";
import { computeEAR, computeMAR, decomposeMatrix } from "@/lib/face/metrics";
import { CheckCircle2, Loader2, Maximize, Target, Info, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Baseline() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: baseline, isLoading } = useGetBaseline();
  const updateMutation = useUpdateBaseline();

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  
  const handleRecalibrate = async () => {
    setIsCalibrating(true);
    setSuccess(false);
    setProgress(0);

    try {
      const landmarker = await getFaceLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Sample ~20 frames over 2 seconds
      const framesToSample = 20;
      let framesSampled = 0;
      let earSum = 0;
      let marSum = 0;
      let pitchSum = 0;
      let yawSum = 0;

      const sampleInterval = setInterval(() => {
        if (!videoRef.current) return;
        const results = landmarker.detectForVideo(videoRef.current, performance.now());
        
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0]!;
          const matrixRaw = results.facialTransformationMatrixes?.[0]?.data;

          earSum += computeEAR(landmarks);
          marSum += computeMAR(landmarks);

          if (matrixRaw && matrixRaw.length === 16) {
            const { pitch, yaw } = decomposeMatrix(Array.from(matrixRaw));
            pitchSum += pitch;
            yawSum += yaw;
          }

          framesSampled++;
          setProgress((framesSampled / framesToSample) * 100);

          if (framesSampled >= framesToSample) {
            clearInterval(sampleInterval);
            stream.getTracks().forEach(t => t.stop());
            
            const newBaseline = {
              earOpen: earSum / framesToSample,
              marClosed: marSum / framesToSample,
              neutralPitch: pitchSum / framesToSample,
              neutralYaw: yawSum / framesToSample,
            };

            updateMutation.mutate({ data: newBaseline }, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getGetBaselineQueryKey() });
                setIsCalibrating(false);
                setSuccess(true);
                // Redirect back to mirror after 2 seconds
                setTimeout(() => {
                  setSuccess(false);
                  setLocation("/");
                }, 2000);
              },
              onError: () => {
                setIsCalibrating(false);
                // The global error boundary or toast will handle notification
              }
            });
          }
        }
      }, 100);

    } catch (err) {
      console.error(err);
      setIsCalibrating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">Calibration</h1>
        <p className="text-muted-foreground font-medium flex items-center gap-2 mt-2">
          <Target className="w-4 h-4 text-primary" /> Personalizing your wellness baseline
        </p>
      </motion.div>

      <Card className="rounded-3xl border-border/40 bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden">
        <AnimatePresence mode="wait">
          {isCalibrating ? (
            <motion.div 
              key="calibrating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative aspect-video flex items-center justify-center flex-col bg-black overflow-hidden"
            >
               <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover scale-x-[-1] opacity-60"
                  playsInline
                  muted
                />
              <div className="relative z-10 flex flex-col items-center p-8 bg-background/40 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl max-w-sm text-center">
                <div className="relative mb-6">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                </div>
                <h3 className="font-heading font-bold text-xl mb-2">Steady Now...</h3>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  Look directly at the camera with a neutral expression.
                </p>
                
                <div className="w-full mt-8">
                   <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      <span>Calibrating Vitals</span>
                      <span>{Math.round(progress)}%</span>
                   </div>
                   <div className="w-full h-2.5 bg-primary/10 rounded-full overflow-hidden border border-primary/5">
                    <motion.div 
                      className="h-full bg-primary" 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="summary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <CardHeader className="border-b border-border/40 pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading font-bold text-2xl">Vitals Profile</CardTitle>
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                    {baseline ? "Calibrated" : "Uncalibrated"}
                  </div>
                </div>
                <CardDescription className="font-medium text-muted-foreground/80 mt-1">
                  Baseline metrics captured on {baseline && 'updatedAt' in baseline ? new Date((baseline as any).updatedAt).toLocaleDateString() : 'never'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-8">
                {isLoading ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                  </div>
                ) : baseline ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {[
                      { label: "Resting EAR", value: baseline.earOpen.toFixed(3), desc: "Eye fatigue & blinks", icon: "👁️" },
                      { label: "Resting MAR", value: baseline.marClosed.toFixed(3), desc: "Yawn & expression", icon: "👄" },
                      { label: "Neutral Pitch", value: `${baseline.neutralPitch.toFixed(1)}°`, desc: "Vertical alignment", icon: "↕️" },
                      { label: "Neutral Yaw", value: `${baseline.neutralYaw.toFixed(1)}°`, desc: "Horizontal alignment", icon: "↔️" },
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-secondary/30 border border-border/50 group hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg">{item.icon}</span>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.label}</p>
                        </div>
                        <p className="text-3xl font-heading font-bold tracking-tight">{item.value}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1 font-medium italic">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-6 rounded-3xl border-2 border-dashed border-border/50">
                    <Maximize className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                    <h4 className="font-heading font-bold text-lg">No profile found</h4>
                    <p className="text-muted-foreground text-sm max-w-[240px] mx-auto mt-2 font-medium">
                      Start a quick calibration session to initialize your wellness profile.
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="bg-secondary/20 p-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-muted-foreground/80">
                   <ShieldCheck className="w-5 h-5 text-primary" />
                   <span className="text-xs font-bold uppercase tracking-tight">On-device analysis enabled</span>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {success && (
                    <motion.p 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-sm font-bold text-primary flex items-center bg-primary/5 px-4 py-2 rounded-xl"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Calibration Saved
                    </motion.p>
                  )}
                  <Button 
                    onClick={handleRecalibrate} 
                    size="lg"
                    className="w-full sm:w-auto rounded-2xl h-12 px-8 font-heading font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Maximize className="mr-2 h-5 w-5" /> {baseline ? "Recalibrate" : "Start Calibration"}
                  </Button>
                </div>
              </CardFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <div className="bg-primary/5 rounded-3xl p-6 flex gap-4 border border-primary/10">
         <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Info className="w-6 h-6" />
         </div>
         <div className="space-y-1">
            <h5 className="font-heading font-bold text-foreground">Why calibrate?</h5>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
              Every face is unique. Calibration establishes your personal "resting state" so the AI can accurately distinguish between natural expressions and signs of fatigue or poor posture.
            </p>
         </div>
      </div>
    </div>
  );
}
