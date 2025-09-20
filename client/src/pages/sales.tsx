import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SaleForm } from "@/components/sales/sale-form";
import { Plus, Search, Eye, Edit, Trash2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Sales() {
  const [showForm, setShowForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [loadingEditSale, setLoadingEditSale] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  });

  const { toast } = useToast();

  const { data: sales, isLoading } = useQuery({
    queryKey: ["/api/sales"],
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      orcamento: { label: "Orçamento", variant: "secondary" as const },
      venda: { label: "Venda", variant: "default" as const },
      cancelada: { label: "Cancelada", variant: "destructive" as const },
    };
    const statusConfig = statusMap[status as keyof typeof statusMap] || statusMap.orcamento;
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const handleNewSale = () => {
    setSelectedSale(null);
    setShowForm(true);
  };

  const handleEditSale = async (sale: any) => {
    setLoadingEditSale(true);
    try {
      // Fetch complete sale data including related records
      const response = await fetch(`/api/sales/${sale.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch sale details');
      }
      
      const completeSaleData = await response.json();
      setSelectedSale(completeSaleData);
      setShowForm(true);
    } catch (error) {
      toast({
        title: "Erro ao carregar venda",
        description: "Não foi possível carregar os detalhes da venda.",
        variant: "destructive",
      });
      console.error('Error fetching sale details:', error);
    } finally {
      setLoadingEditSale(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedSale(null);
  };

  if (showForm) {
    return (
      <SaleForm
        sale={selectedSale}
        clients={clients || []}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div className="p-8" data-testid="sales-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-sales-title">Vendas & Orçamentos</h1>
          <p className="text-muted-foreground mt-2">Gerencie suas vendas e orçamentos</p>
        </div>
        <Button onClick={handleNewSale} data-testid="button-new-sale">
          <Plus className="w-4 h-4 mr-2" />
          Nova Venda
        </Button>
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
                placeholder="Buscar por referência ou cliente..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                data-testid="input-search"
              />
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
                  <SelectItem value="orcamento">Orçamento</SelectItem>
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="date"
                placeholder="Data inicial"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                data-testid="input-date-from"
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="Data final"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                data-testid="input-date-to"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card data-testid="card-sales-table">
        <CardHeader>
          <CardTitle>Lista de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : sales?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referência</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Lucro</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale: any) => (
                    <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                      <TableCell className="font-medium" data-testid={`cell-reference-${sale.id}`}>
                        {sale.referencia}
                      </TableCell>
                      <TableCell data-testid={`cell-client-${sale.id}`}>
                        {sale.client?.nome || 'Cliente não encontrado'}
                      </TableCell>
                      <TableCell data-testid={`cell-status-${sale.id}`}>
                        {getStatusBadge(sale.status)}
                      </TableCell>
                      <TableCell data-testid={`cell-total-${sale.id}`}>
                        <span className="font-semibold text-emerald-600">
                          R$ {parseFloat(sale.valorTotal || 0).toLocaleString('pt-BR')}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-profit-${sale.id}`}>
                        <span className="font-semibold text-emerald-600">
                          R$ {parseFloat(sale.lucro || 0).toLocaleString('pt-BR')}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-date-${sale.id}`}>
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost" data-testid={`button-view-${sale.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEditSale(sale)}
                            disabled={loadingEditSale}
                            data-testid={`button-edit-${sale.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" data-testid={`button-delete-${sale.id}`}>
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
              <p className="text-muted-foreground" data-testid="text-no-sales">
                Nenhuma venda encontrada
              </p>
              <Button onClick={handleNewSale} className="mt-4" data-testid="button-create-first-sale">
                <Plus className="w-4 h-4 mr-2" />
                Criar primeira venda
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
