import { Link } from "react-router-dom";
import { ArrowLeft, Target, ShieldCheck, Zap } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-extrabold title">About the KVK Portal</h1>
        <Link to="/" className="btn btn-secondary">
          <ArrowLeft className="w-5 h-5" /> Back Home
        </Link>
      </div>

      <div className="glass-panel p-12 text-slate-600 leading-relaxed text-lg space-y-6">
        <p>
          The <span className="font-bold text-slate-900 italic">KVK Farmers Data Portal</span> is a state-of-the-art digital ecosystem designed to bridge the gap between advanced satellite technology and ground-level agricultural expertise.
        </p>
        <p>
          Originally developed as a series of PHP management tools, this platform has been re-engineered into a modern, role-based React application. The mission is to empower farmers with data insights, streamlined complaint resolution, and expert crop guidance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard icon={<Target className="w-6 h-6" />} color="bg-orange-100 text-orange-600" title="Our Goal" text="To provide data-driven support to every registered farmer in the region." />
        <FeatureCard icon={<ShieldCheck className="w-6 h-6" />} color="bg-blue-100 text-blue-600" title="Security" text="MongoDB Atlas-backed access controls and API authentication protect farmer privacy and data integrity." />
        <FeatureCard icon={<Zap className="w-6 h-6" />} color="bg-emerald-100 text-emerald-600" title="Speed" text="Built for fast data visualization even on low-bandwidth networks." />
      </div>
    </div>
  );
}

function FeatureCard({ icon, color, title, text }: { icon: React.ReactNode; color: string; title: string; text: string }) {
  return (
    <div className="glass-panel p-8 space-y-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      <p className="text-sm">{text}</p>
    </div>
  );
}
