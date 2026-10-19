/* ============================================================
   SRSMS App Shell
   Router + role-based sidebar + page mounting
   ============================================================ */

const ICONS = {
    dashboard: '<i class="fa-solid fa-chart-line" aria-hidden="true"></i>',
    pos: '<i class="fa-solid fa-cash-register" aria-hidden="true"></i>',
    products: '<i class="fa-solid fa-box-open" aria-hidden="true"></i>',
    sales: '<i class="fa-solid fa-receipt" aria-hidden="true"></i>',
    expenses: '<i class="fa-solid fa-file-invoice-dollar" aria-hidden="true"></i>',
    reports: '<i class="fa-solid fa-chart-simple" aria-hidden="true"></i>',
    users: '<i class="fa-solid fa-users" aria-hidden="true"></i>',
    profile: '<i class="fa-solid fa-circle-user" aria-hidden="true"></i>',
    settings: '<i class="fa-solid fa-gear" aria-hidden="true"></i>',
    audit: '<i class="fa-solid fa-clipboard-list" aria-hidden="true"></i>',
    suppliers: '<i class="fa-solid fa-truck" aria-hidden="true"></i>',
    customers: '<i class="fa-solid fa-user-group" aria-hidden="true"></i>',
    logout: '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>',
    bell: '<i class="fa-solid fa-bell" aria-hidden="true"></i>'
};

const BASE_NAV = [
    { key: 'dashboard', label: 'Dashibodi', icon: 'dashboard' },
    { key: 'pos', label: 'Kituo cha Mauzo', icon: 'pos' },
    { key: 'products', label: 'Bidhaa & Hisa', icon: 'products' },
    { key: 'sales', label: 'Taarifa za Mauzo', icon: 'sales' },
    { key: 'expenses', label: 'Matumizi', icon: 'expenses' },
    { key: 'suppliers', label: 'Wazabuni', icon: 'suppliers' },
    { key: 'customers', label: 'Wateja', icon: 'customers' },
    { key: 'reports', label: 'Ripoti', icon: 'reports' },
    { key: 'users', label: 'Watumiaji & Majukumu', icon: 'users' },
    { key: 'profile', label: 'Wasifu Wangu', icon: 'profile' },
    { key: 'audit', label: 'Rekodi za Ukaguzi', icon: 'audit' },
    { key: 'settings', label: 'Mipangilio ya Mfumo', icon: 'settings' },
];

const NAV_CONFIG = {
    super_admin: BASE_NAV,
    admin: BASE_NAV,
    owner: BASE_NAV,
};

let currentPage = null;

const LANGUAGE_STORAGE_KEY = 'srsms_language';
const LANGUAGE_PHRASES = {
    sw: {
        'Dashboard': 'Dashibodi',
        'POS': 'Kituo cha Mauzo',
        'Products & Stock': 'Bidhaa & Hisa',
        'Sales': 'Taarifa za Mauzo',
        'Expenses': 'Matumizi',
        'Suppliers': 'Wazabuni',
        'Customers': 'Wateja',
        'Reports': 'Ripoti',
        'Users & Roles': 'Watumiaji & Majukumu',
        'Profile': 'Wasifu',
        'Profile': 'Wasifu',
        'Audit Logs': 'Rekodi za Ukaguzi',
        'System Settings': 'Mipangilio ya Mfumo',
        'Notifications': 'Arifa',
        'Menu': 'Menyu',
        'Settings': 'Mipangilio',
        'Wasifu Wangu': 'Wasifu Wangu',
        'Jukwaa la Rejareja la Dhahabu': 'Jukwaa la Rejareja la Dhahabu',
        'Shughuli za Rejareja la Dhahabu': 'Shughuli za Rejareja la Dhahabu',
        'Mmiliki & Msimamizi Wapo Tayari': 'Mmiliki & Msimamizi Wapo Tayari',
        'Logout': 'Toka',
        'Safe & Verified': 'Salama & Sahihi',
        'Open menu': 'Fungua menyu',
        'Login': 'Ingia',
        'Username': 'Jina la mtumiaji',
        'Password': 'Nenosiri',
        'Remember me': 'Nikumbuke',
        'Forgot password': 'Umesahau nywila',
        'Sign in': 'Ingia',
        'Loading': 'Inapakia',
        'No data available': 'Hakuna data inayopatikana',
        'Error': 'Hitilafu',
        'Success': 'Mafanikio',
        'Manage your store with real numbers, not guesses.': 'Endesha duka kwa namba za ukweli, si makisio.',
        'SRSMS brings POS, batch inventory, and live profit tracking into one system — built for shops that need to know every shilling spent.': 'SRSMS huleta POS, hisa za batch, na ufuatiliaji wa faida moja kwa moja kwenye mfumo mmoja — ulioundwa kwa maduka yanahitaji kujua kila shilingi iliyotumika.',
        'User Roles': 'Majukumu ya Watumiaji',
        'Batch Tracking': 'Ufuatiliaji wa Batch',
        'Profit & Expense System': 'Mfumo wa Faida na Gharama',
        'Enter your username and password to access your dashboard.': 'Ingiza jina lako la mtumiaji na nenosiri ili kufikia dashibodi yako.',
        'Username or Email': 'Jina la mtumiaji au Barua pepe',
        'Show password': 'Onyesha nenosiri',
        'Hide password': 'Ficha nenosiri',
        'System Roles': 'Majukumu ya Mfumo',
        'Login failed. Please check your credentials.': 'Kuingia kumeishindikana. Tafadhali angalia taarifa zako.',
        'Signing in...': 'Ingia...',
        'Super Admin': 'Msimamizi Mkuu',
        'Admin': 'Msimamizi',
        'Cashier': 'Mhasibu',
        'Store Keeper': 'Msimamizi wa Hifadhi',
        'Accountant': 'Mhasibu',
        'Auditor': 'Mkaguzi'
    },
    en: {
        'Dashibodi': 'Dashboard',
        'Kituo cha Mauzo': 'POS',
        'Bidhaa & Hisa': 'Products & Stock',
        'Taarifa za Mauzo': 'Sales',
        'Matumizi': 'Expenses',
        'Wazabuni': 'Suppliers',
        'Wateja': 'Customers',
        'Ripoti': 'Reports',
        'Watumiaji & Majukumu': 'Users & Roles',
        'Wasifu': 'Profile',
        'Rekodi za Ukaguzi': 'Audit Logs',
        'Mipangilio ya Mfumo': 'System Settings',
        'Arifa': 'Notifications',
        'Menyu': 'Menu',
        'Mipangilio': 'Settings',
        'Toka': 'Logout',
        'Salama & Sahihi': 'Safe & Verified',
        'Fungua menyu': 'Open menu',
        'Ingia': 'Login',
        'Jina la mtumiaji': 'Username',
        'Nenosiri': 'Password',
        'Nikumbuke': 'Remember me',
        'Umesahau nywila': 'Forgot password',
        'Inapakia': 'Loading',
        'Hakuna data inayopatikana': 'No data available',
        'Hitilafu': 'Error',
        'Mafanikio': 'Success',
        'Endesha duka kwa namba za ukweli, si makisio.': 'Manage your store with real numbers, not guesses.',
        'SRSMS huleta POS, hisa za batch, na ufuatiliaji wa faida moja kwa moja kwenye mfumo mmoja — ulioundwa kwa maduka yanahitaji kujua kila shilingi iliyotumika.': 'SRSMS brings POS, batch inventory, and live profit tracking into one system — built for shops that need to know every shilling spent.',
        'Majukumu ya Watumiaji': 'User Roles',
        'Ufuatiliaji wa Batch': 'Batch Tracking',
        'Mfumo wa Faida na Gharama': 'Profit & Expense System',
        'Ingiza jina lako la mtumiaji na nenosiri ili kufikia dashibodi yako.': 'Enter your username and password to access your dashboard.',
        'Jina la mtumiaji au Barua pepe': 'Username or Email',
        'Onyesha nenosiri': 'Show password',
        'Ficha nenosiri': 'Hide password',
        'Majukumu ya Mfumo': 'System Roles',
        'Kuingia kumeishindikana. Tafadhali angalia taarifa zako.': 'Login failed. Please check your credentials.',
        'Ingia...': 'Signing in...'
    }
};

const UI_TRANSLATION_PAIRS = [
    ['Dashibodi', 'Dashboard'],
    ['Kituo cha Mauzo', 'Point of Sale'],
    ['Bidhaa & Hisa', 'Products & Inventory'],
    ['Taarifa za Mauzo', 'Sales Reports'],
    ['Matumizi', 'Expenses'],
    ['Wazabuni', 'Suppliers'],
    ['Wateja', 'Customers'],
    ['Ripoti', 'Reports'],
    ['Watumiaji & Majukumu', 'Users & Roles'],
    ['Wasifu Wangu', 'My Profile'],
    ['Rekodi za Ukaguzi', 'Audit Logs'],
    ['Mipangilio ya Mfumo', 'System Settings'],
    ['Arifa', 'Notifications'],
    ['Jukwaa la Rejareja la Dhahabu', 'Gold Retail Platform'],
    ['Shughuli za Rejareja la Dhahabu', 'Gold Retail Operations'],
    ['Mmiliki & Msimamizi Wapo Tayari', 'Owner & Manager Ready'],
    ['Menyu', 'Menu'],
    ['Toka', 'Log Out'],
    ['Salama & Sahihi', 'Secure & Verified'],
    ['Fungua menyu', 'Open menu'],
    ['Ingia', 'Sign In'],
    ['Jina la mtumiaji', 'Username'],
    ['Nenosiri', 'Password'],
    ['Jina la mtumiaji au Barua pepe', 'Username or Email'],
    ['Onyesha nenosiri', 'Show password'],
    ['Ficha nenosiri', 'Hide password'],
    ['Majukumu ya Mfumo', 'System Roles'],
    ['Majukumu ya Watumiaji', 'User Roles'],
    ['Msimamizi Mkuu', 'Super Admin'],
    ['Msimamizi wa Hisa', 'Store Keeper'],
    ['Mkasishaji', 'Cashier'],
    ['Mhasibu', 'Accountant'],
    ['Meneja', 'Manager'],
    ['Mmiliki', 'Owner'],
    ['Mkaguzi', 'Auditor'],
    ['Msimamizi', 'Admin'],
    ['Kituo cha Uongozi', 'Leadership Hub'],
    ['Utendaji wa duka kwa muonekano mmoja', 'Store performance at a glance'],
    ['Fuatilia mauzo, hisa, matumizi, na arifa katika eneo moja salama la kazi kwa duka linalokua.', 'Track sales, inventory, expenses, and alerts in one secure workspace for a growing shop.'],
    ['Mauzo Mpya', 'New Sale'],
    ['Dhibiti Hisa', 'Manage Inventory'],
    ['Mauzo ya Leo', "Today's Sales"],
    ['Mwezi huu', 'This month'],
    ['muamala ulioandikwa', 'transactions recorded'],
    ['Faida ya Leo', "Today's Profit"],
    ['Baada ya matumizi na hasara ya hisa', 'After expenses and inventory losses'],
    ['Mapato ya Mwezi huu', "This Month's Revenue"],
    ['Faida ya Mwezi huu', "This Month's Profit"],
    ['Utendaji wa faida mwezi huu', 'Profit performance this month'],
    ['Onyo la hasara linahitaji uangalizi', 'Loss warning needs attention'],
    ['kuliko mwezi uliopita', 'compared with last month'],
    ['Mwelekeo wa Mauzo (Siku 30)', 'Sales Trend (30 Days)'],
    ['Arifa za Muda Halisi', 'Real-Time Alerts'],
    ['Hisa Zisizokidhi Kiwango', 'Low Stock'],
    ['Hisa ziko katika hali nzuri.', 'Stock levels are healthy.'],
    ['Zina Karibia Kuisha Muda', 'Expiring Soon'],
    ['Hakuna batch zinazokaribia kuisha muda.', 'No batches are nearing expiration.'],
    ['Hakuna kundi zinazokaribia kuisha muda.', 'No batches are nearing expiration.'],
    ['Bidhaa Zilizouzwa Sana', 'Top-Selling Products'],
    ['Vipande Vilivyouzwa', 'Units Sold'],
    ['Mapato', 'Revenue'],
    ['Muda wa Kujibu DB', 'DB Response'],
    ['imebatilishwa', 'voided'],
    ['Mapato ya Jumla (Mauzo)', 'Total Revenue (Sales)'],
    ['Gharama ya Bidhaa Zilizouzwa (COGS)', 'Cost of Goods Sold (COGS)'],
    ['Faida ya Kawaida', 'Gross Profit'],
    ['Matumizi ya Uendeshaji (yamekubaliwa)', 'Operating Expenses (approved)'],
    ['Hasara ya Hisa (imeharibiwa / imemaliza muda)', 'Inventory Loss (damaged / expired)'],
    ['Faida Halisi', 'Net Profit'],
    ['Kiwango cha Faida ya Kawaida', 'Gross Profit Margin'],
    ['Kiwango cha Faida Halisi', 'Net Profit Margin'],
    ['Mwezi huu una hasara. Angalia matumizi na hasara ya hisa ili kubaini chanzo.', 'This month has a loss. Review expenses and inventory losses to identify the cause.'],
    ['Ina faida', 'Profitable'],
    ['Ina hasara', 'Loss-making'],
    ['Afya ya Biashara', 'Business Health'],
    ['Fungua Rejesta ya Kila Siku', 'Open Daily Register'],
    ['Thamani ya Hisa (kwa gharama)', 'Inventory Value (at cost)'],
    ['Inauzwa kwa', 'Potential sales value:'],
    ['ikiwa yote itahama', 'if all stock sells'],
    ['Imekwisha Muda (isiyouzwa)', 'Expired (unsold)'],
    ['batch(z) zinahitaji kufutwa', 'batch(es) need to be cleared'],
    ['Thamani Hatari (inakaribia kuisha muda)', 'At-Risk Value (nearing expiry)'],
    ['Ndani ya siku', 'Within'],
    ['Hasara ya Hisa ya Maisha yote', 'Lifetime Inventory Loss'],
    ['Zilizoharibiwa na zilizokwisha muda', 'Damaged and expired stock'],
    ['matumizi yanasubiri uidhinishaji wako', 'expenses are awaiting your approval'],
    ['bidhaa zina', 'products have'],
    ['hisa sifuri', 'zero stock'],
    ['na hazitaonekana kwenye POS', 'and will not appear in POS'],
    ['gusa kuona', 'tap to view'],
    ['Nenda Kuweka Hisa', 'Go to Stock-In'],
    ['Hakuna mauzo yaliyoandikwa bado katika kipindi hiki.', 'No sales have been recorded in this period yet.'],
    ['Imeshindikana kupakia data ya mwenendo.', 'Could not load trend data.'],
    ['Hakuna data ya mauzo bado.', 'No sales data yet.'],
    ['Imeshindikana kupakia bidhaa zilizouzwa sana.', 'Could not load top-selling products.'],
    ['Hakuna arifa bado.', 'No notifications yet.'],
    ['Imeshindikana kupakia arifa.', 'Could not load notifications.'],
    ['Kipindi cha Ripoti', 'Report Period'],
    ['Tangu', 'From'],
    ['Hadi', 'To'],
    ['Ripoti ya Mauzo', 'Sales Report'],
    ['Kila muamala katika kipindi kilichochaguliwa — mkasishaji, jumla, njia ya malipo, na hali.', 'Every transaction in the selected period: cashier, total, payment method, and status.'],
    ['Faida na Gharama', 'Profit and Loss'],
    ['Mapato, gharama ya bidhaa zilizouzwa, faida ya kawaida na halisi, pamoja na muhtasari wa matumizi.', 'Revenue, cost of goods sold, gross and net profit, plus an expense summary.'],
    ['Ripoti ya Hisa', 'Inventory Report'],
    ['Kiwango cha hisa ya sasa, thamani ya hisa, na tarehe ya kuisha muda karibu kwa kila bidhaa.', 'Current stock level, inventory value, and nearest expiry date for each product.'],
    ['Chapisha', 'Print'],
    ['Hifadhi kama PDF', 'Save as PDF'],
    ['💡 "PDF (Chapisha)" hufungua ukurasa wa maandishi ya kuchapisha kwenye kichupo kipya — tumia kisanduku cha kuchapisha cha kivinjari chako na uchague "Hifadhi kama PDF" kama eneo lengwa.', '💡 "PDF (Print)" opens a print-ready page in a new tab. Use your browser print dialog and choose "Save as PDF" as the destination.'],
    ['Inatayarisha ripoti yako...', 'Preparing your report...'],
    ['Ripoti imepakuliwa kwa mafanikio', 'Report downloaded successfully'],
    ['Zote', 'All'],
    ['Zinasubiri', 'Pending'],
    ['Zimekubaliwa', 'Approved'],
    ['Zimekataliwa', 'Rejected'],
    ['Rekodi ya Matumizi', 'Record Expense'],
    ['Hakuna matumizi yaliyopatikana.', 'No expenses found.'],
    ['Tarehe', 'Date'],
    ['Maelezo', 'Description'],
    ['Kategoria', 'Category'],
    ['Kiasi', 'Amount'],
    ['Imeandikwa Na', 'Recorded By'],
    ['Hali', 'Status'],
    ['Kubali', 'Approve'],
    ['Kataa', 'Reject'],
    ['Kubali', 'Approve'],
    ['Kataa', 'Reject'],
    ['matumizi haya?', 'this expense?'],
    ['-- Haijaainishwa --', '-- Uncategorized --'],
    ['Tarehe ya Matumizi', 'Expense Date'],
    ['Ghairi', 'Cancel'],
    ['Wasilisha kwa Uidhinishaji', 'Submit for Approval'],
    ['Tafadhali jaza maelezo, kiasi na tarehe', 'Please enter a description, amount, and date'],
    ['Matumizi yameandikwa, yanasubiri uidhinishaji', 'Expense recorded and awaiting approval'],
    ['Ongeza Mtoaji', 'Add Supplier'],
    ['Hakuna wazabuni walioongezwa bado.', 'No suppliers have been added yet.'],
    ['Jina', 'Name'],
    ['Mtu wa Mawasiliano', 'Contact Person'],
    ['Simu', 'Phone'],
    ['Barua pepe', 'Email'],
    ['Anwani', 'Address'],
    ['Imeshindikana kupakia wazabuni.', 'Could not load suppliers.'],
    ['Jina la Mtoaji', 'Supplier Name'],
    ['Hifadhi Mtoaji', 'Save Supplier'],
    ['Hifadhi Mabadiliko', 'Save Changes'],
    ['Hariri Mtoaji', 'Edit Supplier'],
    ['Jina la mtoaji linahitajika', 'Supplier name is required'],
    ['Mtoaji ameongezwa kwa mafanikio', 'Supplier added successfully'],
    ['Mtoaji amesasishwa kwa mafanikio', 'Supplier updated successfully'],
    ['Futa mtoaji ', 'Delete supplier '],
    ['Mtoaji amefutwa', 'Supplier deleted'],
    ['Tafuta wateja...', 'Search customers...'],
    ['Ongeza Mteja', 'Add Customer'],
    ['Hakuna wateja walio patikana.', 'No customers found.'],
    ['Imeshindikana kupakia wateja.', 'Could not load customers.'],
    ['Jina la Mteja', 'Customer Name'],
    ['Hifadhi Mteja', 'Save Customer'],
    ['Hariri Mteja', 'Edit Customer'],
    ['Jina la mteja linahitajika', 'Customer name is required'],
    ['Mteja ameongezwa kwa mafanikio', 'Customer added successfully'],
    ['Mteja amesasishwa kwa mafanikio', 'Customer updated successfully'],
    ['Futa mteja ', 'Delete customer '],
    ['Mteja amefutwa', 'Customer deleted'],
    ['Tafuta bidhaa kwa jina au msimbo...', 'Search products by name or code...'],
    ['Anza kuandika ili kutafuta bidhaa...', 'Start typing to search products...'],
    ['Mauzo ya Sasa', 'Current Sale'],
    ['Mteja', 'Customer'],
    ['Mteja wa kawaida (Generic)', 'Walk-in customer'],
    ['Jumla Ndogo', 'Subtotal'],
    ['Punguzo', 'Discount'],
    ['Njia ya Malipo', 'Payment Method'],
    ['Kamilisha Mauzo', 'Complete Sale'],
    ['Futa Kikapu', 'Clear Cart'],
    ['Hakuna bidhaa zinazolingana kwenye hisa.', 'No matching products in stock.'],
    ['Ikiwa uliongeza bidhaa hivi punde, hakikisha', 'If you just added a product, make sure'],
    ['yenye kiasi pia imeongezwa', 'with a quantity has also been added'],
    ['bidhaa zenye hisa sifuri hazionekani hapa.', 'products with zero stock do not appear here.'],
    ['Uliza Meneja au Msimamizi wa Hisa kuangalia', 'Ask a Manager or Store Keeper to check'],
    ['Kituo cha Mauzo', 'Point of Sale'],
    ['Pesa taslimu', 'Cash'],
    ['Pesa kwa simu', 'Mobile Money'],
    ['Kadi', 'Card'],
    ['Mkopo', 'Credit'],
    ['Jina la mteja linahitajika.', 'Customer name is required.'],
    ['Mteja ameongezwa kwa mafanikio', 'Customer added successfully'],
    ['Utafutaji umeshindikana. Jaribu tena.', 'Search failed. Please try again.'],
    ['Inapatikana', 'Only'],
    ['tu kwa', 'available for'],
    ['haina hisa', 'is out of stock'],
    ['Mauzo yamekamilika:', 'Sale completed:'],
    ['Historia ya Mauzo', 'Sales History'],
    ['Rejesta ya Kila Siku', 'Daily Register'],
    ['hadi', 'to'],
    ['Chuja', 'Filter'],
    ['Futa Chujio', 'Clear Filter'],
    ['Futa Historia Yote', 'Clear All History'],
    ['Hakuna mauzo katika kipindi hiki.', 'No sales in this period.'],
    ['Namba ya Mauzo', 'Sale Number'],
    ['Mkasishaji', 'Cashier'],
    ['Faida', 'Profit'],
    ['Malipo', 'Payment'],
    ['Angalia', 'View'],
    ['Futa/Ubatilishe', 'Void Sale'],
    ['Imeshindikana kupakia mauzo.', 'Could not load sales.'],
    ['Angalia Tarehe', 'View Date'],
    ['Leo', 'Today'],
    ['Jumla ya Mauzo', 'Total Sales'],
    ['ya Leo', 'Today'],
    ['muamala', 'transactions'],
    ['Faida Iliofikiwa', 'Profit Earned'],
    ['Punguzo Zilizotolewa', 'Discounts Given'],
    ['Vipengee Vilivyouzwa', 'Items Sold'],
    ['kwa mistari', 'across'],
    ['mistari', 'lines'],
    ['Mauzo kwa Mkasishaji', 'Sales by Cashier'],
    ['Hakuna mauzo yaliorekodiwa kwa siku hii.', 'No sales were recorded on this date.'],
    ['Miamala', 'Transactions'],
    ['Mauzo Yaliyobatilishwa', 'Voided Sales'],
    ['Muda', 'Time'],
    ['Kila Kipengee Kilichouzwa', 'Every Item Sold'],
    ['tarehe ', 'date '],
    ['Hakuna kitu kilichouzwa bado kwa siku hii.', 'Nothing has been sold on this date yet.'],
    ['Iliyouzwa Na', 'Sold By'],
    ['Risiti', 'Receipt'],
    ['Kodi', 'Tax'],
    ['Funga', 'Close'],
    ['Ubatilishe mauzo haya? Hisa itarejeshwa na hatua hii haiwezi kutenduliwa nyuma.', 'Void this sale? Stock will be restored. This action cannot be undone.'],
    ['Mauzo yamebatilishwa na hisa zarejeshwa', 'Sale voided and stock restored'],
    ['Futa historia ya mauzo kwa', 'Clear sales history for'],
    ['Hii huondoa risiti/malipo kutoka Historia ya Mauzo na ripoti. Hisa HAZITA rejeshwa.', 'This removes receipts/payments from Sales History and reports. Stock will NOT be restored.'],
    ['Thibitisha tena. Hatua hii haiwezi kutenduliwa nyuma.', 'Confirm again. This action cannot be undone.'],
    ['Futa HISTORIA YOTE ya mauzo?', 'Clear ALL sales history?'],
    ['Hii huondoa kila risiti/malipo kutoka Historia ya Mauzo na ripoti. Hisa HAZITA rejeshwa.', 'This removes every receipt/payment from Sales History and reports. Stock will NOT be restored.'],
    ['Thibitisha tena: futa HISTORIA YOTE ya mauzo kabisa?', 'Confirm again: permanently clear ALL sales history?'],
    ['mauzo yamefutwa', 'sales deleted'],
    ['mauzo yameondolewa', 'sale(s) cleared'],
    ['Wasifu', 'Profile'],
    ['Wasifu Wangu', 'My Profile'],
    ['Jina Kamili', 'Full Name'],
    ['Jukumu', 'Role'],
    ['Hali', 'Status'],
    ['Nenosiri la Sasa', 'Current Password'],
    ['Nenosiri Jipya', 'New Password'],
    ['Thibitisha Nenosiri Jipya', 'Confirm New Password'],
    ['Inahitajika tu ukibadilisha nenosiri', 'Only required when changing your password'],
    ['Angalau herufi 6', 'At least 6 characters'],
    ['Andika tena nenosiri jipya', 'Re-enter the new password'],
    ['Hifadhi Wasifu', 'Save Profile'],
    ['Imeshindikana kupakia wasifu.', 'Could not load profile.'],
    ['Nenosiri jipya na uthibitisho lake hazilingani', 'New password and confirmation do not match'],
    ['Wasifu umehifadhiwa kwa mafanikio', 'Profile saved successfully'],
    ['Unda Chelezo Sasa', 'Create Backup Now'],
    ['Chelezo na Kurudisha', 'Backup and Restore'],
    ['Hakuna chelezo zilizopatikana.', 'No backups found.'],
    ['Imetengenezwa', 'Created'],
    ['Faili', 'File'],
    ['Ukubwa', 'Size'],
    ['Pakua', 'Download'],
    ['Imeshindikana kupakia chelezo.', 'Could not load backups.'],
    ['Inatengeneza chelezo...', 'Creating backup...'],
    ['Chelezo imeundwa', 'Backup created'],
    ['Rekodi za ukaguzi', 'Audit records'],
    ['Kumbukumbu ya Ukaguzi wa Mfumo', 'System Audit Trail'],
    ['Huna ufikiaji wa kumbukumbu za ukaguzi.', 'You do not have access to audit logs.'],
    ['Kitendo...', 'Action...'],
    ['Weka upya', 'Reset'],
    ['Hakuna rekodi za ukaguzi zilizopatikana.', 'No audit records found.'],
    ['Mtumiaji', 'User'],
    ['Kitendo', 'Action'],
    ['Moduli', 'Module'],
    ['Maelezo', 'Description'],
    ['Imeshindikana kupakia kumbukumbu za ukaguzi.', 'Could not load audit logs.'],
    ['Huna ufikiaji wa mipangilio ya mfumo.', 'You do not have access to system settings.'],
    ['DB Response', 'Database Response'],
    ['Bidhaa Zinazotumika', 'Active Products'],
    ["Today's Sales", "Today's Sales"],
    ['Hisa Chache', 'Low Stock'],
    ['Wasifu wa Biashara', 'Business Profile'],
    ['Jina la Duka', 'Shop Name'],
    ['Fedha', 'Currency'],
    ['Kiwango cha Kodi (%)', 'Tax Rate (%)'],
    ['Arifa za Hisa', 'Stock Alerts'],
    ['Kikomo cha Hisa Chache', 'Low Stock Threshold'],
    ['Siku za Arifa ya Muda wa Kuisha', 'Expiry Alert Days'],
    ['Batch zenye hisa kwenye stok', 'Batches with stock'],
    ['Matumizi yanayosubiri', 'Pending Expenses'],
    ['Sasisha mwisho wa mipangilio', 'Settings last updated'],
    ['Vidhibiti vya Msimamizi', 'Administrator Controls'],
    ['Hifadhi Mipangilio', 'Save Settings'],
    ['Fungua Rekodi za Ukaguzi', 'Open Audit Logs'],
    ['Onyesha Upya Afya', 'Refresh Health'],
    ['Ili kuongeza kasi ya hifadhidata kwenye mifumo iliyopo, endesha', 'For database speed on existing installations, run'],
    ['Ushikaji wa chelezo', 'Backup Retention'],
    ['Siku 1', '1 Day'],
    ['Wiki 1', '1 Week'],
    ['Mwezi 1', '1 Month'],
    ['Mwaka 1', '1 Year'],
    ['Onyesha Upya Orodha ya Chelezo', 'Refresh Backup List'],
    ['Chelezo huhifadhiwa kwenye seva na zinaweza kupakuliwa na Msimamizi.', 'Backups are stored on the server and can be downloaded by an Administrator.'],
    ['Chelezo za zamani zitasafishwa kulingana na muda wa kuhifadhi.', 'Old backups are removed according to the retention period.'],
    ['Muhtasari wa Kumbukumbu ya Mfumo', 'System Log Summary'],
    ['Kumbukumbu ya mwisho', 'Last Log Entry'],
    ['Mipangilio imehifadhiwa kwa mafanikio', 'Settings saved successfully'],
    ['Tafuta bidhaa...', 'Search products...'],
    ['Dhibiti Kategoria', 'Manage Categories'],
    ['Ongeza Bidhaa', 'Add Product'],
    ['Hakuna bidhaa zilizopatikana. Ongeza bidhaa yako ya kwanza kuanza.', 'No products found. Add your first product to get started.'],
    ['Msimbo', 'Code'],
    ['Bidhaa', 'Product'],
    ['Hisa', 'Stock'],
    ['Kuisha Muda Karibu', 'Nearest Expiry'],
    ['Hakuna hisa — haiwezi kuuzwa bado', 'Out of stock — cannot be sold yet'],
    ['Haijatumiwa', 'Inactive'],
    ['Ongeza Hisa Sasa', 'Stock In Now'],
    ['Angalia / Ongeza Batch', 'View / Add Batch'],
    ['Bidhaa zilizoangaziwa hapa juu zina', 'Products highlighted above have'],
    ['na hazitaonekana kwenye POS hadi uongeze batch.', 'and will not appear in POS until you add a batch.'],
    ['Ongeza Bidhaa Mpya', 'Add New Product'],
    ['Msimbo wa Bidhaa', 'Product Code'],
    ['Jina la Bidhaa', 'Product Name'],
    ['-- Hakuna --', '-- None --'],
    ['Kategoria', 'Category'],
    ['Kiasi/Kifurushi', 'Unit / Package'],
    ['Kiwango cha Upya Kuweka Hisa (kikomo cha onyo)', 'Reorder Level (warning threshold)'],
    ['Hifadhi Bidhaa', 'Save Product'],
    ['Msimbo wa bidhaa na jina vinahitajika', 'Product code and name are required'],
    ['Bidhaa imeundwa kwa mafanikio', 'Product created successfully'],
    ['Hariri Bidhaa', 'Edit Product'],
    ['Kiwango cha Upya Kuweka Hisa', 'Reorder Level'],
    ['Hifadhi Mabadiliko', 'Save Changes'],
    ['Bidhaa imeboreshwa kwa mafanikio', 'Product updated successfully'],
    ['Futa', 'Delete'],
    ['Kundi', 'Batch'],
    ['Msimamizi, Mmiliki, au muundaji wa bidhaa tu ndio wanaweza kuhariri au kufuta bidhaa hii.', 'Only an Administrator, Owner, or the product creator can edit or delete this product.'],
    ['Msimamizi au Mmiliki tu ndio wanaweza kufuta bidhaa.', 'Only an Administrator or Owner can delete products.'],
    ['Hakuna bidhaa.', 'No products.'],
    ['Namba ya Kundi', 'Batch #'],
    ['Kiasi Kilichobaki', 'Remaining Quantity'],
    ['Bei ya Kununua', 'Buying Price'],
    ['Bei ya Kuuza', 'Selling Price'],
    ['Muda wa Kuisha', 'Expiry Date'],
    ['Hakuna batch bado. Ongeza hisa kuanza kuuza bidhaa hii.', 'No batches yet. Add stock to start selling this product.'],
    ['Hakuna mwisho wa muda', 'No expiry'],
    ['Weka Imeharibika', 'Mark as Damaged'],
    ['Ongeza Batch', 'Add Batch'],
    ['Namba ya Batch', 'Batch Number'],
    ['Kiasi Kilichopokelewa', 'Received Quantity'],
    ['Bei ya Kununua (kwa kila kitengo)', 'Buying Price (per unit)'],
    ['Bei ya Kuuza (kwa kila kitengo)', 'Selling Price (per unit)'],
    ['Tarehe ya Kupokelewa', 'Received Date'],
    ['Bidhaa hii haina muda wa kuisha (mf. vyombo, nguo, vifaa vya elektroniki)', 'This product does not expire (e.g. utensils, clothes, electronics)'],
    ['Tarehe ya Kuisha Muda', 'Expiry Date'],
    ['Inahitajika kwa kila batch isipokuwa ikitimba "haina muda wa kuisha" hapo juu.', 'Required for every batch unless "does not expire" is checked above.'],
    ['Rudi', 'Back'],
    ['Tafadhali jaza namba ya batch, kiasi, bei ya kununua na bei ya kuuza', 'Please enter the batch number, quantity, buying price, and selling price'],
    ['Tafadhali chagua tarehe ya kupokelewa (siku, mwezi, na mwaka)', 'Please select the received date (day, month, and year)'],
    ['Tafadhali chagua tarehe kamili ya kuisha muda (siku, mwezi, na mwaka), au weka tiki "Bidhaa hii haina muda wa kuisha"', 'Please select the full expiry date (day, month, and year), or check "This product does not expire"'],
    ['Batch imeongezwa kwa mafanikio', 'Batch added successfully'],
    ['Nani Anaweza Kuuza', 'Who Can Sell'],
    ['Zuia nani anaweza kuuza bidhaa hii', 'Restrict who can sell this product'],
    ['Kwa kawaida, mkasishaji yeyote anaweza kuuza bidhaa yoyote. Washa kizuizi hiki kwa bidhaa zinazohitaji ruhusa maalum (kwa mfano bidhaa za thamani kubwa au zinazohitaji umri maalum).', 'By default, any cashier can sell any product. Turn this on for items that need special authorization (e.g. high-value goods, age-restricted items).'],
    ['Wauzaji Waliodhibitiwa', 'Authorised Sellers'],
    ['Hakuna makasishaji wanaofanya kazi. Ongeza akaunti ya mkasishaji kwanza chini ya Watumiaji.', 'No active cashiers. Add a cashier account under Users first.'],
    ['Dhibiti Wauzaji', 'Manage Sellers'],
    ['Chagua angalau mkasishaji mmoja, au uzime kizuizi', 'Select at least one cashier or turn off the restriction'],
    ['Wauzaji waliodhibitiwa wamesasishwa', 'Authorised sellers updated'],
    ['Kategoria za Bidhaa', 'Product Categories'],
    ['Jina', 'Name'],
    ['Maelezo', 'Description'],
    ['Hakuna kategoria bado. Ongeza moja hapa chini.', 'No categories yet. Add one below.'],
    ['Ongeza Kategoria Mpya', 'Add New Category'],
    ['Jina la Kategoria', 'Category Name'],
    ['Maelezo (si lazima)', 'Description (optional)'],
    ['Ongeza Kategoria', 'Add Category'],
    ['Jina la kategoria linahitajika', 'Category name is required'],
    ['Kategoria imeongezwa kwa mafanikio', 'Category added successfully'],
    ['Ruhusa za Majukumu', 'Role Permissions'],
    ['Utawala', 'Administration'],
    ['Simamia Watumiaji', 'Manage Users'],
    ['Simamia Mipangilio ya Mfumo', 'Manage System Settings'],
    ['Hifadhi na Rejesha Nakala', 'Backup & Restore'],
    ['Simamia Majukumu na Ruhusa', 'Manage Roles & Permissions'],
    ['Angalia Mipangilio ya Mfumo', 'View System Settings'],
    ['Simamia Bidhaa', 'Manage Products'],
    ['Angalia Bidhaa', 'View Products'],
    ['Simamia Makundi ya Bidhaa', 'Manage Batches'],
    ['Angalia Hisa', 'View Inventory'],
    ['Simamia Wazabuni', 'Manage Suppliers'],
    ['Angalia Wazabuni', 'View Suppliers'],
    ['Simamia Manunuzi (Kuingiza Hisa)', 'Manage Purchases (Stock-In)'],
    ['Angalia Manunuzi', 'View Purchases'],
    ['Unda Mauzo (POS)', 'Create Sales (POS)'],
    ['Batilisha/Rejesha Mauzo', 'Void/Refund Sales'],
    ['Angalia Mauzo Yote', 'View All Sales'],
    ['Angalia Mauzo Yangu Pekee', 'View Own Sales Only'],
    ['Idhinisha Marejesho', 'Approve Returns'],
    ['Sajili na Simamia Wateja', 'Register & Manage Customers'],
    ['Simamia Matumizi', 'Manage Expenses'],
    ['Idhinisha Matumizi', 'Approve Expenses'],
    ['Angalia Matumizi', 'View Expenses'],
    ['Angalia Ripoti ya Faida na Hasara', 'View Profit & Loss Reports'],
    ['Angalia Ripoti za Mauzo', 'View Sales Reports'],
    ['Angalia Ripoti za Hisa', 'View Inventory Reports'],
    ['Hamisha Ripoti (PDF/Excel)', 'Export Reports (PDF/Excel)'],
    ['Angalia Dashibodi ya Fedha', 'View Financial Dashboard'],
    ['Angalia Dashibodi ya Uendeshaji', 'View Operational Dashboard'],
    ['Angalia Uchambuzi wa Biashara', 'View Business Analytics'],
    ['Angalia Kumbukumbu za Ukaguzi', 'View Audit Logs'],
    ['Chagua jukumu', 'Select a Role'],
    ['Hifadhi Ruhusa', 'Save Permissions'],
    ['Funga ruhusa za majukumu', 'Close role permissions'],
    ['Huna ruhusa ya kusimamia watumiaji.', 'You do not have permission to manage users.'],
    ['Hakuna majukumu yaliyosanidiwa kwenye mfumo.', 'No roles are configured in the system.'],
    ['Hakuna majukumu yanayoweza kusanidiwa.', 'There are no roles available to configure.'],
    ['Jukumu hili halina ruhusa zilizowekwa.', 'This role has no permissions assigned.'],
    ['Jina la Mtumiaji', 'Username'],
    ['Ingia Mwisho', 'Last Login'],
    ['Haijawahi', 'Never'],
    ['Soma tu', 'Read only'],
    ['Hariri', 'Edit'],
    ['Ongeza Mtumiaji', 'Add User'],
    ['Unda Mtumiaji', 'Create User'],
    ['Nenosiri la Muda', 'Temporary Password'],
    ['Jina kamili, jina la mtumiaji na nenosiri vinahitajika', 'Full name, username, and password are required'],
    ['Mtumiaji ameundwa kwa mafanikio', 'User created successfully'],
    ['Hariri Mtumiaji', 'Edit User'],
    ['Inatumika', 'Active'],
    ['Imesimamishwa', 'Suspended'],
    ['Imezimwa', 'Disabled'],
    ['Mtumiaji amesasishwa kwa mafanikio', 'User updated successfully'],
    ['Rekebisha Nenosiri', 'Reset Password'],
    ['Nenosiri lazima liwe na angalau herufi 6', 'Password must be at least 6 characters'],
    ['Nenosiri limebadilishwa kwa mafanikio', 'Password changed successfully'],
    ['Akaunti imezimwa', 'Account disabled'],
    ['Kuingia kumeishindikana. Tafadhali angalia taarifa zako.', 'Sign-in failed. Please check your credentials.'],
    ['Hifadhi', 'Save'],
    ['Inachakata...', 'Working...'],
    ['Inapakia', 'Loading'],
    ['Hakuna data inayopatikana', 'No data available'],
    ['Hitilafu', 'Error'],
    ['Mafanikio', 'Success'],
    ['Hakuna data inayopatikana', 'No data available'],
    ['Hitilafu', 'Error'],
    ['Mafanikio', 'Success'],
    ['Hakuna', 'No'],
    ['Imeshindikana kupakia', 'Could not load'],
    ['Muda', 'Time'],
    ['Pesa taslimu', 'Cash'],
    ['Pesa kwa simu', 'Mobile Money'],
    ['Kadi', 'Card'],
    ['Mkopo', 'Credit'],
    ['Imekamilika', 'Completed'],
    ['Imelipwa', 'Paid'],
    ['Inasubiri', 'Pending'],
    ['Imekubaliwa', 'Approved'],
    ['Imekataliwa', 'Rejected'],
    ['Onyo', 'Warning'],
    ['Sehemu', 'Partial'],
    ['Imekwisha Muda', 'Expired'],
    ['Imefutwa', 'Voided'],
    ['Hatari', 'Critical'],
    ['Haijalipwa', 'Unpaid'],
    ['Haijatumika', 'Inactive'],
    ['Imesimamishwa', 'Suspended'],
    ['Mfumo wa Usimamizi wa Duka la Rejareja', 'Retail Shop Management System']
    ,['Kikapu kimepangwa wazi', 'Cart is empty']
    ,['Jumla', 'Total']
    ,['Ongeza mteja mpya', 'Add a new customer']
    ,['Ondoa mteja kwenye mauzo haya', 'Remove the customer from this sale']
    ,['Ondoa mteja aliyechaguliwa', 'Remove the selected customer']
    ,['Hakuna matumizi yaliyopatikana.', 'No expenses found.']
    ,['Kumbukumbu ya Ukaguzi wa Mfumo', 'System Audit Trail']
    ,['Kwa kawaida, mkasishaji yeyote anaweza kuuza bidhaa yoyote. Washa kizuizi hiki kwa bidhaa zinazohitaji ruhusa maalum (kwa mfano bidhaa za thamani kubwa au zinazohitaji umri maalum).', 'By default, any cashier can sell any product. Turn this on for items that need special authorization (e.g. high-value goods or age-restricted items).']
    ,['Jina la mtoaji linahitajika', 'Supplier name is required']
    ,['Mtoaji ameongezwa kwa mafanikio', 'Supplier added successfully']
    ,['Mtoaji amesasishwa kwa mafanikio', 'Supplier updated successfully']
    ,['Futa mtoaji ', 'Delete supplier ']
    ,['Mtoaji amefutwa', 'Supplier deleted']
    ,['Jina la mteja linahitajika', 'Customer name is required']
    ,['Mteja ameongezwa kwa mafanikio', 'Customer added successfully']
    ,['Mteja amesasishwa kwa mafanikio', 'Customer updated successfully']
    ,['Futa mteja ', 'Delete customer ']
    ,['Mteja amefutwa', 'Customer deleted']
    ,['Inachakata...', 'Working...']
    ,['Inapakia', 'Loading']
    ,['Hitilafu', 'Error']
    ,['Mafanikio', 'Success']
    ,['Kubali', 'Approve']
    ,['Kataa', 'Reject']
    ,['Jina', 'Name']
    ,['Maelezo', 'Description']
    ,['Imetengenezwa', 'Created']
    ,['Faili', 'File']
    ,['Ukubwa', 'Size']
    ,['Kategoria', 'Category']
    ,['-- Hakuna --', '-- None --']
    ,['Pesa taslimu', 'Cash']
    ,['Pesa kwa simu', 'Mobile Money']
    ,['Kadi', 'Card']
    ,['Mkopo', 'Credit']
    ,['kundi', 'batch']
    ,['mkasishaji', 'cashier']
    ,['Hakuna bidhaa zinazolingana kwenye hisa.', 'No matching products in stock.']
    ,['Kuna hitilafu imetokea', 'An error occurred']
    ,['Imeshindikana kupakia arifa.', 'Could not load notifications.']
    ,['Njia ya ombi hairuhusiwi', 'Method not allowed']
    ,['Majaribio mengi ya kuingia. Jaribu tena baadaye.', 'Too many login attempts. Try again later.']
    ,['Jina la mtumiaji au nenosiri si sahihi', 'Invalid credentials']
    ,['Akaunti haifanyi kazi. Wasiliana na msimamizi wako.', 'Account is not active. Contact your administrator.']
    ,['Akaunti imefungwa kutokana na majaribio mengi. Jaribu tena baada ya dakika ', 'Account locked due to multiple failed attempts. Try again in ']
    ,[' dakika.', ' minute(s).']
    ,['Akaunti imefungwa kwa dakika ', 'Account locked for ']
    ,['Tafadhali ingia.', 'Please log in.']
    ,['Hujathibitishwa. Tafadhali ingia.', 'Not authenticated. Please log in.']
    ,['Muunganisho wa hifadhidata umeshindikana. Angalia mipangilio ya config/database.php.', 'Database connection failed. Check config/database.php settings.']
    ,['Mtumiaji hajapatikana', 'User not found']
    ,['Bidhaa haijapatikana', 'Product not found']
    ,['Kategoria tayari lipo', 'Category already exists']
    ,['Imeshindikana kuunda kategoria', 'Failed to create category']
    ,['Msimbo wa bidhaa tayari unatumika', 'Product code already exists']
    ,['Mauzo lazima yawe na angalau bidhaa moja', 'Sale must contain at least one item']
    ,['Mauzo yamekamilika kwa mafanikio', 'Sale completed successfully']
    ,['Imeshindikana kuchakata mauzo', 'Failed to process sale']
    ,['Gharama haijapatikana au tayari imechakatwa', 'Expense not found or already processed']
    ,['Gharama imehifadhiwa, inasubiri idhini', 'Expense recorded, pending approval']
    ,['Imeshindikana kusafisha gharama zilizoidhinishwa', 'Failed to clear approved expenses']
    ,['Mauzo hayajapatikana', 'Sale not found']
    ,['Mauzo tayari yamebatilishwa', 'Sale already voided']
    ,['Unaweza kuona mauzo yako mwenyewe pekee', 'You can only view your own sales']
    ,['Imeshindikana kubatilisha mauzo', 'Failed to void sale']
    ,['Faili halijapatikana', 'File not found']
    ,['Faili halijasajiliwa', 'File not registered']
    ,['Kitendo si sahihi', 'Invalid action']
    ,['Folda ya chelezo haiwezi kuandikika', 'Backup directory is not writable']
    ,['Chelezo imeshindikana. Angalia ruhusa za mysqldump kwenye seva.', 'Backup failed. Check server mysqldump permissions.']
    ,['Mipangilio imesasishwa kwa mafanikio', 'Settings updated successfully']
    ,['Jukumu halijapatikana', 'Role not found']
    ,['Ruhusa moja au zaidi hazipo', 'One or more selected permissions do not exist']
    ,['Imeshindikana kusasisha ruhusa za jukumu', 'Failed to update role permissions']
    ,['Ruhusa za jukumu zimesasishwa kwa mafanikio', 'Role permissions updated successfully']
    ,['mf.', 'e.g.']
    ,['mf. Mafuta ya Kupikia 1L', 'e.g. Cooking Oil 1L']
    ,['pcs, kg, litre...', 'pcs, kg, litres...']
    ,['Mauzo ya Leo', "Today's Sales"]
    ,['Hisa Chache', 'Low Stock']
    ,['Jibu la Hifadhidata', 'Database Response']
    ,['Bidhaa Zinazotumika', 'Active Products']
    ,['Matumizi yamekubaliwa', 'Expense approved']
    ,['Matumizi yamekataliwa', 'Expense rejected']
    ,['Zima akaunti ya ', 'Disable account for ']
    ,['? Hawawezi kuingia tena.', '? They will no longer be able to log in.']
    ,['Akaunti ya mtumiaji imezimwa', 'User disabled']
    ,['mf. Bili ya umeme - Juni', 'e.g. Electricity bill - June']
    ,['mf. PRD-001', 'e.g. PRD-001']
    ,['mf. Vinywaji baridi, juisi, maji', 'e.g. Soft drinks, juice, water']
    ,['mf. Vinywaji', 'e.g. Beverages']
    ,['mf. BATCH-2026-06', 'e.g. BATCH-2026-06']
    ,['Mfumo wa Usimamizi wa Duka la Rejareja', 'Retail Shop Management System']
];

UI_TRANSLATION_PAIRS.forEach(([swahili, english]) => {
    LANGUAGE_PHRASES.en[swahili] = english;
    LANGUAGE_PHRASES.sw[english] = swahili;
});

Object.assign(LANGUAGE_PHRASES.en, {
    admin: 'Administration', audit: 'Audit', dashboard: 'Dashboard', finance: 'Finance',
    inventory: 'Inventory', reports: 'Reports', sales: 'Sales'
});
Object.assign(LANGUAGE_PHRASES.sw, {
    admin: 'Utawala', audit: 'Ukaguzi', dashboard: 'Dashibodi', finance: 'Fedha',
    inventory: 'Hisa', reports: 'Ripoti', sales: 'Mauzo', View: 'Tazama', Edit: 'Hariri', Misc: 'Mengineyo'
});

let languageDomObserver = null;
let translationEntryCache = {};

function translationEntries(lang) {
    if (!translationEntryCache[lang]) {
        const entries = Object.entries(LANGUAGE_PHRASES[lang] || {})
            .sort(([left], [right]) => right.length - left.length);
        translationEntryCache[lang] = {
            lookup: new Map(entries),
            pattern: entries.length
                ? new RegExp(entries.map(([source]) => {
                    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    return /^[A-Za-z0-9_]+$/.test(source) ? `\\b${escaped}\\b` : escaped;
                }).join('|'), 'g')
                : null
        };
    }
    return translationEntryCache[lang];
}

function translateUiText(value, lang = getCurrentLanguage()) {
    const sourceText = String(value ?? '');
    const { lookup, pattern } = translationEntries(lang);
    return pattern ? sourceText.replace(pattern, source => lookup.get(source) ?? source) : sourceText;
}

function observeLanguageChanges() {
    if (languageDomObserver || !document.body) return;
    languageDomObserver = new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(node => translateCurrentView(node)));
    });
    languageDomObserver.observe(document.body, { childList: true, subtree: true });
}

const nativeConfirm = window.confirm.bind(window);
window.confirm = message => nativeConfirm(translateUiText(message));

function getStoredLanguage() {
    const saved = sessionStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === 'en' ? 'en' : 'sw';
}

function getCurrentLanguage() {
    return document.documentElement.lang === 'en' ? 'en' : 'sw';
}

function setAppLanguage(lang) {
    const normalized = lang === 'en' ? 'en' : 'sw';
    sessionStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    document.documentElement.lang = normalized;
    document.title = `SRSMS — ${translateUiText('Mfumo wa Usimamizi wa Duka la Rejareja', normalized)}`;
    observeLanguageChanges();
    const btn = document.getElementById('languageToggleBtn');
    if (btn) {
        btn.setAttribute('aria-label', normalized === 'sw' ? 'Kiswahili' : 'English');
        btn.title = normalized === 'sw' ? 'Badili lugha: Kiswahili' : 'Change language: English';
        btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px;"><img src="https://flagcdn.com/${normalized === 'sw' ? 'tz' : 'us'}.svg" alt="${normalized === 'sw' ? 'Bendera ya Tanzania' : 'US flag'}" style="width:18px; height:12px; border-radius:2px; object-fit:cover;" /><span>${normalized === 'sw' ? 'Kiswahili' : 'English'}</span></span>`;
    }
    translateCurrentView(document.body);
}

function translateCurrentView(root) {
    if (!root) return;
    const lang = getCurrentLanguage();
    const walk = (node) => {
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim()) {
            const text = translateUiText(node.textContent, lang);
            if (text !== node.textContent) node.textContent = text;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            ['placeholder', 'title', 'aria-label', 'alt'].forEach(attr => {
                const value = node.getAttribute(attr);
                if (!value) return;
                const next = translateUiText(value, lang);
                if (next !== value) node.setAttribute(attr, next);
            });
            Array.from(node.childNodes).forEach(walk);
        }
    };

    walk(root);
}

function canAccessPage(role, page) {
    if (page === 'users') {
        return role === 'super_admin' || Store.permissions.includes('users.manage');
    }
    if (page === 'settings') {
        return hasAnyRole(role, ['super_admin', 'admin', 'owner']);
    }
    if (page === 'audit') {
        return hasAnyRole(role, ['super_admin', 'admin', 'owner', 'auditor']);
    }
    return true;
}

function getVisibleNav(role) {
    return (NAV_CONFIG[role] || BASE_NAV).filter(item => canAccessPage(role, item.key));
}

function getDefaultPage(role) {
    const nav = getVisibleNav(role);
    return nav.length ? nav[0].key : 'dashboard';
}

function renderShell() {
    const user = Store.user;
    if (!user) return renderLogin();

    setAppLanguage(getStoredLanguage());
    setCurrency(window.__shopCurrency || 'TZS');

    const nav = getVisibleNav(user.role);
    const navHtml = nav.map(item => `
        <div class="nav-item" data-page="${item.key}" onclick="navigateTo('${item.key}')">
            ${ICONS[item.icon] || ''}
            <span>${item.label}</span>
        </div>
    `).join('');

    document.getElementById('root').innerHTML = `
        <div class="app-shell">
            <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="toggleSidebar(false)"></div>
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-brand">
                    <div class="mark"><i class="fa-solid fa-store"></i></div>
                    <div>
                        <div class="name">SRSMS</div>
                    <div class="tagline">Jukwaa la Rejareja la Dhahabu</div>
                    </div>
                </div>
                <div class="sidebar-user">
                    <div class="uname">${escapeHtml(user.fullName)}</div>
                    <span class="urole">${escapeHtml(roleLabel(user.role))}</span>
                    <div class="role-pill">Mmiliki & Msimamizi Wapo Tayari</div>
                </div>
                <nav class="sidebar-nav" id="sidebarNav">${navHtml}</nav>
                <div class="sidebar-footer">
                    <button class="logout-btn" onclick="handleLogout()">
                        ${ICONS.logout}
                        <span>Toka</span>
                    </button>
                </div>
            </aside>
            <div class="main-content">
                <header class="topbar">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button class="mobile-menu-btn" onclick="toggleSidebar(true)" aria-label="Fungua menyu">
                            <i class="fa-solid fa-bars"></i>
                        </button>
                        <div>
                        <div class="topbar-kicker">Shughuli za Rejareja la Dhahabu</div>
                            <h1 id="pageTitle">Dashibodi</h1>
                        </div>
                    </div>
                    <div class="topbar-right">
                        <button class="btn btn-outline btn-sm" onclick="toggleLanguage()" id="languageToggleBtn" style="padding:6px 10px; font-size:12px;">
                            <span style="display:inline-flex; align-items:center; gap:6px;">
                                <img src="https://flagcdn.com/tz.svg" alt="Tanzania flag" style="width:18px; height:12px; border-radius:2px; object-fit:cover;" />
                                <span>SW</span>
                            </span>
                        </button>
                        <div id="userMenuWrapper" style="position:relative;">
                            <button class="btn btn-outline btn-sm" onclick="toggleUserMenu()" style="padding:6px 10px; font-size:12px;">
                                <i class="fa-solid fa-user-circle"></i> Menyu <i class="fa-solid fa-chevron-down"></i>
                            </button>
                            <div id="userMenu" style="display:none; position:absolute; right:0; top:calc(100% + 6px); background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,0.16); min-width:180px; z-index:30; overflow:hidden;">
                                <button class="btn btn-link" onclick="navigateTo('profile'); closeUserMenu();" style="display:block; width:100%; text-align:left; padding:10px 12px; border:0; background:transparent; color:var(--text-primary); cursor:pointer;">
                                    <i class="fa-solid fa-circle-user"></i> Wasifu
                                </button>
                                <button class="btn btn-link" onclick="navigateTo('settings'); closeUserMenu();" style="display:block; width:100%; text-align:left; padding:10px 12px; border:0; background:transparent; color:var(--text-primary); cursor:pointer;">
                                    <i class="fa-solid fa-gear"></i> Mipangilio
                                </button>
                                <button class="btn btn-link" onclick="handleLogout(); closeUserMenu();" style="display:block; width:100%; text-align:left; padding:10px 12px; border:0; background:transparent; color:var(--text-primary); cursor:pointer;">
                                    <i class="fa-solid fa-right-from-bracket"></i> Toka
                                </button>
                            </div>
                        </div>
                        <span class="page-pill"><i class="fa-solid fa-shield-halved"></i> Salama & Sahihi</span>
                        <span class="topbar-date" id="topbarDate"></span>
                        <button class="bell-btn" onclick="navigateTo('notifications')" aria-label="Arifa">
                            ${ICONS.bell}
                            <span class="dot" id="notifDot"></span>
                        </button>
                    </div>
                </header>
                <main class="page-body" id="pageBody">${loadingHtml()}</main>
            </div>
        </div>
    `;

    const dateLocale = getCurrentLanguage() === 'en' ? 'en-GB' : 'sw-TZ';
    document.getElementById('topbarDate').textContent = new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    setAppLanguage(getStoredLanguage());
    translateCurrentView(document.getElementById('root'));
    navigateTo(getDefaultPage(user.role));
}

async function checkNotifications() {
    try {
        const res = await Api.notifications();
        const unread = (res.notifications || []).filter(n => !n.is_read);
        const dot = document.getElementById('notifDot');
        if (dot) dot.classList.toggle('show', unread.length > 0);
    } catch { /* silent */ }
}

const PAGE_TITLES = {
    dashboard: 'Dashibodi',
    pos: 'Kituo cha Mauzo',
    products: 'Bidhaa & Hisa',
    sales: 'Taarifa za Mauzo',
    expenses: 'Matumizi',
    suppliers: 'Wazabuni',
    customers: 'Wateja',
    reports: 'Ripoti',
    users: 'Watumiaji & Majukumu',
    profile: 'Wasifu Wangu',
    audit: 'Rekodi za Ukaguzi',
    settings: 'Mipangilio ya Mfumo',
    notifications: 'Arifa'
};

async function navigateTo(page) {
    const role = Store.user?.role;
    if (!canAccessPage(role, page)) {
        const fallbackPage = getDefaultPage(role);
        if (fallbackPage !== page) {
            showError('Huna ruhusa ya sehemu hii.');
            navigateTo(fallbackPage);
            return;
        }
    }

    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

    const body = document.getElementById('pageBody');
    if (!body) return;
    body.innerHTML = loadingHtml();

    const renderers = {
        dashboard: renderDashboardPage,
        pos: renderPosPage,
        products: renderProductsPage,
        sales: renderSalesPage,
        expenses: renderExpensesPage,
        suppliers: renderSuppliersPage,
        customers: renderCustomersPage,
        reports: renderReportsPage,
        users: renderUsersPage,
        profile: renderProfilePage,
        audit: renderAuditPage,
        settings: renderSettingsPage,
        notifications: renderNotificationsPage
    };

    const fn = renderers[page];
    if (fn) {
        try {
            await fn(body);
        } catch (err) {
            console.error(err);
            body.innerHTML = `<div class="card"><div class="card-body"><div class="empty-state"><div class="icon">⚠️</div><p>${escapeHtml(err.message || 'Imeshindikana kupakia ukurasa')}</p></div></div></div>`;
        }
    } else {
        body.innerHTML = `<div class="empty-state">Ukurasa haujapatikana</div>`;
    }

    translateCurrentView(body);
    translateCurrentView(document.getElementById('root'));

    // collapse mobile sidebar after navigation
    toggleSidebar(false);
}

function toggleSidebar(forceOpen) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !sidebar?.classList.contains('open');
    sidebar?.classList.toggle('open', shouldOpen);
    backdrop?.classList.toggle('show', shouldOpen);
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (!menu) return;
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

async function toggleLanguage() {
    const current = getCurrentLanguage();
    const next = current === 'sw' ? 'en' : 'sw';
    setAppLanguage(next);
    if (Store.user) {
        const page = currentPage || getDefaultPage(Store.user.role);
        await navigateTo(page);
    }
}

function closeUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) menu.style.display = 'none';
}

document.addEventListener('click', (event) => {
    if (!event.target.closest('#userMenuWrapper')) closeUserMenu();
});

async function handleLogout() {
    try { await Api.logout(); } catch { /* ignore */ }
    Store.clear();
    window.location.reload();
}

// ---- Boot ----

async function bootApp() {
    try {
        const res = await Api.me();
        Store.user = { ...Store.user, ...res.user, fullName: res.user.full_name, role: res.user.role, roleId: res.user.role_id };
        Store.permissions = res.permissions;

        // Fetch CSRF token once per session so api.js can attach it fast.
        try {
            const csrfRes = await apiRequest('GET', '/auth/me.php?csrf=1');
            if (csrfRes?.csrfToken) sessionStorage.setItem('srsms_csrf', csrfRes.csrfToken);
        } catch { /* non-fatal */ }

        try {
            const settingsRes = await Api.getSettings().catch(() => null);
            if (settingsRes?.settings?.currency) window.__shopCurrency = settingsRes.settings.currency;
        } catch { /* non-fatal */ }
        renderShell();
    } catch (err) {
        Store.clear();
        renderLogin();
    }
}

document.addEventListener('DOMContentLoaded', bootApp);
