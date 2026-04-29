import { useRoute } from "wouter";
import { useGetSession, useListReadings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { ArrowLeft, Activity, Brain, User, Calendar, Clock, ChevronLeft, Share2, Download } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function SessionDetail() {
  const [, params] = useRoute("/sessions/:id");
  const id = Number(params?.id);

  const { data: session, isLoading: sessionLoading } = useGetSession(id);
  const { data: readings, isLoading: readingsLoading } = useListReadings(id, { limit: 1000 });

  if (sessionLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center text-muted-foreground mb-4">
           <Activity className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-heading font-bold">Report Missing</h2>
        <p className="text-muted-foreground max-w-xs mt-2">The session data you are looking for might have been archived or removed.</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-8 rounded-2xl">Return to Summary</Button>
        </Link>
      </div>
    );
  }

  const COLORS = {
    primary: "hsl(160, 60%, 40%)",
    accent: "hsl(35, 40%, 60%)",
    secondary: "hsl(210, 25%, 55%)",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      {/* Header Actions */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <Link href="/dashboard" className="group flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all">
          <div className="w-8 h-8 rounded-xl bg-secondary/30 flex items-center justify-center group-hover:bg-secondary/50 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Dashboard
        </Link>
        <div className="flex gap-2">
           <button className="p-2 rounded-xl bg-secondary/30 text-muted-foreground hover:text-foreground transition-all">
              <Share2 className="w-4 h-4" />
           </button>
           <button className="p-2 rounded-xl bg-secondary/30 text-muted-foreground hover:text-foreground transition-all">
              <Download className="w-4 h-4" />
           </button>
        </div>
      </motion.div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="w-8 h-8" />
           </div>
           <div>
              <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
                {format(new Date(session.startedAt), "MMMM d")}
              </h1>
              <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(new Date(session.startedAt), "h:mm a")}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> {Math.round((session.durationSec || 0) / 60)}m duration</span>
              </div>
           </div>
        </div>
      </motion.div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Wellness Index", value: Math.round(session.wellnessScore || 0), sub: "Composite Score", color: "text-primary", bg: "bg-primary/10", icon: Brain },
          { label: "Eye Focus (EAR)", value: (session.avgEar || 0).toFixed(2), sub: "Avg Clarity", color: "text-amber-500", bg: "bg-amber-500/10", icon: Activity },
          { label: "Stability", value: session.postureBreakdown?.[0]?.posture.split('_')[0] || "Neutral", sub: "Primary Posture", color: "text-blue-500", bg: "bg-blue-500/10", icon: User },
          { label: "Mood Signal", value: session.dominantEmotion || "Neutral", sub: "Avg Expression", color: "text-purple-500", bg: "bg-purple-500/10", icon: Activity },
        ].map((item, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="rounded-3xl border-border/40 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className={`w-10 h-10 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-4`}>
                   <item.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.label}</p>
                <p className="text-2xl font-heading font-bold mt-1 capitalize">{item.value}</p>
                <p className="text-[11px] font-medium text-muted-foreground/60 mt-1">{item.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Interactive Timeline Chart */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-md shadow-xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center justify-between">
               <div>
                  <CardTitle className="font-heading font-bold text-2xl">Physiological Timeline</CardTitle>
                  <CardDescription className="font-medium text-muted-foreground mt-1">Fine-grained wellness & biometric tracking</CardDescription>
               </div>
               <div className="hidden sm:flex gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-primary" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Wellness</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-amber-500" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Eye Focus</span>
                  </div>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="h-[450px] w-full mt-6">
              {readingsLoading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : readings && readings.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={readings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWellness" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="capturedAt" 
                      tickFormatter={(val) => format(new Date(val), 'HH:mm:ss')}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }}
                      dy={10}
                      minTickGap={60}
                    />
                    <YAxis 
                      yAxisId="left"
                      domain={[0, 100]} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 0.4]} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: '1px solid hsl(var(--border))', 
                        boxShadow: 'var(--shadow-xl)',
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        padding: '16px'
                      }}
                      labelStyle={{ fontWeight: 800, color: 'black', marginBottom: '8px' }}
                      labelFormatter={(val) => `Time: ${format(new Date(val), 'HH:mm:ss')}`}
                    />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="wellnessScore" 
                      name="Wellness"
                      stroke={COLORS.primary} 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorWellness)" 
                      animationDuration={2000}
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="ear" 
                      name="Eye Clarity"
                      stroke={COLORS.accent} 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      fillOpacity={1} 
                      fill="url(#colorEar)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                  <Activity className="w-12 h-12 opacity-20" />
                  <p className="font-medium italic">High-frequency readings were not captured for this session.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Insights Suggestion */}
      <div className="bg-primary/5 rounded-[2rem] p-8 border border-primary/10 flex flex-col md:flex-row gap-8 items-center">
         <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
            <Brain className="w-10 h-10" />
         </div>
         <div className="flex-1 space-y-2 text-center md:text-left">
            <h4 className="font-heading font-bold text-xl text-foreground">Intelligent Insights</h4>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              Based on your eye aspect ratio and posture stability during this {Math.round((session.durationSec || 0) / 60)} minute window, we recommend a 5-minute stretching break. Your focus remained high, but your neck angle showed signs of minor tension towards the end.
            </p>
         </div>
         <button className="whitespace-nowrap px-8 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
            See Recommendations
         </button>
      </div>
    </div>
  );
}
