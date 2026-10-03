ALTER TABLE subscribers ADD COLUMN token TEXT;
ALTER TABLE subscribers ADD COLUMN unsubscribed_at TEXT;
UPDATE subscribers SET token = lower(hex(randomblob(16)));
CREATE UNIQUE INDEX subscribers_token ON subscribers (token);

CREATE TABLE sent_posts (
  slug TEXT PRIMARY KEY,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  recipients INTEGER NOT NULL
);

INSERT INTO sent_posts (slug, recipients) VALUES ('llms/attention', 0), ('llms/kv-cache', 0);
