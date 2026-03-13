import { Link } from "react-router-dom";
import { ArrowLeft, Sprout, Droplets, FlaskConical, Calendar } from "lucide-react";

export default function CropGuidance() {
  const crops = [
    {
      name: "Sugarcane Cultivation",
      soil: "Deep rich loamy soil",
      water: "Regular irrigation",
      fertilizer: "Nitrogen and organic manure",
      season: "Annual crop",
      image: "/images/crops/sugarcane.png"
    },
    {
      name: "Maize Cultivation",
      soil: "Well-drained loamy soil",
      water: "Moderate irrigation",
      fertilizer: "Nitrogen and Phosphorus",
      season: "Kharif",
      image: "/images/crops/maize.png"
    },
    {
      name: "Rice Cultivation",
      soil: "Clayey loam soil",
      water: "High water requirement",
      fertilizer: "NPK fertilizers",
      season: "Kharif",
      image: "/images/crops/rice.png"
    }
  ];

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-extrabold title mb-2">🌾 Crop Guidance</h1>
          <p className="text-slate-500 font-medium text-lg">Best Practices for Healthy & Productive Farming</p>
        </div>
        <Link to="/" className="btn btn-secondary">
          <ArrowLeft className="w-5 h-5" /> Back Home
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {crops.map((crop, idx) => (
          <div key={idx} className="glass-panel overflow-hidden group">
            <div className="h-56 relative overflow-hidden">
              <img
                src={crop.image}
                alt={crop.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <h2 className="absolute bottom-4 left-6 text-2xl font-bold text-white uppercase tracking-tight">
                {crop.name}
              </h2>
            </div>

            <div className="p-8 space-y-4">
              <GuidanceRow icon={<Sprout className="w-5 h-5" />} color="bg-emerald-100 text-emerald-600" label="Soil Requirement" value={crop.soil} />
              <GuidanceRow icon={<Droplets className="w-5 h-5" />} color="bg-blue-100 text-blue-600" label="Water Management" value={crop.water} />
              <GuidanceRow icon={<FlaskConical className="w-5 h-5" />} color="bg-amber-100 text-amber-600" label="Fertilizer Guide" value={crop.fertilizer} />
              <GuidanceRow icon={<Calendar className="w-5 h-5" />} color="bg-slate-100 text-slate-600" label="Sowing Season" value={crop.season} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuidanceRow({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
        <p className="text-slate-800 font-medium">{value}</p>
      </div>
    </div>
  );
}
