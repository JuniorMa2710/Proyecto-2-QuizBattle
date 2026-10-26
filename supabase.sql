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

-- Laboratorio 4: un récord por jugador y categoría.
-- Antes de crear el índice se conservó la mejor fila de cada par.
create unique index if not exists resultados_jugador_categoria_unico
  on public.resultados (lower(jugador),categoria);
grant update(aciertos,puntos,fecha) on public.resultados to anon;
create policy "actualizacion record publico" on public.resultados
  for update to anon using (true) with check (true);
create or replace function public.guardar_mejor_resultado(
  p_jugador text,p_categoria text,p_aciertos integer)
returns void language plpgsql security invoker set search_path = public as $$
begin
 if p_jugador is null or length(btrim(p_jugador)) not between 1 and 24
 or p_categoria not in ('futbol','cultura','ciencia','videojuegos')
 or p_aciertos not between 0 and 5 then
 raise exception 'Datos inválidos';
 end if;
 insert into public.resultados(jugador,categoria,aciertos,puntos)
 values(btrim(p_jugador),p_categoria,p_aciertos,p_aciertos*100)
 on conflict(lower(jugador),categoria) do update
 set aciertos=excluded.aciertos,puntos=excluded.puntos,fecha=now()
 where excluded.puntos>resultados.puntos;
end;$$;
grant execute on function public.guardar_mejor_resultado(text,text,integer) to anon;
