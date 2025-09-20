import {
  users,
  clients,
  suppliers,
  sellers,
  sales,
  passengers,
  services,
  servicePassengers,
  saleSellers,
  bankAccounts,
  accountCategories,
  financialAccounts,
  paymentPlans,
  bankTransactions,
  whatsappConversations,
  whatsappMessages,
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
  type BankTransaction,
  type InsertBankTransaction,
  type InsertUser,
  type UpdateUser,
  type WhatsappConversation,
  type InsertWhatsappConversation,
  type WhatsappMessage,
  type InsertWhatsappMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, and, gte, lte, sql, desc, asc } from "drizzle-orm";

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

  // Banking operations
  getBankAccounts(): Promise<BankAccount[]>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  getBankTransactions(accountId: number, filters: { dateFrom?: string; dateTo?: string }): Promise<any[]>;
  createBankTransaction(transaction: InsertBankTransaction): Promise<BankTransaction>;

  // Account Category operations
  getAccountCategories(tipo?: string): Promise<AccountCategory[]>;
  createAccountCategory(category: InsertAccountCategory): Promise<AccountCategory>;
  updateAccountCategory(id: number, category: InsertAccountCategory): Promise<AccountCategory>;
  deleteAccountCategory(id: number): Promise<void>;

  // WhatsApp operations
  getWhatsAppConversations(): Promise<WhatsappConversation[]>;
  getOrCreateConversation(phone: string, name: string): Promise<WhatsappConversation>;
  updateConversationStatus(id: number, isOnline: boolean): Promise<WhatsappConversation>;
  getConversationMessages(conversationId: number): Promise<WhatsappMessage[]>;
  createMessage(messageData: InsertWhatsappMessage): Promise<WhatsappMessage>;
  updateMessageStatus(messageId: string, status: WhatsappMessage["status"]): Promise<WhatsappMessage>;
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
          await tx.insert(passengers).values({
            vendaId: sale.id,
            ...passenger,
          });
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
          await tx.insert(passengers).values({
            vendaId: id,
            ...passenger,
          });
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
    const saleServices = await tx
      .select({
        valorVenda: services.valorVenda,
        valorCusto: services.valorCusto,
      })
      .from(services)
      .where(eq(services.vendaId, saleId));

    const totals = saleServices.reduce(
      (acc: any, service: any) => {
        acc.valorTotal += Number(service.valorVenda || 0);
        acc.custoTotal += Number(service.valorCusto || 0);
        return acc;
      },
      { valorTotal: 0, custoTotal: 0 }
    );

    totals.lucro = totals.valorTotal - totals.custoTotal;

    await tx
      .update(sales)
      .set({
        valorTotal: totals.valorTotal.toString(),
        custoTotal: totals.custoTotal.toString(),
        lucro: totals.lucro.toString(),
        updatedAt: new Date(),
      })
      .where(eq(sales.id, saleId));
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
}

export const storage = new DatabaseStorage();
