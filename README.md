# SRSMS — Smart Retail Shop Management System (PHP Edition)

Mfumo kamili wa POS + Batch-based Inventory + Role-based Access + Real-time Profit & Loss Engine + Reports, uliojengwa kwa **Plain PHP (bila framework) + PDO + MySQL**, na frontend ya **HTML/CSS/JavaScript** (hakuna framework — inaendesha popote).

✅ Hakuna Composer inahitajika
✅ Hakuna Node.js inahitajika
✅ Inafanya kazi kwenye **hosting yoyote ya cPanel/shared hosting** yenye PHP 7.4+ na MySQL

---

## 📦 Vilivyomo (What's Inside)

```
srsms-php/
├── api/
│   ├── auth/            # login.php, logout.php, me.php (PHP Sessions)
│   ├── users/            # User & role management (Super Admin/Manager)
│   ├── products/         # Products + batch inventory (FIFO)
│   ├── sales/             # POS - create sale, list, void
│   ├── expenses/          # Expense recording + approval workflow
│   ├── dashboard/         # Real-time P&L summary, trends, top products
│   ├── partners/          # Suppliers, customers, categories
│   ├── settings/          # Shop settings, audit logs
│   └── reports/           # PDF (print-ready HTML) + Excel (.xls/CSV) exports
├── config/
│   ├── database.php       # ⚠️ EDIT THIS - your MySQL credentials
│   └── bootstrap.php      # Session, auth helpers, RBAC, audit logging
├── database/
│   └── schema.sql           # Full MySQL schema + roles/permissions/users seed (everything in one file)
├── assets/
│   ├── css/style.css        # Design system (60/30/10 rule)
│   └── js/                   # API client + UI pages (vanilla JS)
└── index.html                # Single-page app entry point
```

---

## 🚀 Hatua za Kuendesha (Setup Instructions)

### 1. Hitajio (Requirements)
- PHP 7.4+ (PHP 8.x inapendekezwa) na extension za `pdo_mysql`
- MySQL 8.0+ (au MariaDB 10.5+)
- Apache (na `mod_rewrite`/`.htaccess` support) au Nginx, au hata `php -S` kwa majaribio ya haraka

### 2. Tengeneza Database

```bash
mysql -u root -p < database/schema.sql
```

Hii itatengeneza database `srsms` pamoja na **kila kitu kinachohitajika kuanza kutumia mfumo papo hapo**:
- Tables zote (users, products, batches, sales, expenses, n.k.)
- Roles 6: super_admin, admin, cashier, store_keeper, accountant, auditor
- Permissions na role_permissions mapping
- Default settings
- **Watumiaji 6 wa kuingia papo hapo** (angalia jedwali hapa chini)
- Default expense categories na product category

### 3. Sanidi Database Connection

Fungua `config/database.php` na badilisha:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'srsms');
define('DB_USER', 'root');
define('DB_PASS', 'your_mysql_password');   // <-- weka password yako
```

### 4. Login na Watumiaji wa Default

✅ Hatua ya 2 pekee (kuingiza `schema.sql`) inatosha — **watumiaji 6 tayari wapo kwenye database**, username na password zipo moja kwa moja, bcrypt hashes halisi zimeshajengwa ndani ya schema. Hakuna script ya ziada ya kuendesha.

| Role | Username | Password |
|---|---|---|
| Super Admin | `superadmin` | `Admin@123` |
| Owner | `owner1` | `Demo@123` |
| Manager | `manager1` | `Demo@123` |
| Cashier | `cashier1` | `Demo@123` |
| Store Keeper | `storekeeper1` | `Demo@123` |
| Accountant | `accountant1` | `Demo@123` |
| Auditor | `auditor1` | `Demo@123` |

⚠️ **MUHIMU**: Hizi ni demo accounts zenye password ya pamoja (`Demo@123` kwa wote isipokuwa Super Admin). Kabla ya kuipeleka live (production), **badilisha password za kila account** kupitia ukurasa wa "Users & Roles" (Super Admin), au futa demo accounts kabisa na utengeneze watumiaji halisi.

### 5. Anzisha Server

**Kwa hosting halisi (cPanel/Apache/Nginx):**
Pakia folder nzima `srsms-php/` kwenye `public_html` (au subdomain folder), hakikisha `index.html` inafikika kama default document.

**Kwa majaribio ya haraka kwenye kompyuta yako (PHP built-in server):**
```bash
php -S localhost:8000
```
Fungua: **http://localhost:8000**

---

## 👥 Majukumu ya Roles (Role Capabilities)

Mfumo una **roles 7** kwa duka moja lenye muundo wa kitaalamu:

```
Super Admin (System Owner)
│
├── Owner (Mmiliki wa Duka)
├── Manager (Msimamizi wa Duka)
├── Accountant (Mhasibu)
├── Store Keeper (Msimamizi wa Stock)
├── Cashier (Muuzaji)
└── Auditor (Mkaguzi - Read Only)
```

| Role | Anaweza Kufanya |
|---|---|
| **Super Admin** | Kila kitu — users, roles, settings, reports zote, backup |
| **Owner** | Anaona faida/hasara, expenses approval, reports zote, business analytics — HAINGIZI mauzo ya kila siku |
| **Manager** | Anaendesha shughuli za kila siku — products, stock, purchases, mauzo (anaweza kuuza POS), users wa kawaida |
| **Accountant** | Expenses, P&L reports, cash flow — siyo POS wala stock |
| **Store Keeper** | Products, batches, expiry dates, suppliers, purchases — siyo mauzo wala haoni profit |
| **Cashier** | POS pekee — anarekodi mauzo YOTE kwenye system, anachapisha risiti, anasajili wateja — haoni profit, hawezi kubadilisha stock |
| **Auditor** | Read-only — audit logs, sales, reports zote — hawezi kuedit au kufuta chochote |

### Permissions Matrix Kamili

| Module | Super Admin | Owner | Manager | Accountant | Store Keeper | Cashier | Auditor |
|---|---|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Products | ✅ | 👁️ | ✅ | 👁️ | ✅ | 👁️ | 👁️ |
| Inventory | ✅ | 👁️ | ✅ | 👁️ | ✅ | ❌ | 👁️ |
| Sales/POS | ✅ | 👁️ | ✅ | 👁️ | ❌ | ✅ | 👁️ |
| Purchases | ✅ | 👁️ | ✅ | 👁️ | ✅ | ❌ | 👁️ |
| Expenses | ✅ | ✅ | 👁️ | ✅ | ❌ | ❌ | 👁️ |
| Profit & Loss | ✅ | ✅ | 👁️ | ✅ | ❌ | ❌ | 👁️ |
| Reports | ✅ | ✅ | ✅ | ✅ | 👁️ | ❌ | ✅ |
| Users | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:** ✅ Full Access · 👁️ View Only · ❌ No Access

---

## 🔑 Vipengele Muhimu vya Kiufundi (Key Technical Features)

- **PHP Sessions Auth**: Login inatumia `$_SESSION` ya kawaida ya PHP (httponly cookie, dakika 480 = masaa 8) — hakuna JWT, hakuna token za kusimamia.
- **FIFO Batch Deduction**: Mauzo yanapunguza stock kutoka batch ya zamani zaidi kwanza, kiotomatiki, kwa kutumia `SELECT ... FOR UPDATE` (row locking) ndani ya PDO transaction.
- **Atomic Transactions**: Kila mauzo ni PDO transaction moja — ikishindikana sehemu yoyote, yote yanarudi nyuma (`rollBack()`), hakuna data chafu.
- **Account Lockout**: Baada ya majaribio 5 ya password isiyo sahihi, account inafungwa kwa dakika 15.
- **Role-Based Access Control (RBAC)**: Kila endpoint ya API ina `requireRole()` au `requirePermission()` kabla ya kufanya kazi yoyote.
- **Audit Logging**: Kila kitendo muhimu (login, mauzo, mabadiliko ya stock, n.k.) kinarekodiwa kwenye `audit_logs`.
- **Real-time P&L Engine**: Gross Profit = Sales − COGS; Net Profit = Gross Profit − Expenses − Stock Loss (zinahesabiwa moja kwa moja kwa SQL queries, hakuna caching ngumu inayohitajika kwa maduka madogo-kati).
- **Reports bila Composer**:
  - **PDF** → endpoint inatoa HTML iliyopangiliwa vizuri ya kuprint (`window.print()` → "Save as PDF" kwenye browser yoyote). Hakuna TCPDF/mPDF inahitajika.
  - **Excel** → endpoint inatoa CSV yenye `.xls` extension na UTF-8 BOM, inafunguliwa moja kwa moja na Microsoft Excel/Google Sheets bila ujanja wowote.

### 🏪 Flow ya Kibiashara ya Duka (Shop Business Flow)

- **Expiry Date ya Lazima (na Wazi)**: Kila batch mpya ya bidhaa LAZIMA itaje kama ina expiry date au la — hakuna kuiacha wazi kimakosa. Bidhaa zinazoharibika (mkate, maziwa, n.k.) lazima ziwe na tarehe; bidhaa zisizoharibika (vyombo, nguo) zinawekwa wazi kama "Does not expire". Hii inazuiwa kwa validation ngumu kwenye backend (`api/products/add-batch.php`), si kwenye frontend pekee.
- **Daily Sales Register** ("Sales History" → tab ya "📋 Daily Register"): Boss anaona kwa siku moja — ni nani aliuza nini, lini, kiasi gani, na faida ngapi, ikiwa imepangwa kwa kila cashier. Pia inaonyesha mauzo yaliyofutwa (voided) kwa siku husika, ili Boss aone red flags. Cashier hawezi kufikia ukurasa huu — ni wa Super Admin/Owner/Manager/Accountant/Auditor pekee.
- **Profit & Loss Breakdown ya Dashboard**: Dashboard ya Boss sasa inaonyesha hesabu kamili kama statement ya kihasibu: Revenue → COGS → Gross Profit → Expenses → Stock Loss (bidhaa zilizoharibika/expired) → **Net Profit ya mwisho**. Hii inazuia Boss kudanganywa na "faida ya juu juu" ambayo haijatoa hasara ya stock.
- **Business Health Panel**: Muhtasari wa haraka wa thamani ya stock iliyopo, thamani iliyo hatarini ya kuisha muda, bidhaa zilizoisha muda bila kuandikwa hasara, na maombi ya expenses yanayosubiri idhini — yote kwenye mtazamo mmoja.

---

## 🌐 Kuipeleka Live (Production Deployment)

Mfumo huu uko tayari kuendeshwa kwenye **hosting yoyote ya kawaida ya PHP**:
- **cPanel / shared hosting** (Bluehost, Namecheap, n.k.) — pakia tu kupitia File Manager au FTP
- **VPS** (DigitalOcean, Linode) na LAMP/LEMP stack
- **Railway / Render** zenye PHP buildpack

### Hatua za ziada za usalama production:
1. Weka HTTPS (Let's Encrypt / Cloudflare) — vinginevyo session cookie haitakuwa salama vya kutosha
2. Badilisha `APP_ENV` kuwa `'production'` kwenye `config/database.php` (huficha error details kwa watumiaji)
3. **Badilisha password za demo accounts zote** (kupitia "Users & Roles") au zifute kabisa kabla ya kuanza kutumia data halisi
4. Weka MySQL backups za kila siku (automated, kupitia cPanel cron au `mysqldump`)
5. Hakikisha folder ya `config/` haifikiki moja kwa moja kupitia browser (tayari kuna `.htaccess` ya kuzuia hili — kwa Nginx utahitaji kuongeza block sawa kwenye config yako)

---

## 📊 Database Schema Highlights

Angalia `database/schema.sql` kwa muundo kamili. Tables kuu:

- `users`, `roles`, `permissions`, `role_permissions` — Auth & RBAC
- `products`, `product_batches`, `inventory_logs` — Batch inventory (NO barcode needed)
- `sales`, `sales_items`, `payments` — POS transactions
- `expenses`, `expense_categories` — Finance & approval workflow
- `audit_logs`, `notifications` — Compliance & alerts

---

## 🛠 Kuongeza Vipengele Zaidi (Next Steps)

Mfumo huu ni msingi imara. Unaweza kuongeza:
- Cron job ya kila siku (kupitia cPanel Cron Jobs) kuendesha script ndogo ya PHP itakayoangalia low-stock/expiry na kuingiza kwenye `notifications` table
- Multi-branch/multi-shop support (ongeza `shop_id` kwenye tables husika)
- TCPDF au mPDF (kupitia Composer) ukitaka PDF za moja kwa moja badala ya print-to-PDF
- PhpSpreadsheet (kupitia Composer) ukitaka Excel halisi (.xlsx) yenye formatting badala ya CSV
- Barcode scanner integration (ongeza `barcode` field kwenye `products`)

---

Imetengenezwa kama **Enterprise Retail Intelligence System** — POS + Inventory + Accounting katika mfumo mmoja, kwa PHP safi inayofanya kazi popote.
