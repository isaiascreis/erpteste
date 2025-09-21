import { sql, relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User Roles and Permissions
export const userRolesEnum = pgEnum("user_role", ["admin", "supervisor", "vendedor"]);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"),
  systemRole: userRolesEnum("system_role").default("vendedor"), // New field for business roles
  ativo: boolean("ativo").default(true),
  telefone: varchar("telefone", { length: 20 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Permissions
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(), // sales, clients, financial, etc
  action: varchar("action", { length: 50 }).notNull(), // create, read, update, delete, manage
  granted: boolean("granted").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enums
export const saleStatusEnum = pgEnum("sale_status", ["orcamento", "venda", "cancelada"]);
export const accountTypeEnum = pgEnum("account_type", ["pagar", "receber"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pendente", "parcial", "liquidado"]);
export const serviceTypeEnum = pgEnum("service_type", ["aereo", "hotel", "transfer", "outros"]);
export const accountCategoryTypeEnum = pgEnum("account_category_type", ["receita", "despesa", "outros"]);

// Clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  cpf: varchar("cpf", { length: 14 }),
  endereco: text("endereco"),
  dataNascimento: varchar("data_nascimento", { length: 10 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  cnpj: varchar("cnpj", { length: 18 }),
  endereco: text("endereco"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sellers
export const sellers = pgTable("sellers", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  comissaoPercentual: decimal("comissao_percentual", { precision: 5, scale: 2 }).default("0.00"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  referencia: varchar("referencia", { length: 50 }).notNull().unique(),
  clienteId: integer("cliente_id").references(() => clients.id).notNull(),
  status: saleStatusEnum("status").default("orcamento"),
  valorTotal: decimal("valor_total", { precision: 10, scale: 2 }).default("0.00"),
  custoTotal: decimal("custo_total", { precision: 10, scale: 2 }).default("0.00"),
  lucro: decimal("lucro", { precision: 10, scale: 2 }).default("0.00"),
  observacoes: text("observacoes"),
  dataVenda: timestamp("data_venda"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Passengers
export const passengers = pgTable("passengers", {
  id: serial("id").primaryKey(),
  vendaId: integer("venda_id").references(() => sales.id).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  dataNascimento: varchar("data_nascimento", { length: 10 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Services
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  vendaId: integer("venda_id").references(() => sales.id).notNull(),
  tipo: serviceTypeEnum("tipo").notNull(),
  descricao: text("descricao").notNull(),
  localizador: varchar("localizador", { length: 100 }),
  fornecedorId: integer("fornecedor_id").references(() => suppliers.id),
  valorVenda: decimal("valor_venda", { precision: 10, scale: 2 }).default("0.00"),
  valorCusto: decimal("valor_custo", { precision: 10, scale: 2 }).default("0.00"),
  detalhes: jsonb("detalhes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service Passengers (valores individuais por passageiro)
export const servicePassengers = pgTable("service_passengers", {
  id: serial("id").primaryKey(),
  servicoId: integer("servico_id").references(() => services.id).notNull(),
  passageiroId: integer("passageiro_id").references(() => passengers.id).notNull(),
  valorVenda: decimal("valor_venda", { precision: 10, scale: 2 }).default("0.00"),
  valorCusto: decimal("valor_custo", { precision: 10, scale: 2 }).default("0.00"),
});

// Sale Sellers
export const saleSellers = pgTable("sale_sellers", {
  id: serial("id").primaryKey(),
  vendaId: integer("venda_id").references(() => sales.id).notNull(),
  vendedorId: integer("vendedor_id").references(() => sellers.id).notNull(),
  comissaoPercentual: decimal("comissao_percentual", { precision: 5, scale: 2 }).notNull(),
  valorComissao: decimal("valor_comissao", { precision: 10, scale: 2 }).default("0.00"),
});

// Bank Accounts
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 20 }),
  conta: varchar("conta", { length: 30 }),
  saldo: decimal("saldo", { precision: 12, scale: 2 }).default("0.00"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Account Categories
export const accountCategories = pgTable("account_categories", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: accountCategoryTypeEnum("tipo").notNull(),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Financial Accounts
export const financialAccounts = pgTable("financial_accounts", {
  id: serial("id").primaryKey(),
  descricao: text("descricao").notNull(),
  vendaId: integer("venda_id").references(() => sales.id),
  tipo: accountTypeEnum("tipo").notNull(),
  valorTotal: decimal("valor_total", { precision: 10, scale: 2 }).notNull(),
  valorLiquidado: decimal("valor_liquidado", { precision: 10, scale: 2 }).default("0.00"),
  valorAberto: decimal("valor_aberto", { precision: 10, scale: 2 }).notNull(),
  dataVencimento: timestamp("data_vencimento"),
  status: paymentStatusEnum("status").default("pendente"),
  categoriaId: integer("categoria_id").references(() => accountCategories.id),
  clienteId: integer("cliente_id").references(() => clients.id),
  fornecedorId: integer("fornecedor_id").references(() => suppliers.id),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Plans
export const paymentPlans = pgTable("payment_plans", {
  id: serial("id").primaryKey(),
  vendaId: integer("venda_id").references(() => sales.id).notNull(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  dataVencimento: timestamp("data_vencimento").notNull(),
  formaPagamento: varchar("forma_pagamento", { length: 50 }),
  quemRecebe: varchar("quem_recebe", { length: 50 }), // AGENCIA ou FORNECEDOR
  status: paymentStatusEnum("status").default("pendente"),
  contaId: integer("conta_id").references(() => financialAccounts.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bank Transactions
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  contaBancariaId: integer("conta_bancaria_id").references(() => bankAccounts.id).notNull(),
  contaFinanceiraId: integer("conta_financeira_id").references(() => financialAccounts.id),
  descricao: text("descricao").notNull(),
  valor: decimal("valor", { precision: 12, scale: 2 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // entrada ou saida
  dataTransacao: timestamp("data_transacao").notNull(),
  saldoAnterior: decimal("saldo_anterior", { precision: 12, scale: 2 }).notNull(),
  saldoNovo: decimal("saldo_novo", { precision: 12, scale: 2 }).notNull(),
  conciliado: boolean("conciliado").default(false),
  anexos: text("anexos").array(),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// WhatsApp Conversations
export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  avatar: text("avatar"),
  isOnline: boolean("is_online").default(false).notNull(),
  lastMessageTime: timestamp("last_message_time"),
  unreadCount: integer("unread_count").default(0).notNull(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'set null' }),
  // Multi-Agent Support Fields
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: 'set null' }),
  isAssigned: boolean("is_assigned").default(false).notNull(),
  departmentId: integer("department_id"), // Para futuro sistema de departamentos
  priority: varchar("priority", { length: 20 }).default("normal"), // normal, high, urgent
  tags: text("tags").array().default([]), // Tags para categorização
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp Messages  
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => whatsappConversations.id, { onDelete: 'cascade' }).notNull(),
  messageId: varchar("message_id", { length: 255 }).unique(), // ID do WhatsApp
  type: varchar("type", { length: 20 }).notNull(), // text, image, audio, video, document
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  mediaType: varchar("media_type", { length: 100 }),
  fileName: varchar("file_name", { length: 255 }),
  fromMe: boolean("from_me").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  status: varchar("status", { length: 20 }).default('sent'), // sent, delivered, read, failed
  // Multi-Agent Support Fields
  sentByUserId: varchar("sent_by_user_id").references(() => users.id, { onDelete: 'set null' }), // Quem enviou (para mensagens enviadas)
  readByUsers: text("read_by_users").array().default([]), // Array de user IDs que leram a mensagem
  isInternal: boolean("is_internal").default(false), // Mensagem interna entre atendentes
  createdAt: timestamp("created_at").defaultNow(),
});

// Contract Templates and Clauses
export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'contract', 'voucher'
  htmlContent: text("html_content").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contractClauses = pgTable("contract_clauses", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  sales: many(sales),
  financialAccounts: many(financialAccounts),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  services: many(services),
  financialAccounts: many(financialAccounts),
}));

export const sellersRelations = relations(sellers, ({ many }) => ({
  saleSellers: many(saleSellers),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  client: one(clients, {
    fields: [sales.clienteId],
    references: [clients.id],
  }),
  passengers: many(passengers),
  services: many(services),
  saleSellers: many(saleSellers),
  financialAccounts: many(financialAccounts),
  paymentPlans: many(paymentPlans),
}));

export const passengersRelations = relations(passengers, ({ one, many }) => ({
  sale: one(sales, {
    fields: [passengers.vendaId],
    references: [sales.id],
  }),
  servicePassengers: many(servicePassengers),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  sale: one(sales, {
    fields: [services.vendaId],
    references: [sales.id],
  }),
  supplier: one(suppliers, {
    fields: [services.fornecedorId],
    references: [suppliers.id],
  }),
  servicePassengers: many(servicePassengers),
}));

export const servicePassengersRelations = relations(servicePassengers, ({ one }) => ({
  service: one(services, {
    fields: [servicePassengers.servicoId],
    references: [services.id],
  }),
  passenger: one(passengers, {
    fields: [servicePassengers.passageiroId],
    references: [passengers.id],
  }),
}));

export const saleSellersRelations = relations(saleSellers, ({ one }) => ({
  sale: one(sales, {
    fields: [saleSellers.vendaId],
    references: [sales.id],
  }),
  seller: one(sellers, {
    fields: [saleSellers.vendedorId],
    references: [sellers.id],
  }),
}));

export const bankAccountsRelations = relations(bankAccounts, ({ many }) => ({
  transactions: many(bankTransactions),
}));

export const accountCategoriesRelations = relations(accountCategories, ({ many }) => ({
  financialAccounts: many(financialAccounts),
}));

export const financialAccountsRelations = relations(financialAccounts, ({ one, many }) => ({
  sale: one(sales, {
    fields: [financialAccounts.vendaId],
    references: [sales.id],
  }),
  category: one(accountCategories, {
    fields: [financialAccounts.categoriaId],
    references: [accountCategories.id],
  }),
  client: one(clients, {
    fields: [financialAccounts.clienteId],
    references: [clients.id],
  }),
  supplier: one(suppliers, {
    fields: [financialAccounts.fornecedorId],
    references: [suppliers.id],
  }),
  bankTransactions: many(bankTransactions),
}));

export const paymentPlansRelations = relations(paymentPlans, ({ one }) => ({
  sale: one(sales, {
    fields: [paymentPlans.vendaId],
    references: [sales.id],
  }),
  account: one(financialAccounts, {
    fields: [paymentPlans.contaId],
    references: [financialAccounts.id],
  }),
}));

export const bankTransactionsRelations = relations(bankTransactions, ({ one }) => ({
  bankAccount: one(bankAccounts, {
    fields: [bankTransactions.contaBancariaId],
    references: [bankAccounts.id],
  }),
  financialAccount: one(financialAccounts, {
    fields: [bankTransactions.contaFinanceiraId],
    references: [financialAccounts.id],
  }),
}));

export const whatsappConversationsRelations = relations(whatsappConversations, ({ one, many }) => ({
  client: one(clients, {
    fields: [whatsappConversations.clientId],
    references: [clients.id],
  }),
  assignedUser: one(users, {
    fields: [whatsappConversations.assignedUserId],
    references: [users.id],
  }),
  messages: many(whatsappMessages),
}));

export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  conversation: one(whatsappConversations, {
    fields: [whatsappMessages.conversationId],
    references: [whatsappConversations.id],
  }),
  sentByUser: one(users, {
    fields: [whatsappMessages.sentByUserId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSellerSchema = createInsertSchema(sellers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPassengerSchema = createInsertSchema(passengers).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServicePassengerSchema = createInsertSchema(servicePassengers).omit({ id: true });
export const insertSaleSellerSchema = createInsertSchema(saleSellers).omit({ id: true });
export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAccountCategorySchema = createInsertSchema(accountCategories).omit({ id: true, createdAt: true });
export const insertFinancialAccountSchema = createInsertSchema(financialAccounts).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  dataVencimento: z.string().optional().transform(val => val ? new Date(val) : undefined),
});
export const insertPaymentPlanSchema = createInsertSchema(paymentPlans).omit({ id: true, createdAt: true });
export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ id: true, createdAt: true });
export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({ id: true, createdAt: true });
export const insertWhatsappConversationSchema = createInsertSchema(whatsappConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, createdAt: true });
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContractClauseSchema = createInsertSchema(contractClauses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const updateUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true }).partial();

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Passenger = typeof passengers.$inferSelect;
export type InsertPassenger = z.infer<typeof insertPassengerSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type ServicePassenger = typeof servicePassengers.$inferSelect;
export type InsertServicePassenger = z.infer<typeof insertServicePassengerSchema>;
export type SaleSeller = typeof saleSellers.$inferSelect;
export type InsertSaleSeller = z.infer<typeof insertSaleSellerSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type AccountCategory = typeof accountCategories.$inferSelect;
export type InsertAccountCategory = z.infer<typeof insertAccountCategorySchema>;
export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type InsertFinancialAccount = z.infer<typeof insertFinancialAccountSchema>;
export type PaymentPlan = typeof paymentPlans.$inferSelect;
export type InsertPaymentPlan = z.infer<typeof insertPaymentPlanSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type WhatsappConversation = typeof whatsappConversations.$inferSelect;
export type InsertWhatsappConversation = z.infer<typeof insertWhatsappConversationSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
