import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase } from './src/server/db.ts';
import {
  clearSessionCookie,
  createSessionToken,
  getCookieToken,
  hashPassword,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  verifyPassword,
  verifySessionToken,
  type AuthenticatedRequest,
} from './src/server/auth.ts';

initDatabase();

const app = express();
const PORT = 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `casaoptiq-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format d’image non supporté (JPG, PNG, WEBP uniquement).'));
    }
  },
});

interface DbUserRow {
  id: number;
  username: string | null;
  email: string;
  password_hash: string;
  role: 'admin' | 'customer';
  must_change_password: number;
  full_name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  created_at: string;
}

function loadSessionUserById(id: number): AuthenticatedRequest['sessionUser'] | undefined {
  const row = db
    .prepare(
      `SELECT id, username, email, role, must_change_password, full_name, phone, address, city FROM users WHERE id = ?`
    )
    .get(id) as AuthenticatedRequest['sessionUser'] | undefined;
  return row;
}

const authMiddleware = requireAuth(loadSessionUserById);
const adminReadyMiddleware = requireAdmin(false);
const adminAllowPasswordChangeMiddleware = requireAdmin(true);

function parseProductRow(row: Record<string, unknown>) {
  let images: string[] = [];
  let availableColors: string[] = [];
  try {
    images = JSON.parse(String(row.images_json || '[]')) as string[];
  } catch {
    images = [];
  }
  try {
    availableColors = JSON.parse(String(row.available_colors_json || '[]')) as string[];
  } catch {
    availableColors = [];
  }
  return {
    ...row,
    images,
    available_colors: availableColors,
    is_featured: Boolean(row.is_featured),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// ==================== AUTH ROUTES ====================

app.get('/api/auth/me', (req, res) => {
  const token = getCookieToken(req);
  const payload = verifySessionToken(token);
  if (!payload) {
    res.json({ user: null });
    return;
  }
  const user = loadSessionUserById(payload.userId);
  if (!user) {
    clearSessionCookie(res);
    res.json({ user: null });
    return;
  }
  res.json({ user });
});

app.post('/api/auth/register', (req, res) => {
  const { full_name, email, password, phone, address, city } = req.body as {
    full_name?: string;
    email?: string;
    password?: string;
    phone?: string;
    address?: string;
    city?: string;
  };

  if (!full_name?.trim() || !email?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: 'Veuillez renseigner un nom complet, un e-mail valide et un mot de passe (6 caractères minimum).' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
    return;
  }

  const tx = db.transaction(() => {
    const userRes = db
      .prepare(
        `INSERT INTO users (email, password_hash, role, must_change_password, full_name, phone, address, city)
         VALUES (?, ?, 'customer', 0, ?, ?, ?, ?)`
      )
      .run(
        normalizedEmail,
        hashPassword(password),
        full_name.trim(),
        phone?.trim() || null,
        address?.trim() || null,
        city?.trim() || 'Casablanca'
      );
    const userId = Number(userRes.lastInsertRowid);

    const existingCust = db.prepare(`SELECT id FROM customers WHERE email = ?`).get(normalizedEmail) as { id: number } | undefined;
    if (existingCust) {
      db.prepare(`UPDATE customers SET user_id = ?, full_name = ?, phone = COALESCE(?, phone), address = COALESCE(?, address), city = COALESCE(?, city) WHERE id = ?`).run(
        userId,
        full_name.trim(),
        phone?.trim() || null,
        address?.trim() || null,
        city?.trim() || null,
        existingCust.id
      );
    } else {
      db.prepare(
        `INSERT INTO customers (user_id, full_name, email, phone, address, city) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(userId, full_name.trim(), normalizedEmail, phone?.trim() || null, address?.trim() || null, city?.trim() || 'Casablanca');
    }

    return userId;
  });

  const userId = tx();
  const user = loadSessionUserById(userId)!;
  const token = createSessionToken({ userId: user.id, role: user.role });
  setSessionCookie(res, token);
  res.status(201).json({ user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'E-mail et mot de passe requis.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const row = db.prepare(`SELECT * FROM users WHERE email = ? AND role = 'customer'`).get(normalizedEmail) as DbUserRow | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Identifiants invalides.' });
    return;
  }
  const user = loadSessionUserById(row.id)!;
  const token = createSessionToken({ userId: user.id, role: user.role });
  setSessionCookie(res, token);
  res.json({ user });
});

app.post('/api/auth/admin/login', (req, res) => {
  const { identifier, password } = req.body as { identifier?: string; password?: string };
  if (!identifier?.trim() || !password) {
    res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
    return;
  }
  const cleanId = identifier.trim();
  const row = db
    .prepare(`SELECT * FROM users WHERE role = 'admin' AND (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))`)
    .get(cleanId, cleanId) as DbUserRow | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Identifiants administrateur incorrects.' });
    return;
  }

  const user = loadSessionUserById(row.id)!;
  const token = createSessionToken({ userId: user.id, role: 'admin' });
  setSessionCookie(res, token);
  res.json({
    user,
    mustChangePassword: row.must_change_password === 1,
  });
});

app.post('/api/auth/change-password', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    return;
  }
  if (currentPassword === newPassword) {
    res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l’ancien.' });
    return;
  }
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.sessionUser!.id) as DbUserRow | undefined;
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    return;
  }
  db.prepare(`UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`).run(
    hashPassword(newPassword),
    row.id
  );
  const updatedUser = loadSessionUserById(row.id)!;
  res.json({ user: updatedUser, message: 'Mot de passe mis à jour avec succès.' });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: 'Adresse e-mail requise.' });
    return;
  }
  const user = db.prepare(`SELECT id, phone FROM users WHERE LOWER(email) = LOWER(?) AND role = 'customer'`).get(email.trim()) as
    | { id: number; phone: string | null }
    | undefined;

  if (user) {
    const code = String(crypto.randomInt(100000, 999999));
    db.prepare(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+30 minutes'))`
    ).run(user.id, hashPassword(code));
    // Server log only (SMTP integration point for production)
    console.info(`[CasaOptiQ Password Reset] Verification code generated for user #${user.id}: ${code}`);
  }

  res.json({
    message:
      'Si un compte client correspond à cet e-mail, une demande de réinitialisation a été enregistrée. Veuillez confirmer votre numéro de téléphone enregistré pour définir un nouveau mot de passe.',
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, phone, newPassword } = req.body as {
    email?: string;
    phone?: string;
    newPassword?: string;
  };
  if (!email?.trim() || !phone?.trim() || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'E-mail, téléphone associé et nouveau mot de passe (6+ caractères) requis.' });
    return;
  }
  const user = db
    .prepare(`SELECT id, phone FROM users WHERE LOWER(email) = LOWER(?) AND role = 'customer'`)
    .get(email.trim()) as { id: number; phone: string | null } | undefined;

  const normalizePhone = (p: string) => p.replace(/\D/g, '').slice(-8);
  if (!user || !user.phone || normalizePhone(user.phone) !== normalizePhone(phone)) {
    res.status(400).json({ error: 'Vérification impossible : l’e-mail ou le téléphone ne correspond pas.' });
    return;
  }

  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(newPassword), user.id);
  res.json({ message: 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.' });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// ==================== PUBLIC STOREFRONT ROUTES ====================

app.get('/api/storefront/bootstrap', (_req, res) => {
  const settings = db.prepare(`SELECT * FROM store_settings WHERE id = 1`).get();
  const categories = db.prepare(`SELECT * FROM categories ORDER BY sort_order ASC, id ASC`).all();
  const brands = db.prepare(`SELECT * FROM brands ORDER BY name ASC`).all();

  const productSelect = `
    SELECT p.*, b.name as brand_name, b.slug as brand_slug, c.name_fr as category_name_fr, c.name_ar as category_name_ar, c.slug as category_slug
    FROM products p
    JOIN brands b ON p.brand_id = b.id
    JOIN categories c ON p.category_id = c.id
  `;

  const featuredProducts = (db.prepare(`${productSelect} WHERE p.is_featured = 1 ORDER BY p.id DESC LIMIT 8`).all() as Record<string, unknown>[]).map(parseProductRow);
  const bestSellers = (db.prepare(`${productSelect} WHERE p.badge = 'Best-seller' ORDER BY p.id ASC LIMIT 6`).all() as Record<string, unknown>[]).map(parseProductRow);
  const newArrivals = (db.prepare(`${productSelect} WHERE p.badge = 'Nouveau' ORDER BY p.created_at DESC LIMIT 6`).all() as Record<string, unknown>[]).map(parseProductRow);
  const reviews = db
    .prepare(
      `SELECT r.*, p.name_fr as product_name_fr, p.slug as product_slug
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       ORDER BY r.created_at DESC LIMIT 6`
    )
    .all();

  res.json({
    settings,
    categories,
    brands,
    featuredProducts,
    bestSellers,
    newArrivals,
    reviews,
  });
});

app.get('/api/products', (req, res) => {
  const { q, category, brand, color, minPrice, maxPrice, inStock, badge, sort } = req.query as Record<string, string | undefined>;

  let sql = `
    SELECT p.*, b.name as brand_name, b.slug as brand_slug, c.name_fr as category_name_fr, c.name_ar as category_name_ar, c.slug as category_slug
    FROM products p
    JOIN brands b ON p.brand_id = b.id
    JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (q?.trim()) {
    const like = `%${q.trim()}%`;
    sql += ` AND (p.name_fr LIKE ? OR p.name_ar LIKE ? OR b.name LIKE ? OR p.reference LIKE ? OR p.description_fr LIKE ?)`;
    params.push(like, like, like, like, like);
  }
  if (category && category !== 'all') {
    sql += ` AND c.slug = ?`;
    params.push(category);
  }
  if (brand && brand !== 'all') {
    sql += ` AND b.slug = ?`;
    params.push(brand);
  }
  if (color && color !== 'all') {
    sql += ` AND (LOWER(p.color_fr) LIKE LOWER(?) OR LOWER(p.available_colors_json) LIKE LOWER(?))`;
    params.push(`%${color}%`, `%${color}%`);
  }
  if (minPrice && !Number.isNaN(Number(minPrice))) {
    sql += ` AND p.price_mad >= ?`;
    params.push(Number(minPrice));
  }
  if (maxPrice && !Number.isNaN(Number(maxPrice))) {
    sql += ` AND p.price_mad <= ?`;
    params.push(Number(maxPrice));
  }
  if (inStock === 'true') {
    sql += ` AND p.stock > 0`;
  }
  if (badge && badge !== 'all') {
    sql += ` AND p.badge = ?`;
    params.push(badge);
  }

  if (sort === 'price_asc') {
    sql += ` ORDER BY p.price_mad ASC`;
  } else if (sort === 'price_desc') {
    sql += ` ORDER BY p.price_mad DESC`;
  } else {
    sql += ` ORDER BY p.is_featured DESC, p.id DESC`;
  }

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  res.json({ products: rows.map(parseProductRow) });
});

app.get('/api/products/:slug', (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, b.name as brand_name, b.slug as brand_slug, b.country as brand_country,
              c.name_fr as category_name_fr, c.name_ar as category_name_ar, c.slug as category_slug
       FROM products p
       JOIN brands b ON p.brand_id = b.id
       JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ?`
    )
    .get(req.params.slug) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }

  const product = parseProductRow(row);
  const reviews = db
    .prepare(`SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC`)
    .all(row.id);

  const similarRows = db
    .prepare(
      `SELECT p.*, b.name as brand_name, b.slug as brand_slug, c.name_fr as category_name_fr, c.name_ar as category_name_ar, c.slug as category_slug
       FROM products p
       JOIN brands b ON p.brand_id = b.id
       JOIN categories c ON p.category_id = c.id
       WHERE p.id != ? AND (p.category_id = ? OR p.brand_id = ?)
       ORDER BY p.is_featured DESC, p.id DESC
       LIMIT 4`
    )
    .all(row.id, row.category_id, row.brand_id) as Record<string, unknown>[];

  res.json({
    product,
    reviews,
    similar: similarRows.map(parseProductRow),
  });
});

app.post('/api/products/:id/reviews', (req, res) => {
  const productId = Number(req.params.id);
  const { author_name, rating, comment } = req.body as {
    author_name?: string;
    rating?: number;
    comment?: string;
  };
  const product = db.prepare(`SELECT id FROM products WHERE id = ?`).get(productId);
  if (!product) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }
  const cleanRating = Number(rating);
  if (!author_name?.trim() || !comment?.trim() || Number.isNaN(cleanRating) || cleanRating < 1 || cleanRating > 5) {
    res.status(400).json({ error: 'Nom, note (1 à 5) et commentaire requis.' });
    return;
  }

  const token = getCookieToken(req);
  const payload = verifySessionToken(token);
  const userId = payload?.userId || null;

  const result = db
    .prepare(
      `INSERT INTO reviews (product_id, user_id, author_name, rating, comment, is_verified)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(productId, userId, author_name.trim(), Math.round(cleanRating), comment.trim(), userId ? 1 : 0);

  const created = db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(Number(result.lastInsertRowid));
  res.status(201).json({ review: created });
});

app.post('/api/coupons/validate', (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code?.trim()) {
    res.status(400).json({ error: 'Veuillez saisir un code promo.' });
    return;
  }
  const coupon = db
    .prepare(`SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1`)
    .get(code.trim()) as { id: number; code: string; discount_percent: number; expires_at: string } | undefined;

  if (!coupon) {
    res.status(404).json({ error: 'Code promotionnel invalide ou inactif.' });
    return;
  }
  if (new Date(coupon.expires_at).getTime() < Date.now() - 86400000) {
    res.status(400).json({ error: 'Ce code promotionnel est expiré.' });
    return;
  }
  res.json({ coupon });
});

app.post('/api/newsletter', (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim() || !email.includes('@')) {
    res.status(400).json({ error: 'Adresse e-mail invalide.' });
    return;
  }
  const clean = email.trim().toLowerCase();
  const existing = db.prepare(`SELECT id FROM newsletter_subscribers WHERE email = ?`).get(clean);
  if (!existing) {
    db.prepare(`INSERT INTO newsletter_subscribers (email) VALUES (?)`).run(clean);
  }
  res.json({ message: 'Inscription confirmée à la lettre privée CasaOptiQ.' });
});

app.post('/api/orders', (req, res) => {
  const {
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    shipping_city,
    payment_method,
    coupon_code,
    notes,
    items,
  } = req.body as {
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    shipping_address?: string;
    shipping_city?: string;
    payment_method?: 'cod' | 'card';
    coupon_code?: string;
    notes?: string;
    items?: Array<{ product_id: number; quantity: number; selected_color?: string }>;
  };

  if (
    !customer_name?.trim() ||
    !customer_phone?.trim() ||
    !customer_email?.trim() ||
    !shipping_address?.trim() ||
    !shipping_city?.trim() ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    res.status(400).json({ error: 'Veuillez compléter toutes les coordonnées de livraison et sélectionner au moins un article.' });
    return;
  }

  const settings = db.prepare(`SELECT * FROM store_settings WHERE id = 1`).get() as {
    shipping_fee_mad: number;
    free_shipping_threshold_mad: number;
    payment_gateway_configured: number;
    payment_gateway_provider: string;
  };

  const chosenMethod = payment_method === 'card' ? 'card' : 'cod';
  if (chosenMethod === 'card' && settings.payment_gateway_configured !== 1) {
    res.status(400).json({
      error:
        'Le paiement par carte bancaire nécessite la configuration réelle d’une passerelle marocaine (CMI / Payzone) côté serveur. Veuillez sélectionner le paiement à la livraison.',
    });
    return;
  }

  const token = getCookieToken(req);
  const payload = verifySessionToken(token);
  const sessionUserId = payload?.userId || null;

  try {
    const orderResult = db.transaction(() => {
      let subtotal = 0;
      const verifiedItems: Array<{
        product_id: number;
        product_name: string;
        product_reference: string;
        selected_color: string;
        quantity: number;
        unit_price_mad: number;
        total_price_mad: number;
      }> = [];

      for (const item of items) {
        const qty = Math.max(1, Math.floor(Number(item.quantity)));
        const prod = db
          .prepare(`SELECT id, name_fr, reference, price_mad, color_fr, stock FROM products WHERE id = ?`)
          .get(item.product_id) as
          | { id: number; name_fr: string; reference: string; price_mad: number; color_fr: string; stock: number }
          | undefined;

        if (!prod) {
          throw new Error(`Produit #${item.product_id} introuvable.`);
        }
        if (prod.stock < qty) {
          throw new Error(`Stock insuffisant pour "${prod.name_fr}" (disponible : ${prod.stock}).`);
        }

        const lineTotal = prod.price_mad * qty;
        subtotal += lineTotal;
        verifiedItems.push({
          product_id: prod.id,
          product_name: prod.name_fr,
          product_reference: prod.reference,
          selected_color: item.selected_color?.trim() || prod.color_fr,
          quantity: qty,
          unit_price_mad: prod.price_mad,
          total_price_mad: lineTotal,
        });

        db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).run(qty, prod.id);
      }

      let discount = 0;
      let appliedCoupon: string | null = null;
      if (coupon_code?.trim()) {
        const coupon = db
          .prepare(`SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1`)
          .get(coupon_code.trim()) as { code: string; discount_percent: number; expires_at: string } | undefined;
        if (coupon && new Date(coupon.expires_at).getTime() >= Date.now() - 86400000) {
          discount = Math.round((subtotal * coupon.discount_percent) / 100);
          appliedCoupon = coupon.code;
        }
      }

      const discountedSubtotal = Math.max(0, subtotal - discount);
      const shippingFee =
        discountedSubtotal >= settings.free_shipping_threshold_mad ? 0 : settings.shipping_fee_mad;
      const total = discountedSubtotal + shippingFee;

      const cleanEmail = customer_email.trim().toLowerCase();
      let customer = db.prepare(`SELECT id FROM customers WHERE email = ?`).get(cleanEmail) as { id: number } | undefined;
      if (!customer) {
        const custRes = db
          .prepare(
            `INSERT INTO customers (user_id, full_name, email, phone, address, city) VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(sessionUserId, customer_name.trim(), cleanEmail, customer_phone.trim(), shipping_address.trim(), shipping_city.trim());
        customer = { id: Number(custRes.lastInsertRowid) };
      } else {
        db.prepare(
          `UPDATE customers SET full_name = ?, phone = ?, address = ?, city = ?, user_id = COALESCE(user_id, ?) WHERE id = ?`
        ).run(customer_name.trim(), customer_phone.trim(), shipping_address.trim(), shipping_city.trim(), sessionUserId, customer.id);
      }

      const orderNumber = `COQ-${new Date().getFullYear()}-${crypto.randomInt(1000, 9999)}`;
      const insertOrder = db
        .prepare(
          `INSERT INTO orders (
            order_number, customer_id, user_id, customer_name, customer_phone, customer_email,
            shipping_address, shipping_city, subtotal_mad, discount_mad, shipping_fee_mad, total_mad,
            coupon_code, payment_method, payment_status, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'En attente', ?)`
        )
        .run(
          orderNumber,
          customer.id,
          sessionUserId,
          customer_name.trim(),
          customer_phone.trim(),
          cleanEmail,
          shipping_address.trim(),
          shipping_city.trim(),
          subtotal,
          discount,
          shippingFee,
          total,
          appliedCoupon,
          chosenMethod,
          notes?.trim() || null
        );
      const orderId = Number(insertOrder.lastInsertRowid);

      const insertItem = db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, product_reference, selected_color, quantity, unit_price_mad, total_price_mad)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const line of verifiedItems) {
        insertItem.run(
          orderId,
          line.product_id,
          line.product_name,
          line.product_reference,
          line.selected_color,
          line.quantity,
          line.unit_price_mad,
          line.total_price_mad
        );
      }

      db.prepare(
        `INSERT INTO payments (order_id, method, provider, status, amount_mad, reference)
         VALUES (?, ?, ?, 'pending', ?, ?)`
      ).run(
        orderId,
        chosenMethod,
        chosenMethod === 'cod' ? 'Paiement à la livraison' : settings.payment_gateway_provider,
        total,
        `${chosenMethod.toUpperCase()}-${orderNumber}`
      );

      return {
        id: orderId,
        order_number: orderNumber,
        subtotal_mad: subtotal,
        discount_mad: discount,
        shipping_fee_mad: shippingFee,
        total_mad: total,
        status: 'En attente',
        payment_method: chosenMethod,
        items: verifiedItems,
      };
    })();

    res.status(201).json({ order: orderResult });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur lors de la création de la commande.' });
  }
});

app.get('/api/orders/track/:orderNumber', (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: 'Veuillez fournir l’adresse e-mail associée à la commande.' });
    return;
  }
  const order = db
    .prepare(`SELECT * FROM orders WHERE UPPER(order_number) = UPPER(?) AND LOWER(customer_email) = ?`)
    .get(req.params.orderNumber.trim(), email) as Record<string, unknown> | undefined;

  if (!order) {
    res.status(404).json({ error: 'Aucune commande trouvée avec cette référence et cet e-mail.' });
    return;
  }
  const items = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(order.id);
  res.json({ order: { ...order, items } });
});

// ==================== CUSTOMER SPACE ROUTES ====================

app.put('/api/customer/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { full_name, phone, address, city } = req.body as {
    full_name?: string;
    phone?: string;
    address?: string;
    city?: string;
  };
  if (!full_name?.trim()) {
    res.status(400).json({ error: 'Le nom complet est requis.' });
    return;
  }
  db.prepare(`UPDATE users SET full_name = ?, phone = ?, address = ?, city = ? WHERE id = ?`).run(
    full_name.trim(),
    phone?.trim() || null,
    address?.trim() || null,
    city?.trim() || null,
    req.sessionUser!.id
  );
  db.prepare(`UPDATE customers SET full_name = ?, phone = ?, address = ?, city = ? WHERE user_id = ?`).run(
    full_name.trim(),
    phone?.trim() || null,
    address?.trim() || null,
    city?.trim() || null,
    req.sessionUser!.id
  );
  res.json({ user: loadSessionUserById(req.sessionUser!.id) });
});

app.get('/api/customer/orders', authMiddleware, (req: AuthenticatedRequest, res) => {
  const orders = db
    .prepare(
      `SELECT * FROM orders WHERE user_id = ? OR LOWER(customer_email) = LOWER(?) ORDER BY created_at DESC`
    )
    .all(req.sessionUser!.id, req.sessionUser!.email) as Array<Record<string, unknown>>;

  const enriched = orders.map((order) => ({
    ...order,
    items: db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(order.id),
  }));
  res.json({ orders: enriched });
});

app.get('/api/customer/favorites', authMiddleware, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, b.name as brand_name, b.slug as brand_slug, c.name_fr as category_name_fr, c.name_ar as category_name_ar, c.slug as category_slug
       FROM favorites f
       JOIN products p ON f.product_id = p.id
       JOIN brands b ON p.brand_id = b.id
       JOIN categories c ON p.category_id = c.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`
    )
    .all(req.sessionUser!.id) as Record<string, unknown>[];
  res.json({ favorites: rows.map(parseProductRow) });
});

app.post('/api/customer/favorites/:productId', authMiddleware, (req: AuthenticatedRequest, res) => {
  const productId = Number(req.params.productId);
  const existing = db
    .prepare(`SELECT id FROM favorites WHERE user_id = ? AND product_id = ?`)
    .get(req.sessionUser!.id, productId) as { id: number } | undefined;
  if (existing) {
    db.prepare(`DELETE FROM favorites WHERE id = ?`).run(existing.id);
    res.json({ favorited: false });
  } else {
    db.prepare(`INSERT INTO favorites (user_id, product_id) VALUES (?, ?)`).run(req.sessionUser!.id, productId);
    res.json({ favorited: true });
  }
});

// ==================== ADMIN ROUTES ====================

app.get('/api/admin/status', authMiddleware, adminAllowPasswordChangeMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({
    user: req.sessionUser,
    mustChangePassword: req.sessionUser!.must_change_password === 1,
  });
});

app.get('/api/admin/dashboard', authMiddleware, adminReadyMiddleware, (_req, res) => {
  const revenueRow = db
    .prepare(`SELECT COALESCE(SUM(total_mad), 0) as total FROM orders WHERE status != 'Annulée'`)
    .get() as { total: number };
  const totalOrders = (db.prepare(`SELECT COUNT(*) as c FROM orders`).get() as { c: number }).c;
  const pendingOrders = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'En attente'`).get() as { c: number }).c;
  const deliveredOrders = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'Livrée'`).get() as { c: number }).c;
  const totalCustomers = (db.prepare(`SELECT COUNT(*) as c FROM customers`).get() as { c: number }).c;
  const totalProducts = (db.prepare(`SELECT COUNT(*) as c FROM products`).get() as { c: number }).c;
  const outOfStockProducts = (db.prepare(`SELECT COUNT(*) as c FROM products WHERE stock <= 0`).get() as { c: number }).c;

  const salesSeries = db
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at) as day, COALESCE(SUM(total_mad), 0) as revenue, COUNT(*) as orders_count
       FROM orders
       WHERE status != 'Annulée'
       GROUP BY day
       ORDER BY day ASC
       LIMIT 14`
    )
    .all();

  const recentOrders = db
    .prepare(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 6`)
    .all();

  const topProducts = db
    .prepare(
      `SELECT p.id, p.reference, p.name_fr, p.price_mad, p.stock, b.name as brand_name,
              COALESCE(SUM(oi.quantity), 0) as units_sold,
              COALESCE(SUM(oi.total_price_mad), 0) as revenue_mad
       FROM products p
       JOIN brands b ON p.brand_id = b.id
       LEFT JOIN order_items oi ON oi.product_id = p.id
       GROUP BY p.id
       ORDER BY units_sold DESC, revenue_mad DESC
       LIMIT 5`
    )
    .all();

  res.json({
    kpis: {
      revenue_mad: revenueRow.total,
      total_orders: totalOrders,
      pending_orders: pendingOrders,
      delivered_orders: deliveredOrders,
      total_customers: totalCustomers,
      total_products: totalProducts,
      out_of_stock_products: outOfStockProducts,
    },
    salesSeries,
    recentOrders,
    topProducts,
  });
});

app.post('/api/admin/upload', authMiddleware, adminReadyMiddleware, upload.array('images', 8), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const urls = files.map((f) => `/uploads/${f.filename}`);
  res.json({ urls });
});

app.get('/api/admin/products', authMiddleware, adminReadyMiddleware, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, b.name as brand_name, c.name_fr as category_name_fr
       FROM products p
       JOIN brands b ON p.brand_id = b.id
       JOIN categories c ON p.category_id = c.id
       ORDER BY p.id DESC`
    )
    .all() as Record<string, unknown>[];
  res.json({ products: rows.map(parseProductRow) });
});

app.post('/api/admin/products', authMiddleware, adminReadyMiddleware, (req, res) => {
  const body = req.body as Record<string, unknown>;
  const nameFr = String(body.name_fr || '').trim();
  const reference = String(body.reference || '').trim().toUpperCase();
  if (!nameFr || !reference || !body.brand_id || !body.category_id) {
    res.status(400).json({ error: 'Nom, référence, marque et catégorie requis.' });
    return;
  }
  const slug = `${slugify(nameFr)}-${crypto.randomBytes(2).toString('hex')}`;
  const images = Array.isArray(body.images) ? body.images : [];
  const availableColors = Array.isArray(body.available_colors)
    ? body.available_colors
    : [String(body.color_fr || 'Noir')];

  try {
    const resInsert = db
      .prepare(
        `INSERT INTO products (
          reference, slug, name_fr, name_ar, brand_id, category_id,
          price_mad, old_price_mad, description_fr, description_ar,
          color_fr, color_ar, available_colors_json,
          frame_material_fr, frame_material_ar, dimensions,
          stock, badge, is_featured, images_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        reference,
        slug,
        nameFr,
        String(body.name_ar || nameFr).trim(),
        Number(body.brand_id),
        Number(body.category_id),
        Number(body.price_mad || 0),
        body.old_price_mad ? Number(body.old_price_mad) : null,
        String(body.description_fr || '').trim(),
        String(body.description_ar || body.description_fr || '').trim(),
        String(body.color_fr || 'Noir').trim(),
        String(body.color_ar || body.color_fr || 'أسود').trim(),
        JSON.stringify(availableColors),
        String(body.frame_material_fr || 'Acétate').trim(),
        String(body.frame_material_ar || body.frame_material_fr || 'أسيتات').trim(),
        String(body.dimensions || '52-18-145 mm').trim(),
        Math.max(0, Number(body.stock || 0)),
        body.badge || null,
        body.is_featured ? 1 : 0,
        JSON.stringify(images)
      );
    const created = db.prepare(`SELECT * FROM products WHERE id = ?`).get(Number(resInsert.lastInsertRowid)) as Record<string, unknown>;
    res.status(201).json({ product: parseProductRow(created) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur lors de la création du produit.' });
  }
});

app.put('/api/admin/products/:id', authMiddleware, adminReadyMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const existing = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
  if (!existing) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }
  const images = Array.isArray(body.images) ? body.images : [];
  const availableColors = Array.isArray(body.available_colors)
    ? body.available_colors
    : [String(body.color_fr || 'Noir')];

  try {
    db.prepare(
      `UPDATE products SET
        reference = ?, name_fr = ?, name_ar = ?, brand_id = ?, category_id = ?,
        price_mad = ?, old_price_mad = ?, description_fr = ?, description_ar = ?,
        color_fr = ?, color_ar = ?, available_colors_json = ?,
        frame_material_fr = ?, frame_material_ar = ?, dimensions = ?,
        stock = ?, badge = ?, is_featured = ?, images_json = ?
       WHERE id = ?`
    ).run(
      String(body.reference || '').trim().toUpperCase(),
      String(body.name_fr || '').trim(),
      String(body.name_ar || body.name_fr || '').trim(),
      Number(body.brand_id),
      Number(body.category_id),
      Number(body.price_mad || 0),
      body.old_price_mad ? Number(body.old_price_mad) : null,
      String(body.description_fr || '').trim(),
      String(body.description_ar || body.description_fr || '').trim(),
      String(body.color_fr || '').trim(),
      String(body.color_ar || body.color_fr || '').trim(),
      JSON.stringify(availableColors),
      String(body.frame_material_fr || '').trim(),
      String(body.frame_material_ar || body.frame_material_fr || '').trim(),
      String(body.dimensions || '').trim(),
      Math.max(0, Number(body.stock || 0)),
      body.badge || null,
      body.is_featured ? 1 : 0,
      JSON.stringify(images),
      id
    );
    const updated = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as Record<string, unknown>;
    res.json({ product: parseProductRow(updated) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur lors de la modification.' });
  }
});

app.delete('/api/admin/products/:id', authMiddleware, adminReadyMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const inOrders = db.prepare(`SELECT COUNT(*) as c FROM order_items WHERE product_id = ?`).get(id) as { c: number };
  if (inOrders.c > 0) {
    res.status(400).json({
      error: 'Ce produit est lié à des commandes existantes. Mettez son stock à 0 plutôt que de le supprimer.',
    });
    return;
  }
  db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
  res.json({ ok: true });
});

app.get('/api/admin/categories', authMiddleware, adminReadyMiddleware, (_req, res) => {
  const categories = db.prepare(`SELECT * FROM categories ORDER BY sort_order ASC, id ASC`).all();
  res.json({ categories });
});

app.post('/api/admin/categories', authMiddleware, adminReadyMiddleware, (req, res) => {
  const { name_fr, name_ar, description_fr, description_ar } = req.body as Record<string, string>;
  if (!name_fr?.trim()) {
    res.status(400).json({ error: 'Nom de catégorie requis.' });
    return;
  }
  const slug = slugify(name_fr);
  try {
    const r = db
      .prepare(`INSERT INTO categories (slug, name_fr, name_ar, description_fr, description_ar) VALUES (?, ?, ?, ?, ?)`)
      .run(slug, name_fr.trim(), name_ar?.trim() || name_fr.trim(), description_fr || '', description_ar || '');
    res.status(201).json({ category: db.prepare(`SELECT * FROM categories WHERE id = ?`).get(Number(r.lastInsertRowid)) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur catégorie.' });
  }
});

app.delete('/api/admin/categories/:id', authMiddleware, adminReadyMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const used = db.prepare(`SELECT COUNT(*) as c FROM products WHERE category_id = ?`).get(id) as { c: number };
  if (used.c > 0) {
    res.status(400).json({ error: 'Catégorie utilisée par des produits.' });
    return;
  }
  db.prepare(`DELETE FROM categories WHERE id = ?`).run(id);
  res.json({ ok: true });
});

app.get('/api/admin/brands', authMiddleware, adminReadyMiddleware, (_req, res) => {
  const brands = db.prepare(`SELECT * FROM brands ORDER BY name ASC`).all();
  res.json({ brands });
});

app.post('/api/admin/brands', authMiddleware, adminReadyMiddleware, (req, res) => {
  const { name, country, description_fr, description_ar } = req.body as Record<string, string>;
  if (!name?.trim()) {
    res.status(400).json({ error: 'Nom de marque requis.' });
    return;
  }
  try {
    const r = db
      .prepare(`INSERT INTO brands (slug, name, country, description_fr, description_ar) VALUES (?, ?, ?, ?, ?)`)
      .run(slugify(name), name.trim(), country || '', description_fr || '', description_ar || '');
    res.status(201).json({ brand: db.prepare(`SELECT * FROM brands WHERE id = ?`).get(Number(r.lastInsertRowid)) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur marque.' });
  }
});

app.delete('/api/admin/brands/:id', authMiddleware, adminReadyMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const used = db.prepare(`SELECT COUNT(*) as c FROM products WHERE brand_id = ?`).get(id) as { c: number };
  if (used.c > 0) {
    res.status(400).json({ error: 'Marque associée à des produits.' });
    return;
  }
  db.prepare(`DELETE FROM brands WHERE id = ?`).run(id);
  res.json({ ok: true });
});

app.get('/api/admin/orders', authMiddleware, adminReadyMiddleware, (req, res) => {
  const { status, q } = req.query as { status?: string; q?: string };
  let sql = `SELECT * FROM orders WHERE 1=1`;
  const params: unknown[] = [];
  if (status && status !== 'all') {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (q?.trim()) {
    const like = `%${q.trim()}%`;
    sql += ` AND (order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ? OR shipping_city LIKE ?)`;
    params.push(like, like, like, like, like);
  }
  sql += ` ORDER BY created_at DESC`;
  const orders = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  const withItems = orders.map((o) => ({
    ...o,
    items: db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(o.id),
  }));
  res.json({ orders: withItems });
});

app.patch('/api/admin/orders/:id/status', authMiddleware, adminReadyMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status?: string };
  const validStatuses = ['En attente', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: 'Statut de commande invalide.' });
    return;
  }

  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as { id: number; status: string } | undefined;
  if (!order) {
    res.status(404).json({ error: 'Commande introuvable.' });
    return;
  }

  const tx = db.transaction(() => {
    // Restore stock if cancelling a non-cancelled order
    if (status === 'Annulée' && order.status !== 'Annulée') {
      const items = db.prepare(`SELECT product_id, quantity FROM order_items WHERE order_id = ?`).all(id) as Array<{
        product_id: number;
        quantity: number;
      }>;
      for (const item of items) {
        db.prepare(`UPDATE products SET stock = stock + ? WHERE id = ?`).run(item.quantity, item.product_id);
      }
    }

    const paymentStatus = status === 'Livrée' ? 'paid' : status === 'Annulée' ? 'cancelled' : 'pending';
    db.prepare(`UPDATE orders SET status = ?, payment_status = ?, updated_at = datetime('now') WHERE id = ?`).run(
      status,
      paymentStatus,
      id
    );
    db.prepare(`UPDATE payments SET status = ? WHERE order_id = ?`).run(paymentStatus, id);
  });

  tx();
  const updated = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as Record<string, unknown>;
  const items = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(id);
  res.json({ order: { ...updated, items } });
});

app.get('/api/admin/customers', authMiddleware, adminReadyMiddleware, (req, res) => {
  const q = String(req.query.q || '').trim();
  let sql = `
    SELECT c.*,
           COUNT(o.id) as orders_count,
           COALESCE(SUM(CASE WHEN o.status != 'Annulée' THEN o.total_mad ELSE 0 END), 0) as total_spent_mad
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (q) {
    const like = `%${q}%`;
    sql += ` AND (c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.city LIKE ?)`;
    params.push(like, like, like, like);
  }
  sql += ` GROUP BY c.id ORDER BY c.created_at DESC`;
  const customers = db.prepare(sql).all(...params);
  res.json({ customers });
});

app.get('/api/admin/customers/:id/orders', authMiddleware, adminReadyMiddleware, (req, res) => {
  const orders = db
    .prepare(`SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC`)
    .all(Number(req.params.id)) as Array<Record<string, unknown>>;
  const withItems = orders.map((o) => ({
    ...o,
    items: db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(o.id),
  }));
  res.json({ orders: withItems });
});

app.get('/api/admin/coupons', authMiddleware, adminReadyMiddleware, (_req, res) => {
  const coupons = db.prepare(`SELECT * FROM coupons ORDER BY created_at DESC`).all();
  res.json({ coupons });
});

app.post('/api/admin/coupons', authMiddleware, adminReadyMiddleware, (req, res) => {
  const { code, discount_percent, expires_at, is_active } = req.body as {
    code?: string;
    discount_percent?: number;
    expires_at?: string;
    is_active?: boolean;
  };
  if (!code?.trim() || !discount_percent || !expires_at) {
    res.status(400).json({ error: 'Code, pourcentage et date d’expiration requis.' });
    return;
  }
  try {
    const r = db
      .prepare(`INSERT INTO coupons (code, discount_percent, expires_at, is_active) VALUES (?, ?, ?, ?)`)
      .run(code.trim().toUpperCase(), Number(discount_percent), expires_at, is_active === false ? 0 : 1);
    res.status(201).json({ coupon: db.prepare(`SELECT * FROM coupons WHERE id = ?`).get(Number(r.lastInsertRowid)) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Ce code existe déjà.' });
  }
});

app.patch('/api/admin/coupons/:id', authMiddleware, adminReadyMiddleware, (req, res) => {
  const { is_active } = req.body as { is_active: boolean };
  db.prepare(`UPDATE coupons SET is_active = ? WHERE id = ?`).run(is_active ? 1 : 0, Number(req.params.id));
  res.json({ coupon: db.prepare(`SELECT * FROM coupons WHERE id = ?`).get(Number(req.params.id)) });
});

app.delete('/api/admin/coupons/:id', authMiddleware, adminReadyMiddleware, (req, res) => {
  db.prepare(`DELETE FROM coupons WHERE id = ?`).run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/settings', authMiddleware, adminReadyMiddleware, (_req, res) => {
  const settings = db.prepare(`SELECT * FROM store_settings WHERE id = 1`).get();
  res.json({ settings });
});

app.put('/api/admin/settings', authMiddleware, adminReadyMiddleware, (req, res) => {
  const s = req.body as Record<string, unknown>;
  db.prepare(
    `UPDATE store_settings SET
      logo_text = ?, logo_image = ?, hero_banner_url = ?, about_banner_url = ?,
      hero_title_fr = ?, hero_title_ar = ?, hero_subtitle_fr = ?, hero_subtitle_ar = ?,
      about_title_fr = ?, about_title_ar = ?, about_text_fr = ?, about_text_ar = ?,
      store_address = ?, whatsapp_number = ?, phone_number = ?, email = ?,
      opening_hours_fr = ?, opening_hours_ar = ?, instagram_url = ?, facebook_url = ?,
      shipping_fee_mad = ?, free_shipping_threshold_mad = ?,
      cgv_fr = ?, cgv_ar = ?, privacy_fr = ?, privacy_ar = ?,
      payment_gateway_configured = ?, payment_gateway_provider = ?
     WHERE id = 1`
  ).run(
    String(s.logo_text || 'CasaOptiQ'),
    String(s.logo_image || ''),
    String(s.hero_banner_url || ''),
    String(s.about_banner_url || ''),
    String(s.hero_title_fr || ''),
    String(s.hero_title_ar || ''),
    String(s.hero_subtitle_fr || ''),
    String(s.hero_subtitle_ar || ''),
    String(s.about_title_fr || ''),
    String(s.about_title_ar || ''),
    String(s.about_text_fr || ''),
    String(s.about_text_ar || ''),
    String(s.store_address || ''),
    String(s.whatsapp_number || ''),
    String(s.phone_number || ''),
    String(s.email || ''),
    String(s.opening_hours_fr || ''),
    String(s.opening_hours_ar || ''),
    String(s.instagram_url || ''),
    String(s.facebook_url || ''),
    Number(s.shipping_fee_mad ?? 45),
    Number(s.free_shipping_threshold_mad ?? 2500),
    String(s.cgv_fr || ''),
    String(s.cgv_ar || ''),
    String(s.privacy_fr || ''),
    String(s.privacy_ar || ''),
    s.payment_gateway_configured ? 1 : 0,
    String(s.payment_gateway_provider || 'CMI / Payzone Maroc (non configuré)')
  );
  res.json({ settings: db.prepare(`SELECT * FROM store_settings WHERE id = 1`).get() });
});

// ==================== SERVER STARTUP (VITE DEV / PROD) ====================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CasaOptiQ server running on http://localhost:${PORT}`);
  });
}

startServer();
