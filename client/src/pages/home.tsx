import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import Sales from "@/pages/sales";
import Financial from "@/pages/financial";
import Banking from "@/pages/banking";
import ChartOfAccounts from "@/pages/chart-of-accounts";
import Clients from "@/pages/clients";
import Suppliers from "@/pages/suppliers";
import WhatsApp from "@/pages/whatsapp";
import Settings from "@/pages/settings";

export default function Home() {
  const [location] = useLocation();

  const renderContent = () => {
    switch (location) {
      case "/sales":
        return <Sales />;
      case "/financial":
        return <Financial />;
      case "/banking":
        return <Banking />;
      case "/chart-of-accounts":
        return <ChartOfAccounts />;
      case "/clients":
        return <Clients />;
      case "/suppliers":
        return <Suppliers />;
      case "/whatsapp":
        return <WhatsApp />;
      case "/settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background" data-testid="layout-main">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background">
        {renderContent()}
      </main>
    </div>
  );
}
