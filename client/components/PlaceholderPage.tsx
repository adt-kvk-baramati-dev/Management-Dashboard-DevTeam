import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  backLink?: string;
  icon?: React.ReactNode;
}

export default function PlaceholderPage({
  title,
  description,
  backLink = "/",
  icon,
}: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {icon && <div className="mb-6 flex justify-center">{icon}</div>}
        
        <h1 className="text-4xl font-bold text-white mb-4">{title}</h1>
        
        {description && (
          <p className="text-slate-400 text-lg mb-8">{description}</p>
        )}

        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm mb-8">
          <MessageCircle className="w-8 h-8 text-emerald-400 mx-auto mb-4" />
          <p className="text-slate-300 mb-4">
            This page is ready to be developed. Continue prompting to fill in the complete module contents!
          </p>
          <p className="text-slate-500 text-sm">
            Share your requirements for this module in the chat to get started.
          </p>
        </div>

        <Link to={backLink}>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 w-full">
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </Link>
      </div>
    </div>
  );
}
