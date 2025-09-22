import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use Neon WebSocket for development (localhost/Replit) and regular pg for production
const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true' || process.env.DATABASE_URL.includes('render.com');
const isRailway = process.env.DATABASE_URL.includes('railway.net') || process.env.DATABASE_URL.includes('railway.app') || process.env.DATABASE_URL.includes('rlwy.net');

let pool: any;
let db: any;

if (isProduction || isRender || isRailway) {
  // Production: Use regular PostgreSQL connection (for Render, Railway, etc.)
  console.log('Using PostgreSQL connection for production');
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = pgDrizzle({ client: pool, schema });
} else {
  // Development: Use Neon WebSocket (for Replit development environment)
  console.log('Using Neon WebSocket connection for development');
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = neonDrizzle({ client: pool, schema });
}

export { pool, db };