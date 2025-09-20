import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Eye, Edit, Trash2, PiggyBank, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

export default function Banking() {
  const [, setLocation] = useLocation();
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

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
          <Button data-testid="button-new-account">
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
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
          <Button data-testid="button-create-first-account">
            <Plus className="w-4 h-4 mr-2" />
            Criar primeira conta
          </Button>
        </Card>
      )}
    </div>
  );
}
