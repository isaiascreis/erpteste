import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  BellDot, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  X,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Notification {
  id: number;
  userId: string;
  vendaId?: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  status: string;
  prioridade: string;
  dataVencimento?: string;
  createdAt: string;
  updatedAt: string;
}

export function NotificationBar() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications?unreadOnly=true"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = notifications?.length || 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("PUT", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ["/api/notifications?unreadOnly=true"] });
    },
    onError: (error) => {
      console.error("Error marking notification as read:", error);
    },
  });

  const markAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const getNotificationIcon = (tipo: string, prioridade: string) => {
    switch (tipo) {
      case "comissao":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case "tarefa":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "vencimento":
        return <Calendar className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertCircle className={cn(
          "h-4 w-4",
          prioridade === "alta" || prioridade === "urgente" ? "text-red-600" : "text-gray-600"
        )} />;
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case "urgente":
        return "border-l-red-500 bg-red-50";
      case "alta":
        return "border-l-orange-500 bg-orange-50";
      case "media":
        return "border-l-yellow-500 bg-yellow-50";
      default:
        return "border-l-blue-500 bg-blue-50";
    }
  };

  return (
    <div className="relative" data-testid="notification-bar">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        data-testid="button-notification-toggle"
      >
        {unreadCount > 0 ? (
          <BellDot className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
            data-testid="text-notification-count"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-96 shadow-lg z-50" data-testid="card-notifications-list">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Notificações</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-notifications"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="max-h-96">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Carregando notificações...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhuma notificação pendente
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {notifications.map((notification: Notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "border-l-4 p-3 rounded-r-md cursor-pointer transition-colors hover:bg-gray-50",
                        getPriorityColor(notification.prioridade)
                      )}
                      onClick={() => markAsRead(notification.id)}
                      data-testid={`notification-item-${notification.id}`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.tipo, notification.prioridade)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate" data-testid={`text-notification-title-${notification.id}`}>
                              {notification.titulo}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {notification.tipo === "comissao" ? "Comissão" :
                               notification.tipo === "tarefa" ? "Tarefa" :
                               notification.tipo === "vencimento" ? "Vencimento" : "Sistema"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-notification-message-${notification.id}`}>
                            {notification.mensagem}
                          </p>
                          {notification.sale && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Venda: {notification.sale.numero}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                            {notification.dataVencimento && (
                              <p className="text-xs text-orange-600 font-medium">
                                Vence: {format(new Date(notification.dataVencimento), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {notifications.length > 0 && (
              <>
                <Separator />
                <div className="p-3 text-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs"
                    data-testid="button-view-all-notifications"
                  >
                    Ver todas as notificações
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}