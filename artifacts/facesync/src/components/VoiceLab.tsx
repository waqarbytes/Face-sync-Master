import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, User, Activity, Sparkles, AudioWaveform as Waveform, ShieldCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useListProfiles } from "@workspace/api-client-react";

export default function VoiceLab() {
  const [isListening, setIsListening] = useState(false);
  const [emotion, setEmotion] = useState<{ label: string; confidence: number; energy: number; pitch: number } | null>(null);
  const [recognizedUser, setRecognizedUser] = useState<string | null>(null);
  const [isRecordingEnrollment, setIsRecordingEnrollment] = useState(false);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { data: profiles } = useListProfiles();

  // Start/Stop Microphone
  const toggleListening = async () => {
    if (isListening) {
      stopMicrophone();
    } else {
      await startMicrophone();
    }
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);
      
      setIsListening(true);
      drawVisualizer();
      
      // Start periodic analysis
      startAnalysisLoop();
    } catch (err) {
      console.error("Mic access error:", err);
    }
  };

  const stopMicrophone = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    setIsListening(false);
    setEmotion(null);
  };

  // Real-time Visualizer
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyzerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const analyzer = analyzerRef.current;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "rgba(var(--primary), 0.1)");
        gradient.addColorStop(0.5, "rgba(var(--primary), 0.6)");
        gradient.addColorStop(1, "rgba(var(--primary), 1)");
        
        ctx.fillStyle = gradient;
        
        // Draw rounded bars
        const radius = barWidth / 2;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, [radius, radius, 0, 0]);
        ctx.fill();
        
        x += barWidth + 2;
      }
    };
    
    draw();
  };

  // Periodic Voice Analysis (Mocked for now, sends to Python service)
  const startAnalysisLoop = () => {
    const interval = setInterval(async () => {
      if (!isListening || isRecordingEnrollment) return;
      
      // In a real app, you'd send a small chunk of audio here.
      // For now, we simulate different emotions based on analyzer magnitudes
      const dataArray = new Uint8Array(analyzerRef.current!.frequencyBinCount);
      analyzerRef.current!.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      if (avg > 10) {
         setEmotion({
           label: avg > 50 ? "Excited" : avg > 30 ? "Happy" : "Neutral",
           confidence: 0.7 + (Math.random() * 0.2),
           energy: avg / 100,
           pitch: 100 + (avg * 2)
         });
      } else {
         setEmotion(null);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter text-foreground">Voice Lab</h1>
          <p className="text-muted-foreground font-medium mt-1">Multi-modal biometric & emotional intelligence</p>
        </div>
        
        <Button 
          size="lg" 
          onClick={toggleListening}
          variant={isListening ? "destructive" : "default"}
          className="rounded-2xl px-8 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          {isListening ? (
            <><MicOff className="mr-2 h-5 w-5" /> Stop Listening</>
          ) : (
            <><Mic className="mr-2 h-5 w-5" /> Initialize Mic</>
          )}
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Visualizer */}
        <Card className="lg:col-span-2 border-border/40 bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading font-bold text-xl">Vocal Spectrum</CardTitle>
                <CardDescription>Real-time frequency analysis</CardDescription>
              </div>
              {isListening && (
                 <motion.div 
                   animate={{ scale: [1, 1.2, 1] }} 
                   transition={{ repeat: Infinity, duration: 2 }}
                   className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest"
                 >
                   <Activity className="w-3 h-3" /> Live
                 </motion.div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[350px] bg-secondary/5 relative flex items-center justify-center overflow-hidden rounded-b-3xl">
               {/* Decorative Background Glow */}
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.05)_0%,transparent_70%)] -z-10" />
               
               <AnimatePresence>
                 {!isListening && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="absolute inset-0 flex flex-col items-center justify-center z-20 space-y-4"
                   >
                      <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner">
                         <Waveform className="w-10 h-10 text-primary/40" />
                      </div>
                      <div className="text-center px-4">
                         <p className="text-lg font-heading font-black text-foreground">Microphone Offline</p>
                         <p className="text-sm text-muted-foreground font-medium">Initialize the mic to start real-time analysis</p>
                      </div>
                   </motion.div>
                 )}
               </AnimatePresence>

               <canvas 
                 ref={canvasRef} 
                 width={1000} 
                 height={350} 
                 className="w-full h-full object-cover pointer-events-none z-10"
               />
            </div>
          </CardContent>
        </Card>

        {/* Intelligence HUD */}
        <div className="space-y-6">
          <Card className="border-border/40 bg-card/60 backdrop-blur-md rounded-3xl shadow-xl">
             <CardHeader className="pb-2">
                <CardTitle className="font-heading font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> Emotion HUD
                </CardTitle>
             </CardHeader>
             <CardContent>
                <AnimatePresence mode="wait">
                   {emotion ? (
                     <motion.div 
                       key="emotion"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       className="space-y-6"
                     >
                        <div className="text-center p-6 bg-primary/5 rounded-2xl border border-primary/10">
                           <span className="text-sm font-bold text-primary uppercase tracking-[0.2em]">Detected State</span>
                           <h2 className="text-4xl font-heading font-black text-foreground mt-1">{emotion.label}</h2>
                           <div className="flex items-center justify-center gap-2 mt-2">
                              <ShieldCheck className="w-4 h-4 text-primary" />
                              <span className="text-xs font-bold text-muted-foreground">Confidence: {Math.round(emotion.confidence * 100)}%</span>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                 <span>Vocal Energy</span>
                                 <span>{Math.round(emotion.energy * 100)}%</span>
                              </div>
                              <Progress value={emotion.energy * 100} className="h-1.5" />
                           </div>
                           <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                 <span>Mean Pitch</span>
                                 <span>{Math.round(emotion.pitch)} Hz</span>
                              </div>
                              <Progress value={(emotion.pitch / 500) * 100} className="h-1.5" />
                           </div>
                        </div>
                     </motion.div>
                   ) : (
                     <div className="py-12 text-center space-y-4 opacity-50">
                        <Mic className="w-12 h-12 mx-auto text-muted-foreground" />
                        <p className="text-sm font-medium">Listening for vocal patterns...</p>
                     </div>
                   )}
                </AnimatePresence>
             </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/60 backdrop-blur-md rounded-3xl shadow-xl">
             <CardHeader className="pb-2">
                <CardTitle className="font-heading font-bold text-lg flex items-center gap-2">
                   <ShieldCheck className="w-5 h-5 text-blue-500" /> Identity
                </CardTitle>
             </CardHeader>
             <CardContent>
                {recognizedUser ? (
                   <div className="flex items-center gap-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                         {recognizedUser[0]}
                      </div>
                      <div>
                         <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Speaker</p>
                         <p className="text-lg font-heading font-bold">{recognizedUser}</p>
                      </div>
                   </div>
                ) : (
                   <div className="p-4 bg-secondary/10 rounded-2xl border border-border/40 flex items-center gap-4">
                      <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                         Voice fingerprint not matched. Speak longer to initialize identification.
                      </p>
                   </div>
                )}
             </CardContent>
          </Card>
        </div>
      </div>

      {/* Enrollment Section */}
      <Card className="border-border/40 bg-card/30 backdrop-blur-sm rounded-3xl shadow-lg border-dashed border-2">
         <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
               <div className="p-6 bg-primary/5 rounded-3xl">
                  <User className="w-12 h-12 text-primary" />
               </div>
               <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-heading font-bold">Voice Fingerprinting</h3>
                  <p className="text-muted-foreground text-sm font-medium mt-1">
                    Teach the AI your unique vocal profile to enable multi-factor identification. 
                    Read a 10-second sample to generate your biometric descriptor.
                  </p>
                  
                  <div className="mt-6 flex flex-wrap gap-4 justify-center md:justify-start">
                     <select className="bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 ring-primary/20">
                        <option value="">Select Profile...</option>
                        {profiles?.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                     </select>
                     <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5">
                        Start Enrollment
                     </Button>
                  </div>
               </div>
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
