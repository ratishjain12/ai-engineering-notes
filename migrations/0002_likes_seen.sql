CREATE TABLE likes_seen (
  slug TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  PRIMARY KEY (slug, ip_hash)
);
