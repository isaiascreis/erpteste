// =====================================================================
// SERVIDOR WHATSAPP PARA RENDER.COM - COM INTEGRAÇÃO ERP WEBHOOK
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

// >>> FFmpeg estático (no topo)
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// =====================================================================
// 🚀 CONFIGURAÇÃO DO WEBHOOK ERP (NOVA SEÇÃO)
// =====================================================================
const ERP_WEBHOOK_URL = process.env.ERP_WEBHOOK_URL || 'https://meu-website-klaudioscarvalho.replit.app/api/whatsapp/webhook';
const ERP_WEBHOOK_TOKEN = process.env.ERP_WEBHOOK_TOKEN || 'mondial-webhook-secret';

console.log('🔗 Configurações do Webhook ERP:');
console.log('📡 URL:', ERP_WEBHOOK_URL);
console.log('🔑 Token configurado:', ERP_WEBHOOK_TOKEN ? 'Sim' : 'Não');

// ---------------------- Firebase ----------------------
let db;
try {
  // Conexão com Firebase via Service Account (env var)
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  const bucketNameFromEnv = (process.env.FIREBASE_STORAGE_BUCKET
  || `${serviceAccount.project_id}.appspot.com`)
  .replace('firebasestorage.app', 'appspot.com');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mondialsistemamodular-default-rtdb.firebaseio.com",
    storageBucket: "mondialsistemamodular.appspot.com"
  });

  console.log('Bucket configurado:', admin.storage().bucket().name);
  db = admin.database();
} catch (error) {
  console.error('ERRO CRÍTICO: Falha ao ler FIREBASE_SERVICE_ACCOUNT.', error);
  process.exit(1);
}

// ---------------------- App Express + CORS ---------------------------
const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(bodyParser.json({ limit: '25mb' }));

// CORS configurado
const ALLOWED_ORIGINS = [
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

// ---------------------- Cliente WhatsApp -----------------------------
const port = process.env.PORT || 3000;
let qrCodeDataUrl = '';
let clientStatus = 'Iniciando servidor...';

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
        ],
    }
});

// ---------------------- Helpers (voz/mídia) ---------------------------
async function downloadToTemp(url, suggestedName = 'media') {
  const extFromUrl = (() => { try { return path.extname(new URL(url).pathname) || ''; } catch { return ''; }})();
  const tmpFile = tmp.fileSync({ postfix: extFromUrl || '' });
  const writer = fs.createWriteStream(tmpFile.name);
  const resp = await axios.get(url, { responseType: 'stream' });
  resp.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(tmpFile));
    writer.on('error', reject);
  });
}

async function transcodeToOpusOgg(inputPath) {
  const outPath = path.join(os.tmpdir(), `voice_${Date.now()}.ogg`);
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1).audioFrequency(16000).audioCodec('libopus')
      .audioBitrate('32k').format('ogg')
      .on('error', reject)
      .on('end', resolve)
      .save(outPath);
  });
  try {
    const size = fs.statSync(outPath).size;
    console.log('[FFMPEG] OGG gerado com', size, 'bytes');
  } catch (e) { console.warn('[FFMPEG] stat OGG:', e?.message || e); }
  return outPath;
}

function guessIsAudio(mediaType, fileName) {
  const mt = String(mediaType || '').toLowerCase();
  const ext = (fileName ? path.extname(fileName) : '').toLowerCase();
  return mt.startsWith('audio/') || ['.webm','.ogg','.m4a','.mp3','.wav','.aac','.amr','.3gp'].includes(ext);
}

function makeWaId(toRaw) { 
  if (String(toRaw).includes('@')) return String(toRaw); 
  return `${String(toRaw).replace(/\D/g,'')}@c.us`; 
}

async function safePush(ref, data) { 
  try { await ref.push(data); } catch (e) { console.warn('[WARN] RTDB push falhou:', e?.message || e); } 
}

async function safeUpload(bucket, localPath, remotePath, contentType) {
  try {
    await bucket.upload(localPath, { destination: remotePath, metadata: { contentType } });
    const file = bucket.file(remotePath);
    const [signedUrl] = await file.getSignedUrl({ action:'read', expires: '03-09-2491' });
    return signedUrl;
  } catch (e) {
    console.warn('[WARN] upload falhou:', e?.message || e);
    return null;
  }
}

// Retry para envios de mídia (mitiga "Evaluation failed" intermitente)
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
// 🚀 FUNÇÃO PARA ENVIAR WEBHOOK PARA O ERP (NOVA FUNÇÃO)
// =====================================================================
async function sendToERPWebhook(messageData) {
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
      timeout: 10000, // 10 segundos
    });

    if (response.status === 200) {
      console.log(`[WEBHOOK] ✅ Sucesso! Mensagem enviada para ERP:`, messageData.messageId);
      return true;
    } else {
      console.warn(`[WEBHOOK] ⚠️ Resposta inesperada do ERP:`, response.status, response.data);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`[WEBHOOK] ❌ ERP não está acessível. Verifique se está online.`);
    } else if (error.response?.status === 401) {
      console.error(`[WEBHOOK] ❌ Token de autorização inválido. Verifique ERP_WEBHOOK_TOKEN.`);
    } else if (error.response?.status === 400) {
      console.error(`[WEBHOOK] ❌ Dados inválidos enviados ao ERP:`, error.response.data);
    } else {
      console.error(`[WEBHOOK] ❌ Erro ao enviar para ERP:`, {
        messageId: messageData.messageId,
        phone: messageData.phone,
        error: error.response?.data || error.message
      });
    }
    return false;
  }
}

// ---------------------- Eventos de conexão ---------------------------
client.on('qr', async (qr) => {
  try {
    console.log('QR Code recebido, gerando imagem...');
    qrCodeDataUrl = await qrcode.toDataURL(qr);
    clientStatus = 'Aguardando escaneamento do QR Code.';
  } catch (e) { console.error('Erro ao gerar QR Code:', e); }
});

client.on('ready', () => { 
  console.log('Cliente do WhatsApp está pronto e conectado!'); 
  qrCodeDataUrl = ''; 
  clientStatus = 'Conectado';
});

client.on('auth_failure', (msg) => { 
  console.error('Falha de autenticação:', msg); 
  clientStatus = 'Falha de autenticação'; 
});

client.on('disconnected', (reason) => {
  console.warn('WhatsApp desconectado:', reason);
  clientStatus = `Desconectado: ${reason || 'motivo não informado'}`;
  client.initialize().catch((err) => console.error('Erro ao reinicializar cliente:', err));
});

client.initialize().catch((err) => { 
  console.error('ERRO AO INICIALIZAR O CLIENTE:', err); 
  clientStatus = `Erro na inicialização: ${err.message}`; 
});

// ======================================================================
// 🚀 EVENTO DE RECEBIMENTO COM INTEGRAÇÃO WEBHOOK (MODIFICADO)
// ======================================================================
client.on('message', async (message) => {
  console.log(`[RECEBIMENTO] Nova mensagem recebida de: ${message.from}`);
  const sanitizedFrom = message.from.split('@')[0];
  const chatRef = db.ref(`erp/whatsapp/conversas/${sanitizedFrom}`);

  let messageData = { fromMe: false, timestamp: message.timestamp * 1000 };
  
  try {
    if (message.hasMedia) {
      console.log('[RECEBIMENTO] Mensagem com mídia detectada. Iniciando download...');
      const media = await message.downloadMedia();

      if (media) {
        console.log('[RECEBIMENTO] Download da mídia concluído. Detalhes:', {
            mimetype: media.mimetype,
            filename: media.filename,
            size: media.size
        });

        const bucket = admin.storage().bucket();
        const filenameOnly = media.filename || `audio_${Date.now()}.ogg`;
        const pathInBucket = `erp/whatsapp/${sanitizedFrom}/${Date.now()}_${filenameOnly}`;
        const file = bucket.file(pathInBucket);

        console.log(`[RECEBIMENTO] Preparando para salvar no Storage em: ${pathInBucket}`);
        const buffer = Buffer.from(media.data, 'base64');
        await file.save(buffer, { metadata: { contentType: media.mimetype } });

        console.log('[RECEBIMENTO] Mídia salva no Storage com sucesso.');

        const [signedUrl] = await file.getSignedUrl({ action:'read', expires: '03-09-2491' });
        console.log('[RECEBIMENTO] URL de download gerada:', signedUrl ? 'Sim' : 'Não, FALHOU AQUI!');
        
        messageData.type = (media.mimetype && media.mimetype.split('/')[0]) || 'file';
        messageData.url = signedUrl;
        messageData.filename = filenameOnly;
        messageData.body = message.body || ''; // Legenda da mídia
      } else {
        console.warn('[RECEBIMENTO AVISO] message.hasMedia era true, mas downloadMedia() retornou nulo.');
        messageData.type = 'text';
        messageData.body = `(Mídia recebida não pôde ser processada: ${message.type})`;
      }
    } else {
      messageData.type = 'text';
      messageData.body = message.body || '';
    }

    // Salvar no Firebase
    await chatRef.push(messageData);
    console.log(`[RECEBIMENTO] Mensagem de ${sanitizedFrom} salva no Firebase com sucesso.`);

    // =====================================================================
    // 🚀 ENVIAR PARA O WEBHOOK DO ERP (NOVA INTEGRAÇÃO)
    // =====================================================================
    try {
      // Obter nome do contato
      const contact = await message.getContact();
      const contactName = contact?.pushname || contact?.name || `Usuario ${sanitizedFrom}`;

      // Preparar payload para webhook
      const webhookPayload = {
        phone: message.from,
        name: contactName,
        message: messageData.type === 'text' 
          ? (messageData.body || '') 
          : `[${messageData.type.toUpperCase()}] ${messageData.filename || 'Mídia'}`,
        messageId: message.id._serialized || `msg_${Date.now()}`,
        type: messageData.type || 'text',
        timestamp: new Date(messageData.timestamp).toISOString(),
        // Campos extras para mídia
        ...(messageData.url && { 
          mediaUrl: messageData.url,
          filename: messageData.filename,
          mimetype: messageData.mimetype || ''
        })
      };
      
      console.log(`[WEBHOOK] 🔄 Preparando envio para ERP...`);
      
      // Envio assíncrono (não bloqueia o processo principal)
      sendToERPWebhook(webhookPayload).catch(err => 
        console.error('[WEBHOOK] ❌ Falha crítica no envio:', err.message)
      );

    } catch (webhookError) {
      console.error('[WEBHOOK] ❌ Erro ao preparar dados do webhook:', webhookError.message);
    }

  } catch (error) {
    console.error('[RECEBIMENTO ERRO FATAL] Ocorreu um erro grave ao processar a mensagem recebida:', error);
    
    // Mesmo em caso de erro, tentamos salvar um log no chat para não perder a mensagem
    try {
        await chatRef.push({
          fromMe: false,
          type: 'error',
          body: `[ERRO] Mensagem não pôde ser processada: ${error.message}`,
          timestamp: message.timestamp * 1000,
          originalError: String(error)
        });
        console.log(`[RECEBIMENTO] Log de erro salvo para ${sanitizedFrom}`);
    } catch (saveErrorLog) {
        console.error('[RECEBIMENTO] Nem conseguiu salvar o log de erro:', saveErrorLog);
    }
  }
});

// ---------------------- Rotas da API ---------------------------------
// Status e QR Code
app.get('/qr', (req, res) => {
  res.json({ qr: qrCodeDataUrl, status: clientStatus });
});

app.get('/status', (req, res) => {
  const isReady = client.info ? true : false;
  res.json({
    status: clientStatus,
    ready: isReady,
    info: client.info || null
  });
});

// Enviar mensagem
app.post('/send-message', async (req, res) => {
  try {
    const { phone, message, mediaUrl, mediaType, filename } = req.body;
    
    if (!phone || (!message && !mediaUrl)) {
      return res.status(400).json({ error: 'Telefone e mensagem/mídia são obrigatórios' });
    }

    const waId = makeWaId(phone);
    const dupKey = `send_${waId}_${message?.slice(0,20) || 'media'}_${Date.now()}`;
    
    if (isDuplicateKey(dupKey)) {
      console.log('[SEND] Possível duplicata ignorada:', dupKey);
      return res.json({ success: true, messageId: 'duplicate_ignored' });
    }

    let result;

    if (mediaUrl) {
      // Envio de mídia
      console.log(`[SEND] Preparando mídia para ${waId}:`, mediaUrl);
      
      if (guessIsAudio(mediaType, filename)) {
        // Áudio especial (converter para OGG)
        const tempFile = await downloadToTemp(mediaUrl, filename);
        const oggPath = await transcodeToOpusOgg(tempFile.name);
        const media = MessageMedia.fromFilePath(oggPath);
        media.filename = filename || 'audio.ogg';
        
        result = await sendWithRetry(waId, media, { sendAudioAsVoice: true });
        
        tempFile.removeCallback();
        fs.unlinkSync(oggPath);
      } else {
        // Outras mídias
        const media = await MessageMedia.fromUrl(mediaUrl);
        if (filename) media.filename = filename;
        result = await sendWithRetry(waId, media);
      }
    } else {
      // Mensagem de texto
      result = await sendWithRetry(waId, message);
    }

    console.log(`[SEND] ✅ Mensagem enviada para ${waId}:`, result.id._serialized);
    res.json({ success: true, messageId: result.id._serialized });

  } catch (error) {
    console.error('[SEND] ❌ Erro ao enviar mensagem:', error);
    res.status(500).json({ error: error.message });
  }
});

// Idempotência simples
const recentSends = new Map();
function isDuplicateKey(key) {
  const now = Date.now();
  const prev = recentSends.get(key);
  if (prev && now - prev < 120000) return true;
  recentSends.set(key, now);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [k,v] of recentSends) if (now - v > 120000) recentSends.delete(k);
}, 60000);

// ---------------------- Inicializar Servidor -------------------------
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📱 WhatsApp Server iniciado com integração ERP`);
  console.log(`🔗 Webhook ERP: ${ERP_WEBHOOK_URL}`);
});

// =====================================================================
// FIM DO ARQUIVO - SERVIDOR WHATSAPP COM INTEGRAÇÃO WEBHOOK ERP
// =====================================================================