-- Courrier administratif : schéma Supabase (déjà appliqué au projet "contact").
-- Tables préfixées courrier_ pour ne pas entrer en conflit avec les autres applications du projet.
create table if not exists public.courrier_structures (
  id bigint generated always as identity primary key,
  nom text not null,
  data jsonb not null default '{}'::jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now()
);
create table if not exists public.courrier_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  login text unique not null,
  nom text,
  role text not null,
  structure_id bigint references public.courrier_structures(id) on delete cascade,
  ok boolean not null default false
);
alter table public.courrier_structures enable row level security;
alter table public.courrier_profiles   enable row level security;

create or replace function public.courrier_my_role() returns text
  language sql stable security definer set search_path = public as
  $$ select role from public.courrier_profiles where id = auth.uid() $$;
create or replace function public.courrier_my_structure() returns bigint
  language sql stable security definer set search_path = public as
  $$ select structure_id from public.courrier_profiles where id = auth.uid() $$;

-- Structures : chaque utilisateur ne voit/modifie que sa structure ; le superviseur voit tout
create policy cst_select on public.courrier_structures for select
  using (public.courrier_my_role() = 'superviseur' or id = public.courrier_my_structure());
create policy cst_update on public.courrier_structures for update
  using (public.courrier_my_role() = 'superviseur' or id = public.courrier_my_structure())
  with check (public.courrier_my_role() = 'superviseur' or id = public.courrier_my_structure());
create policy cst_insert on public.courrier_structures for insert
  with check (public.courrier_my_role() = 'superviseur');

-- Profils
create policy cpf_select on public.courrier_profiles for select
  using (id = auth.uid() or public.courrier_my_role() = 'superviseur'
         or (public.courrier_my_role() = 'admin' and structure_id = public.courrier_my_structure()));
create policy cpf_insert on public.courrier_profiles for insert
  with check (public.courrier_my_role() = 'superviseur'
         or (public.courrier_my_role() = 'admin' and structure_id = public.courrier_my_structure() and role <> 'superviseur'));
create policy cpf_update_self on public.courrier_profiles for update
  using (id = auth.uid())
  with check (role = public.courrier_my_role() and structure_id is not distinct from public.courrier_my_structure());
create policy cpf_update_admin on public.courrier_profiles for update
  using (public.courrier_my_role() = 'admin' and structure_id = public.courrier_my_structure())
  with check (structure_id = public.courrier_my_structure() and role <> 'superviseur');

-- Synchronisation en temps réel
alter publication supabase_realtime add table public.courrier_structures;

-- Diaporama de la page d'accueil (lecture publique, écriture admin/superviseur)
create table if not exists public.courrier_slides (
  id bigint primary key, titre text not null, texte text not null default '',
  image text not null default '', ordre int not null default 0, updated_at timestamptz not null default now());
alter table public.courrier_slides enable row level security;
create policy csl_select on public.courrier_slides for select to anon, authenticated using (true);
create policy csl_insert on public.courrier_slides for insert to authenticated with check (public.courrier_my_role() in ('admin','superviseur'));
create policy csl_update on public.courrier_slides for update to authenticated using (public.courrier_my_role() in ('admin','superviseur')) with check (public.courrier_my_role() in ('admin','superviseur'));
create policy csl_delete on public.courrier_slides for delete to authenticated using (public.courrier_my_role() in ('admin','superviseur'));
