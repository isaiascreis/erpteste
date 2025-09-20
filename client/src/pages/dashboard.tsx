import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CalendarDays, 
  Calendar, 
  PiggyBank, 
  Clock, 
  Plane, 
  Trophy, 
  Plus, 
  DollarSign, 
  UserPlus, 
  FileText,
  RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: operations, isLoading: operationsLoading } = useQuery({
    queryKey: ["/api/dashboard/operations"],
  });

  const { data: salesRanking, isLoading: rankingLoading } = useQuery({
    queryKey: ["/api/dashboard/sales-ranking"],
  });

  const handleRefresh = () => {
    refetchMetrics();
  };

  return (
    <div className="p-8" data-testid="dashboard-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Visão geral das operações da agência</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-muted-foreground">
            Última atualização: <span data-testid="text-last-update">{new Date().toLocaleString('pt-BR')}</span>
          </div>
          <Button onClick={handleRefresh} size="sm" data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="card-sales-today">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Vendas Hoje</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid="text-sales-today">
                    {metrics?.salesToday ? `R$ ${metrics.salesToday.toLocaleString('pt-BR')}` : 'R$ 0,00'}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  <span data-testid="text-sales-today-count">{metrics?.salesTodayCount || 0}</span> vendas
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                <CalendarDays className="text-emerald-600 dark:text-emerald-400 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-sales-month">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Vendas do Mês</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid="text-sales-month">
                    {metrics?.salesMonth ? `R$ ${metrics.salesMonth.toLocaleString('pt-BR')}` : 'R$ 0,00'}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  <span data-testid="text-sales-month-count">{metrics?.salesMonthCount || 0}</span> vendas
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Calendar className="text-blue-600 dark:text-blue-400 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-bank-balance">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Saldo Total</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-emerald-600 mt-1" data-testid="text-bank-balance">
                    {metrics?.totalBalance ? `R$ ${metrics.totalBalance.toLocaleString('pt-BR')}` : 'R$ 0,00'}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  <span data-testid="text-bank-accounts-count">{metrics?.bankAccountsCount || 0}</span> contas
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <PiggyBank className="text-green-600 dark:text-green-400 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-accounts-receivable">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">A Receber</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600 mt-1" data-testid="text-accounts-receivable">
                    {metrics?.accountsReceivable ? `R$ ${metrics.accountsReceivable.toLocaleString('pt-BR')}` : 'R$ 0,00'}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  <span data-testid="text-pending-accounts">{metrics?.pendingAccountsCount || 0}</span> pendências
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                <Clock className="text-amber-600 dark:text-amber-400 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations and Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Operations of the Week */}
        <Card data-testid="card-operations">
          <CardContent className="p-6">
            <div className="border-b border-border pb-4 mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Plane className="text-primary mr-3 w-5 h-5" />
                Operações da Semana
              </h3>
            </div>
            <div className="space-y-4">
              {operationsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <Skeleton className="h-6 w-8" />
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                    <div>
                      <p className="font-medium text-foreground">Clientes viajando hoje</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-traveling-today">
                        {operations?.travelingToday?.length ? operations.travelingToday.join(', ') : 'Nenhum cliente'}
                      </p>
                    </div>
                    <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-sm font-medium px-3 py-1 rounded-full" data-testid="count-traveling-today">
                      {operations?.travelingToday?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                    <div>
                      <p className="font-medium text-foreground">Viajando em 2 dias</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-traveling-soon">
                        {operations?.travelingIn2Days?.length ? operations.travelingIn2Days.join(', ') : 'Nenhum cliente'}
                      </p>
                    </div>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium px-3 py-1 rounded-full" data-testid="count-traveling-soon">
                      {operations?.travelingIn2Days?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                    <div>
                      <p className="font-medium text-foreground">Retornando hoje</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-returning-today">
                        {operations?.returningToday?.length ? operations.returningToday.join(', ') : 'Nenhum cliente'}
                      </p>
                    </div>
                    <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-sm font-medium px-3 py-1 rounded-full" data-testid="count-returning-today">
                      {operations?.returningToday?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-foreground">Retornando em 2 dias</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-returning-soon">
                        {operations?.returningIn2Days?.length ? operations.returningIn2Days.join(', ') : 'Nenhum cliente'}
                      </p>
                    </div>
                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm font-medium px-3 py-1 rounded-full" data-testid="count-returning-soon">
                      {operations?.returningIn2Days?.length || 0}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Ranking */}
        <Card data-testid="card-sales-ranking">
          <CardContent className="p-6">
            <div className="border-b border-border pb-4 mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Trophy className="text-amber-500 mr-3 w-5 h-5" />
                Ranking de Vendedores (Mês)
              </h3>
            </div>
            <div className="space-y-4">
              {rankingLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : salesRanking?.length ? (
                salesRanking.map((seller: any, index: number) => (
                  <div key={seller.id} className="flex items-center justify-between" data-testid={`ranking-seller-${index}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${
                        index === 0 ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200' :
                        index === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200' :
                        index === 2 ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                        'bg-muted text-muted-foreground'
                      } rounded-full flex items-center justify-center font-bold text-sm`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground" data-testid={`seller-name-${index}`}>{seller.nome}</p>
                        <p className="text-sm text-muted-foreground" data-testid={`seller-sales-count-${index}`}>{seller.salesCount} vendas</p>
                      </div>
                    </div>
                    <p className="font-semibold text-foreground" data-testid={`seller-total-${index}`}>
                      R$ {seller.totalSales?.toLocaleString('pt-BR') || '0,00'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhum vendedor encontrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card data-testid="card-quick-actions">
        <CardContent className="p-6">
          <div className="border-b border-border pb-4 mb-6">
            <h3 className="text-lg font-semibold text-foreground">Ações Rápidas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="ghost"
              className="h-auto flex-col p-6 border border-border hover:bg-accent group"
              onClick={() => setLocation('/sales')}
              data-testid="button-new-sale"
            >
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Plus className="text-primary-foreground w-6 h-6" />
              </div>
              <p className="font-medium text-foreground">Nova Venda</p>
              <p className="text-sm text-muted-foreground text-center">Criar novo orçamento ou venda</p>
            </Button>
            
            <Button
              variant="ghost"
              className="h-auto flex-col p-6 border border-border hover:bg-accent group"
              onClick={() => setLocation('/financial')}
              data-testid="button-financial"
            >
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <DollarSign className="text-white w-6 h-6" />
              </div>
              <p className="font-medium text-foreground">Financeiro</p>
              <p className="text-sm text-muted-foreground text-center">Contas a pagar e receber</p>
            </Button>
            
            <Button
              variant="ghost"
              className="h-auto flex-col p-6 border border-border hover:bg-accent group"
              onClick={() => setLocation('/clients')}
              data-testid="button-new-client"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <UserPlus className="text-white w-6 h-6" />
              </div>
              <p className="font-medium text-foreground">Novo Cliente</p>
              <p className="text-sm text-muted-foreground text-center">Cadastrar cliente</p>
            </Button>
            
            <Button
              variant="ghost"
              className="h-auto flex-col p-6 border border-border hover:bg-accent group"
              data-testid="button-reports"
            >
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileText className="text-white w-6 h-6" />
              </div>
              <p className="font-medium text-foreground">Relatórios</p>
              <p className="text-sm text-muted-foreground text-center">Gerar relatórios</p>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
