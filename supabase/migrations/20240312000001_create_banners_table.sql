CREATE TABLE IF NOT EXISTS banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  bg_color text NOT NULL DEFAULT '#1C1C1C',
  text_color text NOT NULL DEFAULT '#FAF8F5',
  link_url text,
  link_text text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);


