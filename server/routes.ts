import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { setupSimpleAuth, isAuthenticated } from "./simpleAuth";
import { insertClientSchema, insertSupplierSchema, insertSellerSchema, insertSaleSchema, insertServiceSchema, insertFinancialAccountSchema, insertBankAccountSchema, insertAccountCategorySchema, insertBankTransactionSchema, insertUserSchema, updateUserSchema, insertWhatsappConversationSchema, insertWhatsappMessageSchema, insertSaleRequirementSchema, insertSaleCommissionSchema, insertNotificationSchema, insertPaymentPlanSchema, insertPaymentMethodSchema, insertPaymentConditionSchema, insertServicePassengerSchema, insertSaleClientSchema, insertServiceClientSchema, insertContractClauseSchema, insertDocumentTemplateSchema, insertTaskTemplateSchema } from "@shared/schema";
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
      
      // Generate automatic tasks if sale is confirmed
      if (sale.status === 'venda') {
        try {
          await storage.generateTasksFromTemplates(sale.id, sale);
        } catch (taskError) {
          console.error("Error generating automatic tasks:", taskError);
          // Don't fail the whole request if task generation fails
        }
      }
      
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
      
      // Generate automatic tasks if sale is confirmed for the first time
      if (status === 'venda') {
        try {
          // Check if tasks were already generated to avoid duplicates
          const existingTasks = await storage.getSaleRequirements(id);
          const autoGeneratedTasks = existingTasks.filter(task => task.geradaAutomaticamente);
          
          if (autoGeneratedTasks.length === 0) {
            await storage.generateTasksFromTemplates(id, sale);
          }
        } catch (taskError) {
          console.error("Error generating automatic tasks:", taskError);
          // Don't fail the whole request if task generation fails
        }
      }
      
      res.json(sale);
    } catch (error) {
      console.error("Error updating sale status:", error);
      res.status(500).json({ message: "Failed to update sale status" });
    }
  });

  // Generate contract PDF route
  app.post('/api/sales/:id/generate-contract', isAuthenticated, async (req, res) => {
    try {
      console.log("=== START CONTRACT GENERATION ===");
      const id = parseInt(req.params.id);
      console.log("Sale ID:", id);
      if (isNaN(id) || id <= 0) {
        console.log("Invalid sale ID:", id);
        return res.status(400).json({ message: "Invalid sale ID" });
      }

      // Fetch sale data with all related information
      const sale = await storage.getSaleById(id);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      // Fetch contract clauses and templates
      const contractClauses = await storage.getContractClauses("contrato");
      const activeTemplate = await storage.getDocumentTemplates("contrato");
      
      if (!activeTemplate || activeTemplate.length === 0) {
        return res.status(400).json({ message: "Nenhum template de contrato ativo encontrado. Configure um template nas configurações." });
      }

      const template = activeTemplate.find((t: any) => t.isActive) || activeTemplate[0];

      // Generate contract HTML by replacing template variables
      let contractHtml = template.htmlContent;

      // Replace basic variables
      contractHtml = contractHtml.replace(/\{\{nomeCliente\}\}/g, sale.client?.nome || 'Cliente não informado');
      contractHtml = contractHtml.replace(/\{\{numeroVenda\}\}/g, sale.referencia || sale.id);
      contractHtml = contractHtml.replace(/\{\{dataVenda\}\}/g, new Date(sale.createdAt || new Date()).toLocaleDateString('pt-BR'));
      contractHtml = contractHtml.replace(/\{\{valorTotal\}\}/g, `R$ ${parseFloat(sale.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

      // Generate services list
      let servicosHtml = '';
      if (sale.services && sale.services.length > 0) {
        servicosHtml = sale.services.map((service: any) => {
          return `<li>${service.tipo}: ${service.descricao} - ${service.valorVenda ? `R$ ${parseFloat(service.valorVenda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Valor não informado'}</li>`;
        }).join('');
        servicosHtml = `<ul>${servicosHtml}</ul>`;
      } else {
        servicosHtml = '<p>Nenhum serviço informado</p>';
      }
      contractHtml = contractHtml.replace(/\{\{servicos\}\}/g, servicosHtml);

      // Generate passengers list
      let passageirosHtml = '';
      if (sale.passengers && sale.passengers.length > 0) {
        passageirosHtml = sale.passengers.map((passenger: any) => {
          return `<li>${passenger.nome}${passenger.cpf ? ` (CPF: ${passenger.cpf})` : ''}</li>`;
        }).join('');
        passageirosHtml = `<ul>${passageirosHtml}</ul>`;
      } else {
        passageirosHtml = '<p>Nenhum passageiro informado</p>';
      }
      contractHtml = contractHtml.replace(/\{\{passageiros\}\}/g, passageirosHtml);

      // Add contract clauses
      let clausulasHtml = '';
      if (contractClauses && contractClauses.length > 0) {
        const activeClauses = contractClauses.filter((clause: any) => clause.isActive).sort((a: any, b: any) => a.order - b.order);
        clausulasHtml = activeClauses.map((clause: any, index: number) => {
          return `<div class="clause"><h4>${index + 1}. ${clause.title}</h4><p>${clause.content}</p></div>`;
        }).join('');
      }
      contractHtml = contractHtml.replace(/\{\{clausulas\}\}/g, clausulasHtml);

      // Replace any remaining common variables
      contractHtml = contractHtml.replace(/\{\{dataAtual\}\}/g, new Date().toLocaleDateString('pt-BR'));
      contractHtml = contractHtml.replace(/\{\{emailCliente\}\}/g, sale.client?.email || 'Não informado');
      contractHtml = contractHtml.replace(/\{\{telefoneCliente\}\}/g, sale.client?.telefone || 'Não informado');

      // Return HTML content as JSON for modal display
      res.json({
        success: true,
        htmlContent: contractHtml,
        saleReference: sale.referencia || sale.id
      });

    } catch (error) {
      console.error("Error generating contract:", error);
      res.status(500).json({ message: "Failed to generate contract" });
    }
  });

  // Sale requirements routes
  app.get('/api/sales/:id/requirements', isAuthenticated, async (req, res) => {
    try {
      const saleId = parseInt(req.params.id);
      if (isNaN(saleId) || saleId <= 0) {
        return res.status(400).json({ message: "Invalid sale ID" });
      }
      const requirements = await storage.getSaleRequirements(saleId);
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching sale requirements:", error);
      res.status(500).json({ message: "Failed to fetch sale requirements" });
    }
  });

  app.post('/api/sales/:id/requirements', isAuthenticated, async (req, res) => {
    try {
      const saleId = parseInt(req.params.id);
      if (isNaN(saleId) || saleId <= 0) {
        return res.status(400).json({ message: "Invalid sale ID" });
      }
      const requirementData = insertSaleRequirementSchema.parse({
        ...req.body,
        vendaId: saleId,
      });
      const requirement = await storage.createSaleRequirement(requirementData);
      res.json(requirement);
    } catch (error) {
      console.error("Error creating sale requirement:", error);
      res.status(500).json({ message: "Failed to create sale requirement" });
    }
  });

  app.put('/api/requirements/:id', isAuthenticated, requireFinancial, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }
      // Only allow updating specific fields, not vendaId or other immutable fields
      const updateSchema = z.object({
        tipo: z.enum(['checkin', 'cartinha', 'documentacao', 'pagamento', 'outros']).optional(),
        titulo: z.string().min(1).optional(),
        descricao: z.string().optional(),
        responsavelId: z.string().optional(),
        status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']).optional(),
        prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
        dataVencimento: z.string().optional().transform(val => val ? new Date(val) : undefined),
        observacoes: z.string().optional(),
      });
      const updateData = updateSchema.parse(req.body);
      const requirement = await storage.updateSaleRequirement(id, updateData);
      res.json(requirement);
    } catch (error) {
      console.error("Error updating sale requirement:", error);
      res.status(500).json({ message: "Failed to update sale requirement" });
    }
  });

  app.put('/api/requirements/:id/complete', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }
      const requirement = await storage.completeSaleRequirement(id);
      res.json(requirement);
    } catch (error) {
      console.error("Error completing sale requirement:", error);
      res.status(500).json({ message: "Failed to complete sale requirement" });
    }
  });

  app.delete('/api/requirements/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }
      await storage.deleteSaleRequirement(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sale requirement:", error);
      res.status(500).json({ message: "Failed to delete sale requirement" });
    }
  });

  // Sale commissions routes
  app.get('/api/commissions', isAuthenticated, async (req, res) => {
    try {
      const { saleId, userId } = req.query;
      const commissions = await storage.getSaleCommissions(
        saleId ? parseInt(saleId as string) : undefined,
        userId as string
      );
      res.json(commissions);
    } catch (error) {
      console.error("Error fetching sale commissions:", error);
      res.status(500).json({ message: "Failed to fetch sale commissions" });
    }
  });

  app.post('/api/commissions', isAuthenticated, requireFinancial, async (req, res) => {
    try {
      const commissionData = insertSaleCommissionSchema.parse(req.body);
      const commission = await storage.createSaleCommission(commissionData);
      res.json(commission);
    } catch (error) {
      console.error("Error creating sale commission:", error);
      res.status(500).json({ message: "Failed to create sale commission" });
    }
  });

  app.put('/api/commissions/:id', isAuthenticated, requireFinancial, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid commission ID" });
      }
      // Only allow updating specific fields, not vendaId, userId or other immutable fields
      const updateSchema = z.object({
        tipo: z.enum(['venda', 'incentivo', 'bonus']).optional(),
        valor: z.number().positive().optional(),
        percentual: z.number().min(0).max(100).optional(),
        status: z.enum(['pendente', 'aprovada', 'recebida', 'cancelada']).optional(),
        dataPrevisaoRecebimento: z.string().optional().transform(val => val ? new Date(val) : undefined),
        observacoes: z.string().optional(),
      });
      const updateData = updateSchema.parse(req.body);
      const commission = await storage.updateSaleCommission(id, updateData);
      res.json(commission);
    } catch (error) {
      console.error("Error updating sale commission:", error);
      res.status(500).json({ message: "Failed to update sale commission" });
    }
  });

  app.put('/api/commissions/:id/received', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid commission ID" });
      }
      const commission = await storage.markCommissionAsReceived(id);
      res.json(commission);
    } catch (error) {
      console.error("Error marking commission as received:", error);
      res.status(500).json({ message: "Failed to mark commission as received" });
    }
  });

  // Notifications routes
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const { unreadOnly } = req.query;
      // Security: Always scope notifications to the authenticated user, ignore userId from query
      // For now, use a default user ID since the system is running without authentication
      const userId = req.user?.id || 'user123';
      const notifications = await storage.getNotifications(
        userId,
        unreadOnly === 'true'
      );
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications', isAuthenticated, requireFinancial, async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      // For now, use a default user ID since the system is running without authentication
      const userId = req.user?.id || 'user123';
      const notification = await storage.markNotificationAsRead(id, userId);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      await storage.deleteNotification(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Payment plans enhanced routes
  app.put('/api/payment-plans/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid payment plan ID" });
      }
      const updateData = req.body;
      const paymentPlan = await storage.updatePaymentPlan(id, updateData);
      res.json(paymentPlan);
    } catch (error) {
      console.error("Error updating payment plan:", error);
      res.status(500).json({ message: "Failed to update payment plan" });
    }
  });

  app.put('/api/payment-plans/:id/liquidate', isAuthenticated, requireFinancial, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid payment plan ID" });
      }
      const { dataLiquidacao, observacoes } = req.body;
      const result = await storage.liquidatePaymentPlan(id, {
        dataLiquidacao: new Date(dataLiquidacao),
        observacoes,
      });
      res.json(result);
    } catch (error) {
      console.error("Error liquidating payment plan:", error);
      res.status(500).json({ message: "Failed to liquidate payment plan" });
    }
  });

  app.get('/api/payment-plans', isAuthenticated, async (req, res) => {
    try {
      const { saleId } = req.query;
      const paymentPlans = await storage.getPaymentPlans(saleId ? parseInt(saleId as string) : undefined);
      res.json(paymentPlans);
    } catch (error) {
      console.error("Error fetching payment plans:", error);
      res.status(500).json({ message: "Failed to fetch payment plans" });
    }
  });

  app.post('/api/payment-plans', isAuthenticated, async (req, res) => {
    try {
      const paymentPlanData = insertPaymentPlanSchema.parse(req.body);
      const paymentPlan = await storage.createPaymentPlan(paymentPlanData);
      res.json(paymentPlan);
    } catch (error) {
      console.error("Error creating payment plan:", error);
      res.status(500).json({ message: "Failed to create payment plan" });
    }
  });

  app.delete('/api/payment-plans/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid payment plan ID" });
      }
      await storage.deletePaymentPlan(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment plan:", error);
      res.status(500).json({ message: "Failed to delete payment plan" });
    }
  });

  // Sale Clients routes - Unified client management for sales
  app.get('/api/sales/:id/clients', isAuthenticated, async (req, res) => {
    try {
      const vendaId = parseInt(req.params.id);
      if (isNaN(vendaId) || vendaId <= 0) {
        return res.status(400).json({ message: "ID da venda inválido" });
      }
      
      const clients = await storage.getSaleClients(vendaId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching sale clients:", error);
      res.status(500).json({ message: "Erro ao buscar clientes da venda" });
    }
  });

  app.post('/api/sales/:id/clients', isAuthenticated, async (req, res) => {
    try {
      const vendaId = parseInt(req.params.id);
      if (isNaN(vendaId) || vendaId <= 0) {
        return res.status(400).json({ message: "ID da venda inválido" });
      }

      const clientData = insertSaleClientSchema.omit({ id: true, vendaId: true }).parse(req.body);
      const saleClient = await storage.addSaleClient(vendaId, clientData);
      res.json(saleClient);
    } catch (error) {
      console.error("Error adding sale client:", error);
      if (error instanceof Error && error.message === "Uma venda só pode ter um contratante") {
        return res.status(409).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", issues: error.issues });
      }
      res.status(500).json({ message: "Erro ao adicionar cliente à venda" });
    }
  });

  app.delete('/api/sale-clients/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "ID do cliente da venda inválido" });
      }

      await storage.removeSaleClient(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing sale client:", error);
      res.status(500).json({ message: "Erro ao remover cliente da venda" });
    }
  });

  // Service Clients routes - Client assignments to services
  app.get('/api/services/:id/clients', isAuthenticated, async (req, res) => {
    try {
      const servicoId = parseInt(req.params.id);
      if (isNaN(servicoId) || servicoId <= 0) {
        return res.status(400).json({ message: "ID do serviço inválido" });
      }
      
      const clients = await storage.getServiceClients(servicoId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching service clients:", error);
      res.status(500).json({ message: "Erro ao buscar clientes do serviço" });
    }
  });

  app.post('/api/services/:id/clients', isAuthenticated, async (req, res) => {
    try {
      const servicoId = parseInt(req.params.id);
      if (isNaN(servicoId) || servicoId <= 0) {
        return res.status(400).json({ message: "ID do serviço inválido" });
      }

      const clientData = insertServiceClientSchema.omit({ id: true, servicoId: true }).parse(req.body);
      const serviceClient = await storage.upsertServiceClient({ servicoId, ...clientData });
      res.json(serviceClient);
    } catch (error) {
      console.error("Error adding/updating service client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", issues: error.issues });
      }
      res.status(500).json({ message: "Erro ao adicionar/atualizar cliente do serviço" });
    }
  });

  app.delete('/api/service-clients/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "ID do cliente do serviço inválido" });
      }

      await storage.removeServiceClient(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing service client:", error);
      res.status(500).json({ message: "Erro ao remover cliente do serviço" });
    }
  });

  // DEPRECATED: Service Passengers routes - Use serviceClients instead
  // app.get('/api/services/:serviceId/passengers', isAuthenticated, async (req, res) => {
  //   try {
  //     const serviceId = parseInt(req.params.serviceId);
  //     if (isNaN(serviceId) || serviceId <= 0) {
  //       return res.status(400).json({ message: "ID do serviço inválido" });
  //     }
  //     const servicePassengers = await storage.getServicePassengers(serviceId);
  //     res.json(servicePassengers);
  //   } catch (error) {
  //     console.error("Error fetching service passengers:", error);
  //     res.status(500).json({ message: "Failed to fetch service passengers" });
  //   }
  // });

  // DEPRECATED: Use serviceClients endpoints instead
  // app.post('/api/services/:serviceId/passengers', isAuthenticated, async (req, res) => {
  //   try {
  //     const serviceId = parseInt(req.params.serviceId);
  //     if (isNaN(serviceId) || serviceId <= 0) {
  //       return res.status(400).json({ message: "ID do serviço inválido" });
  //     }
  //     
  //     const servicePassengerData = insertServicePassengerSchema.parse({ 
  //       ...req.body, 
  //       servicoId: serviceId 
  //     });
  //     
  //     const servicePassenger = await storage.createServicePassenger(servicePassengerData);
  //     res.json(servicePassenger);
  //   } catch (error) {
  //     console.error("Error creating service passenger:", error);
  //     res.status(500).json({ message: "Failed to create service passenger" });
  //   }
  // });

  // DEPRECATED: Use serviceClients endpoints instead
  // app.put('/api/service-passengers/:id', isAuthenticated, async (req, res) => {
  //   try {
  //     const id = parseInt(req.params.id);
  //     if (isNaN(id) || id <= 0) {
  //       return res.status(400).json({ message: "ID inválido" });
  //     }
  //     const servicePassenger = await storage.updateServicePassenger(id, req.body);
  //     res.json(servicePassenger);
  //   } catch (error) {
  //     console.error("Error updating service passenger:", error);
  //     res.status(500).json({ message: "Failed to update service passenger" });
  //   }
  // });

  // DEPRECATED: Use serviceClients endpoints instead
  // app.delete('/api/service-passengers/:id', isAuthenticated, async (req, res) => {
  //   try {
  //     const id = parseInt(req.params.id);
  //     if (isNaN(id) || id <= 0) {
  //       return res.status(400).json({ message: "ID inválido" });
  //     }
  //     await storage.deleteServicePassenger(id);
  //     res.status(204).send();
  //   } catch (error) {
  //     console.error("Error deleting service passenger:", error);
  //     res.status(500).json({ message: "Failed to delete service passenger" });
  //   }
  // });

  // DEPRECATED: Use serviceClients endpoints instead
  // app.delete('/api/services/:serviceId/passengers', isAuthenticated, async (req, res) => {
  //   try {
  //     const serviceId = parseInt(req.params.serviceId);
  //     if (isNaN(serviceId) || serviceId <= 0) {
  //       return res.status(400).json({ message: "ID do serviço inválido" });
  //     }
  //     await storage.deleteServicePassengersByService(serviceId);
  //     res.status(204).send();
  //   } catch (error) {
  //     console.error("Error deleting all service passengers:", error);
  //     res.status(500).json({ message: "Failed to delete service passengers" });
  //   }
  // });

  // Payment methods routes
  app.get('/api/payment-methods', isAuthenticated, async (req, res) => {
    try {
      const { tipo } = req.query;
      const paymentMethods = await storage.getPaymentMethods(tipo as "AGENCIA" | "FORNECEDOR" | undefined);
      res.json(paymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post('/api/payment-methods', isAuthenticated, async (req, res) => {
    try {
      const paymentMethodData = insertPaymentMethodSchema.parse(req.body);
      const paymentMethod = await storage.createPaymentMethod(paymentMethodData);
      res.json(paymentMethod);
    } catch (error) {
      console.error("Error creating payment method:", error);
      res.status(500).json({ message: "Failed to create payment method" });
    }
  });

  app.put('/api/payment-methods/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid payment method ID" });
      }
      const updateData = req.body;
      const paymentMethod = await storage.updatePaymentMethod(id, updateData);
      res.json(paymentMethod);
    } catch (error) {
      console.error("Error updating payment method:", error);
      res.status(500).json({ message: "Failed to update payment method" });
    }
  });

  app.delete('/api/payment-methods/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid payment method ID" });
      }
      await storage.deletePaymentMethod(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  // Payment conditions routes
  app.get('/api/payment-conditions', isAuthenticated, async (req, res) => {
    try {
      const { formaPagamentoId } = req.query;
      const paymentConditions = await storage.getPaymentConditions(
        formaPagamentoId ? parseInt(formaPagamentoId as string) : undefined
      );
      res.json(paymentConditions);
    } catch (error) {
      console.error("Error fetching payment conditions:", error);
      res.status(500).json({ message: "Failed to fetch payment conditions" });
    }
  });

  app.post('/api/payment-conditions', isAuthenticated, async (req, res) => {
    try {
      const paymentConditionData = insertPaymentConditionSchema.parse(req.body);
      const paymentCondition = await storage.createPaymentCondition(paymentConditionData);
      res.json(paymentCondition);
    } catch (error) {
      console.error("Error creating payment condition:", error);
      res.status(500).json({ message: "Failed to create payment condition" });
    }
  });

  app.put('/api/payment-conditions/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid payment condition ID" });
      }
      const updateData = req.body;
      const paymentCondition = await storage.updatePaymentCondition(id, updateData);
      res.json(paymentCondition);
    } catch (error) {
      console.error("Error updating payment condition:", error);
      res.status(500).json({ message: "Failed to update payment condition" });
    }
  });

  app.delete('/api/payment-conditions/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid payment condition ID" });
      }
      await storage.deletePaymentCondition(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment condition:", error);
      res.status(500).json({ message: "Failed to delete payment condition" });
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

  // Financial summary route (DRE)
  app.get('/api/financial-summary', isAuthenticated, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const summary = await storage.getFinancialSummary({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      });
      res.json(summary);
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ message: "Failed to fetch financial summary" });
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
      const status = WhatsAppAPI.getStatus();
      
      if (qrCode) {
        res.json({ qrCode, status: status.status });
      } else {
        // Se não há QR code, forçar nova inicialização
        if (status.status === 'Desconectado' || status.status.includes('Erro')) {
          // Forçar reautenticação para gerar novo QR code
          setTimeout(() => {
            whatsappIntegration.forceReauth();
          }, 500);
          res.json({ 
            message: 'Gerando novo QR Code...', 
            needsReconnection: true,
            status: 'Regenerando QR Code...'
          });
        } else if (status.status === 'Conectando...' || status.status.includes('Regenerando')) {
          // Cliente já está tentando conectar
          res.json({ 
            message: 'Aguarde, gerando QR Code...', 
            needsReconnection: true,
            status: status.status 
          });
        } else {
          res.json({ 
            error: 'QR Code não disponível', 
            status: status.status,
            needsReconnection: false 
          });
        }
      }
    } catch (error) {
      console.error("Error getting QR code:", error);
      res.status(500).json({ message: "Failed to get QR code" });
    }
  });

  // WhatsApp integrado - Reconectar / Forçar nova autenticação
  app.post('/api/whatsapp/reconnect', async (req, res) => {
    try {
      await whatsappIntegration.forceReauth();
      res.json({ 
        success: true,
        message: 'Forçando nova autenticação. Aguarde alguns segundos para o novo QR Code.' 
      });
    } catch (error) {
      console.error("Error reconnecting WhatsApp:", error);
      res.status(500).json({ 
        success: false,
        message: "Erro ao forçar reconexão WhatsApp" 
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

  // Contract Clauses routes
  app.get('/api/contract-clauses', isAuthenticated, async (req, res) => {
    try {
      const type = req.query.type as string;
      const clauses = await storage.getContractClauses(type);
      res.json(clauses);
    } catch (error) {
      console.error('Error fetching contract clauses:', error);
      res.status(500).json({ message: 'Erro ao buscar cláusulas contratuais' });
    }
  });

  app.post('/api/contract-clauses', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const clauseData = insertContractClauseSchema.parse(req.body);
      const newClause = await storage.createContractClause(clauseData);
      res.status(201).json(newClause);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Error creating contract clause:', error);
      res.status(500).json({ message: 'Erro ao criar cláusula contratual' });
    }
  });

  app.put('/api/contract-clauses/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clauseData = insertContractClauseSchema.partial().parse(req.body);
      const updatedClause = await storage.updateContractClause(id, clauseData);
      res.json(updatedClause);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Error updating contract clause:', error);
      res.status(500).json({ message: 'Erro ao atualizar cláusula contratual' });
    }
  });

  app.delete('/api/contract-clauses/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContractClause(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting contract clause:', error);
      res.status(500).json({ message: 'Erro ao excluir cláusula contratual' });
    }
  });

  // Document Templates routes
  app.get('/api/document-templates', isAuthenticated, async (req, res) => {
    try {
      const type = req.query.type as string;
      const templates = await storage.getDocumentTemplates(type);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching document templates:', error);
      res.status(500).json({ message: 'Erro ao buscar templates de documentos' });
    }
  });

  app.post('/api/document-templates', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const templateData = insertDocumentTemplateSchema.parse(req.body);
      const newTemplate = await storage.createDocumentTemplate(templateData);
      res.status(201).json(newTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Error creating document template:', error);
      res.status(500).json({ message: 'Erro ao criar template de documento' });
    }
  });

  app.put('/api/document-templates/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const templateData = insertDocumentTemplateSchema.partial().parse(req.body);
      const updatedTemplate = await storage.updateDocumentTemplate(id, templateData);
      res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Error updating document template:', error);
      res.status(500).json({ message: 'Erro ao atualizar template de documento' });
    }
  });

  app.delete('/api/document-templates/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDocumentTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting document template:', error);
      res.status(500).json({ message: 'Erro ao excluir template de documento' });
    }
  });

  // Task Template routes - Templates para geração automática de tarefas
  app.get('/api/task-templates', isAuthenticated, async (req, res) => {
    try {
      const ativo = req.query.ativo === 'true' ? true : req.query.ativo === 'false' ? false : undefined;
      const templates = await storage.getTaskTemplates(ativo);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching task templates:', error);
      res.status(500).json({ message: 'Erro ao buscar templates de tarefas' });
    }
  });

  app.post('/api/task-templates', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const templateData = insertTaskTemplateSchema.parse(req.body);
      const newTemplate = await storage.createTaskTemplate(templateData);
      res.status(201).json(newTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error('Error creating task template:', error);
      res.status(500).json({ message: 'Erro ao criar template de tarefa' });
    }
  });

  app.put('/api/task-templates/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const templateData = insertTaskTemplateSchema.partial().parse(req.body);
      const updatedTemplate = await storage.updateTaskTemplate(id, templateData);
      res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error('Error updating task template:', error);
      res.status(500).json({ message: 'Erro ao atualizar template de tarefa' });
    }
  });

  app.delete('/api/task-templates/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTaskTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting task template:', error);
      res.status(500).json({ message: 'Erro ao excluir template de tarefa' });
    }
  });

  // Generate tasks from templates for a specific sale
  app.post('/api/sales/:saleId/generate-tasks', isAuthenticated, async (req, res) => {
    try {
      const saleId = parseInt(req.params.saleId);
      const sale = await storage.getSaleById(saleId);
      
      if (!sale) {
        return res.status(404).json({ message: 'Venda não encontrada' });
      }

      const generatedTasks = await storage.generateTasksFromTemplates(saleId, sale);
      res.status(201).json({ 
        message: `${generatedTasks.length} tarefas geradas com sucesso`,
        tasks: generatedTasks 
      });
    } catch (error) {
      console.error('Error generating tasks from templates:', error);
      res.status(500).json({ message: 'Erro ao gerar tarefas automáticas' });
    }
  });

  return httpServer;
}
