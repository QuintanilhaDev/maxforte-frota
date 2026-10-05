-- MAX FORTE · Execute inteiro no Supabase > SQL Editor
create table if not exists profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  gender text check (gender in ('M','F')),
  role text not null default 'admin' check (role in ('master','admin')),
  created_at timestamptz default now());
create table if not exists postos(
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  nome text,
  endereco text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz default now());
create table if not exists veiculos(
  id uuid primary key default gen_random_uuid(),
  placa text unique not null check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  situacao text not null default 'Operando' check (situacao in ('Operando','Em rota','Manutenção','Parado')),
  posto_id uuid references postos(id) on delete set null,
  updated_at timestamptz default now());
alter table profiles enable row level security;
alter table postos enable row level security;
alter table veiculos enable row level security;
drop policy if exists p_read on profiles;
create policy p_read on profiles for select to authenticated using (true);
drop policy if exists po_all on postos;
create policy po_all on postos for all to authenticated using (true) with check (true);
drop policy if exists v_all on veiculos;
create policy v_all on veiculos for all to authenticated using (true) with check (true);
-- Veículos da planilha (sem posto):
insert into veiculos(placa) values
  ('TAR3C02'),
  ('TAR3C09'),
  ('TYJ3G19'),
  ('TYJ3G10'),
  ('TBO0F21'),
  ('TBO0C66'),
  ('SFD2H81'),
  ('UBZ1D60'),
  ('TAY2E61'),
  ('TAY2E62'),
  ('SFD2H80'),
  ('TBO0F09'),
  ('TYX0E54'),
  ('TYX0E45'),
  ('TAY2E64'),
  ('TAY2E63'),
  ('UBY5B55'),
  ('UBY5B25'),
  ('TBO0F14'),
  ('TBO0F19'),
  ('TBO0E97'),
  ('TBO0C87'),
  ('TYX0E52'),
  ('UBY5B29'),
  ('UBY5B45'),
  ('UBX9C79'),
  ('UBY5B24'),
  ('TBO2A80'),
  ('SFD2H79'),
  ('SFO7A73'),
  ('UCI6E24'),
  ('SFD2H63'),
  ('TAY2E59'),
  ('TAR1H85'),
  ('UBY8A26'),
  ('TAN3H63')
on conflict (placa) do nothing;
