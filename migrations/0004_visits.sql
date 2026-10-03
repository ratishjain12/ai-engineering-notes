CREATE TABLE visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  medium TEXT,
  campaign TEXT,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX visits_campaign ON visits (campaign, source);
