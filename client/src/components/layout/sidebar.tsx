import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { NotificationBar } from "@/components/notifications/notification-bar";
import { 
  Plane, 
  BarChart3, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Truck, 
  MessageSquare, 
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import mondialLogo from "@/assets/mondial-turismo-logo.png";

export function Sidebar() {
  const [location] = useLocation();
  // TEMPORARIAMENTE REMOVIDO - Sistema sem login
  // const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Usuário fictício para exibição temporária
  const user = { username: "Usuário", firstName: "Sistema", lastName: "Turismo" };

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Vendas & Orçamentos", href: "/sales", icon: ShoppingCart },
    { name: "Financeiro", href: "/financial", icon: DollarSign },
    { name: "Clientes", href: "/clients", icon: Users },
    { name: "Fornecedores", href: "/suppliers", icon: Truck },
    { name: "WhatsApp", href: "/whatsapp", icon: MessageSquare },
    { name: "Configurações", href: "/settings", icon: Settings },
  ];

  // LOGOUT TEMPORARIAMENTE REMOVIDO - Sistema sem login
  const handleLogout = async () => {
    console.log('Logout não implementado - sistema sem login');
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsCollapsed(!isCollapsed)}
        data-testid="button-mobile-menu"
      >
        {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <aside 
        className={cn(
          "sidebar fixed lg:relative top-0 left-0 z-40 transition-transform duration-300",
          isCollapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0"
        )}
        data-testid="sidebar"
      >
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center">
                <img 
                  src={mondialLogo} 
                  alt="Mondial Turismo"
                  className="h-8 w-auto object-contain" 
                  data-testid="logo-mondial-turismo"
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-sidebar-foreground sr-only" data-testid="text-app-title">
                  Mondial Turismo
                </h1>
                <p className="text-sm text-muted-foreground">Sistema ERP</p>
              </div>
            </div>
            <NotificationBar />
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2" data-testid="nav-menu">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-sm font-medium transition-colors",
                    isActive 
                      ? "nav-active text-primary-foreground" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                  {item.name === "WhatsApp" && (
                    <span className="ml-auto w-2 h-2 bg-[hsl(var(--secondary))] rounded-full animate-pulse" data-testid="whatsapp-status"></span>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 p-4 border-t border-sidebar-border w-full bg-sidebar">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="text-muted-foreground text-sm font-medium">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.role === "admin" ? "Administrador" : "Usuário"}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsCollapsed(true)}
          data-testid="sidebar-overlay"
        />
      )}
    </>
  );
}
