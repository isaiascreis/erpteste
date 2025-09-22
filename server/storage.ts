import {
  users,
  clients,
  suppliers,
  sellers,
  sales,
  passengers,
  services,
  servicePassengers,
  saleClients,
  serviceClients,
  saleSellers,
  bankAccounts,
  accountCategories,
  financialAccounts,
  paymentPlans,
  paymentMethods,
  paymentConditions,
  bankTransactions,
  whatsappConversations,
  whatsappMessages,
  saleRequirements,
  saleCommissions,
  notifications,
  documentTemplates,
  contractClauses,
  taskTemplates,
  type User,
  type UpsertUser,
  type Client,
  type InsertClient,
  type Supplier,
  type InsertSupplier,
  type Seller,
  type InsertSeller,
  type Sale,
  type InsertSale,
  type Passenger,
  type InsertPassenger,
  type Service,
  type InsertService,
  type ServicePassenger,
  type InsertServicePassenger,
  type SaleClient,
  type InsertSaleClient,
  type ServiceClient,
  type InsertServiceClient,
  type SaleSeller,
  type InsertSaleSeller,
  type BankAccount,
  type InsertBankAccount,
  type AccountCategory,
  type InsertAccountCategory,
  type FinancialAccount,
  type InsertFinancialAccount,
  type PaymentPlan,
  type InsertPaymentPlan,
  type PaymentMethod,
  type InsertPaymentMethod,
  type PaymentCondition,
  type InsertPaymentCondition,
  type BankTransaction,
  type InsertBankTransaction,
  type InsertUser,
  type UpdateUser,
  type WhatsappConversation,
  type InsertWhatsappConversation,
  type WhatsappMessage,
  type InsertWhatsappMessage,
  type SaleRequirement,
  type InsertSaleRequirement,
  type SaleCommission,
  type InsertSaleCommission,
  type Notification,
  type InsertNotification,
  type DocumentTemplate,
  type InsertDocumentTemplate,
  type ContractClause,
  type InsertContractClause,
  type TaskTemplate,
  type InsertTaskTemplate,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, and, gte, lte, sql, desc, asc, or } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management operations (for sellers management)
  getAllUsers(): Promise<User[]>;
  createUser(userData: InsertUser): Promise<User>;
  updateUser(id: string, userData: UpdateUser): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Dashboard operations
  getDashboardMetrics(): Promise<any>;
  getWeeklyOperations(): Promise<any>;
  getSalesRanking(): Promise<any>;

  // Client operations
  getClients(search?: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: InsertClient): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Supplier operations
  getSuppliers(search?: string): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: InsertSupplier): Promise<Supplier>;
  deleteSupplier(id: number): Promise<void>;

  // Seller operations
  getSellers(): Promise<Seller[]>;
  createSeller(seller: InsertSeller): Promise<Seller>;

  // Sales operations
  getSales(filters: { status?: string; clientId?: number; dateFrom?: string; dateTo?: string }): Promise<any[]>;
  getSaleById(id: number): Promise<any>;
  createSale(saleData: any): Promise<Sale>;
  updateSale(id: number, saleData: any): Promise<Sale>;
  updateSaleStatus(id: number, status: string): Promise<Sale>;

  // Financial operations
  getFinancialAccounts(filters: { tipo?: string; status?: string; search?: string }): Promise<any[]>;
  createFinancialAccount(account: InsertFinancialAccount): Promise<FinancialAccount>;
  liquidateFinancialAccount(id: number, data: any): Promise<any>;
  getFinancialSummary(filters?: { dateFrom?: string; dateTo?: string }): Promise<{
    periodo: string;
    receitas: Array<{ categoria: string; valor: number }>;
    despesas: Array<{ categoria: string; valor: number }>;
    totalReceitas: number;
    totalDespesas: number;
    lucroLiquido: number;
  }>;

  // Banking operations
  getBankAccounts(): Promise<BankAccount[]>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  getBankTransactions(accountId: number, filters: { dateFrom?: string; dateTo?: string }): Promise<any[]>;
  createBankTransaction(transaction: InsertBankTransaction): Promise<BankTransaction>;
  transferBetweenBankAccounts(transferData: {
    contaOrigemId: number;
    contaDestinoId: number;
    valor: number;
    descricao: string;
    observacoes?: string;
  }): Promise<{ 
    transacaoSaida: BankTransaction; 
    transacaoEntrada: BankTransaction;
    contaOrigem: { id: number; nome: string; saldo: string };
    contaDestino: { id: number; nome: string; saldo: string };
  }>;

  // Account Category operations
  getAccountCategories(tipo?: string): Promise<AccountCategory[]>;
  createAccountCategory(category: InsertAccountCategory): Promise<AccountCategory>;
  updateAccountCategory(id: number, category: InsertAccountCategory): Promise<AccountCategory>;
  deleteAccountCategory(id: number): Promise<void>;

  // WhatsApp operations
  getWhatsAppConversations(): Promise<WhatsappConversation[]>;
  getOrCreateConversation(phone: string, name: string): Promise<WhatsappConversation>;
  getConversationByPhone(phone: string): Promise<WhatsappConversation | null>;
  createConversation(conversationData: InsertWhatsappConversation): Promise<WhatsappConversation>;
  updateConversation(id: number, updates: Partial<InsertWhatsappConversation>): Promise<WhatsappConversation>;
  updateConversationStatus(id: number, isOnline: boolean): Promise<WhatsappConversation>;
  getConversationMessages(conversationId: number): Promise<WhatsappMessage[]>;
  createMessage(messageData: InsertWhatsappMessage): Promise<WhatsappMessage>;
  updateMessageStatus(messageId: string, status: WhatsappMessage["status"]): Promise<WhatsappMessage>;
  
  // Multi-agent WhatsApp operations
  assignConversation(conversationId: number, userId: string): Promise<WhatsappConversation>;
  getConversationsByUser(userId: string): Promise<WhatsappConversation[]>;

  // Sale requirements operations
  getSaleRequirements(saleId: number): Promise<SaleRequirement[]>;
  createSaleRequirement(requirement: InsertSaleRequirement): Promise<SaleRequirement>;
  updateSaleRequirement(id: number, requirement: Partial<InsertSaleRequirement>): Promise<SaleRequirement>;
  completeSaleRequirement(id: number): Promise<SaleRequirement>;
  deleteSaleRequirement(id: number): Promise<void>;
  deleteSaleRequirements(saleId: number): Promise<void>;
  deleteSaleServices(saleId: number): Promise<void>;
  deleteSalePassengers(saleId: number): Promise<void>;
  deleteSaleSellers(saleId: number): Promise<void>;
  deleteSale(saleId: number): Promise<void>;

  // Sale commissions operations
  getSaleCommissions(saleId?: number, userId?: string): Promise<SaleCommission[]>;
  createSaleCommission(commission: InsertSaleCommission): Promise<SaleCommission>;
  updateSaleCommission(id: number, commission: Partial<InsertSaleCommission>): Promise<SaleCommission>;
  markCommissionAsReceived(id: number): Promise<SaleCommission>;

  // Notifications operations
  getNotifications(userId?: string, unreadOnly?: boolean): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number, userId?: string): Promise<Notification>;
  deleteNotification(id: number): Promise<void>;

  // Task Template operations - Templates para geração automática de tarefas
  getTaskTemplates(ativo?: boolean): Promise<TaskTemplate[]>;
  createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: number, template: Partial<InsertTaskTemplate>): Promise<TaskTemplate>;
  deleteTaskTemplate(id: number): Promise<void>;
  generateTasksFromTemplates(saleId: number, sale: Sale): Promise<SaleRequirement[]>;

  // Payment methods operations  
  getPaymentMethods(tipo?: "AGENCIA" | "FORNECEDOR"): Promise<PaymentMethod[]>;
  createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: number, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod>;
  deletePaymentMethod(id: number): Promise<void>;

  // Payment conditions operations
  getPaymentConditions(formaPagamentoId?: number): Promise<PaymentCondition[]>;
  createPaymentCondition(data: InsertPaymentCondition): Promise<PaymentCondition>;
  updatePaymentCondition(id: number, data: Partial<InsertPaymentCondition>): Promise<PaymentCondition>;
  deletePaymentCondition(id: number): Promise<void>;

  // Enhanced payment operations with financial sync
  getPaymentPlans(saleId?: number): Promise<PaymentPlan[]>;
  createPaymentPlan(paymentPlan: InsertPaymentPlan): Promise<PaymentPlan>;
  updatePaymentPlan(id: number, data: Partial<InsertPaymentPlan>): Promise<PaymentPlan>;
  deletePaymentPlan(id: number): Promise<void>;
  liquidatePaymentPlan(id: number, liquidationData: { dataLiquidacao: Date; observacoes?: string }): Promise<{
    paymentPlan: PaymentPlan;
    financialAccount?: FinancialAccount;
    commission?: SaleCommission;
  }>;

  // Service Passengers operations - Valores individuais por passageiro em cada serviço
  getServicePassengers(serviceId: number): Promise<ServicePassenger[]>;
  createServicePassenger(data: InsertServicePassenger): Promise<ServicePassenger>;
  updateServicePassenger(id: number, data: Partial<InsertServicePassenger>): Promise<ServicePassenger>;
  deleteServicePassenger(id: number): Promise<void>;
  deleteServicePassengersByService(serviceId: number): Promise<void>;

  // Sale Clients operations - Unified client management for sales
  getSaleClients(vendaId: number): Promise<SaleClient[]>;
  addSaleClient(vendaId: number, data: { clienteId: number; funcao: "contratante" | "passageiro" }): Promise<SaleClient>;
  removeSaleClient(id: number): Promise<void>;

  // Service Clients operations - Client assignments to services
  getServiceClients(servicoId: number): Promise<ServiceClient[]>;
  upsertServiceClient(data: { servicoId: number; clienteId: number; valorVenda?: string; valorCusto?: string }): Promise<ServiceClient>;
  removeServiceClient(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User management operations (for sellers management)
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.firstName));
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData) // Schema defaults handle id, createdAt, updatedAt
      .returning();
    return user;
  }

  async updateUser(id: string, userData: UpdateUser): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Dashboard operations
  async getDashboardMetrics(): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Sales today
    const salesTodayResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${sales.valorTotal} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.status, 'venda'),
          gte(sales.dataVenda, startOfDay)
        )
      );

    // Sales this month
    const salesMonthResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${sales.valorTotal} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.status, 'venda'),
          gte(sales.dataVenda, startOfMonth)
        )
      );

    // Bank accounts total
    const bankBalanceResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${bankAccounts.saldo} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(bankAccounts)
      .where(eq(bankAccounts.ativo, true));

    // Accounts receivable
    const receivableResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${financialAccounts.valorAberto} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.tipo, 'receber'),
          eq(financialAccounts.status, 'pendente')
        )
      );

    return {
      salesToday: Number(salesTodayResult[0]?.total || 0),
      salesTodayCount: Number(salesTodayResult[0]?.count || 0),
      salesMonth: Number(salesMonthResult[0]?.total || 0),
      salesMonthCount: Number(salesMonthResult[0]?.count || 0),
      totalBalance: Number(bankBalanceResult[0]?.total || 0),
      bankAccountsCount: Number(bankBalanceResult[0]?.count || 0),
      accountsReceivable: Number(receivableResult[0]?.total || 0),
      pendingAccountsCount: Number(receivableResult[0]?.count || 0),
    };
  }

  async getWeeklyOperations(): Promise<any> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const in2Days = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
    const in2DaysStr = in2Days.toISOString().split('T')[0];

    // This would need to be implemented based on your travel date tracking
    // For now, returning empty arrays as we don't have travel date fields in the schema
    return {
      travelingToday: [],
      travelingIn2Days: [],
      returningToday: [],
      returningIn2Days: [],
    };
  }

  async getSalesRanking(): Promise<any> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const ranking = await db
      .select({
        id: sellers.id,
        nome: sellers.nome,
        totalSales: sql<number>`COALESCE(SUM(CAST(${sales.valorTotal} AS DECIMAL)), 0)`,
        salesCount: sql<number>`COUNT(${sales.id})`,
      })
      .from(sellers)
      .leftJoin(saleSellers, eq(sellers.id, saleSellers.vendedorId))
      .leftJoin(sales, and(
        eq(saleSellers.vendaId, sales.id),
        eq(sales.status, 'venda'),
        gte(sales.dataVenda, startOfMonth)
      ))
      .groupBy(sellers.id, sellers.nome)
      .orderBy(desc(sql`COALESCE(SUM(CAST(${sales.valorTotal} AS DECIMAL)), 0)`))
      .limit(10);

    return ranking.map(r => ({
      ...r,
      totalSales: Number(r.totalSales),
      salesCount: Number(r.salesCount),
    }));
  }

  // Client operations
  async getClients(search?: string): Promise<Client[]> {
    if (search) {
      return db.select().from(clients)
        .where(
          sql`${clients.nome} ILIKE ${`%${search}%`} OR ${clients.email} ILIKE ${`%${search}%`} OR ${clients.cpf} ILIKE ${`%${search}%`}`
        )
        .orderBy(asc(clients.nome));
    }

    return db.select().from(clients).orderBy(asc(clients.nome));
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(clientData).returning();
    return client;
  }

  async updateClient(id: number, clientData: InsertClient): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Supplier operations
  async getSuppliers(search?: string): Promise<Supplier[]> {
    if (search) {
      return db.select().from(suppliers)
        .where(
          sql`${suppliers.nome} ILIKE ${`%${search}%`} OR ${suppliers.email} ILIKE ${`%${search}%`} OR ${suppliers.cnpj} ILIKE ${`%${search}%`}`
        )
        .orderBy(asc(suppliers.nome));
    }

    return db.select().from(suppliers).orderBy(asc(suppliers.nome));
  }

  async createSupplier(supplierData: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(supplierData).returning();
    return supplier;
  }

  async updateSupplier(id: number, supplierData: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db
      .update(suppliers)
      .set({ ...supplierData, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return supplier;
  }

  async deleteSupplier(id: number): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Seller operations
  async getSellers(): Promise<Seller[]> {
    return db.select().from(sellers).where(eq(sellers.ativo, true)).orderBy(asc(sellers.nome));
  }

  async createSeller(sellerData: InsertSeller): Promise<Seller> {
    const [seller] = await db.insert(sellers).values(sellerData).returning();
    return seller;
  }

  // Sales operations
  async getSales(filters: { status?: string; clientId?: number; dateFrom?: string; dateTo?: string } = {}): Promise<any[]> {
    const conditions = [];
    if (filters.status) {
      conditions.push(eq(sales.status, filters.status as any));
    }
    if (filters.clientId) {
      conditions.push(eq(sales.clienteId, filters.clientId));
    }
    if (filters.dateFrom) {
      conditions.push(gte(sales.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lte(sales.createdAt, new Date(filters.dateTo)));
    }

    if (conditions.length > 0) {
      return db
        .select({
          id: sales.id,
          referencia: sales.referencia,
          status: sales.status,
          valorTotal: sales.valorTotal,
          custoTotal: sales.custoTotal,
          lucro: sales.lucro,
          dataVenda: sales.dataVenda,
          createdAt: sales.createdAt,
          client: {
            id: clients.id,
            nome: clients.nome,
            email: clients.email,
          },
        })
        .from(sales)
        .leftJoin(clients, eq(sales.clienteId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(sales.createdAt));
    }

    return db
      .select({
        id: sales.id,
        referencia: sales.referencia,
        status: sales.status,
        valorTotal: sales.valorTotal,
        custoTotal: sales.custoTotal,
        lucro: sales.lucro,
        dataVenda: sales.dataVenda,
        createdAt: sales.createdAt,
        client: {
          id: clients.id,
          nome: clients.nome,
          email: clients.email,
        },
      })
      .from(sales)
      .leftJoin(clients, eq(sales.clienteId, clients.id))
      .orderBy(desc(sales.createdAt));
  }

  async getSaleById(id: number): Promise<any> {
    const [sale] = await db
      .select({
        id: sales.id,
        referencia: sales.referencia,
        status: sales.status,
        valorTotal: sales.valorTotal,
        custoTotal: sales.custoTotal,
        lucro: sales.lucro,
        observacoes: sales.observacoes,
        dataVenda: sales.dataVenda,
        createdAt: sales.createdAt,
        client: {
          id: clients.id,
          nome: clients.nome,
          email: clients.email,
          telefone: clients.telefone,
          cpf: clients.cpf,
        },
      })
      .from(sales)
      .leftJoin(clients, eq(sales.clienteId, clients.id))
      .where(eq(sales.id, id));

    if (!sale) return null;

    // Get passengers
    const salePassengers = await db
      .select()
      .from(passengers)
      .where(eq(passengers.vendaId, id))
      .orderBy(asc(passengers.id));

    // Get services with details
    const saleServices = await db
      .select({
        id: services.id,
        tipo: services.tipo,
        descricao: services.descricao,
        localizador: services.localizador,
        valorVenda: services.valorVenda,
        valorCusto: services.valorCusto,
        detalhes: services.detalhes,
        supplier: {
          id: suppliers.id,
          nome: suppliers.nome,
        },
      })
      .from(services)
      .leftJoin(suppliers, eq(services.fornecedorId, suppliers.id))
      .where(eq(services.vendaId, id))
      .orderBy(asc(services.id));

    // Get sellers
    const saleSellersData = await db
      .select({
        id: saleSellers.id,
        comissaoPercentual: saleSellers.comissaoPercentual,
        valorComissao: saleSellers.valorComissao,
        seller: {
          id: sellers.id,
          nome: sellers.nome,
        },
      })
      .from(saleSellers)
      .leftJoin(sellers, eq(saleSellers.vendedorId, sellers.id))
      .where(eq(saleSellers.vendaId, id));

    // Get payment plans
    const salePaymentPlans = await db
      .select()
      .from(paymentPlans)
      .where(eq(paymentPlans.vendaId, id))
      .orderBy(asc(paymentPlans.dataVencimento));

    return {
      ...sale,
      passengers: salePassengers,
      services: saleServices,
      sellers: saleSellersData,
      paymentPlans: salePaymentPlans,
    };
  }

  async createSale(saleData: any): Promise<Sale> {
    return db.transaction(async (tx) => {
      // Generate reference
      const referencia = `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Create sale
      const [sale] = await tx
        .insert(sales)
        .values({
          referencia,
          clienteId: saleData.clienteId,
          status: saleData.status || 'orcamento',
          observacoes: saleData.observacoes,
        })
        .returning();

      // Create passengers
      if (saleData.passengers?.length) {
        for (const passenger of saleData.passengers) {
          // Only create passengers with valid names
          if (passenger.nome && passenger.nome.trim()) {
            await tx.insert(passengers).values({
              vendaId: sale.id,
              ...passenger,
            });
          }
        }
      }

      // Create services
      if (saleData.services?.length) {
        for (const service of saleData.services) {
          await tx.insert(services).values({
            vendaId: sale.id,
            ...service,
          });
        }
      }

      // Create sale sellers
      if (saleData.sellers?.length) {
        for (const seller of saleData.sellers) {
          await tx.insert(saleSellers).values({
            vendaId: sale.id,
            ...seller,
          });
        }
      }

      // Create payment plans
      if (saleData.paymentPlans?.length) {
        for (const plan of saleData.paymentPlans) {
          await tx.insert(paymentPlans).values({
            vendaId: sale.id,
            ...plan,
          });
        }
      }

      // Calculate and update totals
      await this.recalculateSaleTotals(sale.id, tx);

      return sale;
    });
  }

  async updateSale(id: number, saleData: any): Promise<Sale> {
    return db.transaction(async (tx) => {
      // Update sale
      const [sale] = await tx
        .update(sales)
        .set({
          clienteId: saleData.clienteId,
          observacoes: saleData.observacoes,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, id))
        .returning();

      // Update passengers (simple approach: delete and recreate)
      await tx.delete(passengers).where(eq(passengers.vendaId, id));
      if (saleData.passengers?.length) {
        for (const passenger of saleData.passengers) {
          // Only create passengers with valid names
          if (passenger.nome && passenger.nome.trim()) {
            await tx.insert(passengers).values({
              vendaId: id,
              ...passenger,
            });
          }
        }
      }

      // Update services
      await tx.delete(services).where(eq(services.vendaId, id));
      if (saleData.services?.length) {
        for (const service of saleData.services) {
          await tx.insert(services).values({
            vendaId: id,
            ...service,
          });
        }
      }

      // Update sellers
      await tx.delete(saleSellers).where(eq(saleSellers.vendaId, id));
      if (saleData.sellers?.length) {
        for (const seller of saleData.sellers) {
          await tx.insert(saleSellers).values({
            vendaId: id,
            ...seller,
          });
        }
      }

      // Update payment plans
      await tx.delete(paymentPlans).where(eq(paymentPlans.vendaId, id));
      if (saleData.paymentPlans?.length) {
        for (const plan of saleData.paymentPlans) {
          await tx.insert(paymentPlans).values({
            vendaId: id,
            ...plan,
          });
        }
      }

      // Recalculate totals
      await this.recalculateSaleTotals(id, tx);

      return sale;
    });
  }

  async updateSaleStatus(id: number, status: string): Promise<Sale> {
    return db.transaction(async (tx) => {
      const [sale] = await tx
        .update(sales)
        .set({
          status: status as any,
          dataVenda: status === 'venda' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, id))
        .returning();

      // If converting to sale, create financial accounts
      if (status === 'venda') {
        await this.createFinancialAccountsForSale(id, tx);
      }

      return sale;
    });
  }

  private async recalculateSaleTotals(saleId: number, tx: any): Promise<void> {
    try {
      const saleServices = await tx
        .select({
          valorVenda: services.valorVenda,
          valorCusto: services.valorCusto,
        })
        .from(services)
        .where(eq(services.vendaId, saleId));

      const totals = saleServices.reduce(
        (acc: any, service: any) => {
          const venda = parseFloat(service.valorVenda?.toString() || '0') || 0;
          const custo = parseFloat(service.valorCusto?.toString() || '0') || 0;
          acc.valorTotal += venda;
          acc.custoTotal += custo;
          return acc;
        },
        { valorTotal: 0, custoTotal: 0 }
      );

      totals.lucro = totals.valorTotal - totals.custoTotal;

      // Ensure values are valid numbers and format them properly
      const valorTotalStr = Math.max(0, totals.valorTotal).toFixed(2);
      const custoTotalStr = Math.max(0, totals.custoTotal).toFixed(2);
      const lucroStr = totals.lucro.toFixed(2);

      await tx
        .update(sales)
        .set({
          valorTotal: valorTotalStr,
          custoTotal: custoTotalStr,
          lucro: lucroStr,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, saleId));
    } catch (error) {
      console.error("Error recalculating sale totals:", error);
      // Don't throw to prevent sale creation from failing
    }
  }

  private async createFinancialAccountsForSale(saleId: number, tx: any): Promise<void> {
    const [sale] = await tx
      .select({
        id: sales.id,
        referencia: sales.referencia,
        clienteId: sales.clienteId,
        valorTotal: sales.valorTotal,
        custoTotal: sales.custoTotal,
      })
      .from(sales)
      .where(eq(sales.id, saleId));

    if (!sale) return;

    // Create account receivable for client
    await tx.insert(financialAccounts).values({
      descricao: `Recebimento Cliente - Venda ${sale.referencia}`,
      vendaId: saleId,
      tipo: 'receber',
      valorTotal: sale.valorTotal,
      valorAberto: sale.valorTotal,
      clienteId: sale.clienteId,
      status: 'pendente',
    });

    // Create account payable for supplier cost
    if (Number(sale.custoTotal) > 0) {
      await tx.insert(financialAccounts).values({
        descricao: `Repasse Fornecedores - Venda ${sale.referencia}`,
        vendaId: saleId,
        tipo: 'pagar',
        valorTotal: sale.custoTotal,
        valorAberto: sale.custoTotal,
        status: 'pendente',
      });
    }

    // Create commission accounts for sellers
    const salesSellers = await tx
      .select({
        valorComissao: saleSellers.valorComissao,
        seller: {
          nome: sellers.nome,
        },
      })
      .from(saleSellers)
      .leftJoin(sellers, eq(saleSellers.vendedorId, sellers.id))
      .where(eq(saleSellers.vendaId, saleId));

    for (const saleSeller of salesSellers) {
      if (Number(saleSeller.valorComissao) > 0) {
        await tx.insert(financialAccounts).values({
          descricao: `Comissão ${saleSeller.seller?.nome} - Venda ${sale.referencia}`,
          vendaId: saleId,
          tipo: 'pagar',
          valorTotal: saleSeller.valorComissao,
          valorAberto: saleSeller.valorComissao,
          status: 'pendente',
        });
      }
    }
  }

  // Financial operations
  async getFinancialAccounts(filters: { tipo?: string; status?: string; search?: string } = {}): Promise<any[]> {
    const conditions = [];
    if (filters.tipo) {
      conditions.push(eq(financialAccounts.tipo, filters.tipo as any));
    }
    if (filters.status) {
      conditions.push(eq(financialAccounts.status, filters.status as any));
    }
    if (filters.search) {
      conditions.push(ilike(financialAccounts.descricao, `%${filters.search}%`));
    }

    if (conditions.length > 0) {
      return db
        .select({
          id: financialAccounts.id,
          descricao: financialAccounts.descricao,
          tipo: financialAccounts.tipo,
          valorTotal: financialAccounts.valorTotal,
          valorLiquidado: financialAccounts.valorLiquidado,
          valorAberto: financialAccounts.valorAberto,
          dataVencimento: financialAccounts.dataVencimento,
          status: financialAccounts.status,
          createdAt: financialAccounts.createdAt,
          client: {
            id: clients.id,
            nome: clients.nome,
          },
          supplier: {
            id: suppliers.id,
            nome: suppliers.nome,
          },
          category: {
            id: accountCategories.id,
            nome: accountCategories.nome,
          },
        })
        .from(financialAccounts)
        .leftJoin(clients, eq(financialAccounts.clienteId, clients.id))
        .leftJoin(suppliers, eq(financialAccounts.fornecedorId, suppliers.id))
        .leftJoin(accountCategories, eq(financialAccounts.categoriaId, accountCategories.id))
        .where(and(...conditions))
        .orderBy(desc(financialAccounts.createdAt));
    }

    return db
      .select({
        id: financialAccounts.id,
        descricao: financialAccounts.descricao,
        tipo: financialAccounts.tipo,
        valorTotal: financialAccounts.valorTotal,
        valorLiquidado: financialAccounts.valorLiquidado,
        valorAberto: financialAccounts.valorAberto,
        dataVencimento: financialAccounts.dataVencimento,
        status: financialAccounts.status,
        createdAt: financialAccounts.createdAt,
        client: {
          id: clients.id,
          nome: clients.nome,
        },
        supplier: {
          id: suppliers.id,
          nome: suppliers.nome,
        },
        category: {
          id: accountCategories.id,
          nome: accountCategories.nome,
        },
      })
      .from(financialAccounts)
      .leftJoin(clients, eq(financialAccounts.clienteId, clients.id))
      .leftJoin(suppliers, eq(financialAccounts.fornecedorId, suppliers.id))
      .leftJoin(accountCategories, eq(financialAccounts.categoriaId, accountCategories.id))
      .orderBy(desc(financialAccounts.createdAt));
  }

  async createFinancialAccount(accountData: InsertFinancialAccount): Promise<FinancialAccount> {
    const [account] = await db.insert(financialAccounts).values({
      ...accountData,
      valorAberto: accountData.valorTotal,
    }).returning();
    return account;
  }

  async liquidateFinancialAccount(id: number, data: any): Promise<any> {
    return db.transaction(async (tx) => {
      // Get current account
      const [account] = await tx
        .select()
        .from(financialAccounts)
        .where(eq(financialAccounts.id, id));

      if (!account) throw new Error('Account not found');

      const valorLiquidado = Number(account.valorLiquidado || 0) + Number(data.valor);
      const valorAberto = Number(account.valorTotal) - valorLiquidado;
      const newStatus = valorAberto <= 0 ? 'liquidado' : valorLiquidado > 0 ? 'parcial' : 'pendente';

      // Update financial account
      const [updatedAccount] = await tx
        .update(financialAccounts)
        .set({
          valorLiquidado: valorLiquidado.toString(),
          valorAberto: valorAberto.toString(),
          status: newStatus as any,
          categoriaId: data.categoriaId,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, id))
        .returning();

      // Get bank account current balance
      const [bankAccount] = await tx
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, data.contaBancariaId));

      if (!bankAccount) throw new Error('Bank account not found');

      const saldoAnterior = Number(bankAccount.saldo);
      const valorTransacao = account.tipo === 'receber' ? Number(data.valor) : -Number(data.valor);
      const saldoNovo = saldoAnterior + valorTransacao;

      // Create bank transaction
      await tx.insert(bankTransactions).values({
        contaBancariaId: data.contaBancariaId,
        contaFinanceiraId: id,
        descricao: account.descricao,
        valor: data.valor.toString(),
        tipo: account.tipo === 'receber' ? 'entrada' : 'saida',
        dataTransacao: new Date(data.dataLiquidacao),
        saldoAnterior: saldoAnterior.toString(),
        saldoNovo: saldoNovo.toString(),
        conciliado: true,
        anexos: data.anexos || [],
      });

      // Update bank account balance
      await tx
        .update(bankAccounts)
        .set({
          saldo: saldoNovo.toString(),
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.id, data.contaBancariaId));

      return updatedAccount;
    });
  }

  async getFinancialSummary(filters?: { dateFrom?: string; dateTo?: string }): Promise<{
    periodo: string;
    receitas: Array<{ categoria: string; valor: number }>;
    despesas: Array<{ categoria: string; valor: number }>;
    totalReceitas: number;
    totalDespesas: number;
    lucroLiquido: number;
  }> {
    const conditions = [];
    
    // Apply date filters if provided
    if (filters?.dateFrom) {
      conditions.push(gte(financialAccounts.createdAt, new Date(filters.dateFrom)));
    }
    if (filters?.dateTo) {
      conditions.push(lte(financialAccounts.createdAt, new Date(filters.dateTo)));
    }

    // Get all financial accounts with their categories
    const accounts = await db
      .select({
        valor: financialAccounts.valorTotal,
        tipo: financialAccounts.tipo,
        categoria: {
          id: accountCategories.id,
          nome: accountCategories.nome,
          tipo: accountCategories.tipo,
        },
      })
      .from(financialAccounts)
      .leftJoin(accountCategories, eq(financialAccounts.categoriaId, accountCategories.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Group and sum by category
    const receitasMap = new Map<string, number>();
    const despesasMap = new Map<string, number>();

    for (const account of accounts) {
      const valor = Number(account.valor);
      const categoriaNome = account.categoria?.nome || 'Sem Categoria';
      
      if (account.tipo === 'receber' || account.categoria?.tipo === 'receita') {
        // Sum revenues
        receitasMap.set(categoriaNome, (receitasMap.get(categoriaNome) || 0) + valor);
      } else if (account.tipo === 'pagar' || account.categoria?.tipo === 'despesa') {
        // Sum expenses
        despesasMap.set(categoriaNome, (despesasMap.get(categoriaNome) || 0) + valor);
      }
    }

    // Convert maps to arrays
    const receitas = Array.from(receitasMap.entries()).map(([categoria, valor]) => ({
      categoria,
      valor,
    }));

    const despesas = Array.from(despesasMap.entries()).map(([categoria, valor]) => ({
      categoria,
      valor,
    }));

    // Calculate totals
    const totalReceitas = receitas.reduce((sum, item) => sum + item.valor, 0);
    const totalDespesas = despesas.reduce((sum, item) => sum + item.valor, 0);
    const lucroLiquido = totalReceitas - totalDespesas;

    // Generate period description
    const currentDate = new Date();
    const periodo = filters?.dateFrom && filters?.dateTo
      ? `${new Date(filters.dateFrom).toLocaleDateString('pt-BR')} - ${new Date(filters.dateTo).toLocaleDateString('pt-BR')}`
      : `${currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;

    return {
      periodo,
      receitas,
      despesas,
      totalReceitas,
      totalDespesas,
      lucroLiquido,
    };
  }

  // Banking operations
  async getBankAccounts(): Promise<BankAccount[]> {
    return db.select().from(bankAccounts).where(eq(bankAccounts.ativo, true)).orderBy(asc(bankAccounts.nome));
  }

  async createBankAccount(accountData: InsertBankAccount): Promise<BankAccount> {
    const [account] = await db.insert(bankAccounts).values(accountData).returning();
    return account;
  }

  async getBankTransactions(accountId: number, filters: { dateFrom?: string; dateTo?: string } = {}): Promise<any[]> {
    const conditions = [eq(bankTransactions.contaBancariaId, accountId)];
    if (filters.dateFrom) {
      conditions.push(gte(bankTransactions.dataTransacao, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lte(bankTransactions.dataTransacao, new Date(filters.dateTo)));
    }

    return db
      .select({
        id: bankTransactions.id,
        descricao: bankTransactions.descricao,
        valor: bankTransactions.valor,
        tipo: bankTransactions.tipo,
        dataTransacao: bankTransactions.dataTransacao,
        saldoAnterior: bankTransactions.saldoAnterior,
        saldoNovo: bankTransactions.saldoNovo,
        conciliado: bankTransactions.conciliado,
        anexos: bankTransactions.anexos,
        observacoes: bankTransactions.observacoes,
        contaFinanceiraId: bankTransactions.contaFinanceiraId,
      })
      .from(bankTransactions)
      .where(and(...conditions))
      .orderBy(desc(bankTransactions.dataTransacao));
  }

  async createBankTransaction(transactionData: InsertBankTransaction): Promise<BankTransaction> {
    return db.transaction(async (tx) => {
      // Get current bank account balance
      const [bankAccount] = await tx
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, transactionData.contaBancariaId));

      if (!bankAccount) throw new Error('Bank account not found');

      const saldoAnterior = Number(bankAccount.saldo);
      const valorTransacao = transactionData.tipo === 'entrada' 
        ? Number(transactionData.valor) 
        : -Number(transactionData.valor);
      const saldoNovo = saldoAnterior + valorTransacao;

      // Create transaction
      const [transaction] = await tx.insert(bankTransactions).values({
        ...transactionData,
        saldoAnterior: saldoAnterior.toString(),
        saldoNovo: saldoNovo.toString(),
      }).returning();

      // Update bank account balance
      await tx
        .update(bankAccounts)
        .set({
          saldo: saldoNovo.toString(),
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.id, transactionData.contaBancariaId));

      return transaction;
    });
  }

  async transferBetweenBankAccounts(transferData: {
    contaOrigemId: number;
    contaDestinoId: number;
    valor: number;
    descricao: string;
    observacoes?: string;
  }): Promise<{ 
    transacaoSaida: BankTransaction; 
    transacaoEntrada: BankTransaction;
    contaOrigem: { id: number; nome: string; saldo: string };
    contaDestino: { id: number; nome: string; saldo: string };
  }> {
    return db.transaction(async (tx) => {
      const valor = transferData.valor;
      
      if (valor <= 0) {
        throw new Error('Valor da transferência deve ser maior que zero');
      }

      // Verificar se as contas existem e bloquear para operação atômica
      // Ordenar IDs para evitar deadlocks
      const minId = Math.min(transferData.contaOrigemId, transferData.contaDestinoId);
      const maxId = Math.max(transferData.contaOrigemId, transferData.contaDestinoId);
      
      // Buscar e bloquear contas em ordem consistente (FOR UPDATE)
      const contas = await tx
        .select()
        .from(bankAccounts)
        .where(or(eq(bankAccounts.id, minId), eq(bankAccounts.id, maxId)))
        .for('update');
        
      const contaOrigem = contas.find(c => c.id === transferData.contaOrigemId);
      const contaDestino = contas.find(c => c.id === transferData.contaDestinoId);

      if (!contaOrigem) throw new Error('Conta de origem não encontrada');
      if (!contaDestino) throw new Error('Conta de destino não encontrada');

      const saldoOrigem = Number(contaOrigem.saldo);
      
      if (saldoOrigem < valor) {
        throw new Error('Saldo insuficiente na conta de origem');
      }

      const dataTransacao = new Date();

      // 1. Criar transação de SAÍDA na conta origem
      const novoSaldoOrigem = saldoOrigem - valor;
      const [transacaoSaida] = await tx.insert(bankTransactions).values({
        contaBancariaId: transferData.contaOrigemId,
        descricao: `Transferência para ${contaDestino.nome}: ${transferData.descricao}`,
        valor: valor.toString(),
        tipo: 'saida',
        dataTransacao,
        saldoAnterior: saldoOrigem.toString(),
        saldoNovo: novoSaldoOrigem.toString(),
        observacoes: transferData.observacoes,
      }).returning();

      // 2. Atualizar saldo da conta origem
      await tx
        .update(bankAccounts)
        .set({
          saldo: novoSaldoOrigem.toString(),
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.id, transferData.contaOrigemId));

      // 3. Criar transação de ENTRADA na conta destino
      const saldoDestino = Number(contaDestino.saldo);
      const novoSaldoDestino = saldoDestino + valor;
      const [transacaoEntrada] = await tx.insert(bankTransactions).values({
        contaBancariaId: transferData.contaDestinoId,
        descricao: `Transferência recebida de ${contaOrigem.nome}: ${transferData.descricao}`,
        valor: valor.toString(),
        tipo: 'entrada',
        dataTransacao,
        saldoAnterior: saldoDestino.toString(),
        saldoNovo: novoSaldoDestino.toString(),
        observacoes: transferData.observacoes,
      }).returning();

      // 4. Atualizar saldo da conta destino
      await tx
        .update(bankAccounts)
        .set({
          saldo: novoSaldoDestino.toString(),
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.id, transferData.contaDestinoId));

      return { 
        transacaoSaida, 
        transacaoEntrada,
        contaOrigem: {
          id: contaOrigem.id,
          nome: contaOrigem.nome,
          saldo: novoSaldoOrigem.toString(),
        },
        contaDestino: {
          id: contaDestino.id,
          nome: contaDestino.nome,
          saldo: novoSaldoDestino.toString(),
        },
      };
    });
  }

  // Account Category operations
  async getAccountCategories(tipo?: string): Promise<AccountCategory[]> {
    if (tipo) {
      return db.select().from(accountCategories)
        .where(and(
          eq(accountCategories.ativo, true),
          eq(accountCategories.tipo, tipo as any)
        ))
        .orderBy(asc(accountCategories.nome));
    }

    return db.select().from(accountCategories)
      .where(eq(accountCategories.ativo, true))
      .orderBy(asc(accountCategories.nome));
  }

  async createAccountCategory(categoryData: InsertAccountCategory): Promise<AccountCategory> {
    const [category] = await db.insert(accountCategories).values(categoryData).returning();
    return category;
  }

  async updateAccountCategory(id: number, categoryData: InsertAccountCategory): Promise<AccountCategory> {
    const [category] = await db
      .update(accountCategories)
      .set({ ...categoryData })
      .where(eq(accountCategories.id, id))
      .returning();
    
    if (!category) {
      throw new Error('Account category not found');
    }
    
    return category;
  }

  async deleteAccountCategory(id: number): Promise<void> {
    await db
      .update(accountCategories)
      .set({ ativo: false })
      .where(eq(accountCategories.id, id));
  }

  // WhatsApp operations
  async getWhatsAppConversations(): Promise<WhatsappConversation[]> {
    return await db
      .select({
        id: whatsappConversations.id,
        phone: whatsappConversations.phone,
        name: whatsappConversations.name,
        avatar: whatsappConversations.avatar,
        isOnline: whatsappConversations.isOnline,
        lastMessageTime: whatsappConversations.lastMessageTime,
        unreadCount: whatsappConversations.unreadCount,
        clientId: whatsappConversations.clientId,
        createdAt: whatsappConversations.createdAt,
        client: {
          id: clients.id,
          nome: clients.nome,
        }
      })
      .from(whatsappConversations)
      .leftJoin(clients, eq(whatsappConversations.clientId, clients.id))
      .orderBy(desc(whatsappConversations.lastMessageTime));
  }

  async getOrCreateConversation(phone: string, name: string): Promise<WhatsappConversation> {
    // Primeiro, tenta encontrar conversa existente
    let [conversation] = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.phone, phone))
      .limit(1);

    if (!conversation) {
      // Se não existe, cria nova conversa
      [conversation] = await db
        .insert(whatsappConversations)
        .values({
          phone,
          name,
          isOnline: true,
          unreadCount: 0,
          lastMessageTime: new Date(),
        })
        .returning();
    }

    return conversation;
  }

  async getConversationByPhone(phone: string): Promise<WhatsappConversation | null> {
    const [conversation] = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.phone, phone))
      .limit(1);

    return conversation || null;
  }

  async createConversation(conversationData: InsertWhatsappConversation): Promise<WhatsappConversation> {
    const [conversation] = await db
      .insert(whatsappConversations)
      .values(conversationData)
      .returning();

    return conversation;
  }

  async updateConversation(id: number, updates: Partial<InsertWhatsappConversation>): Promise<WhatsappConversation> {
    const [conversation] = await db
      .update(whatsappConversations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversations.id, id))
      .returning();

    return conversation;
  }

  async updateConversationStatus(id: number, isOnline: boolean): Promise<WhatsappConversation> {
    const [conversation] = await db
      .update(whatsappConversations)
      .set({
        isOnline,
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversations.id, id))
      .returning();

    return conversation;
  }

  async getConversationMessages(conversationId: number): Promise<WhatsappMessage[]> {
    return await db
      .select({
        id: whatsappMessages.id,
        messageId: whatsappMessages.messageId,
        type: whatsappMessages.type,
        content: whatsappMessages.content,
        mediaUrl: whatsappMessages.mediaUrl,
        mediaType: whatsappMessages.mediaType,
        fileName: whatsappMessages.fileName,
        fromMe: whatsappMessages.fromMe,
        timestamp: whatsappMessages.timestamp,
        status: whatsappMessages.status,
        createdAt: whatsappMessages.createdAt,
      })
      .from(whatsappMessages)
      .where(eq(whatsappMessages.conversationId, conversationId))
      .orderBy(asc(whatsappMessages.timestamp));
  }

  async createMessage(messageData: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const [message] = await db
      .insert(whatsappMessages)
      .values({
        conversationId: messageData.conversationId,
        messageId: messageData.messageId,
        type: messageData.type,
        content: messageData.content,
        mediaUrl: messageData.mediaUrl,
        mediaType: messageData.mediaType,
        fileName: messageData.fileName,
        fromMe: messageData.fromMe,
        timestamp: messageData.timestamp,
        status: messageData.status || 'sent',
      })
      .returning();

    // Atualiza última mensagem da conversa
    await db
      .update(whatsappConversations)
      .set({
        lastMessageTime: messageData.timestamp,
        unreadCount: messageData.fromMe ? sql`unread_count` : sql`unread_count + 1`,
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversations.id, messageData.conversationId));

    return message;
  }

  async updateMessageStatus(messageId: string, status: WhatsappMessage["status"]): Promise<WhatsappMessage> {
    const [message] = await db
      .update(whatsappMessages)
      .set({ status })
      .where(eq(whatsappMessages.messageId, messageId))
      .returning();

    return message;
  }

  // Multi-agent WhatsApp operations
  async assignConversation(conversationId: number, userId: string): Promise<WhatsappConversation> {
    const [conversation] = await db
      .update(whatsappConversations)
      .set({
        assignedUserId: userId,
        isAssigned: true,
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversations.id, conversationId))
      .returning();

    return conversation;
  }

  async getConversationsByUser(userId: string): Promise<WhatsappConversation[]> {
    return await db
      .select({
        id: whatsappConversations.id,
        phone: whatsappConversations.phone,
        name: whatsappConversations.name,
        avatar: whatsappConversations.avatar,
        isOnline: whatsappConversations.isOnline,
        lastMessageTime: whatsappConversations.lastMessageTime,
        unreadCount: whatsappConversations.unreadCount,
        clientId: whatsappConversations.clientId,
        assignedUserId: whatsappConversations.assignedUserId,
        departmentId: whatsappConversations.departmentId,
        isAssigned: whatsappConversations.isAssigned,
        createdAt: whatsappConversations.createdAt,
        client: {
          id: clients.id,
          nome: clients.nome,
        },
      })
      .from(whatsappConversations)
      .leftJoin(clients, eq(whatsappConversations.clientId, clients.id))
      .where(eq(whatsappConversations.assignedUserId, userId))
      .orderBy(desc(whatsappConversations.lastMessageTime));
  }

  // Sale requirements operations
  async getSaleRequirements(saleId: number): Promise<SaleRequirement[]> {
    return await db
      .select()
      .from(saleRequirements)
      .where(eq(saleRequirements.vendaId, saleId))
      .orderBy(asc(saleRequirements.dataVencimento));
  }

  async createSaleRequirement(requirement: InsertSaleRequirement): Promise<SaleRequirement> {
    const [created] = await db
      .insert(saleRequirements)
      .values(requirement)
      .returning();
    
    return created;
  }

  async updateSaleRequirement(id: number, requirement: Partial<InsertSaleRequirement>): Promise<SaleRequirement> {
    const [updated] = await db
      .update(saleRequirements)
      .set({
        ...requirement,
        updatedAt: new Date(),
      })
      .where(eq(saleRequirements.id, id))
      .returning();
    
    return updated;
  }

  async completeSaleRequirement(id: number): Promise<SaleRequirement> {
    const [completed] = await db
      .update(saleRequirements)
      .set({
        status: 'concluida',
        dataConclusao: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(saleRequirements.id, id))
      .returning();
    
    return completed;
  }

  async deleteSaleRequirement(id: number): Promise<void> {
    await db
      .delete(saleRequirements)
      .where(eq(saleRequirements.id, id));
  }

  async deleteSaleRequirements(saleId: number): Promise<void> {
    await db
      .delete(saleRequirements)
      .where(eq(saleRequirements.vendaId, saleId));
  }

  async deleteSaleServices(saleId: number): Promise<void> {
    await db
      .delete(services)
      .where(eq(services.vendaId, saleId));
  }

  async deleteSalePassengers(saleId: number): Promise<void> {
    await db
      .delete(passengers)
      .where(eq(passengers.vendaId, saleId));
  }

  async deleteSaleSellers(saleId: number): Promise<void> {
    await db
      .delete(saleSellers)
      .where(eq(saleSellers.vendaId, saleId));
  }

  async deleteSale(saleId: number): Promise<void> {
    await db
      .delete(sales)
      .where(eq(sales.id, saleId));
  }

  // Sale commissions operations
  async getSaleCommissions(saleId?: number, userId?: string): Promise<SaleCommission[]> {
    let query = db
      .select({
        id: saleCommissions.id,
        vendaId: saleCommissions.vendaId,
        userId: saleCommissions.userId,
        tipo: saleCommissions.tipo,
        valor: saleCommissions.valorComissao,
        percentual: saleCommissions.percentual,
        status: saleCommissions.status,
        dataPrevisaoRecebimento: saleCommissions.dataPrevisaoRecebimento,
        dataRecebimento: saleCommissions.dataRecebimento,
        observacoes: saleCommissions.observacoes,
        createdAt: saleCommissions.createdAt,
        updatedAt: saleCommissions.updatedAt,
        sale: {
          id: sales.id,
          numero: sales.numero,
          status: sales.status,
        },
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(saleCommissions)
      .leftJoin(sales, eq(saleCommissions.vendaId, sales.id))
      .leftJoin(users, eq(saleCommissions.userId, users.id));

    if (saleId) {
      query = query.where(eq(saleCommissions.vendaId, saleId));
    }
    if (userId) {
      query = query.where(eq(saleCommissions.userId, userId));
    }

    return await query.orderBy(desc(saleCommissions.createdAt));
  }

  async createSaleCommission(commission: InsertSaleCommission): Promise<SaleCommission> {
    const [created] = await db
      .insert(saleCommissions)
      .values(commission)
      .returning();
    
    return created;
  }

  async updateSaleCommission(id: number, commission: Partial<InsertSaleCommission>): Promise<SaleCommission> {
    const [updated] = await db
      .update(saleCommissions)
      .set({
        ...commission,
        updatedAt: new Date(),
      })
      .where(eq(saleCommissions.id, id))
      .returning();
    
    return updated;
  }

  async markCommissionAsReceived(id: number): Promise<SaleCommission> {
    const [received] = await db
      .update(saleCommissions)
      .set({
        status: 'recebida',
        dataRecebimento: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(saleCommissions.id, id))
      .returning();
    
    return received;
  }

  // Notifications operations
  async getNotifications(userId?: string, unreadOnly?: boolean): Promise<Notification[]> {
    try {
      console.log('Getting notifications for userId:', userId, 'unreadOnly:', unreadOnly);
      
      if (userId && unreadOnly) {
        const result = await db
          .select()
          .from(notifications)
          .where(and(eq(notifications.userId, userId), eq(notifications.status, 'nao_lida')))
          .orderBy(desc(notifications.createdAt));
        console.log('Query result (userId + unreadOnly):', result);
        return result;
      } else if (userId) {
        const result = await db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .orderBy(desc(notifications.createdAt));
        console.log('Query result (userId only):', result);
        return result;
      } else if (unreadOnly) {
        const result = await db
          .select()
          .from(notifications)
          .where(eq(notifications.status, 'nao_lida'))
          .orderBy(desc(notifications.createdAt));
        console.log('Query result (unreadOnly):', result);
        return result;
      } else {
        const result = await db
          .select()
          .from(notifications)
          .orderBy(desc(notifications.createdAt));
        console.log('Query result (all):', result);
        return result;
      }
    } catch (error) {
      console.error('Error in getNotifications:', error);
      throw error;
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    
    return created;
  }

  async markNotificationAsRead(id: number, userId?: string): Promise<Notification> {
    let whereClause = eq(notifications.id, id);
    
    // Add userId authorization check if provided
    if (userId) {
      whereClause = and(eq(notifications.id, id), eq(notifications.userId, userId));
    }
    
    const [read] = await db
      .update(notifications)
      .set({
        status: 'lida',
        updatedAt: new Date(),
      })
      .where(whereClause)
      .returning();
    
    if (!read) {
      throw new Error("Notification not found or access denied");
    }
    
    return read;
  }

  async deleteNotification(id: number): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.id, id));
  }

  // Payment methods operations
  async getPaymentMethods(tipo?: "AGENCIA" | "FORNECEDOR"): Promise<PaymentMethod[]> {
    const query = db.select().from(paymentMethods);
    
    if (tipo) {
      return await query.where(and(
        eq(paymentMethods.tipo, tipo),
        eq(paymentMethods.ativo, true)
      )).orderBy(asc(paymentMethods.nome));
    }
    
    return await query.where(eq(paymentMethods.ativo, true)).orderBy(asc(paymentMethods.nome));
  }

  async createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    const [created] = await db
      .insert(paymentMethods)
      .values(data)
      .returning();
    return created;
  }

  async updatePaymentMethod(id: number, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod> {
    const [updated] = await db
      .update(paymentMethods)
      .set(data)
      .where(eq(paymentMethods.id, id))
      .returning();
    return updated;
  }

  async deletePaymentMethod(id: number): Promise<void> {
    // Soft delete - mark as inactive
    await db
      .update(paymentMethods)
      .set({ ativo: false })
      .where(eq(paymentMethods.id, id));
  }

  // Payment conditions operations
  async getPaymentConditions(formaPagamentoId?: number): Promise<PaymentCondition[]> {
    const query = db.select().from(paymentConditions);
    
    if (formaPagamentoId) {
      return await query.where(and(
        eq(paymentConditions.formaPagamentoId, formaPagamentoId),
        eq(paymentConditions.ativo, true)
      )).orderBy(asc(paymentConditions.nome));
    }
    
    return await query.where(eq(paymentConditions.ativo, true)).orderBy(asc(paymentConditions.nome));
  }

  async createPaymentCondition(data: InsertPaymentCondition): Promise<PaymentCondition> {
    const [created] = await db
      .insert(paymentConditions)
      .values(data)
      .returning();
    return created;
  }

  async updatePaymentCondition(id: number, data: Partial<InsertPaymentCondition>): Promise<PaymentCondition> {
    const [updated] = await db
      .update(paymentConditions)
      .set(data)
      .where(eq(paymentConditions.id, id))
      .returning();
    return updated;
  }

  async deletePaymentCondition(id: number): Promise<void> {
    // Soft delete - mark as inactive
    await db
      .update(paymentConditions)
      .set({ ativo: false })
      .where(eq(paymentConditions.id, id));
  }

  // Enhanced payment operations with financial sync
  async getPaymentPlans(saleId?: number): Promise<PaymentPlan[]> {
    if (saleId) {
      return await db
        .select()
        .from(paymentPlans)
        .where(eq(paymentPlans.vendaId, saleId))
        .orderBy(asc(paymentPlans.dataVencimento));
    } else {
      return await db
        .select()
        .from(paymentPlans)
        .orderBy(asc(paymentPlans.dataVencimento));
    }
  }

  async createPaymentPlan(paymentPlan: InsertPaymentPlan): Promise<PaymentPlan> {
    return await db.transaction(async (tx) => {
      // Create the payment plan
      const [created] = await tx
        .insert(paymentPlans)
        .values(paymentPlan)
        .returning();

      // Get sale details for financial account creation
      const [sale] = await tx
        .select({
          id: sales.id,
          clienteId: sales.clienteId,
          fornecedorId: sales.fornecedorId,
        })
        .from(sales)
        .where(eq(sales.id, paymentPlan.vendaId));

      if (!sale) {
        throw new Error("Venda não encontrada");
      }

      // Create corresponding financial account based on quemRecebe
      if (paymentPlan.quemRecebe === 'FORNECEDOR' && sale.fornecedorId) {
        // Create accounts payable entry
        await tx
          .insert(financialAccounts)
          .values({
            vendaId: paymentPlan.vendaId,
            fornecedorId: sale.fornecedorId,
            tipo: 'pagar',
            descricao: `Plano de pagamento: ${paymentPlan.descricao}`,
            valorTotal: paymentPlan.valor,
            valorAberto: paymentPlan.valor,
            dataVencimento: paymentPlan.dataVencimento,
            status: 'pendente',
          });
      } else if (paymentPlan.quemRecebe === 'AGENCIA') {
        // Create accounts receivable entry
        await tx
          .insert(financialAccounts)
          .values({
            vendaId: paymentPlan.vendaId,
            clienteId: sale.clienteId,
            tipo: 'receber',
            descricao: `Plano de pagamento: ${paymentPlan.descricao}`,
            valorTotal: paymentPlan.valor,
            valorAberto: paymentPlan.valor,
            dataVencimento: paymentPlan.dataVencimento,
            status: 'pendente',
          });
      }

      return created;
    });
  }

  async deletePaymentPlan(id: number): Promise<void> {
    return await db.transaction(async (tx) => {
      // Get payment plan details before deletion
      const [paymentPlan] = await tx
        .select({
          id: paymentPlans.id,
          vendaId: paymentPlans.vendaId,
          descricao: paymentPlans.descricao,
          quemRecebe: paymentPlans.quemRecebe,
        })
        .from(paymentPlans)
        .where(eq(paymentPlans.id, id));

      if (!paymentPlan) {
        throw new Error("Plano de pagamento não encontrado");
      }

      // Delete corresponding financial accounts created by this payment plan
      await tx
        .delete(financialAccounts)
        .where(
          and(
            eq(financialAccounts.vendaId, paymentPlan.vendaId),
            eq(financialAccounts.descricao, `Plano de pagamento: ${paymentPlan.descricao}`)
          )
        );

      // Delete the payment plan
      await tx
        .delete(paymentPlans)
        .where(eq(paymentPlans.id, id));
    });
  }

  async updatePaymentPlan(id: number, data: Partial<InsertPaymentPlan>): Promise<PaymentPlan> {
    return await db.transaction(async (tx) => {
      // Get current payment plan details before update
      const [currentPlan] = await tx
        .select({
          id: paymentPlans.id,
          vendaId: paymentPlans.vendaId,
          descricao: paymentPlans.descricao,
          valor: paymentPlans.valor,
          dataVencimento: paymentPlans.dataVencimento,
          quemRecebe: paymentPlans.quemRecebe,
        })
        .from(paymentPlans)
        .where(eq(paymentPlans.id, id));

      if (!currentPlan) {
        throw new Error("Plano de pagamento não encontrado");
      }

      // Get sale details for financial account updates
      const [sale] = await tx
        .select({
          id: sales.id,
          clienteId: sales.clienteId,
          fornecedorId: sales.fornecedorId,
        })
        .from(sales)
        .where(eq(sales.id, currentPlan.vendaId));

      if (!sale) {
        throw new Error("Venda não encontrada");
      }

      // Prepare data with date conversion
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };
      
      // Convert dataVencimento to Date if provided as string
      if (data.dataVencimento && typeof data.dataVencimento === 'string') {
        updateData.dataVencimento = new Date(data.dataVencimento);
      }

      // Update the payment plan
      const [updated] = await tx
        .update(paymentPlans)
        .set(updateData)
        .where(eq(paymentPlans.id, id))
        .returning();

      // Handle financial account synchronization
      const newQuemRecebe = data.quemRecebe || currentPlan.quemRecebe;
      const newDescricao = data.descricao || currentPlan.descricao;
      const newValor = data.valor || currentPlan.valor;
      const newDataVencimento = data.dataVencimento ? new Date(data.dataVencimento) : currentPlan.dataVencimento;

      // Find existing financial account
      const [existingFinancialAccount] = await tx
        .select()
        .from(financialAccounts)
        .where(
          and(
            eq(financialAccounts.vendaId, currentPlan.vendaId),
            eq(financialAccounts.descricao, `Plano de pagamento: ${currentPlan.descricao}`)
          )
        );

      if (existingFinancialAccount) {
        // Check if quemRecebe changed (requires recreating the financial account)
        if (data.quemRecebe && data.quemRecebe !== currentPlan.quemRecebe) {
          // Delete old financial account
          await tx
            .delete(financialAccounts)
            .where(eq(financialAccounts.id, existingFinancialAccount.id));

          // Create new financial account with new type
          if (newQuemRecebe === 'FORNECEDOR' && sale.fornecedorId) {
            await tx
              .insert(financialAccounts)
              .values({
                vendaId: currentPlan.vendaId,
                fornecedorId: sale.fornecedorId,
                tipo: 'pagar',
                descricao: `Plano de pagamento: ${newDescricao}`,
                valorTotal: newValor,
                valorAberto: newValor,
                dataVencimento: newDataVencimento,
                status: 'pendente',
              });
          } else if (newQuemRecebe === 'AGENCIA') {
            await tx
              .insert(financialAccounts)
              .values({
                vendaId: currentPlan.vendaId,
                clienteId: sale.clienteId,
                tipo: 'receber',
                descricao: `Plano de pagamento: ${newDescricao}`,
                valorTotal: newValor,
                valorAberto: newValor,
                dataVencimento: newDataVencimento,
                status: 'pendente',
              });
          }
        } else {
          // Update existing financial account (same quemRecebe)
          await tx
            .update(financialAccounts)
            .set({
              descricao: `Plano de pagamento: ${newDescricao}`,
              valorTotal: newValor,
              valorAberto: newValor,
              dataVencimento: newDataVencimento,
              updatedAt: new Date(),
            })
            .where(eq(financialAccounts.id, existingFinancialAccount.id));
        }
      } else if (newQuemRecebe === 'FORNECEDOR' && sale.fornecedorId) {
        // No existing financial account found, create new one for FORNECEDOR
        await tx
          .insert(financialAccounts)
          .values({
            vendaId: currentPlan.vendaId,
            fornecedorId: sale.fornecedorId,
            tipo: 'pagar',
            descricao: `Plano de pagamento: ${newDescricao}`,
            valorTotal: newValor,
            valorAberto: newValor,
            dataVencimento: newDataVencimento,
            status: 'pendente',
          });
      } else if (newQuemRecebe === 'AGENCIA') {
        // No existing financial account found, create new one for AGENCIA
        await tx
          .insert(financialAccounts)
          .values({
            vendaId: currentPlan.vendaId,
            clienteId: sale.clienteId,
            tipo: 'receber',
            descricao: `Plano de pagamento: ${newDescricao}`,
            valorTotal: newValor,
            valorAberto: newValor,
            dataVencimento: newDataVencimento,
            status: 'pendente',
          });
      }

      return updated;
    });
  }

  async liquidatePaymentPlan(id: number, liquidationData: { dataLiquidacao: Date; observacoes?: string }): Promise<{
    paymentPlan: PaymentPlan;
    financialAccount?: FinancialAccount;
    commission?: SaleCommission;
  }> {
    return await db.transaction(async (tx) => {
      // Get payment plan with sale details
      const [paymentPlan] = await tx
        .select({
          id: paymentPlans.id,
          vendaId: paymentPlans.vendaId,
          tipo: paymentPlans.tipo,
          valor: paymentPlans.valor,
          descricao: paymentPlans.descricao,
          dataVencimento: paymentPlans.dataVencimento,
          dataLiquidacao: paymentPlans.dataLiquidacao,
          observacoes: paymentPlans.observacoes,
          status: paymentPlans.status,
          sale: {
            id: sales.id,
            numero: sales.numero,
            clienteId: sales.clienteId,
            fornecedorId: sales.fornecedorId,
          },
        })
        .from(paymentPlans)
        .leftJoin(sales, eq(paymentPlans.vendaId, sales.id))
        .where(eq(paymentPlans.id, id));

      if (!paymentPlan) {
        throw new Error("Plano de pagamento não encontrado");
      }

      // Update payment plan as liquidated
      const [updatedPaymentPlan] = await tx
        .update(paymentPlans)
        .set({
          status: 'liquidado',
          dataLiquidacao: liquidationData.dataLiquidacao,
          observacoes: liquidationData.observacoes,
          updatedAt: new Date(),
        })
        .where(eq(paymentPlans.id, id))
        .returning();

      let financialAccount: FinancialAccount | undefined;
      let commission: SaleCommission | undefined;

      // If payment to supplier, create accounts payable entry
      if (paymentPlan.quemRecebe === 'FORNECEDOR' && paymentPlan.sale?.fornecedorId) {
        const [created] = await tx
          .insert(financialAccounts)
          .values({
            vendaId: paymentPlan.vendaId,
            fornecedorId: paymentPlan.sale.fornecedorId,
            tipo: 'contas_pagar',
            descricao: `Pagamento a fornecedor - ${paymentPlan.descricao}`,
            valor: paymentPlan.valor,
            status: 'em_aberto',
            dataVencimento: liquidationData.dataLiquidacao,
          })
          .returning();
        
        financialAccount = created;

        // Create commission receivable for this payment
        const [createdCommission] = await tx
          .insert(saleCommissions)
          .values({
            vendaId: paymentPlan.vendaId,
            userId: '', // TODO: Get from sale sellers
            tipo: 'venda',
            valor: paymentPlan.valor * 0.05, // 5% commission example
            percentual: 5,
            status: 'pendente',
            dataPrevisaoRecebimento: new Date(liquidationData.dataLiquidacao.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 days
            observacoes: `Comissão referente ao pagamento: ${paymentPlan.descricao}`,
          })
          .returning();
        
        commission = createdCommission;
      }

      // If payment from agency, create accounts receivable entry  
      if (paymentPlan.quemRecebe === 'AGENCIA' && paymentPlan.sale?.clienteId) {
        const [created] = await tx
          .insert(financialAccounts)
          .values({
            vendaId: paymentPlan.vendaId,
            clienteId: paymentPlan.sale.clienteId,
            tipo: 'contas_receber',
            descricao: `Recebimento da agência - ${paymentPlan.descricao}`,
            valor: paymentPlan.valor,
            status: 'liquidado',
            dataVencimento: liquidationData.dataLiquidacao,
          })
          .returning();
        
        financialAccount = created;
      }

      return {
        paymentPlan: updatedPaymentPlan,
        financialAccount,
        commission,
      };
    });
  }

  // DEPRECATED: Service Passengers operations - Use serviceClients instead
  // async getServicePassengers(serviceId: number): Promise<ServicePassenger[]> {
  //   return await db
  //     .select({
  //       id: servicePassengers.id,
  //       servicoId: servicePassengers.servicoId,
  //       passageiroId: servicePassengers.passageiroId,
  //       valorVenda: servicePassengers.valorVenda,
  //       valorCusto: servicePassengers.valorCusto,
  //     })
  //     .from(servicePassengers)
  //     .where(eq(servicePassengers.servicoId, serviceId));
  // }

  // DEPRECATED: Use upsertServiceClient instead
  // async createServicePassenger(data: InsertServicePassenger): Promise<ServicePassenger> {
  //   const [created] = await db
  //     .insert(servicePassengers)
  //     .values(data)
  //     .returning();
  //
  //   return created;
  // }

  // DEPRECATED: Use upsertServiceClient instead
  // async updateServicePassenger(id: number, data: Partial<InsertServicePassenger>): Promise<ServicePassenger> {
  //   const [updated] = await db
  //     .update(servicePassengers)
  //     .set(data)
  //     .where(eq(servicePassengers.id, id))
  //     .returning();
  //
  //   return updated;
  // }

  // DEPRECATED: Use removeServiceClient instead
  // async deleteServicePassenger(id: number): Promise<void> {
  //   await db
  //     .delete(servicePassengers)
  //     .where(eq(servicePassengers.id, id));
  // }

  // DEPRECATED: Use serviceClients operations instead
  // async deleteServicePassengersByService(serviceId: number): Promise<void> {
  //   await db
  //     .delete(servicePassengers)
  //     .where(eq(servicePassengers.servicoId, serviceId));
  // }

  // Sale Clients operations - Unified client management for sales
  async getSaleClients(vendaId: number): Promise<SaleClient[]> {
    return await db
      .select()
      .from(saleClients)
      .where(eq(saleClients.vendaId, vendaId))
      .orderBy(asc(saleClients.id));
  }

  async addSaleClient(vendaId: number, data: { clienteId: number; funcao: "contratante" | "passageiro" }): Promise<SaleClient> {
    // Check for existing record to prevent duplicates
    const existing = await db
      .select()
      .from(saleClients)
      .where(
        and(
          eq(saleClients.vendaId, vendaId),
          eq(saleClients.clienteId, data.clienteId),
          eq(saleClients.funcao, data.funcao)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Enforce single contratante rule
    if (data.funcao === "contratante") {
      const existingContratante = await db
        .select()
        .from(saleClients)
        .where(
          and(
            eq(saleClients.vendaId, vendaId),
            eq(saleClients.funcao, "contratante")
          )
        )
        .limit(1);

      if (existingContratante.length > 0) {
        throw new Error("Uma venda só pode ter um contratante");
      }
    }

    const [created] = await db
      .insert(saleClients)
      .values({
        vendaId,
        ...data,
      })
      .returning();

    return created;
  }

  async removeSaleClient(id: number): Promise<void> {
    await db
      .delete(saleClients)
      .where(eq(saleClients.id, id));
  }

  // Service Clients operations - Client assignments to services
  async getServiceClients(servicoId: number): Promise<ServiceClient[]> {
    return await db
      .select()
      .from(serviceClients)
      .where(eq(serviceClients.servicoId, servicoId))
      .orderBy(asc(serviceClients.id));
  }

  async upsertServiceClient(data: { servicoId: number; clienteId: number; valorVenda?: string; valorCusto?: string }): Promise<ServiceClient> {
    // Check if record exists
    const existing = await db
      .select()
      .from(serviceClients)
      .where(
        and(
          eq(serviceClients.servicoId, data.servicoId),
          eq(serviceClients.clienteId, data.clienteId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing record only with provided fields
      const updateData: any = {};
      if (data.valorVenda !== undefined) updateData.valorVenda = data.valorVenda;
      if (data.valorCusto !== undefined) updateData.valorCusto = data.valorCusto;

      // If no fields to update, return existing record
      if (Object.keys(updateData).length === 0) {
        return existing[0];
      }

      const [updated] = await db
        .update(serviceClients)
        .set(updateData)
        .where(eq(serviceClients.id, existing[0].id))
        .returning();

      return updated;
    } else {
      // Create new record
      const [created] = await db
        .insert(serviceClients)
        .values(data)
        .returning();

      return created;
    }
  }

  async removeServiceClient(id: number): Promise<void> {
    await db
      .delete(serviceClients)
      .where(eq(serviceClients.id, id));
  }

  // Contract Clauses operations
  async getContractClauses(type?: string): Promise<ContractClause[]> {
    let query = db.select().from(contractClauses);
    
    if (type) {
      query = query.where(eq(contractClauses.type, type as 'contrato' | 'voucher'));
    }
    
    return await query.orderBy(asc(contractClauses.order), asc(contractClauses.title));
  }

  async createContractClause(data: InsertContractClause): Promise<ContractClause> {
    const [created] = await db
      .insert(contractClauses)
      .values(data)
      .returning();
    return created;
  }

  async updateContractClause(id: number, data: Partial<InsertContractClause>): Promise<ContractClause> {
    const [updated] = await db
      .update(contractClauses)
      .set(data)
      .where(eq(contractClauses.id, id))
      .returning();
    return updated;
  }

  async deleteContractClause(id: number): Promise<void> {
    await db
      .delete(contractClauses)
      .where(eq(contractClauses.id, id));
  }

  // Document Templates operations
  async getDocumentTemplates(type?: string): Promise<DocumentTemplate[]> {
    let query = db.select().from(documentTemplates);
    
    if (type) {
      query = query.where(eq(documentTemplates.type, type));
    }
    
    return await query.orderBy(asc(documentTemplates.name));
  }

  async createDocumentTemplate(data: InsertDocumentTemplate): Promise<DocumentTemplate> {
    const [created] = await db
      .insert(documentTemplates)
      .values(data)
      .returning();
    return created;
  }

  async updateDocumentTemplate(id: number, data: Partial<InsertDocumentTemplate>): Promise<DocumentTemplate> {
    const [updated] = await db
      .update(documentTemplates)
      .set(data)
      .where(eq(documentTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteDocumentTemplate(id: number): Promise<void> {
    await db
      .delete(documentTemplates)
      .where(eq(documentTemplates.id, id));
  }

  // Task Template operations - Templates para geração automática de tarefas
  async getTaskTemplates(ativo?: boolean): Promise<TaskTemplate[]> {
    let query = db.select().from(taskTemplates);
    
    if (ativo !== undefined) {
      query = query.where(eq(taskTemplates.ativo, ativo));
    }
    
    return await query.orderBy(asc(taskTemplates.nome));
  }

  async createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate> {
    const [created] = await db
      .insert(taskTemplates)
      .values(template)
      .returning();
    return created;
  }

  async updateTaskTemplate(id: number, template: Partial<InsertTaskTemplate>): Promise<TaskTemplate> {
    const [updated] = await db
      .update(taskTemplates)
      .set({
        ...template,
        updatedAt: new Date(),
      })
      .where(eq(taskTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteTaskTemplate(id: number): Promise<void> {
    await db
      .delete(taskTemplates)
      .where(eq(taskTemplates.id, id));
  }

  // Generate tasks from templates based on sale data
  async generateTasksFromTemplates(saleId: number, sale: Sale): Promise<SaleRequirement[]> {
    // Get active task templates
    const templates = await this.getTaskTemplates(true);
    const generatedTasks: SaleRequirement[] = [];

    for (const template of templates) {
      try {
        let dataVencimento: Date | null = null;

        // Calculate due date based on template rule
        if (template.regraTemporalizacao === 'antes_embarque') {
          // Calculate based on first service date
          const saleServices = await db
            .select()
            .from(services)
            .where(eq(services.vendaId, saleId))
            .orderBy(asc(services.data));
          
          if (saleServices.length > 0 && saleServices[0].data) {
            const embarqueDate = new Date(saleServices[0].data);
            dataVencimento = new Date(embarqueDate);
            dataVencimento.setDate(dataVencimento.getDate() + template.diasOffset);
          }
        } else if (template.regraTemporalizacao === 'depois_viagem') {
          // Calculate based on last service date
          const saleServices = await db
            .select()
            .from(services)
            .where(eq(services.vendaId, saleId))
            .orderBy(desc(services.data));
          
          if (saleServices.length > 0 && saleServices[0].data) {
            const fimViagemDate = new Date(saleServices[0].data);
            dataVencimento = new Date(fimViagemDate);
            dataVencimento.setDate(dataVencimento.getDate() + template.diasOffset);
          }
        } else if (template.regraTemporalizacao === 'data_fixa') {
          // Use fixed date from template, or current date + offset as fallback
          if (template.dataFixa) {
            dataVencimento = new Date(template.dataFixa);
          } else {
            dataVencimento = new Date();
            dataVencimento.setDate(dataVencimento.getDate() + template.diasOffset);
          }
        }

        // Create task requirement
        const taskData: InsertSaleRequirement = {
          vendaId: saleId,
          templateId: template.id,
          tipo: template.tipo,
          titulo: template.nome,
          descricao: template.descricaoTemplate,
          dataVencimento,
          responsavelId: template.responsavelPadraoId,
          prioridade: template.prioridadePadrao || 'normal',
          observacoes: template.observacoesTemplate,
          geradaAutomaticamente: true,
          status: 'pendente',
        };

        const createdTask = await this.createSaleRequirement(taskData);
        generatedTasks.push(createdTask);
      } catch (error) {
        console.error(`Erro ao gerar tarefa do template ${template.nome}:`, error);
      }
    }

    return generatedTasks;
  }
}

export const storage = new DatabaseStorage();
