import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from './storage';

// Credenciais padrão para o sistema
const DEFAULT_USERS = {
  admin: "admin123",
  turismo: "turismo2024"
};

export function getSimpleSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Permite criação automática da tabela
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    store: sessionStore,
    resave: true, // Mudado para true para desenvolvimento
    saveUninitialized: true, // Mudado para true para desenvolvimento
    cookie: {
      httpOnly: false, // Mudado para false para debugging
      secure: false, // Sempre false em desenvolvimento
      sameSite: 'lax',
      maxAge: sessionTtl,
      domain: undefined, // Remove domain restriction
      path: '/', // Explicitamente define o path
    },
  });
}

export async function setupSimpleAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSimpleSession());

  // Login route
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username e password são obrigatórios" });
    }

    if (DEFAULT_USERS[username as keyof typeof DEFAULT_USERS] === password) {
      (req.session as any).user = {
        username,
        isAuthenticated: true,
        loginTime: new Date()
      };
      
      return res.json({ 
        message: "Login realizado com sucesso",
        user: { username }
      });
    }

    return res.status(401).json({ message: "Credenciais inválidas" });
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    const user = (req.session as any)?.user;
    
    if (!user?.isAuthenticated) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json({ 
      username: user.username,
      firstName: user.username, // Para compatibilidade com o frontend
      lastName: "Usuário",
      email: `${user.username}@mundial.com`,
      loginTime: user.loginTime
    });
  });
}

// Middleware de autenticação simples
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    console.log('🔐 Middleware de autenticação executado para:', req.method, req.path);
    
    // Para desenvolvimento, criar/usar usuário admin padrão
    const adminUserId = 'user123';
    
    // Verificar se já existe o usuário admin
    let adminUser = await storage.getUser(adminUserId);
    
    if (!adminUser) {
      // Criar usuário administrador padrão
      console.log('👤 Criando usuário administrador padrão...');
      adminUser = await storage.upsertUser({
        id: adminUserId,
        email: 'admin@mondial.com',
        firstName: 'Sistema',
        lastName: 'Administrador',
        systemRole: 'admin',
        ativo: true
      });
      console.log('✅ Usuário administrador criado:', adminUser.email, 'Role:', adminUser.systemRole);
    } else {
      console.log('👤 Usuário admin já existe:', adminUser.email, 'Role:', adminUser.systemRole);
    }
    
    // Simular autenticação - definir req.user com o admin
    (req as any).user = { 
      id: adminUserId,
      ...adminUser 
    };
    
    console.log('✅ Usuário autenticado:', (req as any).user.id, 'Role:', (req as any).user.systemRole);
    next();
  } catch (error) {
    console.error('❌ Erro no middleware de autenticação:', error);
    res.status(500).json({ message: 'Erro interno no sistema de autenticação' });
  }
};