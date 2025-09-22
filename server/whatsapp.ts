// =====================================================================
// WHATSAPP CLIENT PROXY - ERP MONDIAL TURISMO
// Proxy para servidor WhatsApp externo (sem Baileys local)
// =====================================================================

import { storage } from './storage';

// =====================================================================
// 🔧 CONFIGURAÇÕES
// =====================================================================

// URLs e configurações para o servidor WhatsApp externo
const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL;
const WHATSAPP_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;

// Validar configurações obrigatórias de segurança
if (!WHATSAPP_SERVICE_URL) {
  console.error('❌ ERRO: WHATSAPP_SERVICE_URL é obrigatório');
  process.exit(1);
}

if (!WHATSAPP_SERVICE_SECRET) {
  console.error('❌ ERRO: WHATSAPP_SERVICE_SECRET é obrigatório');
  process.exit(1);
}

console.log('🔗 Configurações WhatsApp Proxy:');
console.log('📡 URL do serviço:', WHATSAPP_SERVICE_URL);
console.log('🔑 Token configurado: Sim');
console.log('🚀 Modo: Servidor Externo (sem Baileys local)');

// =====================================================================
// 📱 INTERFACES E TIPOS
// =====================================================================
export interface WhatsAppStatus {
  status: string;
  qrCode?: string;
  uptime: string;
  ready: boolean;
  connectionCount: number;
  lastActivity?: string;
}

// =====================================================================
// 🌐 CLIENTE HTTP PARA SERVIDOR EXTERNO
// =====================================================================
class WhatsAppExternalClient {
  private baseUrl: string;
  private secret: string;
  private timeout: number = 8000;

  constructor(baseUrl: string, secret: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.secret = secret;
  }

  // Fazer requisição HTTP para o servidor externo
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secret}`,
          'User-Agent': 'ERP-WhatsApp-Client/1.0',
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`❌ Erro na requisição ${endpoint}:`, error.message);
      throw error;
    }
  }

  // Obter status do servidor externo
  async getStatus(): Promise<WhatsAppStatus> {
    try {
      const data = await this.makeRequest('/status');
      console.log('📥 Dados recebidos do servidor externo:', JSON.stringify(data, null, 2));
      
      return {
        status: data.status || 'Desconectado',
        qrCode: data.qrCode,
        uptime: data.uptime || '0s',
        ready: data.status === 'Conectado' || data.status === 'conectado',
        connectionCount: 1,
        lastActivity: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao obter status do servidor externo:', error);
      // Relançar exceção para que rotas retornem erro 500
      throw new Error(`Servidor WhatsApp externo indisponível: ${error.message}`);
    }
  }

  // Obter QR Code do servidor externo
  async getQRCode(): Promise<string | null> {
    try {
      const data = await this.makeRequest('/qr');
      console.log('📥 QR Code recebido do servidor externo:', data.qrCode ? 'QR Code válido' : 'QR Code vazio');
      return data.qrCode || null;
    } catch (error) {
      console.error('❌ Erro ao obter QR Code do servidor externo:', error);
      // Relançar exceção para que rotas retornem erro 500
      throw new Error(`Servidor WhatsApp externo indisponível: ${error.message}`);
    }
  }

  // Enviar mensagem via servidor externo
  async sendMessage(phone: string, message: string): Promise<boolean> {
    try {
      const data = await this.makeRequest('/send', {
        method: 'POST',
        body: JSON.stringify({
          phone: this.normalizePhone(phone),
          message: message
        })
      });

      return data.success === true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  // Normalizar número de telefone
  private normalizePhone(phone: string): string {
    // Remove todos os caracteres não numéricos
    let normalizedPhone = phone.replace(/[^\d]/g, '');
    
    // Se não começar com 55 (Brasil), adicionar
    if (!normalizedPhone.startsWith('55')) {
      normalizedPhone = '55' + normalizedPhone;
    }
    
    return normalizedPhone;
  }
}

// =====================================================================
// 🏭 IMPLEMENTAÇÃO DA INTEGRAÇÃO
// =====================================================================
class WhatsAppIntegration {
  private client: WhatsAppExternalClient;
  private status: string = 'Conectando ao Servidor Externo...';
  private startTime: number = Date.now();

  constructor() {
    this.client = new WhatsAppExternalClient(WHATSAPP_SERVICE_URL, WHATSAPP_SERVICE_SECRET);
    this.status = 'Pronto - Servidor Externo';
    console.log('✅ WhatsApp Client Proxy inicializado');
  }

  // Obter status atual
  async getStatus(): Promise<WhatsAppStatus> {
    try {
      return await this.client.getStatus();
    } catch (error) {
      console.error('❌ WhatsAppIntegration.getStatus() - Servidor externo indisponível:', error);
      // Relançar a exceção para que as rotas possam retornar erro 500
      throw new Error(`Servidor WhatsApp externo indisponível: ${error.message}`);
    }
  }

  // Obter QR Code
  async getQRCode(): Promise<string | null> {
    try {
      return await this.client.getQRCode();
    } catch (error) {
      console.error('❌ WhatsAppIntegration.getQRCode() - Servidor externo indisponível:', error);
      // Relançar a exceção para que as rotas possam retornar erro 500
      throw new Error(`Servidor WhatsApp externo indisponível: ${error.message}`);
    }
  }

  // Enviar mensagem
  async sendMessage(phone: string, message: string): Promise<boolean> {
    try {
      console.log(`📤 Enviando mensagem via servidor externo para: ${phone}`);
      const success = await this.client.sendMessage(phone, message);
      
      if (success) {
        console.log('✅ Mensagem enviada com sucesso via servidor externo');
      } else {
        console.log('❌ Falha ao enviar mensagem via servidor externo');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  // Verificar se está pronto
  isReady(): boolean {
    // Sempre retorna true para o proxy (o servidor externo gerencia a conexão)
    return true;
  }

  // Função de limpeza (não faz nada no proxy)
  async clearSession(): Promise<void> {
    console.log('ℹ️ clearSession() chamado - Nenhuma ação necessária no modo proxy');
  }

  // Forçar reautenticação (não faz nada no proxy)
  async forceReauth(): Promise<void> {
    console.log('ℹ️ forceReauth() chamado - Nenhuma ação necessária no modo proxy');
  }
}

// =====================================================================
// 🏭 SINGLETON - INSTÂNCIA ÚNICA
// =====================================================================
export const whatsappIntegration = new WhatsAppIntegration();

// =====================================================================
// 📤 API COMPATÍVEL
// =====================================================================
export const WhatsAppAPI = {
  getStatus: () => whatsappIntegration.getStatus(),
  getQRCode: () => whatsappIntegration.getQRCode(),
  sendMessage: (phone: string, message: string) => whatsappIntegration.sendMessage(phone, message),
  forceReauth: () => whatsappIntegration.forceReauth(),
  isReady: () => whatsappIntegration.isReady(),
  onMessageReceived: null as ((conversationId: number, message: any) => void) | null
};