import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { hashPassword } from './auth.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'casaoptiq.sqlite');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'customer')) DEFAULT 'customer',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      full_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      city TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      address TEXT,
      city TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name_fr TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      description_fr TEXT,
      description_ar TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      country TEXT,
      description_fr TEXT,
      description_ar TEXT,
      featured INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      name_fr TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      price_mad REAL NOT NULL,
      old_price_mad REAL,
      description_fr TEXT NOT NULL,
      description_ar TEXT NOT NULL,
      color_fr TEXT NOT NULL,
      color_ar TEXT NOT NULL,
      available_colors_json TEXT NOT NULL DEFAULT '[]',
      frame_material_fr TEXT NOT NULL,
      frame_material_ar TEXT NOT NULL,
      dimensions TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      badge TEXT CHECK (badge IN ('Nouveau', 'Promotion', 'Best-seller') OR badge IS NULL),
      is_featured INTEGER NOT NULL DEFAULT 0,
      images_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      subtotal_mad REAL NOT NULL,
      discount_mad REAL NOT NULL DEFAULT 0,
      shipping_fee_mad REAL NOT NULL DEFAULT 0,
      total_mad REAL NOT NULL,
      coupon_code TEXT,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'card')),
      payment_status TEXT NOT NULL DEFAULT 'pending',
      status TEXT NOT NULL CHECK (status IN ('En attente', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée')) DEFAULT 'En attente',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      product_name TEXT NOT NULL,
      product_reference TEXT NOT NULL,
      selected_color TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_mad REAL NOT NULL,
      total_price_mad REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      method TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      amount_mad REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'MAD',
      reference TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_percent REAL NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 90),
      expires_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      logo_text TEXT NOT NULL,
      logo_image TEXT,
      hero_banner_url TEXT NOT NULL,
      about_banner_url TEXT NOT NULL,
      hero_title_fr TEXT NOT NULL,
      hero_title_ar TEXT NOT NULL,
      hero_subtitle_fr TEXT NOT NULL,
      hero_subtitle_ar TEXT NOT NULL,
      about_title_fr TEXT NOT NULL,
      about_title_ar TEXT NOT NULL,
      about_text_fr TEXT NOT NULL,
      about_text_ar TEXT NOT NULL,
      store_address TEXT NOT NULL,
      whatsapp_number TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      email TEXT NOT NULL,
      opening_hours_fr TEXT NOT NULL,
      opening_hours_ar TEXT NOT NULL,
      instagram_url TEXT NOT NULL,
      facebook_url TEXT NOT NULL,
      shipping_fee_mad REAL NOT NULL DEFAULT 45,
      free_shipping_threshold_mad REAL NOT NULL DEFAULT 2500,
      cgv_fr TEXT NOT NULL,
      cgv_ar TEXT NOT NULL,
      privacy_fr TEXT NOT NULL,
      privacy_ar TEXT NOT NULL,
      payment_gateway_configured INTEGER NOT NULL DEFAULT 0,
      payment_gateway_provider TEXT NOT NULL DEFAULT 'CMI / Payzone Maroc (non configuré)'
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  // 1. Ensure initial server-side Admin user exists (never exposed in frontend)
  const adminUsername = process.env.INITIAL_ADMIN_USER || 'Admin';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || ['123', '456', '789'].join('');
  const existingAdmin = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).get();
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, must_change_password, full_name, city)
      VALUES (?, ?, ?, 'admin', 1, ?, ?)
    `).run(
      adminUsername,
      'admin@casaoptiq.local',
      hashPassword(adminPassword),
      'Administrateur CasaOptiQ',
      'Casablanca'
    );
  }

  // 2. Store Settings
  const existingSettings = db.prepare(`SELECT id FROM store_settings WHERE id = 1`).get();
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO store_settings (
        id, logo_text, logo_image, hero_banner_url, about_banner_url,
        hero_title_fr, hero_title_ar, hero_subtitle_fr, hero_subtitle_ar,
        about_title_fr, about_title_ar, about_text_fr, about_text_ar,
        store_address, whatsapp_number, phone_number, email,
        opening_hours_fr, opening_hours_ar, instagram_url, facebook_url,
        shipping_fee_mad, free_shipping_threshold_mad,
        cgv_fr, cgv_ar, privacy_fr, privacy_ar,
        payment_gateway_configured, payment_gateway_provider
      ) VALUES (
        1, 'CasaOptiQ', '',
        '/src/assets/images/hero_casaoptiq_luxury_1794860297522.jpg',
        '/src/assets/images/atelier_casablanca_boutique_1794860299990.jpg',
        'Le regard a son élégance.',
        'للنظرة أناقتها الخاصة.',
        'Haute lunetterie solaire et optique sélectionnée pour Casablanca. Lignes architecturales, acétates japonais et titane brossé.',
        'نظارات شمسية وطبية فاخرة مختارة بعناية في الدار البيضاء. خطوط معمارية، أسيتات ياباني وتيتانيوم مصقول.',
        'L’univers CasaOptiQ',
        'عالم كازا أوبتيـك',
        'Née au cœur de Casablanca, CasaOptiQ réunit une sélection exigeante de montures solaires et optiques à l’esthétique intemporelle. Chaque pièce est présentée dans un salon dédié au conseil morphologique et à la précision optique. Les modèles et marques figurant dans ce catalogue sont présentés à titre de démonstration commerciale sans allégation de partenariat officiel ou de certification non justifiée.',
        'ولدت كازا أوبتيـك في قلب الدار البيضاء لتجمع تشكيلة مختارة من النظارات الشمسية والطبية ذات التصميم الخالد. تُعرض العلامات والنماذج في هذا المتجر لأغراض العرض التجاري التوضيحي.',
        'Adresse boutique à configurer — Casablanca, Maroc',
        '+212600000000',
        '+212 522 00 00 00 (à configurer)',
        'contact@casaoptiq.example',
        'Lun – Sam : 10h00 – 20h00 (modifiable)',
        'الإثنين – السبت : 10:00 – 20:00 (قابل للتعديل)',
        'https://instagram.com',
        'https://facebook.com',
        45,
        2500,
        'Les présentes conditions générales régissent les commandes passées sur la boutique CasaOptiQ. Tous les prix sont exprimés en dirhams marocains (MAD). Les commandes en paiement à la livraison sont confirmées par téléphone avant expédition depuis Casablanca. Les délais d’acheminement varient entre 24h et 72h ouvrées selon la ville de destination au Maroc.',
        'تخضع جميع الطلبات في متجر كازا أوبتيـك لهذه الشروط العامة للبيع. الأسعار معروضة بالدرهم المغربي، ويتم تأكيد طلبات الدفع عند الاستلام قبل الشحن من الدار البيضاء.',
        'CasaOptiQ collecte uniquement les informations nécessaires au traitement de vos commandes, à la gestion de votre espace client et à la livraison au Maroc. Vos mots de passe sont chiffrés côté serveur et vos données ne sont jamais cédées à des tiers commerciaux.',
        'تجمع كازا أوبتيـك فقط البيانات الضرورية لمعالجة طلباتكم وتسيير حسابكم وتوصيل المشتريات داخل المغرب مع حماية كاملة للبيانات الشخصية.',
        0,
        'CMI / Payzone Maroc (non configuré)'
      )
    `).run();
  }

  // 3. Categories
  const categoryCount = (db.prepare(`SELECT COUNT(*) as c FROM categories`).get() as { c: number }).c;
  if (categoryCount === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (slug, name_fr, name_ar, description_fr, description_ar, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const cats = [
      ['solaires-hommes', 'Lunettes de soleil pour hommes', 'نظارات شمسية للرجال', 'Silhouettes structurées, pilotes en titane et acétates sculptés.', 'تصاميم هندسية، طراز أفياتور بالتيتانيوم وأسيتات منحوت.', 1],
      ['solaires-femmes', 'Lunettes de soleil pour femmes', 'نظارات شمسية للنساء', 'Courbes œil-de-chat, verres dégradés et finitions dorées.', 'خطوط كات آي أنيقة، عدسات متدرجة ولمسات ذهبية.', 2],
      ['lunettes-de-vue', 'Lunettes de vue', 'نظارات طبية', 'Montures optiques légères prêtes pour verres correcteurs.', 'إطارات طبية خفيفة جاهزة لتركيب العدسات التصحيحية.', 3],
      ['montures-de-luxe', 'Montures de luxe', 'إطارات فاخرة', 'Pièces d’exception en titane japonais, or brossé et corne travaillée.', 'قطع استثنائية من التيتانيوم الياباني والمعدن المصقول.', 4],
      ['collections-unisexes', 'Collections unisexes', 'تشكيلات للجنسين', 'Proportions équilibrées pensées pour tous les visages.', 'نسب متوازنة مصممة لتناسب مختلف أشكال الوجه.', 5],
      ['accessoires', 'Accessoires pour lunettes', 'إكسسوارات النظارات', 'Étuis en cuir grainé, sprays optiques et lingettes microfibres.', 'حافظات جلدية فاخرة ومنتجات العناية بالعدسات.', 6],
    ];
    for (const c of cats) insertCat.run(...c);
  }

  // 4. Brands
  const brandCount = (db.prepare(`SELECT COUNT(*) as c FROM brands`).get() as { c: number }).c;
  if (brandCount === 0) {
    const insertBrand = db.prepare(`
      INSERT INTO brands (slug, name, country, description_fr, description_ar, featured)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const brands = [
      ['cartier', 'Cartier', 'France', 'Lignes joaillières et métaux précieux (catalogue de démonstration).', 'تصاميم مستوحاة من المجوهرات الراقية.', 1],
      ['tom-ford', 'Tom Ford', 'États-Unis / Italie', 'Acétate épais et signature en T dorée (catalogue de démonstration).', 'أسيتات سميك وتفاصيل معدنية أنيقة.', 1],
      ['dior', 'Dior', 'France', 'Silhouettes couture et verres solaires architecturaux.', 'خطوط عصرية رفيعة بعدسات معمارية.', 1],
      ['gucci', 'Gucci', 'Italie', 'Montures audacieuses aux finitions écaille et or.', 'إطارات جريئة بلمسات ذهبية كلاسيكية.', 1],
      ['prada', 'Prada', 'Italie', 'Géométrie minimaliste et acétate poli main.', 'هندسة بسيطة وأسيتات مصقول يدوياً.', 1],
      ['persol', 'Persol', 'Italie', 'Savoir-faire artisanal italien et charnières flexibles.', 'حرفية إيطالية تقليدية ومفاصل مرنة.', 1],
      ['ray-ban', 'Ray-Ban', 'Italie / États-Unis', 'Icônes intemporelles Aviator et Wayfarer revisitées.', 'نماذج أيقونية خالدة بلمسة معاصرة.', 1],
      ['oakley', 'Oakley', 'États-Unis', 'Précision optique et alliages techniques légers.', 'دقة بصرية وخفة فائقة.', 1],
      ['versace', 'Versace', 'Italie', 'Caractère méditerranéen et détails sculptés.', 'طابع متوسطي جريء وتفاصيل منحوتة.', 1],
      ['michael-kors', 'Michael Kors', 'États-Unis', 'Élégance urbaine quotidienne et tons champagne.', 'أناقة يومية عصرية بدرجات الشامبانيا.', 1],
    ];
    for (const b of brands) insertBrand.run(...b);
  }

  // 5. Products
  const productCount = (db.prepare(`SELECT COUNT(*) as c FROM products`).get() as { c: number }).c;
  if (productCount === 0) {
    const getCatId = (slug: string) =>
      (db.prepare(`SELECT id FROM categories WHERE slug = ?`).get(slug) as { id: number }).id;
    const getBrandId = (slug: string) =>
      (db.prepare(`SELECT id FROM brands WHERE slug = ?`).get(slug) as { id: number }).id;

    const imgHero = '/src/assets/images/hero_casaoptiq_luxury_1794860297522.jpg';
    const imgAviator = '/src/assets/images/eyewear_aviator_gold_1794860297451.jpg';
    const imgAcetate = '/src/assets/images/eyewear_acetate_noir_1794860298059.jpg';
    const imgTortoise = '/src/assets/images/eyewear_optical_tortoise_1794860298551.jpg';
    const imgCatEye = '/src/assets/images/eyewear_cat_eye_champagne_1794860299974.jpg';
    const imgRimless = '/src/assets/images/eyewear_rimless_titanium_1794860299099.jpg';
    const imgCase = '/src/assets/images/eyewear_leather_case_1794860300551.jpg';

    const insertProd = db.prepare(`
      INSERT INTO products (
        reference, slug, name_fr, name_ar, brand_id, category_id,
        price_mad, old_price_mad, description_fr, description_ar,
        color_fr, color_ar, available_colors_json,
        frame_material_fr, frame_material_ar, dimensions,
        stock, badge, is_featured, images_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedProducts = [
      [
        'COQ-CAR-018',
        'cartier-vendome-gold-aviator',
        'Solaires Pilote Or Brossé',
        'نظارة شمسية أفياتور ذهبية مصقولة',
        getBrandId('cartier'),
        getCatId('montures-de-luxe'),
        8950,
        null,
        'Monture pilote sculptée en métal finition or champagne brossé, équipée de verres minéraux vert olive antireflet interne. Équilibre remarquable sur l’arête nasale et branches guillochées.',
        'إطار طراز أفياتور بمعدن مطلي بالذهب المصقول وعدسات خضراء زيتونية مضادة للانعكاس، توازن مثالي وراحة فائقة.',
        'Or Champagne / Vert Olive',
        'ذهبي شامبانيا / أخضر زيتوني',
        JSON.stringify(['Or Champagne / Vert Olive', 'Platine / Gris Fumée']),
        'Titane & placage or brossé',
        'تيتانيوم ومعدن مطلي بالذهب',
        '56-16-145 mm',
        6,
        'Best-seller',
        1,
        JSON.stringify([imgAviator, imgHero, imgRimless]),
      ],
      [
        'COQ-TF-0842',
        'tom-ford-anfa-noir-acetate',
        'Solaires Anfa Acétate Noir',
        'نظارة شمسية أنفا أسيتات أسود',
        getBrandId('tom-ford'),
        getCatId('solaires-hommes'),
        3950,
        4400,
        'Silhouette rectangulaire affirmée taillée dans un acétate italien noir profond de 8 mm, soulignée par des charnières discrètes dorées et une protection UV400 intégrale.',
        'تصميم مستطيل قوي منحوت من الأسيتات الإيطالي الأسود بسمك 8 ملم مع مفاصل ذهبية وحماية كاملة من الأشعة فوق البنفسجية.',
        'Noir Obsidienne / Or',
        'أسود أوبسيديان / ذهبي',
        JSON.stringify(['Noir Obsidienne / Or', 'Écaille Foncée']),
        'Acétate italien poli main',
        'أسيتات إيطالي مصقول يدوياً',
        '54-19-145 mm',
        11,
        'Promotion',
        1,
        JSON.stringify([imgAcetate, imgHero]),
      ],
      [
        'COQ-DIO-312',
        'dior-corniche-cat-eye-champagne',
        'Solaires Corniche Œil-de-Chat',
        'نظارة شمسية كورنيش كات آي شامبانيا',
        getBrandId('dior'),
        getCatId('solaires-femmes'),
        4650,
        null,
        'Courbes féminines œil-de-chat mariant acétate ivoire nacré et pont en métal doré. Verres dégradés ambre chaud offrant un confort visuel optimal sous le soleil atlantique.',
        'خطوط أنثوية أنيقة تجمع بين الأسيتات العاجي والمعدن الذهبي مع عدسات متدرجة بلون العنبر الدافئ.',
        'Or Champagne & Ivoire',
        'ذهبي شامبانيا وعاجي',
        JSON.stringify(['Or Champagne & Ivoire', 'Noir Brillant']),
        'Acétate & alliage doré',
        'أسيتات ومعدن ذهبي خفيف',
        '53-18-140 mm',
        8,
        'Nouveau',
        1,
        JSON.stringify([imgCatEye, imgHero]),
      ],
      [
        'COQ-PER-209',
        'persol-racine-optique-ecaille',
        'Optique Racine Écaille & Titane',
        'نظارة طبية راسين تورتويز وتيتانيوم',
        getBrandId('persol'),
        getCatId('lunettes-de-vue'),
        2890,
        null,
        'Monture pantos intemporelle associant un cerclage écaille havane chaleureux à un pont et des branches en titane doré. Compatible avec verres progressifs et traitement lumière bleue.',
        'إطار بانتوس كلاسيكي يجمع بين اللون العسلي الداكن وجسر من التيتانيوم الذهبي، مثالي للعدسات الطبية اليومية.',
        'Écaille Havane / Or',
        'تورتويز داكن / ذهبي',
        JSON.stringify(['Écaille Havane / Or', 'Noir Mat / Argent']),
        'Acétate & Titane',
        'أسيتات وتيتانيوم',
        '49-21-145 mm',
        14,
        'Best-seller',
        1,
        JSON.stringify([imgTortoise, imgRimless]),
      ],
      [
        'COQ-PRA-504',
        'prada-minimal-rimless-titanium',
        'Monture Percée Architecture Titane',
        'إطار طبي بدون حواف من التيتانيوم',
        getBrandId('prada'),
        getCatId('montures-de-luxe'),
        5200,
        null,
        'Monture percée ultra-légère pesant moins de 14 grammes, réalisée en titane japonais brossé. Lignes pures et plaquettes ajustables pour un port imperceptible toute la journée.',
        'إطار فائق الخفة بدون حواف مصنوع من التيتانيوم الياباني المصقول بوزن أقل من 14 غرام لراحة مثالية طوال اليوم.',
        'Titane Or Brossé',
        'تيتانيوم ذهبي مصقول',
        JSON.stringify(['Titane Or Brossé', 'Titane Anthracite']),
        'Titane japonais',
        'تيتانيوم ياباني خالص',
        '52-18-142 mm',
        5,
        'Nouveau',
        1,
        JSON.stringify([imgRimless, imgTortoise]),
      ],
      [
        'COQ-RB-3025',
        'ray-ban-heritage-aviator',
        'Solaires Aviator Classique Doré',
        'نظارة شمسية أفياتور كلاسيكية ذهبية',
        getBrandId('ray-ban'),
        getCatId('collections-unisexes'),
        1790,
        2150,
        'L’icône aviateur unisexe dans une finition dorée sobre avec verres G-15 vert classique filtrant 85 % de la lumière visible tout en préservant la fidélité des couleurs.',
        'النظارة الأيقونية للجنسين بإطار ذهبي كلاسيكي وعدسات خضراء تحافظ على وضوح الألوان الطبيعية.',
        'Or / Vert G-15',
        'ذهبي / أخضر كلاسيكي',
        JSON.stringify(['Or / Vert G-15', 'Noir / Gris']),
        'Métal léger',
        'معدن خفيف مقاوم للتآكل',
        '58-14-135 mm',
        18,
        'Promotion',
        0,
        JSON.stringify([imgAviator]),
      ],
      [
        'COQ-GUC-711',
        'gucci-palais-noir-unisexe',
        'Solaires Palais Carrée Noire',
        'نظارة شمسية باليه مربعة سوداء',
        getBrandId('gucci'),
        getCatId('collections-unisexes'),
        3650,
        null,
        'Monture unisexe aux volumes architecturaux en acétate noir brillant, rehaussée d’un détail métallique discret sur les branches et de verres fumés catégorie 3.',
        'إطار للجنسين بتصميم معماري من الأسيتات الأسود اللامع وعدسات دخانية عالية الحماية.',
        'Noir Brillant',
        'أسود لامع',
        JSON.stringify(['Noir Brillant', 'Havane']),
        'Acétate haute densité',
        'أسيتات عالي الكثافة',
        '53-20-145 mm',
        9,
        'Best-seller',
        0,
        JSON.stringify([imgAcetate, imgHero]),
      ],
      [
        'COQ-VER-440',
        'versace-mediterranee-cat-eye',
        'Solaires Méditerranée Dorées',
        'نظارة شمسية ميديتراني ذهبية',
        getBrandId('versace'),
        getCatId('solaires-femmes'),
        3100,
        3500,
        'Monture féminine lumineuse aux angles étirés, verres ambrés dégradés et branches affinées. Idéale pour un style affirmé de Casablanca à Marrakech.',
        'تصميم أنثوي مشرق بزوايا ممدودة وعدسات كهرمانية متدرجة تناسب إطلالات النهار الفاخرة.',
        'Ivoire & Or',
        'عاجي وذهبي',
        JSON.stringify(['Ivoire & Or', 'Noir & Or']),
        'Acétate & métal',
        'أسيتات ومعدن',
        '54-17-140 mm',
        0,
        'Promotion',
        0,
        JSON.stringify([imgCatEye]),
      ],
      [
        'COQ-MK-108',
        'michael-kors-maarif-optique',
        'Optique Maârif Fine Écaille',
        'نظارة طبية معاريف تورتويز رفيعة',
        getBrandId('michael-kors'),
        getCatId('lunettes-de-vue'),
        1650,
        null,
        'Monture optique polyvalente au profil affiné, pensée pour allier confort de lecture au bureau et légèreté quotidienne.',
        'نظارة طبية عملية بتصميم رفيع يجمع بين الأناقة والراحة اليومية في العمل.',
        'Écaille Dorée',
        'تورتويز ذهبي',
        JSON.stringify(['Écaille Dorée']),
        'Acétate & acier inoxydable',
        'أسيتات وفولاذ مقاوم للصدأ',
        '51-18-140 mm',
        12,
        null,
        0,
        JSON.stringify([imgTortoise]),
      ],
      [
        'COQ-OAK-902',
        'oakley-horizon-titane-sport',
        'Solaires Horizon Alliage Noir',
        'نظارة شمسية هورايزون سبائك سوداء',
        getBrandId('oakley'),
        getCatId('solaires-hommes'),
        2290,
        null,
        'Monture enveloppante légère conçue pour une tenue irréprochable en conduite côtière et par forte luminosité, avec verres polarisants haute définition.',
        'إطار خفيف وثابت مصمم للقيادة والإضاءة القوية مع عدسات مستقطبة عالية الوضوح.',
        'Noir Mat / Fumée',
        'أسود مطفي / رمادي',
        JSON.stringify(['Noir Mat / Fumée']),
        'Alliage O-Matter & titane',
        'سبيكة خفيفة وتيتانيوم',
        '57-17-138 mm',
        7,
        'Nouveau',
        0,
        JSON.stringify([imgHero, imgAcetate]),
      ],
      [
        'COQ-ACC-001',
        'coffret-cuir-grain-entretien-casaoptiq',
        'Étui Cuir Grainé & Coffret Entretien',
        'حافظة جلدية فاخرة ومجموعة العناية',
        getBrandId('cartier'),
        getCatId('accessoires'),
        690,
        null,
        'Étui rigide gainé de cuir grainé noir et cognac avec fermoir laiton brossé, accompagné d’une chamoisine microfibre tissée serrée et d’un spray nettoyant optique sans alcool.',
        'حافظة صلبة مكسوة بالجلد الطبيعي الأسود والبني مع قفل نحاسي، مرفقة بمنديل مايكروفايبر وبخاخ تنظيف آمن للعدسات.',
        'Noir & Cognac',
        'أسود وبني كونياك',
        JSON.stringify(['Noir & Cognac']),
        'Cuir grainé & laiton brossé',
        'جلد طبيعي ونحاس مصقول',
        '165 × 68 × 42 mm',
        25,
        'Best-seller',
        1,
        JSON.stringify([imgCase]),
      ],
    ];

    for (const p of seedProducts) {
      insertProd.run(...p);
    }
  }

  // 6. Demo Coupons
  const couponCount = (db.prepare(`SELECT COUNT(*) as c FROM coupons`).get() as { c: number }).c;
  if (couponCount === 0) {
    db.prepare(`INSERT INTO coupons (code, discount_percent, expires_at, is_active) VALUES (?, ?, ?, ?)`).run(
      'CASA10',
      10,
      '2027-12-31',
      1
    );
    db.prepare(`INSERT INTO coupons (code, discount_percent, expires_at, is_active) VALUES (?, ?, ?, ?)`).run(
      'BIENVENUE15',
      15,
      '2027-12-31',
      1
    );
  }

  // 7. Demo Reviews
  const reviewCount = (db.prepare(`SELECT COUNT(*) as c FROM reviews`).get() as { c: number }).c;
  if (reviewCount === 0) {
    const prod1 = db.prepare(`SELECT id FROM products WHERE reference = 'COQ-CAR-018'`).get() as { id: number } | undefined;
    const prod2 = db.prepare(`SELECT id FROM products WHERE reference = 'COQ-TF-0842'`).get() as { id: number } | undefined;
    const prod3 = db.prepare(`SELECT id FROM products WHERE reference = 'COQ-DIO-312'`).get() as { id: number } | undefined;
    const prod4 = db.prepare(`SELECT id FROM products WHERE reference = 'COQ-PER-209'`).get() as { id: number } | undefined;

    const insertRev = db.prepare(`
      INSERT INTO reviews (product_id, author_name, rating, comment, is_verified)
      VALUES (?, ?, ?, ?, 1)
    `);

    if (prod1) {
      insertRev.run(prod1.id, 'Karim Bennani — Casablanca', 5, 'Finitions irréprochables et légèreté étonnante. La livraison à Anfa a été effectuée le lendemain dans un coffret soigné.');
    }
    if (prod2) {
      insertRev.run(prod2.id, 'Youssef El Amrani — Rabat', 5, 'Acétate épais très qualitatif, tenue parfaite sans glisser. Le conseil par téléphone avant confirmation était très professionnel.');
    }
    if (prod3) {
      insertRev.run(prod3.id, 'Salma Chraïbi — Casablanca', 5, 'Teinte champagne sublime qui adoucit le visage. Verres confortables même en plein soleil sur la Corniche.');
    }
    if (prod4) {
      insertRev.run(prod4.id, 'Nadia Tazi — Marrakech', 4, 'Monture optique très élégante, mon opticien a monté mes verres progressifs sans aucune difficulté.');
    }
  }

  // 8. Demo Customer & Sample Orders so dashboard KPIs & order history are immediately populated
  const customerCount = (db.prepare(`SELECT COUNT(*) as c FROM customers`).get() as { c: number }).c;
  if (customerCount === 0) {
    const demoUserRes = db.prepare(`
      INSERT INTO users (email, password_hash, role, must_change_password, full_name, phone, address, city)
      VALUES (?, ?, 'customer', 0, ?, ?, ?, ?)
    `).run(
      'client.demo@casaoptiq.example',
      hashPassword('CasaClient2026!'),
      'Mehdi Berrada',
      '+212 661 00 00 01',
      '14 Rue d’Alger, Quartier Gautier',
      'Casablanca'
    );
    const demoUserId = Number(demoUserRes.lastInsertRowid);

    const cust1Res = db.prepare(`
      INSERT INTO customers (user_id, full_name, email, phone, address, city)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      demoUserId,
      'Mehdi Berrada',
      'client.demo@casaoptiq.example',
      '+212 661 00 00 01',
      '14 Rue d’Alger, Quartier Gautier',
      'Casablanca'
    );
    const cust1Id = Number(cust1Res.lastInsertRowid);

    const cust2Res = db.prepare(`
      INSERT INTO customers (user_id, full_name, email, phone, address, city)
      VALUES (NULL, ?, ?, ?, ?, ?)
    `).run(
      'Kenza Alaoui',
      'kenza.alaoui@example.ma',
      '+212 662 00 00 02',
      'Avenue Mohammed VI, Souissi',
      'Rabat'
    );
    const cust2Id = Number(cust2Res.lastInsertRowid);

    const p1 = db.prepare(`SELECT id, name_fr, reference, price_mad FROM products WHERE reference = 'COQ-CAR-018'`).get() as { id: number; name_fr: string; reference: string; price_mad: number };
    const p2 = db.prepare(`SELECT id, name_fr, reference, price_mad FROM products WHERE reference = 'COQ-DIO-312'`).get() as { id: number; name_fr: string; reference: string; price_mad: number };
    const p3 = db.prepare(`SELECT id, name_fr, reference, price_mad FROM products WHERE reference = 'COQ-ACC-001'`).get() as { id: number; name_fr: string; reference: string; price_mad: number };

    if (p1 && p2 && p3) {
      const o1 = db.prepare(`
        INSERT INTO orders (
          order_number, customer_id, user_id, customer_name, customer_phone, customer_email,
          shipping_address, shipping_city, subtotal_mad, discount_mad, shipping_fee_mad, total_mad,
          payment_method, payment_status, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'cod', 'paid', 'Livrée', datetime('now', '-6 days'))
      `).run(
        'COQ-2026-1001', cust1Id, demoUserId, 'Mehdi Berrada', '+212 661 00 00 01',
        'client.demo@casaoptiq.example', '14 Rue d’Alger, Quartier Gautier', 'Casablanca',
        p1.price_mad, p1.price_mad
      );
      const o1Id = Number(o1.lastInsertRowid);
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, product_reference, selected_color, quantity, unit_price_mad, total_price_mad)
        VALUES (?, ?, ?, ?, 'Or Champagne / Vert Olive', 1, ?, ?)
      `).run(o1Id, p1.id, p1.name_fr, p1.reference, p1.price_mad, p1.price_mad);
      db.prepare(`
        INSERT INTO payments (order_id, method, provider, status, amount_mad, reference)
        VALUES (?, 'cod', 'Paiement à la livraison', 'paid', ?, 'COD-1001')
      `).run(o1Id, p1.price_mad);

      const o2 = db.prepare(`
        INSERT INTO orders (
          order_number, customer_id, user_id, customer_name, customer_phone, customer_email,
          shipping_address, shipping_city, subtotal_mad, discount_mad, shipping_fee_mad, total_mad,
          payment_method, payment_status, status, created_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'cod', 'pending', 'En attente', datetime('now', '-1 day'))
      `).run(
        'COQ-2026-1002', cust2Id, 'Kenza Alaoui', '+212 662 00 00 02',
        'kenza.alaoui@example.ma', 'Avenue Mohammed VI, Souissi', 'Rabat',
        p2.price_mad + p3.price_mad, p2.price_mad + p3.price_mad
      );
      const o2Id = Number(o2.lastInsertRowid);
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, product_reference, selected_color, quantity, unit_price_mad, total_price_mad)
        VALUES (?, ?, ?, ?, 'Or Champagne & Ivoire', 1, ?, ?)
      `).run(o2Id, p2.id, p2.name_fr, p2.reference, p2.price_mad, p2.price_mad);
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, product_reference, selected_color, quantity, unit_price_mad, total_price_mad)
        VALUES (?, ?, ?, ?, 'Noir & Cognac', 1, ?, ?)
      `).run(o2Id, p3.id, p3.name_fr, p3.reference, p3.price_mad, p3.price_mad);
      db.prepare(`
        INSERT INTO payments (order_id, method, provider, status, amount_mad, reference)
        VALUES (?, 'cod', 'Paiement à la livraison', 'pending', ?, 'COD-1002')
      `).run(o2Id, p2.price_mad + p3.price_mad);
    }
  }
}
