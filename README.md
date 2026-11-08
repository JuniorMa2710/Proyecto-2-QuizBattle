# QuizBattle — Proyecto 2

Aplicación de preguntas y desafíos para varios usuarios. Cada persona inicia sesión con una cuenta ficticia, guarda su mejor puntaje por categoría y puede responder desafíos publicados por otra persona.

## Cómo funciona
1. El jugador crea su cuenta con correo, contraseña y un nombre de usuario único; después inicia sesión con sus credenciales.
2. Puede jugar una partida individual de cinco preguntas. Cada respuesta correcta vale 100 puntos.
3. Su mejor resultado por categoría se guarda asociado a su cuenta y se muestra con su nombre de usuario.
4. Puede publicar un desafío de una pregunta. Otro usuario lo ve desde su dispositivo y responde.
5. Las dos pantallas reciben los cambios mediante Supabase Realtime. El creador ve quién respondió sin recargar.

## Tecnologías
- HTML, CSS y JavaScript.
- Supabase Auth para las sesiones.
- Supabase PostgreSQL y Row Level Security (RLS) para guardar y proteger los datos.
- Supabase Realtime para sincronizar desafíos y respuestas.
- GitHub para el repositorio público y Vercel para publicar la aplicación.

## Tablas de Supabase
- `perfiles`: guarda el nombre de usuario único de cada cuenta.
- `resultados`: guarda el mejor puntaje por usuario y categoría.
- `puntuacion_desafios`: acumula el puntaje de cada usuario en desafíos en vivo.
- `retos`: contiene la pregunta, categoría, opciones y estado del desafío.
- `retos_claves`: guarda la respuesta correcta; no se expone a otros usuarios.
- `respuestas`: registra la opción elegida por el segundo jugador y el resultado calculado por la base de datos.

## Configuración de Supabase
1. La migración de `supabase.sql` ya está aplicada en el proyecto QuizBattle. Si se instala en otro proyecto, ejecutar el archivo una sola vez.
2. En la pantalla de acceso, usar **Crear cuenta nueva** para registrar cada usuario con correo, contraseña y un nombre de usuario único de 3 a 20 caracteres (letras, números o guion bajo). El sistema no permite nombres repetidos, aunque cambien mayúsculas/minúsculas.
3. Si Supabase tiene activa la confirmación de correo, usar correos a los que se tenga acceso y confirmar el mensaje recibido antes de iniciar sesión. Si se desactiva la confirmación sólo para la demostración, pueden usarse correos ficticios.
4. Abrir una segunda sesión en otro navegador o ventana privada para probar la interacción entre dos usuarios.

## Enlaces
- Aplicación de prueba: https://quizbattle-proyecto2-jmajebih3-oscarerubio55-5263.vercel.app
- Repositorio: https://github.com/JuniorMa2710/Proyecto-2-QuizBattle
- Rama de Proyecto 2: https://github.com/JuniorMa2710/Proyecto-2-QuizBattle/tree/proyecto-2-auth-duelos
- Pull request de revisión: https://github.com/JuniorMa2710/Proyecto-2-QuizBattle/pull/1

La aplicación sólo contiene la URL del proyecto y la clave publicable. Nunca debe colocarse una clave secreta en el navegador ni en GitHub.

## Pruebas para la defensa
1. Entrar con el usuario A y jugar una categoría; comprobar que su mejor puntaje queda guardado.
2. Recargar o entrar con A desde otro dispositivo y comprobar que su resultado vuelve a aparecer.
3. Entrar con A en una ventana normal y crear un desafío.
4. Entrar con B en una ventana privada y comprobar que aparece el desafío sin recargar.
5. Responder con B y comprobar que A ve la respuesta en su pantalla sin recargar.
6. Recargar ambas pantallas y comprobar que el desafío y la respuesta siguen guardados.
7. Comprobar que el ranking de fútbol, ciencia, videojuegos y cultura general se actualiza por separado.
8. Responder desafíos y comprobar que el ranking en vivo suma 100 puntos por cada respuesta correcta.

## Clasificaciones
- Cuatro rankings individuales independientes: fútbol, ciencia, videojuegos y cultura general.
- Un ranking adicional de desafíos en vivo. Cada respuesta correcta suma 100 puntos; una incorrecta suma 0.
- Cada jugador aparece por su nombre de usuario, nunca por su correo electrónico.
