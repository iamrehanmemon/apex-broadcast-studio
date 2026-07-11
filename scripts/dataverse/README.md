# Dataverse setup scripts

One-off scripts used to provision this app's Dataverse schema and seed data directly via the Web API (used because neither PowerShell nor Azure CLI's Dataverse tooling was available interactively — see `az login --allow-no-subscriptions` requirement below). All are idempotent-ish (safe to re-run; seed scripts delete-and-recreate rather than upsert).

Run in this order for a fresh environment:

1. `setup_dataverse.py` — creates the `BroadcastStudio` solution, the `Announcement Template` and `Announcement` tables and columns, the lookup relationship.
2. `setup_security_role.py` — creates the "Broadcast Studio Author" security role, grants table privileges, assigns to a user.
3. `add_layout_column.py` — adds the `cr133_layout` picklist column (message/spotlight/celebration/memoriam/condolence/stats/event/bulletins).
4. `add_categories.py` — adds the Recognition / Events & Social / Operations Updates category choice values.
5. `seed_templates_v3.py` then `seed_templates_v4.py` — seed the 13 + 21 template rows (34 total).

## Prerequisites

- `az login --allow-no-subscriptions` (tenant-level login is enough; no Azure subscription needed)
- Edit `ORG_URL` at the top of each script to your environment's Dataverse Web API URL (`https://<org>.crm.dynamics.com`) and `SOLUTION_UNIQUE_NAME`/publisher prefix if different.
