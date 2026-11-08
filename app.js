import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const db = createClient('https://ucnohaxgsdmrelivpycw.supabase.co', 'sb_publishable_feiZbKJch198FbyXfMk06g_DuYx2H9E');
const $ = (id) => document.getElementById(id);
const preguntas = {
  futbol: [
    ['¿Cuántos futbolistas tiene cada equipo en cancha?', ['9','10','11','12'], 2],
    ['¿Qué selección ganó el Mundial masculino de 2022?', ['Francia','Argentina','España','Brasil'], 1],
    ['¿Qué tarjeta significa expulsión?', ['Azul','Roja','Verde','Amarilla'], 1],
    ['¿Cuánto dura un tiempo reglamentario?', ['30 min','45 min','60 min','40 min'], 1],
    ['¿Qué organismo dirige el fútbol mundial?', ['FIFA','FIBA','FIA','ATP'], 0]
  ],
  cultura: [
    ['¿Cuál es la capital de Ecuador?', ['Guayaquil','Quito','Cuenca','Manta'], 1],
    ['¿Qué océano es el más grande?', ['Atlántico','Índico','Pacífico','Ártico'], 2],
    ['¿Qué idioma se habla principalmente en Brasil?', ['Español','Francés','Portugués','Italiano'], 2],
    ['¿Cuántos lados tiene un hexágono?', ['5','6','7','8'], 1],
    ['¿En qué continente está Ecuador?', ['Europa','Asia','América','África'], 2]
  ],
  ciencia: [
    ['¿Qué planeta es el planeta rojo?', ['Venus','Marte','Saturno','Júpiter'], 1],
    ['¿Cuál es la fórmula química del agua?', ['CO2','O2','H2O','NaCl'], 2],
    ['¿Qué órgano bombea la sangre?', ['Riñón','Pulmón','Corazón','Hígado'], 2],
    ['¿Qué fuerza nos mantiene en la Tierra?', ['Gravedad','Electricidad','Magnetismo','Fricción'], 0],
    ['¿Qué gas absorben las plantas en la fotosíntesis?', ['Oxígeno','Dióxido de carbono','Helio','Hidrógeno'], 1]
  ],
  videojuegos: [
    ['¿Quién fabrica PlayStation?', ['Nintendo','Sony','Microsoft','Sega'], 1],
    ['¿Quién usa gorra roja y recoge monedas?', ['Sonic','Mario','Link','Kirby'], 1],
    ['¿En qué juego puedes construir con bloques?', ['Minecraft','FIFA','Gran Turismo','Portal'], 0],
    ['¿En qué videojuego aparece Arthur Morgan?', ['Halo','Red Dead Redemption 2','Minecraft','Fortnite'], 1],
    ['¿Cuál es un juego de carreras?', ['Gran Turismo','Stardew Valley','Celeste','Portal'], 0]
  ]
};
const nombresCategoria = { futbol:'⚽ Fútbol', cultura:'🌎 Cultura general', ciencia:'🔬 Ciencia', videojuegos:'🎮 Videojuegos' };
let usuario = null, categoria = 'futbol', indice = 0, aciertos = 0, bloqueado = false, canal = null, usuarioActivoId = null;
function aviso(id, mensaje, error=false) {
  const el = $(id); if (!el) return;
  el.textContent = mensaje; el.classList.toggle('error', error);
}
function mostrarApp(user) {
  const cambioUsuario = usuarioActivoId !== user.id;
  usuario = user;
  usuarioActivoId = user.id;
  $('authView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('userDisplay').textContent = 'Cargando nombre de usuario…';
  if (cambioUsuario) {
    cargarDatos();
    conectarTiempoReal();
  }
}
function mostrarFormularioLogin() {
  $('loginPanel').classList.remove('hidden');
  $('registerPanel').classList.add('hidden');
  $('authStatus').textContent = '';
  $('authStatus').classList.remove('error');
}
function mostrarFormularioRegistro() {
  $('loginPanel').classList.add('hidden');
  $('registerPanel').classList.remove('hidden');
  $('authStatus').textContent = '';
  $('authStatus').classList.remove('error');
}
function mostrarLogin() {
  usuario = null;
  usuarioActivoId = null;
  if (canal) { db.removeChannel(canal); canal = null; }
  $('appView').classList.add('hidden');
  $('authView').classList.remove('hidden');
  mostrarFormularioLogin();
}
async function entrar() {
  const username = $('loginUsername').value.trim().toLowerCase();
  const password = $('loginPassword').value;
  if (!username || !password) return aviso('authStatus','Escribe tu nombre de usuario y contraseña.',true);
  aviso('authStatus','Ingresando…');
  const { data, error } = await db.functions.invoke('username-login', {
    body: { username, password }
  });
  if (error || !data?.session?.access_token || !data?.session?.refresh_token) {
    aviso('authStatus','Nombre de usuario o contraseña incorrectos.',true);
    return;
  }
  const { error: sessionError } = await db.auth.setSession(data.session);
  if (sessionError) aviso('authStatus','No se pudo iniciar sesión. Inténtalo de nuevo.',true);
}
async function registrarse() {
  const email = $('registerEmail').value.trim();
  const password = $('registerPassword').value;
  const username = $('registerUsername').value.trim().toLowerCase();
  if (!email || !password || !username) return aviso('authStatus','Completa el correo, la contraseña y el nombre de usuario.',true);
  if (password.length < 6) return aviso('authStatus','La contraseña debe tener al menos 6 caracteres.',true);
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return aviso('authStatus','El nombre debe tener 3 a 20 caracteres: letras, números o guion bajo.',true);
  aviso('authStatus','Creando tu cuenta…');
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  if (error) { aviso('authStatus',error.message,true); return; }
  if (data.session) {
    aviso('authStatus','✅ Cuenta creada. Tu nombre en QuizBattle es @'+username+'.');
  } else {
    aviso('authStatus','✅ Cuenta creada. Confirma tu correo y luego entra con @'+username+' y tu contraseña.');
  }
}
async function guardarPuntaje() {
  aviso('saveStatus','Guardando tu mejor puntuación…');
  const { error } = await db.rpc('guardar_mejor_resultado',{p_categoria:categoria,p_aciertos:aciertos});
  if (error) aviso('saveStatus','No se pudo guardar: '+error.message,true);
  else aviso('saveStatus','✅ Tu mejor puntuación quedó guardada en tu cuenta.');
  await cargarDatos();
}
async function cargarPerfil() {
  const { data, error } = await db.from('perfiles')
    .select('username')
    .eq('user_id', usuario.id)
    .single();
  if (error) {
    aviso('profileStatus','No se pudo cargar tu perfil: '+error.message,true);
    return;
  }
  $('userDisplay').textContent = '@'+data.username;
  aviso('profileStatus','Tu nombre único en QuizBattle');
}
async function cargarMiMejorPuntaje() {
  const { data, error } = await db.from('resultados')
    .select('categoria,puntos,aciertos,fecha')
    .eq('usuario_id', usuario.id)
    .order('puntos',{ascending:false});
  if (error) { aviso('myRecordsStatus','No se pudieron cargar tus récords: '+error.message,true); return; }
  const list=$('myRecords'); list.replaceChildren();
  if (!data.length) { aviso('myRecordsStatus','Todavía no tienes puntuaciones guardadas.'); return; }
  aviso('myRecordsStatus','Tus mejores resultados, guardados en tu cuenta.');
  data.forEach(r=>{
    const li=document.createElement('li'), left=document.createElement('div'), name=document.createElement('b'), sub=document.createElement('small'), pts=document.createElement('strong');
    name.textContent=nombresCategoria[r.categoria]||r.categoria;
    sub.textContent=r.aciertos+'/5 aciertos';
    pts.textContent=r.puntos+' pts';
    left.append(name,sub); li.append(left,pts); list.append(li);
  });
}
async function cargarRanking() {
  const { data, error } = await db.from('resultados')
    .select('usuario_id,categoria,puntos,aciertos,fecha')
    .order('puntos',{ascending:false}).order('fecha',{ascending:true}).limit(100);
  if (error) { aviso('rankingStatus','No se pudieron cargar los rankings: '+error.message,true); return; }

  const ids = [...new Set((data||[]).map(r=>r.usuario_id).filter(Boolean))];
  let nombres = new Map();
  if (ids.length) {
    const { data: perfiles, error: errorPerfiles } = await db.from('perfiles')
      .select('user_id,username').in('user_id',ids);
    if (errorPerfiles) { aviso('rankingStatus','No se pudieron cargar los nombres de usuario: '+errorPerfiles.message,true); return; }
    nombres = new Map((perfiles||[]).map(p=>[p.user_id,p.username]));
  }

  aviso('rankingStatus','Cada categoría tiene su propia clasificación. Solo se muestra el mejor récord de cada jugador.');
  Object.keys(nombresCategoria).forEach(cat => {
    const list = $('ranking-'+cat);
    list.replaceChildren();
    const rows = (data||[]).filter(r=>r.categoria===cat).slice(0,10);
    if (!rows.length) {
      const empty=document.createElement('li'); empty.className='muted';
      empty.textContent='Todavía no hay puntuaciones.'; list.append(empty); return;
    }
    rows.forEach((r,i)=>{
      const li=document.createElement('li'), left=document.createElement('div'), title=document.createElement('b'), sub=document.createElement('small'), pts=document.createElement('strong');
      const username = nombres.get(r.usuario_id);
      title.textContent=(i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':'#'+(i+1)+' ')+(username ? '@'+username : 'Jugador');
      sub.textContent=r.aciertos+'/5 respuestas correctas'; pts.textContent=r.puntos+' pts';
      left.append(title,sub); li.append(left,pts); list.append(li);
    });
  });
}
async function cargarRankingDesafios() {
  const { data, error } = await db.from('puntuacion_desafios')
    .select('usuario_id,puntos,correctas,respuestas')
    .order('puntos',{ascending:false}).order('correctas',{ascending:false}).order('respuestas',{ascending:false}).limit(10);
  if (error) { aviso('liveRankingStatus','No se pudo cargar el ranking de desafíos: '+error.message,true); return; }

  const ids = [...new Set((data||[]).map(r=>r.usuario_id).filter(Boolean))];
  let nombres = new Map();
  if (ids.length) {
    const { data: perfiles, error: errorPerfiles } = await db.from('perfiles')
      .select('user_id,username').in('user_id',ids);
    if (errorPerfiles) { aviso('liveRankingStatus','No se pudieron cargar los nombres de usuario: '+errorPerfiles.message,true); return; }
    nombres = new Map((perfiles||[]).map(p=>[p.user_id,p.username]));
  }

  const list=$('liveRanking'); list.replaceChildren();
  if (!data?.length) {
    const empty=document.createElement('li'); empty.className='muted';
    empty.textContent='Todavía no hay respuestas en desafíos nuevos.'; list.append(empty);
    aviso('liveRankingStatus','Cada respuesta correcta suma 100 puntos.'); return;
  }
  data.forEach((r,i)=>{
    const li=document.createElement('li'), left=document.createElement('div'), title=document.createElement('b'), sub=document.createElement('small'), pts=document.createElement('strong');
    const username = nombres.get(r.usuario_id);
    title.textContent=(i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':'#'+(i+1)+' ')+(username ? '@'+username : 'Jugador');
    sub.textContent=r.correctas+' correctas de '+r.respuestas+' desafíos'; pts.textContent=r.puntos+' pts';
    left.append(title,sub); li.append(left,pts); list.append(li);
  });
  aviso('liveRankingStatus','Puntuación acumulada por respuestas correctas.');
}
async function cargarRetos() {
  const { data: retos, error } = await db.from('retos').select('id,creador_id,categoria,pregunta,opciones,estado,created_at,creador:perfiles!retos_creador_id_perfiles_fkey(username)').order('created_at',{ascending:false}).limit(30);
  if (error) { aviso('challengeStatus','No se pudieron cargar los desafíos: '+error.message,true); return; }
  const { data: respuestas, error: errRes } = await db.from('respuestas').select('reto_id,usuario_id,opcion,es_correcta,created_at,respondedor:perfiles!respuestas_usuario_id_perfiles_fkey(username)');
  if (errRes) { aviso('challengeStatus','No se pudieron consultar las respuestas: '+errRes.message,true); return; }
  const porReto = new Map((respuestas||[]).map(r=>[r.reto_id,r]));
  const abiertos = $('openChallenges'), propios = $('myChallenges');
  abiertos.replaceChildren(); propios.replaceChildren();
  let cantidadAbiertos=0, cantidadPropios=0;
  (retos||[]).forEach(reto=>{
    const respuesta=porReto.get(reto.id);
    if (reto.creador_id===usuario.id) {
      cantidadPropios++;
      const card=document.createElement('article'); card.className='challenge-card';
      const heading=document.createElement('b'); heading.textContent=nombresCategoria[reto.categoria]+' · Tu desafío';
      const q=document.createElement('p'); q.textContent=reto.pregunta;
      const state=document.createElement('p'); state.className='status';
      if (respuesta) {
        state.textContent='✅ @'+(respuesta.respondedor?.username||'Jugador')+' respondió: '+reto.opciones[respuesta.opcion]+' — '+(respuesta.es_correcta?'¡Respuesta correcta!':'Respuesta incorrecta.');
      } else state.textContent='⏳ Esperando la respuesta de otro jugador…';
      card.append(heading,q,state); propios.append(card);
    } else if (reto.estado==='abierto' && !respuesta) {
      cantidadAbiertos++;
      const card=document.createElement('article'); card.className='challenge-card';
      const heading=document.createElement('b'); heading.textContent=nombresCategoria[reto.categoria]+' · Desafío de @'+(reto.creador?.username||'Jugador');
      const q=document.createElement('p'); q.textContent=reto.pregunta;
      card.append(heading,q);
      reto.opciones.forEach((opcion,n)=>{
        const btn=document.createElement('button'); btn.className='answer compact'; btn.textContent=opcion;
        btn.onclick=()=>responderReto(reto,n,btn); card.append(btn);
      });
      abiertos.append(card);
    } else if (respuesta && respuesta.usuario_id===usuario.id) {
      const card=document.createElement('article'); card.className='challenge-card';
      const heading=document.createElement('b'); heading.textContent=nombresCategoria[reto.categoria]+' · Respondiste a @'+(reto.creador?.username||'Jugador');
      const q=document.createElement('p'); q.textContent=reto.pregunta;
      const state=document.createElement('p'); state.className='status';
      state.textContent='Tu respuesta: '+reto.opciones[respuesta.opcion]+' — '+(respuesta.es_correcta?'¡Correcta!':'Incorrecta.');
      card.append(heading,q,state); abiertos.append(card);
    }
  });
  if (!cantidadAbiertos && !abiertos.children.length) abiertos.innerHTML='<p class="muted">No hay desafíos pendientes de otros jugadores. ¡Crea uno!</p>';
  if (!cantidadPropios) propios.innerHTML='<p class="muted">Todavía no has creado desafíos.</p>';
  aviso('challengeStatus',cantidadAbiertos+' desafío(s) disponible(s) para responder.');
}
async function cargarDatos() { await Promise.all([cargarPerfil(),cargarMiMejorPuntaje(),cargarRanking(),cargarRankingDesafios(),cargarRetos()]); }
function conectarTiempoReal() {
  if (canal) db.removeChannel(canal);
  canal=db.channel('quizbattle-live-'+usuario.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'retos'},()=>cargarRetos())
    .on('postgres_changes',{event:'*',schema:'public',table:'respuestas'},()=>cargarRetos())
    .on('postgres_changes',{event:'*',schema:'public',table:'resultados'},()=>Promise.all([cargarMiMejorPuntaje(),cargarRanking()]))
    .on('postgres_changes',{event:'*',schema:'public',table:'puntuacion_desafios'},()=>cargarRankingDesafios())
    .subscribe((status)=>{
      if (status==='CHANNEL_ERROR' || status==='TIMED_OUT') aviso('challengeStatus','Conexión en vivo interrumpida. Usa Actualizar para consultar los cambios.',true);
    });
}
function iniciarPartida() {
  categoria=$('category').value; indice=0; aciertos=0; bloqueado=false;
  $('setup').classList.add('hidden'); $('finish').classList.add('hidden'); $('game').classList.remove('hidden');
  mostrarPregunta();
}
function mostrarPregunta() {
  bloqueado=false;
  const [texto,opciones]=preguntas[categoria][indice];
  $('progress').textContent='Pregunta '+(indice+1)+' de 5';
  $('scoreLive').textContent=(aciertos*100)+' pts';
  $('bar').style.width=(indice*20)+'%';
  $('question').textContent=texto; $('feedback').textContent=''; $('answers').replaceChildren();
  opciones.forEach((opcion,n)=>{
    const b=document.createElement('button'); b.className='answer'; b.textContent=opcion;
    b.onclick=()=>responderPregunta(n); $('answers').append(b);
  });
}
function responderPregunta(n) {
  if (bloqueado) return; bloqueado=true;
  const correcta=preguntas[categoria][indice][2];
  if (n===correcta) aciertos++;
  Array.from($('answers').children).forEach((boton,i)=>{
    boton.disabled=true;
    if(i===correcta) boton.classList.add('correct'); else if(i===n) boton.classList.add('wrong');
  });
  $('feedback').textContent=n===correcta?'✅ Correcto: +100 puntos':'❌ Incorrecto. La respuesta correcta está en verde.';
  window.setTimeout(async()=>{
    indice++;
    if(indice<5) mostrarPregunta();
    else {
      $('game').classList.add('hidden'); $('finish').classList.remove('hidden');
      $('finalScore').textContent=aciertos+'/5 aciertos — '+(aciertos*100)+' puntos';
      await guardarPuntaje();
    }
  },900);
}
async function crearReto() {
  const cat=$('challengeCategory').value;
  const lista=preguntas[cat], seleccion=lista[Math.floor(Math.random()*lista.length)];
  aviso('challengeCreateStatus','Publicando desafío…');
  const { data,error }=await db.rpc('crear_reto',{
    p_categoria:cat,p_pregunta:seleccion[0],p_opciones:seleccion[1],p_respuesta_correcta:seleccion[2]
  });
  if(error) aviso('challengeCreateStatus','No se pudo crear: '+error.message,true);
  else { aviso('challengeCreateStatus','✅ Desafío publicado. Otro jugador ya puede responderlo.'); await cargarRetos(); }
}
async function responderReto(reto,opcion,boton) {
  boton.disabled=true; aviso('challengeStatus','Enviando tu respuesta…');
  const { data,error }=await db.rpc('responder_reto',{p_reto_id:reto.id,p_opcion:opcion});
  if(error) { boton.disabled=false; aviso('challengeStatus','No se pudo responder: '+error.message,true); return; }
  aviso('challengeStatus',data?'🎉 ¡Correcto! Tu respuesta fue registrada.':'Respuesta registrada. ¡Gracias por participar!');
  await cargarRetos();
}
async function salir() { await db.auth.signOut(); mostrarLogin(); }
$('loginBtn').onclick=entrar;
$('showRegisterBtn').onclick=mostrarFormularioRegistro;
$('backToLoginBtn').onclick=mostrarFormularioLogin;
$('registerBtn').onclick=registrarse;
$('loginPassword').addEventListener('keydown',e=>{if(e.key==='Enter') entrar();});
$('loginUsername').addEventListener('keydown',e=>{if(e.key==='Enter') entrar();});
$('registerPassword').addEventListener('keydown',e=>{if(e.key==='Enter') registrarse();});
$('logoutBtn').onclick=salir;
$('start').onclick=iniciarPartida;
$('again').onclick=()=>{$('finish').classList.add('hidden');$('setup').classList.remove('hidden');};
$('createChallenge').onclick=crearReto;
$('refresh').onclick=cargarDatos;
db.auth.onAuthStateChange((_event,session)=>{
  if(session?.user) mostrarApp(session.user); else mostrarLogin();
});
db.auth.getSession().then(({data})=>{
  if(data.session?.user) mostrarApp(data.session.user); else mostrarLogin();
});
