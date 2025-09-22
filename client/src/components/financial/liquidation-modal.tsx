import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Check, X, Upload } from "lucide-react";

interface LiquidationModalProps {
  account: any;
  bankAccounts: any[];
  categories: any[];
  open: boolean;
  onClose: () => void;
}

export function LiquidationModal({ 
  account, 
  bankAccounts, 
  categories, 
  open, 
  onClose 
}: LiquidationModalProps) {
  const [formData, setFormData] = useState({
    valor: "",
    contaBancariaId: "",
    dataLiquidacao: "",
    categoriaId: "",
    anexos: [] as string[],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (account) {
      setFormData({
        valor: account.valorAberto || "",
        contaBancariaId: "",
        dataLiquidacao: new Date().toISOString().split('T')[0],
        categoriaId: "",
        anexos: [],
      });
    }
  }, [account]);

  const liquidateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest(`/api/financial-accounts/${account.id}/liquidate`, "PUT", data);
    },
    onSuccess: () => {
      toast({ title: "Conta liquidada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      onClose();
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
        title: "Erro ao liquidar conta", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.valor || !formData.contaBancariaId || !formData.dataLiquidacao) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    liquidateMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // In a real implementation, you would upload files to storage
      // For now, we'll just add the file names to the anexos array
      const fileNames = Array.from(files).map(file => file.name);
      setFormData(prev => ({ 
        ...prev, 
        anexos: [...prev.anexos, ...fileNames] 
      }));
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      anexos: prev.anexos.filter((_, i) => i !== index)
    }));
  };

  if (!account) return null;

  const availableCategories = categories.filter(cat => 
    (account.tipo === 'pagar' && ['despesa', 'outros'].includes(cat.tipo)) ||
    (account.tipo === 'receber' && ['receita', 'outros'].includes(cat.tipo))
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="dialog-liquidation">
        <DialogHeader>
          <DialogTitle>Liquidar Conta</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Descrição</Label>
            <p className="font-medium text-foreground" data-testid="text-account-description">
              {account.descricao}
            </p>
          </div>
          
          <div>
            <Label className="text-sm text-muted-foreground">Valor em Aberto</Label>
            <p className="text-lg font-semibold text-foreground" data-testid="text-open-amount">
              {account.tipo === 'receber' ? '+' : '-'} R$ {parseFloat(account.valorAberto || 0).toLocaleString('pt-BR')}
            </p>
          </div>
          
          <div>
            <Label htmlFor="valor">Valor a Liquidar *</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.valor}
              onChange={(e) => handleInputChange("valor", e.target.value)}
              data-testid="input-liquidation-amount"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="contaBancariaId">Conta Bancária *</Label>
            <Select 
              value={formData.contaBancariaId} 
              onValueChange={(value) => handleInputChange("contaBancariaId", value)}
            >
              <SelectTrigger data-testid="select-bank-account">
                <SelectValue placeholder="Selecione uma conta..." />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((bankAccount) => (
                  <SelectItem key={bankAccount.id} value={bankAccount.id.toString()}>
                    {bankAccount.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="dataLiquidacao">Data da Liquidação *</Label>
            <Input
              id="dataLiquidacao"
              type="date"
              value={formData.dataLiquidacao}
              onChange={(e) => handleInputChange("dataLiquidacao", e.target.value)}
              data-testid="input-liquidation-date"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="categoriaId">Categoria</Label>
            <Select 
              value={formData.categoriaId} 
              onValueChange={(value) => handleInputChange("categoriaId", value)}
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Selecione uma categoria..." />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="anexos">Comprovante</Label>
            <div className="space-y-2">
              <Input
                id="anexos"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                data-testid="input-attachment"
                multiple
              />
              {formData.anexos.length > 0 && (
                <div className="space-y-1">
                  {formData.anexos.map((anexo, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                      data-testid={`attachment-${index}`}
                    >
                      <div className="flex items-center space-x-2">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span>{anexo}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        data-testid={`button-remove-attachment-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose}
              disabled={liquidateMutation.isPending}
              data-testid="button-cancel-liquidation"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={liquidateMutation.isPending}
              data-testid="button-confirm-liquidation"
            >
              <Check className="w-4 h-4 mr-2" />
              {liquidateMutation.isPending ? "Liquidando..." : "Confirmar Liquidação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
