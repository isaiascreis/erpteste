import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, ArrowLeft, Edit, Trash2, FileText, Calculator, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const categorySchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: z.enum(["receita", "despesa", "outros"], { required_error: "Tipo é obrigatório" }),
  ativo: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function ChartOfAccounts() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("categories");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: categories, isLoading } = useQuery({
    queryKey: ["/api/account-categories"],
    queryFn: async () => {
      const response = await fetch("/api/account-categories", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch account categories");
      }
      return response.json();
    },
  });

  const { data: financialSummary, isLoading: isDRELoading } = useQuery({
    queryKey: ["/api/financial-summary"],
    queryFn: async () => {
      const response = await fetch("/api/financial-summary", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch financial summary");
      }
      return response.json();
    },
  });

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nome: "",
      tipo: "despesa",
      ativo: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      await apiRequest("/api/account-categories", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Categoria criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/account-categories"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao criar categoria", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      await apiRequest(`/api/account-categories/${editingCategory.id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({ title: "Categoria atualizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/account-categories"] });
      setDialogOpen(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao atualizar categoria", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/account-categories/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Categoria excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/account-categories"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao excluir categoria", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    form.reset({
      nome: category.nome || "",
      tipo: category.tipo || "despesa",
      ativo: category.ativo ?? true,
    });
    setDialogOpen(true);
  };

  const handleDelete = (category: any) => {
    if (confirm(`Tem certeza que deseja excluir a categoria ${category.nome}?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const handleNewCategory = () => {
    setEditingCategory(null);
    form.reset();
    setDialogOpen(true);
  };

  const getTypeLabel = (type: string) => {
    const typeMap = {
      receita: "Receita",
      despesa: "Despesa",
      outros: "Outros"
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const getTypeBadgeVariant = (type: string) => {
    const variants = {
      receita: "default" as const,
      despesa: "secondary" as const,
      outros: "outline" as const
    };
    return variants[type as keyof typeof variants] || "outline" as const;
  };

  // Use real DRE data from API or fallback to empty data
  const dreData = financialSummary || {
    periodo: "Dados não disponíveis",
    receitas: [],
    despesas: [],
    totalReceitas: 0,
    totalDespesas: 0,
    lucroLiquido: 0
  };

  const totalReceitas = dreData.totalReceitas;
  const totalDespesas = dreData.totalDespesas;
  const lucroLiquido = dreData.lucroLiquido;

  return (
    <div className="p-8" data-testid="chart-of-accounts-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-chart-title">
            Plano de Contas & DRE
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestão de categorias e demonstração de resultados
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="secondary" 
            onClick={() => setLocation('/financial')} 
            data-testid="button-back-financial"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories" data-testid="tab-categories">
            <FileText className="w-4 h-4 mr-2" />
            Plano de Contas
          </TabsTrigger>
          <TabsTrigger value="dre" data-testid="tab-dre">
            <Calculator className="w-4 h-4 mr-2" />
            DRE - Demonstração
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Categorias de Contas</h2>
              <p className="text-muted-foreground">Gerencie as categorias para organizar lançamentos</p>
            </div>
            <Button onClick={handleNewCategory} data-testid="button-new-category">
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      </TableRow>
                    ))
                  ) : categories?.map((category: any) => (
                    <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                      <TableCell data-testid={`cell-name-${category.id}`}>
                        {category.nome}
                      </TableCell>
                      <TableCell data-testid={`cell-type-${category.id}`}>
                        <Badge variant={getTypeBadgeVariant(category.tipo)}>
                          {getTypeLabel(category.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`cell-status-${category.id}`}>
                        <Badge variant={category.ativo ? "default" : "secondary"}>
                          {category.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleEdit(category)}
                            data-testid={`button-edit-category-${category.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDelete(category)}
                            data-testid={`button-delete-category-${category.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dre" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">DRE - {dreData.periodo}</h2>
              <p className="text-muted-foreground">Demonstração do Resultado do Exercício</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receitas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-emerald-600 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Receitas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isDRELoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
                        <div className="h-4 bg-muted rounded animate-pulse w-20"></div>
                      </div>
                    ))
                  ) : dreData.receitas.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{item.categoria}</span>
                      <span className="font-medium text-emerald-600">
                        R$ {item.valor.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Receitas</span>
                      <span className="text-emerald-600">
                        R$ {totalReceitas.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Despesas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center">
                  <TrendingDown className="w-5 h-5 mr-2" />
                  Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isDRELoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
                        <div className="h-4 bg-muted rounded animate-pulse w-20"></div>
                      </div>
                    ))
                  ) : dreData.despesas.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{item.categoria}</span>
                      <span className="font-medium text-red-600">
                        R$ {item.valor.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Despesas</span>
                      <span className="text-red-600">
                        R$ {totalDespesas.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultado */}
          <Card className={lucroLiquido >= 0 ? "border-emerald-200" : "border-red-200"}>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Resultado Líquido</h3>
                <div className={`text-3xl font-bold ${lucroLiquido >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {lucroLiquido >= 0 ? "+" : ""}R$ {lucroLiquido.toLocaleString('pt-BR')}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {lucroLiquido >= 0 ? "Lucro" : "Prejuízo"} no período
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-category-form">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome da categoria..." 
                        {...field} 
                        data-testid="input-category-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-category"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-category"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

