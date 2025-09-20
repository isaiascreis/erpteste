import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LiquidationModal } from "@/components/financial/liquidation-modal";
import { AccountModal } from "@/components/financial/account-modal";
import { Plus, PiggyBank, TableIcon, CheckCheck, Edit, Trash2, Filter } from "lucide-react";
import { useLocation } from "wouter";

export default function Financial() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    tipo: "",
    status: "",
    search: "",
  });
  const [liquidationModal, setLiquidationModal] = useState<{ show: boolean; account: any }>({
    show: false,
    account: null
  });
  const [accountModal, setAccountModal] = useState<{ show: boolean; account: any }>({
    show: false,
    account: null
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["/api/financial-accounts"],
    queryFn: async () => {
      const url = "/api/financial-accounts";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch financial accounts");
      }
      return response.json();
    },
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ["/api/bank-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/bank-accounts", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch bank accounts");
      }
      return response.json();
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/account-categories"],
    queryFn: async () => {
      const response = await fetch("/api/account-categories", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch account categories");
      }
      return response.json();
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pendente: { label: "Pendente", variant: "secondary" as const },
      parcial: { label: "Parcial", variant: "default" as const },
      liquidado: { label: "Liquidado", variant: "default" as const },
    };
    const statusConfig = statusMap[status as keyof typeof statusMap] || statusMap.pendente;
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const handleLiquidate = (account: any) => {
    setLiquidationModal({ show: true, account });
  };

  const handleNewAccount = () => {
    setAccountModal({ show: true, account: null });
  };

  const handleEditAccount = (account: any) => {
    setAccountModal({ show: true, account });
  };

  const clearFilters = () => {
    setFilters({
      tipo: "todos",
      status: "todos",
      search: "",
    });
  };

  return (
    <div className="p-8" data-testid="financial-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-financial-title">Contas a Pagar e Receber</h1>
          <p className="text-muted-foreground mt-2">Gestão financeira completa</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => setLocation('/banking')} data-testid="button-bank-accounts">
            <PiggyBank className="w-4 h-4 mr-2" />
            Contas Bancárias
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setLocation('/chart-of-accounts')}
            data-testid="button-account-plan"
          >
            <TableIcon className="w-4 h-4 mr-2" />
            Plano de Contas
          </Button>
          <Button onClick={handleNewAccount} data-testid="button-new-account">
            <Plus className="w-4 h-4 mr-2" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6" data-testid="card-filters">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Filtrar por descrição..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                data-testid="input-search"
              />
            </div>
            <div>
              <Select 
                value={filters.tipo} 
                onValueChange={(value) => setFilters({ ...filters, tipo: value })}
              >
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="pagar">A Pagar</SelectItem>
                  <SelectItem value="receber">A Receber</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="liquidado">Liquidado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button variant="secondary" onClick={clearFilters} className="w-full" data-testid="button-clear-filters">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Accounts Table */}
      <Card data-testid="card-accounts-table">
        <CardHeader>
          <CardTitle>Lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-20" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : accounts?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor em Aberto</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account: any) => (
                    <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground" data-testid={`cell-description-${account.id}`}>
                            {account.descricao}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`cell-details-${account.id}`}>
                            {account.client?.nome || account.supplier?.nome || 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`cell-amount-${account.id}`}>
                        <span className={`font-semibold ${
                          account.tipo === 'receber' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {account.tipo === 'receber' ? '+' : '-'} R$ {parseFloat(account.valorAberto || 0).toLocaleString('pt-BR')}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-due-date-${account.id}`}>
                        {account.dataVencimento ? new Date(account.dataVencimento).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell data-testid={`cell-status-${account.id}`}>
                        {getStatusBadge(account.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {account.status !== 'liquidado' && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleLiquidate(account)}
                              className="text-emerald-600 hover:text-emerald-700"
                              data-testid={`button-liquidate-${account.id}`}
                            >
                              <CheckCheck className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEditAccount(account)}
                            data-testid={`button-edit-${account.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" data-testid={`button-delete-${account.id}`}>
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
              <p className="text-muted-foreground" data-testid="text-no-accounts">
                Nenhuma conta encontrada
              </p>
              <Button 
                className="mt-4" 
                onClick={handleNewAccount}
                data-testid="button-create-first-account"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro lançamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <LiquidationModal
        account={liquidationModal.account}
        bankAccounts={bankAccounts || []}
        categories={categories || []}
        open={liquidationModal.show}
        onClose={() => setLiquidationModal({ show: false, account: null })}
      />
      
      <AccountModal
        account={accountModal.account}
        categories={categories || []}
        open={accountModal.show}
        onClose={() => setAccountModal({ show: false, account: null })}
      />
    </div>
  );
}
