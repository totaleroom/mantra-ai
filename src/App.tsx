import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import Clients from "./pages/admin/Clients";
import DeviceManager from "./pages/admin/DeviceManager";
import KnowledgeBase from "./pages/admin/KnowledgeBase";
import Monitoring from "./pages/admin/Monitoring";
import Inbox from "./pages/admin/Inbox";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="clients" replace />} />
            <Route path="clients" element={<Clients />} />
            <Route path="devices" element={<DeviceManager />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="monitoring" element={<Monitoring />} />
            <Route path="inbox" element={<Inbox />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
