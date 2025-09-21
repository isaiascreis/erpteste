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
import { Settings as SettingsIcon, User, Building, Palette, Bell, Shield, LogOut, Users, Plus, Edit, Trash2, CreditCard, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPaymentMethodSchema, insertPaymentConditionSchema, insertContractClauseSchema, insertDocumentTemplateSchema } from "@shared/schema";

export default function Settings() {
  // TEMPORARIAMENTE REMOVIDO - Sistema sem login
  // const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [editingSeller, setEditingSeller] = useState(null);
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false);
  const [showPaymentConditionForm, setShowPaymentConditionForm] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<any>(null);
  const [editingPaymentCondition, setEditingPaymentCondition] = useState<any>(null);
  const [selectedPaymentMethodForConditions, setSelectedPaymentMethodForConditions] = useState<number | null>(null);
  const [showClauseForm, setShowClauseForm] = useState(false);
  const [editingClause, setEditingClause] = useState<any>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
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

  // Fetch payment methods 
  const { data: paymentMethodsAgencia } = useQuery({
    queryKey: ["/api/payment-methods", "AGENCIA"],
    enabled: activeSection === "payments",
    queryFn: async () => {
      const res = await fetch('/api/payment-methods?tipo=AGENCIA', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch payment methods for agency');
      return await res.json();
    },
  });

  const { data: paymentMethodsFornecedor } = useQuery({
    queryKey: ["/api/payment-methods", "FORNECEDOR"], 
    enabled: activeSection === "payments",
    queryFn: async () => {
      const res = await fetch('/api/payment-methods?tipo=FORNECEDOR', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch payment methods for supplier');
      return await res.json();
    },
  });

  // Fetch payment conditions
  const { data: paymentConditions } = useQuery({
    queryKey: ["/api/payment-conditions"],
    enabled: activeSection === "payments",
  });

  // Fetch contract clauses
  const { data: contractClauses } = useQuery({
    queryKey: ["/api/contract-clauses"],
    enabled: activeSection === "clauses",
  });

  // Fetch document templates
  const { data: documentTemplates } = useQuery({
    queryKey: ["/api/document-templates"],
    enabled: activeSection === "templates",
    queryFn: async () => {
      const res = await fetch('/api/document-templates', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch document templates');
      return await res.json();
    },
  });

  // Forms for payment methods and conditions
  const paymentMethodForm = useForm({
    resolver: zodResolver(insertPaymentMethodSchema),
    defaultValues: {
      nome: "",
      tipo: "AGENCIA" as const,
      descricao: "",
      ativo: true,
    },
  });

  const paymentConditionForm = useForm({
    resolver: zodResolver(insertPaymentConditionSchema),
    defaultValues: {
      formaPagamentoId: 0,
      nome: "",
      parcelas: 1,
      intervaloDias: 0,
      percentualEntrada: "0.00",
      ativo: true,
    },
  });

  const clauseForm = useForm({
    resolver: zodResolver(insertContractClauseSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "contrato" as const,
      order: 0,
      isActive: true,
    },
  });

  const templateForm = useForm({
    resolver: zodResolver(insertDocumentTemplateSchema),
    defaultValues: {
      name: "",
      type: "contract" as const,
      htmlContent: "",
      isActive: true,
    },
  });

  // Mutations for payment methods
  const createPaymentMethodMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/payment-methods", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      setShowPaymentMethodForm(false);
      setEditingPaymentMethod(null);
      paymentMethodForm.reset();
      toast({ title: "Forma de pagamento criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar forma de pagamento", description: error.message, variant: "destructive" });
    },
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/payment-methods/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      setShowPaymentMethodForm(false);
      setEditingPaymentMethod(null);
      paymentMethodForm.reset();
      toast({ title: "Forma de pagamento atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar forma de pagamento", description: error.message, variant: "destructive" });
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/payment-methods/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Forma de pagamento removida com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover forma de pagamento", description: error.message, variant: "destructive" });
    },
  });

  // Mutations for payment conditions
  const createPaymentConditionMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/payment-conditions", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-conditions"] });
      setShowPaymentConditionForm(false);
      setEditingPaymentCondition(null);
      paymentConditionForm.reset();
      toast({ title: "Condição de pagamento criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar condição de pagamento", description: error.message, variant: "destructive" });
    },
  });

  const updatePaymentConditionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/payment-conditions/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-conditions"] });
      setShowPaymentConditionForm(false);
      setEditingPaymentCondition(null);
      paymentConditionForm.reset();
      toast({ title: "Condição de pagamento atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar condição de pagamento", description: error.message, variant: "destructive" });
    },
  });

  const deletePaymentConditionMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/payment-conditions/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-conditions"] });
      toast({ title: "Condição de pagamento removida com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover condição de pagamento", description: error.message, variant: "destructive" });
    },
  });

  // Mutations for contract clauses
  const createClauseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/contract-clauses", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-clauses"] });
      setShowClauseForm(false);
      setEditingClause(null);
      clauseForm.reset();
      toast({ title: "Cláusula criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar cláusula", description: error.message, variant: "destructive" });
    },
  });

  const updateClauseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/contract-clauses/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-clauses"] });
      setShowClauseForm(false);
      setEditingClause(null);
      clauseForm.reset();
      toast({ title: "Cláusula atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar cláusula", description: error.message, variant: "destructive" });
    },
  });

  const deleteClauseMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/contract-clauses/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-clauses"] });
      toast({ title: "Cláusula removida com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover cláusula", description: error.message, variant: "destructive" });
    },
  });

  // Mutations for document templates
  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/document-templates", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      setShowTemplateForm(false);
      setEditingTemplate(null);
      templateForm.reset();
      toast({ title: "Template criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar template", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/document-templates/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      setShowTemplateForm(false);
      setEditingTemplate(null);
      templateForm.reset();
      toast({ title: "Template atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar template", description: error.message, variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/document-templates/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      toast({ title: "Template removido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover template", description: error.message, variant: "destructive" });
    },
  });

  // Handlers
  const handlePaymentMethodSubmit = (data: any) => {
    if (editingPaymentMethod) {
      updatePaymentMethodMutation.mutate({ id: editingPaymentMethod.id, data });
    } else {
      createPaymentMethodMutation.mutate(data);
    }
  };

  const handlePaymentConditionSubmit = (data: any) => {
    if (editingPaymentCondition) {
      updatePaymentConditionMutation.mutate({ id: editingPaymentCondition.id, data });
    } else {
      createPaymentConditionMutation.mutate(data);
    }
  };

  const handleEditPaymentMethod = (method: any) => {
    setEditingPaymentMethod(method);
    paymentMethodForm.reset(method);
    setShowPaymentMethodForm(true);
  };

  const handleEditPaymentCondition = (condition: any) => {
    setEditingPaymentCondition(condition);
    paymentConditionForm.reset(condition);
    setShowPaymentConditionForm(true);
  };

  const handleClauseSubmit = (data: any) => {
    if (editingClause) {
      updateClauseMutation.mutate({ id: editingClause.id, data });
    } else {
      createClauseMutation.mutate(data);
    }
  };

  const handleEditClause = (clause: any) => {
    setEditingClause(clause);
    clauseForm.reset(clause);
    setShowClauseForm(true);
  };

  const handleTemplateSubmit = (data: any) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    templateForm.reset(template);
    setShowTemplateForm(true);
  };

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
    mutationFn: (sellerData) => apiRequest("/api/users", "POST", sellerData),
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
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) => apiRequest(`/api/users/${id}`, "PATCH", data),
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
    mutationFn: (id) => apiRequest(`/api/users/${id}`, "DELETE"),
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
    { id: "payments", label: "Formas de Pagamento", icon: CreditCard },
    { id: "clauses", label: "Cláusulas", icon: FileText },
    { id: "templates", label: "Templates", icon: FileText },
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

          {activeSection === "payments" && (
            <Card data-testid="card-payments">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Formas de Pagamento
                  </div>
                  <Button
                    onClick={() => setShowPaymentMethodForm(true)}
                    size="sm"
                    data-testid="button-add-payment-method"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Forma
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Formas para Agência */}
                  <div>
                    <h4 className="font-medium mb-4 text-green-700 dark:text-green-400">
                      💰 Formas de Pagamento - Agência
                    </h4>
                    <div className="space-y-3">
                      {paymentMethodsAgencia?.length > 0 ? (
                        paymentMethodsAgencia.map((method: any) => (
                          <div key={method.id} className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{method.nome}</h5>
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleEditPaymentMethod(method)}
                                  data-testid={`button-edit-payment-method-${method.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-600"
                                  onClick={() => deletePaymentMethodMutation.mutate(method.id)}
                                  data-testid={`button-delete-payment-method-${method.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{method.descricao}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhuma forma de pagamento configurada para agência
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Formas para Fornecedor */}
                  <div>
                    <h4 className="font-medium mb-4 text-blue-700 dark:text-blue-400">
                      🏢 Formas de Pagamento - Fornecedor
                    </h4>
                    <div className="space-y-3">
                      {paymentMethodsFornecedor?.length > 0 ? (
                        paymentMethodsFornecedor.map((method: any) => (
                          <div key={method.id} className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{method.nome}</h5>
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleEditPaymentMethod(method)}
                                  data-testid={`button-edit-payment-method-${method.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-600"
                                  onClick={() => deletePaymentMethodMutation.mutate(method.id)}
                                  data-testid={`button-delete-payment-method-${method.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{method.descricao}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhuma forma de pagamento configurada para fornecedor
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Seção de Condições de Pagamento */}
                <div>
                  <h4 className="font-medium mb-4">⚙️ Condições de Pagamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">À Vista</h5>
                      <p className="text-sm text-muted-foreground">1 parcela • 0 dias de intervalo</p>
                      <p className="text-xs text-muted-foreground mt-1">100% na confirmação</p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">Parcelado 3x</h5>
                      <p className="text-sm text-muted-foreground">3 parcelas • 30 dias de intervalo</p>
                      <p className="text-xs text-muted-foreground mt-1">30% entrada + 2x35%</p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">50% + 50%</h5>
                      <p className="text-sm text-muted-foreground">2 parcelas • 30 dias de intervalo</p>
                      <p className="text-xs text-muted-foreground mt-1">50% entrada + 50% em 30 dias</p>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="mt-4" data-testid="button-add-payment-condition">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Condição
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "clauses" && (
            <Card data-testid="card-clauses">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Cláusulas Contratuais
                  </div>
                  <Button
                    onClick={() => setShowClauseForm(true)}
                    size="sm"
                    data-testid="button-add-clause"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Cláusula
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cláusulas de Contrato */}
                  <div>
                    <h4 className="font-medium mb-4 text-blue-700 dark:text-blue-400">
                      📜 Cláusulas de Contrato
                    </h4>
                    <div className="space-y-3">
                      {contractClauses?.filter((clause: any) => clause.type === "contrato").length > 0 ? (
                        contractClauses?.filter((clause: any) => clause.type === "contrato").map((clause: any) => (
                          <div key={clause.id} className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{clause.title}</h5>
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleEditClause(clause)}
                                  data-testid={`button-edit-clause-${clause.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-600"
                                  onClick={() => deleteClauseMutation.mutate(clause.id)}
                                  data-testid={`button-delete-clause-${clause.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-3">{clause.content}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                                Ordem: {clause.order}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                clause.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                              }`}>
                                {clause.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhuma cláusula de contrato configurada
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cláusulas de Voucher */}
                  <div>
                    <h4 className="font-medium mb-4 text-green-700 dark:text-green-400">
                      🎫 Cláusulas de Voucher
                    </h4>
                    <div className="space-y-3">
                      {contractClauses?.filter((clause: any) => clause.type === "voucher").length > 0 ? (
                        contractClauses?.filter((clause: any) => clause.type === "voucher").map((clause: any) => (
                          <div key={clause.id} className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{clause.title}</h5>
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleEditClause(clause)}
                                  data-testid={`button-edit-voucher-clause-${clause.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-600"
                                  onClick={() => deleteClauseMutation.mutate(clause.id)}
                                  data-testid={`button-delete-voucher-clause-${clause.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-3">{clause.content}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                                Ordem: {clause.order}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                clause.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                              }`}>
                                {clause.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhuma cláusula de voucher configurada
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "templates" && (
            <Card data-testid="card-templates">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Templates de Documentos
                  </div>
                  <Button
                    onClick={() => setShowTemplateForm(true)}
                    size="sm"
                    data-testid="button-add-template"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Template
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Templates de Contrato */}
                  <div>
                    <h4 className="font-medium mb-4 text-blue-700 dark:text-blue-400">
                      📄 Templates de Contrato
                    </h4>
                    <div className="space-y-3">
                      {documentTemplates?.filter((template: any) => template.type === "contract").length > 0 ? (
                        documentTemplates.filter((template: any) => template.type === "contract").map((template: any) => (
                          <div key={template.id} className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-blue-800 dark:text-blue-200">{template.name}</h5>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTemplate(template)}
                                  data-testid={`button-edit-template-${template.id}`}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-delete-template-${template.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {template.htmlContent.replace(/<[^>]*>/g, '').substring(0, 100)}...
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              template.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {template.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhum template de contrato configurado
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Templates de Voucher */}
                  <div>
                    <h4 className="font-medium mb-4 text-green-700 dark:text-green-400">
                      🎫 Templates de Voucher
                    </h4>
                    <div className="space-y-3">
                      {documentTemplates?.filter((template: any) => template.type === "voucher").length > 0 ? (
                        documentTemplates.filter((template: any) => template.type === "voucher").map((template: any) => (
                          <div key={template.id} className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-green-800 dark:text-green-200">{template.name}</h5>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTemplate(template)}
                                  data-testid={`button-edit-template-${template.id}`}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-delete-template-${template.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {template.htmlContent.replace(/<[^>]*>/g, '').substring(0, 100)}...
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              template.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {template.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhum template de voucher configurado
                        </div>
                      )}
                    </div>
                  </div>
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
      
      {/* Payment Method Modal */}
      <Dialog open={showPaymentMethodForm} onOpenChange={setShowPaymentMethodForm}>
        <DialogContent data-testid="dialog-payment-method">
          <DialogHeader>
            <DialogTitle>
              {editingPaymentMethod ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
            </DialogTitle>
          </DialogHeader>
          <Form {...paymentMethodForm}>
            <form onSubmit={paymentMethodForm.handleSubmit(handlePaymentMethodSubmit)} className="space-y-4">
              <FormField
                control={paymentMethodForm.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: PIX, Cartão de Crédito" data-testid="input-payment-method-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentMethodForm.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AGENCIA">Agência</SelectItem>
                        <SelectItem value="FORNECEDOR">Fornecedor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={paymentMethodForm.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Descrição da forma de pagamento"
                        rows={3}
                        data-testid="input-payment-method-description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowPaymentMethodForm(false)}
                  data-testid="button-cancel-payment-method"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPaymentMethodMutation.isPending || updatePaymentMethodMutation.isPending}
                  data-testid="button-save-payment-method"
                >
                  {editingPaymentMethod ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Condition Modal */}
      <Dialog open={showPaymentConditionForm} onOpenChange={setShowPaymentConditionForm}>
        <DialogContent data-testid="dialog-payment-condition">
          <DialogHeader>
            <DialogTitle>
              {editingPaymentCondition ? "Editar Condição de Pagamento" : "Nova Condição de Pagamento"}
            </DialogTitle>
          </DialogHeader>
          <Form {...paymentConditionForm}>
            <form onSubmit={paymentConditionForm.handleSubmit(handlePaymentConditionSubmit)} className="space-y-4">
              <FormField
                control={paymentConditionForm.control}
                name="formaPagamentoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-condition-method">
                          <SelectValue placeholder="Selecione a forma de pagamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethodsAgencia?.map((method: any) => (
                          <SelectItem key={method.id} value={method.id.toString()}>
                            {method.nome} (Agência)
                          </SelectItem>
                        ))}
                        {paymentMethodsFornecedor?.map((method: any) => (
                          <SelectItem key={method.id} value={method.id.toString()}>
                            {method.nome} (Fornecedor)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={paymentConditionForm.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Condição *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: À vista, 30 dias, Parcelado 3x" data-testid="input-payment-condition-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentConditionForm.control}
                  name="parcelas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parcelas</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-payment-condition-installments" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={paymentConditionForm.control}
                  name="intervaloDias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intervalo (dias)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-payment-condition-interval" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={paymentConditionForm.control}
                name="percentualEntrada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual de Entrada (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field} 
                        placeholder="0.00"
                        data-testid="input-payment-condition-down-payment" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowPaymentConditionForm(false)}
                  data-testid="button-cancel-payment-condition"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPaymentConditionMutation.isPending || updatePaymentConditionMutation.isPending}
                  data-testid="button-save-payment-condition"
                >
                  {editingPaymentCondition ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Contract Clause Modal */}
      <Dialog open={showClauseForm} onOpenChange={setShowClauseForm}>
        <DialogContent className="max-w-3xl" data-testid="dialog-clause" aria-describedby="clause-description">
          <DialogHeader>
            <DialogTitle>
              {editingClause ? "Editar Cláusula" : "Nova Cláusula"}
            </DialogTitle>
            <div id="clause-description" className="text-sm text-muted-foreground">
              Configure cláusulas contratuais para contratos e vouchers de viagem.
            </div>
          </DialogHeader>
          <Form {...clauseForm}>
            <form onSubmit={clauseForm.handleSubmit(handleClauseSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clauseForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Cancelamento de Viagem" data-testid="input-clause-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={clauseForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-clause-type">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="contrato">Contrato</SelectItem>
                          <SelectItem value="voucher">Voucher</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clauseForm.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem de Exibição</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          data-testid="input-clause-order" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clauseForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 space-y-0">
                      <div className="space-y-0.5">
                        <FormLabel>Cláusula Ativa</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Incluir esta cláusula nos documentos
                        </div>
                      </div>
                      <FormControl>
                        <Button
                          type="button"
                          variant={field.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => field.onChange(!field.value)}
                          data-testid="toggle-clause-active"
                        >
                          {field.value ? "Ativo" : "Inativo"}
                        </Button>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={clauseForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo da Cláusula *</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Digite o texto completo da cláusula..."
                        rows={8}
                        className="resize-none"
                        data-testid="textarea-clause-content" 
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      💡 Dica: Use variáveis como {"{"}{"{"}{"}"}nomeCliente{"}"}{"}"},  {"{"}{"{"}{"}"}dataViagem{"}"}{"}"},  {"{"}{"{"}{"}"}valorTotal{"}"}{"}"}  para personalizar contratos
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setShowClauseForm(false);
                    setEditingClause(null);
                    clauseForm.reset();
                  }}
                  data-testid="button-cancel-clause"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createClauseMutation.isPending || updateClauseMutation.isPending}
                  data-testid="button-save-clause"
                >
                  {editingClause ? "Atualizar" : "Criar"} Cláusula
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Document Template Modal */}
      <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-template">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Configure templates HTML para geração automática de contratos e vouchers.
            </DialogDescription>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(handleTemplateSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={templateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Template *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Contrato de Viagem Internacional" data-testid="input-template-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Template *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-template-type">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="contract">Contrato</SelectItem>
                          <SelectItem value="voucher">Voucher</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={templateForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel>Template Ativo</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Disponibilizar template para geração de documentos
                      </div>
                    </div>
                    <FormControl>
                      <Button
                        type="button"
                        variant={field.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(!field.value)}
                        data-testid="toggle-template-active"
                      >
                        {field.value ? "Ativo" : "Inativo"}
                      </Button>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="htmlContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo HTML do Template *</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Digite o HTML do template..."
                        rows={15}
                        className="resize-none font-mono text-sm"
                        data-testid="textarea-template-content" 
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      💡 Use variáveis como {"{"}{"{"}{"}"}nomeCliente{"}"}{"}"},  {"{"}{"{"}{"}"}numeroVenda{"}"}{"}"},  {"{"}{"{"}{"}"}servicos{"}"}{"}"},  {"{"}{"{"}{"}"}valorTotal{"}"}{"}"}  para personalizar templates.
                      Inclua HTML completo com tags &lt;html&gt;, &lt;head&gt;, &lt;body&gt;.
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setShowTemplateForm(false);
                    setEditingTemplate(null);
                    templateForm.reset();
                  }}
                  data-testid="button-cancel-template"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  data-testid="button-save-template"
                >
                  {editingTemplate ? "Atualizar" : "Criar"} Template
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
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
