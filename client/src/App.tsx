import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function Router() {
  // TEMPORARIAMENTE REMOVIDO - Sistema sem login
  // const { isAuthenticated, isLoading, user } = useAuth();
  // console.log("🔄 Router state:", { isAuthenticated, isLoading, user });

  return (
    <Switch>
      {/* ACESSO DIRETO AO SISTEMA - SEM LOGIN */}
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Home} />
      <Route path="/sales" component={Home} />
      <Route path="/financial" component={Home} />
      <Route path="/banking" component={Home} />
      <Route path="/chart-of-accounts" component={Home} />
      <Route path="/clients" component={Home} />
      <Route path="/suppliers" component={Home} />
      <Route path="/whatsapp" component={Home} />
      <Route path="/settings" component={Home} />
      
      {/* PÁGINA DE LOGIN COMENTADA PARA USO FUTURO */}
      {/* <Route path="/login" component={Landing} /> */}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
