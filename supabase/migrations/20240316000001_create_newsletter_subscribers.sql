-- Newsletter subscribers table
-- is_active used for soft unsubscribes — no hard deletes
-- newsletter_attempts used for server-side rate limiting (no in-memory state)

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT         NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  source        VARCHAR(50)  NOT NULL DEFAULT 'footer',
  is_active     BOOLEAN      NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
  ON newsletter_subscribers(email);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_is_active
  ON newsletter_subscribers(is_active);

-- Separate table to track raw subscribe attempts for rate limiting.
-- Allows counting attempts even before a subscriber record exists.
CREATE TABLE IF NOT EXISTS newsletter_attempts (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT         NOT NULL,
  attempted_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_attempts_email_time
  ON newsletter_attempts(email, attempted_at);

-- RLS: anon users can INSERT to both tables, but cannot SELECT or UPDATE.
-- Reads and updates are handled exclusively via the service-role key server-side.

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_newsletter_subscribers"
  ON newsletter_subscribers FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_insert_newsletter_attempts"
  ON newsletter_attempts FOR INSERT TO anon
  WITH CHECK (true);
