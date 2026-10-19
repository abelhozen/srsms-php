# TODO_BACKUP.md

- [x] Step 1: Extend DB schema (database/schema.sql) with backup retention fields and backup_files table.

- [x] Step 2: Create backups storage folder config (backups/.htaccess) to block public access.

- [x] Step 3: Implement new API endpoint `api/settings/backup.php` (GET list, POST create, cleanup).

- [x] Step 4: Extend `api/settings/index.php` to save/load backup retention period.

- [x] Step 5: Add frontend API client methods in `assets/js/api.js` for backup list/create/download.

- [x] Step 6: Add “Backup & Restore” card to `assets/js/pages/admin.js` System Settings page.

- [x] Step 7: Add/verify retention cleanup logic for day/week/month/year.

- [x] Step 8: Smoke test: login as admin, update retention, create backup, download backup, verify old backups are removed.


