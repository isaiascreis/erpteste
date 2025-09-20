import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Plus, Eye, Edit, Trash2, PiggyBank, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Schema for bank account form
const bankAccountSchema = z.object({
  nome: z.string().min(1, "Nome da conta é obrigatório"),
  banco: z.string().min(1, "Nome do banco é obrigatório"),
  agencia: z.string().min(1, "Agência é obrigatória"),
  conta: z.string().min(1, "Número da conta é obrigatório"),
  saldo: z.string().min(1, "Saldo é obrigatório"),
  ativo: z.boolean().default(true),
});

// Schema for transfer form
const transferSchema = z.object({
  contaOrigemId: z.coerce.number().positive("Conta de origem é obrigatória"),
  contaDestinoId: z.coerce.number().positive("Conta de destino é obrigatória"),
  valor: z.coerce.number().positive("Valor deve ser maior que zero"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  observacoes: z.string().optional(),
}).refine((data) => data.contaOrigemId !== data.contaDestinoId, {
  message: "Conta de origem deve ser diferente da conta de destino",
  path: ["contaDestinoId"],
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;
type TransferFormData = z.infer<typeof transferSchema>;

export default function Banking() {
  const [, setLocation] = useLocation();
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for creating bank account
  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      nome: "",
      banco: "",
      agencia: "",
      conta: "",
      saldo: "0",
      ativo: true,
    },
  });

  // Form for transfer
  const transferForm = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      contaOrigemId: 0,
      contaDestinoId: 0,
      valor: 0,
      descricao: "",
      observacoes: "",
    },
  });

  // Mutation to create bank account
  const createMutation = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      await apiRequest("POST", "/api/bank-accounts", data);
    },
    onSuccess: () => {
      toast({ title: "Conta bancária criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      setShowForm(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar conta bancária",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to transfer between accounts
  const transferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      return await apiRequest("POST", "/api/bank-accounts/transfer", data);
    },
    onSuccess: (result, variables) => {
      toast({ title: "Transferência realizada com sucesso!" });
      
      // Invalidate bank accounts list
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      
      // Invalidate transactions for both accounts
      queryClient.invalidateQueries({ 
        queryKey: ["/api/bank-accounts", variables.contaOrigemId, "transactions"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/bank-accounts", variables.contaDestinoId, "transactions"] 
      });
      
      setShowTransferForm(false);
      transferForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na transferência",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: BankAccountFormData) => {
    createMutation.mutate(data);
  };

  const handleTransferSubmit = (data: TransferFormData) => {
    transferMutation.mutate(data);
  };

  const handleNewAccount = () => {
    setShowForm(true);
  };

  const handleNewTransfer = () => {
    setShowTransferForm(true);
  };

  const { data: bankAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["/api/bank-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/bank-accounts", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch bank accounts");
      }
      return response.json();
    },
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/bank-accounts", selectedAccount?.id, "transactions"],
    enabled: !!selectedAccount,
    queryFn: async () => {
      if (!selectedAccount?.id) throw new Error("No account selected");
      const response = await fetch(`/api/bank-accounts/${selectedAccount.id}/transactions`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      return response.json();
    },
  });

  const handleViewExtract = (account: any) => {
    setSelectedAccount(account);
  };

  const backToAccounts = () => {
    setSelectedAccount(null);
  };

  if (selectedAccount && !transactionsLoading && transactions) {
    return (
      <div className="p-8" data-testid="banking-extract-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-extract-title">
              Extrato: {selectedAccount.nome}
            </h1>
            <p className="text-muted-foreground mt-2">
              Saldo Atual: <span className="font-semibold text-emerald-600" data-testid="text-current-balance">
                R$ {parseFloat(selectedAccount.saldo || 0).toLocaleString('pt-BR')}
              </span>
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={backToAccounts} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button data-testid="button-new-transaction">
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </div>
        </div>

        <Card data-testid="card-transactions">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Conciliado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: any) => (
                    <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                      <TableCell data-testid={`cell-date-${transaction.id}`}>
                        {new Date(transaction.dataTransacao).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell data-testid={`cell-description-${transaction.id}`}>
                        <div>
                          <p className="font-medium text-foreground">{transaction.descricao}</p>
                          {transaction.observacoes && (
                            <p className="text-sm text-muted-foreground">{transaction.observacoes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`cell-amount-${transaction.id}`}>
                        <span className={`font-semibold ${
                          transaction.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {transaction.tipo === 'entrada' ? '+' : '-'} R$ {parseFloat(transaction.valor || 0).toLocaleString('pt-BR')}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-reconciled-${transaction.id}`}>
                        <input 
                          type="checkbox" 
                          checked={transaction.conciliado} 
                          className="rounded border-border text-primary focus:ring-primary"
                          readOnly
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {transaction.contaFinanceiraId && (
                            <Button size="sm" variant="ghost" data-testid={`button-view-account-${transaction.id}`}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" data-testid={`button-edit-transaction-${transaction.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="banking-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-banking-title">Contas Bancárias</h1>
          <p className="text-muted-foreground mt-2">Gestão de contas e extratos bancários</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => setLocation('/financial')} data-testid="button-back-financial">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleNewTransfer}
            disabled={!bankAccounts || bankAccounts.length < 2}
            data-testid="button-transfer"
          >
            Transferir
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={handleNewAccount} data-testid="button-new-account">
                <Plus className="w-4 h-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nova Conta Bancária</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Conta</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Conta Corrente Principal" data-testid="input-account-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="banco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Banco do Brasil" data-testid="input-bank-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="agencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agência</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: 1234-5" data-testid="input-agency" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="conta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conta</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: 12345-6" data-testid="input-account-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="saldo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Saldo Inicial</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-initial-balance" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ativo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "true")} 
                          value={field.value ? "true" : "false"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Ativo</SelectItem>
                            <SelectItem value="false">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-save-account"
                    >
                      {createMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Transfer Dialog */}
          <Dialog open={showTransferForm} onOpenChange={setShowTransferForm}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Transferir entre Contas</DialogTitle>
                <DialogDescription>
                  Realize transferências entre suas contas bancárias de forma segura e rápida.
                </DialogDescription>
              </DialogHeader>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit(handleTransferSubmit)} className="space-y-4">
                  <FormField
                    control={transferForm.control}
                    name="contaOrigemId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta de Origem</FormLabel>
                        <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-account">
                              <SelectValue placeholder="Selecione a conta de origem" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bankAccounts?.map((account: any) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.nome} - R$ {parseFloat(account.saldo || 0).toLocaleString('pt-BR')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transferForm.control}
                    name="contaDestinoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta de Destino</FormLabel>
                        <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-destination-account">
                              <SelectValue placeholder="Selecione a conta de destino" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bankAccounts?.map((account: any) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.nome} - R$ {parseFloat(account.saldo || 0).toLocaleString('pt-BR')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transferForm.control}
                    name="valor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            data-testid="input-transfer-amount" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transferForm.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Ajuste de saldo, pagamento..." data-testid="input-transfer-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transferForm.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Informações adicionais..." data-testid="input-transfer-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowTransferForm(false)}
                      data-testid="button-cancel-transfer"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={transferMutation.isPending || createMutation.isPending}
                      data-testid="button-confirm-transfer"
                    >
                      {transferMutation.isPending ? "Transferindo..." : "Transferir"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accountsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="w-8 h-8" />
                  <Skeleton className="w-8 h-8" />
                </div>
              </div>
              <div className="mb-4">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
              <Skeleton className="h-10 w-full" />
            </Card>
          ))
        ) : bankAccounts?.map((account: any) => (
          <Card key={account.id} className="p-6" data-testid={`card-bank-account-${account.id}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <PiggyBank className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground" data-testid={`text-account-name-${account.id}`}>
                    {account.nome}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid={`text-account-details-${account.id}`}>
                    {account.banco && account.agencia && account.conta
                      ? `Ag: ${account.agencia} • CC: ${account.conta}`
                      : 'Detalhes não informados'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="ghost" data-testid={`button-edit-account-${account.id}`}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" data-testid={`button-delete-account-${account.id}`}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Saldo Atual</p>
              <p className="text-2xl font-bold text-emerald-600" data-testid={`text-balance-${account.id}`}>
                R$ {parseFloat(account.saldo || 0).toLocaleString('pt-BR')}
              </p>
            </div>
            
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => handleViewExtract(account)}
              data-testid={`button-view-extract-${account.id}`}
            >
              Ver Extrato
            </Button>
          </Card>
        ))}
      </div>

      {!accountsLoading && (!bankAccounts || bankAccounts.length === 0) && (
        <Card className="p-12 text-center" data-testid="card-no-accounts">
          <PiggyBank className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4" data-testid="text-no-accounts">
            Nenhuma conta bancária cadastrada
          </p>
          <Button onClick={handleNewAccount} data-testid="button-create-first-account">
            <Plus className="w-4 h-4 mr-2" />
            Criar primeira conta
          </Button>
        </Card>
      )}
    </div>
  );
}
