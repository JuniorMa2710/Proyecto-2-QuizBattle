# QuizBattle — Proyecto 2

Aplicación de preguntas y desafíos para varios usuarios. Cada persona inicia sesión con una cuenta ficticia, guarda su mejor puntaje por categoría y puede responder desafíos publicados por otra persona.

## Cómo funciona
1. El jugador inicia sesión con correo y contraseña creados en Supabase Auth.
2. Puede jugar una partida individual de cinco preguntas. Cada respuesta correcta vale 100 puntos.
3. Su mejor resultado por categoría se guarda asociado a su cuenta en `public.resultados`.
4. Puede publicar un desafío de una pregunta. Otro usuario lo ve desde su dispositivo y responde.
5. Las dos pantallas reciben los cambios mediante Supabase Realtime. El creador ve la respuesta del otro jugador sin recargar.

## Tecnologías
- HTML, CSS y JavaScript.
- Supabase Auth para las sesiones.
- Supabase PostgreSQL y Row Level Security (RLS) para guardar y proteger los datos.
- Supabase Realtime para sincronizar desafíos y respuestas.
- GitHub para el repositorio público y Vercel para publicar la aplicación.

## Tablas de Supabase
- `resultados`: guarda el mejor puntaje por usuario y categoría.
- `retos`: contiene la pregunta, categoría, opciones y estado del desafío.
- `retos_claves`: guarda la respuesta correcta; no se expone a otros usuarios.
- `respuestas`: registra la opción elegida por el segundo jugador y el resultado calculado por la base de datos.

## Configuración de Supabase
1. Ejecutar una vez el contenido de `supabase.sql` en el proyecto QuizBattle.
2. En Authentication > Users, crear dos usuarios de prueba con correos inventados y contraseña.
3. Iniciar sesión en la aplicación con las cuentas creadas.

La aplicación sólo contiene la URL del proyecto y la clave publicable. Nunca debe colocarse una clave secreta en el navegador ni en GitHub.

## Pruebas para la defensa
1. Entrar con el usuario A y jugar una categoría; comprobar que su mejor puntaje queda guardado.
2. Recargar o entrar con A desde otro dispositivo y comprobar que su resultado vuelve a aparecer.
3. Entrar con A en una ventana normal y crear un desafío.
4. Entrar con B en una ventana privada y comprobar que aparece el desafío sin recargar.
5. Responder con B y comprobar que A ve la respuesta en su pantalla sin recargar.
6. Recargar ambas pantallas y comprobar que el desafío y la respuesta siguen guardados.

## Categorías
Fútbol, cultura general, ciencia y videojuegos.
