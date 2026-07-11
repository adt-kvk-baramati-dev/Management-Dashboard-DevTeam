import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, MapPin, Users, AlertCircle, Sprout, Zap, Shield, TrendingUp, ArrowRight, CheckCircle } from "lucide-react";

const FEATURES = [
  { icon: Users,      title: "Farmer Database",       desc: "Comprehensive registry with detailed profiles, crop information, and contact details." },
  { icon: AlertCircle,title: "Complaint Management",  desc: "Multi-channel intake with smart routing, auto-classification, and status tracking." },
  { icon: MapPin,     title: "GIS Mapping",           desc: "Interactive maps for farmer distribution, field locations, and outreach coverage." },
  { icon: TrendingUp, title: "Analytics Dashboard",   desc: "Real-time analytics with district-wise, taluka-wise, and crop-wise statistics." },
  { icon: Sprout,     title: "Precision Agriculture", desc: "NDVI, EVI, and water stress monitoring with satellite data verification." },
  { icon: Shield,     title: "Role-Based Access",     desc: "Admin, Employee, and Domain Expert roles with customizable permissions." },
];

const FIELD_OPS = [
  "Field visit logging and documentation",
  "Employee activity tracking",
  "Random sampling and data collection",
  "Photo and evidence documentation",
];

const COMPLAINT_OPS = [
  "Multi-channel complaint intake (App, IoT, Satellite)",
  "Smart auto-classification and routing",
  "Timeline tracking and status updates",
  "Domain expert assignment and resolution",
];

const FOOTER_SCENE_IMAGES = [
  "/kvk-img-1.jpg",
  "/kvk-img-2.jpg",
  "/kvk-img-3.jpg",
];

export default function Index() {
  return (
    <div className="min-h-screen bg-[hsl(90_22%_97%)]">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-white/80 backdrop-blur-xl shadow-[0_1px_0_hsl(var(--border)/0.4)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Sprout className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[15px] font-bold text-foreground">AI ADT Foundation</span>
          </div>
          <Link to="/login">
            <Button className="h-9 rounded-xl px-5 text-sm font-semibold shadow-sm shadow-primary/20">
              Sign In <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-32 lg:px-8">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Agricultural Intelligence Platform
            </div>
            <h1 className="text-5xl font-bold leading-[1.1] text-foreground md:text-6xl">
              Agricultural<br />
              <span className="text-gradient">Intelligence</span><br />
              Command Center
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground max-w-lg">
              AI ADT Foundation modernizes agricultural advisory support — transforming KVK operations with real-time data, precision farming insights, and smart complaint management.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button className="h-11 rounded-xl px-6 text-sm font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="flex gap-8 pt-2">
              {[["10K+", "Farmers Registered"], ["500+", "Monthly Complaints"], ["98%", "Resolution Rate"]].map(([val, label]) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-primary">{val}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero card */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-primary/6 blur-3xl" />
            <div className="relative rounded-3xl border border-border/60 bg-white p-6 shadow-xl shadow-black/5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Live Operations</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { icon: BarChart3,  label: "Real-time Analytics",  sub: "Monitor operations live",       color: "bg-primary/10 text-primary" },
                  { icon: MapPin,     label: "GIS Mapping",           sub: "Location-based insights",       color: "bg-emerald-50 text-emerald-600" },
                  { icon: AlertCircle,label: "Smart Routing",         sub: "Auto-assign complaints",        color: "bg-amber-50 text-amber-600" },
                  { icon: Users,      label: "Farmer Registry",       sub: "10,000+ registered farmers",   color: "bg-blue-50 text-blue-600" },
                ].map(({ icon: Icon, label, sub, color }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/30 p-3.5 transition-all hover:border-primary/25 hover:bg-primary/4">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-y border-border/50 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="text-4xl font-bold text-foreground mb-3">Comprehensive Agricultural Management</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              All tools needed to manage farming operations, from complaint management to precision agriculture monitoring.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-border/50 bg-[hsl(90_22%_97%)] p-6 transition-all duration-300 hover:border-primary/30 hover:bg-white hover:shadow-lg hover:shadow-primary/6 hover:-translate-y-0.5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15 transition-all group-hover:bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-base font-bold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-bold text-foreground mb-3">Module Capabilities</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Specialized tools for managing every aspect of KVK operations.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { icon: Zap,         title: "Field Operations",    items: FIELD_OPS,      accent: "bg-primary/10 text-primary" },
            { icon: AlertCircle, title: "Complaint Workflows", items: COMPLAINT_OPS,  accent: "bg-amber-50 text-amber-600" },
          ].map(({ icon: Icon, title, items, accent }) => (
            <div key={title} className="rounded-2xl border border-border/50 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-6 flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-border/50 ${accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{title}</h3>
              </div>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Decorative image panel ── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-foreground">Visual Inspiration</h2>
          <p className="text-muted-foreground">Uniform scenic accents across product contexts and data dashboards.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FOOTER_SCENE_IMAGES.map((src, idx) => (
            <div key={src} className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg">
              <img
                src={src}
                alt={[
                  "Sunset over lush rice fields",
                  "Farmers checking crops with irrigation",
                  "Agricultural drone surveying green landscape",
                ][idx]}
                className="h-48 w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="py-20"
        style={{ background: "linear-gradient(135deg, hsl(116 55% 16%) 0%, hsl(116 48% 22%) 100%)" }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Operations?</h2>
          <p className="text-white/65 text-lg mb-8 max-w-xl mx-auto">
            Access the AI ADT Foundation platform to manage all aspects of agricultural advisory support.
          </p>
          <Link to="/login">
            <Button
              variant="secondary"
              className="h-11 rounded-xl px-8 text-sm font-semibold bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              Sign In Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="builder-footer py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20">
                <Sprout className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">AI ADT Foundation</span>
            </div>
            <p className="text-sm text-white/50">Agricultural Command Center for Krishi Vigyan Kendra</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
