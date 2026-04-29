import { Link } from "wouter";
import {
  useGetInsightsSummary,
  useGetWellnessTrend,
  useGetPostureBreakdown,
  useGetEmotionBreakdown,
  useListSessions,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { Activity, Clock, Target, CalendarDays, TrendingUp, Sparkles, ChevronRight, Download, User, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useListProfiles } from "@workspace/api-client-react";

export default function Dashboard() {
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const { data: profiles } = useListProfiles();

  const { data: summary, isLoading: summaryLoading } = useQuery<any>({
    queryKey: ["insights-summary", selectedProfileId],
    queryFn: () => fetch(`/api/insights/summary${selectedProfileId ? `?profileId=${selectedProfileId}` : ''}`).then(res => res.json())
  });

  const { data: trend, isLoading: trendLoading } = useQuery<any[]>({
    queryKey: ["insights-trend", selectedProfileId],
    queryFn: () => fetch(`/api/insights/trend?days=14${selectedProfileId ? `&profileId=${selectedProfileId}` : ''}`).then(res => res.json())
  });

  const { data: posture, isLoading: postureLoading } = useQuery<any[]>({
    queryKey: ["insights-posture", selectedProfileId],
    queryFn: () => fetch(`/api/insights/posture-breakdown${selectedProfileId ? `?profileId=${selectedProfileId}` : ''}`).then(res => res.json())
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["sessions-list", selectedProfileId],
    queryFn: () => fetch(`/api/sessions?limit=10${selectedProfileId ? `&profileId=${selectedProfileId}` : ''}`).then(res => res.json())
  });
  
  const { data: userSummary, isLoading: userSummaryLoading } = useQuery<any[]>({
    queryKey: ["user-summary"],
    queryFn: () => fetch("/api/insights/user-summary").then(res => res.json())
  });

  const exportToCSV = () => {
    if (!userSummary) return;
    const headers = ["User", "Total Sessions", "Total Minutes", "Avg Wellness", "Last Active"];
    const rows = userSummary.map(u => [
      u.name,
      u.totalSessions,
      Math.round(u.totalMinutes),
      Math.round(u.avgWellnessScore || 0),
      u.lastActive ? format(new Date(u.lastActive), 'yyyy-MM-dd HH:mm') : 'Never'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `user_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = {
    primary: "hsl(160, 60%, 40%)",
    secondary: "hsl(210, 25%, 55%)",
    accent: "hsl(35, 40%, 60%)",
    muted: "hsl(220, 10%, 90%)",
  };

  const pieColors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.muted];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-12 px-4 md:px-0">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">Summary</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
            <TrendingUp className="w-4 h-4 text-primary" /> Tracking your wellness trajectory
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-secondary/10 p-1 rounded-2xl border border-border/40">
            <button
              onClick={() => setSelectedProfileId(null)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${selectedProfileId === null ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Users className="w-3.5 h-3.5" /> All Users
            </button>
            <div className="w-px h-4 bg-border/40 self-center mx-1" />
            <select
              value={selectedProfileId || ""}
              onChange={(e) => setSelectedProfileId(e.target.value ? parseInt(e.target.value) : null)}
              className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer px-2 outline-none"
            >
              <option value="" disabled>Select User...</option>
              {profiles?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-xs font-bold transition-all border border-border/40 text-foreground"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </motion.div>

      {/* Primary Vitals Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { label: "Avg Wellness", value: Math.round(summary?.avgWellnessScore || 0), icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
          { label: "Total Time", value: `${summary?.totalMinutes || 0}m`, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Streak", value: `${summary?.currentStreakDays || 0}d`, icon: CalendarDays, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Sessions", value: summary?.totalSessions || 0, icon: Target, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card className="group hover:scale-[1.02] transition-all duration-300 border-border/40 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${stat.bg} rounded-2xl ${stat.color} transition-transform group-hover:rotate-6`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                    {summaryLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
                      <p className="text-2xl font-heading font-bold mt-0.5">{stat.value}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Wellness Chart */}
        <motion.div variants={item} initial="hidden" animate="show" className="lg:col-span-2">
          <Card className="h-full border-border/40 bg-card/40 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="font-heading font-bold text-xl">Wellness Trend</CardTitle>
                <CardDescription className="font-medium">Daily performance index</CardDescription>
              </div>
              <div className="flex gap-1">
                {['7D', '14D', '30D'].map(t => (
                  <button key={t} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${t === '14D' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] mt-4">
                {trendLoading ? (
                  <Skeleton className="h-full w-full rounded-2xl" />
                ) : trend && trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => format(new Date(val), 'MMM d')}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-lg)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '12px' }}
                        labelStyle={{ fontWeight: 800, color: 'black', marginBottom: '4px' }}
                        itemStyle={{ fontWeight: 600, color: COLORS.primary }}
                        labelFormatter={(val) => format(new Date(val), 'EEEE, MMM d')}
                      />
                      <Area type="monotone" dataKey="avgWellnessScore" stroke={COLORS.primary} strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground font-medium italic">Establish more sessions to see trends</div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Posture Pie */}
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="h-full border-border/40 bg-card/40 backdrop-blur-sm shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="font-heading font-bold text-xl">Posture Balance</CardTitle>
              <CardDescription className="font-medium">Distribution across sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] relative">
                {postureLoading ? <Skeleton className="h-full w-full rounded-full" /> : posture && posture.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={posture} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="ratio" nameKey="posture" animationBegin={200} animationDuration={1200}>
                           {Array.isArray(posture) && posture.map((entry: any, index: number) => (
                             <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} className="stroke-background stroke-[4px]" />
                           ))}
                         </Pie>
                        <Tooltip formatter={(val: number) => [`${Math.round(val * 100)}%`]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)', fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dominant</span>
                       <span className="text-xl font-heading font-bold text-foreground">
                         {Array.isArray(posture) && posture.length > 0 
                           ? [...posture].sort((a: any, b: any) => b.ratio - a.ratio)[0]?.posture.split('_')[0]
                           : "---"}
                       </span>
                    </div>
                  </>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground font-medium italic">No data yet</div>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                 {Array.isArray(posture) && posture.slice(0, 4).map((p: any, i: number) => (
                   <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[i] }} />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase truncate">{p.posture.replace('_', ' ')}</span>
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* User Summary Table */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="border-border/40 bg-card/30 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading font-bold text-xl">User Performance</CardTitle>
              <CardDescription className="font-medium">Aggregated summary per enrolled identity</CardDescription>
            </div>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
               <User className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">User Identity</th>
                    <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Sessions</th>
                    <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Time</th>
                    <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg Score</th>
                    <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {userSummaryLoading ? [1, 2, 3].map(i => <tr key={i}><td colSpan={5} className="py-4"><Skeleton className="h-10 w-full rounded-xl" /></td></tr>) : userSummary && userSummary.length > 0 ? (
                    userSummary.map((user: any) => (
                      <tr key={user.profileId} className="group hover:bg-primary/5 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-xs">
                              {user.name?.[0] || 'U'}
                            </div>
                            <span className="font-bold text-sm text-foreground">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-4 text-sm font-medium text-muted-foreground">{user.totalSessions}</td>
                        <td className="py-4 text-sm font-medium text-muted-foreground">{Math.round(user.totalMinutes)} mins</td>
                        <td className="py-4">
                           <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 w-12 bg-secondary/30 rounded-full overflow-hidden">
                                 <div className="h-full bg-primary" style={{ width: `${user.avgWellnessScore || 0}%` }} />
                              </div>
                              <span className="text-sm font-bold text-foreground">{Math.round(user.avgWellnessScore || 0)}</span>
                           </div>
                        </td>
                        <td className="py-4 text-[11px] font-bold text-muted-foreground/60 uppercase">
                          {user.lastActive ? formatDistanceToNow(new Date(user.lastActive), { addSuffix: true }) : 'Never'}
                        </td>
                      </tr>
                    ))
                  ) : <tr><td colSpan={5} className="py-12 text-center text-muted-foreground italic text-sm">No user data available yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Sessions */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="border-border/40 bg-card/30 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading font-bold text-xl">Recent Mirroring</CardTitle>
              <CardDescription className="font-medium">Your last 10 wellness check-ins</CardDescription>
            </div>
            <Link href="/history" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div> : sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session: any) => (
                  <Link key={session.id} href={`/sessions/${session.id}`} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border/50 hover:bg-background hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Activity className="w-6 h-6" /></div>
                      <div>
                        <p className="font-heading font-bold text-foreground">{format(new Date(session.startedAt), "MMMM d")}</p>
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Clock className="w-3 h-3" /> {Math.round((session.durationSec || 0) / 60)} mins · <Target className="w-3 h-3 ml-1" /> Score: {Math.round(session.wellnessScore || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${Math.round(session.wellnessScore || 0) > 80 ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-500'}`}>{Math.round(session.wellnessScore || 0) > 80 ? 'Excellent' : 'Good'}</div>
                       <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-6 rounded-3xl border-2 border-dashed border-border/50">
                 <Sparkles className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                 <h4 className="font-heading font-bold text-lg">No sessions recorded</h4>
                 <p className="text-muted-foreground text-sm max-w-[240px] mx-auto mt-2 font-medium leading-relaxed">Complete your first wellness mirror session to start seeing your data here.</p>
                 <Link href="/" className="mt-6 inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Start Mirror Session</Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
