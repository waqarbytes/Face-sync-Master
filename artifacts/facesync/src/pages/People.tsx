import { useEffect, useRef, useState } from "react";
import {
  useListProfiles,
  useCreateProfile,
  useDeleteProfile,
  getListProfilesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Camera,
  Loader2,
  Trash2,
  UserPlus,
  CheckCircle2,
  Users,
  Shield,
  Sparkles,
  ChevronRight,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ensureRecognitionModels,
  computeDescriptor,
  averageDescriptors,
} from "@/lib/face/recognition";
import { useToast } from "@/hooks/use-toast";

const SAMPLE_TARGET = 5;

type EnrollState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "capturing"; collected: number }
  | { kind: "saving" }
  | { kind: "denied" }
  | { kind: "error"; message: string };

export default function People() {
  const { data: profiles, isLoading } = useListProfiles();
  const createProfile = useCreateProfile();
  const deleteProfile = useDeleteProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [enroll, setEnroll] = useState<EnrollState>({ kind: "idle" });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelRef = useRef(false);

  const stopCamera = () => {
    cancelRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stopCamera();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopCamera();
    };
  }, []);

  const startEnrollment = async () => {
    if (!name.trim()) {
      toast({ title: "Identification Required", description: "Please enter a name to begin enrollment." });
      return;
    }
    cancelRef.current = false;
    setEnroll({ kind: "loading" });
    try {
      await ensureRecognitionModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEnroll({ kind: "ready" });
    } catch (err) {
      const e = err as DOMException;
      if (e?.name === "NotAllowedError") setEnroll({ kind: "denied" });
      else setEnroll({ kind: "error", message: e?.message ?? "Failed to initialize secure enclave" });
    }
  };

  const captureSamples = async () => {
    if (!videoRef.current) return;
    setEnroll({ kind: "capturing", collected: 0 });
    const samples: Float32Array[] = [];
    let attempts = 0;
    while (samples.length < SAMPLE_TARGET && attempts < 25) {
      if (cancelRef.current) return;
      attempts++;
      const desc = await computeDescriptor(videoRef.current);
      if (desc) {
        samples.push(desc);
        setEnroll({ kind: "capturing", collected: samples.length });
      }
      await new Promise((r) => setTimeout(r, 350));
    }
    if (samples.length < 3) {
      setEnroll({
        kind: "error",
        message: "Insufficient clarity. Ensure face is well-lit and centered in the frame.",
      });
      return;
    }
    setEnroll({ kind: "saving" });
    const descriptor = averageDescriptors(samples);
    createProfile.mutate(
      {
        data: {
          name: name.trim(),
          descriptor,
          sampleCount: samples.length,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
          toast({
            title: "Identity Enrolled",
            description: `FaceSync has learned the unique profile of ${name.trim()}.`,
          });
          setName("");
          stopCamera();
          setEnroll({ kind: "idle" });
        },
        onError: (e: Error) =>
          setEnroll({ kind: "error", message: e.message ?? "Failed to encrypt profile" }),
      },
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !name.trim()) {
      if (!name.trim()) toast({ title: "Name Required", description: "Please enter a name for this identity." });
      return;
    }

    setEnroll({ kind: "saving" });
    try {
      await ensureRecognitionModels();
      
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      img.src = imageUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const descriptor = await computeDescriptor(img);
      URL.revokeObjectURL(imageUrl);

      if (!descriptor) {
        throw new Error("No face detected in the photo. Please use a clear, well-lit headshot.");
      }

      createProfile.mutate(
        {
          data: {
            name: name.trim(),
            descriptor: Array.from(descriptor),
            sampleCount: 1,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
            toast({
              title: "Identity Enrolled",
              description: `FaceSync has learned the unique profile of ${name.trim()}.`,
            });
            setName("");
            setEnroll({ kind: "idle" });
          },
          onError: (e: Error) =>
            setEnroll({ kind: "error", message: e.message ?? "Failed to save profile" }),
        }
      );
    } catch (err: any) {
      setEnroll({ kind: "error", message: err.message || "Failed to process photo" });
    }
  };

  const handleDelete = (id: number) => {
    deleteProfile.mutate(
      { id },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() }),
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">Biometrics</h1>
        <p className="text-muted-foreground font-medium flex items-center gap-2 mt-2">
          <Users className="w-4 h-4 text-primary" /> Identity management and face enrollment
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Card className="rounded-3xl border-border/40 bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <UserPlus className="w-5 h-5" />
                 </div>
                 <div>
                    <CardTitle className="font-heading font-bold text-xl">New Enrollment</CardTitle>
                    <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Secure Capture</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
                  Full Name
                </label>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Maya Thompson"
                      className="h-12 flex-1 rounded-2xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all font-medium"
                      disabled={enroll.kind === "capturing" || enroll.kind === "saving"}
                    />
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        id="face-upload" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileUpload}
                      />
                      {(enroll.kind === "idle" || enroll.kind === "denied" || enroll.kind === "error") ? (
                        <>
                          <Button
                            onClick={startEnrollment}
                            className="h-12 px-5 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                          >
                            <Camera className="mr-2 h-5 w-5" />
                            Live
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => document.getElementById('face-upload')?.click()}
                            className="h-12 px-5 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all border-border/50"
                          >
                            <Upload className="mr-2 h-5 w-5" />
                            Upload
                          </Button>
                        </>
                      ) : enroll.kind === "ready" ? (
                        <Button
                          onClick={captureSamples}
                          className="h-12 px-6 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white hover:scale-105 transition-all w-full"
                        >
                          Capture Samples
                        </Button>
                      ) : (
                        <Button disabled className="h-12 px-6 rounded-2xl font-bold bg-secondary/50 w-full">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </Button>
                      )}
                    </div>
                  </div>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-black border border-border/40 shadow-inner">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="absolute inset-0 h-full w-full object-cover scale-x-[-1] opacity-90"
                />
                
                {enroll.kind === 'capturing' && (
                   <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-[15%] border-2 border-primary/40 rounded-[20%] animate-pulse" />
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                         <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                         <span className="text-[10px] font-bold text-white uppercase tracking-widest">Recording Samples</span>
                      </div>
                   </div>
                )}

                <AnimatePresence>
                  {(enroll.kind === "idle" ||
                    enroll.kind === "loading" ||
                    enroll.kind === "denied" ||
                    enroll.kind === "error") && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm p-8 text-center"
                    >
                      {enroll.kind === "idle" && (
                        <div className="space-y-4">
                          <div className="w-16 h-16 rounded-3xl bg-secondary/50 flex items-center justify-center text-muted-foreground/40 mx-auto">
                            <Camera className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground max-w-[200px]">
                            Enter your name and allow camera access to begin.
                          </p>
                        </div>
                      )}
                      {enroll.kind === "loading" && (
                        <div className="space-y-4">
                          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Initializing Neural Mesh</p>
                        </div>
                      )}
                      {enroll.kind === "denied" && (
                        <div className="space-y-4">
                          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
                          <h4 className="font-bold">Access Denied</h4>
                          <p className="text-xs text-muted-foreground">Please grant camera permissions in your browser settings.</p>
                        </div>
                      )}
                      {enroll.kind === "error" && (
                        <div className="space-y-4">
                          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
                          <h4 className="font-bold">Capture Error</h4>
                          <p className="text-xs text-muted-foreground">{enroll.message}</p>
                          <Button variant="outline" size="sm" onClick={() => setEnroll({kind: 'idle'})} className="rounded-xl">Retry</Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                  
                  {enroll.kind === "capturing" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-full px-12"
                    >
                       <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
                          <motion.div 
                            className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${(enroll.collected / SAMPLE_TARGET) * 100}%` }}
                          />
                       </div>
                       <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Captured {enroll.collected} of {SAMPLE_TARGET}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50">
                 <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                 <div>
                    <h5 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Privacy Guaranteed</h5>
                    <p className="text-[11px] text-muted-foreground font-medium mt-1 leading-relaxed">
                      FaceSync converts images into secure mathematical descriptors. No actual photos are ever stored or transmitted to our servers.
                    </p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-heading text-xl font-bold tracking-tight">Access Control</h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{profiles?.length || 0} Profiles</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-3xl" />
              <Skeleton className="h-20 w-full rounded-3xl" />
            </div>
          ) : !profiles || profiles.length === 0 ? (
            <div className="text-center py-16 px-8 rounded-[2rem] border-2 border-dashed border-border/50 bg-secondary/10">
               <Sparkles className="w-12 h-12 text-primary/20 mx-auto mb-4" />
               <h4 className="font-heading font-bold text-lg">No identities found</h4>
               <p className="text-sm text-muted-foreground font-medium mt-2 leading-relaxed">
                 Enroll yourself or family members to track personalized wellness data.
               </p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group flex items-center justify-between p-4 rounded-3xl bg-card/40 border border-border/40 hover:bg-card hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-xl font-heading group-hover:scale-105 transition-transform">
                      {p.name[0]}
                    </div>
                    <div>
                      <div className="font-heading font-bold text-lg text-foreground">{p.name}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-primary" /> {p.sampleCount} Bio-Samples
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="p-6 rounded-[2rem] bg-gradient-to-br from-primary to-emerald-700 text-white shadow-xl shadow-primary/20">
             <h4 className="font-heading font-bold text-lg mb-2">Automated Identity</h4>
             <p className="text-xs font-medium text-white/80 leading-relaxed mb-4">
               FaceSync uses these profiles to automatically switch data tracking when it detects a different person in front of the mirror.
             </p>
             <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-primary bg-white/20 backdrop-blur-md flex items-center justify-center text-[10px] font-bold">
                    {String.fromCharCode(64+i)}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
