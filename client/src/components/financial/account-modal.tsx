import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valorTotal: z.string().min(1, "Valor é obrigatório"),
  valorAberto: z.string().min(1, "Valor é obrigatório"),
  tipo: z.enum(["pagar", "receber"]),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
});

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  account?: any;
  categories?: any[];
}

export function AccountModal({ open, onClose, account, categories }: AccountModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!account;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: "",
      valorTotal: "",
      valorAberto: "",
      tipo: "pagar",
      dataVencimento: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/financial-accounts", "POST", data),
    onSuccess: () => {
      toast({ title: "Lançamento criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-accounts"] });
      handleClose();
    },
    onError: () => {
      toast({ 
        title: "Erro ao criar lançamento", 
        description: "Tente novamente.", 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/financial-accounts/${account.id}`, "PUT", data),
    onSuccess: () => {
      toast({ title: "Lançamento atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-accounts"] });
      handleClose();
    },
    onError: () => {
      toast({ 
        title: "Erro ao atualizar lançamento", 
        description: "Tente novamente.", 
        variant: "destructive" 
      });
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        descricao: account.descricao || "",
        valorTotal: account.valorTotal || "",
        valorAberto: account.valorAberto || "",
        tipo: account.tipo || "pagar",
        dataVencimento: account.dataVencimento 
          ? new Date(account.dataVencimento).toISOString().split('T')[0] 
          : "",
      });
    } else {
      form.reset({
        descricao: "",
        valorTotal: "",
        valorAberto: "",
        tipo: "pagar",
        dataVencimento: "",
      });
    }
  }, [account, form, open]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const data = {
      ...values,
      valorTotal: values.valorTotal,
      valorAberto: values.valorAberto,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="dialog-account-form">
        <DialogHeader>
          <DialogTitle data-testid="title-account-form">
            {isEditing ? "Editar Lançamento" : "Novo Lançamento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ex: Pagamento fornecedor"
                      data-testid="input-description"
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
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-type">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pagar">Conta a Pagar</SelectItem>
                      <SelectItem value="receber">Conta a Receber</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valorTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        data-testid="input-total-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valorAberto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Aberto</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        data-testid="input-open-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dataVencimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Vencimento</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="date"
                      data-testid="input-due-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                {(createMutation.isPending || updateMutation.isPending) 
                  ? "Salvando..." 
                  : "Salvar"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}