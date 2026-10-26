-- Esquema de QuizBattle (ya aplicado al proyecto Supabase)
create table if not exists public.resultados (
  id bigint generated always as identity primary key,
  jugador text not null check (char_length(jugador) between 1 and 24),
  categoria text not null check (categoria in ('futbol','cultura','ciencia','videojuegos')),
  aciertos integer not null check (aciertos between 0 and 5),
  puntos integer not null check (puntos between 0 and 500 and puntos=aciertos*100),
  fecha timestamptz not null default now()
);
alter table public.resultados enable row level security;
create policy "ranking lectura publica" on public.resultados for select to anon using (true);
create policy "resultados insercion publica" on public.resultados for insert to anon with check (true);
grant usage on schema public to anon;
grant select, insert on public.resultados to anon;
grant usage, select on sequence public.resultados_id_seq to anon;
-- Nota: la primera versión usa solo usuarios de prueba inventados y un ranking público.
