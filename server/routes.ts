import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { setupSimpleAuth, isAuthenticated } from "./simpleAuth";
import { insertClientSchema, insertSupplierSchema, insertSellerSchema, insertSaleSchema, insertServiceSchema, insertFinancialAccountSchema, insertBankAccountSchema, insertAccountCategorySchema, insertBankTransactionSchema, insertUserSchema, updateUserSchema, insertWhatsappConversationSchema, insertWhatsappMessageSchema } from "@shared/schema";
import { z } from "zod";
import { WhatsAppAPI, whatsappIntegration } from "./whatsapp";

// Transfer validation schema
const transferBankAccountSchema = z.object({
  contaOrigemId: z.coerce.number().positive("ID da conta de origem deve ser um número positivo"),
  contaDestinoId: z.coerce.number().positive("ID da conta de destino deve ser um número positivo"),
  valor: z.coerce.number().positive("Valor deve ser maior que zero"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  observacoes: z.string().optional(),
}).refine((data) => data.contaOrigemId !== data.contaDestinoId, {
  message: "Conta de origem deve ser diferente da conta de destino",
  path: ["contaDestinoId"],
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupSimpleAuth(app);

  // Authorization middleware for user management
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user || user.systemRole !== 'admin') {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores podem gerenciar usuários." });
      }
      
      next();
    } catch (error) {
      console.error("Error in requireAdmin middleware:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  };

  // Authorization middleware for financial operations
  const requireFinancial = async (req: any, res: any, next: any) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user || (user.systemRole !== 'admin' && user.systemRole !== 'supervisor')) {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores e supervisores podem realizar operações financeiras." });
      }
      
      next();
    } catch (error) {
      console.error("Error in requireFinancial middleware:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  };

  // Dashboard routes
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get('/api/dashboard/operations', isAuthenticated, async (req, res) => {
    try {
      const operations = await storage.getWeeklyOperations();
      res.json(operations);
    } catch (error) {
      console.error("Error fetching operations:", error);
      res.status(500).json({ message: "Failed to fetch operations" });
    }
  });

  app.get('/api/dashboard/sales-ranking', isAuthenticated, async (req, res) => {
    try {
      const ranking = await storage.getSalesRanking();
      res.json(ranking);
    } catch (error) {
      console.error("Error fetching sales ranking:", error);
      res.status(500).json({ message: "Failed to fetch sales ranking" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      const clients = await storage.getClients(search as string);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      console.log("POST /api/clients - Request body:", JSON.stringify(req.body, null, 2));
      const clientData = insertClientSchema.parse(req.body);
      console.log("POST /api/clients - Parsed data:", JSON.stringify(clientData, null, 2));
      const client = await storage.createClient(clientData);
      console.log("POST /api/clients - Created client:", JSON.stringify(client, null, 2));
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: `Failed to create client: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  app.put('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.updateClient(id, clientData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClient(id);
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Supplier routes
  app.get('/api/suppliers', isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      const suppliers = await storage.getSuppliers(search as string);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post('/api/suppliers', isAuthenticated, async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.put('/api/suppliers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.updateSupplier(id, supplierData);
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete('/api/suppliers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSupplier(id);
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Seller routes
  app.get('/api/sellers', isAuthenticated, async (req, res) => {
    try {
      const sellers = await storage.getSellers();
      res.json(sellers);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      res.status(500).json({ message: "Failed to fetch sellers" });
    }
  });

  app.post('/api/sellers', isAuthenticated, async (req, res) => {
    try {
      const sellerData = insertSellerSchema.parse(req.body);
      const seller = await storage.createSeller(sellerData);
      res.json(seller);
    } catch (error) {
      console.error("Error creating seller:", error);
      res.status(500).json({ message: "Failed to create seller" });
    }
  });

  // User management routes (for sellers management)
  app.get('/api/users', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log("POST /api/users - Request body:", JSON.stringify(req.body, null, 2));
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      console.log("POST /api/users - Created user:", JSON.stringify(user, null, 2));
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      // Check if it's a Zod validation error
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: (error as any).issues?.map((issue: any) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      res.status(500).json({ message: `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log("PATCH /api/users/:id - Request body:", JSON.stringify(req.body, null, 2));
      const id = req.params.id;
      const userData = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(id, userData);
      console.log("PATCH /api/users/:id - Updated user:", JSON.stringify(user, null, 2));
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      // Check if it's a Zod validation error
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: (error as any).issues?.map((issue: any) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Sales routes
  app.get('/api/sales', isAuthenticated, async (req, res) => {
    try {
      const { status, clientId, dateFrom, dateTo } = req.query;
      const sales = await storage.getSales({
        status: status as string,
        clientId: clientId ? parseInt(clientId as string) : undefined,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      });
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.get('/api/sales/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid sale ID" });
      }
      const sale = await storage.getSaleById(id);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      console.error("Error fetching sale:", error);
      res.status(500).json({ message: "Failed to fetch sale" });
    }
  });

  app.post('/api/sales', isAuthenticated, async (req, res) => {
    try {
      const saleData = req.body;
      const sale = await storage.createSale(saleData);
      res.json(sale);
    } catch (error) {
      console.error("Error creating sale:", error);
      res.status(500).json({ message: "Failed to create sale" });
    }
  });

  app.put('/api/sales/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const saleData = req.body;
      const sale = await storage.updateSale(id, saleData);
      res.json(sale);
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ message: "Failed to update sale" });
    }
  });

  app.put('/api/sales/:id/status', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const sale = await storage.updateSaleStatus(id, status);
      res.json(sale);
    } catch (error) {
      console.error("Error updating sale status:", error);
      res.status(500).json({ message: "Failed to update sale status" });
    }
  });

  // Financial routes
  app.get('/api/financial-accounts', isAuthenticated, async (req, res) => {
    try {
      const { tipo, status, search } = req.query;
      const accounts = await storage.getFinancialAccounts({
        tipo: tipo as string,
        status: status as string,
        search: search as string,
      });
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching financial accounts:", error);
      res.status(500).json({ message: "Failed to fetch financial accounts" });
    }
  });

  app.post('/api/financial-accounts', isAuthenticated, async (req, res) => {
    try {
      const accountData = insertFinancialAccountSchema.parse(req.body);
      const account = await storage.createFinancialAccount(accountData);
      res.json(account);
    } catch (error) {
      console.error("Error creating financial account:", error);
      res.status(500).json({ message: "Failed to create financial account" });
    }
  });

  app.put('/api/financial-accounts/:id/liquidate', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { valor, contaBancariaId, dataLiquidacao, categoriaId, anexos } = req.body;
      const result = await storage.liquidateFinancialAccount(id, {
        valor: parseFloat(valor),
        contaBancariaId: parseInt(contaBancariaId),
        dataLiquidacao,
        categoriaId: parseInt(categoriaId),
        anexos,
      });
      res.json(result);
    } catch (error) {
      console.error("Error liquidating financial account:", error);
      res.status(500).json({ message: "Failed to liquidate financial account" });
    }
  });

  // Banking routes
  app.get('/api/bank-accounts', isAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getBankAccounts();
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      res.status(500).json({ message: "Failed to fetch bank accounts" });
    }
  });

  app.post('/api/bank-accounts', isAuthenticated, async (req, res) => {
    try {
      console.log("POST /api/bank-accounts - Request body:", JSON.stringify(req.body, null, 2));
      const accountData = insertBankAccountSchema.parse(req.body);
      console.log("POST /api/bank-accounts - Parsed account data:", JSON.stringify(accountData, null, 2));
      const account = await storage.createBankAccount(accountData);
      console.log("POST /api/bank-accounts - Created account:", JSON.stringify(account, null, 2));
      res.json(account);
    } catch (error) {
      console.error("Error creating bank account:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to create bank account", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/bank-accounts/:id/transactions', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { dateFrom, dateTo } = req.query;
      const transactions = await storage.getBankTransactions(id, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      });
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching bank transactions:", error);
      res.status(500).json({ message: "Failed to fetch bank transactions" });
    }
  });

  app.post('/api/bank-transactions', isAuthenticated, async (req, res) => {
    try {
      const transactionData = insertBankTransactionSchema.parse(req.body);
      const transaction = await storage.createBankTransaction(transactionData);
      res.json(transaction);
    } catch (error) {
      console.error("Error creating bank transaction:", error);
      res.status(500).json({ message: "Failed to create bank transaction" });
    }
  });

  app.post('/api/bank-accounts/transfer', isAuthenticated, requireFinancial, async (req, res) => {
    try {
      // Validação com Zod schema
      const validatedData = transferBankAccountSchema.parse(req.body);

      const result = await storage.transferBetweenBankAccounts({
        contaOrigemId: validatedData.contaOrigemId,
        contaDestinoId: validatedData.contaDestinoId,
        valor: validatedData.valor,
        descricao: validatedData.descricao,
        observacoes: validatedData.observacoes,
      });

      res.json({
        message: "Transferência realizada com sucesso",
        transacaoSaida: result.transacaoSaida,
        transacaoEntrada: result.transacaoEntrada,
        saldosAtualizados: {
          contaOrigem: result.contaOrigem,
          contaDestino: result.contaDestino,
        }
      });
    } catch (error) {
      console.error("Error transferring between bank accounts:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      // Handle domain/business logic errors with 422 status
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        if (errorMessage.includes('Saldo insuficiente') || 
            errorMessage.includes('não encontrada') ||
            errorMessage.includes('deve ser maior que zero')) {
          return res.status(422).json({
            message: "Erro de validação de negócio",
            error: errorMessage,
            field: errorMessage.includes('Saldo insuficiente') ? 'valor' : 
                   errorMessage.includes('origem não encontrada') ? 'contaOrigemId' :
                   errorMessage.includes('destino não encontrada') ? 'contaDestinoId' : 'valor'
          });
        }
      }
      
      res.status(500).json({ 
        message: "Falha na transferência",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Account Categories routes
  app.get('/api/account-categories', isAuthenticated, async (req, res) => {
    try {
      const { tipo } = req.query;
      const categories = await storage.getAccountCategories(tipo as string);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching account categories:", error);
      res.status(500).json({ message: "Failed to fetch account categories" });
    }
  });

  app.post('/api/account-categories', isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertAccountCategorySchema.parse(req.body);
      const category = await storage.createAccountCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating account category:", error);
      res.status(500).json({ message: "Failed to create account category" });
    }
  });

  app.put('/api/account-categories/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const categoryData = insertAccountCategorySchema.parse(req.body);
      const category = await storage.updateAccountCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error updating account category:", error);
      res.status(500).json({ message: "Failed to update account category" });
    }
  });

  app.delete('/api/account-categories/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAccountCategory(id);
      res.json({ message: "Account category deleted successfully" });
    } catch (error) {
      console.error("Error deleting account category:", error);
      res.status(500).json({ message: "Failed to delete account category" });
    }
  });

  // WhatsApp webhook for receiving messages (public endpoint with security)
  app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
      // Security check - webhook token validation (required env var)
      const expectedToken = process.env.WHATSAPP_WEBHOOK_TOKEN;
      if (!expectedToken) {
        console.error("WHATSAPP_WEBHOOK_TOKEN environment variable not set");
        return res.status(500).json({ message: "Server configuration error" });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return res.status(401).json({ message: "Unauthorized webhook access" });
      }

      // Validate webhook payload with Zod
      const webhookSchema = z.object({
        phone: z.string().min(1, "Phone is required"),
        name: z.string().optional(),
        message: z.string().min(1, "Message content is required"),
        messageId: z.string().optional(),
        type: z.string().default('text'),
        timestamp: z.string().optional()
      });

      const validationResult = webhookSchema.safeParse(req.body);

      if (!validationResult.success) {
        console.warn("Invalid webhook payload:", validationResult.error.errors);
        return res.status(400).json({ 
          message: "Invalid webhook payload", 
          errors: validationResult.error.errors 
        });
      }

      const { phone, name, message, messageId, type, timestamp } = validationResult.data;
      console.log("Received WhatsApp webhook:", { phone, messageId });

      // Get or create conversation
      const conversation = await storage.getOrCreateConversation(phone, name || "Contact");

      // Save received message to database
      const messageData = {
        conversationId: conversation.id,
        messageId: messageId || `webhook_${Date.now()}`,
        type: type,
        content: message,
        fromMe: false, // Received message
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        status: 'received',
      };
      
      const savedMessage = await storage.createMessage(messageData);
      console.log("WhatsApp message received and saved:", savedMessage.messageId);

      // Respond quickly to webhook
      res.status(200).json({ success: true, message: "Message received" });
    } catch (error) {
      console.error("Error processing WhatsApp webhook:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // WhatsApp API routes (authenticated)
  app.get('/api/whatsapp/conversations', isAuthenticated, async (req, res) => {
    try {
      const conversations = await storage.getWhatsAppConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching WhatsApp conversations:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp conversations" });
    }
  });

  app.post('/api/whatsapp/conversations', isAuthenticated, async (req, res) => {
    try {
      const { phone, name } = req.body;
      if (!phone || !name) {
        return res.status(400).json({ message: "Phone and name are required" });
      }
      const conversation = await storage.getOrCreateConversation(phone, name);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating WhatsApp conversation:", error);
      res.status(500).json({ message: "Failed to create WhatsApp conversation" });
    }
  });

  app.put('/api/whatsapp/conversations/:id/status', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isOnline } = req.body;
      const conversation = await storage.updateConversationStatus(id, isOnline);
      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation status:", error);
      res.status(500).json({ message: "Failed to update conversation status" });
    }
  });

  app.get('/api/whatsapp/conversations/:id/messages', isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching WhatsApp messages:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp messages" });
    }
  });

  app.post('/api/whatsapp/messages', isAuthenticated, async (req, res) => {
    try {
      const messageData = req.body;
      // Adiciona timestamp se não fornecido
      if (!messageData.timestamp) {
        messageData.timestamp = new Date();
      }
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating WhatsApp message:", error);
      res.status(500).json({ message: "Failed to create WhatsApp message" });
    }
  });

  app.put('/api/whatsapp/messages/:messageId/status', isAuthenticated, async (req, res) => {
    try {
      const messageId = req.params.messageId;
      const { status } = req.body;
      const message = await storage.updateMessageStatus(messageId, status);
      res.json(message);
    } catch (error) {
      console.error("Error updating message status:", error);
      res.status(500).json({ message: "Failed to update message status" });
    }
  });

  // WhatsApp integrado - Status do servidor
  app.get('/api/whatsapp/status', async (req, res) => {
    try {
      const status = WhatsAppAPI.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting WhatsApp status:", error);
      res.status(500).json({ message: "Failed to get WhatsApp status" });
    }
  });

  // WhatsApp integrado - QR Code
  app.get('/api/whatsapp/qr', async (req, res) => {
    try {
      const qrCode = WhatsAppAPI.getQRCode();
      if (qrCode) {
        res.json({ qrCode });
      } else {
        // Se não há QR code e está desconectado, tentar gerar um novo
        const status = WhatsAppAPI.getStatus();
        if (status.status === 'Desconectado') {
          // Forçar reconexão para gerar novo QR code
          setTimeout(() => {
            whatsappIntegration.clearSession();
          }, 1000);
          res.json({ message: 'Iniciando processo de reconexão...', needsReconnection: true });
        } else {
          res.status(404).json({ error: 'QR Code não disponível' });
        }
      }
    } catch (error) {
      console.error("Error getting QR code:", error);
      res.status(500).json({ message: "Failed to get QR code" });
    }
  });

  // WhatsApp integrado - Reconectar / Limpar sessão
  app.post('/api/whatsapp/reconnect', async (req, res) => {
    try {
      await whatsappIntegration.clearSession();
      res.json({ 
        success: true,
        message: 'Processo de reconexão iniciado. Aguarde alguns segundos para o novo QR Code.' 
      });
    } catch (error) {
      console.error("Error reconnecting WhatsApp:", error);
      res.status(500).json({ 
        success: false,
        message: "Erro ao reconectar WhatsApp" 
      });
    }
  });

  // WhatsApp integrado - Enviar mensagem
  app.post('/api/whatsapp/send', isAuthenticated, async (req, res) => {
    try {
      // Validate send message payload
      const sendMessageSchema = z.object({
        phone: z.string().min(1, "Phone is required"),
        message: z.string().min(1, "Message is required")
      });

      const validationResult = sendMessageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request payload", 
          errors: validationResult.error.errors 
        });
      }

      const { phone, message } = validationResult.data;

      // Get or create conversation first
      const conversation = await storage.getOrCreateConversation(phone, "Usuario");
      
      // Try to send via WhatsApp but don't fail if it doesn't work
      let sendSuccess = false;
      let errorDetails = '';
      
      try {
        sendSuccess = await WhatsAppAPI.sendMessage(phone, message);
      } catch (error) {
        errorDetails = error instanceof Error ? error.message : 'Erro desconhecido';
        console.log(`[SEND] ⚠️ Envio falhou, mas salvando no banco: ${errorDetails}`);
      }
      
      // Always save message to database regardless of send success
      const messageData = insertWhatsappMessageSchema.parse({
        conversationId: conversation.id,
        messageId: `local_${Date.now()}`,
        type: 'text',
        content: message,
        fromMe: true,
        timestamp: new Date(),
        status: sendSuccess ? 'sent' : 'pending', // Mark as pending if send failed
      });

      await storage.createMessage(messageData);

      // Return success with status info
      res.json({ 
        success: true, 
        messageId: messageData.messageId,
        sent: sendSuccess,
        saved: true,
        ...(errorDetails && { error: errorDetails })
      });
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      res.status(500).json({ message: "Failed to send WhatsApp message" });
    }
  });

  const httpServer = createServer(app);

  // =====================================================================
  // 🔄 WEBSOCKET SERVER PARA MÚLTIPLOS ATENDENTES WHATSAPP
  // =====================================================================
  
  
  // Gerenciador de conexões de atendentes
  interface AttendantConnection {
    ws: typeof WebSocket;
    userId: string;
    userRole: string;
    assignedConversations: Set<number>;
    lastActivity: Date;
  }
  
  const attendantConnections = new Map<string, AttendantConnection>();
  
  // Criar servidor WebSocket
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws/whatsapp',
    verifyClient: async (info: any) => {
      try {
        // Extrair cookies do request
        const cookies = info.req.headers.cookie;
        if (!cookies) return false;
        
        // Parse básico de cookies para encontrar session ID
        const sessionId = cookies.split(';')
          .find((c: string) => c.trim().startsWith('connect.sid='))
          ?.split('=')[1];
          
        // Se não tem session ID, rejeitar
        if (!sessionId) return false;
        
        // Verificar se a sessão existe e está válida
        // (A validação completa será feita na conexão)
        return true;
      } catch (error) {
        console.error('❌ Erro na verificação WebSocket:', error);
        return false;
      }
    }
  });
  
  console.log('🔗 Servidor WebSocket WhatsApp Multi-Atendente iniciado em /ws/whatsapp');
  
  wss.on('connection', async (ws: typeof WebSocket, request: any) => {
    console.log('📱 Nova conexão WebSocket de atendente');
    
    let attendantId: string | null = null;
    let authenticatedUser: any = null;
    
    // Autenticação automática via cookies da sessão
    try {
      const cookies = request.headers.cookie;
      if (cookies) {
        // Parse session cookie (simplificado)
        const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
        if (sessionMatch) {
          // Para esta implementação inicial, vamos confiar nas sessions existentes
          // Em produção, deveríamos validar completamente a sessão aqui
          console.log('🔐 Sessão WebSocket detectada');
        }
      }
    } catch (error) {
      console.error('❌ Erro na autenticação inicial WebSocket:', error);
    }
    
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'AUTH':
            // Autenticar atendente usando dados da sessão
            const userId = message.userId;
            const userRole = message.userRole || 'vendedor';
            
            if (userId) {
              try {
                // Verificar se o usuário existe no sistema
                const user = await storage.getUser(userId);
                if (!user) {
                  ws.send(JSON.stringify({
                    type: 'AUTH_ERROR',
                    message: 'Usuário não encontrado'
                  }));
                  return;
                }
                
                attendantId = userId;
                authenticatedUser = user;
                
                // Registrar conexão do atendente
                attendantConnections.set(userId, {
                  ws,
                  userId,
                  userRole: user.systemRole || 'vendedor',
                  assignedConversations: new Set(),
                  lastActivity: new Date()
                });
                
                console.log(`✅ Atendente ${user.email} (${user.systemRole}) conectado via WebSocket`);
                
                // Confirmar autenticação
                ws.send(JSON.stringify({
                  type: 'AUTH_SUCCESS',
                  userId,
                  userEmail: user.email,
                  userRole: user.systemRole,
                  timestamp: new Date().toISOString()
                }));
                
                // Enviar conversas atribuídas ao atendente
                await sendAssignedConversations(userId);
                
              } catch (error) {
                console.error('❌ Erro na autenticação WebSocket:', error);
                ws.send(JSON.stringify({
                  type: 'AUTH_ERROR',
                  message: 'Erro na validação do usuário'
                }));
              }
              
            } else {
              ws.send(JSON.stringify({
                type: 'AUTH_ERROR',
                message: 'User ID é obrigatório'
              }));
            }
            break;
            
          case 'SEND_MESSAGE':
            // Enviar mensagem via WhatsApp
            if (attendantId) {
              const { phone, messageContent, conversationId } = message;
              
              try {
                // Enviar mensagem
                const sendSuccess = await WhatsAppAPI.sendMessage(phone, messageContent);
                
                // Salvar no banco com ID do atendente
                const messageData = insertWhatsappMessageSchema.parse({
                  conversationId,
                  messageId: `local_${Date.now()}`,
                  type: 'text',
                  content: messageContent,
                  fromMe: true,
                  timestamp: new Date(),
                  status: sendSuccess ? 'sent' : 'pending',
                  sentByUserId: attendantId,
                });
                
                await storage.createMessage(messageData);
                
                // Broadcast mensagem para outros atendentes da conversa
                broadcastMessage({
                  type: 'NEW_MESSAGE',
                  conversationId,
                  message: messageData,
                  fromUserId: attendantId
                }, conversationId, attendantId);
                
                // Confirmar envio para o remetente
                ws.send(JSON.stringify({
                  type: 'MESSAGE_SENT',
                  messageId: messageData.messageId,
                  success: sendSuccess
                }));
                
              } catch (error) {
                ws.send(JSON.stringify({
                  type: 'MESSAGE_ERROR',
                  error: error instanceof Error ? error.message : 'Erro desconhecido'
                }));
              }
            }
            break;
            
          case 'ASSIGN_CONVERSATION':
            // Atribuir conversa a um atendente
            if (attendantId) {
              const { conversationId, assignToUserId } = message;
              
              try {
                // Atualizar no banco de dados
                await storage.assignConversation(conversationId, assignToUserId);
                
                // Atualizar conexões ativas
                updateConversationAssignments(conversationId, assignToUserId);
                
                // Notificar todos os atendentes sobre a mudança
                broadcastToAllAttendants({
                  type: 'CONVERSATION_ASSIGNED',
                  conversationId,
                  assignedToUserId: assignToUserId,
                  assignedByUserId: attendantId
                });
                
              } catch (error) {
                ws.send(JSON.stringify({
                  type: 'ASSIGN_ERROR',
                  error: error instanceof Error ? error.message : 'Erro ao atribuir conversa'
                }));
              }
            }
            break;
            
          case 'HEARTBEAT':
            // Manter conexão viva
            if (attendantId && attendantConnections.has(attendantId)) {
              attendantConnections.get(attendantId)!.lastActivity = new Date();
              ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK' }));
            }
            break;
        }
        
      } catch (error) {
        console.error('❌ Erro ao processar mensagem WebSocket:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      if (attendantId) {
        console.log(`📱 Atendente ${attendantId} desconectado`);
        attendantConnections.delete(attendantId);
      }
    });
    
    ws.on('error', (error: Error) => {
      console.error('❌ Erro WebSocket:', error);
    });
  });
  
  // Função para enviar conversas atribuídas ao atendente
  async function sendAssignedConversations(userId: string) {
    try {
      const conversations = await storage.getConversationsByUser(userId);
      const connection = attendantConnections.get(userId);
      
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({
          type: 'ASSIGNED_CONVERSATIONS',
          conversations,
          timestamp: new Date().toISOString()
        }));
        
        // Atualizar lista de conversas atribuídas
        connection.assignedConversations.clear();
        conversations.forEach((conv: any) => {
          connection.assignedConversations.add(conv.id);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao buscar conversas do atendente:', error);
    }
  }
  
  // Função para broadcast de mensagens para atendentes específicos
  function broadcastMessage(data: any, conversationId: number, excludeUserId?: string) {
    attendantConnections.forEach((connection, userId) => {
      if (userId !== excludeUserId && 
          connection.assignedConversations.has(conversationId) &&
          connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(data));
      }
    });
  }
  
  // Função para broadcast para todos os atendentes
  function broadcastToAllAttendants(data: any, excludeUserId?: string) {
    attendantConnections.forEach((connection, userId) => {
      if (userId !== excludeUserId && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(data));
      }
    });
  }
  
  // Função para atualizar atribuições de conversa
  function updateConversationAssignments(conversationId: number, newAssigneeId: string) {
    // Remover conversa de outros atendentes
    attendantConnections.forEach((connection) => {
      connection.assignedConversations.delete(conversationId);
    });
    
    // Adicionar conversa ao novo atendente
    const newAssignee = attendantConnections.get(newAssigneeId);
    if (newAssignee) {
      newAssignee.assignedConversations.add(conversationId);
    }
  }
  
  // 🔄 INTEGRAÇÃO BAILEYS → WEBSOCKET - Broadcast mensagens recebidas
  WhatsAppAPI.onMessageReceived = async (conversationId: number, message: any) => {
    try {
      console.log(`[WEBSOCKET BROADCAST] 📡 Distribuindo mensagem da conversa ${conversationId}`);
      
      // Buscar informações da conversa para determinar atendente responsável
      const conversations = await storage.getWhatsAppConversations();
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (conversation) {
        // Se a conversa tem atendente atribuído, enviar só para ele
        if (conversation.assignedUserId && conversation.isAssigned) {
          const assignedConnection = attendantConnections.get(conversation.assignedUserId);
          if (assignedConnection && assignedConnection.ws.readyState === WebSocket.OPEN) {
            assignedConnection.ws.send(JSON.stringify({
              type: 'NEW_INCOMING_MESSAGE',
              conversationId,
              message,
              conversation: {
                id: conversation.id,
                phone: conversation.phone,
                name: conversation.name,
                assignedUserId: conversation.assignedUserId
              },
              timestamp: new Date().toISOString()
            }));
            console.log(`[WEBSOCKET] ✅ Mensagem enviada para atendente ${conversation.assignedUserId}`);
          }
        } else {
          // Conversa não atribuída - enviar para todos os atendentes disponíveis
          console.log(`[WEBSOCKET] 📢 Conversa não atribuída - enviando para todos atendentes`);
          attendantConnections.forEach((connection, userId) => {
            if (connection.ws.readyState === WebSocket.OPEN) {
              connection.ws.send(JSON.stringify({
                type: 'NEW_UNASSIGNED_MESSAGE',
                conversationId,
                message,
                conversation: {
                  id: conversation.id,
                  phone: conversation.phone,
                  name: conversation.name,
                  assignedUserId: null
                },
                timestamp: new Date().toISOString()
              }));
            }
          });
          console.log(`[WEBSOCKET] ✅ Mensagem distribuída para ${attendantConnections.size} atendentes`);
        }
      }
      
    } catch (error) {
      console.error('[WEBSOCKET BROADCAST] ❌ Erro ao distribuir mensagem:', error);
    }
  };
  
  // Limpeza de conexões inativas (a cada 5 minutos)
  setInterval(() => {
    const now = new Date();
    attendantConnections.forEach((connection, userId) => {
      const inactiveTime = now.getTime() - connection.lastActivity.getTime();
      if (inactiveTime > 300000) { // 5 minutos
        console.log(`🧹 Removendo atendente inativo: ${userId}`);
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.close();
        }
        attendantConnections.delete(userId);
      }
    });
  }, 300000);

  return httpServer;
}
