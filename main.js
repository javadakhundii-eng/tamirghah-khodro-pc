const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { createDatabase } = require('./database/db');

let db;
const money = (value) => Number(value || 0);
const stamp = () => new Date().toISOString();

function dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const one = (sql, ...args) => db.prepare(sql).get(...args)?.value || 0;
  return {
    salesToday: one("SELECT COALESCE(SUM(total),0) value FROM sales WHERE created_at LIKE ?", `${today}%`) + one("SELECT COALESCE(SUM(labor_amount),0) value FROM work_orders WHERE created_at LIKE ?", `${today}%`),
    cashBalance: one("SELECT COALESCE(SUM(CASE WHEN type='receipt' THEN amount ELSE -amount END),0) value FROM cash_transactions"),
    stockValue: one('SELECT COALESCE(SUM(stock * buy_price),0) value FROM products'),
    activeOrders: one("SELECT COUNT(*) value FROM work_orders WHERE status IN ('pending','in_progress','ready')"),
    customerDebt: one("SELECT COALESCE(SUM(debit-credit),0) value FROM ledger_entries WHERE person_type='customer'"),
    checksDue: one("SELECT COUNT(*) value FROM checks WHERE status='in_hand'"),
    lowStock: db.prepare('SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC LIMIT 5').all(),
    orders: db.prepare("SELECT w.*, c.name customer, v.plate FROM work_orders w LEFT JOIN customers c ON c.id=w.customer_id LEFT JOIN vehicles v ON v.id=w.vehicle_id ORDER BY w.created_at DESC LIMIT 6").all(),
    activity: db.prepare("SELECT type,amount,description,created_at FROM cash_transactions ORDER BY created_at DESC LIMIT 5").all()
  };
}

function setupIpc() {
  ipcMain.handle('dashboard', () => dashboard());
  ipcMain.handle('list', (_, table) => {
    const allowed = ['customers','vehicles','mechanics','products','suppliers','work_orders','purchases','sales','checks','cash_transactions','bank_accounts','expenses'];
    if (!allowed.includes(table)) throw new Error('جدول نامعتبر است');
    const queries = {
      customers: 'SELECT c.*, COALESCE((SELECT SUM(debit-credit) FROM ledger_entries l WHERE l.person_type="customer" AND l.person_id=c.id),0) balance FROM customers c ORDER BY id DESC',
      vehicles: 'SELECT v.*, c.name customer_name FROM vehicles v LEFT JOIN customers c ON c.id=v.customer_id ORDER BY id DESC',
      work_orders: 'SELECT w.*, c.name customer, v.plate, m.name mechanic FROM work_orders w LEFT JOIN customers c ON c.id=w.customer_id LEFT JOIN vehicles v ON v.id=w.vehicle_id LEFT JOIN mechanics m ON m.id=w.mechanic_id ORDER BY id DESC',
      purchases: 'SELECT p.*, s.name supplier FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id ORDER BY id DESC',
      sales: 'SELECT s.*, c.name customer FROM sales s LEFT JOIN customers c ON c.id=s.customer_id ORDER BY id DESC',
      checks: 'SELECT * FROM checks ORDER BY due_date ASC',
      cash_transactions: 'SELECT * FROM cash_transactions ORDER BY created_at DESC',
      expenses: 'SELECT * FROM expenses ORDER BY paid_at DESC',
    };
    return db.prepare(queries[table] || `SELECT * FROM ${table} ORDER BY id DESC`).all();
  });
  ipcMain.handle('create', (_, table, values) => {
    const allowed = ['customers','vehicles','mechanics','products','suppliers','checks','bank_accounts','expenses','cash_transactions'];
    if (!allowed.includes(table)) throw new Error('عملیات نامعتبر است');
    const keys = Object.keys(values).filter(k => values[k] !== '' && values[k] !== undefined);
    const result = db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(k => values[k]));
    if (table === 'cash_transactions' && values.type === 'payment') db.prepare('INSERT INTO expenses(title,amount,category) VALUES (?,?,?)').run(values.description || 'پرداخت صندوق', money(values.amount), 'صندوق');
    return result.lastInsertRowid;
  });
  ipcMain.handle('updateOrderStatus', (_, id, status) => db.prepare('UPDATE work_orders SET status=?, delivered_at=CASE WHEN ?="delivered" THEN ? ELSE delivered_at END WHERE id=?').run(status, status, stamp(), id));
  ipcMain.handle('backup', async () => { const target = await dialog.showSaveDialog({ defaultPath: 'RepairShopPro-backup.sqlite' }); if (!target.canceled) fs.copyFileSync(db.name, target.filePath); return !target.canceled; });
}

function createWindow() {
  const win = new BrowserWindow({ width: 1440, height: 900, minWidth: 1000, minHeight: 680, title: 'RepairShop Pro', webPreferences: { preload: path.join(__dirname, 'electron', 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  Menu.setApplicationMenu(null);
  const dev = process.env.VITE_DEV_SERVER_URL;
  if (dev) win.loadURL(dev); else win.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
}

app.whenReady().then(() => { db = createDatabase(path.join(app.getPath('userData'), 'repairshop-pro.sqlite')); setupIpc(); createWindow(); app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow()); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
