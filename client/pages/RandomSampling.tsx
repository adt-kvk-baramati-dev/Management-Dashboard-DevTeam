import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Map, Upload, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RandomSampling() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const mapSections = [
    { id: "ndvi", title: "NDVI Map" },
    { id: "evi", title: "EVI Map" },
    { id: "crop_stress", title: "Crop Stress" },
    { id: "water_watch", title: "Water Watch" },
    { id: "early_growth", title: "Early Growth" },
    { id: "vra", title: "VRA Map" },
    { id: "mmc", title: "Irrigation (MMC)" },
    { id: "fasal", title: "Irrigation (Fasal)" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    }, 1500);
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
            Random Sampling
          </h1>
          <p className="text-muted-foreground font-medium">
            Satellite Map Feedback & Ground Reality Check
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/">
            <ArrowLeft className="w-5 h-5" /> Back Home
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-10 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input
              label="PRN Number"
              type="text"
              placeholder="e.g. 20261001"
              required
            />
            <Input
              label="Farmer Name"
              type="text"
              placeholder="Ground reality name..."
              required
            />
            <Input label="District" type="text" required />
            <Input label="Plantation Date" type="date" required />
          </div>

          <div className="h-px bg-slate-100 w-full my-10" />

          <div className="space-y-12">
            {mapSections.map((section) => (
              <div
                key={section.id}
                className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-8 items-start"
              >
                <div className="w-full md:w-1/3 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Map className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {section.title}
                    </h3>
                  </div>
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-[#e8eee2] hover:border-emerald-500 transition-all text-slate-400">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">
                      Upload Screenshot
                    </span>
                    <input type="file" className="hidden" />
                  </label>
                </div>
                <div className="w-full md:w-2/3 space-y-4">
                  <input
                    placeholder="Interpretation (e.g. High NDVI observed)"
                    className="w-full p-4 rounded-xl border border-slate-200 bg-[#e8eee2]"
                  />
                  <textarea
                    placeholder="Ground reality feedback / Notes..."
                    className="w-full p-4 rounded-xl border border-slate-200 bg-[#e8eee2]"
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-start gap-4">
            <Info className="w-5 h-5 text-emerald-600 mt-0.5" />
            <p className="text-emerald-800 text-sm">
              Your feedback is used to calibrate satellite data. Please ensure
              the PRN number is accurate.
            </p>
          </div>

          {success && (
            <div className="p-4 bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-bold">
                Sampling Data Saved Successfully!
              </span>
            </div>
          )}

          <Button
            disabled={loading}
            type="submit"
            size="lg"
            className="w-full h-14 text-lg rounded-xl"
          >
            {loading ? "Saving Records..." : "Submit Final Feedback"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  type,
  placeholder,
  required,
}: {
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700 uppercase">
        {label}
      </label>
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        className="w-full p-4 rounded-xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
      />
    </div>
  );
}
