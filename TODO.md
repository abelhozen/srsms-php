# TODO - SRSMS performance & security hardening

- [x] Step 1: Add CSRF protection for all state-changing endpoints (POST/PUT/DELETE). Provide token via a GET endpoint or initial bootstrap response; validate in bootstrap.php.

- [ ] Step 2: Add rate limiting/throttling for login (per IP + username) and harden lockout flow.
- [ ] Step 3: Apply/verify DB performance indexes (run `database/performance_indexes.sql`).
- [ ] Step 4: Improve “My Profile” page layout to use full width of page body (reduce “thin” look) and ensure responsive full-page behavior.
- [ ] Step 5: Add small response-time improvements: minimize payload sizes for frequent GETs (profile/settings/notifications) and add request timeouts in frontend API client.
- [ ] Step 6: Add admin configuration for audit retention/log filtering where settings already exist.
- [ ] Step 7: QA smoke test with concurrent users.

