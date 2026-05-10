import { PageContainer } from "@/components/PageContainer";
import { Link } from "wouter";
import { Shield, Activity, Eye, Smile, Mic, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function About() {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative min-h-screen pb-20">
      {/* Ambient Gradient Mesh Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-[-1]">
         <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
         <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <PageContainer className="max-w-4xl space-y-16 pt-12 relative z-10 px-4 md:px-0">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2 ring-1 ring-white/10 shadow-inner">
             <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tight text-foreground">About FaceSync</h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-medium">
            A calm, multimodal space to reflect on your physical presence and digital well-being.
          </p>
        </motion.div>

        <div className="space-y-8">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center">
             <h3 className="text-2xl font-heading font-bold text-foreground">How it Works</h3>
             <p className="text-muted-foreground mt-2 max-w-xl mx-auto">FaceSync uses lightweight, on-device machine learning to analyze your biometrics in real-time without compromising privacy.</p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Posture Alignment", desc: "Tracks head angle (Pitch, Yaw, Roll) to detect slouching or tilting during deep focus.", icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
              { title: "Eye Fatigue", desc: "Measures eyelid distance (EAR) to detect sustained drops indicating eye strain or drowsiness.", icon: Eye, color: "text-amber-500", bg: "bg-amber-500/10" },
              { title: "Facial Expression", desc: "Analyzes subtle blendshapes to estimate expression, revealing tension held in your face.", icon: Smile, color: "text-purple-500", bg: "bg-purple-500/10" },
              { title: "Voice Intelligence", desc: "Analyzes pitch and vocal stress levels to monitor wellness even when looking away.", icon: Mic, color: "text-primary", bg: "bg-primary/10" }
            ].map((feature, i) => (
              <motion.div key={i} variants={item} className="p-6 rounded-[2rem] bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-xl shadow-xl ring-1 ring-white/5 group hover:bg-white/10 transition-colors">
                 <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                 </div>
                 <h4 className="font-heading font-bold text-lg mb-2 text-foreground">{feature.title}</h4>
                 <p className="text-sm text-muted-foreground font-medium leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full mix-blend-screen pointer-events-none" />
          <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/30 shadow-inner z-10">
             <Shield className="h-10 w-10 text-primary" />
          </div>
          <div className="z-10 text-center md:text-left">
            <h4 className="text-2xl font-heading font-bold mb-3 text-foreground">Privacy by Design</h4>
            <p className="text-muted-foreground font-medium leading-relaxed max-w-2xl">
              Your camera and microphone feeds never leave your local environment. Machine learning runs entirely on your device. We only store anonymized biometric descriptors and scores—your raw audio and video are never saved or transmitted.
            </p>
          </div>
        </motion.div>

        <div className="space-y-8 pt-8">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center">
             <h3 className="text-3xl font-heading font-black tracking-tighter">Development Team</h3>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Laiba Koser", id: "08-CSE-2022", photo: "/assets/laiba.jpg" },
              { name: "Anees Anjum", id: "35-CSE-2022", photo: "/assets/anees.jpg" },
              { name: "Mohd Waqar", id: "38-CSE-2022", photo: "/assets/waqar.jpg" },
              { name: "Insha Akbar", id: "43-CSE/L-2023" },
            ].map((member, i) => (
              <motion.div key={member.id} variants={item} className="p-5 rounded-[2rem] bg-white/5 dark:bg-black/20 border border-white/10 shadow-xl backdrop-blur-xl flex flex-col items-center text-center group hover:-translate-y-2 hover:border-primary/30 hover:shadow-primary/10 transition-all duration-300 ring-1 ring-white/5">
                <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden border border-white/10 shadow-inner mb-4 group-hover:scale-105 transition-transform">
                  {member.photo ? (
                    <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold text-2xl">{member.name[0]}</span>
                  )}
                </div>
                <p className="font-heading font-bold text-foreground text-lg">{member.name}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 bg-secondary/30 px-2 py-1 rounded-md">{member.id}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Glowing Call to Action */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="pt-12 pb-8">
          <div className="relative rounded-[3rem] overflow-hidden group">
            {/* Animated glowing background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-blue-500/20 to-purple-500/30 blur-2xl group-hover:opacity-100 opacity-60 transition-opacity duration-700" />
            
            <div className="relative p-12 md:p-16 flex flex-col items-center text-center bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-3xl shadow-2xl ring-1 ring-white/10">
               <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6 ring-4 ring-primary/10 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                  <Activity className="w-8 h-8 text-primary animate-[pulse_2s_ease-in-out_infinite]" />
               </div>
               
               <h2 className="text-3xl md:text-5xl font-heading font-black tracking-tight text-foreground mb-4">
                 Ready to meet your digital mirror?
               </h2>
               
               <p className="text-muted-foreground text-lg mb-8 max-w-xl font-medium leading-relaxed">
                 Start your first multi-modal session today. See your posture, eye fatigue, and vocal wellness come to life in real-time.
               </p>
               
               <Link href="/" className="relative inline-flex items-center justify-center px-8 py-4 font-bold text-white bg-primary rounded-full overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(34,197,94,0.6)] active:scale-95 group/btn">
                  {/* Button shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[150%] group-hover/btn:translate-x-[150%] transition-transform duration-1000 ease-in-out skew-x-12" />
                  <span className="relative flex items-center gap-2 text-lg">Start First Session <Sparkles className="w-5 h-5" /></span>
               </Link>
            </div>
          </div>
        </motion.div>

      </PageContainer>
    </div>
  );
}
