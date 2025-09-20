import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatInterface } from "@/components/whatsapp/chat-interface";
import { QrCode, MessageSquare, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WHATSAPP_SERVER_URL = "https://mondial-whatsapp-server.onrender.com";

export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState("chat");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  // Função para verificar status do servidor
  const checkWhatsAppStatus = async () => {
    try {
      setIsChecking(true);
      const response = await fetch(`${WHATSAPP_SERVER_URL}/status`, { 
        cache: 'no-store',
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Server not responding');
      }
      
      const data = await response.json();
      const status = typeof data.status === 'string' ? data.status.toLowerCase() : 'offline';
      const isReady = data.ready === true;
      
      console.log('WhatsApp server status:', data.status); // Debug log
      
      if (status === 'conectado' || status.includes('conectado') || isReady) {
        setConnectionStatus("connected");
        setQrCodeUrl(null);
      } else if (status.includes('aguardando') || status.includes('qr code')) {
        setConnectionStatus("disconnected");
        await fetchQRCode();
      } else {
        setConnectionStatus("offline");
      }
    } catch (error) {
      console.warn('WhatsApp status check failed:', error);
      setConnectionStatus("offline");
      setQrCodeUrl(null);
      toast({
        title: "Servidor WhatsApp indisponível",
        description: "Verifique se o servidor está rodando",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Função para buscar QR Code
  const fetchQRCode = async () => {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/qr`, { 
        cache: 'no-store',
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.qrCode) {
          setQrCodeUrl(data.qrCode);
          // Atualizar status se disponível na resposta
          if (data.status) {
            const status = data.status.toLowerCase();
            if (status.includes('aguardando') || status.includes('qr code')) {
              setConnectionStatus("disconnected");
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch QR code:', error);
    }
  };

  // Polling para verificar status periodicamente
  useEffect(() => {
    checkWhatsAppStatus();
    const interval = setInterval(checkWhatsAppStatus, 5000); // Verifica a cada 5 segundos
    
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
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
            <div className="text-center py-8">
              <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-whatsapp-status">
                Status: {connectionStatus === "connected" ? "Conectado" : 
                        connectionStatus === "offline" ? "Servidor Offline" :
                        qrCodeUrl ? "Aguardando escaneamento do QR Code" : "Desconectado"}
              </h3>
              {connectionStatus !== "connected" && (
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
                  <div className="flex gap-2">
                    <Button 
                      onClick={fetchQRCode}
                      disabled={isChecking}
                      data-testid="button-generate-qr"
                    >
                      {isChecking ? "Carregando..." : "Gerar Novo QR Code"}
                    </Button>
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
              )}
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
