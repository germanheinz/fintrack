import * as SQLite from 'expo-sqlite';

let _db = null;

const getDb = async () => {
  if (!_db) _db = await SQLite.openDatabaseAsync('fintrack.db');
  return _db;
};

export const initDb = async () => {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      type TEXT NOT NULL,
      user_id TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
};

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const hashPassword = async (password) => {
  // Simple hash for local use — not cryptographic but good enough for local auth
  let hash = 0;
  const str = password + 'fintrack_salt_2024';
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return String(Math.abs(hash));
};

// ── Users ──────────────────────────────────────────────────────────────────

export const registerUser = async (name, email, password) => {
  const db = await getDb();
  const existing = await db.getFirstAsync('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) throw new Error('Email already in use');

  const id = uuid();
  const hashed = await hashPassword(password);
  await db.runAsync(
    'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
    [id, name, email, hashed]
  );

  await createDefaultCategories(db, id);
  return { id, name, email };
};

export const loginUser = async (email, password) => {
  const db = await getDb();
  const user = await db.getFirstAsync('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) throw new Error('User not found');

  const hashed = await hashPassword(password);
  if (user.password !== hashed) throw new Error('Invalid password');

  return { id: user.id, name: user.name, email: user.email };
};

export const getUserById = async (id) => {
  const db = await getDb();
  return db.getFirstAsync('SELECT id, name, email FROM users WHERE id = ?', [id]);
};

// ── Default categories ─────────────────────────────────────────────────────

const createDefaultCategories = async (db, userId) => {
  const defaults = [
    { name: 'Salary',          icon: '💼', color: '#4CAF50', type: 'INCOME'  },
    { name: 'Freelance',       icon: '💻', color: '#2196F3', type: 'INCOME'  },
    { name: 'Investments',     icon: '📈', color: '#9C27B0', type: 'INCOME'  },
    { name: 'Side Income',     icon: '🤝', color: '#00BCD4', type: 'INCOME'  },
    { name: 'Other Income',    icon: '💰', color: '#8BC34A', type: 'INCOME'  },
    { name: 'Rent / Mortgage', icon: '🏠', color: '#3F51B5', type: 'EXPENSE' },
    { name: 'Groceries',       icon: '🛒', color: '#F44336', type: 'EXPENSE' },
    { name: 'Restaurants',     icon: '🍽️', color: '#FF5722', type: 'EXPENSE' },
    { name: 'Transport',       icon: '🚗', color: '#FF9800', type: 'EXPENSE' },
    { name: 'Fuel',            icon: '⛽', color: '#FFC107', type: 'EXPENSE' },
    { name: 'Utilities',       icon: '💡', color: '#607D8B', type: 'EXPENSE' },
    { name: 'Subscriptions',   icon: '📱', color: '#9C27B0', type: 'EXPENSE' },
    { name: 'Health',          icon: '🏥', color: '#00BCD4', type: 'EXPENSE' },
    { name: 'Pharmacy',        icon: '💊', color: '#E91E63', type: 'EXPENSE' },
    { name: 'Clothing',        icon: '👕', color: '#795548', type: 'EXPENSE' },
    { name: 'Entertainment',   icon: '🎬', color: '#E91E63', type: 'EXPENSE' },
    { name: 'Travel',          icon: '✈️', color: '#03A9F4', type: 'EXPENSE' },
    { name: 'Education',       icon: '📚', color: '#673AB7', type: 'EXPENSE' },
    { name: 'Other',           icon: '📦', color: '#9E9E9E', type: 'EXPENSE' },
  ];
  for (const cat of defaults) {
    await db.runAsync(
      'INSERT INTO categories (id, name, icon, color, type, user_id, is_default) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [uuid(), cat.name, cat.icon, cat.color, cat.type, userId]
    );
  }
};

// ── Categories ─────────────────────────────────────────────────────────────

export const getCategories = async (userId) => {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM categories WHERE user_id = ? ORDER BY type, name',
    [userId]
  );
};

export const createCategory = async (userId, { name, icon, color, type }) => {
  const db = await getDb();
  const id = uuid();
  await db.runAsync(
    'INSERT INTO categories (id, name, icon, color, type, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, icon, color, type, userId]
  );
  return { id, name, icon, color, type, user_id: userId };
};

export const updateCategory = async (userId, categoryId, { name, icon, color }) => {
  const db = await getDb();
  await db.runAsync(
    'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ? AND user_id = ?',
    [name, icon, color, categoryId, userId]
  );
  return { id: categoryId, name, icon, color, user_id: userId };
};

export const deleteCategory = async (userId, categoryId) => {
  const db = await getDb();
  const used = await db.getFirstAsync(
    'SELECT id FROM transactions WHERE category_id = ? AND user_id = ? LIMIT 1',
    [categoryId, userId]
  );
  if (used) throw new Error('Category has transactions and cannot be deleted');
  await db.runAsync(
    'DELETE FROM categories WHERE id = ? AND user_id = ?',
    [categoryId, userId]
  );
};

// ── Transactions ───────────────────────────────────────────────────────────

export const getTransactions = async (userId, { month, year, type, categoryId } = {}) => {
  const db = await getDb();
  let sql = `
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
  `;
  const params = [userId];

  if (month) { sql += ' AND CAST(strftime("%m", t.date) AS INTEGER) = ?'; params.push(month); }
  if (year)  { sql += ' AND CAST(strftime("%Y", t.date) AS INTEGER) = ?'; params.push(year); }
  if (type)  { sql += ' AND t.type = ?'; params.push(type); }
  if (categoryId) { sql += ' AND t.category_id = ?'; params.push(categoryId); }

  sql += ' ORDER BY t.date DESC, t.created_at DESC';

  const rows = await db.getAllAsync(sql, params);
  return rows.map(mapTransaction);
};

export const createTransaction = async (userId, { amount, description, date, type, categoryId }) => {
  const db = await getDb();
  const id = uuid();
  await db.runAsync(
    'INSERT INTO transactions (id, amount, description, date, type, category_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, amount, description || '', date, type, categoryId, userId]
  );
  return getTransactionById(userId, id);
};

export const updateTransaction = async (userId, id, { amount, description, date, type, categoryId }) => {
  const db = await getDb();
  await db.runAsync(
    'UPDATE transactions SET amount=?, description=?, date=?, type=?, category_id=? WHERE id=? AND user_id=?',
    [amount, description || '', date, type, categoryId, id, userId]
  );
  return getTransactionById(userId, id);
};

export const deleteTransaction = async (userId, id) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
};

export const getTransactionById = async (userId, id) => {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM transactions t JOIN categories c ON t.category_id = c.id
     WHERE t.id = ? AND t.user_id = ?`,
    [id, userId]
  );
  return row ? mapTransaction(row) : null;
};

const mapTransaction = (row) => ({
  id:          row.id,
  amount:      row.amount,
  description: row.description,
  date:        row.date,
  type:        row.type,
  categoryId:  row.category_id,
  category: {
    id:    row.category_id,
    name:  row.category_name,
    icon:  row.category_icon,
    color: row.category_color,
  },
  createdAt: row.created_at,
});

// ── Monthly summary ────────────────────────────────────────────────────────

export const getMonthlySummary = async (userId, month, year) => {
  const txs = await getTransactions(userId, { month, year });

  const totalIncome   = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance       = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  // Group expenses by category
  const catMap = {};
  txs.filter(t => t.type === 'EXPENSE').forEach((t) => {
    const key = t.categoryId;
    if (!catMap[key]) catMap[key] = { ...t.category, total: 0 };
    catMap[key].total += t.amount;
  });

  const expensesByCategory = Object.values(catMap)
    .map((c) => ({
      categoryId:    c.id,
      categoryName:  c.name,
      categoryIcon:  c.icon,
      categoryColor: c.color,
      total:         c.total,
      percentage:    totalExpenses > 0 ? (c.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    transactionCount: txs.length,
    expensesByCategory,
  };
};

// ── Backup: export / import ─────────────────────────────────────────────────

const BACKUP_VERSION = 1;

export const exportUserData = async (userId) => {
  const db = await getDb();
  const user = await db.getFirstAsync(
    'SELECT name, email FROM users WHERE id = ?',
    [userId]
  );
  const categories = await db.getAllAsync(
    'SELECT id, name, icon, color, type, is_default FROM categories WHERE user_id = ?',
    [userId]
  );
  const transactions = await db.getAllAsync(
    'SELECT id, amount, description, date, type, category_id, created_at FROM transactions WHERE user_id = ?',
    [userId]
  );
  return {
    app: 'fintrack',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    user,
    categories,
    transactions,
  };
};

export const importUserData = async (userId, data) => {
  if (!data || data.app !== 'fintrack' || !Array.isArray(data.categories) || !Array.isArray(data.transactions)) {
    throw new Error('Invalid backup file');
  }

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions WHERE user_id = ?', [userId]);
    await db.runAsync('DELETE FROM categories WHERE user_id = ?', [userId]);

    for (const c of data.categories) {
      await db.runAsync(
        'INSERT INTO categories (id, name, icon, color, type, user_id, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.icon, c.color, c.type, userId, c.is_default ? 1 : 0]
      );
    }
    for (const t of data.transactions) {
      await db.runAsync(
        'INSERT INTO transactions (id, amount, description, date, type, category_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.amount, t.description || '', t.date, t.type, t.category_id, userId, t.created_at || new Date().toISOString()]
      );
    }
  });

  return {
    categories: data.categories.length,
    transactions: data.transactions.length,
  };
};
