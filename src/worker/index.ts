import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface D1Database {
  prepare: (query: string) => {
    bind: (...values: any[]) => {
      all: () => Promise<{ results: any[] }>;
      run: () => Promise<any>;
    };
    all: () => Promise<{ results: any[] }>;
    run: () => Promise<any>;
  };
}

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for web and local dev
app.use('*', cors());

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Fortress Authenticator Cloudflare Worker',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'production',
  });
});

// Categories Endpoints
app.get('/api/categories', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json([]);
    }
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM categories ORDER BY created_at ASC'
    ).all();
    return c.json(results || []);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/categories', async (c) => {
  try {
    const body = await c.req.json();
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const userId = body.userId || 'user_default';
    const name = body.name || 'New Category';
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const icon = body.icon || 'folder';
    const color = body.color || '#005ac1';

    if (c.env.DB) {
      await c.env.DB.prepare(
        `INSERT INTO categories (id, user_id, name, slug, icon, color) VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(id, userId, name, slug, icon, color)
        .run();
    }

    return c.json({ id, userId, name, slug, icon, color, isDefault: false }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/categories/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (c.env.DB) {
      await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Tokens Endpoints
app.get('/api/tokens', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json([]);
    }
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM tokens ORDER BY created_at DESC'
    ).all();

    const formatted = (results || []).map((row: any) => ({
      ...row,
      backupCodes: row.backup_codes ? JSON.parse(row.backup_codes) : [],
    }));

    return c.json(formatted);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/tokens', async (c) => {
  try {
    const body = await c.req.json();
    const id = `token_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = body.userId || 'user_default';
    const categoryId = body.categoryId || 'work';
    const issuer = body.issuer || 'Unknown Service';
    const accountName = body.accountName || 'user@fortress.auth';
    const secretKey = body.secretKey || '';
    const algorithm = body.algorithm || 'SHA1';
    const digits = body.digits || 6;
    const period = body.period || 30;
    const iconType = body.iconType || 'shield';
    const notes = body.notes || '';
    const backupCodes = JSON.stringify(body.backupCodes || []);

    if (c.env.DB) {
      await c.env.DB.prepare(
        `INSERT INTO tokens (id, user_id, category_id, issuer, account_name, secret_key, algorithm, digits, period, icon_type, notes, backup_codes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          userId,
          categoryId,
          issuer,
          accountName,
          secretKey,
          algorithm,
          digits,
          period,
          iconType,
          notes,
          backupCodes
        )
        .run();
    }

    return c.json(
      {
        id,
        userId,
        categoryId,
        issuer,
        accountName,
        secretKey,
        algorithm,
        digits,
        period,
        iconType,
        notes,
        backupCodes: body.backupCodes || [],
      },
      201
    );
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/tokens/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (c.env.DB) {
      await c.env.DB.prepare('DELETE FROM tokens WHERE id = ?').bind(id).run();
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
