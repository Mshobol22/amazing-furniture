alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists auth_provider text;

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();
