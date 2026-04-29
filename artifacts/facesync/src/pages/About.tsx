import { PageContainer } from "@/components/PageContainer";
import { Shield } from "lucide-react";

export default function About() {
  return (
    <PageContainer className="max-w-2xl space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight">About FaceSync</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          A calm space to reflect on your physical presence and digital well-being.
        </p>
      </div>

      <div className="prose prose-slate prose-p:text-muted-foreground prose-headings:font-serif prose-headings:font-medium prose-headings:text-foreground">
        <h3>How it Works</h3>
        <p>
          FaceSync uses a lightweight machine learning model running entirely in your browser to analyze your facial landmarks in real time. We measure three core aspects of your presence:
        </p>
        
        <ul className="space-y-4 my-6">
          <li>
            <strong className="text-foreground font-medium block mb-1">Posture (Pitch, Yaw, Roll)</strong>
            By tracking the angle of your head relative to your personal baseline, we detect slouching, forward head posture, or tilting that often occurs during deep focus or fatigue.
          </li>
          <li>
            <strong className="text-foreground font-medium block mb-1">Eye Fatigue (EAR)</strong>
            The Eye Aspect Ratio measures the vertical distance between your eyelids. A sustained drop in this ratio compared to your resting baseline indicates eye strain or drowsiness.
          </li>
          <li>
            <strong className="text-foreground font-medium block mb-1">Expression (Facial Emotion)</strong>
            Subtle blendshapes around the mouth and brow are analyzed to gently estimate your current expression, helping you become aware of tension holding in your face.
          </li>
          <li>
            <strong className="text-foreground font-medium block mb-1">Voice Intelligence (Multi-modal)</strong>
            By analyzing the pitch, energy, and unique frequency fingerprint (MFCC) of your voice, the system can identify you and track vocal stress levels even when your face is away from the camera.
          </li>
        </ul>

        <h3>The Wellness Score</h3>
        <p>
          The Wellness Score is a gentle aggregate metric that starts at 100. Small penalties are applied for poor posture, high eye fatigue, or sustained tension. It is smoothed over time to prevent jarring jumps, providing a calm reflection of how you're holding yourself in the moment.
        </p>

        <div className="mt-12 rounded-2xl bg-primary/5 border border-primary/10 p-6 flex gap-4 items-start">
          <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-foreground font-medium m-0 mb-2">Privacy by Design</h4>
            <p className="text-sm m-0 text-muted-foreground leading-relaxed">
              Your camera and microphone feeds never leave your local environment. The machine learning models run locally on your device or secure local server. We only store anonymized biometric descriptors and derived scores in the database. Your audio and video are never saved, transmitted, or viewed by anyone.
            </p>
          </div>
        </div>

        <div className="mt-16 space-y-6">
          <h3 className="text-2xl font-heading font-black tracking-tighter">Development Team</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Laiba Koser", id: "08-CSE-2022", photo: "/assets/laiba.jpg" },
              { name: "Anees Anjum", id: "35-CSE-2022", photo: "/assets/anees.jpg" },
              { name: "Mohd Waqar", id: "38-CSE-2022", photo: "/assets/waqar.jpg" },
              { name: "Insha Akbar", id: "43-CSE/L-2023" },
            ].map((member) => (
              <div 
                key={member.id}
                className="p-4 rounded-2xl bg-card border border-border/40 shadow-sm flex items-center gap-4 hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/5">
                  {member.photo ? (
                    <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold text-lg">{member.name[0]}</span>
                  )}
                </div>
                <div>
                  <p className="font-heading font-bold text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{member.id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
