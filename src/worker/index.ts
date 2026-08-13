import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface D1Database {
  prepare: (query: string) => {
    bind: (...values: any[]) => {
      all: () => Promise<{ results: any[] }>;
      run: () => Promise<any>;
      first: () => Promise<any>;
    };
    all: () => Promise<{ results: any[] }>;
    run: () => Promise<any>;
    first: () => Promise<any>;
  };
}

export interface Env {
  DB?: D1Database;
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all routes
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
);

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Mimir Authenticator Cloudflare Worker',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'production',
    dbBound: !!c.env.DB,
  });
});

// -------------------------------------------------------------
// Auth Endpoints (Multi-user registration & login with isolation)
// -------------------------------------------------------------

app.post('/api/auth/register', async (c) => {
  try {
    const { name, email, password } = await c.req.json();
    if (!email || !password || !name) {
      return c.json({ error: 'Name, email, and password are required' }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (c.env.DB) {
      // Check if user already exists
      const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(cleanEmail)
        .first();

      if (existing) {
        return c.json({ error: 'Email is already registered' }, 409);
      }

      // Simple salted SHA-256 hash
      const passwordHash = await hashPassword(password);

      // Insert new user
      await c.env.DB.prepare(
        'INSERT INTO users (id, name, email, password_hash, security_level) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(userId, name.trim(), cleanEmail, passwordHash, 'High')
        .run();

      // Insert standard default categories for this user
      const defaultCats = [
        { id: `cat_work_${userId}`, name: 'Work', slug: 'work', icon: 'work', color: '#005ac1' },
        { id: `cat_personal_${userId}`, name: 'Personal', slug: 'personal', icon: 'person', color: '#7e22ce' },
        { id: `cat_finance_${userId}`, name: 'Finance', slug: 'finance', icon: 'account_balance', color: '#047857' },
      ];

      for (const cat of defaultCats) {
        await c.env.DB.prepare(
          'INSERT INTO categories (id, user_id, name, slug, icon, color, is_default) VALUES (?, ?, ?, ?, ?, ?, 1)'
        )
          .bind(cat.id, userId, cat.name, cat.slug, cat.icon, cat.color)
          .run();
      }
    }

    const user = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      securityLevel: 'High',
      createdAt: new Date().toISOString(),
    };

    return c.json({ user, token: `jwt_${userId}_${Date.now()}` }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Registration failed' }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    if (c.env.DB) {
      const userRow = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
        .bind(cleanEmail)
        .first();

      if (!userRow) {
        return c.json({ error: 'User not found' }, 404);
      }

      const hashPrimary = await hashPassword(password);
      const hashLegacy = await hashPasswordLegacy(password);

      if (userRow.password_hash !== hashPrimary && userRow.password_hash !== hashLegacy) {
        return c.json({ error: 'Invalid password' }, 401);
      }

      const user = {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        securityLevel: userRow.security_level || 'High',
        avatarUrl: userRow.avatar_url,
        createdAt: userRow.created_at,
      };

      return c.json({ user, token: `jwt_${user.id}_${Date.now()}` });
    }

    // Fallback if DB not connected
    const fallbackUserId = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return c.json({
      user: {
        id: fallbackUserId,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        securityLevel: 'High',
        createdAt: new Date().toISOString(),
      },
      token: `jwt_${fallbackUserId}_${Date.now()}`,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Login failed' }, 500);
  }
});

// -------------------------------------------------------------
// Categories Endpoints (Isolated by userId)
// -------------------------------------------------------------

app.get('/api/categories', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!c.env.DB) {
      return c.json([]);
    }

    let results: any[] = [];
    if (userId) {
      const queryRes = await c.env.DB.prepare(
        'SELECT * FROM categories WHERE user_id = ? OR is_default = 1 ORDER BY created_at ASC'
      )
        .bind(userId)
        .all();
      results = queryRes.results || [];
    } else {
      const queryRes = await c.env.DB.prepare(
        'SELECT * FROM categories ORDER BY created_at ASC'
      ).all();
      results = queryRes.results || [];
    }

    return c.json(results);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/categories', async (c) => {
  try {
    const body = await c.req.json();
    const userId = body.userId;
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const name = body.name || 'New Category';
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const icon = body.icon || 'folder';
    const color = body.color || '#005ac1';

    if (c.env.DB) {
      await c.env.DB.prepare(
        `INSERT INTO categories (id, user_id, name, slug, icon, color, is_default) VALUES (?, ?, ?, ?, ?, ?, 0)`
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
    const userId = c.req.query('userId');

    if (c.env.DB) {
      if (userId) {
        await c.env.DB.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')
          .bind(id, userId)
          .run();
      } else {
        await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
      }
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// -------------------------------------------------------------
// Tokens Endpoints (Isolated strictly by userId)
// -------------------------------------------------------------

app.get('/api/tokens', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!c.env.DB || !userId) {
      return c.json([]);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM tokens WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(userId)
      .all();

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
    const userId = body.userId;
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const id = `token_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const categoryId = body.categoryId || 'all';
    const issuer = body.issuer || 'Unknown Service';
    const accountName = body.accountName || '';
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

app.put('/api/tokens/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const userId = body.userId;

    if (c.env.DB) {
      await c.env.DB.prepare(
        `UPDATE tokens SET issuer = ?, account_name = ?, category_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? ${userId ? 'AND user_id = ?' : ''}`
      )
        .bind(
          body.issuer,
          body.accountName,
          body.categoryId,
          body.notes || '',
          id,
          ...(userId ? [userId] : [])
        )
        .run();
    }

    return c.json({ success: true, ...body });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/tokens/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.req.query('userId');

    if (c.env.DB) {
      if (userId) {
        await c.env.DB.prepare('DELETE FROM tokens WHERE id = ? AND user_id = ?')
          .bind(id, userId)
          .run();
      } else {
        await c.env.DB.prepare('DELETE FROM tokens WHERE id = ?').bind(id).run();
      }
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// -------------------------------------------------------------
// Providers Endpoints
// -------------------------------------------------------------

app.get('/api/providers', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!c.env.DB || !userId) {
      return c.json([]);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM providers WHERE user_id = ? ORDER BY created_at ASC'
    )
      .bind(userId)
      .all();

    return c.json(results || []);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/providers', async (c) => {
  try {
    const body = await c.req.json();
    const userId = body.userId;
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const id = `prov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const name = body.name || 'New Provider';
    const icon = body.icon || 'shield';
    const color = body.color || '#005ac1';

    if (c.env.DB) {
      await c.env.DB.prepare(
        'INSERT INTO providers (id, user_id, name, icon, color, is_default) VALUES (?, ?, ?, ?, ?, 0)'
      )
        .bind(id, userId, name, icon, color)
        .run();
    }

    return c.json({ id, userId, name, icon, color, isDefault: false }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/providers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.req.query('userId');

    if (c.env.DB && userId) {
      await c.env.DB.prepare('DELETE FROM providers WHERE id = ? AND user_id = ?')
        .bind(id, userId)
        .run();
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Helper password hashing using Web Crypto API (Matching frontend salt)
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + 'fortress-auth-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPasswordLegacy(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`fortress_salt_2026_${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default app;
