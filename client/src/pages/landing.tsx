import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plane, Users, DollarSign, MessageSquare, LogIn } from "lucide-react";

export default function Landing() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 Iniciando login...", { username, password: "***" });
    setIsLoading(true);

    try {
      console.log("🔄 Fazendo requisição de login...");
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Importante para que o cookie seja armazenado
        body: JSON.stringify({ username, password }),
      });

      console.log("📡 Response status:", response.status);
      const data = await response.json();
      console.log("📄 Response data:", data);

      if (response.ok) {
        console.log("✅ Login sucesso, mostrando toast...");
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo, ${data.user.username}!`,
        });
        
        console.log("🔄 Invalidando cache...");
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        console.log("🔄 Forçando refetch...");
        await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        
        console.log("⏱️ Aguardando cache atualizar...");
        setTimeout(async () => {
          console.log("🔍 Verificando se usuário está autenticado...");
          const userCheck = await fetch('/api/auth/user', { credentials: 'include' });
          console.log("👤 User check status:", userCheck.status);
          if (userCheck.ok) {
            const userData = await userCheck.json();
            console.log("👤 User data:", userData);
            console.log("🔄 Forçando nova verificação...");
            window.location.reload(); // Como último recurso
          }
        }, 500);
      } else {
        console.log("❌ Login falhou:", data.message);
        toast({
          title: "Erro no login",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("💥 Erro no login:", error);
      toast({
        title: "Erro no login",
        description: "Erro ao conectar com o servidor",
        variant: "destructive",
      });
    } finally {
      console.log("🏁 Finalizando login...");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
              <Plane className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">Mondial Turismo</h1>
              <p className="text-xl text-muted-foreground">Sistema ERP</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Gerencie sua agência de turismo com eficiência. Vendas, financeiro, clientes e WhatsApp integrados em uma única plataforma.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="card-feature-sales">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center mx-auto">
                  <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-foreground">Vendas & Orçamentos</h3>
                <p className="text-sm text-muted-foreground">
                  Gestão completa de vendas com controle de serviços, passageiros e comissões
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-financial">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-foreground">Financeiro</h3>
                <p className="text-sm text-muted-foreground">
                  Contas a pagar e receber com controle bancário e liquidação automática
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-clients">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-foreground">Clientes</h3>
                <p className="text-sm text-muted-foreground">
                  Cadastro completo de clientes com histórico de viagens e preferências
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-whatsapp">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-foreground">WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  Integração completa com WhatsApp Business para atendimento em tempo real
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Login Card */}
        <Card className="max-w-md mx-auto" data-testid="card-login">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center space-x-2">
              <LogIn className="w-5 h-5" />
              <span>Acesse sua conta</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  required
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  data-testid="input-password"
                />
              </div>
              <Button 
                type="submit"
                className="w-full" 
                size="lg"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Entrando..." : "Entrar no Sistema"}
              </Button>
            </form>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                <strong>Credenciais padrão:</strong><br/>
                Usuário: <code>admin</code> | Senha: <code>admin123</code><br/>
                Usuário: <code>turismo</code> | Senha: <code>turismo2024</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
