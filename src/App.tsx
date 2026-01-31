import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LeadPopup360 } from "@/components/LeadPopup360";
import { useLeadListener360 } from "@/hooks/useLeadListener360";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Dashboard360 from "./pages/Dashboard360";
import Leads360 from "./pages/Leads360";
import ContactosDirectus from "./pages/ContactosDirectus";
import Pipeline from "./pages/Pipeline";
import Fornecedores from "./pages/Fornecedores";
import Integracoes from "./pages/Integracoes";
import Definicoes from "./pages/Definicoes";
import UtilizadoresDirectus from "./pages/UtilizadoresDirectus";
import MenuMobile from "./pages/MenuMobile";
import NotFound from "./pages/NotFound";
import Orcamentos from "./pages/Orcamentos";
import Newsletter from "./pages/Newsletter";
import Newsletter360 from "./pages/Newsletter360";
import Agenda from "./pages/Agenda";

const queryClient = new QueryClient();

const AppContent = () => {
  const { incomingLead, isVisible: leadVisible, dismissLead } = useLeadListener360();

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/contactos" element={<ProtectedRoute><ContactosDirectus /></ProtectedRoute>} />
        {/* Directus Card360 is now the default “Novo contacto” flow */}
        <Route path="/contactos/novo" element={<ProtectedRoute><Dashboard360 /></ProtectedRoute>} />
        <Route path="/dashboard360/:id" element={<ProtectedRoute><Dashboard360 /></ProtectedRoute>} />
        <Route path="/dashboard360" element={<ProtectedRoute><Dashboard360 /></ProtectedRoute>} />
        <Route path="/leads360" element={<ProtectedRoute><Leads360 /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
        <Route path="/orcamentos" element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
        <Route path="/newsletter" element={<ProtectedRoute><Newsletter /></ProtectedRoute>} />
        <Route path="/newsletter/:id" element={<ProtectedRoute><Newsletter360 /></ProtectedRoute>} />
        <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
        <Route path="/integracoes" element={<ProtectedRoute><Integracoes /></ProtectedRoute>} />
        <Route path="/definicoes" element={<ProtectedRoute><Definicoes /></ProtectedRoute>} />
        <Route path="/utilizadores" element={<ProtectedRoute><UtilizadoresDirectus /></ProtectedRoute>} />
        <Route path="/menu" element={<ProtectedRoute><MenuMobile /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {incomingLead && (
        <LeadPopup360
          lead={incomingLead}
          isVisible={leadVisible}
          onDismiss={dismissLead}
        />
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;