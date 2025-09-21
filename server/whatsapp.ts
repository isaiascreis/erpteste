// =====================================================================
// MÓDULO WHATSAPP INTEGRADO - ERP MONDIAL TURISMO
// Servidor WhatsApp rodando dentro do mesmo processo do ERP
// Usando Baileys (compatível com Replit - sem Puppeteer)
// =====================================================================

import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  WAMessageKey,
  Browsers,
  proto
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from './storage';

// =====================================================================
// 🔧 CONFIGURAÇÕES
// =====================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório para armazenar dados da sessão do WhatsApp
const SESSION_DIR = path.join(__dirname, '..', '.baileys_auth');

// Garantir que o diretório de sessão existe
if (!existsSync(SESSION_DIR)) {
  mkdirSync(SESSION_DIR, { recursive: true });
}

// Configurações do webhook ERP
const ERP_WEBHOOK_TOKEN = process.env.ERP_WEBHOOK_TOKEN || 'mundial-webhook-token-2025';

console.log('🔗 Configurações WhatsApp Baileys integrado:');
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
  private sock: any = null;
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
  // 🚀 INICIALIZAÇÃO DO CLIENTE BAILEYS
  // =====================================================================
  private async initializeClient() {
    try {
      console.log('🚀 Inicializando cliente Baileys WhatsApp integrado...');
      
      // Configurar autenticação multi-file
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

      // Criar socket Baileys
      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true
      });

      this.setupEventListeners(saveCreds);
      
    } catch (error) {
      console.error('❌ ERRO ao inicializar cliente Baileys:', error);
      this.clientStatus = `Erro: ${(error as Error).message}`;
      
      // Tentar reconectar após delay
      setTimeout(() => this.handleReconnect(), 30000);
    }
  }

  // =====================================================================
  // 📡 EVENTOS DO CLIENTE BAILEYS
  // =====================================================================
  private setupEventListeners(saveCreds: () => Promise<void>) {
    if (!this.sock) return;

    // Atualização de conexão
    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      // QR Code gerado
      if (qr) {
        try {
          console.log('📱 QR Code recebido do Baileys...');
          this.qrCodeDataUrl = await qrcode.toDataURL(qr);
          this.clientStatus = 'Aguardando escaneamento do QR Code';
          console.log('✅ QR Code gerado com sucesso via Baileys');
        } catch (error) {
          console.error('❌ Erro ao gerar QR Code:', error);
        }
      }

      // Status da conexão
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        const errorMessage = lastDisconnect?.error?.message || '';
        
        // Detectar conflito de sessão (verifica tanto erro message quanto trace)
        const lastError = lastDisconnect?.error;
        const isConflict = errorMessage.includes('conflict') || 
                          errorMessage.includes('replaced') || 
                          lastError?.toString().includes('conflict') ||
                          (lastError && JSON.stringify(lastError).includes('conflict'));
        
        if (isConflict) {
          console.warn('⚠️ CONFLITO DE SESSÃO detectado! Outra instância WhatsApp está ativa.');
          this.clientStatus = 'CONFLITO: Feche WhatsApp Web/Mobile em outros dispositivos';
          this.qrCodeDataUrl = '';
          
          // Para as tentativas de reconexão após 2 conflitos
          if (this.reconnectAttempts >= 2) {
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
            this.clientStatus = 'Conflito persistente - Feche outras sessões WhatsApp e recarregue a página';
            console.error('🔴 PARANDO reconexões devido a conflitos persistentes');
            return;
          }
        }
        
        console.warn('⚠️ Conexão fechada. Reconectar?', shouldReconnect);
        if (!errorMessage.includes('conflict')) {
          this.clientStatus = 'Desconectado';
        }
        this.qrCodeDataUrl = '';

        if (shouldReconnect && !this.isReconnecting) {
          // Delay maior para conflitos
          const delay = errorMessage.includes('conflict') ? 30000 : 5000;
          setTimeout(() => this.handleReconnect(), delay);
        }
      } else if (connection === 'open') {
        console.log('✅ Cliente Baileys WhatsApp está pronto e conectado!');
        this.qrCodeDataUrl = '';
        this.clientStatus = 'Conectado';
        this.clientStartTime = Date.now();
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.connectionCount++;
        this.lastActivity = new Date();
      } else if (connection === 'connecting') {
        this.clientStatus = 'Conectando...';
        console.log('🔄 Baileys conectando...');
      }
    });

    // Salvar credenciais quando atualizadas
    this.sock.ev.on('creds.update', saveCreds);

    // Mensagens recebidas
    this.sock.ev.on('messages.upsert', async (m: any) => {
      const messages = m.messages;
      for (const message of messages) {
        if (!message.key.fromMe && message.message) {
          await this.handleIncomingMessage(message);
        }
      }
    });
  }

  // =====================================================================
  // 🔄 RECONEXÃO AUTOMÁTICA COM TRATAMENTO DE CONFLITOS
  // =====================================================================
  private async handleReconnect() {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.error('💥 Máximo de tentativas de reconexão atingido');
      this.clientStatus = 'Conflito de sessão - Feche outras conexões WhatsApp e escaneie novamente';
      this.isReconnecting = false;
      this.qrCodeDataUrl = ''; // Limpar QR code para forçar nova autenticação
      return;
    }

    console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    this.clientStatus = `Reconectando (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`;

    try {
      // Destruir socket atual se existir
      if (this.sock) {
        this.sock.end();
        this.sock = null;
      }

      // Delay exponencial mais agressivo para conflitos de sessão
      const delay = Math.min(30000, 10000 * Math.pow(2, this.reconnectAttempts - 1));
      console.log(`⏱️ Aguardando ${delay/1000}s antes de reconectar...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));

      // Reinicializar cliente
      await this.initializeClient();

    } catch (error) {
      console.error('❌ Erro na reconexão:', error);
      this.clientStatus = `Erro na reconexão: ${(error as Error).message}`;
      
      // Tentar novamente após delay ainda maior
      setTimeout(() => this.handleReconnect(), 30000 * this.reconnectAttempts);
    }
  }

  // =====================================================================
  // 📨 PROCESSAMENTO DE MENSAGENS
  // =====================================================================
  private async handleIncomingMessage(message: any) {
    try {
      const from = message.key.remoteJid;
      const messageContent = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text || '';
      
      console.log(`[BAILEYS] 📩 Nova mensagem de: ${from}`);
      this.lastActivity = new Date();

      // Salvar conversa no banco de dados
      const savedMessage = await this.saveConversation(message);

      // 🔄 INTEGRAÇÃO WEBSOCKET - Notificar atendentes conectados
      if (savedMessage && WhatsAppAPI.onMessageReceived) {
        try {
          WhatsAppAPI.onMessageReceived(savedMessage.conversationId, {
            id: savedMessage.id,
            messageId: savedMessage.messageId,
            content: savedMessage.content,
            type: savedMessage.type,
            fromMe: savedMessage.fromMe,
            timestamp: savedMessage.timestamp,
            phone: from
          });
          console.log(`[WEBSOCKET] 📡 Mensagem distribuída para atendentes: ${from}`);
        } catch (wsError) {
          console.error('[WEBSOCKET] ❌ Erro ao distribuir mensagem:', wsError);
        }
      }

      console.log(`[BAILEYS] ✅ Mensagem de ${from} processada com sucesso`);

    } catch (error) {
      console.error('[BAILEYS] ❌ Erro ao processar mensagem:', error);
    }
  }

  // =====================================================================
  // 💾 SALVAR CONVERSA NO BANCO
  // =====================================================================
  private async saveConversation(message: any) {
    try {
      const phone = message.key.remoteJid;
      const sanitizedPhone = phone?.split('@')[0] || 'unknown';
      const contactName = message.pushName || `Usuário ${sanitizedPhone}`;
      const messageContent = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text || '';

      if (!phone) return null;

      // Obter ou criar conversa
      const conversation = await storage.getOrCreateConversation(phone, contactName);

      // Salvar mensagem
      const savedMessage = await storage.createMessage({
        conversationId: conversation.id,
        messageId: message.key.id || '',
        type: message.message?.imageMessage || message.message?.videoMessage ? 'media' : 'text',
        content: messageContent,
        fromMe: false,
        timestamp: new Date()
      });

      console.log(`[DATABASE] ✅ Conversa e mensagem salvas - ID: ${conversation.id}`);
      
      return {
        ...savedMessage,
        conversationId: conversation.id
      };

    } catch (error) {
      console.error('[DATABASE] ❌ Erro ao salvar no banco:', error);
      return null;
    }
  }

  // =====================================================================
  // 🌐 MÉTODOS PÚBLICOS PARA API
  // =====================================================================
  public getStatus(): WhatsAppStatus {
    const uptime = Math.round((Date.now() - this.clientStartTime) / 1000);
    const isReady = this.clientStatus === 'Conectado';

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
      // Permitir envio se socket existe, mesmo durante conflitos temporários
      if (!this.sock) {
        throw new Error('Cliente WhatsApp não está conectado - socket não disponível');
      }
      
      // Verificar se está completamente desconectado
      if (this.clientStatus === 'Desconectado' || this.clientStatus.includes('Reconectando')) {
        throw new Error('Cliente WhatsApp não está conectado - ' + this.clientStatus);
      }

      // Normalizar e formatar número de telefone para Baileys
      let normalizedPhone = phone;
      
      // Remover formatos antigos ou inconsistentes
      if (phone.includes('@c.us')) {
        normalizedPhone = phone.replace('@c.us', '');
      } else if (phone.includes('@s.whatsapp.net')) {
        normalizedPhone = phone.replace('@s.whatsapp.net', '');
      }
      
      // Remover caracteres não numéricos exceto +
      normalizedPhone = normalizedPhone.replace(/[^\d+]/g, '');
      
      // Formatar para o padrão correto do Baileys
      const formattedPhone = `${normalizedPhone}@s.whatsapp.net`;
      
      await this.sock.sendMessage(formattedPhone, { text: message });
      this.lastActivity = new Date();
      
      console.log(`[BAILEYS ENVIO] ✅ Mensagem enviada para ${formattedPhone} (original: ${phone})`);
      return true;

    } catch (error) {
      console.error('[BAILEYS ENVIO] ❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  public async isReady(): Promise<boolean> {
    return this.sock && this.clientStatus === 'Conectado';
  }

  // Função para limpar sessão em caso de conflitos persistentes
  public async clearSession(): Promise<void> {
    try {
      console.log('🧹 Limpando sessão WhatsApp devido a conflitos...');
      
      // Terminar socket atual
      if (this.sock) {
        this.sock.end();
        this.sock = null;
      }

      // Limpar estados
      this.qrCodeDataUrl = '';
      this.clientStatus = 'Reiniciando...';
      this.isReconnecting = false;
      this.reconnectAttempts = 0;

      // Aguardar 5 segundos antes de reinicializar
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Reinicializar cliente
      await this.initializeClient();
      
      console.log('✅ Sessão WhatsApp reinicializada');
      
    } catch (error) {
      console.error('❌ Erro ao limpar sessão:', error);
      this.clientStatus = 'Erro ao reinicializar - Recarregue a página';
    }
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
  isReady: () => whatsappIntegration.isReady(),
  onMessageReceived: null as ((conversationId: number, message: any) => void) | null
};