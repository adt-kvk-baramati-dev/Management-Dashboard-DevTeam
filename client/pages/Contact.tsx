import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Globe } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center bg-slate-50">
      <div className="max-w-4xl w-full">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-extrabold title">Contact Us</h1>
          <Link to="/" className="btn btn-secondary">
            <ArrowLeft className="w-5 h-5" /> Back Home
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-10 space-y-8">
            <h2 className="text-2xl font-bold text-slate-800">Get in Touch</h2>
            <div className="space-y-6">
              <ContactItem icon={<Mail className="w-6 h-6" />} color="bg-emerald-100 text-emerald-600" label="Email Support" value="support@kvk-farmers.in" />
              <ContactItem icon={<Phone className="w-6 h-6" />} color="bg-blue-100 text-blue-600" label="Call Center" value="+91 1800-123-4567" />
              <ContactItem icon={<MapPin className="w-6 h-6" />} color="bg-slate-100 text-slate-600" label="Headquarters" value="Krishi Vigyan Kendra, Kolhapur" />
            </div>
          </div>

          <div className="glass-panel p-10 bg-emerald-900 text-white border-emerald-800">
            <h2 className="text-2xl font-bold mb-6">Regional Offices</h2>
            <ul className="space-y-4 opacity-90 text-emerald-100">
              <li className="flex justify-between border-b border-emerald-800 pb-2"><span>Pune District</span><span>+91 98765 43210</span></li>
              <li className="flex justify-between border-b border-emerald-800 pb-2"><span>Sangli District</span><span>+91 98765 43211</span></li>
              <li className="flex justify-between border-b border-emerald-800 pb-2"><span>Satara District</span><span>+91 98765 43212</span></li>
            </ul>
            <div className="mt-12 flex items-center gap-4 text-emerald-300">
              <Globe className="w-6 h-6" />
              <p className="font-bold underline cursor-pointer">www.kvk-portal.in</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactItem({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
