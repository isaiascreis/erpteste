// =====================================================================
// SERVIDOR WHATSAPP COM MONITORAMENTO - VERSÃO RENDER.COM
// Sistema ERP Mondial Turismo - Com Debug de Recursos
// =====================================================================

const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const admin = require('firebase-admin');

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const tmp = require('tmp');
const mime = require('mime-types');

// FFmpeg estático para processamento de áudio
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// =====================================================================
// 🔍 MONITORAMENTO DE RECURSOS
// =====================================================================
function logSystemStats() {
  const used = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  console.log('\n📊 ESTATÍSTICAS DO SISTEMA:');
  console.log(`💾 Memória Node.js:`);
  console.log(`  - RSS: ${Math.round(used.rss / 1024 / 1024)}MB`);
  console.log(`  - Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
  console.log(`  - Heap Total: ${Math.round(used.heapTotal / 1024 / 1024)}MB`);
  console.log(`  - External: ${Math.round(used.external / 1024 / 1024)}MB`);
  console.log(`💻 Memória Sistema:`);
  console.log(`  - Total: ${Math.round(totalMem / 1024 / 1024)}MB`);
  console.log(`  - Usada: ${Math.round(usedMem / 1024 / 1024)}MB`);
  console.log(`  - Livre: ${Math.round(freeMem / 1024 / 1024)}MB`);
  console.log(`  - % Uso: ${Math.round((usedMem / totalMem) * 100)}%`);
  console.log(`⏱️  Uptime: ${Math.round(process.uptime())}s\n`);
}

// Log inicial
logSystemStats();

// Log a cada 5 minutos
setInterval(logSystemStats, 5 * 60 * 1000);

// =====================================================================
// 🚀 CONFIGURAÇÃO DO WEBHOOK ERP
// =====================================================================
const ERP_WEBHOOK_URL = process.env.ERP_WEBHOOK_URL || 'https://a40ce9ec-f86c-45d2-983f-022f40c137ee-00-1vovprzuukttt.kirk.replit.dev/api/whatsapp/webhook';
const ERP_WEBHOOK_TOKEN = process.env.ERP_WEBHOOK_TOKEN || 'mundial-webhook-token-2025';

console.log('🔗 Configurações do Webhook ERP:');
console.log('📡 URL:', ERP_WEBHOOK_URL);
console.log('🔑 Token configurado:', ERP_WEBHOOK_TOKEN ? 'Sim' : 'Não');

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
app.use(express.json({ limit: '10mb' })); // Reduzido de 25mb para economizar memória
app.use(bodyParser.json({ limit: '10mb' }));

// CORS simples para economizar processamento
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// =====================================================================
// 📞 CONFIGURAÇÃO CLIENTE WHATSAPP (OTIMIZADA PARA RENDER)
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
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--memory-pressure-off', // Reduz uso de memória
          '--max_old_space_size=512' // Limita heap do V8
        ],
    }
});

// =====================================================================
// 🚀 FUNÇÃO WEBHOOK ERP (SIMPLIFICADA)
// =====================================================================
async function sendToERPWebhook(messageData) {
  try {
    console.log(`[WEBHOOK] 📤 Enviando para ERP:`, messageData.messageId);
    
    const response = await axios.post(ERP_WEBHOOK_URL, messageData, {
      headers: {
        'Authorization': `Bearer ${ERP_WEBHOOK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 8000, // Reduzido para 8 segundos
    });

    if (response.status === 200) {
      console.log(`[WEBHOOK] ✅ Sucesso!`);
    }
  } catch (error) {
    console.error(`[WEBHOOK] ❌ Erro:`, error.message);
  }
}

// =====================================================================
// 📡 EVENTOS DE CONEXÃO WHATSAPP (OTIMIZADOS)
// =====================================================================
client.on('qr', async (qr) => {
  try {
    console.log('📱 QR Code recebido...');
    qrCodeDataUrl = await qrcode.toDataURL(qr);
    clientStatus = 'Aguardando escaneamento do QR Code.';
    console.log('✅ QR Code gerado');
    
    // Log recursos após gerar QR
    logSystemStats();
  } catch (e) { 
    console.error('❌ Erro ao gerar QR Code:', e); 
  }
});

client.on('ready', () => { 
  console.log('✅ WhatsApp conectado!'); 
  qrCodeDataUrl = ''; 
  clientStatus = 'Conectado';
  clientStartTime = Date.now();
  
  // Log recursos após conectar
  logSystemStats();
});

client.on('auth_failure', (msg) => { 
  console.error('❌ Falha de autenticação:', msg); 
  clientStatus = 'Falha de autenticação'; 
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ WhatsApp desconectado:', reason);
  clientStatus = `Desconectado: ${reason}`;
  
  // Log recursos quando desconectar
  logSystemStats();
});

// Inicializar cliente
console.log('🚀 Inicializando cliente WhatsApp...');
client.initialize().catch((err) => { 
  console.error('❌ ERRO AO INICIALIZAR:', err); 
  clientStatus = `Erro: ${err.message}`; 
});

// =====================================================================
// 📨 EVENTO DE RECEBIMENTO DE MENSAGENS (OTIMIZADO)
// =====================================================================
client.on('message', async (message) => {
  console.log(`[RECEBIMENTO] 📩 Nova mensagem de: ${message.from}`);
  
  // Log recursos quando receber mensagem
  logSystemStats();
  
  try {
    // Processar apenas mensagens de texto por enquanto (economizar memória)
    if (!message.hasMedia) {
      // Enviar para ERP rapidamente
      await sendToERPWebhook({
        phone: message.from,
        name: message._data.notifyName || 'Usuário',
        message: message.body,
        messageId: message.id.id,
        type: 'text',
        timestamp: new Date(message.timestamp * 1000).toISOString()
      });

      console.log(`[WEBHOOK] ✅ Integração concluída`);
    } else {
      console.log(`[RECEBIMENTO] 📎 Mídia detectada - processamento em background`);
      
      // Enviar notificação simples para ERP sobre mídia
      await sendToERPWebhook({
        phone: message.from,
        name: message._data.notifyName || 'Usuário',
        message: '[Mídia recebida - processando...]',
        messageId: message.id.id,
        type: 'media',
        timestamp: new Date(message.timestamp * 1000).toISOString()
      });
    }
    
  } catch (error) {
    console.error('[RECEBIMENTO] ❌ Erro:', error);
  }
});

// =====================================================================
// 🌐 ROTAS API (SIMPLIFICADAS)
// =====================================================================

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
    }
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

// Health check para Render.com
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
    memory: process.memoryUsage()
  };
  res.json(health);
});

// =====================================================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR
// =====================================================================
app.listen(port, () => {
  console.log(`🌟 Servidor rodando na porta ${port}`);
  console.log(`📡 Webhook ERP: ${ERP_WEBHOOK_URL}`);
  console.log(`🔑 Token: ${ERP_WEBHOOK_TOKEN ? 'Configurado' : 'Não configurado'}`);
  
  // Log inicial de recursos
  logSystemStats();
});

// =====================================================================
// 🛡️ TRATAMENTO DE ERROS E SIGNALS
// =====================================================================

// Capturar erros não tratados
process.on('uncaughtException', (error) => {
  console.error('💥 ERRO NÃO TRATADO:', error);
  logSystemStats();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 PROMISE REJEITADA:', reason);
  logSystemStats();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM...');
  logSystemStats();
  if (client) client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT...');
  logSystemStats();
  if (client) client.destroy();
  process.exit(0);
});

// Log de exit
process.on('exit', (code) => {
  console.log(`🔚 Processo finalizando com código: ${code}`);
  console.log(`⏱️  Uptime total: ${Math.round(process.uptime())}s`);
});