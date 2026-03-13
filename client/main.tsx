import "./global.css";
import "./styles/react-theme.css";

import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/AuthProvider";
import NavBar from "./components/NavBar";

console.log("Main.tsx loaded");

const queryClient = new QueryClient();

const Root = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <NavBar />
          <App />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const root = createRoot(document.getElementById("root")!);
root.render(<Root />);
