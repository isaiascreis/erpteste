import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Plane, 
  Bed, 
  Car, 
  Save,
  Check,
  FileText,
  X,
  Printer
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const passengerSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().optional(),
  dataNascimento: z.string().optional(),
  funcao: z.enum(["passageiro", "contratante"]).default("passageiro"),
  observacoes: z.string().optional(),
});

const clientSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  endereco: z.string().optional(),
  dataNascimento: z.string().optional(),
  observacoes: z.string().optional(),
});

const serviceSchema = z.object({
  tipo: z.enum(["aereo", "hotel", "transfer", "outros"]),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  localizador: z.string().optional(),
  fornecedorId: z.number().optional(),
  valorVenda: z.string().min(1, "Valor de venda é obrigatório"),
  valorCusto: z.string().min(1, "Valor de custo é obrigatório"),
  detalhes: z.any().optional(),
});

const flightDetailsSchema = z.object({
  // Direção da viagem
  direcao: z.enum(["ida", "volta", "ida-volta"]).optional(),
  
  // Voos de ida (ou único voo se for só ida/volta)
  numeroVoo: z.string().optional(),
  companhiaAerea: z.string().optional(),
  origem: z.string().optional(),
  destino: z.string().optional(),
  dataVoo: z.string().optional(),
  horarioPartida: z.string().optional(),
  horarioChegada: z.string().optional(),
  classe: z.string().optional(),
  observacoes: z.string().optional(),
  
  // Voos de volta (apenas para ida-volta)
  numeroVooVolta: z.string().optional(),
  companhiaAereaVolta: z.string().optional(),
  dataVooVolta: z.string().optional(),
  horarioPartidaVolta: z.string().optional(),
  horarioChegadaVolta: z.string().optional(),
  classeVolta: z.string().optional(),
  observacoesVolta: z.string().optional(),
});

const hotelDetailsSchema = z.object({
  nomeHotel: z.string().optional(),
  cidade: z.string().optional(),
  endereco: z.string().optional(),
  dataCheckIn: z.string().optional(),
  dataCheckOut: z.string().optional(),
  regimeAlimentacao: z.enum(["cafe-manha", "meia-pensao", "pensao-completa", "all-inclusive", "sem-refeicao"]).optional(),
  categoriaApartamento: z.string().optional(),
  numeroDiarias: z.string().optional(),
  numeroHospedes: z.string().optional(),
  observacoes: z.string().optional(),
});

const sellerSchema = z.object({
  vendedorId: z.number().min(1, "Vendedor é obrigatório"),
  comissaoPercentual: z.string().min(1, "Comissão é obrigatória"),
});

const paymentPlanSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.string().min(1, "Valor é obrigatório"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  dataPrevisaoPagamento: z.string().optional(),
  formaPagamento: z.string().min(1, "Forma de pagamento é obrigatória"),
  quemRecebe: z.enum(["AGENCIA", "FORNECEDOR"]),
  clientePaganteId: z.preprocess(v => (v === "" ? undefined : v), z.number().int().positive().optional()),
  contaBancariaId: z.string().optional(),
  valorPago: z.string().default("0"),
  observacoes: z.string().optional(),
});

// Import requirement schema from shared types
const requirementSchema = z.object({
  tipo: z.enum(["checkin", "cartinha", "documentacao", "pagamento", "outros"]),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  dataVencimento: z.string().optional(),
  responsavelId: z.string().optional(),
  status: z.enum(["pendente", "em_andamento", "concluida", "cancelada"]).default("pendente"),
  prioridade: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
  observacoes: z.string().optional(),
});

type PassengerFormData = z.infer<typeof passengerSchema>;
type ServiceFormData = z.infer<typeof serviceSchema>;
type FlightDetailsFormData = z.infer<typeof flightDetailsSchema>;
type HotelDetailsFormData = z.infer<typeof hotelDetailsSchema>;
type SellerFormData = z.infer<typeof sellerSchema>;
type PaymentPlanFormData = z.infer<typeof paymentPlanSchema>;
type RequirementFormData = z.infer<typeof requirementSchema>;

interface SaleFormProps {
  sale?: any;
  clients: any[];
  onClose: () => void;
}

export function SaleForm({ sale, clients, onClose }: SaleFormProps) {
  // Detect if we're in edit mode (has existing sale) or create mode
  const isEditMode = Boolean(sale && sale.id);
  
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState("contratante");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [salesSellers, setSalesSellers] = useState<any[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [servicePassengers, setServicePassengers] = useState<{[key: number]: {selected: boolean, valorCusto: string, valorVenda: string}}>({});
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractHtml, setContractHtml] = useState<string>("");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchClient, setSearchClient] = useState("");
  const [showClientModal, setShowClientModal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const { data: sellers } = useQuery({
    queryKey: ["/api/sellers"],
  });

  // Fetch bank accounts
  const { data: bankAccounts } = useQuery({
    queryKey: ["/api/bank-accounts"],
  });

  // Fetch payment methods for both types
  const { data: paymentMethodsAgencia } = useQuery({
    queryKey: ["/api/payment-methods", "AGENCIA"],
    queryFn: async () => {
      const res = await fetch('/api/payment-methods?tipo=AGENCIA', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch payment methods for agency');
      return await res.json();
    },
  });

  const { data: paymentMethodsFornecedor } = useQuery({
    queryKey: ["/api/payment-methods", "FORNECEDOR"], 
    queryFn: async () => {
      const res = await fetch('/api/payment-methods?tipo=FORNECEDOR', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch payment methods for supplier');
      return await res.json();
    },
  });

  // Fetch requirements for existing sale
  const { data: saleRequirements } = useQuery({
    queryKey: ["/api/sales", sale?.id, "requirements"],
    enabled: !!sale?.id,
  });

  // Hydrate requirements state from fetched data
  useEffect(() => {
    if (saleRequirements) {
      setRequirements(saleRequirements);
    }
  }, [saleRequirements]);

  const passengerForm = useForm<PassengerFormData>({
    resolver: zodResolver(passengerSchema),
    defaultValues: { nome: "", cpf: "", dataNascimento: "", funcao: "passageiro", observacoes: "" },
  });

  const serviceForm = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { 
      tipo: "aereo", 
      descricao: "", 
      localizador: "", 
      valorVenda: "", 
      valorCusto: "" 
    },
  });

  const flightDetailsForm = useForm<FlightDetailsFormData>({
    resolver: zodResolver(flightDetailsSchema),
    defaultValues: {
      numeroVoo: "",
      companhiaAerea: "",
      origem: "",
      destino: "",
      dataVoo: "",
      horarioPartida: "",
      horarioChegada: "",
      direcao: "ida",
      classe: "",
      observacoes: "",
    },
  });

  const hotelDetailsForm = useForm<HotelDetailsFormData>({
    resolver: zodResolver(hotelDetailsSchema),
    defaultValues: {
      nomeHotel: "",
      cidade: "",
      endereco: "",
      dataCheckIn: "",
      dataCheckOut: "",
      regimeAlimentacao: "cafe-manha",
      categoriaApartamento: "",
      numeroDiarias: "",
      numeroHospedes: "",
      observacoes: "",
    },
  });

  const sellerForm = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: { comissaoPercentual: "" },
  });

  const paymentForm = useForm<PaymentPlanFormData>({
    resolver: zodResolver(paymentPlanSchema),
    defaultValues: { 
      descricao: "", 
      valor: "", 
      dataVencimento: "", 
      dataPrevisaoPagamento: "",
      formaPagamento: "", 
      quemRecebe: "AGENCIA",
      clientePaganteId: undefined,
      contaBancariaId: "",
      valorPago: "0",
      observacoes: ""
    },
  });

  const requirementForm = useForm<RequirementFormData>({
    resolver: zodResolver(requirementSchema),
    defaultValues: { 
      tipo: "checkin", 
      descricao: "", 
      dataVencimento: "", 
      responsavelId: "", 
      status: "pendente", 
      prioridade: "normal", 
      observacoes: "" 
    },
  });

  const clientForm = useForm<z.infer<typeof clientSchema>>({
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
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/sales", data);
    },
    onSuccess: async (newSale: any) => {
      // Create requirements for the new sale if any exist
      if (requirements.length > 0 && newSale?.id) {
        try {
          for (const requirement of requirements) {
            // Remove the temporary ID and create requirement
            const { id, ...requirementData } = requirement;
            await apiRequest("POST", `/api/sales/${newSale.id}/requirements`, requirementData);
          }
        } catch (error) {
          console.error("Error creating requirements:", error);
          toast({ 
            title: "Venda criada, mas houve erro ao criar algumas tarefas", 
            description: "Você pode adicionar as tarefas manualmente editando a venda.",
            variant: "destructive" 
          });
        }
      }
      
      toast({ title: "Venda criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
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
        title: "Erro ao criar venda", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", `/api/sales/${sale?.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Venda atualizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
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
        title: "Erro ao atualizar venda", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Requirement mutations
  const createRequirementMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!sale?.id) throw new Error("Sale ID required");
      return await apiRequest("POST", `/api/sales/${sale.id}/requirements`, data);
    },
    onSuccess: () => {
      toast({ title: "Tarefa criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales", sale?.id, "requirements"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao criar tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateRequirementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/requirements/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Tarefa atualizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales", sale?.id, "requirements"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao atualizar tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const completeRequirementMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PUT", `/api/requirements/${id}/complete`, {});
    },
    onSuccess: () => {
      toast({ title: "Tarefa marcada como concluída!" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales", sale?.id, "requirements"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao completar tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteRequirementMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/requirements/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Tarefa excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales", sale?.id, "requirements"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao excluir tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const confirmSaleMutation = useMutation({
    mutationFn: async (saleId: number) => {
      await apiRequest("PUT", `/api/sales/${saleId}/status`, { status: "venda" });
    },
    onSuccess: () => {
      toast({ title: "Venda confirmada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
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
        title: "Erro ao confirmar venda", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const generateContractMutation = useMutation({
    mutationFn: async (saleId: number) => {
      const response = await fetch(`/api/sales/${saleId}/generate-contract`, {
        method: "POST",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Handle unauthorized specifically for proper error handling
        if (response.status === 401) {
          throw new Error('401: Unauthorized');
        }
        
        // Try to get error message from JSON response
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao gerar contrato');
          }
        } catch (jsonError) {
          // If JSON parsing fails, use generic error
        }
        
        throw new Error('Erro ao gerar contrato');
      }
      
      // Return JSON with HTML content
      return response.json();
    },
    onSuccess: (data: { success: boolean; htmlContent: string; saleReference: string }) => {
      // Set contract HTML to show in modal
      setContractHtml(data.htmlContent);
      setShowContractModal(true);
      
      toast({ title: "Contrato gerado com sucesso!" });
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
        title: "Erro ao gerar contrato", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clientSchema>) => {
      return await apiRequest("POST", "/api/clients", data);
    },
    onSuccess: (newClient: any) => {
      toast({ title: "Cliente criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      
      // Add the new client as a passenger
      const newPassenger = {
        id: Date.now(),
        clienteId: newClient.id,
        nome: newClient.nome,
        cpf: newClient.cpf,
        dataNascimento: newClient.dataNascimento,
        funcao: "passageiro",
        isFromClients: true
      };
      setPassengers([...passengers, newPassenger]);
      
      // Close modals and reset form
      setShowClientModal(false);
      setShowPassengerModal(false);
      setSearchClient("");
      clientForm.reset();
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

  // Initialize form data if editing
  useEffect(() => {
    if (sale) {
      setSelectedClient(sale.client);
      setPassengers(sale.passengers || []);
      setServices(sale.services || []);
      setSalesSellers(sale.sellers || []);
      setPaymentPlans(sale.paymentPlans || []);
    }
  }, [sale]);

  // Reset payment method when quemRecebe changes
  useEffect(() => {
    const subscription = paymentForm.watch((value, { name }) => {
      if (name === "quemRecebe") {
        paymentForm.setValue("formaPagamento", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [paymentForm]);

  const filteredClients = clients.filter(client =>
    client.nome.toLowerCase().includes(searchClient.toLowerCase()) ||
    (client.cpf && client.cpf.includes(searchClient))
  );

  const totals = services.reduce(
    (acc, service) => {
      acc.valorTotal += Number(service.valorVenda || 0);
      acc.custoTotal += Number(service.valorCusto || 0);
      return acc;
    },
    { valorTotal: 0, custoTotal: 0 }
  );
  totals.lucro = totals.valorTotal - totals.custoTotal;

  // Calculate totals for service passengers
  const calculateServiceTotals = (passengers: {[key: number]: {selected: boolean, valorCusto: string, valorVenda: string}}) => {
    return Object.values(passengers).reduce(
      (acc, passenger) => {
        if (passenger.selected) {
          acc.valorCusto += Number(passenger.valorCusto || 0);
          acc.valorVenda += Number(passenger.valorVenda || 0);
        }
        return acc;
      },
      { valorCusto: 0, valorVenda: 0 }
    );
  };

  // Update service form totals when service passengers change
  const updateServiceTotals = () => {
    const totals = calculateServiceTotals(servicePassengers);
    serviceForm.setValue("valorCusto", totals.valorCusto.toFixed(2));
    serviceForm.setValue("valorVenda", totals.valorVenda.toFixed(2));
  };

  // Handle passenger selection change
  const handlePassengerSelectionChange = (passageiroId: number, checked: boolean) => {
    setServicePassengers(prev => ({
      ...prev,
      [passageiroId]: {
        ...prev[passageiroId],
        selected: checked,
        valorCusto: prev[passageiroId]?.valorCusto || "0",
        valorVenda: prev[passageiroId]?.valorVenda || "0"
      }
    }));
  };

  // Handle passenger cost/sale value change
  const handlePassengerValueChange = (passageiroId: number, field: 'valorCusto' | 'valorVenda', value: string) => {
    setServicePassengers(prev => ({
      ...prev,
      [passageiroId]: {
        ...prev[passageiroId],
        selected: prev[passageiroId]?.selected || false,
        valorCusto: field === 'valorCusto' ? value : (prev[passageiroId]?.valorCusto || "0"),
        valorVenda: field === 'valorVenda' ? value : (prev[passageiroId]?.valorVenda || "0")
      }
    }));
  };

  // Update totals whenever servicePassengers changes
  useEffect(() => {
    updateServiceTotals();
  }, [servicePassengers]);

  const handleAddPassenger = (data: PassengerFormData) => {
    if (editingItem) {
      setPassengers(passengers.map(p => p.id === editingItem.id ? { ...editingItem, ...data } : p));
    } else {
      setPassengers([...passengers, { ...data, id: Date.now() }]);
    }
    setShowPassengerModal(false);
    setEditingItem(null);
    passengerForm.reset();
  };

  const handleAddService = (data: ServiceFormData) => {
    let serviceData = { ...data };
    
    // Se for serviço aéreo, incluir detalhes do voo
    if (data.tipo === "aereo") {
      const flightDetails = flightDetailsForm.getValues();
      serviceData.detalhes = flightDetails;
    }
    
    // Se for serviço de hotel, incluir detalhes do hotel
    if (data.tipo === "hotel") {
      const hotelDetails = hotelDetailsForm.getValues();
      serviceData.detalhes = hotelDetails;
    }

    // Include selected passengers and their values
    serviceData.servicePassengers = Object.entries(servicePassengers)
      .filter(([_, data]) => data.selected)
      .map(([passageiroId, data]) => ({
        passageiroId: parseInt(passageiroId),
        valorCusto: data.valorCusto,
        valorVenda: data.valorVenda
      }));
    
    if (editingItem) {
      setServices(services.map(s => s.id === editingItem.id ? { ...editingItem, ...serviceData } : s));
    } else {
      setServices([...services, { ...serviceData, id: Date.now() }]);
    }
    setShowServiceModal(false);
    setEditingItem(null);
    serviceForm.reset();
    flightDetailsForm.reset();
    hotelDetailsForm.reset();
    setServicePassengers({}); // Reset service passengers state
  };

  const handleAddSeller = (data: SellerFormData) => {
    const seller = sellers?.find(s => s.id === data.vendedorId);
    if (!seller) return;

    const valorComissao = (totals.valorTotal * Number(data.comissaoPercentual)) / 100;
    
    if (editingItem) {
      setSalesSellers(salesSellers.map(s => s.id === editingItem.id ? 
        { ...editingItem, ...data, seller, valorComissao } : s));
    } else {
      setSalesSellers([...salesSellers, { 
        ...data, 
        seller, 
        valorComissao, 
        id: Date.now() 
      }]);
    }
    setShowSellerModal(false);
    setEditingItem(null);
    sellerForm.reset();
  };

  const handleAddPayment = (data: PaymentPlanFormData) => {
    if (editingItem) {
      setPaymentPlans(paymentPlans.map(p => p.id === editingItem.id ? { ...editingItem, ...data } : p));
    } else {
      setPaymentPlans([...paymentPlans, { ...data, id: Date.now() }]);
    }
    setShowPaymentModal(false);
    setEditingItem(null);
    paymentForm.reset();
  };

  const handleAddRequirement = (data: RequirementFormData) => {
    if (editingItem) {
      // Update existing requirement
      updateRequirementMutation.mutate({ id: editingItem.id, data });
    } else {
      // Create new requirement (only for existing sales)
      if (sale?.id) {
        createRequirementMutation.mutate(data);
      } else {
        // For new sales, add to local state until sale is created
        setRequirements([...requirements, { ...data, id: Date.now() }]);
      }
    }
    setShowRequirementModal(false);
    setEditingItem(null);
    requirementForm.reset();
  };

  const handleCreateClient = (data: z.infer<typeof clientSchema>) => {
    createClientMutation.mutate(data);
  };

  const handleCompleteRequirement = (id: number) => {
    if (sale?.id) {
      // Use complete API for existing sales
      completeRequirementMutation.mutate(id);
    } else {
      // Update local state for new sales
      setRequirements(requirements.map(r => 
        r.id === id ? { ...r, status: "concluida", dataConclusao: new Date().toISOString() } : r
      ));
    }
  };

  const handleDeleteRequirement = (id: number) => {
    if (sale?.id && typeof id === 'number' && id > 1000000) {
      // Use delete API for existing sales (real IDs are larger than Date.now() temp IDs)
      deleteRequirementMutation.mutate(id);
    } else {
      // Remove from local state for new sales or temp IDs
      setRequirements(requirements.filter(r => r.id !== id));
    }
  };

  const handleSave = () => {
    if (!selectedClient) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }

    // Remove IDs temporários (gerados com Date.now()) antes de enviar para o backend
    const cleanPassengers = passengers.map(({ id, ...passenger }) => passenger);
    const cleanServices = services.map(({ id, ...service }) => service);
    const cleanSellers = salesSellers.map(({ id, ...seller }) => seller);
    const cleanPaymentPlans = paymentPlans.map(({ id, ...payment }) => payment);
    const cleanRequirements = requirements.map(({ id, ...requirement }) => requirement);

    const saleData = {
      clienteId: selectedClient.id,
      passengers: cleanPassengers,
      services: cleanServices,
      sellers: cleanSellers,
      paymentPlans: cleanPaymentPlans,
      // Note: requirements are handled separately via API calls
    };

    if (sale) {
      updateMutation.mutate(saleData);
    } else {
      createMutation.mutate(saleData);
    }
  };

  const handleConfirmSale = () => {
    if (!sale || !sale.id) {
      toast({ 
        title: "Erro", 
        description: "Salve a venda antes de confirmá-la",
        variant: "destructive" 
      });
      return;
    }

    if (sale.status === "venda") {
      toast({ 
        title: "Esta venda já foi confirmada",
        variant: "destructive" 
      });
      return;
    }

    if (!selectedClient) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }

    if (services.length === 0) {
      toast({ 
        title: "Adicione pelo menos um serviço", 
        variant: "destructive" 
      });
      return;
    }

    confirmSaleMutation.mutate(sale.id);
  };

  const handleGenerateContract = () => {
    if (!sale || !sale.id) {
      toast({ 
        title: "Erro", 
        description: "Salve a venda antes de gerar o contrato",
        variant: "destructive" 
      });
      return;
    }

    if (!selectedClient) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }

    if (services.length === 0) {
      toast({ 
        title: "Adicione pelo menos um serviço", 
        variant: "destructive" 
      });
      return;
    }

    generateContractMutation.mutate(sale.id);
  };

  const getStatusBadge = (status: string = "orcamento") => {
    const statusMap = {
      orcamento: { label: "Orçamento", className: "status-orcamento" },
      venda: { label: "Venda", className: "status-venda" },
      cancelada: { label: "Cancelada", className: "status-cancelada" },
    };
    const statusConfig = statusMap[status as keyof typeof statusMap] || statusMap.orcamento;
    return <Badge className={statusConfig.className}>{statusConfig.label}</Badge>;
  };

  const steps = [
    { id: 1, name: "Contratante & Passageiros", description: "Informações básicas" },
    { id: 2, name: "Serviços", description: "Aéreo, Hotel, Transfer" },
    { id: 3, name: "Vendedores", description: "Comissões" },
    { id: 4, name: "Pagamentos", description: "Plano de pagamento" },
    { id: 5, name: "Tarefas/Exigências", description: "Check-in, Cartinhas, Documentos" },
  ];

  // Render functions for content sections
  const renderContratanteContent = () => (
    <>
      <Card data-testid="card-client-selection">
        <CardHeader>
          <CardTitle>Contratante (pagante)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Buscar Contratante</label>
            <div className="relative mt-1">
              <Input
                type="text"
                placeholder="Digite o nome do contratante..."
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
                className="pr-10"
                data-testid="input-search-client"
              />
            </div>
          </div>

          {/* Client list */}
          <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
            {clients
              ?.filter(client => client.nome.toLowerCase().includes(searchClient.toLowerCase()))
              .map((client: any) => (
                <div
                  key={client.id}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedClient?.id === client.id ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedClient(client)}
                  data-testid={`client-option-${client.id}`}
                >
                  <div className="font-medium">{client.nome}</div>
                  <div className="text-sm text-muted-foreground">{client.email || 'Sem email'}</div>
                </div>
              )) || []}
          </div>

          {selectedClient && (
            <div className="bg-muted p-4 rounded-lg" data-testid="selected-client-info">
              <h3 className="font-medium mb-2">Cliente Selecionado</h3>
              <p><strong>Nome:</strong> {selectedClient.nome}</p>
              {selectedClient.email && <p><strong>Email:</strong> {selectedClient.email}</p>}
              {selectedClient.telefone && <p><strong>Telefone:</strong> {selectedClient.telefone}</p>}
              {selectedClient.cpf && <p><strong>CPF:</strong> {selectedClient.cpf}</p>}
            </div>
          )}

          <Button
            onClick={() => setShowClientModal(true)}
            variant="outline"
            className="w-full"
            data-testid="button-create-client"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Novo Cliente
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-passengers">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Passageiros</CardTitle>
            <Button onClick={() => setShowPassengerModal(true)} size="sm" data-testid="button-add-passenger">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Passageiro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {passengers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <p>Nenhum passageiro adicionado ainda.</p>
              <p className="text-sm">Clique no botão acima para adicionar passageiros.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {passengers.map((passenger) => (
                <div key={passenger.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`passenger-item-${passenger.id}`}>
                  <div>
                    <div className="font-medium">{passenger.nome}</div>
                    <div className="text-sm text-muted-foreground">
                      {passenger.funcao} {passenger.cpf ? `• CPF: ${passenger.cpf}` : ''}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingItem(passenger);
                        setShowPassengerModal(true);
                      }}
                      data-testid={`button-edit-passenger-${passenger.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPassengers(passengers.filter(p => p.id !== passenger.id));
                      }}
                      data-testid={`button-delete-passenger-${passenger.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderServicosContent = () => (
    <Card data-testid="card-services">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Serviços</CardTitle>
          <Button onClick={() => setShowServiceModal(true)} size="sm" data-testid="button-add-service">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Serviço
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Plane className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p>Nenhum serviço adicionado ainda.</p>
            <p className="text-sm">Clique no botão acima para adicionar serviços.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.id} className="border rounded-lg p-4" data-testid={`service-item-${service.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {service.tipo === 'aereo' && <Plane className="w-5 h-5 text-blue-500" />}
                    {service.tipo === 'hotel' && <Bed className="w-5 h-5 text-green-500" />}
                    {service.tipo === 'transfer' && <Car className="w-5 h-5 text-yellow-500" />}
                    <span className="font-medium capitalize">{service.tipo}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingItem(service);
                        setShowServiceModal(true);
                      }}
                      data-testid={`button-edit-service-${service.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setServices(services.filter(s => s.id !== service.id));
                      }}
                      data-testid={`button-delete-service-${service.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Descrição:</strong> {service.descricao}</p>
                  {service.localizador && <p><strong>Localizador:</strong> {service.localizador}</p>}
                  {service.fornecedorId && (
                    <p><strong>Fornecedor:</strong> {suppliers?.find((s: any) => s.id === service.fornecedorId)?.nome || 'N/A'}</p>
                  )}
                  
                  {/* Flight Details Display */}
                  {service.tipo === 'aereo' && service.detalhes && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <h4 className="font-medium text-blue-800 mb-2">Detalhes do Voo</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {service.detalhes.numeroVoo && <p><strong>Voo:</strong> {service.detalhes.numeroVoo}</p>}
                        {service.detalhes.companhiaAerea && <p><strong>Cia Aérea:</strong> {service.detalhes.companhiaAerea}</p>}
                        {service.detalhes.origem && <p><strong>Origem:</strong> {service.detalhes.origem}</p>}
                        {service.detalhes.destino && <p><strong>Destino:</strong> {service.detalhes.destino}</p>}
                        {service.detalhes.dataVoo && <p><strong>Data:</strong> {service.detalhes.dataVoo}</p>}
                        {service.detalhes.horarioSaida && <p><strong>Saída:</strong> {service.detalhes.horarioSaida}</p>}
                        {service.detalhes.horarioChegada && <p><strong>Chegada:</strong> {service.detalhes.horarioChegada}</p>}
                        {service.detalhes.direcao && <p><strong>Direção:</strong> {service.detalhes.direcao}</p>}
                        {service.detalhes.classe && <p><strong>Classe:</strong> {service.detalhes.classe}</p>}
                      </div>
                      {service.detalhes.observacoes && (
                        <p className="mt-2"><strong>Obs:</strong> {service.detalhes.observacoes}</p>
                      )}
                    </div>
                  )}

                  {/* Hotel Details Display */}
                  {service.tipo === 'hotel' && service.detalhes && (
                    <div className="mt-3 p-3 bg-green-50 rounded-md">
                      <h4 className="font-medium text-green-800 mb-2">Detalhes do Hotel</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {service.detalhes.nomeHotel && <p><strong>Hotel:</strong> {service.detalhes.nomeHotel}</p>}
                        {service.detalhes.cidade && <p><strong>Cidade:</strong> {service.detalhes.cidade}</p>}
                        {service.detalhes.endereco && <p><strong>Endereço:</strong> {service.detalhes.endereco}</p>}
                        {service.detalhes.dataCheckin && <p><strong>Check-in:</strong> {service.detalhes.dataCheckin}</p>}
                        {service.detalhes.dataCheckout && <p><strong>Check-out:</strong> {service.detalhes.dataCheckout}</p>}
                        {service.detalhes.regimeAlimentar && <p><strong>Regime:</strong> {service.detalhes.regimeAlimentar}</p>}
                        {service.detalhes.categoriaQuarto && <p><strong>Quarto:</strong> {service.detalhes.categoriaQuarto}</p>}
                        {service.detalhes.numeroNoites && <p><strong>Noites:</strong> {service.detalhes.numeroNoites}</p>}
                        {service.detalhes.numeroHospedes && <p><strong>Hóspedes:</strong> {service.detalhes.numeroHospedes}</p>}
                      </div>
                      {service.detalhes.observacoes && (
                        <p className="mt-2"><strong>Obs:</strong> {service.detalhes.observacoes}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Service Pricing */}
                <div className="mt-3 flex justify-between items-center text-sm">
                  <span>Custo: <span className="font-medium">R$ {parseFloat(service.valorCusto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                  <span>Venda: <span className="font-medium">R$ {parseFloat(service.valorVenda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderVendedoresContent = () => (
    <Card data-testid="card-sellers">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Vendedores</CardTitle>
          <Button onClick={() => setShowSellerModal(true)} size="sm" data-testid="button-add-seller">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Vendedor
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {salesSellers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p>Nenhum vendedor adicionado ainda.</p>
            <p className="text-sm">Clique no botão acima para adicionar vendedores.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {salesSellers.map((seller) => (
              <div key={seller.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`seller-item-${seller.id}`}>
                <div>
                  <div className="font-medium">{sellers?.find((s: any) => s.id === seller.vendedorId)?.nome || 'Vendedor não encontrado'}</div>
                  <div className="text-sm text-muted-foreground">
                    {seller.percentualComissao}% de comissão • R$ {parseFloat(seller.valorComissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(seller);
                      setShowSellerModal(true);
                    }}
                    data-testid={`button-edit-seller-${seller.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSalesSellers(salesSellers.filter(s => s.id !== seller.id));
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
      </CardContent>
    </Card>
  );

  const renderPagamentosContent = () => (
    <Card data-testid="card-payment-plans">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Plano de Pagamento</CardTitle>
          <Button onClick={() => setShowPaymentModal(true)} size="sm" data-testid="button-add-payment">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Parcela
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {paymentPlans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="empty-payment-plans">
            <div className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4 flex items-center justify-center">
              <FileText className="h-8 w-8" />
            </div>
            <p>Nenhuma parcela adicionada ainda.</p>
            <p className="text-sm">Clique no botão acima para adicionar parcelas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paymentPlans.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`payment-item-${payment.id}`}>
                <div>
                  <div className="font-medium">Parcela {payment.numeroParcela}</div>
                  <div className="text-sm text-muted-foreground">
                    Vencimento: {payment.dataVencimento} • 
                    R$ {parseFloat(payment.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} •
                    {payment.metodoPagamentoAgencia ? ` Agência: ${paymentMethodsAgencia?.find((m: any) => m.id === payment.metodoPagamentoAgencia)?.nome}` : ''}
                    {payment.metodoPagamentoFornecedor ? ` Fornecedor: ${paymentMethodsFornecedor?.find((m: any) => m.id === payment.metodoPagamentoFornecedor)?.nome}` : ''}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(payment);
                      setShowPaymentModal(true);
                    }}
                    data-testid={`button-edit-payment-${payment.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPaymentPlans(paymentPlans.filter(p => p.id !== payment.id));
                    }}
                    data-testid={`button-delete-payment-${payment.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTarefasContent = () => (
    <Card data-testid="card-requirements">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tarefas/Exigências</CardTitle>
          <Button onClick={() => setShowRequirementModal(true)} size="sm" data-testid="button-add-requirement">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Tarefa
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {requirements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p>Nenhuma tarefa/exigência adicionada ainda.</p>
            <p className="text-sm">Clique no botão acima para adicionar tarefas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requirements.map((requirement) => (
              <div key={requirement.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`requirement-item-${requirement.id}`}>
                <div>
                  <div className="font-medium">{requirement.descricao}</div>
                  <div className="text-sm text-muted-foreground">
                    {requirement.tipo} • {requirement.status} • 
                    Prioridade: {requirement.prioridade}
                    {requirement.dataVencimento ? ` • Vence: ${requirement.dataVencimento}` : ''}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(requirement);
                      setShowRequirementModal(true);
                    }}
                    data-testid={`button-edit-requirement-${requirement.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRequirements(requirements.filter(r => r.id !== requirement.id));
                    }}
                    data-testid={`button-delete-requirement-${requirement.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-8" data-testid="sale-form-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-sale-form-title">
              {sale ? "Editar Venda/Orçamento" : "Nova Venda/Orçamento"}
            </h1>
            <p className="text-muted-foreground mt-2">
              Referência: <span className="font-medium" data-testid="text-sale-reference">
                {sale?.referencia || "#2025-0001"}
              </span>
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(sale?.status)}
            <Button variant="secondary" onClick={onClose} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Progress Steps (only for create mode) or Tabs (for edit mode) */}
        {!isEditMode ? (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {steps.map((stepItem, index) => (
                  <div key={stepItem.id} className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-2 ${step === stepItem.id ? 'text-primary' : 'text-muted-foreground'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === stepItem.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {stepItem.id}
                      </div>
                      <span className="text-sm font-medium">{stepItem.name}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="w-12 h-px bg-border"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Edit Mode: Tabs Layout */}
            {isEditMode ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="contratante" data-testid="tab-contratante">Contratante</TabsTrigger>
                  <TabsTrigger value="servicos" data-testid="tab-servicos">Serviços</TabsTrigger>
                  <TabsTrigger value="vendedores" data-testid="tab-vendedores">Vendedores</TabsTrigger>
                  <TabsTrigger value="pagamentos" data-testid="tab-pagamentos">Pagamentos</TabsTrigger>
                  <TabsTrigger value="tarefas" data-testid="tab-tarefas">Tarefas</TabsTrigger>
                </TabsList>

                <TabsContent value="contratante" className="mt-6">
                  {renderContratanteContent()}
                </TabsContent>

                <TabsContent value="servicos" className="mt-6">
                  {renderServicosContent()}
                </TabsContent>

                <TabsContent value="vendedores" className="mt-6">
                  {renderVendedoresContent()}
                </TabsContent>

                <TabsContent value="pagamentos" className="mt-6">
                  {renderPagamentosContent()}
                </TabsContent>

                <TabsContent value="tarefas" className="mt-6">
                  {renderTarefasContent()}
                </TabsContent>
              </Tabs>
            ) : (
              // Create Mode: Step-by-step Layout
              <>
                {step === 1 && renderContratanteContent()}
                {step === 2 && renderServicosContent()}
                {step === 3 && renderVendedoresContent()}
                {step === 4 && renderPagamentosContent()}
                {step === 5 && renderTarefasContent()}
              </>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Step Progress (only for create mode) */}
            {!isEditMode && (
              <Card data-testid="card-step-navigation">
                <CardHeader>
                  <CardTitle>Progresso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {steps.map((stepItem) => (
                    <div
                      key={stepItem.id}
                      className={`flex items-center space-x-3 p-2 rounded-lg ${
                        step === stepItem.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        step === stepItem.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {stepItem.id}
                      </div>
                      <span className="text-sm">{stepItem.name}</span>
                      {step > stepItem.id && (
                        <div className="ml-auto">
                          <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <div className="text-green-600 dark:text-green-400 text-xs">✓</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Financial Summary */}
            <Card data-testid="card-financial-summary">
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor Total</span>
                  <span className="financial-positive font-semibold" data-testid="text-total-value">
                    R$ {totals.valorTotal.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Custo Total</span>
                  <span className="financial-negative font-semibold" data-testid="text-total-cost">
                    R$ {totals.custoTotal.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Lucro</span>
                    <span className="text-emerald-600 font-bold text-lg" data-testid="text-profit">
                      R$ {totals.lucro.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Margem: {totals.valorTotal ? ((totals.lucro / totals.valorTotal) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isEditMode && (
                <>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setStep(Math.max(1, step - 1))}
                      variant="outline"
                      disabled={step === 1}
                      className="flex-1"
                      data-testid="button-previous"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setStep(Math.min(5, step + 1))}
                      variant="outline"
                      disabled={step === 5}
                      className="flex-1"
                      data-testid="button-next"
                    >
                      Próximo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
              <Button
                onClick={handleSaveSale}
                variant="outline"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              {sale && sale.status === "venda" && (
                <Button
                  onClick={handleGenerateContract}
                  variant="outline"
                  className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                  disabled={generateContractMutation.isPending}
                  data-testid="button-generate-contract"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {generateContractMutation.isPending ? "Gerando..." : "Gerar Contrato PDF"}
                </Button>
              )}
              <Button
                onClick={handleConfirmSale}
                variant="default"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={createMutation.isPending || updateMutation.isPending || confirmSaleMutation.isPending || !sale}
                data-testid="button-confirm-sale"
              >
                <Check className="w-4 h-4 mr-2" />
                {confirmSaleMutation.isPending ? "Confirmando..." : "Confirmar Venda"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Passenger Modal - With tabs for direct passenger or client search */}
      <Dialog open={showPassengerModal} onOpenChange={setShowPassengerModal}>
        <DialogContent className="max-w-2xl" data-testid="dialog-passenger">}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Edit Mode: Tabs Layout */}
            {isEditMode ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="contratante" data-testid="tab-contratante">Contratante</TabsTrigger>
                  <TabsTrigger value="servicos" data-testid="tab-servicos">Serviços</TabsTrigger>
                  <TabsTrigger value="vendedores" data-testid="tab-vendedores">Vendedores</TabsTrigger>
                  <TabsTrigger value="pagamentos" data-testid="tab-pagamentos">Pagamentos</TabsTrigger>
                  <TabsTrigger value="tarefas" data-testid="tab-tarefas">Tarefas</TabsTrigger>
                </TabsList>

                <TabsContent value="contratante" className="mt-6">
                  {/* Contratante content */}
                  {renderContratanteContent()}
                </TabsContent>

                <TabsContent value="servicos" className="mt-6">
                  {/* Serviços content */}
                  {renderServicosContent()}
                </TabsContent>

                <TabsContent value="vendedores" className="mt-6">
                  {/* Vendedores content */}
                  {renderVendedoresContent()}
                </TabsContent>

                <TabsContent value="pagamentos" className="mt-6">
                  {/* Pagamentos content */}
                  {renderPagamentosContent()}
                </TabsContent>

                <TabsContent value="tarefas" className="mt-6">
                  {/* Tarefas content */}
                  {renderTarefasContent()}
                </TabsContent>
              </Tabs>
            ) : (
              // Create Mode: Step-by-step Layout
              <>
                {/* Step 1: Client Selection */}
                {step === 1 && renderContratanteContent()}
                
                {/* Step 2: Services */}
                {step === 2 && renderServicosContent()}
                
                {/* Step 3: Sellers */}
                {step === 3 && renderVendedoresContent()}
                
                {/* Step 4: Payments */}
                {step === 4 && renderPagamentosContent()}
                
                {/* Step 5: Requirements */}
                {step === 5 && renderTarefasContent()}
              </>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Step Progress (only for create mode) */}
            {!isEditMode && (
              <Card data-testid="card-step-navigation">
                <CardHeader>
                  <CardTitle>Progresso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {steps.map((stepItem) => (
                    <div
                      key={stepItem.id}
                      className={`flex items-center space-x-3 p-2 rounded-lg ${
                        step === stepItem.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        step === stepItem.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {stepItem.id}
                      </div>
                      <span className="text-sm">{stepItem.name}</span>
                      {step > stepItem.id && (
                        <div className="ml-auto">
                          <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <div className="text-green-600 dark:text-green-400 text-xs">✓</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Financial Summary */}
            <Card data-testid="card-financial-summary">
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor Total</span>
                  <span className="financial-positive font-semibold" data-testid="text-total-value">
                    R$ {totals.valorTotal.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Custo Total</span>
                  <span className="financial-negative font-semibold" data-testid="text-total-cost">
                    R$ {totals.custoTotal.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Lucro</span>
                    <span className="text-emerald-600 font-bold text-lg" data-testid="text-profit">
                      R$ {totals.lucro.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Margem: {totals.valorTotal ? ((totals.lucro / totals.valorTotal) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isEditMode && (
                <>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setStep(Math.max(1, step - 1))}
                      variant="outline"
                      disabled={step === 1}
                      className="flex-1"
                      data-testid="button-previous"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setStep(Math.min(5, step + 1))}
                      variant="outline"
                      disabled={step === 5}
                      className="flex-1"
                      data-testid="button-next"
                    >
                      Próximo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
              <Button
                onClick={handleSaveSale}
                variant="outline"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              {sale && sale.status === "venda" && (
                <Button
                  onClick={handleGenerateContract}
                  variant="outline"
                  className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                  disabled={generateContractMutation.isPending}
                  data-testid="button-generate-contract"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {generateContractMutation.isPending ? "Gerando..." : "Gerar Contrato PDF"}
                </Button>
              )}
              <Button
                onClick={handleConfirmSale}
                variant="default"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={createMutation.isPending || updateMutation.isPending || confirmSaleMutation.isPending || !sale}
                data-testid="button-confirm-sale"
              >
                <Check className="w-4 h-4 mr-2" />
                {confirmSaleMutation.isPending ? "Confirmando..." : "Confirmar Venda"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Passenger Modal - With tabs for direct passenger or client search */}
                              service.tipo === 'aereo' ? 'bg-blue-100 dark:bg-blue-900' :
                              service.tipo === 'hotel' ? 'bg-green-100 dark:bg-green-900' :
                              service.tipo === 'transfer' ? 'bg-purple-100 dark:bg-purple-900' :
                              'bg-gray-100 dark:bg-gray-900'
                            }`}>
                              {service.tipo === 'aereo' && <Plane className="text-blue-600 dark:text-blue-400 w-4 h-4" />}
                              {service.tipo === 'hotel' && <Bed className="text-green-600 dark:text-green-400 w-4 h-4" />}
                              {service.tipo === 'transfer' && <Car className="text-purple-600 dark:text-purple-400 w-4 h-4" />}
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">
                                {service.tipo.charAt(0).toUpperCase() + service.tipo.slice(1)}
                              </h4>
                              <p className="text-sm text-muted-foreground">{service.descricao}</p>
                              {service.localizador && (
                                <p className="text-sm text-muted-foreground">
                                  Localizador: {service.localizador}
                                </p>
                              )}
                              {service.tipo === 'aereo' && service.detalhes && (
                                <div className="text-sm text-muted-foreground space-y-1">
                                  {service.detalhes.numeroVoo && (
                                    <p>✈️ Voo: {service.detalhes.numeroVoo}</p>
                                  )}
                                  {service.detalhes.companhiaAerea && (
                                    <p>🏢 Cia: {service.detalhes.companhiaAerea}</p>
                                  )}
                                  {(service.detalhes.origem || service.detalhes.destino) && (
                                    <p>🛫 {service.detalhes.origem} → {service.detalhes.destino}</p>
                                  )}
                                  {service.detalhes.dataVoo && (
                                    <p>📅 {new Date(service.detalhes.dataVoo).toLocaleDateString('pt-BR')}</p>
                                  )}
                                  {service.detalhes.direcao && (
                                    <p>🔄 {service.detalhes.direcao.charAt(0).toUpperCase() + service.detalhes.direcao.slice(1)}</p>
                                  )}
                                </div>
                              )}
                              {service.tipo === 'hotel' && service.detalhes && (
                                <div className="text-sm text-muted-foreground space-y-1">
                                  {service.detalhes.nomeHotel && (
                                    <p>🏨 Hotel: {service.detalhes.nomeHotel}</p>
                                  )}
                                  {service.detalhes.cidade && (
                                    <p>📍 Cidade: {service.detalhes.cidade}</p>
                                  )}
                                  {(service.detalhes.dataCheckIn || service.detalhes.dataCheckOut) && (
                                    <p>📅 Check-in: {service.detalhes.dataCheckIn && new Date(service.detalhes.dataCheckIn).toLocaleDateString('pt-BR')} → Check-out: {service.detalhes.dataCheckOut && new Date(service.detalhes.dataCheckOut).toLocaleDateString('pt-BR')}</p>
                                  )}
                                  {service.detalhes.regimeAlimentacao && (
                                    <p>🍽️ Regime: {service.detalhes.regimeAlimentacao.replace('-', ' ').replace('_', ' ').charAt(0).toUpperCase() + service.detalhes.regimeAlimentacao.replace('-', ' ').replace('_', ' ').slice(1)}</p>
                                  )}
                                  {service.detalhes.categoriaApartamento && (
                                    <p>🛏️ Categoria: {service.detalhes.categoriaApartamento}</p>
                                  )}
                                  {service.detalhes.numeroDiarias && (
                                    <p>📊 Diárias: {service.detalhes.numeroDiarias}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingItem(service);
                                serviceForm.reset(service);
                                if (service.tipo === 'aereo' && service.detalhes) {
                                  flightDetailsForm.reset(service.detalhes);
                                }
                                if (service.tipo === 'hotel' && service.detalhes) {
                                  hotelDetailsForm.reset(service.detalhes);
                                }
                                setShowServiceModal(true);
                              }}
                              data-testid={`button-edit-service-${service.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setServices(services.filter(s => s.id !== service.id))}
                              data-testid={`button-delete-service-${service.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-4">
                            <span className="financial-positive">
                              Venda: R$ {Number(service.valorVenda).toLocaleString('pt-BR')}
                            </span>
                            <span className="financial-negative">
                              Custo: R$ {Number(service.valorCusto).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {services.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground" data-testid="no-services">
                        <Plane className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p>Nenhum serviço adicionado</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Sellers */}
            {step === 3 && (
              <Card data-testid="card-sellers">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Vendedores</CardTitle>
                    <Button 
                      onClick={() => setShowSellerModal(true)} 
                      size="sm"
                      data-testid="button-add-seller"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Vendedor
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {salesSellers.map((saleSeller) => (
                      <div
                        key={saleSeller.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                        data-testid={`seller-item-${saleSeller.id}`}
                      >
                        <div>
                          <p className="font-medium text-foreground">{saleSeller.seller?.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            Comissão: {saleSeller.comissaoPercentual}%
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              R$ {Number(saleSeller.valorComissao || 0).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSalesSellers(salesSellers.filter(s => s.id !== saleSeller.id))}
                            data-testid={`button-delete-seller-${saleSeller.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {salesSellers.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground" data-testid="no-sellers">
                        <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p>Nenhum vendedor adicionado</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Payment Plans */}
            {step === 4 && (
              <Card data-testid="card-payment-plans">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Plano de Pagamento</CardTitle>
                    <Button 
                      onClick={() => setShowPaymentModal(true)} 
                      size="sm"
                      data-testid="button-add-payment"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Parcela
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {paymentPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-3 border border-border rounded-md"
                        data-testid={`payment-item-${plan.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{plan.descricao}</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingItem(plan);
                                paymentForm.reset(plan);
                                setShowPaymentModal(true);
                              }}
                              data-testid={`button-edit-payment-${plan.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPaymentPlans(paymentPlans.filter(p => p.id !== plan.id))}
                              data-testid={`button-delete-payment-${plan.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{plan.formaPagamento} • {plan.quemRecebe} • R$ {Number(plan.valor).toLocaleString('pt-BR')}</p>
                          <p>Vencimento: {new Date(plan.dataVencimento).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    ))}
                    {paymentPlans.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground" data-testid="no-payments">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p>Nenhuma parcela adicionada</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Requirements/Tasks */}
            {step === 5 && (
              <Card data-testid="card-requirements">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Tarefas e Exigências</CardTitle>
                    <Button 
                      onClick={() => setShowRequirementModal(true)} 
                      size="sm"
                      data-testid="button-add-requirement"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Tarefa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requirements.map((requirement) => (
                      <div
                        key={requirement.id}
                        className="p-4 border border-border rounded-lg"
                        data-testid={`requirement-item-${requirement.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge 
                              variant={requirement.tipo === 'checkin' ? 'default' : 
                                     requirement.tipo === 'cartinha' ? 'secondary' : 
                                     requirement.tipo === 'documentacao' ? 'outline' : 'destructive'}
                            >
                              {requirement.tipo === 'checkin' ? '✈️ Check-in' :
                               requirement.tipo === 'cartinha' ? '📝 Cartinha' :
                               requirement.tipo === 'documentacao' ? '📄 Documentos' :
                               requirement.tipo === 'pagamento' ? '💳 Pagamento' : '📋 Outros'}
                            </Badge>
                            <Badge 
                              variant={requirement.status === 'concluida' ? 'default' : 
                                     requirement.status === 'em_andamento' ? 'secondary' : 'outline'}
                            >
                              {requirement.status === 'concluida' ? '✅ Concluída' :
                               requirement.status === 'em_andamento' ? '🔄 Em Andamento' :
                               requirement.status === 'cancelada' ? '❌ Cancelada' : '⏳ Pendente'}
                            </Badge>
                            <Badge variant="outline">
                              {requirement.prioridade === 'urgente' ? '🔴 Urgente' :
                               requirement.prioridade === 'alta' ? '🟡 Alta' :
                               requirement.prioridade === 'baixa' ? '🔵 Baixa' : '⚪ Normal'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            {requirement.status !== 'concluida' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCompleteRequirement(requirement.id)}
                                data-testid={`button-complete-requirement-${requirement.id}`}
                                title="Marcar como concluída"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingItem(requirement);
                                requirementForm.reset(requirement);
                                setShowRequirementModal(true);
                              }}
                              data-testid={`button-edit-requirement-${requirement.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRequirement(requirement.id)}
                              data-testid={`button-delete-requirement-${requirement.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">{requirement.descricao}</p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {requirement.dataVencimento && (
                              <p>📅 Vencimento: {new Date(requirement.dataVencimento).toLocaleDateString('pt-BR')}</p>
                            )}
                            {requirement.responsavelId && (
                              <p>👤 Responsável: {requirement.responsavelId}</p>
                            )}
                            {requirement.observacoes && (
                              <p>📝 Observações: {requirement.observacoes}</p>
                            )}
                            {requirement.dataConclusao && (
                              <p>✅ Concluída em: {new Date(requirement.dataConclusao).toLocaleDateString('pt-BR')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {requirements.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground" data-testid="no-requirements">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p>Nenhuma tarefa adicionada</p>
                        <p className="text-sm mt-2">Adicione tarefas como check-in, cartinhas, documentos e outros requisitos</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <Card data-testid="card-financial-summary">
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor Total</span>
                  <span className="financial-positive font-semibold" data-testid="text-total-value">
                    R$ {totals.valorTotal.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Custo Total</span>
                  <span className="financial-negative font-semibold" data-testid="text-total-cost">
                    R$ {totals.custoTotal.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Lucro</span>
                    <span className="text-emerald-600 font-bold text-lg" data-testid="text-profit">
                      R$ {totals.lucro.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Margem: {totals.valorTotal ? ((totals.lucro / totals.valorTotal) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="space-y-3">
              <div className="flex space-x-2">
                {step > 1 && (
                  <Button
                    variant="secondary"
                    onClick={() => setStep(step - 1)}
                    className="flex-1"
                    data-testid="button-previous"
                  >
                    Anterior
                  </Button>
                )}
                {step < 5 && (
                  <Button
                    onClick={() => setStep(step + 1)}
                    className="flex-1"
                    data-testid="button-next"
                  >
                    Próximo
                  </Button>
                )}
              </div>
              
              {step === 4 && (
                <>
                  <Button
                    onClick={handleSave}
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-sale"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {sale ? "Atualizar Orçamento" : "Salvar Orçamento"}
                  </Button>
                  {sale && sale.status === "venda" && (
                    <Button
                      onClick={handleGenerateContract}
                      variant="outline"
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                      disabled={generateContractMutation.isPending}
                      data-testid="button-generate-contract"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {generateContractMutation.isPending ? "Gerando..." : "Gerar Contrato PDF"}
                    </Button>
                  )}
                  <Button
                    onClick={handleConfirmSale}
                    variant="default"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={createMutation.isPending || updateMutation.isPending || confirmSaleMutation.isPending || !sale}
                    data-testid="button-confirm-sale"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {confirmSaleMutation.isPending ? "Confirmando..." : "Confirmar Venda"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Passenger Modal - With tabs for direct passenger or client search */}
      <Dialog open={showPassengerModal} onOpenChange={setShowPassengerModal}>
        <DialogContent className="max-w-2xl" data-testid="dialog-passenger">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Passageiro" : "Adicionar Passageiro"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Modal content will be implemented here</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Other modals will be implemented here */}
    </div>
  );
}
          
          {/* Toggle between direct form and client search */}
          <div className="space-y-4">
            <div className="flex space-x-1 border-b border-border">
              <Button
                type="button"
                variant={!showClientModal ? "ghost" : "outline"}
                className={`flex-1 ${!showClientModal ? "border-b-2 border-primary bg-muted" : ""}`}
                onClick={() => setShowClientModal(false)}
                data-testid="tab-direct-passenger"
              >
                <User className="w-4 h-4 mr-2" />
                Passageiro Direto
              </Button>
              <Button
                type="button"
                variant={showClientModal ? "ghost" : "outline"}
                className={`flex-1 ${showClientModal ? "border-b-2 border-primary bg-muted" : ""}`}
                onClick={() => setShowClientModal(true)}
                data-testid="tab-from-client"
              >
                <Plus className="w-4 h-4 mr-2" />
                Da Base de Clientes
              </Button>
            </div>

            {!showClientModal ? (
              /* Direct passenger form */
              <Form {...passengerForm}>
                <form onSubmit={passengerForm.handleSubmit(handleAddPassenger)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={passengerForm.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome completo" {...field} data-testid="input-passenger-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passengerForm.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input placeholder="000.000.000-00" {...field} data-testid="input-passenger-cpf" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={passengerForm.control}
                      name="dataNascimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-passenger-birthdate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passengerForm.control}
                      name="funcao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Função</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-passenger-role">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="passageiro">Passageiro</SelectItem>
                              <SelectItem value="contratante">Contratante</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={passengerForm.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observações adicionais..." {...field} data-testid="textarea-passenger-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => {
                        setShowPassengerModal(false);
                        setEditingItem(null);
                        passengerForm.reset();
                      }}
                      data-testid="button-cancel-passenger"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" data-testid="button-save-passenger">
                      {editingItem ? "Atualizar" : "Adicionar"} Passageiro
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              /* Client search section */
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Buscar Cliente Existente</label>
                  <div className="relative mt-1">
                    <Input
                      type="text"
                      placeholder="Digite o nome ou CPF do cliente..."
                      value={searchClient}
                      onChange={(e) => setSearchClient(e.target.value)}
                      data-testid="input-search-passenger-client"
                    />
                  </div>
                  {/* Show filtered clients */}
                  {searchClient && filteredClients && filteredClients.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-md">
                      {filteredClients.map((client: any) => (
                        <div
                          key={client.id}
                          className="p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                          onClick={() => {
                            // Add client as passenger
                            const newPassenger = {
                              id: Date.now(),
                              clienteId: client.id,
                              nome: client.nome,
                              cpf: client.cpf,
                              dataNascimento: client.dataNascimento,
                              funcao: "passageiro",
                              isFromClients: true
                            };
                            setPassengers([...passengers, newPassenger]);
                            setShowPassengerModal(false);
                            setShowClientModal(false);
                            setSearchClient("");
                          }}
                          data-testid={`client-option-${client.id}`}
                        >
                          <div className="font-medium">{client.nome}</div>
                          {client.cpf && <div className="text-sm text-muted-foreground">CPF: {client.cpf}</div>}
                          {client.email && <div className="text-sm text-muted-foreground">Email: {client.email}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Cliente não encontrado?</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setShowPassengerModal(false);
                      setShowClientModal(false);
                    }}
                    data-testid="button-create-new-client-from-passenger"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Novo Cliente e Adicionar como Passageiro
                  </Button>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setShowPassengerModal(false);
                      setShowClientModal(false);
                      setSearchClient("");
                    }}
                    data-testid="button-cancel-passenger-search"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Modal */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="dialog-service">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Serviço" : "Adicionar Serviço"}
            </DialogTitle>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(handleAddService)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-service-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="aereo">Aéreo</SelectItem>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="localizador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localizador</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-service-localizador" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={serviceForm.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-service-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={serviceForm.control}
                name="fornecedorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-supplier">
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="valorVenda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor de Venda *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          data-testid="input-service-sale-value" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="valorCusto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor de Custo *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          data-testid="input-service-cost-value" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Flight Details - Show only for aereo service type */}
              {serviceForm.watch("tipo") === "aereo" && (
                <div className="mt-6 space-y-6">
                  {/* Flight Direction Selection */}
                  <div className="p-4 border border-border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <h4 className="font-semibold text-foreground mb-4 flex items-center">
                      ✈️ Tipo de Viagem
                    </h4>
                    <FormField
                      control={flightDetailsForm.control}
                      name="direcao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Direção</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-flight-direction">
                                <SelectValue placeholder="Selecione o tipo de viagem" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ida">Somente Ida</SelectItem>
                              <SelectItem value="volta">Somente Volta</SelectItem>
                              <SelectItem value="ida-volta">Ida e Volta</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Outbound Flights - Always show for ida or ida-volta */}
                  {(flightDetailsForm.watch("direcao") === "ida" || flightDetailsForm.watch("direcao") === "ida-volta") && (
                    <div className="p-4 border border-border rounded-lg bg-green-50 dark:bg-green-950/20">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center">
                        🛫 Voos de Ida
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={flightDetailsForm.control}
                          name="numeroVoo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número do Voo</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: AD1234" data-testid="input-flight-number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="companhiaAerea"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Companhia Aérea</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Azul, LATAM, GOL" data-testid="input-airline" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="classe"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Classe</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Econômica, Executiva" data-testid="input-class" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="origem"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Aeroporto de Origem</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: São Paulo (GRU)" data-testid="input-origin" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="destino"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Aeroporto de Destino</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Rio de Janeiro (SDU)" data-testid="input-destination" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="dataVoo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data do Voo</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-flight-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="horarioPartida"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário de Partida</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-departure-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="horarioChegada"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário de Chegada</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-arrival-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4">
                        <FormField
                          control={flightDetailsForm.control}
                          name="observacoes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observações dos Voos de Ida</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Conexões, escalas, bagagem ou outras informações..." data-testid="input-flight-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Return Flights - Show only for ida-volta */}
                  {flightDetailsForm.watch("direcao") === "ida-volta" && (
                    <div className="p-4 border border-border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center">
                        🛬 Voos de Volta
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={flightDetailsForm.control}
                          name="numeroVooVolta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número do Voo</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: AD5678" data-testid="input-return-flight-number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="companhiaAereaVolta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Companhia Aérea</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Azul, LATAM, GOL" data-testid="input-return-airline" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="classeVolta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Classe</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Econômica, Executiva" data-testid="input-return-class" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="dataVooVolta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data do Voo</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-return-flight-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="horarioPartidaVolta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário de Partida</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-return-departure-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="horarioChegadaVolta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário de Chegada</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-return-arrival-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4">
                        <FormField
                          control={flightDetailsForm.control}
                          name="observacoesVolta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observações dos Voos de Volta</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Conexões, escalas, bagagem ou outras informações..." data-testid="input-return-flight-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Only Return Flights - Show only for volta */}
                  {flightDetailsForm.watch("direcao") === "volta" && (
                    <div className="p-4 border border-border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center">
                        🛬 Voo de Volta
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={flightDetailsForm.control}
                          name="numeroVoo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número do Voo</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: AD5678" data-testid="input-flight-number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="companhiaAerea"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Companhia Aérea</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Azul, LATAM, GOL" data-testid="input-airline" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="classe"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Classe</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Econômica, Executiva" data-testid="input-class" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="origem"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Aeroporto de Origem</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Rio de Janeiro (SDU)" data-testid="input-origin" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="destino"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Aeroporto de Destino</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: São Paulo (GRU)" data-testid="input-destination" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="dataVoo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data do Voo</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-flight-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="horarioPartida"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário de Partida</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-departure-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flightDetailsForm.control}
                          name="horarioChegada"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário de Chegada</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-arrival-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4">
                        <FormField
                          control={flightDetailsForm.control}
                          name="observacoes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observações do Voo</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Conexões, escalas, bagagem ou outras informações..." data-testid="input-flight-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hotel Details - Show only for hotel service type */}
              {serviceForm.watch("tipo") === "hotel" && (
                <div className="mt-6 p-4 border border-border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center">
                    🏨 Detalhes do Hotel
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={hotelDetailsForm.control}
                      name="nomeHotel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Hotel</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Hotel Copacabana Palace" data-testid="input-hotel-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelDetailsForm.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Rio de Janeiro - RJ" data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelDetailsForm.control}
                      name="endereco"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Av. Atlântica, 1702, Copacabana" data-testid="input-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelDetailsForm.control}
                      name="dataCheckIn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Check-in</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-checkin-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelDetailsForm.control}
                      name="dataCheckOut"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Check-out</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-checkout-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelDetailsForm.control}
                      name="regimeAlimentacao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Regime de Alimentação</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-meal-plan">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cafe-manha">Café da Manhã</SelectItem>
                              <SelectItem value="meia-pensao">Meia Pensão</SelectItem>
                              <SelectItem value="pensao-completa">Pensão Completa</SelectItem>
                              <SelectItem value="all-inclusive">All Inclusive</SelectItem>
                              <SelectItem value="sem-refeicao">Sem Refeição</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelDetailsForm.control}
                      name="categoriaApartamento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria do Apartamento</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Standard, Superior, Deluxe" data-testid="input-room-category" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelDetailsForm.control}
                      name="numeroDiarias"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Diárias</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="Ex: 5" data-testid="input-nights" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelDetailsForm.control}
                      name="numeroHospedes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Hóspedes</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="Ex: 2" data-testid="input-guests" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelDetailsForm.control}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel>Observações do Hotel</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Detalhes adicionais sobre a hospedagem..." data-testid="input-hotel-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Seleção de Passageiros por Serviço */}
              <div className="p-4 border border-border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <h4 className="font-semibold text-foreground mb-4 flex items-center">
                  👥 Passageiros que utilizarão este serviço
                </h4>
                {passengers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Adicione passageiros primeiro para poder selecioná-los para este serviço.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {passengers.map((passenger: any) => (
                      <div key={passenger.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-white dark:bg-gray-800">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox" 
                            id={`passenger-${passenger.id}`}
                            className="w-4 h-4 rounded border-border"
                            checked={servicePassengers[passenger.id]?.selected || false}
                            onChange={(e) => handlePassengerSelectionChange(passenger.id, e.target.checked)}
                            data-testid={`checkbox-passenger-${passenger.id}`}
                          />
                          <label htmlFor={`passenger-${passenger.id}`} className="flex items-center space-x-2 cursor-pointer">
                            <span className="font-medium">{passenger.nome}</span>
                            {passenger.funcao === "contratante" && (
                              <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs px-2 py-1 rounded-full">
                                👤 Contratante
                              </span>
                            )}
                          </label>
                        </div>
                        <div className="flex space-x-2">
                          <div className="flex flex-col">
                            <label className="text-xs text-muted-foreground mb-1">Custo</label>
                            <Input
                              type="number"
                              placeholder="0,00"
                              className="w-20 h-8 text-xs"
                              step="0.01"
                              value={servicePassengers[passenger.id]?.valorCusto || ""}
                              onChange={(e) => handlePassengerValueChange(passenger.id, 'valorCusto', e.target.value)}
                              disabled={!servicePassengers[passenger.id]?.selected}
                              data-testid={`input-cost-${passenger.id}`}
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-muted-foreground mb-1">Venda</label>
                            <Input
                              type="number"
                              placeholder="0,00"
                              className="w-20 h-8 text-xs"
                              step="0.01"
                              value={servicePassengers[passenger.id]?.valorVenda || ""}
                              onChange={(e) => handlePassengerValueChange(passenger.id, 'valorVenda', e.target.value)}
                              disabled={!servicePassengers[passenger.id]?.selected}
                              data-testid={`input-sale-${passenger.id}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground mt-2">
                      💡 Marque os passageiros que utilizarão este serviço e defina valores individuais se necessário.
                      <br />O valor total será calculado automaticamente baseado nos passageiros selecionados.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowServiceModal(false)}
                  data-testid="button-cancel-service"
                >
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-save-service">
                  {editingItem ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Seller Modal */}
      <Dialog open={showSellerModal} onOpenChange={setShowSellerModal}>
        <DialogContent data-testid="dialog-seller">
          <DialogHeader>
            <DialogTitle>Adicionar Vendedor</DialogTitle>
          </DialogHeader>
          <Form {...sellerForm}>
            <form onSubmit={sellerForm.handleSubmit(handleAddSeller)} className="space-y-4">
              <FormField
                control={sellerForm.control}
                name="vendedorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendedor *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-seller">
                          <SelectValue placeholder="Selecione um vendedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sellers?.map((seller: any) => (
                          <SelectItem key={seller.id} value={seller.id.toString()}>
                            {seller.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sellerForm.control}
                name="comissaoPercentual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comissão (%) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        data-testid="input-commission" 
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
                  onClick={() => setShowSellerModal(false)}
                  data-testid="button-cancel-seller"
                >
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-save-seller">
                  Adicionar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Plan Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent data-testid="dialog-payment">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Parcela" : "Adicionar Parcela"}
            </DialogTitle>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handleAddPayment)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-payment-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          data-testid="input-payment-value" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="dataVencimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Vencimento *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-payment-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="formaPagamento"
                  render={({ field }) => {
                    const currentQuemRecebe = paymentForm.watch("quemRecebe");
                    const availablePaymentMethods = currentQuemRecebe === "AGENCIA" 
                      ? paymentMethodsAgencia || [] 
                      : paymentMethodsFornecedor || [];
                    
                    return (
                      <FormItem>
                        <FormLabel>Forma de Pagamento *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-payment-method">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a forma de pagamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availablePaymentMethods.map((method: any) => (
                              <SelectItem key={method.id} value={method.nome}>
                                {method.nome}
                                {method.descricao && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    - {method.descricao}
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={paymentForm.control}
                  name="quemRecebe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quem Recebe *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-receiver">
                            <SelectValue />
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
              </div>
              
              {/* Nova seção com campos adicionais */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="dataPrevisaoPagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previsão de Pagamento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-payment-preview-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="contaBancariaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta Bancária</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bank-account">
                            <SelectValue placeholder="Selecione uma conta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bankAccounts?.map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.nome} - {account.banco}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="clientePaganteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente Pagante</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} value={field.value != null ? String(field.value) : ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-paying-client">
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {passengers?.map((passenger: any) => (
                            <SelectItem key={passenger.id} value={passenger.id.toString()}>
                              {passenger.nome} {passenger.funcao === "contratante" && "(👤 Contratante)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="valorPago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Pago</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          data-testid="input-payment-paid" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={paymentForm.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="input-payment-observations" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Calcular e exibir saldo em aberto */}
              {paymentForm.watch("valor") && paymentForm.watch("valorPago") && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Saldo em Aberto:</span>
                    <span className="text-lg font-bold text-orange-600">
                      R$ {(Number(paymentForm.watch("valor") || 0) - Number(paymentForm.watch("valorPago") || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowPaymentModal(false)}
                  data-testid="button-cancel-payment"
                >
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-save-payment">
                  {editingItem ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Requirement Modal */}
      <Dialog open={showRequirementModal} onOpenChange={setShowRequirementModal}>
        <DialogContent data-testid="dialog-requirement">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
          </DialogHeader>
          <Form {...requirementForm}>
            <form onSubmit={requirementForm.handleSubmit(handleAddRequirement)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={requirementForm.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-requirement-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="checkin">✈️ Check-in</SelectItem>
                          <SelectItem value="cartinha">📝 Cartinha</SelectItem>
                          <SelectItem value="documentacao">📄 Documentação</SelectItem>
                          <SelectItem value="pagamento">💳 Pagamento</SelectItem>
                          <SelectItem value="outros">📋 Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={requirementForm.control}
                  name="prioridade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "normal"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-requirement-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="baixa">🔵 Baixa</SelectItem>
                          <SelectItem value="normal">⚪ Normal</SelectItem>
                          <SelectItem value="alta">🟡 Alta</SelectItem>
                          <SelectItem value="urgente">🔴 Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={requirementForm.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-requirement-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={requirementForm.control}
                  name="dataVencimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Vencimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-requirement-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={requirementForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "pendente"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-requirement-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pendente">⏳ Pendente</SelectItem>
                          <SelectItem value="em_andamento">🔄 Em Andamento</SelectItem>
                          <SelectItem value="concluida">✅ Concluída</SelectItem>
                          <SelectItem value="cancelada">❌ Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={requirementForm.control}
                name="responsavelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ID do usuário responsável" data-testid="input-requirement-responsible" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={requirementForm.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-requirement-observations" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowRequirementModal(false)}
                  data-testid="button-cancel-requirement"
                >
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-save-requirement">
                  {editingItem ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Client Creation Modal */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="max-w-2xl" data-testid="dialog-client-form">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleCreateClient)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={clientForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-client-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-client-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-client-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-client-cpf" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="dataNascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-client-birth-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={clientForm.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-client-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={clientForm.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-client-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowClientModal(false)}
                  data-testid="button-cancel-client"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createClientMutation.isPending}
                  data-testid="button-save-client"
                >
                  {createClientMutation.isPending ? "Criando..." : "Criar Cliente"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Contract Modal */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="modal-contract">
          <DialogHeader>
            <DialogTitle>Contrato de Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Contract HTML Content */}
            <div 
              className="bg-white p-8 border rounded-lg print:border-none print:shadow-none print:bg-white" 
              style={{ minHeight: '600px' }}
              dangerouslySetInnerHTML={{ __html: contractHtml }}
              data-testid="content-contract"
            />
            
            {/* Print Button */}
            <div className="flex justify-center space-x-4 print:hidden">
              <Button
                onClick={() => {
                  // Hide the modal temporarily and open print dialog
                  const originalDisplay = document.body.style.display;
                  
                  // Create a new window for printing
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Contrato de Venda</title>
                          <style>
                            body { 
                              font-family: Arial, sans-serif; 
                              margin: 0; 
                              padding: 20px; 
                              line-height: 1.4; 
                            }
                            @media print {
                              body { margin: 0; padding: 15px; }
                            }
                            @page { size: A4; margin: 1.5cm; }
                          </style>
                        </head>
                        <body>
                          ${contractHtml}
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                    
                    // Close print window after printing
                    setTimeout(() => {
                      printWindow.close();
                    }, 1000);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-print-contract"
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowContractModal(false)}
                data-testid="button-close-contract"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
