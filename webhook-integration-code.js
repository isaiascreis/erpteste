// ================================================================================
// CÓDIGO PARA ADICIONAR NO SERVIDOR EXTERNO (render.com) 
// ================================================================================
// Este código deve ser adicionado no final do evento 'message' no index.js

// Configuração do webhook (adicionar no topo do arquivo)
const ERP_WEBHOOK_URL = process.env.ERP_WEBHOOK_URL || 'https://meu-website-klaudioscarvalho.replit.app/api/whatsapp/webhook';
const ERP_WEBHOOK_TOKEN = process.env.ERP_WEBHOOK_TOKEN || 'mondial-webhook-secret';

// ================================================================================
// FUNÇÃO PARA ENVIAR PARA WEBHOOK (adicionar após as outras funções)
// ================================================================================
async function sendToERPWebhook(messageData) {
  try {
    console.log(`[WEBHOOK] Enviando mensagem para ERP:`, { phone: messageData.phone, messageId: messageData.messageId });
    
    const response = await axios.post(ERP_WEBHOOK_URL, messageData, {
      headers: {
        'Authorization': `Bearer ${ERP_WEBHOOK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 segundos
    });

    if (response.status === 200) {
      console.log(`[WEBHOOK] ✅ Mensagem enviada com sucesso para ERP:`, messageData.messageId);
    } else {
      console.warn(`[WEBHOOK] ⚠️ Resposta inesperada do ERP:`, response.status, response.data);
    }
  } catch (error) {
    console.error(`[WEBHOOK] ❌ Erro ao enviar para ERP:`, {
      messageId: messageData.messageId,
      phone: messageData.phone,
      error: error.response?.data || error.message
    });
  }
}

// ================================================================================
// CÓDIGO PARA SUBSTITUIR NO EVENT 'message' (final do bloco try)
// ================================================================================
// SUBSTITUIR esta linha:
//   console.log(`[RECEBIMENTO] Mensagem de ${sanitizedFrom} salva no Firebase com sucesso.`);
//
// POR estas linhas:

    console.log(`[RECEBIMENTO] Mensagem de ${sanitizedFrom} salva no Firebase com sucesso.`);

    // 🚀 ENVIAR PARA O WEBHOOK DO ERP
    const webhookPayload = {
      phone: message.from,
      name: (await message.getContact())?.pushname || `Usuario ${sanitizedFrom}`,
      message: messageData.type === 'text' ? messageData.body : `[${messageData.type.toUpperCase()}] ${messageData.filename || 'Mídia'}`,
      messageId: message.id._serialized || `msg_${Date.now()}`,
      type: messageData.type || 'text',
      timestamp: new Date(messageData.timestamp).toISOString(),
      // Campos extras para mídia
      ...(messageData.url && { 
        mediaUrl: messageData.url,
        filename: messageData.filename 
      })
    };
    
    // Envio assíncrono (não bloqueia o processo principal)
    sendToERPWebhook(webhookPayload).catch(err => 
      console.error('[WEBHOOK] Falha crítica no envio:', err.message)
    );

// ================================================================================
// INSTRUÇÕES DE INSTALAÇÃO
// ================================================================================
/*
1. No servidor render.com, edite o arquivo index.js
2. Adicione as configurações ERP_WEBHOOK_URL e ERP_WEBHOOK_TOKEN no topo
3. Adicione a função sendToERPWebhook após as outras funções
4. Substitua o console.log final no evento 'message' pelo código acima
5. Configure as variáveis de ambiente no render.com:
   - ERP_WEBHOOK_URL: https://meu-website-klaudioscarvalho.replit.app/api/whatsapp/webhook
   - ERP_WEBHOOK_TOKEN: seu-token-seguro-aqui
6. Reinicie o serviço no render.com

Após isso, todas as mensagens recebidas serão automaticamente enviadas para o ERP!
*/