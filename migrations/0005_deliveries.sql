CREATE TABLE deliveries (
  slug TEXT NOT NULL,
  email TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slug, email)
);
