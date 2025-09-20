// =====================================================================
// SERVIDOR WHATSAPP PARA RENDER.COM - VERSÃO ESTÁVEL (CORRIGIDA)
// Sistema ERP Mondial Turismo - Sem Desconexões
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
// 🚀 CONFIGURAÇÃO DO WEBHOOK ERP (CORRIGIDA)
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

  const bucketNameFromEnv = (process.env.FIREBASE_STORAGE_BUCKET
  || `${serviceAccount.project_id}.appspot.com`)
  .replace('firebasestorage.app', 'appspot.com');

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
app.use(express.json({ limit: '25mb' }));
app.use(bodyParser.json({ limit: '25mb' }));

// CORS configurado para URLs corretas
const ALLOWED_ORIGINS = [
  'https://a40ce9ec-f86c-45d2-983f-022f40c137ee-00-1vovprzuukttt.kirk.replit.dev',
  'https://erpteste.onrender.com',
  'https://meu-website-klaudioscarvalho.replit.app',
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// =====================================================================
// 📞 CONFIGURAÇÃO CLIENTE WHATSAPP (ESTABILIZADA)
// =====================================================================
const port = process.env.PORT || 3000;
let qrCodeDataUrl = '';
let clientStatus = 'Iniciando servidor...';
let isReconnecting = false; // Previne reconexões múltiplas
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        timeout: 180000, // Aumentado para 3 minutos
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
          '--disable-renderer-backgrounding'
        ],
    }
});

// =====================================================================
// 🔧 FUNÇÕES AUXILIARES
// =====================================================================

// Download de arquivos temporários
async function downloadToTemp(url, suggestedName = 'media') {
  const extFromUrl = (() => { 
    try { 
      return path.extname(new URL(url).pathname) || ''; 
    } catch { 
      return ''; 
    }
  })();
  
  const tmpFile = tmp.fileSync({ postfix: extFromUrl || '' });
  const writer = fs.createWriteStream(tmpFile.name);
  const resp = await axios.get(url, { responseType: 'stream' });
  resp.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(tmpFile));
    writer.on('error', reject);
  });
}

// Conversão de áudio para formato WhatsApp
async function transcodeToOpusOgg(inputPath) {
  const outPath = path.join(os.tmpdir(), `voice_${Date.now()}.ogg`);
  
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec('libopus')
      .audioBitrate('32k')
      .format('ogg')
      .on('error', reject)
      .on('end', resolve)
      .save(outPath);
  });
  
  try {
    const size = fs.statSync(outPath).size;
    console.log('[FFMPEG] OGG gerado com', size, 'bytes');
  } catch (e) { 
    console.warn('[FFMPEG] stat OGG:', e?.message || e); 
  }
  
  return outPath;
}

// Detectar se é arquivo de áudio
function guessIsAudio(mediaType, fileName) {
  const mt = String(mediaType || '').toLowerCase();
  const ext = (fileName ? path.extname(fileName) : '').toLowerCase();
  return mt.startsWith('audio/') || ['.webm','.ogg','.m4a','.mp3','.wav','.aac','.amr','.3gp'].includes(ext);
}

// Formatar ID WhatsApp
function makeWaId(toRaw) { 
  if (String(toRaw).includes('@')) return String(toRaw); 
  return `${String(toRaw).replace(/\D/g,'')}@c.us`; 
}

// Salvar dados no Firebase com segurança
async function safePush(ref, data) { 
  try { 
    await ref.push(data); 
  } catch (e) { 
    console.warn('[WARN] RTDB push falhou:', e?.message || e); 
  } 
}

// Upload para Firebase Storage com segurança
async function safeUpload(bucket, localPath, remotePath, contentType) {
  try {
    await bucket.upload(localPath, { 
      destination: remotePath, 
      metadata: { contentType } 
    });
    
    const file = bucket.file(remotePath);
    const [signedUrl] = await file.getSignedUrl({ 
      action:'read', 
      expires: '03-09-2491' 
    });
    
    return signedUrl;
  } catch (e) {
    console.warn('[WARN] upload falhou:', e?.message || e);
    return null;
  }
}

// Retry para envios (mitiga falhas intermitentes)
async function sendWithRetry(id, payload, opts = {}, retries = 1) {
    try {
        return await client.sendMessage(id, payload, opts);
    } catch (err) {
        if (retries > 0) {
            console.warn('[sendWithRetry] falha, tentando novamente em 800ms:', err?.message || err);
            await new Promise(r => setTimeout(r, 800));
            return sendWithRetry(id, payload, opts, retries - 1);
        }
        throw err;
    }
}

// =====================================================================
// 🚀 FUNÇÃO WEBHOOK ERP (ASSÍNCRONA E MELHORADA)
// =====================================================================
async function sendToERPWebhook(messageData) {
  // Processamento assíncrono para não bloquear WhatsApp
  setImmediate(async () => {
    try {
      console.log(`[WEBHOOK] 📤 Enviando mensagem para ERP:`, { 
        phone: messageData.phone, 
        messageId: messageData.messageId 
      });
      
      const response = await axios.post(ERP_WEBHOOK_URL, messageData, {
        headers: {
          'Authorization': `Bearer ${ERP_WEBHOOK_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // Reduzido para 10 segundos
        maxRedirects: 2,
      });

      if (response.status === 200) {
        console.log(`[WEBHOOK] ✅ Sucesso! Mensagem enviada para ERP:`, messageData.messageId);
      } else {
        console.warn(`[WEBHOOK] ⚠️ Resposta inesperada do ERP:`, response.status, response.data);
      }
    } catch (error) {
      // Tratamento específico de erros
      if (error.code === 'ECONNREFUSED') {
        console.error(`[WEBHOOK] ❌ ERP não está acessível. Verifique se ${ERP_WEBHOOK_URL} está online.`);
      } else if (error.code === 'ETIMEDOUT') {
        console.error(`[WEBHOOK] ❌ Timeout ao conectar com ERP. Verifique a conectividade.`);
      } else if (error.response?.status === 401) {
        console.error(`[WEBHOOK] ❌ Token de autorização inválido. Verifique ERP_WEBHOOK_TOKEN.`);
      } else if (error.response?.status === 400) {
        console.error(`[WEBHOOK] ❌ Dados inválidos enviados ao ERP:`, error.response.data);
      } else if (error.response?.status === 404) {
        console.error(`[WEBHOOK] ❌ Endpoint não encontrado. Verifique a URL: ${ERP_WEBHOOK_URL}`);
      } else {
        console.error(`[WEBHOOK] ❌ Erro ao enviar para ERP:`, {
          messageId: messageData.messageId,
          phone: messageData.phone,
          error: error.message,
          status: error.response?.status
        });
      }
    }
  });
}

// =====================================================================
// 📡 EVENTOS DE CONEXÃO WHATSAPP (ESTABILIZADOS)
// =====================================================================
client.on('qr', async (qr) => {
  try {
    console.log('📱 QR Code recebido, gerando imagem...');
    qrCodeDataUrl = await qrcode.toDataURL(qr);
    clientStatus = 'Aguardando escaneamento do QR Code.';
    reconnectAttempts = 0; // Reset contador
    console.log('✅ QR Code gerado com sucesso');
  } catch (e) { 
    console.error('❌ Erro ao gerar QR Code:', e); 
  }
});

client.on('ready', () => { 
  console.log('✅ Cliente do WhatsApp está pronto e conectado!'); 
  qrCodeDataUrl = ''; 
  clientStatus = 'Conectado';
  isReconnecting = false;
  reconnectAttempts = 0;
});

client.on('auth_failure', (msg) => { 
  console.error('❌ Falha de autenticação:', msg); 
  clientStatus = 'Falha de autenticação'; 
  isReconnecting = false;
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ WhatsApp desconectado:', reason);
  clientStatus = `Desconectado: ${reason || 'motivo não informado'}`;
  
  // Reconexão inteligente com limite de tentativas
  if (!isReconnecting && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    isReconnecting = true;
    reconnectAttempts++;
    
    const delay = Math.min(5000 * reconnectAttempts, 30000); // Delay crescente, max 30s
    console.log(`🔄 Tentando reconectar em ${delay/1000}s (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(() => {
      client.initialize().catch((err) => {
        console.error('❌ Erro ao reinicializar cliente:', err);
        isReconnecting = false;
      });
    }, delay);
  } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('❌ Número máximo de tentativas de reconexão atingido. Reinicialização manual necessária.');
    clientStatus = 'Erro: Muitas tentativas de reconexão falharam';
  }
});

// Inicializar cliente
console.log('🚀 Inicializando cliente WhatsApp...');
client.initialize().catch((err) => { 
  console.error('❌ ERRO AO INICIALIZAR O CLIENTE:', err); 
  clientStatus = `Erro na inicialização: ${err.message}`; 
});

// =====================================================================
// 📨 EVENTO DE RECEBIMENTO DE MENSAGENS (OTIMIZADO)
// =====================================================================
client.on('message', async (message) => {
  console.log(`[RECEBIMENTO] 📩 Nova mensagem de: ${message.from}`);
  const sanitizedFrom = message.from.split('@')[0];
  const chatRef = db.ref(`erp/whatsapp/conversas/${sanitizedFrom}`);

  let messageData = { 
    fromMe: false, 
    timestamp: message.timestamp * 1000 
  };
  
  try {
    // Processar mídia de forma assíncrona se existir
    if (message.hasMedia) {
      console.log('[RECEBIMENTO] 📎 Mensagem com mídia detectada. Processando...');
      
      // Processar mídia em background para não bloquear
      setImmediate(async () => {
        try {
          const media = await message.downloadMedia();

          if (media) {
            console.log('[RECEBIMENTO] ✅ Download da mídia concluído:', {
                mimetype: media.mimetype,
                filename: media.filename,
                size: media.data?.length || 0
            });

            const bucket = admin.storage().bucket();
            const filenameOnly = media.filename || `media_${Date.now()}.${mime.extension(media.mimetype) || 'bin'}`;
            const pathInBucket = `erp/whatsapp/${sanitizedFrom}/${Date.now()}_${filenameOnly}`;
            const file = bucket.file(pathInBucket);

            console.log(`[RECEBIMENTO] 📤 Salvando no Storage: ${pathInBucket}`);
            const buffer = Buffer.from(media.data, 'base64');
            await file.save(buffer, { 
              metadata: { 
                contentType: media.mimetype,
                cacheControl: 'public, max-age=31536000'
              } 
            });

            console.log('[RECEBIMENTO] ✅ Mídia salva no Storage com sucesso');

            const [signedUrl] = await file.getSignedUrl({ 
              action:'read', 
              expires: '03-09-2491' 
            });
            
            // Atualizar dados da mensagem com mídia
            const updatedMessageData = {
              ...messageData,
              type: (media.mimetype && media.mimetype.split('/')[0]) || 'file',
              url: signedUrl,
              filename: filenameOnly,
              mimetype: media.mimetype
            };

            // Salvar no Firebase
            await safePush(chatRef, updatedMessageData);
            console.log(`[RECEBIMENTO] ✅ Mensagem com mídia salva no Firebase`);

            // Enviar para ERP
            await sendToERPWebhook({
              phone: message.from,
              name: message._data.notifyName || 'Usuário',
              message: `[${updatedMessageData.type.toUpperCase()}] ${filenameOnly}`,
              messageId: message.id.id,
              type: updatedMessageData.type,
              timestamp: new Date(message.timestamp * 1000).toISOString(),
              url: signedUrl
            });
          }
        } catch (error) {
          console.error('[RECEBIMENTO] ❌ Erro ao processar mídia:', error);
        }
      });
      
      // Para mensagens com mídia, salvar dados básicos imediatamente
      messageData.type = 'media';
      messageData.body = '[Processando mídia...]';
    } else {
      // Mensagem de texto simples
      messageData.type = 'text';
      messageData.body = message.body;
      
      console.log(`[RECEBIMENTO] ✅ Mensagem de ${sanitizedFrom} salva no Firebase`);
      await safePush(chatRef, messageData);

      // Enviar para ERP de forma assíncrona
      await sendToERPWebhook({
        phone: message.from,
        name: message._data.notifyName || 'Usuário',
        message: message.body,
        messageId: message.id.id,
        type: 'text',
        timestamp: new Date(message.timestamp * 1000).toISOString()
      });
    }

    console.log(`[WEBHOOK] ✅ Integração ERP concluída com sucesso`);
    
  } catch (error) {
    console.error('[RECEBIMENTO] ❌ Erro ao processar mensagem:', error);
  }
});

// =====================================================================
// 🌐 ROTAS API
// =====================================================================

// Status do servidor
app.get('/status', (req, res) => {
  res.json({ 
    status: clientStatus, 
    qrCode: qrCodeDataUrl,
    reconnectAttempts,
    maxAttempts: MAX_RECONNECT_ATTEMPTS
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

// Enviar mensagem
app.post('/send', async (req, res) => {
  try {
    const { to, message, type = 'text', url } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Campos "to" e "message" são obrigatórios' });
    }

    const waId = makeWaId(to);
    let result;

    if (type === 'media' && url) {
      console.log(`[ENVIO] 📤 Enviando mídia para ${waId}:`, url);
      const tempFile = await downloadToTemp(url);
      const media = MessageMedia.fromFilePath(tempFile.name);
      result = await sendWithRetry(waId, media, { caption: message });
      tempFile.removeCallback();
    } else {
      console.log(`[ENVIO] 📤 Enviando texto para ${waId}:`, message);
      result = await sendWithRetry(waId, message);
    }

    // Salvar mensagem enviada no Firebase
    const sanitizedTo = waId.split('@')[0];
    const chatRef = db.ref(`erp/whatsapp/conversas/${sanitizedTo}`);
    await safePush(chatRef, {
      fromMe: true,
      timestamp: Date.now(),
      type,
      body: message,
      url: type === 'media' ? url : undefined
    });

    console.log(`[ENVIO] ✅ Mensagem enviada com sucesso para ${waId}`);
    res.json({ success: true, messageId: result.id.id });
    
  } catch (error) {
    console.error('[ENVIO] ❌ Erro ao enviar mensagem:', error);
    res.status(500).json({ 
      error: 'Erro ao enviar mensagem',
      details: error.message 
    });
  }
});

// Listar conversas
app.get('/conversations', async (req, res) => {
  try {
    const conversasRef = db.ref('erp/whatsapp/conversas');
    const snapshot = await conversasRef.once('value');
    const data = snapshot.val() || {};
    
    const conversations = Object.keys(data).map(phone => ({
      phone: `${phone}@c.us`,
      lastMessage: Object.values(data[phone]).pop(),
      messageCount: Object.keys(data[phone]).length
    }));

    res.json(conversations);
  } catch (error) {
    console.error('[API] ❌ Erro ao listar conversas:', error);
    res.status(500).json({ error: 'Erro ao listar conversas' });
  }
});

// Obter mensagens de uma conversa
app.get('/messages/:phone', async (req, res) => {
  try {
    const phone = req.params.phone.replace('@c.us', '');
    const messagesRef = db.ref(`erp/whatsapp/conversas/${phone}`);
    const snapshot = await messagesRef.once('value');
    const messages = snapshot.val() || {};
    
    const messageArray = Object.entries(messages).map(([id, message]) => ({
      id,
      ...message
    })).sort((a, b) => a.timestamp - b.timestamp);

    res.json(messageArray);
  } catch (error) {
    console.error('[API] ❌ Erro ao obter mensagens:', error);
    res.status(500).json({ error: 'Erro ao obter mensagens' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Servidor WhatsApp ERP rodando',
    status: clientStatus,
    timestamp: new Date().toISOString()
  });
});

// =====================================================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR
// =====================================================================
app.listen(port, () => {
  console.log(`🌟 Servidor WhatsApp ERP rodando na porta ${port}`);
  console.log(`📡 Webhook ERP: ${ERP_WEBHOOK_URL}`);
  console.log(`🔑 Token ERP: ${ERP_WEBHOOK_TOKEN ? 'Configurado' : 'Não configurado'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando graciosamente...');
  if (client) {
    client.destroy();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando graciosamente...');
  if (client) {
    client.destroy();
  }
  process.exit(0);
});