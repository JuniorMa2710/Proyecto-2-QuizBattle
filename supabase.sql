-- Proyecto 2: autenticación, datos por cuenta y desafíos entre dos usuarios.
-- Ejecutar una sola vez en el proyecto Supabase QuizBattle.

-- Crear también la estructura original si el proyecto fue restaurado sin tablas.
create table if not exists public.resultados (
  id bigint generated always as identity primary key,
  jugador text not null check (char_length(jugador) between 1 and 80),
  categoria text not null check (categoria in ('futbol','cultura','ciencia','videojuegos')),
  aciertos integer not null check (aciertos between 0 and 5),
  puntos integer not null check (puntos between 0 and 500 and puntos = aciertos * 100),
  fecha timestamptz not null default now()
);
alter table public.resultados enable row level security;

-- 1) Los resultados del Laboratorio 4 pasan a pertenecer a una cuenta.
alter table public.resultados
  add column if not exists usuario_id uuid references auth.users(id) on delete cascade;

drop index if exists public.resultados_jugador_categoria_unico;
create unique index if not exists resultados_usuario_categoria_unico
  on public.resultados (usuario_id, categoria)
  where usuario_id is not null;

drop policy if exists "ranking lectura publica" on public.resultados;
drop policy if exists "resultados insercion publica" on public.resultados;
drop policy if exists "actualizacion record publico" on public.resultados;
drop policy if exists "ranking visible para usuarios" on public.resultados;
drop policy if exists "cada usuario inserta su resultado" on public.resultados;
drop policy if exists "cada usuario actualiza su resultado" on public.resultados;

revoke all on table public.resultados from anon;
grant select, insert, update on table public.resultados to authenticated;
grant usage, select on sequence public.resultados_id_seq to authenticated;

create policy "ranking visible para usuarios"
  on public.resultados for select to authenticated using (true);
create policy "cada usuario inserta su resultado"
  on public.resultados for insert to authenticated
  with check (usuario_id = (select auth.uid()));
create policy "cada usuario actualiza su resultado"
  on public.resultados for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

drop function if exists public.guardar_mejor_resultado(text, integer);
create function public.guardar_mejor_resultado(p_categoria text, p_aciertos integer)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_correo text := auth.jwt() ->> 'email';
  v_nombre text;
begin
  if v_usuario is null then raise exception 'Debes iniciar sesión'; end if;
  if p_categoria is null or p_categoria not in ('futbol','cultura','ciencia','videojuegos')
     or p_aciertos is null or p_aciertos not between 0 and 5 then
    raise exception 'Datos inválidos';
  end if;
  v_nombre := left(coalesce(nullif(split_part(v_correo, '@', 1), ''), 'Jugador'), 24);
  insert into public.resultados(jugador, categoria, aciertos, puntos, usuario_id)
  values (v_nombre, p_categoria, p_aciertos, p_aciertos * 100, v_usuario)
  on conflict (usuario_id, categoria) where usuario_id is not null
  do update set
    jugador = excluded.jugador,
    aciertos = excluded.aciertos,
    puntos = excluded.puntos,
    fecha = now()
  where excluded.puntos > public.resultados.puntos;
end;
$$;
revoke all on function public.guardar_mejor_resultado(text, integer) from public, anon;
grant execute on function public.guardar_mejor_resultado(text, integer) to authenticated;

-- Índices para acelerar las búsquedas por creador y por jugador que responde.
create index if not exists retos_creador_id_idx on public.retos(creador_id);
create index if not exists respuestas_usuario_id_idx on public.respuestas(usuario_id);

-- 2) Desafíos: una persona publica una pregunta y otra persona la responde.
create table if not exists public.retos (
  id uuid primary key default gen_random_uuid(),
  creador_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null check (categoria in ('futbol','cultura','ciencia','videojuegos')),
  pregunta text not null,
  opciones jsonb not null check (jsonb_typeof(opciones) = 'array' and jsonb_array_length(opciones) = 4),
  estado text not null default 'abierto' check (estado in ('abierto','respondido')),
  created_at timestamptz not null default now()
);

create table if not exists public.retos_claves (
  reto_id uuid primary key references public.retos(id) on delete cascade,
  respuesta_correcta integer not null check (respuesta_correcta between 0 and 3)
);

create table if not exists public.respuestas (
  reto_id uuid primary key references public.retos(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  opcion integer not null check (opcion between 0 and 3),
  es_correcta boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.retos enable row level security;
alter table public.retos_claves enable row level security;
alter table public.respuestas enable row level security;

drop policy if exists "usuarios autenticados ven retos" on public.retos;
drop policy if exists "usuario crea su propio reto" on public.retos;
create policy "usuarios autenticados ven retos"
  on public.retos for select to authenticated using (true);
create policy "usuario crea su propio reto"
  on public.retos for insert to authenticated
  with check (creador_id = (select auth.uid()));

drop policy if exists "creador guarda la clave" on public.retos_claves;
create policy "creador guarda la clave"
  on public.retos_claves for insert to authenticated
  with check (exists (
    select 1 from public.retos r
    where r.id = reto_id and r.creador_id = (select auth.uid())
  ));

drop policy if exists "participantes ven respuesta" on public.respuestas;
drop policy if exists "otro usuario responde reto abierto" on public.respuestas;
create policy "participantes ven respuesta"
  on public.respuestas for select to authenticated
  using (
    usuario_id = (select auth.uid())
    or exists (
      select 1 from public.retos r
      where r.id = reto_id and r.creador_id = (select auth.uid())
    )
  );
create policy "otro usuario responde reto abierto"
  on public.respuestas for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.retos r
      where r.id = reto_id
        and r.estado = 'abierto'
        and r.creador_id <> (select auth.uid())
    )
  );

grant usage on schema public to authenticated;
grant select, insert on public.retos to authenticated;
grant insert on public.retos_claves to authenticated;
grant select, insert on public.respuestas to authenticated;

-- La respuesta correcta se calcula en la base de datos, no se confía en el navegador.
create or replace function public.calificar_respuesta_reto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correcta integer;
begin
  if auth.uid() is null or new.usuario_id <> auth.uid() then
    raise exception 'No puedes responder con otra cuenta';
  end if;
  select k.respuesta_correcta into v_correcta
  from public.retos_claves k where k.reto_id = new.reto_id;
  if v_correcta is null then raise exception 'No se encontró la clave del desafío'; end if;
  new.es_correcta := (new.opcion = v_correcta);
  return new;
end;
$$;

create or replace function public.marcar_reto_respondido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.retos set estado = 'respondido'
  where id = new.reto_id and estado = 'abierto';
  return new;
end;
$$;

drop trigger if exists calificar_respuesta_antes_insertar on public.respuestas;
create trigger calificar_respuesta_antes_insertar
before insert on public.respuestas
for each row execute function public.calificar_respuesta_reto();

drop trigger if exists marcar_reto_despues_respuesta on public.respuestas;
create trigger marcar_reto_despues_respuesta
after insert on public.respuestas
for each row execute function public.marcar_reto_respondido();

revoke all on function public.calificar_respuesta_reto() from public, anon, authenticated;
revoke all on function public.marcar_reto_respondido() from public, anon, authenticated;

-- Crear un desafío y su clave en una sola operación.
create or replace function public.crear_reto(
  p_categoria text,
  p_pregunta text,
  p_opciones jsonb,
  p_respuesta_correcta integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_reto uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if p_categoria is null or p_categoria not in ('futbol','cultura','ciencia','videojuegos')
     or p_pregunta is null or length(btrim(p_pregunta)) = 0
     or p_opciones is null or jsonb_typeof(p_opciones) <> 'array'
     or jsonb_array_length(p_opciones) <> 4
     or p_respuesta_correcta is null or p_respuesta_correcta not between 0 and 3 then
    raise exception 'Datos del desafío inválidos';
  end if;
  insert into public.retos(creador_id,categoria,pregunta,opciones)
  values(auth.uid(),p_categoria,p_pregunta,p_opciones)
  returning id into v_reto;
  insert into public.retos_claves(reto_id,respuesta_correcta)
  values(v_reto,p_respuesta_correcta);
  return v_reto;
end;
$$;

create or replace function public.responder_reto(p_reto_id uuid, p_opcion integer)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_correcta boolean;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if p_reto_id is null or p_opcion is null or p_opcion not between 0 and 3 then raise exception 'Opción inválida'; end if;
  insert into public.respuestas(reto_id,usuario_id,opcion)
  values(p_reto_id,auth.uid(),p_opcion)
  returning es_correcta into v_correcta;
  return v_correcta;
end;
$$;

revoke all on function public.crear_reto(text,text,jsonb,integer) from public, anon;
revoke all on function public.responder_reto(uuid,integer) from public, anon;
grant execute on function public.crear_reto(text,text,jsonb,integer) to authenticated;
grant execute on function public.responder_reto(uuid,integer) to authenticated;

-- Activar los cambios en tiempo real para las dos pantallas.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='retos') then
    execute 'alter publication supabase_realtime add table public.retos';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='respuestas') then
    execute 'alter publication supabase_realtime add table public.respuestas';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='resultados') then
    execute 'alter publication supabase_realtime add table public.resultados';
  end if;
end $$;
