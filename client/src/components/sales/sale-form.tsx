import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  ArrowLeft, 
  ArrowRight,
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

// Schema para um único voo
const flightSchema = z.object({
  numeroVoo: z.string().min(1, "Número do voo é obrigatório"),
  horarioEmbarque: z.string().min(1, "Horário de embarque é obrigatório"),
  horarioChegada: z.string().min(1, "Horário de chegada é obrigatório"),
  aeroportoOrigem: z.string().min(1, "Aeroporto de origem é obrigatório"),
  aeroportoDestino: z.string().min(1, "Aeroporto de destino é obrigatório"),
  companhiaAerea: z.string().optional(),
  classe: z.string().optional(),
  observacoes: z.string().optional(),
});

// Schema para detalhes do serviço aéreo (múltiplos voos)
const flightDetailsSchema = z.object({
  voos: z.array(flightSchema).min(1, "Pelo menos um voo deve ser adicionado"),
});

// Schema para passageiros selecionados no serviço
const servicePassengerSchema = z.object({
  passageiroId: z.number(),
  valorVenda: z.string().min(1, "Valor de venda é obrigatório"),
  valorCusto: z.string().min(1, "Valor de custo é obrigatório"),
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

// Schema para requisitos/tarefas da venda
const requirementSchema = z.object({
  tipo: z.enum(["checkin", "cartinha", "documentacao", "pagamento", "outros"]),
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  dataVencimento: z.string().optional(),
  prioridade: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
  observacoes: z.string().optional(),
});

type PassengerFormData = z.infer<typeof passengerSchema>;
type ServiceFormData = z.infer<typeof serviceSchema>;
type RequirementFormData = z.infer<typeof requirementSchema>;
type FlightFormData = z.infer<typeof flightSchema>;
type FlightDetailsFormData = z.infer<typeof flightDetailsSchema>;
type ServicePassengerFormData = z.infer<typeof servicePassengerSchema>;
type HotelDetailsFormData = z.infer<typeof hotelDetailsSchema>;
type SellerFormData = z.infer<typeof sellerSchema>;
type PaymentPlanFormData = z.infer<typeof paymentPlanSchema>;

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
  
  // States for flight management
  const [flights, setFlights] = useState<FlightFormData[]>([]);
  const [selectedServicePassengers, setSelectedServicePassengers] = useState<ServicePassengerFormData[]>([]);
  const [currentServiceType, setCurrentServiceType] = useState<string>("");

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
    if (saleRequirements && Array.isArray(saleRequirements)) {
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

  // Form for individual flight details
  const flightForm = useForm<FlightFormData>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      numeroVoo: "",
      horarioEmbarque: "",
      horarioChegada: "",
      aeroportoOrigem: "",
      aeroportoDestino: "",
      companhiaAerea: "",
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
      titulo: "",
      descricao: "", 
      dataVencimento: "", 
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
      return await apiRequest("/api/sales", "POST", data);
    },
    onSuccess: async (newSale: any) => {
      // Create requirements for the new sale if any exist
      if (requirements.length > 0 && newSale?.id) {
        try {
          for (const requirement of requirements) {
            // Remove the temporary ID and create requirement
            const { id, ...requirementData } = requirement;
            await apiRequest(`/api/sales/${newSale.id}/requirements`, "POST", requirementData);
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
      await apiRequest(`/api/sales/${sale?.id}`, "PUT", data);
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
      return await apiRequest(`/api/sales/${sale.id}/requirements`, "POST", data);
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
      return await apiRequest(`/api/requirements/${id}`, "PUT", data);
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
      return await apiRequest(`/api/requirements/${id}/complete`, "PUT", {});
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
      return await apiRequest(`/api/requirements/${id}`, "DELETE");
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
      await apiRequest(`/api/sales/${saleId}/status`, "PUT", { status: "venda" });
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
      return await apiRequest("/api/clients", "POST", data);
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

  // Update service form totals when selected service passengers change
  const updateServiceTotals = () => {
    const totals = selectedServicePassengers.reduce(
      (acc, passenger) => ({
        valorVenda: acc.valorVenda + parseFloat(passenger.valorVenda || "0"),
        valorCusto: acc.valorCusto + parseFloat(passenger.valorCusto || "0")
      }),
      { valorVenda: 0, valorCusto: 0 }
    );
    
    // Update form values with calculated totals
    serviceForm.setValue('valorVenda', totals.valorVenda.toFixed(2));
    serviceForm.setValue('valorCusto', totals.valorCusto.toFixed(2));
  };

  // Update totals whenever selectedServicePassengers changes
  useEffect(() => {
    updateServiceTotals();
  }, [selectedServicePassengers]);

  // Functions for managing flights
  const handleAddFlight = (data: FlightFormData) => {
    setFlights([...flights, { ...data }]);
    flightForm.reset();
    toast({ title: "Voo adicionado com sucesso!" });
  };

  const handleRemoveFlight = (index: number) => {
    setFlights(flights.filter((_, i) => i !== index));
    toast({ title: "Voo removido com sucesso!" });
  };

  // Function to handle passenger selection for services
  const handleTogglePassengerSelection = (passengerId: number) => {
    const existingIndex = selectedServicePassengers.findIndex(sp => sp.passageiroId === passengerId);
    
    if (existingIndex >= 0) {
      // Remove passenger
      setSelectedServicePassengers(selectedServicePassengers.filter((_, i) => i !== existingIndex));
    } else {
      // Add passenger with default values
      setSelectedServicePassengers([
        ...selectedServicePassengers,
        {
          passageiroId: passengerId,
          valorVenda: "0",
          valorCusto: "0"
        }
      ]);
    }
  };

  const handleUpdatePassengerValue = (passengerId: number, field: 'valorVenda' | 'valorCusto', value: string) => {
    setSelectedServicePassengers(prev => 
      prev.map(sp => 
        sp.passageiroId === passengerId 
          ? { ...sp, [field]: value }
          : sp
      )
    );
  };

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
    // Validate flights for airline services
    if (data.tipo === "aereo" && flights.length === 0) {
      toast({ 
        title: "Erro de validação",
        description: "Adicione pelo menos um voo para serviços aéreos",
        variant: "destructive"
      });
      return;
    }

    let serviceData = { ...data };
    
    // Se for serviço aéreo, incluir detalhes do voo
    if (data.tipo === "aereo") {
      serviceData.detalhes = { voos: flights };
    }
    
    // Se for serviço de hotel, incluir detalhes do hotel
    if (data.tipo === "hotel") {
      const hotelDetails = hotelDetailsForm.getValues();
      serviceData.detalhes = hotelDetails;
    }

    // Include selected passengers and their values
    (serviceData as any).servicePassengers = selectedServicePassengers;
    
    if (editingItem) {
      setServices(services.map(s => s.id === editingItem.id ? { ...editingItem, ...serviceData } : s));
    } else {
      setServices([...services, { ...serviceData, id: Date.now() }]);
    }
    setShowServiceModal(false);
    setEditingItem(null);
    serviceForm.reset();
    flightForm.reset();
    setFlights([]);
    setSelectedServicePassengers([]);
    hotelDetailsForm.reset();
  };

  const handleAddSeller = (data: SellerFormData) => {
    const seller = (sellers && Array.isArray(sellers)) ? sellers.find((s: any) => s.id === data.vendedorId) : null;
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
                    <p><strong>Fornecedor:</strong> {(suppliers && Array.isArray(suppliers)) ? suppliers.find((s: any) => s.id === service.fornecedorId)?.nome || 'N/A' : 'N/A'}</p>
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
                  <div className="font-medium">{(sellers && Array.isArray(sellers)) ? sellers.find((s: any) => s.id === seller.vendedorId)?.nome || 'Vendedor não encontrado' : 'Vendedor não encontrado'}</div>
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
                    <div 
                      className={`flex items-center space-x-2 cursor-pointer hover:text-primary transition-colors ${step === stepItem.id ? 'text-primary' : 'text-muted-foreground'}`}
                      onClick={() => setStep(stepItem.id)}
                      data-testid={`step-${stepItem.id}`}
                    >
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
                      className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors ${
                        step === stepItem.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                      }`}
                      onClick={() => setStep(stepItem.id)}
                      data-testid={`sidebar-step-${stepItem.id}`}
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
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setStep(Math.min(5, step + 1))}
                      variant="outline"
                      disabled={step === 5}
                    >
                      Próximo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
              <Button
                onClick={handleSave}
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
        <DialogContent className="max-w-2xl" data-testid="dialog-passenger">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Passageiro" : "Adicionar Passageiro"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Modifique as informações do passageiro" : "Adicione um novo passageiro à reserva"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...passengerForm}>
            <form onSubmit={passengerForm.handleSubmit(handleAddPassenger)} className="space-y-4">
              {/* Name */}
              <FormField
                control={passengerForm.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite o nome completo"
                        data-testid="input-passenger-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CPF */}
              <FormField
                control={passengerForm.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00"
                        data-testid="input-passenger-cpf"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Birth Date */}
              <FormField
                control={passengerForm.control}
                name="dataNascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        data-testid="input-passenger-birthdate"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Function/Role */}
              <FormField
                control={passengerForm.control}
                name="funcao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-passenger-role">
                          <SelectValue placeholder="Selecione a função" />
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

              {/* Observations */}
              <FormField
                control={passengerForm.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações adicionais (opcional)"
                        data-testid="textarea-passenger-notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPassengerModal(false)}
                  data-testid="button-passenger-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  data-testid="button-passenger-save"
                >
                  {editingItem ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Service Modal */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-service">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Serviço" : "Adicionar Serviço"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Modifique as informações do serviço" : "Adicione um novo serviço à reserva"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(handleAddService)} className="space-y-4">
              {/* Service Type */}
              <FormField
                control={serviceForm.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Serviço</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-service-type">
                          <SelectValue placeholder="Selecione o tipo de serviço" />
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

              {/* Description */}
              <FormField
                control={serviceForm.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva o serviço..."
                        data-testid="textarea-service-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Localizador */}
              <FormField
                control={serviceForm.control}
                name="localizador"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localizador</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Código localizador (opcional)"
                        data-testid="input-service-localizador"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Supplier */}
              <FormField
                control={serviceForm.control}
                name="fornecedorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-service-supplier">
                          <SelectValue placeholder="Selecione um fornecedor (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(suppliers) ? suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.nome}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="valorVenda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor de Venda (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          data-testid="input-service-sale-price"
                          {...field}
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
                      <FormLabel>Valor de Custo (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          data-testid="input-service-cost-price"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Flight Details Section - Only for Aereo services */}
              {serviceForm.watch("tipo") === "aereo" && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Plane className="w-5 h-5" />
                      Detalhes dos Voos
                    </h3>
                  </div>

                  {/* Flight Form */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-3">Adicionar Voo</h4>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Flight Number */}
                          <FormField
                            control={flightForm.control}
                            name="numeroVoo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Número do Voo</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Ex: TAM 3054"
                                    data-testid="input-flight-number"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Company */}
                          <FormField
                            control={flightForm.control}
                            name="companhiaAerea"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Companhia Aérea</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Ex: TAM, GOL, Azul"
                                    data-testid="input-airline"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Origin Airport */}
                          <FormField
                            control={flightForm.control}
                            name="aeroportoOrigem"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Aeroporto de Origem</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Ex: CGH, GRU, SDU"
                                    data-testid="input-origin-airport"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Destination Airport */}
                          <FormField
                            control={flightForm.control}
                            name="aeroportoDestino"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Aeroporto de Destino</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Ex: CGH, GRU, SDU"
                                    data-testid="input-destination-airport"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Departure Time */}
                          <FormField
                            control={flightForm.control}
                            name="horarioEmbarque"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Horário de Embarque</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="time"
                                    data-testid="input-departure-time"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Arrival Time */}
                          <FormField
                            control={flightForm.control}
                            name="horarioChegada"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Horário de Chegada</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="time"
                                    data-testid="input-arrival-time"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Class and Observations */}
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={flightForm.control}
                            name="classe"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Classe</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Ex: Econômica, Executiva"
                                    data-testid="input-flight-class"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                        </div>

                        {/* Flight Observations */}
                        <FormField
                          control={flightForm.control}
                          name="observacoes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observações do Voo</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Observações adicionais sobre este voo"
                                  data-testid="textarea-flight-notes"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      
                      <div className="flex gap-2 mt-3">
                        <Button 
                          type="button"
                          onClick={() => {
                            const data = flightForm.getValues();
                            if (data.numeroVoo && data.horarioEmbarque && data.horarioChegada && data.aeroportoOrigem && data.aeroportoDestino) {
                              handleAddFlight(data);
                            } else {
                              toast({ 
                                title: "Campos obrigatórios", 
                                description: "Preencha todos os campos obrigatórios do voo",
                                variant: "destructive" 
                              });
                            }
                          }}
                          data-testid="button-add-flight"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Voo
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Flights List */}
                  {flights.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Voos Adicionados ({flights.length})</h4>
                      <div className="space-y-2">
                        {flights.map((flight, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-4">
                                <span className="font-medium">{flight.numeroVoo}</span>
                                <span className="text-sm text-gray-600">
                                  {flight.aeroportoOrigem} → {flight.aeroportoDestino}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {flight.horarioEmbarque} - {flight.horarioChegada}
                                </span>
                                {flight.companhiaAerea && (
                                  <span className="text-sm text-gray-500">({flight.companhiaAerea})</span>
                                )}
                              </div>
                              {flight.observacoes && (
                                <p className="text-sm text-gray-500 mt-1">{flight.observacoes}</p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveFlight(index)}
                              data-testid={`button-remove-flight-${index}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Passenger Selection Section - For all service types */}
              {passengers.length > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">Selecionar Passageiros</h3>
                  <p className="text-sm text-gray-600">
                    Selecione os passageiros que utilizarão este serviço e defina os valores individuais
                  </p>
                  
                  <div className="space-y-3">
                    {passengers.map((passenger: any) => {
                      const isSelected = selectedServicePassengers.some(sp => sp.passageiroId === passenger.id);
                      const passengerData = selectedServicePassengers.find(sp => sp.passageiroId === passenger.id);
                      
                      return (
                        <div key={passenger.id} className="border rounded-lg p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTogglePassengerSelection(passenger.id)}
                              className="rounded"
                              data-testid={`checkbox-passenger-${passenger.id}`}
                            />
                            <span className="font-medium">{passenger.nome}</span>
                            <Badge variant="secondary">{passenger.funcao}</Badge>
                          </div>
                          
                          {isSelected && (
                            <div className="grid grid-cols-2 gap-3 ml-6">
                              <div>
                                <label className="text-sm font-medium">Valor de Venda (R$)</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0,00"
                                  value={passengerData?.valorVenda || "0"}
                                  onChange={(e) => handleUpdatePassengerValue(passenger.id, 'valorVenda', e.target.value)}
                                  data-testid={`input-passenger-sale-${passenger.id}`}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Valor de Custo (R$)</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0,00"
                                  value={passengerData?.valorCusto || "0"}
                                  onChange={(e) => handleUpdatePassengerValue(passenger.id, 'valorCusto', e.target.value)}
                                  data-testid={`input-passenger-cost-${passenger.id}`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowServiceModal(false)}
                  data-testid="button-service-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  data-testid="button-service-save"
                >
                  {editingItem ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Seller Modal */}
      <Dialog open={showSellerModal} onOpenChange={setShowSellerModal}>
        <DialogContent className="max-w-2xl" data-testid="dialog-seller">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Vendedor" : "Adicionar Vendedor"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Modifique as informações do vendedor" : "Adicione um novo vendedor à reserva"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...sellerForm}>
            <form onSubmit={sellerForm.handleSubmit(handleAddSeller)} className="space-y-4">
              {/* Seller Selection */}
              <FormField
                control={sellerForm.control}
                name="vendedorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendedor</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-seller">
                          <SelectValue placeholder="Selecione um vendedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(sellers) ? sellers.map((seller: any) => (
                          <SelectItem key={seller.id} value={seller.id.toString()}>
                            {seller.nome}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Commission Percentage */}
              <FormField
                control={sellerForm.control}
                name="comissaoPercentual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual de Comissão (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0,00"
                        data-testid="input-commission-percentage"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Commission Value Display */}
              {sellerForm.watch("comissaoPercentual") && totals.valorTotal > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Valor da comissão calculado:
                  </p>
                  <p className="text-lg font-semibold text-emerald-600">
                    R$ {((totals.valorTotal * Number(sellerForm.watch("comissaoPercentual") || 0)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowSellerModal(false)}
                  data-testid="button-seller-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  data-testid="button-seller-save"
                >
                  {editingItem ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-3xl" data-testid="dialog-payment">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Pagamento" : "Adicionar Pagamento"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Modifique as informações do pagamento" : "Adicione um novo pagamento à reserva"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handleAddPayment)} className="space-y-4">
              {/* Description */}
              <FormField
                control={paymentForm.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Descrição do pagamento"
                        data-testid="input-payment-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount and Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          data-testid="input-payment-amount"
                          {...field}
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
                      <FormLabel>Data de Vencimento</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          data-testid="input-payment-due-date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Payment Preview Date and Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="dataPrevisaoPagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Prevista Pagamento</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          data-testid="input-payment-preview-date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="formaPagamento"
                  render={({ field }) => {
                    const receiverType = paymentForm.watch("quemRecebe");
                    const availablePaymentMethods = receiverType === "AGENCIA" ? paymentMethodsAgencia : paymentMethodsFornecedor;
                    const isLoadingMethods = !availablePaymentMethods;
                    
                    return (
                      <FormItem>
                        <FormLabel>Forma de Pagamento</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={isLoadingMethods || !receiverType}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue placeholder={
                                !receiverType 
                                  ? "Selecione primeiro quem recebe"
                                  : isLoadingMethods 
                                    ? "Carregando formas de pagamento..." 
                                    : "Selecione a forma de pagamento"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {!isLoadingMethods && availablePaymentMethods?.length === 0 ? (
                              <SelectItem value="" disabled>
                                Nenhuma forma de pagamento encontrada
                              </SelectItem>
                            ) : (
                              availablePaymentMethods?.map((method: any) => (
                                <SelectItem key={method.id} value={method.nome}>
                                  {method.nome}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              {/* Who Receives and Bank Account */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="quemRecebe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quem Recebe</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-receiver">
                            <SelectValue placeholder="Selecione quem recebe" />
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

                <FormField
                  control={paymentForm.control}
                  name="contaBancariaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta Bancária</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-bank-account">
                            <SelectValue placeholder="Selecione a conta (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(bankAccounts) ? bankAccounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.banco} - {account.agencia} - {account.conta}
                            </SelectItem>
                          )) : null}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Client Payer and Amount Paid */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="clientePaganteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente Pagante</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-client">
                            <SelectValue placeholder="Selecione o cliente (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.nome}
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
                      <FormLabel>Valor Já Pago (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          data-testid="input-payment-paid-amount"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Observations */}
              <FormField
                control={paymentForm.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações adicionais (opcional)"
                        data-testid="textarea-payment-notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPaymentModal(false)}
                  data-testid="button-payment-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  data-testid="button-payment-save"
                >
                  {editingItem ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Client Modal */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="max-w-md" data-testid="dialog-client">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Cadastre um novo cliente e adicione automaticamente como passageiro
            </DialogDescription>
          </DialogHeader>
          
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleCreateClient)} className="space-y-4">
              <FormField
                control={clientForm.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" data-testid="input-client-name" {...field} />
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
                      <Input type="email" placeholder="email@exemplo.com" data-testid="input-client-email" {...field} />
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
                      <Input placeholder="(11) 99999-9999" data-testid="input-client-phone" {...field} />
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
                      <Input placeholder="000.000.000-00" data-testid="input-client-cpf" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowClientModal(false)}
                  data-testid="button-client-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  data-testid="button-client-save"
                  disabled={createClientMutation.isPending}
                >
                  {createClientMutation.isPending ? "Criando..." : "Criar Cliente"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Requirement Modal */}
      <Dialog open={showRequirementModal} onOpenChange={setShowRequirementModal}>
        <DialogContent className="max-w-2xl" data-testid="dialog-requirement">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Requisito" : "Adicionar Requisito"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Modifique as informações do requisito" : "Adicione um novo requisito à reserva"}
            </DialogDescription>
          </DialogHeader>
          <Form {...requirementForm}>
            <form 
              onSubmit={requirementForm.handleSubmit((data: RequirementFormData) => {
                if (editingItem && editingItem.type === "requirement") {
                  const updatedRequirements = requirements.map((req) =>
                    req.id === editingItem.id ? { ...req, ...data } : req
                  );
                  setRequirements(updatedRequirements);
                } else {
                  const newRequirement = {
                    id: `temp-${Date.now()}`,
                    ...data
                  };
                  setRequirements([...requirements, newRequirement]);
                }
                requirementForm.reset();
                setShowRequirementModal(false);
                setEditingItem(null);
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={requirementForm.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-requirement-type">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="checkin">Check-in</SelectItem>
                          <SelectItem value="cartinha">Envio de Cartinha</SelectItem>
                          <SelectItem value="documentacao">Documentação</SelectItem>
                          <SelectItem value="pagamento">Pagamento</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-requirement-priority">
                            <SelectValue placeholder="Selecione a prioridade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={requirementForm.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Check-in Aeroporto São Paulo"
                        data-testid="input-requirement-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={requirementForm.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva detalhadamente o que precisa ser feito..."
                        rows={3}
                        data-testid="textarea-requirement-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={requirementForm.control}
                name="dataVencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        data-testid="input-requirement-due-date"
                        {...field}
                      />
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
                    <FormLabel>Observações (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações adicionais..."
                        rows={2}
                        data-testid="textarea-requirement-notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowRequirementModal(false)}
                  data-testid="button-requirement-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  data-testid="button-requirement-save"
                >
                  {editingItem ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
