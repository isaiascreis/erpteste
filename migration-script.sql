-- =====================================================
-- SCRIPT DE SINCRONIZAÇÃO BANCO PRODUÇÃO
-- =====================================================
-- Este script cria todas as tabelas e ENUMs necessários
-- para o funcionamento completo do sistema em produção

-- =====================================================
-- 1. CRIAÇÃO DOS ENUMs
-- =====================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'vendedor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sale_status AS ENUM ('orcamento', 'venda', 'cancelada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_type AS ENUM ('pagar', 'receber');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pendente', 'parcial', 'liquidado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE service_type AS ENUM ('aereo', 'hotel', 'transfer', 'outros');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_category_type AS ENUM ('receita', 'despesa', 'outros');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_type_enum AS ENUM ('AGENCIA', 'FORNECEDOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE passenger_role AS ENUM ('passageiro', 'contratante');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE clause_type AS ENUM ('contrato', 'voucher');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CRIAÇÃO DAS TABELAS PRINCIPAIS
-- =====================================================

-- Tabela: payment_methods (CRÍTICA - FALTANDO EM PRODUÇÃO)
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo payment_method_type_enum NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    dias_carencia INTEGER DEFAULT 0,
    percentual_taxa DECIMAL(5,2) DEFAULT 0.00,
    observacoes TEXT
);

-- Tabela: payment_conditions
CREATE TABLE IF NOT EXISTS payment_conditions (
    id SERIAL PRIMARY KEY,
    forma_pagamento_id INTEGER REFERENCES payment_methods(id) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    parcelas INTEGER DEFAULT 1,
    intervalo_dias INTEGER DEFAULT 0,
    percentual_entrada DECIMAL(5,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela: account_categories
CREATE TABLE IF NOT EXISTS account_categories (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo account_category_type NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela: bank_accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    banco VARCHAR(255) NOT NULL,
    agencia VARCHAR(20),
    conta VARCHAR(50) NOT NULL,
    tipo_conta VARCHAR(50) DEFAULT 'corrente',
    saldo_atual DECIMAL(12,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela: contract_clauses
CREATE TABLE IF NOT EXISTS contract_clauses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type clause_type DEFAULT 'contrato' NOT NULL,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela: document_templates
CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'contrato' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela: task_templates
CREATE TABLE IF NOT EXISTS task_templates (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    dias_prazo INTEGER DEFAULT 0,
    prioridade VARCHAR(20) DEFAULT 'media',
    categoria VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela: user_permissions
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    actions TEXT[] DEFAULT '{}',
    granted_by VARCHAR(255),
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    UNIQUE(user_id, resource)
);

-- Tabela: whatsapp_conversations
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    contact_name VARCHAR(255),
    last_message_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    assigned_to VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela: whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES whatsapp_conversations(id) NOT NULL,
    message_id VARCHAR(255) UNIQUE,
    sender_phone VARCHAR(20) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    is_from_business BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'sent',
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. ATUALIZAÇÃO DE TABELAS EXISTENTES
-- =====================================================

-- Atualizar payment_plans para usar nova estrutura
DO $$
BEGIN
    -- Adicionar nova coluna se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_plans' AND column_name = 'forma_pagamento_id') THEN
        ALTER TABLE payment_plans ADD COLUMN forma_pagamento_id INTEGER REFERENCES payment_methods(id);
    END IF;
    
    -- Adicionar nova coluna se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_plans' AND column_name = 'condicao_pagamento_id') THEN
        ALTER TABLE payment_plans ADD COLUMN condicao_pagamento_id INTEGER REFERENCES payment_conditions(id);
    END IF;
END $$;

-- =====================================================
-- 4. CRIAÇÃO DE ÍNDICES IMPORTANTES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_payment_methods_tipo ON payment_methods(tipo);
CREATE INDEX IF NOT EXISTS idx_payment_methods_ativo ON payment_methods(ativo);
CREATE INDEX IF NOT EXISTS idx_payment_conditions_forma_pagamento ON payment_conditions(forma_pagamento_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);

-- =====================================================
-- 5. DADOS INICIAIS (OPCIONAIS)
-- =====================================================

-- Inserir formas de pagamento padrão se não existirem
INSERT INTO payment_methods (nome, tipo, descricao, ativo) 
SELECT 'PIX', 'AGENCIA', 'Pagamento instantâneo via PIX', true
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE nome = 'PIX' AND tipo = 'AGENCIA');

INSERT INTO payment_methods (nome, tipo, descricao, ativo) 
SELECT 'Dinheiro', 'AGENCIA', 'Pagamento em dinheiro', true
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE nome = 'Dinheiro' AND tipo = 'AGENCIA');

INSERT INTO payment_methods (nome, tipo, descricao, ativo) 
SELECT 'Cartão de Crédito', 'AGENCIA', 'Pagamento com cartão de crédito', true
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE nome = 'Cartão de Crédito' AND tipo = 'AGENCIA');

INSERT INTO payment_methods (nome, tipo, descricao, ativo) 
SELECT 'Boleto', 'AGENCIA', 'Pagamento por boleto bancário', true
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE nome = 'Boleto' AND tipo = 'AGENCIA');

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================