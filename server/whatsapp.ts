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

// =====================================================================
// 🌟 WHATSAPP CLOUD API - CONFIGURAÇÕES OFICIAIS
// =====================================================================
const WHATSAPP_CLOUD_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_CLOUD_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_CLOUD_APP_SECRET = process.env.WHATSAPP_CLOUD_APP_SECRET;
const WHATSAPP_WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// Feature Flag para migração gradual
const WHATSAPP_MODE = process.env.WHATSAPP_MODE || 'proxy'; // 'proxy' ou 'cloud'

// Validar configurações baseado no modo
if (WHATSAPP_MODE === 'proxy') {
  if (!WHATSAPP_SERVICE_URL) {
    console.error('❌ ERRO: WHATSAPP_SERVICE_URL é obrigatório para modo proxy');
    process.exit(1);
  }
  if (!WHATSAPP_SERVICE_SECRET) {
    console.error('❌ ERRO: WHATSAPP_SERVICE_SECRET é obrigatório para modo proxy');
    process.exit(1);
  }
} else if (WHATSAPP_MODE === 'cloud') {
  if (!WHATSAPP_CLOUD_ACCESS_TOKEN) {
    console.error('❌ ERRO: WHATSAPP_ACCESS_TOKEN é obrigatório para modo cloud');
    process.exit(1);
  }
  if (!WHATSAPP_CLOUD_PHONE_NUMBER_ID) {
    console.error('❌ ERRO: WHATSAPP_PHONE_NUMBER_ID é obrigatório para modo cloud');
    process.exit(1);
  }
}

console.log(`🔗 Configurações WhatsApp (Modo: ${WHATSAPP_MODE.toUpperCase()}):`);
if (WHATSAPP_MODE === 'proxy') {
  console.log('📡 URL do serviço:', WHATSAPP_SERVICE_URL);
  console.log('🔑 Token configurado: Sim');
  console.log('🚀 Modo: Servidor Externo (sem Baileys local)');
} else if (WHATSAPP_MODE === 'cloud') {
  console.log('☁️ WhatsApp Cloud API:', 'Configurado');
  console.log('📱 Phone Number ID:', WHATSAPP_CLOUD_PHONE_NUMBER_ID ? 'Configurado' : 'Não configurado');
  console.log('🔑 Access Token:', WHATSAPP_CLOUD_ACCESS_TOKEN ? 'Configurado' : 'Não configurado');
  console.log('🚀 Modo: API Oficial Meta');
}

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
      throw new Error(`Servidor WhatsApp externo indisponível: ${(error as Error).message}`);
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
      throw new Error(`Servidor WhatsApp externo indisponível: ${(error as Error).message}`);
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
// ☁️ WHATSAPP CLOUD API CLIENT - OFICIAL META
// =====================================================================
class WhatsAppCloudClient {
  private accessToken: string;
  private phoneNumberId: string;
  private apiVersion: string = 'v20.0';
  private baseUrl: string = 'https://graph.facebook.com';
  private timeout: number = 10000;

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
  }

  // Fazer requisição para Graph API
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': 'ERP-WhatsApp-Cloud/1.0',
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Erro Cloud API:', {
          status: response.status,
          statusText: response.statusText,
          error: data
        });
        throw new Error(`WhatsApp Cloud API Error ${response.status}: ${data.error?.message || response.statusText}`);
      }

      return data;
    } catch (error: any) {
      console.error(`❌ Erro na requisição Cloud API ${endpoint}:`, error.message);
      throw error;
    }
  }

  // Verificar status da API (health check)
  async getStatus(): Promise<WhatsAppStatus> {
    try {
      // Fazer um simples request para verificar se a API está funcionando
      const data = await this.makeRequest(`/${this.phoneNumberId}`, {
        method: 'GET'
      });
      
      return {
        status: 'Conectado',
        qrCode: undefined, // Cloud API não usa QR Code
        uptime: 'Cloud API',
        ready: true,
        connectionCount: 1,
        lastActivity: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao verificar status Cloud API:', error);
      return {
        status: 'Erro de Conexão',
        qrCode: undefined,
        uptime: '0s',
        ready: false,
        connectionCount: 0,
        lastActivity: new Date().toISOString()
      };
    }
  }

  // Cloud API não usa QR Code
  async getQRCode(): Promise<string | null> {
    return null; // Cloud API usa tokens, não QR codes
  }

  // Enviar mensagem via Cloud API
  async sendMessage(phone: string, message: string): Promise<boolean> {
    try {
      const normalizedPhone = this.normalizePhone(phone);
      
      const data = await this.makeRequest(`/${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedPhone,
          type: "text",
          text: {
            body: message
          }
        })
      });

      console.log('✅ Mensagem enviada via Cloud API:', data.messages?.[0]?.id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem via Cloud API:', error);
      return false;
    }
  }

  // Enviar template (para iniciar conversas fora da janela de 24h)
  async sendTemplate(phone: string, templateName: string, languageCode: string = 'pt_BR', components: any[] = []): Promise<boolean> {
    try {
      const normalizedPhone = this.normalizePhone(phone);
      
      const data = await this.makeRequest(`/${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedPhone,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: components
          }
        })
      });

      console.log('✅ Template enviado via Cloud API:', data.messages?.[0]?.id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar template via Cloud API:', error);
      return false;
    }
  }

  // Normalizar número de telefone para Cloud API
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
// 🏭 IMPLEMENTAÇÃO DA INTEGRAÇÃO - ADAPTADOR UNIVERSAL
// =====================================================================
class WhatsAppIntegration {
  private proxyClient?: WhatsAppExternalClient;
  private cloudClient?: WhatsAppCloudClient;
  private mode: string;
  private status: string;
  private startTime: number = Date.now();

  constructor() {
    this.mode = WHATSAPP_MODE;
    
    if (this.mode === 'cloud') {
      this.cloudClient = new WhatsAppCloudClient(
        WHATSAPP_CLOUD_ACCESS_TOKEN!,
        WHATSAPP_CLOUD_PHONE_NUMBER_ID!
      );
      this.status = 'Pronto - Cloud API Oficial';
      console.log('✅ WhatsApp Cloud API inicializado');
    } else {
      this.proxyClient = new WhatsAppExternalClient(WHATSAPP_SERVICE_URL!, WHATSAPP_SERVICE_SECRET!);
      this.status = 'Pronto - Servidor Externo';
      console.log('✅ WhatsApp Client Proxy inicializado');
    }
  }

  // Obter status atual
  async getStatus(): Promise<WhatsAppStatus> {
    try {
      if (this.mode === 'cloud') {
        return await this.cloudClient!.getStatus();
      } else {
        return await this.proxyClient!.getStatus();
      }
    } catch (error) {
      console.error('❌ WhatsAppIntegration.getStatus() - Erro:', error);
      // Relançar a exceção para que as rotas possam retornar erro 500
      throw new Error(`WhatsApp ${this.mode} indisponível: ${(error as Error).message}`);
    }
  }

  // Obter QR Code
  async getQRCode(): Promise<string | null> {
    try {
      if (this.mode === 'cloud') {
        return await this.cloudClient!.getQRCode(); // Sempre null para Cloud API
      } else {
        return await this.proxyClient!.getQRCode();
      }
    } catch (error) {
      console.error('❌ WhatsAppIntegration.getQRCode() - Erro:', error);
      if (this.mode === 'cloud') {
        return null; // Cloud API não usa QR codes
      }
      // Relançar a exceção para que as rotas possam retornem erro 500
      throw new Error(`WhatsApp ${this.mode} indisponível: ${(error as Error).message}`);
    }
  }

  // Enviar mensagem
  async sendMessage(phone: string, message: string): Promise<boolean> {
    try {
      console.log(`📤 Enviando mensagem via ${this.mode} para: ${phone}`);
      
      let success: boolean;
      if (this.mode === 'cloud') {
        success = await this.cloudClient!.sendMessage(phone, message);
      } else {
        success = await this.proxyClient!.sendMessage(phone, message);
      }
      
      if (success) {
        console.log(`✅ Mensagem enviada com sucesso via ${this.mode}`);
      } else {
        console.log(`❌ Falha ao enviar mensagem via ${this.mode}`);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  // Enviar template (apenas para Cloud API)
  async sendTemplate(phone: string, templateName: string, languageCode: string = 'pt_BR', components: any[] = []): Promise<boolean> {
    if (this.mode !== 'cloud') {
      console.error('❌ Templates só estão disponíveis no modo Cloud API');
      return false;
    }

    try {
      console.log(`📤 Enviando template ${templateName} via Cloud API para: ${phone}`);
      const success = await this.cloudClient!.sendTemplate(phone, templateName, languageCode, components);
      
      if (success) {
        console.log('✅ Template enviado com sucesso via Cloud API');
      } else {
        console.log('❌ Falha ao enviar template via Cloud API');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Erro ao enviar template:', error);
      return false;
    }
  }

  // Verificar se está pronto
  isReady(): boolean {
    if (this.mode === 'cloud') {
      // Cloud API está sempre "pronto" se tem tokens válidos
      return !!this.cloudClient;
    } else {
      // Proxy: sempre retorna true (o servidor externo gerencia a conexão)
      return true;
    }
  }

  // Função de limpeza
  async clearSession(): Promise<void> {
    if (this.mode === 'cloud') {
      console.log('ℹ️ clearSession() chamado - Cloud API não tem sessões para limpar');
    } else {
      console.log('ℹ️ clearSession() chamado - Nenhuma ação necessária no modo proxy');
    }
  }

  // Forçar reautenticação
  async forceReauth(): Promise<void> {
    if (this.mode === 'cloud') {
      console.log('ℹ️ forceReauth() chamado - Cloud API usa tokens permanentes');
    } else {
      console.log('ℹ️ forceReauth() chamado - Nenhuma ação necessária no modo proxy');
    }
  }

  // Obter modo atual
  getMode(): string {
    return this.mode;
  }

  // Atualizar modo
  setMode(newMode: 'proxy' | 'cloud'): void {
    this.mode = newMode;
    
    // Inicializar o cliente apropriado quando o modo muda
    if (newMode === 'cloud') {
      if (WHATSAPP_CLOUD_ACCESS_TOKEN && WHATSAPP_CLOUD_PHONE_NUMBER_ID) {
        this.cloudClient = new WhatsAppCloudClient(
          WHATSAPP_CLOUD_ACCESS_TOKEN,
          WHATSAPP_CLOUD_PHONE_NUMBER_ID
        );
        this.status = 'Pronto - Cloud API Oficial';
        console.log('✅ WhatsApp Cloud API inicializado dinamicamente');
      } else {
        console.error('❌ Erro: Credenciais da Cloud API não disponíveis');
      }
    } else {
      this.proxyClient = new WhatsAppExternalClient(WHATSAPP_SERVICE_URL!, WHATSAPP_SERVICE_SECRET!);
      this.status = 'Pronto - Servidor Externo';
      console.log('✅ WhatsApp Client Proxy inicializado dinamicamente');
    }
    
    console.log(`🔄 Modo WhatsApp atualizado para: ${newMode}`);
  }
}

// =====================================================================
// 🏭 SINGLETON - INSTÂNCIA ÚNICA
// =====================================================================
export const whatsappIntegration = new WhatsAppIntegration();

// =====================================================================
// 📤 API COMPATÍVEL UNIVERSAL
// =====================================================================
export const WhatsAppAPI = {
  getStatus: () => whatsappIntegration.getStatus(),
  getQRCode: () => whatsappIntegration.getQRCode(),
  sendMessage: (phone: string, message: string) => whatsappIntegration.sendMessage(phone, message),
  sendTemplate: (phone: string, templateName: string, languageCode?: string, components?: any[]) => 
    whatsappIntegration.sendTemplate(phone, templateName, languageCode, components),
  forceReauth: () => whatsappIntegration.forceReauth(),
  isReady: () => whatsappIntegration.isReady(),
  getMode: () => whatsappIntegration.getMode(),
  setMode: (newMode: 'proxy' | 'cloud') => whatsappIntegration.setMode(newMode),
  onMessageReceived: null as ((conversationId: number, message: any) => void) | null
};