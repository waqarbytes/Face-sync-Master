import { useListSessions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { Activity, Clock, Target, ChevronRight, Calendar, Sparkles, Filter, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";

export default function History() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: sessions, isLoading } = useListSessions({ limit: 50 });

  const filteredSessions = sessions?.filter(s => 
    format(new Date(s.startedAt), "MMMM d yyyy").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">Session History</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4 text-primary" /> Your journey towards better wellness
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
           <input 
             type="text"
             placeholder="Search by date..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2 bg-secondary/10 border border-border/40 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
           />
        </div>
      </motion.div>

      {/* Quick Stats Summary */}
      {!isLoading && sessions && sessions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
           {[
             { label: "Total Recorded", value: `${sessions.length}`, sub: "Sessions", color: "bg-blue-500/10 text-blue-500" },
             { label: "Total Time", value: `${Math.round(sessions.reduce((acc, s) => acc + (s.durationSec || 0), 0) / 60)}`, sub: "Minutes", color: "bg-primary/10 text-primary" },
             { label: "Avg Score", value: `${Math.round(sessions.reduce((acc, s) => acc + (s.wellnessScore || 0), 0) / sessions.length)}`, sub: "Wellness", color: "bg-orange-500/10 text-orange-500" },
             { label: "Completion", value: "100%", sub: "Rate", color: "bg-purple-500/10 text-purple-500" },
           ].map((stat, i) => (
             <div key={i} className="p-4 rounded-2xl bg-card border border-border/40 shadow-sm">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</div>
                <div className="flex items-baseline gap-1">
                   <span className={`text-xl font-heading font-bold ${stat.color.split(' ')[1]}`}>{stat.value}</span>
                   <span className="text-[10px] font-bold text-muted-foreground">{stat.sub}</span>
                </div>
             </div>
           ))}
        </motion.div>
      )}

      {/* Sessions List */}
      <Card className="border-border/40 bg-card/30 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
          ) : filteredSessions && filteredSessions.length > 0 ? (
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="divide-y divide-border/30"
            >
              {filteredSessions.map((session: any) => (
                <motion.div key={session.id} variants={item}>
                  <Link href={`/sessions/${session.id}`} className="flex items-center justify-between p-6 hover:bg-primary/5 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Activity className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-heading font-bold text-lg text-foreground">{format(new Date(session.startedAt), "MMMM d, yyyy")}</p>
                          {session.profileName && (
                            <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                              {session.profileName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {Math.round((session.durationSec || 0) / 60)} mins
                          </p>
                          <span className="text-muted-foreground/30">•</span>
                          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                            {format(new Date(session.startedAt), "hh:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:flex flex-col items-end">
                         <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-widest">Score</div>
                         <div className={`text-xl font-heading font-bold ${Math.round(session.wellnessScore || 0) > 80 ? 'text-primary' : 'text-orange-500'}`}>
                           {Math.round(session.wellnessScore || 0)}
                         </div>
                      </div>
                      <div className="p-2 rounded-xl bg-secondary/30 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <ChevronRight className="h-6 w-6" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-24 px-6">
               <div className="w-20 h-20 bg-secondary/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-primary/30" />
               </div>
               <h4 className="font-heading font-bold text-2xl">No history found</h4>
               <p className="text-muted-foreground text-sm max-w-[280px] mx-auto mt-2 font-medium leading-relaxed">
                 {searchTerm ? "No sessions match your search criteria." : "Complete your first mirror session to start building your wellness history."}
               </p>
               {!searchTerm && (
                 <Link href="/" className="mt-8 inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                   Start Mirror Session
                 </Link>
               )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
