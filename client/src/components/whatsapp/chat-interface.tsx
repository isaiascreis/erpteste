import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  MessageSquare, 
  Search, 
  Smile, 
  Paperclip, 
  Mic, 
  MicOff,
  Send, 
  Phone,
  Video,
  MoreVertical,
  User,
  Loader2,
  Plus,
  UserPlus,
  MapPin,
  Mail,
  Calendar,
  Tag,
  Clock,
  UserCheck,
  Building2,
  ChevronDown,
  Settings,
  Star,
  Archive,
  Users
} from "lucide-react";

interface Message {
  id: number;
  conversationId: number;
  messageId: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  content: string;
  mediaUrl?: string;
  fromMe: boolean;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'received';
  createdAt: string;
  sentByUserId?: string;
}

interface Conversation {
  id: number;
  phone: string;
  name: string;
  avatar?: string;
  lastMessageTime?: string;
  createdAt: string;
  lastMessage?: {
    content: string;
    fromMe: boolean;
    timestamp: string;
  };
  unreadCount?: number;
  assignedUserId?: string;
  isAssigned?: boolean;
  departmentId?: string;
  priority?: 'normal' | 'high' | 'urgent';
  tags?: string[];
  clientId?: number;
  client?: {
    id: number;
    nome: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
  };
}

interface User {
  id: string;
  email: string;
  nome: string;
  systemRole: string;
}

// Schema para novo contato
const newContactSchema = z.object({
  phone: z.string()
    .min(10, "Número deve ter pelo menos 10 dígitos")
    .regex(/^[0-9+\s\-()]+$/, "Formato de telefone inválido"),
  name: z.string().min(1, "Nome é obrigatório"),
  message: z.string().min(1, "Mensagem inicial é obrigatória"),
});

type NewContactFormData = z.infer<typeof newContactSchema>;

export function ChatInterface() {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Buscar conversas reais do banco com polling automático
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/whatsapp/conversations'],
    refetchInterval: 3000,
  });

  // Buscar usuários para atribuição (apenas se autenticado)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: false, // Desabilitado temporariamente até resolver autenticação
    onError: (error: any) => {
      console.warn("Não foi possível carregar usuários para atribuição:", error.message);
    }
  });

  // Buscar mensagens da conversa selecionada
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/whatsapp/conversations', selectedConversation?.id, 'messages'],
    enabled: !!selectedConversation,
    refetchInterval: 2000,
  });

  // Status do servidor WhatsApp
  const { data: whatsappStatus } = useQuery({
    queryKey: ['/api/whatsapp/status'],
    refetchInterval: 10000,
  });

  // Mutation para enviar mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { phone: string; message: string }) => {
      return apiRequest('/api/whatsapp/send', 'POST', data);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/conversations'] });
      if (selectedConversation) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/whatsapp/conversations', selectedConversation.id, 'messages'] 
        });
      }
      scrollToBottom();
    },
    onError: (error: any) => {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar nova conversa
  const createConversationMutation = useMutation({
    mutationFn: async (data: NewContactFormData) => {
      // Criar apenas a conversa
      const conversation = await apiRequest('/api/whatsapp/conversations', 'POST', {
        phone: data.phone,
        name: data.name
      });
      
      return { conversation, messageData: { phone: data.phone, message: data.message } };
    },
    onSuccess: ({ conversation, messageData }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/conversations'] });
      setSelectedConversation(conversation);
      setShowNewContactDialog(false);
      form.reset();
      
      // Enviar mensagem inicial separadamente
      if (messageData.message.trim()) {
        sendMessageMutation.mutate(messageData);
      }
      
      toast({
        title: "Conversa criada",
        description: "Conversa criada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar conversa",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Form para novo contato
  const form = useForm<NewContactFormData>({
    resolver: zodResolver(newContactSchema),
    defaultValues: {
      phone: "",
      name: "",
      message: "",
    },
  });

  const onSubmit = (data: NewContactFormData) => {
    createConversationMutation.mutate(data);
  };

  // Funções utilitárias
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return `+55 (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffHours = diff / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return formatTime(timestamp);
    } else if (diffHours < 48) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const handleSendMessage = () => {
    if (selectedConversation && newMessage.trim()) {
      sendMessageMutation.mutate({
        phone: selectedConversation.phone,
        message: newMessage.trim()
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Verificação segura para evitar erro de null pointer
  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const filteredConversations = safeConversations.filter(conversation =>
    conversation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.phone.includes(searchTerm)
  );

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-orange-500';
      case 'urgent': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  console.log("WhatsApp server status:", whatsappStatus?.status);

  // Verificar se o WhatsApp está conectado
  const isWhatsAppConnected = whatsappStatus?.status === 'Conectado' || whatsappStatus?.ready === true;
  const whatsappStatusText = whatsappStatus?.status || 'Verificando...';

  return (
    <div className="h-screen flex bg-background">
      {/* Banner de Status quando Desconectado */}
      {!isWhatsAppConnected && whatsappStatusText !== 'Verificando...' && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 z-50">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>WhatsApp está {whatsappStatusText}. As mensagens não podem ser enviadas no momento.</span>
          </div>
        </div>
      )}
      {/* Sidebar Esquerda - Lista de Conversas */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        {/* Header da Sidebar */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">WhatsApp</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-new-chat">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Conversa</DialogTitle>
                    <DialogDescription>
                      Inicie uma nova conversa no WhatsApp
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número do WhatsApp</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: 5564999999999"
                                {...field}
                                data-testid="input-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Contato</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nome do cliente"
                                {...field}
                                data-testid="input-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mensagem Inicial</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Olá! Como posso ajudá-lo?"
                                {...field}
                                data-testid="input-initial-message"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewContactDialog(false)}
                          data-testid="button-cancel-new-conversation"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createConversationMutation.isPending || !isWhatsAppConnected}
                          data-testid="button-create-conversation"
                        >
                          {createConversationMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Criar
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm">
                <Archive className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Barra de Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-conversations"
            />
          </div>
        </div>

        {/* Lista de Conversas */}
        <ScrollArea className="flex-1">
          <div className="conversations-list-container" data-testid="conversations-list">
            {conversationsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Carregando conversas...</p>
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conversation: Conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 border-b border-border hover:bg-muted cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-accent border-l-4 border-l-primary' : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                  data-testid={`conversation-${conversation.id}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.avatar} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(conversation.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      {conversation.priority && conversation.priority !== 'normal' && (
                        <div className={`absolute -top-1 -left-1 w-3 h-3 ${getPriorityColor(conversation.priority)} rounded-full`}></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-foreground truncate" data-testid={`conversation-name-${conversation.id}`}>
                          {conversation.name}
                        </p>
                        {conversation.lastMessageTime && (
                          <span className="text-xs text-muted-foreground" data-testid={`conversation-time-${conversation.id}`}>
                            {formatLastMessageTime(conversation.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate" data-testid={`conversation-last-message-${conversation.id}`}>
                          {conversation.lastMessage?.content || formatPhone(conversation.phone)}
                        </p>
                        <div className="flex items-center space-x-1">
                          {conversation.isAssigned && (
                            <UserCheck className="w-3 h-3 text-blue-500" />
                          )}
                          {(conversation.unreadCount || 0) > 0 && (
                            <Badge 
                              className="bg-green-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center"
                              data-testid={`conversation-unread-${conversation.id}`}
                            >
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {conversation.tags && Array.isArray(conversation.tags) && conversation.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {conversation.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground" data-testid="no-conversations">
                <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                <p>Nenhuma conversa encontrada</p>
                <p className="text-xs mt-2">
                  As conversas aparecerão automaticamente quando mensagens chegarem do WhatsApp
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Status do WhatsApp */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              whatsappStatus?.status === 'Conectado' ? 'bg-green-500' : 
              whatsappStatus?.status?.includes('CONFLITO') ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-xs text-muted-foreground">
              WhatsApp: {whatsappStatus?.status || 'Verificando...'}
            </span>
          </div>
        </div>
      </div>

      {/* Área Central - Chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 border-b border-border bg-card" data-testid="chat-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(selectedConversation.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground" data-testid="chat-contact-name">
                      {selectedConversation.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span data-testid="chat-contact-phone">
                        {formatPhone(selectedConversation.phone)}
                      </span>
                      {selectedConversation.isAssigned && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600">Atribuído</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" data-testid="button-call">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" data-testid="button-video">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowClientDetails(!showClientDetails)}
                    data-testid="button-toggle-details"
                  >
                    <Users className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" data-testid="button-more">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Área de Mensagens */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4" data-testid="chat-messages">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Carregando mensagens...</span>
                  </div>
                ) : Array.isArray(messages) && messages.length > 0 ? (
                  messages.map((message: Message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${message.id}`}
                    >
                      <div className={`max-w-[70%] ${message.fromMe ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            message.fromMe 
                              ? 'bg-blue-500 text-white rounded-br-sm' 
                              : 'bg-card border border-border rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <div className={`flex items-center justify-end mt-1 space-x-1 ${
                            message.fromMe ? 'text-blue-100' : 'text-muted-foreground'
                          }`}>
                            <span className="text-xs">
                              {formatTime(message.timestamp)}
                            </span>
                            {message.fromMe && (
                              <span className="text-xs">
                                {message.status === 'sent' && '✓'}
                                {message.status === 'delivered' && '✓✓'}
                                {message.status === 'read' && <span className="text-blue-200">✓✓</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-center items-center h-32 text-center text-muted-foreground">
                    <div>
                      <MessageSquare className="w-12 h-12 mx-auto mb-2" />
                      <p>Nenhuma mensagem ainda</p>
                      <p className="text-xs mt-1">Inicie a conversa enviando uma mensagem</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input de Mensagem */}
            <div className="p-4 border-t border-border bg-card" data-testid="chat-input-area">
              <div className="flex items-end space-x-2">
                <Button variant="ghost" size="sm" data-testid="button-emoji">
                  <Smile className="w-5 h-5" />
                </Button>
                
                <Button variant="ghost" size="sm" data-testid="button-attach">
                  <Paperclip className="w-5 h-5" />
                </Button>
                
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder={isWhatsAppConnected ? "Digite sua mensagem..." : "WhatsApp desconectado - não é possível enviar mensagens"}
                    value={newMessage}
                    onChange={handleTextareaChange}
                    onKeyPress={handleKeyPress}
                    className="resize-none min-h-[40px] max-h-[120px] pr-12"
                    data-testid="input-message"
                    disabled={sendMessageMutation.isPending || !isWhatsAppConnected}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending || !isWhatsAppConnected}
                    size="sm"
                    className="absolute bottom-2 right-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-8 h-8 p-0 disabled:bg-gray-400"
                    data-testid="button-send"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${isRecording ? 'text-red-500' : ''}`}
                  onClick={toggleRecording}
                  data-testid="button-record"
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center" data-testid="chat-welcome">
            <div>
              <MessageSquare className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">Bem-vindo ao WhatsApp Business</h2>
              <p className="text-muted-foreground">Selecione uma conversa para começar o atendimento.</p>
              <p className="text-xs text-muted-foreground mt-2">
                As mensagens aparecerão automaticamente conforme chegam
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Direita - Detalhes do Cliente */}
      {selectedConversation && showClientDetails && (
        <div className="w-80 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Detalhes do Cliente</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowClientDetails(false)}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Informações do Cliente */}
              <div className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarImage src={selectedConversation.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(selectedConversation.name)}
                  </AvatarFallback>
                </Avatar>
                <h4 className="font-semibold text-lg text-foreground">{selectedConversation.name}</h4>
                <p className="text-sm text-muted-foreground">{formatPhone(selectedConversation.phone)}</p>
                {selectedConversation.isAssigned && (
                  <Badge className="mt-2 bg-blue-100 text-blue-800">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Atribuído
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Informações de Contato */}
              <div>
                <h5 className="font-medium text-foreground mb-3 flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  Contato
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span>{formatPhone(selectedConversation.phone)}</span>
                  </div>
                  {selectedConversation.client?.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span>{selectedConversation.client.email}</span>
                    </div>
                  )}
                  {selectedConversation.client?.endereco && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs">{selectedConversation.client.endereco}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Atendimento */}
              <div>
                <h5 className="font-medium text-foreground mb-3 flex items-center">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Atendimento
                </h5>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Atendente</label>
                    <Select>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Atribuir atendente" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(users) && users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.nome} ({user.systemRole})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Prioridade</label>
                    <Select>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Normal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tags */}
              <div>
                <h5 className="font-medium text-foreground mb-3 flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  Tags
                </h5>
                <div className="flex flex-wrap gap-2">
                  {selectedConversation.tags && Array.isArray(selectedConversation.tags) && selectedConversation.tags.length > 0 ? (
                    selectedConversation.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <Button variant="outline" size="sm" className="text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar Tag
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Histórico */}
              <div>
                <h5 className="font-medium text-foreground mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Histórico
                </h5>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Primeira mensagem:</span>
                    <span>{new Date(selectedConversation.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Última atividade:</span>
                    <span>
                      {selectedConversation.lastMessageTime 
                        ? formatLastMessageTime(selectedConversation.lastMessageTime)
                        : 'Nunca'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Building2 className="w-4 h-4 mr-2" />
                  Ver no CRM
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Star className="w-4 h-4 mr-2" />
                  Marcar como Favorito
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Archive className="w-4 h-4 mr-2" />
                  Arquivar Conversa
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}