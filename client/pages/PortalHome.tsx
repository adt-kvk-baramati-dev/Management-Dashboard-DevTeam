import { Link } from "react-router-dom";
import { UploadCloud, LayoutDashboard, Users, Database } from "lucide-react";

export default function PortalHome() {
  const cards = [
    {
      href: "/data",
      title: "Farmers Data View",
      desc: "Search, filter and export consolidated farmer history and sensor data.",
      icon: Database,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      linkText: "Access Database →"
    },
    {
      href: "/guidance",
      title: "Crop Guidance",
      desc: "Best practices, fertilizer guides, and seasonal planning.",
      icon: LayoutDashboard,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      linkText: "View Guide →"
    },
    {
      href: "/sampling",
      title: "Random Sampling",
      desc: "Submit field observations for satellite map calibration.",
      icon: Database,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      linkText: "Start Sampling →"
    },
    {
      href: "/upload",
      title: "Data Upload",
      desc: "Import new farmer datasets securely into MongoDB Atlas.",
      icon: UploadCloud,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      linkText: "Upload JSON →"
    },
    {
      href: "/about",
      title: "About Portal",
      desc: "Learn about the KVK digital transformation journey.",
      icon: InfoIcon,
      color: "text-slate-500",
      bg: "bg-slate-500/10",
      linkText: "Our Vision →"
    },
    {
      href: "/contact",
      title: "Contact Support",
      desc: "Reach out to regional KVK offices for assistance.",
      icon: PhoneIcon,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      linkText: "Get in Touch →"
    }
  ];

  return (
    <div className="min-h-screen container py-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-12 glass-panel p-8 gap-6">
        <div>
          <h1 className="title text-5xl mb-2">KVK Digital Portal</h1>
          <p className="text-slate-600 font-semibold text-lg">Revolutionizing Agriculture through Data Science</p>
        </div>
        <div className="flex gap-4">
          <Link to="/portal/login" className="btn btn-primary px-8 py-4 text-lg bg-emerald-600 hover:bg-emerald-700">
            <LayoutDashboard className="w-6 h-6" />
            Sign In
          </Link>
          <Link to="/" className="btn btn-secondary px-8 py-4 text-lg border-emerald-600 text-emerald-700 hover:bg-emerald-50">
            <Users className="w-6 h-6" />
            Existing Home
          </Link>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cards.map((card, idx) => (
          <Link key={idx} to={card.href} className="glass-panel p-10 hover:-translate-y-2 transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg} rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110`} />
            <card.icon className={`w-12 h-12 ${card.color} mb-6`} />
            <h2 className="text-2xl font-bold mb-3 text-slate-900">{card.title}</h2>
            <p className="text-slate-600 mb-6 leading-relaxed font-medium">{card.desc}</p>
            <div className={`flex items-center gap-2 ${card.color} font-bold group-hover:gap-4 transition-all uppercase text-xs tracking-widest`}>
              {card.linkText}
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
}

function InfoIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
  );
}

function PhoneIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
  );
}
