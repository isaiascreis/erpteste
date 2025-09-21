// =====================================================================
// SERVIDOR WHATSAPP COM KEEP-ALIVE - VERSÃO RENDER.COM
// Sistema ERP Mondial Turismo - Anti-Sleep para Plano Gratuito
// =====================================================================

const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const axios = require('axios');

// =====================================================================
// 🔄 KEEP-ALIVE ANTI-SLEEP (PARA PLANO GRATUITO)
// =====================================================================
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://mondial-whatsapp-server.onrender.com';
let keepAliveInterval;

function startKeepAlive() {
  console.log('🔄 Iniciando Keep-Alive para prevenir sleep...');
  
  keepAliveInterval = setInterval(async () => {
    try {
      const response = await axios.get(`${RENDER_URL}/ping`, { 
        timeout: 5000,
        headers: { 'User-Agent': 'KeepAlive/1.0' }
      });
      console.log(`🏓 Keep-Alive ping: ${response.status} - ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.warn('⚠️ Keep-Alive falhou:', error.message);
    }
  }, 50000); // A cada 50 segundos (antes do sleep de 60s)
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    console.log('🛑 Keep-Alive parado');
  }
}

// =====================================================================
// 🚀 CONFIGURAÇÃO DO WEBHOOK ERP
// =====================================================================
const ERP_WEBHOOK_URL = process.env.ERP_WEBHOOK_URL || 'https://a40ce9ec-f86c-45d2-983f-022f40c137ee-00-1vovprzuukttt.kirk.replit.dev/api/whatsapp/webhook';
const ERP_WEBHOOK_TOKEN = process.env.ERP_WEBHOOK_TOKEN || 'mundial-webhook-token-2025';

console.log('🔗 Configurações do Webhook ERP:');
console.log('📡 URL:', ERP_WEBHOOK_URL);
console.log('🔑 Token configurado:', ERP_WEBHOOK_TOKEN ? 'Sim' : 'Não');
console.log('🔄 Keep-Alive URL:', RENDER_URL);

// =====================================================================
// 📱 CONFIGURAÇÃO FIREBASE
// =====================================================================
let db;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mondialsistemamodular-default-rtdb.firebaseio.com",
    storageBucket: "mondialsistemamodular.appspot.com"
  });

  console.log('✅ Firebase inicializado com sucesso');
  console.log('📦 Bucket configurado:', admin.storage().bucket().name);
  db = admin.database();
} catch (error) {
  console.error('❌ ERRO CRÍTICO: Falha ao ler FIREBASE_SERVICE_ACCOUNT.', error);
  process.exit(1);
}

// =====================================================================
// 🌐 CONFIGURAÇÃO EXPRESS + CORS
// =====================================================================
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

// CORS simples
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// =====================================================================
// 📞 CONFIGURAÇÃO CLIENTE WHATSAPP
// =====================================================================
const port = process.env.PORT || 3000;
let qrCodeDataUrl = '';
let clientStatus = 'Iniciando servidor...';
let clientStartTime = Date.now();

const client = new Client({
    authStrategy: new LocalAuth(),
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

// =====================================================================
// 🚀 FUNÇÃO WEBHOOK ERP
// =====================================================================
async function sendToERPWebhook(messageData) {
  try {
    console.log(`[WEBHOOK] 📤 Enviando para ERP:`, messageData.messageId);
    
    const response = await axios.post(ERP_WEBHOOK_URL, messageData, {
      headers: {
        'Authorization': `Bearer ${ERP_WEBHOOK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    });

    if (response.status === 200) {
      console.log(`[WEBHOOK] ✅ Sucesso! Mensagem enviada para ERP:`, messageData.messageId);
    }
  } catch (error) {
    console.error(`[WEBHOOK] ❌ Erro:`, error.message);
  }
}

// =====================================================================
// 📡 EVENTOS DE CONEXÃO WHATSAPP
// =====================================================================
client.on('qr', async (qr) => {
  try {
    console.log('📱 QR Code recebido...');
    qrCodeDataUrl = await qrcode.toDataURL(qr);
    clientStatus = 'Aguardando escaneamento do QR Code.';
    console.log('✅ QR Code gerado');
  } catch (e) { 
    console.error('❌ Erro ao gerar QR Code:', e); 
  }
});

client.on('ready', () => { 
  console.log('✅ Cliente do WhatsApp está pronto e conectado!'); 
  qrCodeDataUrl = ''; 
  clientStatus = 'Conectado';
  clientStartTime = Date.now();
  
  // Iniciar keep-alive após conectar
  startKeepAlive();
});

client.on('auth_failure', (msg) => { 
  console.error('❌ Falha de autenticação:', msg); 
  clientStatus = 'Falha de autenticação'; 
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ WhatsApp desconectado:', reason);
  clientStatus = `Desconectado: ${reason}`;
  
  // Parar keep-alive se desconectado
  stopKeepAlive();
});

// Inicializar cliente
console.log('🚀 Inicializando cliente WhatsApp...');
client.initialize().catch((err) => { 
  console.error('❌ ERRO AO INICIALIZAR:', err); 
  clientStatus = `Erro: ${err.message}`; 
});

// =====================================================================
// 📨 EVENTO DE RECEBIMENTO DE MENSAGENS
// =====================================================================
client.on('message', async (message) => {
  console.log(`[RECEBIMENTO] 📩 Nova mensagem de: ${message.from}`);
  const sanitizedFrom = message.from.split('@')[0];
  const chatRef = db.ref(`erp/whatsapp/conversas/${sanitizedFrom}`);

  try {
    // Salvar no Firebase
    await chatRef.push({
      fromMe: false,
      timestamp: message.timestamp * 1000,
      type: message.hasMedia ? 'media' : 'text',
      body: message.body
    });

    console.log(`[RECEBIMENTO] ✅ Mensagem de ${sanitizedFrom} salva no Firebase`);

    // Enviar para ERP
    await sendToERPWebhook({
      phone: message.from,
      name: message._data.notifyName || 'Usuário',
      message: message.body,
      messageId: message.id.id,
      type: message.hasMedia ? 'media' : 'text',
      timestamp: new Date(message.timestamp * 1000).toISOString()
    });

    console.log(`[WEBHOOK] ✅ Integração ERP concluída com sucesso`);
    
  } catch (error) {
    console.error('[RECEBIMENTO] ❌ Erro:', error);
  }
});

// =====================================================================
// 🌐 ROTAS API
// =====================================================================

// Ping para keep-alive
app.get('/ping', (req, res) => {
  res.json({ 
    pong: true, 
    status: clientStatus,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Status do servidor
app.get('/status', (req, res) => {
  const uptime = Math.round((Date.now() - clientStartTime) / 1000);
  const memUsage = process.memoryUsage();
  
  res.json({ 
    status: clientStatus, 
    qrCode: qrCodeDataUrl,
    uptime: `${uptime}s`,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
    },
    keepAlive: !!keepAliveInterval
  });
});

// QR Code
app.get('/qr', (req, res) => {
  if (qrCodeDataUrl) {
    res.json({ qrCode: qrCodeDataUrl });
  } else {
    res.status(404).json({ error: 'QR Code não disponível' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Servidor WhatsApp ERP rodando',
    status: clientStatus,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Health check específico
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    whatsapp: clientStatus,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    keepAlive: !!keepAliveInterval
  };
  res.json(health);
});

// =====================================================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR
// =====================================================================
app.listen(port, () => {
  console.log(`🌟 Servidor WhatsApp ERP rodando na porta ${port}`);
  console.log(`📡 Webhook ERP: ${ERP_WEBHOOK_URL}`);
  console.log(`🔑 Token: ${ERP_WEBHOOK_TOKEN ? 'Configurado' : 'Não configurado'}`);
  console.log(`🔄 Keep-Alive: ${RENDER_URL}/ping`);
  
  // Log de memória inicial
  const memUsage = process.memoryUsage();
  console.log(`💾 Memória inicial: RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
});

// =====================================================================
// 🛡️ TRATAMENTO DE ERROS E SIGNALS
// =====================================================================

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM...');
  stopKeepAlive();
  if (client) client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT...');
  stopKeepAlive();
  if (client) client.destroy();
  process.exit(0);
});

process.on('exit', (code) => {
  console.log(`🔚 Processo finalizando com código: ${code}`);
  stopKeepAlive();
});