// =====================================================================
// MÓDULO WHATSAPP INTEGRADO - ERP MONDIAL TURISMO
// Servidor WhatsApp rodando dentro do mesmo processo do ERP
// =====================================================================

import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from './storage';

// =====================================================================
// 🔧 CONFIGURAÇÕES
// =====================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório para armazenar dados da sessão do WhatsApp
const SESSION_DIR = path.join(__dirname, '..', '.wwebjs_auth');

// Configurações do webhook ERP
const ERP_WEBHOOK_TOKEN = process.env.ERP_WEBHOOK_TOKEN || 'mundial-webhook-token-2025';

console.log('🔗 Configurações WhatsApp integrado:');
console.log('📁 Diretório da sessão:', SESSION_DIR);
console.log('🔑 Token configurado:', ERP_WEBHOOK_TOKEN ? 'Sim' : 'Não');

// =====================================================================
// 📱 ESTADO DO CLIENTE WHATSAPP
// =====================================================================
export interface WhatsAppStatus {
  status: string;
  qrCode?: string;
  uptime: string;
  ready: boolean;
  connectionCount: number;
  lastActivity?: string;
}

class WhatsAppIntegration {
  private client: Client | null = null;
  private qrCodeDataUrl: string = '';
  private clientStatus: string = 'Iniciando...';
  private clientStartTime: number = Date.now();
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private connectionCount: number = 0;
  private lastActivity?: Date;

  constructor() {
    this.initializeClient();
  }

  // =====================================================================
  // 🚀 INICIALIZAÇÃO DO CLIENTE
  // =====================================================================
  private async initializeClient() {
    try {
      console.log('🚀 Inicializando cliente WhatsApp integrado...');
      
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: SESSION_DIR
        }),
        puppeteer: {
          headless: true,
          timeout: 120000,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--memory-pressure-off'
          ],
        }
      });

      this.setupEventListeners();
      await this.client.initialize();
      
    } catch (error) {
      console.error('❌ ERRO ao inicializar cliente WhatsApp:', error);
      this.clientStatus = `Erro: ${(error as Error).message}`;
      
      // Tentar reconectar após delay
      setTimeout(() => this.handleReconnect(), 30000);
    }
  }

  // =====================================================================
  // 📡 EVENTOS DO CLIENTE
  // =====================================================================
  private setupEventListeners() {
    if (!this.client) return;

    // QR Code gerado
    this.client.on('qr', async (qr) => {
      try {
        console.log('📱 QR Code recebido...');
        this.qrCodeDataUrl = await qrcode.toDataURL(qr);
        this.clientStatus = 'Aguardando escaneamento do QR Code';
        console.log('✅ QR Code gerado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao gerar QR Code:', error);
      }
    });

    // Cliente pronto
    this.client.on('ready', () => {
      console.log('✅ Cliente WhatsApp integrado está pronto e conectado!');
      this.qrCodeDataUrl = '';
      this.clientStatus = 'Conectado';
      this.clientStartTime = Date.now();
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.connectionCount++;
      this.lastActivity = new Date();
    });

    // Falha de autenticação
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Falha de autenticação WhatsApp:', msg);
      this.clientStatus = 'Falha de autenticação';
      
      // Limpar dados da sessão e tentar reconectar
      setTimeout(() => this.handleReconnect(), 10000);
    });

    // Cliente desconectado
    this.client.on('disconnected', (reason) => {
      console.warn('⚠️ WhatsApp desconectado:', reason);
      this.clientStatus = `Desconectado: ${reason}`;
      this.qrCodeDataUrl = '';
      
      // Tentar reconectar automaticamente
      if (!this.isReconnecting) {
        setTimeout(() => this.handleReconnect(), 5000);
      }
    });

    // Mensagem recebida
    this.client.on('message', async (message) => {
      await this.handleIncomingMessage(message);
    });

    // Logs de loading
    this.client.on('loading_screen', (percent) => {
      console.log(`📱 Carregando WhatsApp: ${percent}%`);
      this.clientStatus = `Carregando: ${percent}%`;
    });
  }

  // =====================================================================
  // 🔄 RECONEXÃO AUTOMÁTICA
  // =====================================================================
  private async handleReconnect() {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.error('💥 Máximo de tentativas de reconexão atingido');
      this.clientStatus = 'Falha na reconexão - Intervenção manual necessária';
      this.isReconnecting = false;
      return;
    }

    console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    this.clientStatus = `Reconectando (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`;

    try {
      // Destruir cliente atual se existir
      if (this.client) {
        await this.client.destroy();
        this.client = null;
      }

      // Aguardar um pouco antes de reconectar
      await new Promise(resolve => setTimeout(resolve, 5000 * this.reconnectAttempts));

      // Reinicializar cliente
      await this.initializeClient();

    } catch (error) {
      console.error('❌ Erro na reconexão:', error);
      this.clientStatus = `Erro na reconexão: ${(error as Error).message}`;
      
      // Tentar novamente após delay maior
      setTimeout(() => this.handleReconnect(), 15000 * this.reconnectAttempts);
    }
  }

  // =====================================================================
  // 📨 PROCESSAMENTO DE MENSAGENS
  // =====================================================================
  private async handleIncomingMessage(message: any) {
    try {
      console.log(`[WHATSAPP] 📩 Nova mensagem de: ${message.from}`);
      this.lastActivity = new Date();

      const sanitizedFrom = message.from.split('@')[0];
      
      // Salvar conversa no banco de dados
      await this.saveConversation(message);

      console.log(`[WHATSAPP] ✅ Mensagem de ${sanitizedFrom} processada com sucesso`);

    } catch (error) {
      console.error('[WHATSAPP] ❌ Erro ao processar mensagem:', error);
    }
  }

  // =====================================================================
  // 💾 SALVAR CONVERSA NO BANCO
  // =====================================================================
  private async saveConversation(message: any) {
    try {
      const phone = message.from;
      const sanitizedPhone = phone.split('@')[0];
      const contactName = message._data.notifyName || `Usuário ${sanitizedPhone}`;

      // Obter ou criar conversa
      const conversation = await storage.getOrCreateConversation(phone, contactName);

      // Salvar mensagem
      await storage.createMessage({
        conversationId: conversation.id,
        messageId: message.id.id,
        type: message.hasMedia ? 'media' : 'text',
        content: message.body,
        fromMe: false,
        timestamp: new Date(message.timestamp * 1000)
      });

      console.log(`[DATABASE] ✅ Conversa e mensagem salvas - ID: ${conversation.id}`);

    } catch (error) {
      console.error('[DATABASE] ❌ Erro ao salvar no banco:', error);
    }
  }

  // =====================================================================
  // 🌐 MÉTODOS PÚBLICOS PARA API
  // =====================================================================
  public getStatus(): WhatsAppStatus {
    const uptime = Math.round((Date.now() - this.clientStartTime) / 1000);
    const isReady = this.client?.info?.wid ? true : false;

    return {
      status: this.clientStatus,
      qrCode: this.qrCodeDataUrl || undefined,
      uptime: `${uptime}s`,
      ready: isReady,
      connectionCount: this.connectionCount,
      lastActivity: this.lastActivity?.toISOString()
    };
  }

  public getQRCode(): string | null {
    return this.qrCodeDataUrl || null;
  }

  public async sendMessage(phone: string, message: string): Promise<boolean> {
    try {
      if (!this.client || this.clientStatus !== 'Conectado') {
        throw new Error('Cliente WhatsApp não está conectado');
      }

      // Formatar número de telefone
      const formattedPhone = phone.includes('@') ? phone : `${phone}@c.us`;
      
      await this.client.sendMessage(formattedPhone, message);
      this.lastActivity = new Date();
      
      console.log(`[ENVIO] ✅ Mensagem enviada para ${phone}`);
      return true;

    } catch (error) {
      console.error('[ENVIO] ❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  public async isReady(): Promise<boolean> {
    return this.client?.info?.wid ? true : false;
  }
}

// =====================================================================
// 🏭 SINGLETON - INSTÂNCIA ÚNICA
// =====================================================================
export const whatsappIntegration = new WhatsAppIntegration();

// =====================================================================
// 📤 FUNÇÕES AUXILIARES
// =====================================================================
export const WhatsAppAPI = {
  getStatus: () => whatsappIntegration.getStatus(),
  getQRCode: () => whatsappIntegration.getQRCode(),
  sendMessage: (phone: string, message: string) => whatsappIntegration.sendMessage(phone, message),
  isReady: () => whatsappIntegration.isReady()
};