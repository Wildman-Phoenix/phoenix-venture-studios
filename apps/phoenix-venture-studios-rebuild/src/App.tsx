import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Index from "./pages/Index";
import FundingPath from "./pages/FundingPath";
import VentureSnapshot from "./pages/VentureSnapshot";
import About from "./pages/About";
import Contact from "./pages/Contact";
import SigmaFunding from "./pages/SigmaFunding";
import PreferredFunding from "./pages/PreferredFunding";
import MarketIntelligence from "./pages/MarketIntelligence";
import AiOverview from "./pages/AiOverview";
import StudioServices from "./pages/StudioServices";
import FounderSignal from "./pages/FounderSignal";
import FounderSignalDetail from "./pages/FounderSignalDetail";
import IntelligenceEntry from "./pages/IntelligenceEntry";
import CallConfirmed from "./pages/CallConfirmed";
import Unsubscribe from "./pages/Unsubscribe";
import FounderSignalPreferences from "./pages/FounderSignalPreferences";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

const queryClient = new QueryClient();
const routerBaseName = import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={routerBaseName}>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/funding" element={<FundingPath />} />
              <Route path="/snapshot" element={<VentureSnapshot />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/sigma-funding" element={<SigmaFunding />} />
              <Route path="/preferred-funding" element={<PreferredFunding />} />
              <Route path="/market-intelligence" element={<MarketIntelligence />} />
              <Route path="/insights" element={<Navigate to="/market-intelligence" replace />} />
              <Route path="/ai-overview" element={<AiOverview />} />
              <Route path="/studio" element={<StudioServices />} />
              <Route path="/founder-signal" element={<FounderSignal />} />
              <Route path="/founder-signal/signals/:slug" element={<FounderSignalDetail />} />
              <Route path="/intelligence/:slug" element={<IntelligenceEntry />} />
              <Route path="/call-confirmed" element={<CallConfirmed />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/founder-signal/preferences" element={<FounderSignalPreferences />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
