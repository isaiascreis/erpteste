import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { Settings as SettingsIcon, User, Building, Palette, Bell, Shield, LogOut, Users, Plus, Edit, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  // TEMPORARIAMENTE REMOVIDO - Sistema sem login
  // const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [editingSeller, setEditingSeller] = useState(null);
  const { toast } = useToast();
  
  // Usuário fictício para exibição temporária
  const user = { username: "admin", firstName: "Sistema", lastName: "Turismo", email: "admin@mondial.com", role: "admin" };

  // Fetch vendedores
  const { data: sellers, isLoading: sellersLoading, error: sellersError } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: activeSection === "sellers",
    retry: false, // Don't retry on auth errors
    queryFn: async () => {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  // Debug logging
  if (activeSection === "sellers") {
    console.log("Debug sellers query:", {
      sellers,
      sellersLoading,
      sellersError,
      errorMessage: sellersError?.message,
      errorStatus: (sellersError as any)?.status
    });
  }

  // Mutations para vendedores
  const createSellerMutation = useMutation({
    mutationFn: (sellerData) => apiRequest("POST", "/api/users", sellerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowSellerForm(false);
      setEditingSeller(null);
      toast({
        title: "Sucesso",
        description: "Vendedor criado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar vendedor. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateSellerMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) => apiRequest("PATCH", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowSellerForm(false);
      setEditingSeller(null);
      toast({
        title: "Sucesso",
        description: "Vendedor atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar vendedor. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteSellerMutation = useMutation({
    mutationFn: (id) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Sucesso",
        description: "Vendedor removido com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover vendedor. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // LOGOUT TEMPORARIAMENTE REMOVIDO - Sistema sem login
  const handleLogout = async () => {
    console.log('Logout não implementado - sistema sem login');
  };

  const sections = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "company", label: "Empresa", icon: Building },
    { id: "sellers", label: "Vendedores", icon: Users },
    { id: "appearance", label: "Aparência", icon: Palette },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "security", label: "Segurança", icon: Shield },
  ];

  return (
    <div className="p-8" data-testid="settings-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-settings-title">Configurações</h1>
          <p className="text-muted-foreground mt-2">Gerencie suas preferências e configurações do sistema</p>
        </div>
        <Button variant="destructive" onClick={handleLogout} data-testid="button-logout">
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Button
                key={section.id}
                variant={activeSection === section.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection(section.id)}
                data-testid={`button-section-${section.id}`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {section.label}
              </Button>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeSection === "profile" && (
            <Card data-testid="card-profile">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Informações do Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-bold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" data-testid="text-user-name">
                      {user?.firstName} {user?.lastName}
                    </h3>
                    <p className="text-muted-foreground" data-testid="text-user-email">{user?.email}</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-user-role">
                      {user?.role === "admin" ? "Administrador" : "Usuário"}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nome</Label>
                      <Input id="firstName" value={user?.firstName || ""} readOnly data-testid="input-first-name" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Sobrenome</Label>
                      <Input id="lastName" value={user?.lastName || ""} readOnly data-testid="input-last-name" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email || ""} readOnly data-testid="input-email" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    * As informações do perfil são gerenciadas pelo sistema de autenticação.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "sellers" && (
            <Card data-testid="card-sellers">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Gerenciar Vendedores
                  </div>
                  {!sellersError && (
                    <Button 
                      onClick={() => {
                        setEditingSeller(null);
                        setShowSellerForm(true);
                      }}
                      data-testid="button-add-seller"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Vendedor
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {showSellerForm && !sellersError && (
                  <SellerForm 
                    seller={editingSeller}
                    onSubmit={(data: any) => {
                      if (editingSeller && (editingSeller as any).id) {
                        updateSellerMutation.mutate({ id: (editingSeller as any).id, ...data });
                      } else {
                        createSellerMutation.mutate(data);
                      }
                    }}
                    onCancel={() => {
                      setShowSellerForm(false);
                      setEditingSeller(null);
                    }}
                    isLoading={createSellerMutation.isPending || updateSellerMutation.isPending}
                  />
                )}
                
                <div className="space-y-4">
                  <h4 className="font-medium">Vendedores Cadastrados</h4>
                  {sellersLoading ? (
                    <div className="text-center p-8">Carregando vendedores...</div>
                  ) : sellersError ? (
                    <div className="text-center p-8 text-destructive">
                      {(sellersError as any)?.message?.includes('403') || (sellersError as any)?.message?.includes('Acesso negado') ? 
                        'Acesso negado. Apenas administradores podem gerenciar usuários.' :
                        'Erro ao carregar vendedores. Verifique se você tem as permissões necessárias.'
                      }
                    </div>
                  ) : !sellersError && (!sellers || sellers.length === 0) ? (
                    <div className="text-center p-8 text-muted-foreground">
                      Nenhum vendedor cadastrado ainda.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sellers.map((seller: any) => (
                        <div 
                          key={seller.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`seller-item-${seller.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                                {seller.firstName?.[0]}{seller.lastName?.[0]}
                              </div>
                              <div>
                                <h5 className="font-medium" data-testid={`text-seller-name-${seller.id}`}>
                                  {seller.firstName} {seller.lastName}
                                </h5>
                                <p className="text-sm text-muted-foreground" data-testid={`text-seller-email-${seller.id}`}>
                                  {seller.email}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    seller.systemRole === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    seller.systemRole === 'supervisor' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  }`}>
                                    {seller.systemRole === 'admin' ? 'Administrador' :
                                     seller.systemRole === 'supervisor' ? 'Supervisor' : 'Vendedor'}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    seller.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                  }`}>
                                    {seller.ativo ? 'Ativo' : 'Inativo'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSeller(seller);
                                setShowSellerForm(true);
                              }}
                              data-testid={`button-edit-seller-${seller.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja remover este vendedor?')) {
                                  deleteSellerMutation.mutate(seller.id);
                                }
                              }}
                              data-testid={`button-delete-seller-${seller.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "company" && (
            <Card data-testid="card-company">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Informações da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input id="companyName" defaultValue="Mondial Turismo" data-testid="input-company-name" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" placeholder="00.000.000/0000-00" data-testid="input-cnpj" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" placeholder="(11) 99999-9999" data-testid="input-phone" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Endereço</Label>
                    <Input id="address" placeholder="Endereço completo" data-testid="input-address" />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" placeholder="https://mondialturismo.com.br" data-testid="input-website" />
                  </div>
                  <Button data-testid="button-save-company">
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "appearance" && (
            <Card data-testid="card-appearance">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="w-5 h-5 mr-2" />
                  Aparência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Tema</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-accent" data-testid="theme-light">
                        <div className="w-full h-24 bg-white border rounded mb-2"></div>
                        <p className="text-sm font-medium">Claro</p>
                        <p className="text-xs text-muted-foreground">Tema claro padrão</p>
                      </div>
                      <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-accent" data-testid="theme-dark">
                        <div className="w-full h-24 bg-gray-900 border rounded mb-2"></div>
                        <p className="text-sm font-medium">Escuro</p>
                        <p className="text-xs text-muted-foreground">Tema escuro para baixa luz</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label>Cor do Tema</Label>
                    <div className="grid grid-cols-6 gap-2 mt-2">
                      {["blue", "green", "purple", "red", "orange", "pink"].map((color) => (
                        <div
                          key={color}
                          className={`w-12 h-12 rounded-lg border-2 cursor-pointer bg-${color}-500 hover:scale-105 transition-transform`}
                          data-testid={`color-${color}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "notifications" && (
            <Card data-testid="card-notifications">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notificações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Vendas</p>
                      <p className="text-sm text-muted-foreground">Notificações sobre novas vendas e orçamentos</p>
                    </div>
                    <Button variant="outline" size="sm" data-testid="toggle-sales-notifications">
                      Ativado
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Financeiro</p>
                      <p className="text-sm text-muted-foreground">Notificações sobre vencimentos e pagamentos</p>
                    </div>
                    <Button variant="outline" size="sm" data-testid="toggle-financial-notifications">
                      Ativado
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-sm text-muted-foreground">Notificações sobre novas mensagens</p>
                    </div>
                    <Button variant="outline" size="sm" data-testid="toggle-whatsapp-notifications">
                      Ativado
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">Receber notificações por email</p>
                    </div>
                    <Button variant="outline" size="sm" data-testid="toggle-email-notifications">
                      Desativado
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "security" && (
            <Card data-testid="card-security">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Sessões Ativas</h4>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Sessão Atual</p>
                          <p className="text-sm text-muted-foreground">
                            Último acesso: {new Date().toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={handleLogout} data-testid="button-logout-session">
                          Encerrar
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Auditoria</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Todas as ações no sistema são registradas para auditoria.
                    </p>
                    <Button variant="outline" data-testid="button-view-audit-log">
                      Ver Log de Auditoria
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente interno para formulário de vendedor  
function SellerForm({ seller, onSubmit, onCancel, isLoading }: {
  seller: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    firstName: seller?.firstName || '',
    lastName: seller?.lastName || '',
    email: seller?.email || '',
    telefone: seller?.telefone || '',
    systemRole: seller?.systemRole || 'vendedor',
    ativo: seller?.ativo !== false, // Default true
    observacoes: seller?.observacoes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="border rounded-lg p-6 bg-muted/50" data-testid="seller-form">
      <h4 className="font-medium mb-4">
        {seller ? 'Editar Vendedor' : 'Novo Vendedor'}
      </h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Nome *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              required
              data-testid="input-seller-first-name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Sobrenome *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              required
              data-testid="input-seller-last-name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              data-testid="input-seller-email"
            />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
              placeholder="(11) 99999-9999"
              data-testid="input-seller-phone"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="systemRole">Perfil de Acesso *</Label>
            <Select 
              value={formData.systemRole} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, systemRole: value }))}
            >
              <SelectTrigger data-testid="select-seller-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendedor">Vendedor</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ativo">Status</Label>
            <Select 
              value={formData.ativo ? 'true' : 'false'} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, ativo: value === 'true' }))}
            >
              <SelectTrigger data-testid="select-seller-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Ativo</SelectItem>
                <SelectItem value="false">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={formData.observacoes}
            onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            rows={3}
            placeholder="Observações sobre o vendedor..."
            data-testid="textarea-seller-observations"
          />
        </div>

        <div className="flex space-x-2">
          <Button 
            type="submit" 
            disabled={isLoading}
            data-testid="button-save-seller"
          >
            {isLoading ? 'Salvando...' : (seller ? 'Atualizar' : 'Criar')}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            data-testid="button-cancel-seller"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
