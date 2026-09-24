const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function createDatabase(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  seed(db);
  return db;
}

function seed(db) {
  if (db.prepare('SELECT COUNT(*) count FROM customers').get().count) return;
  const insertCustomer = db.prepare('INSERT INTO customers(name, phone, address) VALUES (?, ?, ?)');
  const ali = insertCustomer.run('علی رضایی', '۰۹۱۲۱۲۳۴۵۶۷', 'تهران، آزادی').lastInsertRowid;
  const sara = insertCustomer.run('سارا احمدی', '۰۹۱۹۸۷۶۵۴۳۲', 'تهران، صادقیه').lastInsertRowid;
  db.prepare('INSERT INTO vehicles(customer_id,plate,brand,model,color,mileage,last_service) VALUES (?,?,?,?,?,?,?)').run(ali, '۲۱ ایران ۵۶۷ الف ۱۲', 'پژو', '۲۰۶ تیپ ۵', 'سفید', 84200, '۱۴۰۵/۰۵/۲۵');
  const car = db.prepare('INSERT INTO vehicles(customer_id,plate,brand,model,color,mileage,last_service) VALUES (?,?,?,?,?,?,?)').run(sara, '۶۸ ایران ۲۴۳ ب ۳۳', 'دنا', 'پلاس توربو', 'مشکی', 42300, '۱۴۰۵/۰۶/۱۵').lastInsertRowid;
  db.prepare('INSERT INTO mechanics(name,phone) VALUES (?,?)').run('مهدی کریمی', '۰۹۱۲۵۵۵۶۷۸۹');
  const addProduct = db.prepare('INSERT INTO products(code,name,stock,buy_price,sale_price,min_stock) VALUES (?,?,?,?,?,?)');
  addProduct.run('OF-206', 'فیلتر روغن پژو ۲۰۶', 4, 145000, 185000, 5);
  addProduct.run('EO-10W40', 'روغن موتور ۱۰W۴۰', 18, 280000, 350000, 6);
  addProduct.run('BP-206', 'لنت ترمز جلو ۲۰۶', 7, 680000, 850000, 3);
  db.prepare('INSERT INTO suppliers(name,phone) VALUES (?,?)').run('قطعات یدک پارس', '۰۲۱۴۴۳۳۲۲۱۱');
  db.prepare('INSERT INTO work_orders(code,customer_id,vehicle_id,mechanic_id,mileage,complaint,status,labor_amount,paid_amount,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('WO-۱۴۰۵-۰۰۲۴', sara, car, 1, 42300, 'صدای غیرعادی از موتور', 'in_progress', 1200000, 500000, new Date().toISOString());
  db.prepare("INSERT INTO checks(type,number,bank,amount,due_date,status) VALUES ('received',?,?,?,?,?)").run('۷۴۳۲۱۸', 'ملت', 5800000, '۱۴۰۵/۰۷/۰۲', 'in_hand');
  db.prepare("INSERT INTO cash_transactions(type,amount,description,created_at) VALUES ('receipt',?,?,?)").run(2500000, 'دریافت نقدی خدمات', new Date().toISOString());
}

module.exports = { createDatabase };
