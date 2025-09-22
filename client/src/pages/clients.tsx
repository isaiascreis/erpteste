import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Search, Edit, Trash2, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const clientSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  endereco: z.string().optional(),
  dataNascimento: z.string().optional(),
  observacoes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function Clients() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/clients", { search }],
    queryFn: async () => {
      const url = search ? `/api/clients?search=${encodeURIComponent(search)}` : "/api/clients";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      return response.json();
    },
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      cpf: "",
      endereco: "",
      dataNascimento: "",
      observacoes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      await apiRequest("/api/clients", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Cliente criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você está deslogado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Erro ao criar cliente", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      await apiRequest(`/api/clients/${editingClient.id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({ title: "Cliente atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDialogOpen(false);
      setEditingClient(null);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você está deslogado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Erro ao atualizar cliente", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/clients/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Cliente excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você está deslogado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Erro ao excluir cliente", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: ClientFormData) => {
    if (editingClient) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    form.reset({
      nome: client.nome || "",
      email: client.email || "",
      telefone: client.telefone || "",
      cpf: client.cpf || "",
      endereco: client.endereco || "",
      dataNascimento: client.dataNascimento || "",
      observacoes: client.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (client: any) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${client.nome}?`)) {
      deleteMutation.mutate(client.id);
    }
  };

  const handleNewClient = () => {
    setEditingClient(null);
    form.reset();
    setDialogOpen(true);
  };

  return (
    <div className="p-8" data-testid="clients-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-clients-title">Clientes</h1>
          <p className="text-muted-foreground mt-2">Gerencie sua base de clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewClient} data-testid="button-new-client">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="dialog-client-form">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-cpf" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dataNascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-birth-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {editingClient ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="mb-6" data-testid="card-search">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes por nome, email ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card data-testid="card-clients-table">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="w-8 h-8" />
                    <Skeleton className="w-8 h-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : clients?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client: any) => (
                    <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground" data-testid={`text-client-name-${client.id}`}>
                              {client.nome}
                            </p>
                            {client.dataNascimento && (
                              <p className="text-sm text-muted-foreground" data-testid={`text-client-birth-${client.id}`}>
                                Nascimento: {client.dataNascimento}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-client-email-${client.id}`}>
                        {client.email || '-'}
                      </TableCell>
                      <TableCell data-testid={`text-client-phone-${client.id}`}>
                        {client.telefone || '-'}
                      </TableCell>
                      <TableCell data-testid={`text-client-cpf-${client.id}`}>
                        {client.cpf || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEdit(client)}
                            data-testid={`button-edit-${client.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(client)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${client.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4" data-testid="text-no-clients">
                {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </p>
              {!search && (
                <Button onClick={handleNewClient} data-testid="button-create-first-client">
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar primeiro cliente
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
