import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LeadPopup360 } from "@/components/LeadPopup360";
import { useLeadListener360 } from "@/hooks/useLeadListener360";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import Inbox from "./pages/Inbox";
import Contactos from "./pages/Contactos";
import ContactoDetalhe from "./pages/ContactoDetalhe";
import ContactoNovo from "./pages/ContactoNovo";
import Fornecedores from "./pages/Fornecedores";
import Utilizadores from "./pages/Utilizadores";
import Definicoes from "./pages/Definicoes";
import Integracoes from "./pages/Integracoes";
import Dashboard360 from "./pages/Dashboard360";
import Leads360 from "./pages/Leads360";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { incomingLead, isVisible: leadVisible, dismissLead } = useLeadListener360();

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
        <Route path="/contactos" element={<ProtectedRoute><Contactos /></ProtectedRoute>} />
        <Route path="/contactos/novo" element={<ProtectedRoute><ContactoNovo /></ProtectedRoute>} />
        <Route path="/contactos/:id" element={<ProtectedRoute><ContactoDetalhe /></ProtectedRoute>} />
        <Route path="/dashboard360/:id" element={<ProtectedRoute><Dashboard360 /></ProtectedRoute>} />
        <Route path="/dashboard360" element={<ProtectedRoute><Dashboard360 /></ProtectedRoute>} />
        <Route path="/leads360" element={<ProtectedRoute><Leads360 /></ProtectedRoute>} />
        <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
        <Route path="/utilizadores" element={<ProtectedRoute><Utilizadores /></ProtectedRoute>} />
        <Route path="/definicoes" element={<ProtectedRoute><Definicoes /></ProtectedRoute>} />
        <Route path="/integracoes" element={<ProtectedRoute><Integracoes /></ProtectedRoute>} />
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