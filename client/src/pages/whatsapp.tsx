import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatInterface } from "@/components/whatsapp/chat-interface";
import { QrCode, MessageSquare, Settings, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const WHATSAPP_SERVER_URL = ""; // Usar rotas locais do ERP integrado

export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState("chat");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [whatsappMode, setWhatsappMode] = useState<"proxy" | "cloud">("proxy");
  const { toast } = useToast();

  // Função para verificar modo do WhatsApp
  const checkWhatsAppMode = async () => {
    try {
      const response = await fetch(`/api/whatsapp/mode`, { 
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWhatsappMode(data.mode === 'cloud' ? 'cloud' : 'proxy');
        console.log('WhatsApp mode:', data.mode);
      }
    } catch (error) {
      console.warn('Failed to fetch WhatsApp mode:', error);
    }
  };

  // Função para verificar status do servidor
  const checkWhatsAppStatus = async () => {
    try {
      setIsChecking(true);
      
      // Verificar modo primeiro
      await checkWhatsAppMode();
      
      // Adicionar timeout e retry para melhor confiabilidade
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout
      
      const response = await fetch(`/api/whatsapp/status`, { 
        cache: 'no-store',
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      const status = typeof data.status === 'string' ? data.status.toLowerCase() : 'offline';
      const isReady = data.ready === true;
      
      console.log('WhatsApp server status:', data.status);
      
      if (status === 'conectado' || status.includes('pronto') || isReady) {
        setConnectionStatus("connected");
        setQrCodeUrl(null);
      } else if (whatsappMode === 'cloud') {
        // Para Cloud API, não há QR code - pode estar desconectado ou sem credenciais
        setConnectionStatus(status.includes('erro') ? "offline" : "disconnected");
        setQrCodeUrl(null);
      } else if (status.includes('aguardando') || status.includes('qr code')) {
        setConnectionStatus("disconnected");
        await fetchQRCode();
      } else {
        setConnectionStatus("disconnected");
        await fetchQRCode();
      }
    } catch (error: any) {
      console.warn('WhatsApp status check failed:', error?.name || error?.message);
      
      // Não mostrar toast a cada falha para evitar spam
      if (error?.name !== 'AbortError') {
        setConnectionStatus("offline");
        setQrCodeUrl(null);
      }
      
      // Só mostrar toast se for uma falha persistente (não timeout)
      if (error?.message && !error?.message.includes('fetch') && error?.name !== 'AbortError') {
        toast({
          title: "Servidor WhatsApp temporariamente indisponível",
          description: "Tentando reconectar automaticamente...",
          variant: "destructive"
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Função para buscar QR Code
  const fetchQRCode = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
      
      const response = await fetch(`/api/whatsapp/qr`, { 
        cache: 'no-store',
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.qrCode) {
          setQrCodeUrl(data.qrCode);
          console.log('QR Code atualizado com sucesso');
          
          // Atualizar status se disponível na resposta
          if (data.status) {
            const status = data.status.toLowerCase();
            if (status.includes('aguardando') || status.includes('qr code')) {
              setConnectionStatus("disconnected");
            }
          }
        } else if (data.needsReconnection) {
          console.log('Processo de reconexão iniciado...');
          toast({
            title: "Iniciando reconexão",
            description: "Aguarde alguns segundos para o QR Code aparecer...",
          });
          // Verificar status novamente em alguns segundos
          setTimeout(() => {
            checkWhatsAppStatus();
          }, 5000);
        }
      } else {
        console.warn('QR endpoint returned:', response.status);
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.warn('Failed to fetch QR code:', error?.name || error?.message);
      }
    }
  };

  // Função para reconectar WhatsApp
  const reconnectWhatsApp = async () => {
    try {
      setIsChecking(true);
      
      const response = await fetch('/api/whatsapp/reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Reconexão iniciada",
          description: data.message,
        });
        
        // Limpar QR code atual e aguardar alguns segundos
        setQrCodeUrl(null);
        setConnectionStatus("connecting");
        
        // Verificar status após reconexão
        setTimeout(() => {
          checkWhatsAppStatus();
        }, 8000);
      } else {
        toast({
          title: "Erro na reconexão",
          description: data.message || "Erro ao iniciar reconexão",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro ao reconectar:', error);
      toast({
        title: "Erro na reconexão",
        description: "Falha ao conectar com o servidor",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Polling para verificar status periodicamente
  useEffect(() => {
    checkWhatsAppStatus();
    const interval = setInterval(checkWhatsAppStatus, 10000); // Verifica a cada 10 segundos (reduzido para evitar sobrecarga)
    
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800">
            <div className="w-2 h-2 bg-[hsl(var(--secondary))] rounded-full animate-pulse mr-2"></div>
            Conectado
          </Badge>
        );
      case "connecting":
        return (
          <Badge className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse mr-2"></div>
            Conectando
          </Badge>
        );
      case "offline":
        return (
          <Badge variant="destructive">
            Servidor Offline
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Desconectado
          </Badge>
        );
    }
  };

  return (
    <div className="p-8" data-testid="whatsapp-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-whatsapp-title">WhatsApp Business</h1>
          <p className="text-muted-foreground mt-2">Central de atendimento e comunicação</p>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge()}
          <Button 
            variant="secondary" 
            onClick={() => setActiveTab("config")}
            data-testid="button-qr-code"
          >
            <QrCode className="w-4 h-4 mr-2" />
            QR Code
          </Button>
          <Button 
            variant="outline" 
            onClick={checkWhatsAppStatus}
            disabled={isChecking}
            data-testid="button-refresh-status"
          >
            {isChecking ? "Verificando..." : "Atualizar Status"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === "chat" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("chat")}
            data-testid="tab-chat"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Atendimento
          </Button>
          <Button
            variant={activeTab === "config" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("config")}
            data-testid="tab-config"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Configurações
          </Button>
          <Button
            variant={activeTab === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("kanban")}
            data-testid="tab-kanban"
          >
            <Settings className="w-4 h-4 mr-2" />
            CRM - Kanban
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "chat" && (
        <ChatInterface />
      )}

      {activeTab === "config" && (
        <Card data-testid="card-config">
          <CardHeader>
            <CardTitle>Configurações do WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              
              {/* Modo do WhatsApp */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Modo de Conexão</h4>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={whatsappMode === 'cloud' ? 'default' : 'secondary'}>
                      {whatsappMode === 'cloud' ? '🌩️ Cloud API Oficial' : '🔗 Servidor Externo'}
                    </Badge>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {whatsappMode === 'cloud' 
                        ? 'API oficial do Meta Business - Sem QR Code necessário'
                        : 'Servidor proxy externo - Requer QR Code para autenticação'
                      }
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const newMode = whatsappMode === 'cloud' ? 'proxy' : 'cloud';
                        const response = await apiRequest(`/api/whatsapp/switch-mode`, {
                          method: 'POST',
                          body: JSON.stringify({ mode: newMode }),
                          headers: { 'Content-Type': 'application/json' }
                        });
                        
                        if (response.ok) {
                          setWhatsappMode(newMode);
                          toast({
                            title: "Modo alterado",
                            description: `WhatsApp alterado para ${newMode === 'cloud' ? 'Cloud API Oficial' : 'Servidor Externo'}`,
                          });
                          // Recarregar status após mudança
                          fetchWhatsAppStatus();
                        } else {
                          const error = await response.json();
                          toast({
                            title: "Erro ao alterar modo",
                            description: error.error || "Erro desconhecido",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Erro",
                          description: "Erro ao alterar modo do WhatsApp",
                          variant: "destructive",
                        });
                      }
                    }}
                    data-testid="button-switch-mode"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Alternar para {whatsappMode === 'cloud' ? 'Proxy' : 'Cloud API'}
                  </Button>
                </div>
              </div>

              {/* Status */}
              <div className="text-center py-6">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  connectionStatus === 'connected' ? 'bg-green-100 text-green-600' :
                  connectionStatus === 'offline' ? 'bg-red-100 text-red-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  {whatsappMode === 'cloud' ? <Settings className="w-8 h-8" /> : <QrCode className="w-8 h-8" />}
                </div>
                
                <h3 className="text-lg font-semibold mb-2" data-testid="text-whatsapp-status">
                  Status: {connectionStatus === "connected" ? "✅ Conectado" : 
                          connectionStatus === "offline" ? "❌ Servidor Offline" :
                          whatsappMode === 'cloud' ? "⚠️ Não Conectado" :
                          qrCodeUrl ? "📱 Aguardando escaneamento do QR Code" : "❌ Desconectado"}
                </h3>

                {/* Cloud API - Sem QR Code */}
                {whatsappMode === 'cloud' && (
                  <div className="space-y-4">
                    {connectionStatus === "connected" ? (
                      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                        <p className="text-green-700 dark:text-green-300">
                          WhatsApp Business Cloud API está conectado e funcionando normalmente.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                        <p className="text-yellow-700 dark:text-yellow-300">
                          Verifique as credenciais da API no Meta Business Manager.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Proxy Mode - Com QR Code */}
                {whatsappMode === 'proxy' && connectionStatus !== "connected" && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Para conectar ou reconectar, escaneie o QR Code abaixo.
                    </p>
                    <div className="bg-muted p-8 rounded-lg inline-block">
                      <div className="w-64 h-64 bg-white border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
                        {qrCodeUrl ? (
                          <img 
                            src={qrCodeUrl} 
                            alt="WhatsApp QR Code" 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center">
                            <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {isChecking ? "Carregando..." : "QR Code aparecerá aqui"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex gap-2 flex-wrap justify-center mt-6">
                  {whatsappMode === 'proxy' && (
                    <>
                      <Button 
                        onClick={fetchQRCode}
                        disabled={isChecking}
                        data-testid="button-generate-qr"
                      >
                        {isChecking ? "Carregando..." : "Gerar Novo QR Code"}
                      </Button>
                      <Button 
                        onClick={reconnectWhatsApp}
                        disabled={isChecking}
                        variant="secondary"
                        data-testid="button-reconnect"
                      >
                        {isChecking ? "Conectando..." : "Reconectar WhatsApp"}
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="outline"
                    onClick={checkWhatsAppStatus}
                    disabled={isChecking}
                    data-testid="button-check-status"
                  >
                    Verificar Status
                  </Button>
                </div>
              </div>

              {/* Seção quando conectado */}
              {connectionStatus === "connected" && (
                <div className="space-y-4">
                  <p className="text-emerald-600 font-semibold">✅ WhatsApp conectado com sucesso!</p>
                  <p className="text-sm text-muted-foreground">
                    O WhatsApp Business está operacional. Você pode usar a aba "Atendimento" para gerenciar conversas.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        toast({
                          title: "Desconectando...",
                          description: "Para desconectar, reinicie o servidor WhatsApp",
                        });
                      }}
                      data-testid="button-disconnect"
                    >
                      Instruções para Desconectar
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={checkWhatsAppStatus}
                      disabled={isChecking}
                    >
                      Atualizar Status
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "kanban" && (
        <Card data-testid="card-kanban">
          <CardHeader>
            <CardTitle>CRM - Kanban</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">CRM - Kanban</h3>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
