# QuizBattle — Proyecto 2 / Laboratorio 4

Aplicación de trivia compartida: jugadores ficticios compiten en fútbol, cultura general, ciencia y videojuegos, respondiendo cinco preguntas por partida.

## Funcionamiento
1. Escribe un apodo inventado y elige una categoría.
2. Responde cinco preguntas; cada respuesta correcta vale 100 puntos.
3. Al finalizar, la aplicación guarda el resultado en la tabla `public.resultados` de Supabase.
4. El ranking consulta los resultados desde Supabase. En otro navegador, pulsa **Actualizar** para ver los mismos datos.

## Tecnologías
- HTML, CSS y JavaScript (sin compilación)
- Supabase: PostgreSQL + Row Level Security (RLS)
- GitHub: repositorio público con historial de commits
- Vercel: publicación web (pendiente de vincular GitHub)

## Base de datos
El archivo `supabase.sql` documenta la estructura que ya se ha creado en el proyecto Supabase. Tiene políticas RLS para que usuarios anónimos puedan leer y añadir resultados, pero no modificarlos ni eliminarlos. No utiliza información personal ni claves secretas en el navegador; solamente la clave **publicable**.

## Pruebas exigidas por Laboratorio 4
1. Jugador A completa cinco preguntas y se ve «Resultado guardado».
2. Abre la dirección pública en otro navegador: el resultado aparece en el ranking.
3. Jugador A realiza otra partida.
4. Jugador B abre la aplicación en modo incógnito y actualiza: ve la nueva puntuación de A.
Adjunta cuatro capturas a la tarjeta PDF del laboratorio, junto al repositorio, el commit y el dominio corto de Vercel.

## Pendiente para Proyecto 2
Autenticación con correos ficticios, partidas interactivas jugador contra jugador, y puntuaciones verificadas por el servidor. El ranking público actual es demostrativo y admite resultados enviados por clientes, por lo que no es antitrampas.
