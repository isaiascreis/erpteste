import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";

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

// Middleware de autenticação
// TEMPORARIAMENTE REMOVIDO - Sistema sem login
export const isAuthenticated: RequestHandler = (req, res, next) => {
  // Passa direto sem verificar autenticação
  next();
};