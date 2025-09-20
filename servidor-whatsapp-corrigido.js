// =====================================================================
// SERVIDOR WHATSAPP PARA RENDER.COM - COM INTEGRAÇÃO ERP WEBHOOK
// Versão Corrigida - Sistema ERP Mondial Turismo
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
const ERP_WEBHOOK_URL = process.env.ERP_WEBHOOK_URL || 'https://erpteste.onrender.com/api/whatsapp/webhook';
const ERP_WEBHOOK_TOKEN = process.env.ERP_WEBHOOK_TOKEN || 'mondial-webhook-secret';

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
// 📞 CONFIGURAÇÃO CLIENTE WHATSAPP
// =====================================================================
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
// 🚀 FUNÇÃO WEBHOOK ERP (CORRIGIDA E MELHORADA)
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
      timeout: 15000, // 15 segundos
      maxRedirects: 3,
    });

    if (response.status === 200) {
      console.log(`[WEBHOOK] ✅ Sucesso! Mensagem enviada para ERP:`, messageData.messageId);
      return true;
    } else {
      console.warn(`[WEBHOOK] ⚠️ Resposta inesperada do ERP:`, response.status, response.data);
      return false;
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
    return false;
  }
}

// =====================================================================
// 📡 EVENTOS DE CONEXÃO WHATSAPP
// =====================================================================
client.on('qr', async (qr) => {
  try {
    console.log('📱 QR Code recebido, gerando imagem...');
    qrCodeDataUrl = await qrcode.toDataURL(qr);
    clientStatus = 'Aguardando escaneamento do QR Code.';
    console.log('✅ QR Code gerado com sucesso');
  } catch (e) { 
    console.error('❌ Erro ao gerar QR Code:', e); 
  }
});

client.on('ready', () => { 
  console.log('✅ Cliente do WhatsApp está pronto e conectado!'); 
  qrCodeDataUrl = ''; 
  clientStatus = 'Conectado';
});

client.on('auth_failure', (msg) => { 
  console.error('❌ Falha de autenticação:', msg); 
  clientStatus = 'Falha de autenticação'; 
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ WhatsApp desconectado:', reason);
  clientStatus = `Desconectado: ${reason || 'motivo não informado'}`;
  
  // Reconnect com delay
  setTimeout(() => {
    console.log('🔄 Tentando reconectar...');
    client.initialize().catch((err) => 
      console.error('❌ Erro ao reinicializar cliente:', err)
    );
  }, 5000);
});

// Inicializar cliente
console.log('🚀 Inicializando cliente WhatsApp...');
client.initialize().catch((err) => { 
  console.error('❌ ERRO AO INICIALIZAR O CLIENTE:', err); 
  clientStatus = `Erro na inicialização: ${err.message}`; 
});

// =====================================================================
// 📨 EVENTO DE RECEBIMENTO DE MENSAGENS (CORRIGIDO)
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
    // Processar mídia se existir
    if (message.hasMedia) {
      console.log('[RECEBIMENTO] 📎 Mensagem com mídia detectada. Iniciando download...');
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
        
        messageData.type = (media.mimetype && media.mimetype.split('/')[0]) || 'file';
        messageData.url = signedUrl;
        messageData.filename = filenameOnly;
        messageData.mimetype = media.mimetype;
        messageData.body = message.body || ''; // Legenda da mídia
        
        console.log('[RECEBIMENTO] ✅ URL de download gerada');
      } else {
        console.warn('[RECEBIMENTO] ⚠️ hasMedia = true, mas downloadMedia() retornou nulo');
        messageData.type = 'text';
        messageData.body = `(Mídia recebida não pôde ser processada: ${message.type})`;
      }
    } else {
      messageData.type = 'text';
      messageData.body = message.body || '';
    }

    // Salvar no Firebase
    await chatRef.push(messageData);
    console.log(`[RECEBIMENTO] ✅ Mensagem de ${sanitizedFrom} salva no Firebase`);

    // =====================================================================
    // 🚀 INTEGRAÇÃO WEBHOOK ERP (MELHORADA)
    // =====================================================================
    try {
      // Obter informações do contato
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
      
      // Envio assíncrono com tratamento de erro melhorado
      sendToERPWebhook(webhookPayload)
        .then(success => {
          if (success) {
            console.log(`[WEBHOOK] ✅ Integração ERP concluída com sucesso`);
          } else {
            console.warn(`[WEBHOOK] ⚠️ Falha na integração ERP, mas sistema continua operacional`);
          }
        })
        .catch(err => {
          console.error('[WEBHOOK] ❌ Erro crítico no webhook:', err.message);
          // Sistema continua funcionando mesmo com falha no webhook
        });

    } catch (webhookError) {
      console.error('[WEBHOOK] ❌ Erro ao preparar webhook:', webhookError.message);
      // Sistema continua operacional mesmo com falha no webhook
    }

  } catch (messageError) {
    console.error('[RECEBIMENTO] ❌ Erro ao processar mensagem:', messageError.message);
    
    // Salvar mensagem de erro no Firebase
    try {
      await chatRef.push({
        fromMe: false,
        timestamp: Date.now(),
        type: 'error',
        body: `Erro ao processar mensagem: ${messageError.message}`,
        error: true
      });
    } catch (fbError) {
      console.error('[RECEBIMENTO] ❌ Falha ao salvar erro no Firebase:', fbError.message);
    }
  }
});

// =====================================================================
// 📡 ROTAS API DO SERVIDOR
// =====================================================================

// Rota para verificar status
app.get('/status', (req, res) => {
  res.json({
    status: clientStatus,
    timestamp: new Date().toISOString(),
    webhook: {
      url: ERP_WEBHOOK_URL,
      tokenConfigured: !!ERP_WEBHOOK_TOKEN
    }
  });
});

// Rota para obter QR Code
app.get('/qr', (req, res) => {
  if (qrCodeDataUrl) {
    res.json({ qrCode: qrCodeDataUrl, status: clientStatus });
  } else {
    res.json({ message: 'QR Code não disponível', status: clientStatus });
  }
});

// Rota para enviar mensagem
app.post('/send', async (req, res) => {
  try {
    const { to, message, mediaUrl } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Campos "to" e "message" são obrigatórios' });
    }

    const waId = makeWaId(to);
    let result;

    if (mediaUrl) {
      // Enviar mídia
      console.log(`[ENVIO] 📎 Enviando mídia para ${waId}`);
      const tmpFile = await downloadToTemp(mediaUrl);
      const media = MessageMedia.fromFilePath(tmpFile.name);
      result = await sendWithRetry(waId, media, { caption: message });
      
      // Limpar arquivo temporário
      fs.unlinkSync(tmpFile.name);
    } else {
      // Enviar texto
      console.log(`[ENVIO] 💬 Enviando texto para ${waId}`);
      result = await sendWithRetry(waId, message);
    }

    console.log(`[ENVIO] ✅ Mensagem enviada com sucesso para ${waId}`);
    res.json({ 
      success: true, 
      messageId: result.id._serialized,
      to: waId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ENVIO] ❌ Erro ao enviar mensagem:', error.message);
    res.status(500).json({ 
      error: 'Falha ao enviar mensagem', 
      details: error.message 
    });
  }
});

// Rota para testar webhook
app.post('/test-webhook', async (req, res) => {
  try {
    const testPayload = {
      phone: '5511999999999@c.us',
      name: 'Teste Sistema',
      message: 'Mensagem de teste do webhook',
      messageId: `test_${Date.now()}`,
      type: 'text',
      timestamp: new Date().toISOString()
    };

    const success = await sendToERPWebhook(testPayload);
    
    res.json({
      success,
      message: success ? 'Webhook testado com sucesso' : 'Falha no teste do webhook',
      payload: testPayload
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR
// =====================================================================
app.listen(port, () => {
  console.log('🚀 ==============================================');
  console.log('📱 SERVIDOR WHATSAPP MONDIAL TURISMO');
  console.log('🚀 ==============================================');
  console.log(`🌐 Servidor rodando na porta: ${port}`);
  console.log(`📡 Webhook ERP: ${ERP_WEBHOOK_URL}`);
  console.log(`🔑 Token configurado: ${ERP_WEBHOOK_TOKEN ? 'Sim' : 'Não'}`);
  console.log('🚀 ==============================================');
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT. Desconectando cliente WhatsApp...');
  client.destroy().then(() => {
    console.log('✅ Cliente WhatsApp desconectado. Encerrando servidor...');
    process.exit(0);
  });
});

console.log('✅ Servidor WhatsApp inicializado com sucesso!');