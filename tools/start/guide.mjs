// Start Here: the guided beginner setup (tools/start/).
//
// Pure data and logic, no DOM: app.mjs renders it, tests/guide.test.mjs checks it.
//
// Text markers, so translators never write HTML:
//   **text**   bold
//   [[Label]]  a configurator button or tile, written in ENGLISH. It is shown the way
//              the configurator itself shows it in the chosen language, using the
//              configurator's own translation table, so the guide and the screen
//              always agree. tests/guide.test.mjs checks every label exists in app.js.
//   {name}     a value filled in at render time (escaped).
import { I18N_ROWS, I18N_LANGS } from '../../configurator/src/data/i18n-strings.js';

export const LANGS = I18N_LANGS;
const IDS = LANGS.map(l => l.id);
// Shared with the configurator (same origin): a language picked in one applies to the other.
export const LANG_KEY = 'coreBuildUiLang';

const CONFIG_UI = new Map(I18N_ROWS.map(([en, ...rest]) => [en, Object.fromEntries(IDS.slice(1).map((id, i) => [id, rest[i]]))]));
/** A configurator label as the configurator shows it in `lang` (English when it is not translated there). */
export const uiLabel = (en, lang) => (lang !== 'en' && CONFIG_UI.get(en)?.[lang]) || en;

export function detectLang(navLangs, stored) {
  if (stored && IDS.includes(stored)) return stored;
  for (const l of navLangs || []) {
    const base = String(l || '').toLowerCase().split('-')[0];
    if (IDS.includes(base)) return base;
  }
  return 'en';
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/**
 * Fill {vars}, then turn **bold** and [[Label]] into markup. Works on the raw text
 * and escapes each piece exactly once, so nothing is ever un-escaped.
 */
export function fmt(str, lang, vars = {}) {
  // Values never carry markers of their own.
  const filled = String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]).replace(/\[\[|\]\]|\*\*/g, '') : m));
  return filled.split(/(\[\[.+?\]\]|\*\*.+?\*\*)/).map(part => {
    if (part.startsWith('[[') && part.endsWith(']]')) return `<span class="ui">${esc(uiLabel(part.slice(2, -2), lang))}</span>`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return `<strong>${esc(part.slice(2, -2))}</strong>`;
    return esc(part);
  }).join('');
}
/** Every [[Label]] used in a string. */
export const labelsIn = str => [...String(str).matchAll(/\[\[(.+?)\]\]/g)].map(m => m[1]);

// ---- Strings ----------------------------------------------------------------
// One object per language; every language has every key (tested).
export const STR = {
en: {
  title: 'Start Here', kicker: 'Start here · about 10 minutes',
  intro: 'Never set up an addon before? Answer three questions, then tick each step as you go. Everything below changes to match your answers.',
  step: 'Step', steps46: 'Steps 4–6', forYou: 'For you', tap: 'tap', yourApp: 'your app', done: 'Done',
  progress: '{done} of {total} done', allDone: 'All done 🎉', restart: 'Start over', language: 'Language',
  s1: 'Where will you watch?', s1why: 'Pick the screen you’ll use most.',
  s2: 'Which app?', s2why: 'On {device}, most people use **{rec}**. Already have another? Pick that.', s2lock: 'Pick your device first.',
  getApp: 'Don’t have {app} yet? Get it from **{where}**.',
  s3: 'Do you pay for a streaming service?', s3why: 'It’s where the video files come from. No service is fine too.',
  freeNote: 'You can start free now. Paid debrid services usually start faster and find more; add one later and rebuild in a minute.',
  s4: 'Build your addon', s4why: 'In the configurator. The lit tile is the one to tap.',
  manifestNote: 'When it finishes you get a **manifest URL**. Treat it like a password: never post it when asking for help.',
  s5: 'Add it to {app}', s5whyStremio: 'Your addon is already in your Stremio account.', s5why: 'Last bit of setup.',
  s6: 'Check it works', s6why: 'Search **Breaking Bad**, open Season 1, Episode 1. The best streams are at the top: pick the first, or the next if it doesn’t start.',
  plays: 'It plays', playsSub: 'All done', notQuite: 'Not quite', notQuiteSub: 'Show me the fix',
  doneTitle: 'You’re set up.', doneBody: 'Keep your AIOStreams password and manifest URL safe. When Core Builds improves, reopen the configurator in this browser: an [[Update my setup]] card appears, and {app} picks up the change by itself.',
  lockedTitle: 'Build, add to your app, check it works', lockedWhy: 'Your exact steps appear here once you’ve answered the three questions above.',
  miniApp: 'Quick install · Step 1 · App', miniSvc: 'Quick install · Step 2 · Service', miniPref: 'Quick install · Step 3 · What matters most', miniGo: 'Bottom of Quick install', keyPaste: '{svc} key: paste here',
  footKept: 'Your ticks are kept in this browser.', footDocs: 'Prefer reading? See the written guide.', footOpen: 'Open the configurator',
  d_android: 'Android phone', d_android_n: 'or tablet', d_ios: 'iPhone or iPad', d_ios_n: 'Apple', d_atv: 'Android TV', d_atv_n: 'Google TV, Fire Stick, Shield',
  d_appletv: 'Apple TV', d_appletv_n: 'HD or 4K', d_pc: 'Computer', d_pc_n: 'Windows, Mac, Linux', d_tvother: 'Other smart TV', d_tvother_n: 'If its store has the app',
  a_stremio_n: 'Works almost everywhere', a_nuvio_n: 'iPhone, Apple TV, Android', a_wuplay_n: 'Android TV & Fire Stick', a_chillio_n: 'Uses a ChillLink', a_other: 'Other app', a_other_n: 'Takes Stremio addons',
  a_stremio_g: 'stremio.com, or your device’s app store', a_nuvio_g: 'nuvio.app, the App Store or Google Play', a_wuplay_g: 'Downloader code 5781040', a_chillio_g: 'Chillio’s own site or store page',
  v_torbox_n: 'Debrid · fast cache', v_rd_n: 'Debrid · large library', v_ad_n: 'Debrid · uncached-friendly', v_pm_n: 'Debrid · generous quota', v_en_n: 'Usenet', v_free: 'None yet', v_free_n: 'Start free, add one later',
  b_open_tv: 'On your phone or computer, open **{url}** and tap [[Quick install]].', b_open_tv_s: 'Setting up on a phone or computer is far easier than with a remote. The TV gets it at the end.',
  b_open: 'Open **{url}** and tap [[Quick install]].', b_open_s: 'The configurator shows in English, Español, Português, Français or Deutsch; switch with the button at the top right.',
  b_app: 'In **Step 1**, tap [[{appLabel}]].', b_app_stremio_s: 'Keep [[Direct Install]] selected at the top.',
  b_free: 'In **Step 2**, tap [[Free / P2P]]. No key needed.', b_free_s: 'Leave AIOStreams host on [[Auto]].',
  b_svc: 'In **Step 2**, tap **{svc}**.', b_key: 'Tap [[Get key ↗]], copy the key from {svc}’s page, come back and paste it in.', b_key_s: 'The whole key, with no space at either end. Leave AIOStreams host on [[Auto]].',
  b_en: 'In **Step 2**, fill in your **EasyNews username and password**: the ones you sign in to easynews.com with.', b_en_s: 'Leave AIOStreams host on [[Auto]].', miniUser: '{svc} username', miniPass: '{svc} password',
  chillFree: 'Chillio can’t play free P2P (torrent) streams, so this setup would find nothing. Pick a paid service above, or choose Stremio or Nuvio as your app.',
  b_pref: 'In **Step 3**, leave [[Balanced]] selected and skip [[Options & defaults]].', b_pref_s: 'Slow internet? Pick [[Fast]]. Fast internet and a 4K TV? [[Maximum]].',
  b_login: 'Fill in your **Stremio email and password** in Step 1.', b_login_s: 'Used only to sign in to Stremio for this install. No account yet? Make a free one at stremio.com.',
  b_go: 'Tap [[Install in ~30 seconds]].', b_pw: 'In [[Set a Password]], keep [[Auto-generate]], **save the password** somewhere safe, then tap [[Continue →]].', b_pw_s: 'You need it to update your setup later. Nobody can recover it.',
  ad_st_tv: 'Install **Stremio** on the TV and sign in with **the same account**.', ad_st_tv_s: 'Addons follow your account: nothing to type with the remote.',
  ad_st_seen: 'Open **Addons** and check Core Builds is listed.', ad_st_seen_s: 'Already open? Close and reopen Stremio.',
  ad_nv_open: 'Open Nuvio → **Account → Addons** (or **Settings → Add-ons**).', ad_nv_paste: 'Paste the manifest URL (already copied) and confirm.',
  ad_nv_paste_tv: 'Paste or type the manifest URL on the TV and confirm.', ad_nv_paste_tv_s: 'Keep the link open on your phone to read from.',
  ad_wu_cfg: 'On the TV, open WuPlay → **Settings → Configuration**. Note the **Profile Key**.', ad_wu_cfg_s: 'A lost Profile Key can’t be recovered.',
  ad_wu_scan: 'Scan the QR code with your phone, paste the manifest URL under **Add-ons** and save.', ad_wu_scan_s: 'It reaches the TV by itself.',
  ad_wu_phone: 'Open WuPlay → **Addons** → **Add Addon**, paste the link.',
  ad_ch: 'In Chillio: **Settings → Manage Account → Add Account → ChillLink Protocol**, paste, **Save**.', ad_ch_s: 'The ChillLink URL is already copied.',
  ad_ot: 'Copy the manifest URL, then in your app find **Addons** or **Install from URL**, paste and confirm.', ad_ot_s: 'Asked for a “manifest” or “addon URL”? It’s this link.',
  f_none: 'No streams at all', f_none_x: 'Check the whole key is pasted with no spaces and your subscription is active, then tap Install again. Free / P2P can be thin on rare titles.',
  f_install: 'The addon won’t install', f_install_x: 'Copy the link again from the configurator and paste it fresh. It must end in manifest.json.',
  f_play: 'Streams show but won’t play', f_play_x: 'Try the next one down. If most fail on a TV, open [[Options & defaults]], set [[Device]] to your TV or stick, and install again.',
  f_buffer: 'Everything buffers', f_buffer_x: 'Install again with [[Fast]] selected, or type your internet speed under [[Options & defaults]] → [[Connection speed]].',
},
es: {
  title: 'Empieza aquí', kicker: 'Empieza aquí · unos 10 minutos',
  intro: '¿Nunca has configurado un complemento? Responde tres preguntas y marca cada paso a medida que avanzas. Todo lo de abajo se adapta a tus respuestas.',
  step: 'Paso', steps46: 'Pasos 4–6', forYou: 'Para ti', tap: 'toca', yourApp: 'tu app', done: 'Hecho',
  progress: '{done} de {total} hechos', allDone: 'Todo listo 🎉', restart: 'Empezar de nuevo', language: 'Idioma',
  s1: '¿Dónde vas a ver?', s1why: 'Elige la pantalla que más vas a usar.',
  s2: '¿Qué app?', s2why: 'En {device}, la mayoría usa **{rec}**. ¿Ya tienes otra? Elígela.', s2lock: 'Primero elige tu dispositivo.',
  getApp: '¿Aún no tienes {app}? Descárgala desde **{where}**.',
  s3: '¿Pagas un servicio de streaming?', s3why: 'Es de donde salen los archivos de vídeo. No tener ninguno también vale.',
  freeNote: 'Puedes empezar gratis ahora. Los servicios debrid de pago suelen arrancar más rápido y encontrar más; añade uno después y vuelve a crear en un minuto.',
  s4: 'Crea tu complemento', s4why: 'En el configurador. La opción iluminada es la que debes tocar.',
  manifestNote: 'Al terminar obtienes una **URL de manifiesto**. Trátala como una contraseña: nunca la publiques al pedir ayuda.',
  s5: 'Añádelo a {app}', s5whyStremio: 'Tu complemento ya está en tu cuenta de Stremio.', s5why: 'Último paso de la configuración.',
  s6: 'Comprueba que funciona', s6why: 'Busca **Breaking Bad** y abre la temporada 1, episodio 1. Los mejores streams están arriba: elige el primero, o el siguiente si no arranca.',
  plays: 'Se reproduce', playsSub: 'Todo listo', notQuite: 'No del todo', notQuiteSub: 'Muéstrame la solución',
  doneTitle: '¡Ya está todo listo!', doneBody: 'Guarda bien tu contraseña de AIOStreams y la URL de manifiesto. Cuando Core Builds mejore, vuelve a abrir el configurador en este navegador: aparecerá la tarjeta [[Update my setup]] y {app} recibirá el cambio por sí sola.',
  lockedTitle: 'Crear, añadir a tu app, comprobar', lockedWhy: 'Tus pasos exactos aparecen aquí cuando respondas las tres preguntas de arriba.',
  miniApp: 'Instalación rápida · Paso 1 · App', miniSvc: 'Instalación rápida · Paso 2 · Servicio', miniPref: 'Instalación rápida · Paso 3 · Qué es lo más importante', miniGo: 'Final de la instalación rápida', keyPaste: 'Clave de {svc}: pégala aquí',
  footKept: 'Tus marcas se guardan en este navegador.', footDocs: '¿Prefieres leer? Consulta la guía escrita.', footOpen: 'Abrir el configurador',
  d_android: 'Móvil Android', d_android_n: 'o tableta', d_ios: 'iPhone o iPad', d_ios_n: 'Apple', d_atv: 'Android TV', d_atv_n: 'Google TV, Fire Stick, Shield',
  d_appletv: 'Apple TV', d_appletv_n: 'HD o 4K', d_pc: 'Ordenador', d_pc_n: 'Windows, Mac, Linux', d_tvother: 'Otra smart TV', d_tvother_n: 'Si su tienda tiene la app',
  a_stremio_n: 'Funciona casi en todas partes', a_nuvio_n: 'iPhone, Apple TV, Android', a_wuplay_n: 'Android TV y Fire Stick', a_chillio_n: 'Usa un ChillLink', a_other: 'Otra app', a_other_n: 'Acepta complementos de Stremio',
  a_stremio_g: 'stremio.com o la tienda de apps de tu dispositivo', a_nuvio_g: 'nuvio.app, App Store o Google Play', a_wuplay_g: 'el código de Downloader 5781040', a_chillio_g: 'la web o tienda oficial de Chillio',
  v_torbox_n: 'Debrid · caché rápida', v_rd_n: 'Debrid · biblioteca grande', v_ad_n: 'Debrid · bueno sin caché', v_pm_n: 'Debrid · cuota generosa', v_en_n: 'Usenet', v_free: 'Ninguno aún', v_free_n: 'Empieza gratis, añade uno después',
  b_open_tv: 'En tu móvil u ordenador, abre **{url}** y toca [[Quick install]].', b_open_tv_s: 'Configurarlo en el móvil o el ordenador es mucho más fácil que con el mando. La TV lo recibe al final.',
  b_open: 'Abre **{url}** y toca [[Quick install]].', b_open_s: 'El configurador está en English, Español, Português, Français o Deutsch; cámbialo con el botón de arriba a la derecha.',
  b_app: 'En el **Paso 1**, toca [[{appLabel}]].', b_app_stremio_s: 'Deja [[Direct Install]] seleccionado arriba.',
  b_free: 'En el **Paso 2**, toca [[Free / P2P]]. No hace falta clave.', b_free_s: 'Deja el host de AIOStreams en [[Auto]].',
  b_svc: 'En el **Paso 2**, toca **{svc}**.', b_key: 'Toca [[Get key ↗]], copia la clave de la página de {svc}, vuelve y pégala.', b_key_s: 'La clave completa, sin espacios al principio ni al final. Deja el host de AIOStreams en [[Auto]].',
  b_en: 'En el **Paso 2**, escribe tu **usuario y contraseña de EasyNews**: los mismos con los que entras en easynews.com.', b_en_s: 'Deja el host de AIOStreams en [[Auto]].', miniUser: 'Usuario de {svc}', miniPass: 'Contraseña de {svc}',
  chillFree: 'Chillio no puede reproducir streams P2P (torrent) gratuitos, así que esta configuración no encontraría nada. Elige arriba un servicio de pago, o usa Stremio o Nuvio como app.',
  b_pref: 'En el **Paso 3**, deja [[Balanced]] y no abras [[Options & defaults]].', b_pref_s: '¿Internet lento? Elige [[Fast]]. ¿Internet rápido y TV 4K? [[Maximum]].',
  b_login: 'Escribe tu **correo y contraseña de Stremio** en el Paso 1.', b_login_s: 'Solo se usan para iniciar sesión en Stremio durante esta instalación. ¿Sin cuenta? Crea una gratis en stremio.com.',
  b_go: 'Toca [[Install in ~30 seconds]].', b_pw: 'En [[Set a Password]], deja [[Auto-generate]], **guarda la contraseña** en un lugar seguro y toca [[Continue →]].', b_pw_s: 'La necesitarás para actualizar tu configuración. Nadie puede recuperarla.',
  ad_st_tv: 'Instala **Stremio** en la TV e inicia sesión con **la misma cuenta**.', ad_st_tv_s: 'Los complementos siguen a tu cuenta: no hay que escribir nada con el mando.',
  ad_st_seen: 'Abre **Addons** y comprueba que aparece Core Builds.', ad_st_seen_s: '¿Ya estaba abierto? Cierra y vuelve a abrir Stremio.',
  ad_nv_open: 'Abre Nuvio → **Account → Addons** (o **Settings → Add-ons**).', ad_nv_paste: 'Pega la URL de manifiesto (ya copiada) y confirma.',
  ad_nv_paste_tv: 'Pega o escribe la URL de manifiesto en la TV y confirma.', ad_nv_paste_tv_s: 'Ten el enlace abierto en tu móvil para leerlo.',
  ad_wu_cfg: 'En la TV, abre WuPlay → **Settings → Configuration**. Apunta la **Profile Key**.', ad_wu_cfg_s: 'Una Profile Key perdida no se puede recuperar.',
  ad_wu_scan: 'Escanea el código QR con tu móvil, pega la URL de manifiesto en **Add-ons** y guarda.', ad_wu_scan_s: 'Llega a la TV por sí sola.',
  ad_wu_phone: 'Abre WuPlay → **Addons** → **Add Addon** y pega el enlace.',
  ad_ch: 'En Chillio: **Settings → Manage Account → Add Account → ChillLink Protocol**, pega y **Save**.', ad_ch_s: 'La URL ChillLink ya está copiada.',
  ad_ot: 'Copia la URL de manifiesto y, en tu app, busca **Addons** o **Install from URL**; pega y confirma.', ad_ot_s: '¿Te pide un «manifest» o «addon URL»? Es este enlace.',
  f_none: 'No aparece ningún stream', f_none_x: 'Comprueba que pegaste la clave completa sin espacios y que tu suscripción está activa; luego vuelve a instalar. Free / P2P puede tener pocos resultados en títulos raros.',
  f_install: 'El complemento no se instala', f_install_x: 'Copia de nuevo el enlace desde el configurador y pégalo otra vez. Debe terminar en manifest.json.',
  f_play: 'Aparecen streams pero no se reproducen', f_play_x: 'Prueba el siguiente. Si fallan casi todos en una TV, abre [[Options & defaults]], pon [[Device]] en tu TV o stick e instala de nuevo.',
  f_buffer: 'Todo se queda cargando', f_buffer_x: 'Vuelve a instalar con [[Fast]], o escribe la velocidad de tu internet en [[Options & defaults]] → [[Connection speed]].',
},
pt: {
  title: 'Comece aqui', kicker: 'Comece aqui · uns 10 minutos',
  intro: 'Nunca configurou um addon? Responda três perguntas e marque cada passo conforme avança. Tudo abaixo se ajusta às suas respostas.',
  step: 'Passo', steps46: 'Passos 4–6', forYou: 'Para você', tap: 'toque', yourApp: 'seu app', done: 'Feito',
  progress: '{done} de {total} feitos', allDone: 'Tudo pronto 🎉', restart: 'Recomeçar', language: 'Idioma',
  s1: 'Onde você vai assistir?', s1why: 'Escolha a tela que você mais vai usar.',
  s2: 'Qual app?', s2why: 'Em {device}, a maioria usa **{rec}**. Já tem outro? Escolha esse.', s2lock: 'Escolha seu dispositivo primeiro.',
  getApp: 'Ainda não tem o {app}? Baixe em **{where}**.',
  s3: 'Você paga algum serviço de streaming?', s3why: 'É de onde vêm os arquivos de vídeo. Não ter nenhum também serve.',
  freeNote: 'Você pode começar grátis agora. Serviços debrid pagos costumam começar mais rápido e achar mais; adicione um depois e recrie em um minuto.',
  s4: 'Crie seu addon', s4why: 'No configurador. A opção acesa é a que você deve tocar.',
  manifestNote: 'No final você recebe uma **URL de manifesto**. Trate como uma senha: nunca publique ao pedir ajuda.',
  s5: 'Adicione ao {app}', s5whyStremio: 'Seu addon já está na sua conta do Stremio.', s5why: 'Última parte da configuração.',
  s6: 'Veja se funciona', s6why: 'Pesquise **Breaking Bad** e abra a temporada 1, episódio 1. Os melhores streams ficam no topo: escolha o primeiro, ou o próximo se não começar.',
  plays: 'Está tocando', playsSub: 'Tudo pronto', notQuite: 'Ainda não', notQuiteSub: 'Mostre a solução',
  doneTitle: 'Tudo configurado!', doneBody: 'Guarde bem sua senha do AIOStreams e a URL de manifesto. Quando o Core Builds melhorar, abra o configurador de novo neste navegador: aparece o cartão [[Update my setup]] e o {app} recebe a mudança sozinho.',
  lockedTitle: 'Criar, adicionar ao app, testar', lockedWhy: 'Seus passos exatos aparecem aqui depois que você responder às três perguntas acima.',
  miniApp: 'Instalação rápida · Passo 1 · App', miniSvc: 'Instalação rápida · Passo 2 · Serviço', miniPref: 'Instalação rápida · Passo 3 · O que importa mais', miniGo: 'Final da instalação rápida', keyPaste: 'Chave do {svc}: cole aqui',
  footKept: 'Suas marcações ficam salvas neste navegador.', footDocs: 'Prefere ler? Veja o guia escrito.', footOpen: 'Abrir o configurador',
  d_android: 'Celular Android', d_android_n: 'ou tablet', d_ios: 'iPhone ou iPad', d_ios_n: 'Apple', d_atv: 'Android TV', d_atv_n: 'Google TV, Fire Stick, Shield',
  d_appletv: 'Apple TV', d_appletv_n: 'HD ou 4K', d_pc: 'Computador', d_pc_n: 'Windows, Mac, Linux', d_tvother: 'Outra smart TV', d_tvother_n: 'Se a loja dela tiver o app',
  a_stremio_n: 'Funciona em quase tudo', a_nuvio_n: 'iPhone, Apple TV, Android', a_wuplay_n: 'Android TV e Fire Stick', a_chillio_n: 'Usa um ChillLink', a_other: 'Outro app', a_other_n: 'Aceita addons do Stremio',
  a_stremio_g: 'stremio.com ou a loja de apps do seu aparelho', a_nuvio_g: 'nuvio.app, App Store ou Google Play', a_wuplay_g: 'o código do Downloader 5781040', a_chillio_g: 'o site ou a loja oficial do Chillio',
  v_torbox_n: 'Debrid · cache rápido', v_rd_n: 'Debrid · biblioteca grande', v_ad_n: 'Debrid · bom sem cache', v_pm_n: 'Debrid · cota generosa', v_en_n: 'Usenet', v_free: 'Nenhum ainda', v_free_n: 'Comece grátis, adicione depois',
  b_open_tv: 'No celular ou computador, abra **{url}** e toque em [[Quick install]].', b_open_tv_s: 'Configurar no celular ou computador é bem mais fácil que com o controle. A TV recebe no final.',
  b_open: 'Abra **{url}** e toque em [[Quick install]].', b_open_s: 'O configurador aparece em English, Español, Português, Français ou Deutsch; troque pelo botão no canto superior direito.',
  b_app: 'No **Passo 1**, toque em [[{appLabel}]].', b_app_stremio_s: 'Deixe [[Direct Install]] selecionado no topo.',
  b_free: 'No **Passo 2**, toque em [[Free / P2P]]. Não precisa de chave.', b_free_s: 'Deixe o host do AIOStreams em [[Auto]].',
  b_svc: 'No **Passo 2**, toque em **{svc}**.', b_key: 'Toque em [[Get key ↗]], copie a chave na página do {svc}, volte e cole.', b_key_s: 'A chave inteira, sem espaço no começo ou no fim. Deixe o host do AIOStreams em [[Auto]].',
  b_en: 'No **Passo 2**, preencha seu **usuário e senha do EasyNews**: os mesmos com que você entra no easynews.com.', b_en_s: 'Deixe o host do AIOStreams em [[Auto]].', miniUser: 'Usuário do {svc}', miniPass: 'Senha do {svc}',
  chillFree: 'O Chillio não reproduz streams P2P (torrent) gratuitos, então esta configuração não acharia nada. Escolha acima um serviço pago, ou use o Stremio ou o Nuvio como app.',
  b_pref: 'No **Passo 3**, deixe [[Balanced]] e não abra [[Options & defaults]].', b_pref_s: 'Internet lenta? Escolha [[Fast]]. Internet rápida e TV 4K? [[Maximum]].',
  b_login: 'Preencha seu **e-mail e senha do Stremio** no Passo 1.', b_login_s: 'Usados só para entrar no Stremio nesta instalação. Sem conta? Crie uma grátis em stremio.com.',
  b_go: 'Toque em [[Install in ~30 seconds]].', b_pw: 'Em [[Set a Password]], deixe [[Auto-generate]], **salve a senha** num lugar seguro e toque em [[Continue →]].', b_pw_s: 'Você vai precisar dela para atualizar depois. Ninguém consegue recuperá-la.',
  ad_st_tv: 'Instale o **Stremio** na TV e entre com **a mesma conta**.', ad_st_tv_s: 'Os addons acompanham sua conta: nada para digitar com o controle.',
  ad_st_seen: 'Abra **Addons** e confira se o Core Builds aparece.', ad_st_seen_s: 'Já estava aberto? Feche e abra o Stremio de novo.',
  ad_nv_open: 'Abra o Nuvio → **Account → Addons** (ou **Settings → Add-ons**).', ad_nv_paste: 'Cole a URL de manifesto (já copiada) e confirme.',
  ad_nv_paste_tv: 'Cole ou digite a URL de manifesto na TV e confirme.', ad_nv_paste_tv_s: 'Deixe o link aberto no celular para ir lendo.',
  ad_wu_cfg: 'Na TV, abra o WuPlay → **Settings → Configuration**. Anote a **Profile Key**.', ad_wu_cfg_s: 'Uma Profile Key perdida não pode ser recuperada.',
  ad_wu_scan: 'Escaneie o QR code com o celular, cole a URL de manifesto em **Add-ons** e salve.', ad_wu_scan_s: 'Ela chega na TV sozinha.',
  ad_wu_phone: 'Abra o WuPlay → **Addons** → **Add Addon** e cole o link.',
  ad_ch: 'No Chillio: **Settings → Manage Account → Add Account → ChillLink Protocol**, cole e **Save**.', ad_ch_s: 'A URL ChillLink já está copiada.',
  ad_ot: 'Copie a URL de manifesto e, no seu app, procure **Addons** ou **Install from URL**; cole e confirme.', ad_ot_s: 'Pediu um “manifest” ou “addon URL”? É este link.',
  f_none: 'Nenhum stream aparece', f_none_x: 'Confira se a chave foi colada inteira, sem espaços, e se sua assinatura está ativa; depois instale de novo. Free / P2P pode ter poucos resultados em títulos raros.',
  f_install: 'O addon não instala', f_install_x: 'Copie o link de novo no configurador e cole outra vez. Ele precisa terminar em manifest.json.',
  f_play: 'Os streams aparecem mas não tocam', f_play_x: 'Tente o próximo. Se quase todos falharem numa TV, abra [[Options & defaults]], coloque [[Device]] na sua TV ou stick e instale de novo.',
  f_buffer: 'Tudo fica carregando', f_buffer_x: 'Instale de novo com [[Fast]], ou digite a velocidade da sua internet em [[Options & defaults]] → [[Connection speed]].',
},
fr: {
  title: 'Commencer ici', kicker: 'Commencer ici · environ 10 minutes',
  intro: 'Jamais installé d’addon ? Répondez à trois questions, puis cochez chaque étape au fur et à mesure. Tout ce qui suit s’adapte à vos réponses.',
  step: 'Étape', steps46: 'Étapes 4–6', forYou: 'Pour vous', tap: 'ici', yourApp: 'votre appli', done: 'Fait',
  progress: '{done} sur {total} faits', allDone: 'Terminé 🎉', restart: 'Recommencer', language: 'Langue',
  s1: 'Où allez-vous regarder ?', s1why: 'Choisissez l’écran que vous utiliserez le plus.',
  s2: 'Quelle appli ?', s2why: 'Sur {device}, la plupart des gens utilisent **{rec}**. Vous en avez déjà une autre ? Choisissez-la.', s2lock: 'Choisissez d’abord votre appareil.',
  getApp: 'Pas encore {app} ? Téléchargez-la sur **{where}**.',
  s3: 'Payez-vous un service de streaming ?', s3why: 'C’est de là que viennent les fichiers vidéo. Aucun service, c’est possible aussi.',
  freeNote: 'Vous pouvez commencer gratuitement tout de suite. Les services debrid payants démarrent en général plus vite et trouvent plus ; ajoutez-en un plus tard et refaites le build en une minute.',
  s4: 'Créez votre addon', s4why: 'Dans le configurateur. La case allumée est celle à toucher.',
  manifestNote: 'À la fin, vous obtenez une **URL de manifeste**. Traitez-la comme un mot de passe : ne la publiez jamais en demandant de l’aide.',
  s5: 'Ajoutez-le à {app}', s5whyStremio: 'Votre addon est déjà dans votre compte Stremio.', s5why: 'Dernière étape de configuration.',
  s6: 'Vérifiez que ça marche', s6why: 'Cherchez **Breaking Bad**, ouvrez la saison 1, épisode 1. Les meilleurs flux sont en haut : prenez le premier, ou le suivant s’il ne démarre pas.',
  plays: 'Ça marche', playsSub: 'Terminé', notQuite: 'Pas tout à fait', notQuiteSub: 'Voir la solution',
  doneTitle: 'C’est installé !', doneBody: 'Gardez précieusement votre mot de passe AIOStreams et votre URL de manifeste. Quand Core Builds s’améliore, rouvrez le configurateur dans ce navigateur : une carte [[Update my setup]] apparaît, et {app} reçoit le changement toute seule.',
  lockedTitle: 'Créer, ajouter à l’appli, vérifier', lockedWhy: 'Vos étapes exactes apparaissent ici une fois les trois questions ci-dessus répondues.',
  miniApp: 'Installation rapide · Étape 1 · Appli', miniSvc: 'Installation rapide · Étape 2 · Service', miniPref: 'Installation rapide · Étape 3 · Ce qui compte le plus', miniGo: 'Bas de l’installation rapide', keyPaste: 'Clé {svc} : collez-la ici',
  footKept: 'Vos coches sont gardées dans ce navigateur.', footDocs: 'Vous préférez lire ? Voir le guide écrit.', footOpen: 'Ouvrir le configurateur',
  d_android: 'Téléphone Android', d_android_n: 'ou tablette', d_ios: 'iPhone ou iPad', d_ios_n: 'Apple', d_atv: 'Android TV', d_atv_n: 'Google TV, Fire Stick, Shield',
  d_appletv: 'Apple TV', d_appletv_n: 'HD ou 4K', d_pc: 'Ordinateur', d_pc_n: 'Windows, Mac, Linux', d_tvother: 'Autre smart TV', d_tvother_n: 'Si sa boutique a l’appli',
  a_stremio_n: 'Marche presque partout', a_nuvio_n: 'iPhone, Apple TV, Android', a_wuplay_n: 'Android TV et Fire Stick', a_chillio_n: 'Utilise un ChillLink', a_other: 'Autre appli', a_other_n: 'Accepte les addons Stremio',
  a_stremio_g: 'stremio.com ou la boutique d’applis de votre appareil', a_nuvio_g: 'nuvio.app, l’App Store ou Google Play', a_wuplay_g: 'le code Downloader 5781040', a_chillio_g: 'le site ou la boutique officielle de Chillio',
  v_torbox_n: 'Debrid · cache rapide', v_rd_n: 'Debrid · grande bibliothèque', v_ad_n: 'Debrid · adapté au non-caché', v_pm_n: 'Debrid · quota généreux', v_en_n: 'Usenet', v_free: 'Aucun pour l’instant', v_free_n: 'Gratuit d’abord, un service plus tard',
  b_open_tv: 'Sur votre téléphone ou ordinateur, ouvrez **{url}** et touchez [[Quick install]].', b_open_tv_s: 'Tout régler sur un téléphone ou un ordinateur est bien plus simple qu’avec une télécommande. La TV le reçoit à la fin.',
  b_open: 'Ouvrez **{url}** et touchez [[Quick install]].', b_open_s: 'Le configurateur existe en English, Español, Português, Français et Deutsch ; changez avec le bouton en haut à droite.',
  b_app: 'À l’**étape 1**, touchez [[{appLabel}]].', b_app_stremio_s: 'Laissez [[Direct Install]] sélectionné en haut.',
  b_free: 'À l’**étape 2**, touchez [[Free / P2P]]. Pas de clé.', b_free_s: 'Laissez l’hôte AIOStreams sur [[Auto]].',
  b_svc: 'À l’**étape 2**, touchez **{svc}**.', b_key: 'Touchez [[Get key ↗]], copiez la clé sur la page de {svc}, revenez et collez-la.', b_key_s: 'La clé entière, sans espace au début ni à la fin. Laissez l’hôte AIOStreams sur [[Auto]].',
  b_en: 'À l’**étape 2**, saisissez votre **identifiant et mot de passe EasyNews** : ceux de votre connexion à easynews.com.', b_en_s: 'Laissez l’hôte AIOStreams sur [[Auto]].', miniUser: 'Identifiant {svc}', miniPass: 'Mot de passe {svc}',
  chillFree: 'Chillio ne peut pas lire les flux P2P (torrent) gratuits : cette configuration ne trouverait rien. Choisissez un service payant ci-dessus, ou Stremio ou Nuvio comme appli.',
  b_pref: 'À l’**étape 3**, laissez [[Balanced]] et n’ouvrez pas [[Options & defaults]].', b_pref_s: 'Connexion lente ? Prenez [[Fast]]. Connexion rapide et TV 4K ? [[Maximum]].',
  b_login: 'Saisissez votre **e-mail et mot de passe Stremio** à l’étape 1.', b_login_s: 'Ils servent uniquement à vous connecter à Stremio pour cette installation. Pas de compte ? Créez-en un gratuit sur stremio.com.',
  b_go: 'Touchez [[Install in ~30 seconds]].', b_pw: 'Dans [[Set a Password]], gardez [[Auto-generate]], **enregistrez le mot de passe** en lieu sûr, puis touchez [[Continue →]].', b_pw_s: 'Il vous faudra pour mettre à jour plus tard. Personne ne peut le récupérer.',
  ad_st_tv: 'Installez **Stremio** sur la TV et connectez-vous avec **le même compte**.', ad_st_tv_s: 'Les addons suivent votre compte : rien à taper avec la télécommande.',
  ad_st_seen: 'Ouvrez **Addons** et vérifiez que Core Builds y figure.', ad_st_seen_s: 'Déjà ouvert ? Fermez et rouvrez Stremio.',
  ad_nv_open: 'Ouvrez Nuvio → **Account → Addons** (ou **Settings → Add-ons**).', ad_nv_paste: 'Collez l’URL de manifeste (déjà copiée) et confirmez.',
  ad_nv_paste_tv: 'Collez ou tapez l’URL de manifeste sur la TV et confirmez.', ad_nv_paste_tv_s: 'Gardez le lien ouvert sur votre téléphone pour le lire.',
  ad_wu_cfg: 'Sur la TV, ouvrez WuPlay → **Settings → Configuration**. Notez la **Profile Key**.', ad_wu_cfg_s: 'Une Profile Key perdue ne se récupère pas.',
  ad_wu_scan: 'Scannez le QR code avec votre téléphone, collez l’URL de manifeste dans **Add-ons** et enregistrez.', ad_wu_scan_s: 'Elle arrive sur la TV toute seule.',
  ad_wu_phone: 'Ouvrez WuPlay → **Addons** → **Add Addon**, collez le lien.',
  ad_ch: 'Dans Chillio : **Settings → Manage Account → Add Account → ChillLink Protocol**, collez, **Save**.', ad_ch_s: 'L’URL ChillLink est déjà copiée.',
  ad_ot: 'Copiez l’URL de manifeste, puis dans votre appli cherchez **Addons** ou **Install from URL**, collez et confirmez.', ad_ot_s: 'On vous demande un « manifest » ou une « addon URL » ? C’est ce lien.',
  f_none: 'Aucun flux', f_none_x: 'Vérifiez que la clé est collée en entier, sans espace, et que votre abonnement est actif, puis réinstallez. Free / P2P peut être maigre sur les titres rares.',
  f_install: 'L’addon ne s’installe pas', f_install_x: 'Recopiez le lien depuis le configurateur et recollez-le. Il doit se terminer par manifest.json.',
  f_play: 'Les flux s’affichent mais ne se lancent pas', f_play_x: 'Essayez le suivant. Si presque tous échouent sur une TV, ouvrez [[Options & defaults]], réglez [[Device]] sur votre TV ou clé, et réinstallez.',
  f_buffer: 'Tout met du temps à charger', f_buffer_x: 'Réinstallez avec [[Fast]], ou tapez votre débit dans [[Options & defaults]] → [[Connection speed]].',
},
de: {
  title: 'Hier starten', kicker: 'Hier starten · etwa 10 Minuten',
  intro: 'Noch nie ein Addon eingerichtet? Beantworte drei Fragen und hake jeden Schritt ab. Alles darunter passt sich deinen Antworten an.',
  step: 'Schritt', steps46: 'Schritte 4–6', forYou: 'Für dich', tap: 'tippen', yourApp: 'deine App', done: 'Fertig',
  progress: '{done} von {total} erledigt', allDone: 'Alles erledigt 🎉', restart: 'Neu beginnen', language: 'Sprache',
  s1: 'Wo schaust du?', s1why: 'Wähle den Bildschirm, den du am meisten nutzt.',
  s2: 'Welche App?', s2why: 'Auf {device} nutzen die meisten **{rec}**. Schon eine andere? Dann wähle die.', s2lock: 'Wähle zuerst dein Gerät.',
  getApp: '{app} noch nicht installiert? Hol sie dir über **{where}**.',
  s3: 'Zahlst du für einen Streaming-Dienst?', s3why: 'Von dort kommen die Videodateien. Ohne Dienst geht es auch.',
  freeNote: 'Du kannst jetzt kostenlos starten. Bezahlte Debrid-Dienste starten meist schneller und finden mehr; füge später einen hinzu und erstelle in einer Minute neu.',
  s4: 'Dein Addon erstellen', s4why: 'Im Konfigurator. Die leuchtende Kachel ist die, die du antippst.',
  manifestNote: 'Am Ende bekommst du eine **Manifest-URL**. Behandle sie wie ein Passwort: Poste sie nie, wenn du um Hilfe bittest.',
  s5: 'Zu {app} hinzufügen', s5whyStremio: 'Dein Addon ist schon in deinem Stremio-Konto.', s5why: 'Letzter Schritt der Einrichtung.',
  s6: 'Prüfen, ob es läuft', s6why: 'Suche **Breaking Bad**, öffne Staffel 1, Folge 1. Die besten Streams stehen oben: Nimm den ersten oder den nächsten, falls er nicht startet.',
  plays: 'Es läuft', playsSub: 'Alles erledigt', notQuite: 'Noch nicht ganz', notQuiteSub: 'Lösung zeigen',
  doneTitle: 'Alles eingerichtet!', doneBody: 'Bewahre dein AIOStreams-Passwort und die Manifest-URL sicher auf. Wenn Core Builds besser wird, öffne den Konfigurator wieder in diesem Browser: Eine [[Update my setup]]-Karte erscheint, und {app} übernimmt die Änderung von selbst.',
  lockedTitle: 'Erstellen, zur App hinzufügen, prüfen', lockedWhy: 'Deine genauen Schritte erscheinen hier, sobald du die drei Fragen oben beantwortet hast.',
  miniApp: 'Schnellinstallation · Schritt 1 · App', miniSvc: 'Schnellinstallation · Schritt 2 · Dienst', miniPref: 'Schnellinstallation · Schritt 3 · Was am wichtigsten ist', miniGo: 'Ende der Schnellinstallation', keyPaste: '{svc}-Schlüssel hier einfügen',
  footKept: 'Deine Haken werden in diesem Browser gespeichert.', footDocs: 'Lieber lesen? Zur schriftlichen Anleitung.', footOpen: 'Konfigurator öffnen',
  d_android: 'Android-Handy', d_android_n: 'oder Tablet', d_ios: 'iPhone oder iPad', d_ios_n: 'Apple', d_atv: 'Android TV', d_atv_n: 'Google TV, Fire Stick, Shield',
  d_appletv: 'Apple TV', d_appletv_n: 'HD oder 4K', d_pc: 'Computer', d_pc_n: 'Windows, Mac, Linux', d_tvother: 'Anderer Smart-TV', d_tvother_n: 'Wenn sein Store die App hat',
  a_stremio_n: 'Läuft fast überall', a_nuvio_n: 'iPhone, Apple TV, Android', a_wuplay_n: 'Android TV & Fire Stick', a_chillio_n: 'Nutzt einen ChillLink', a_other: 'Andere App', a_other_n: 'Nimmt Stremio-Addons',
  a_stremio_g: 'stremio.com oder den App-Store deines Geräts', a_nuvio_g: 'nuvio.app, den App Store oder Google Play', a_wuplay_g: 'den Downloader-Code 5781040', a_chillio_g: 'die offizielle Seite oder den Store von Chillio',
  v_torbox_n: 'Debrid · schneller Cache', v_rd_n: 'Debrid · große Bibliothek', v_ad_n: 'Debrid · gut für Ungecachtes', v_pm_n: 'Debrid · großzügiges Kontingent', v_en_n: 'Usenet', v_free: 'Noch keinen', v_free_n: 'Kostenlos starten, später einen dazu',
  b_open_tv: 'Öffne auf Handy oder Computer **{url}** und tippe auf [[Quick install]].', b_open_tv_s: 'Am Handy oder Computer geht die Einrichtung viel leichter als mit der Fernbedienung. Der Fernseher bekommt es am Ende.',
  b_open: 'Öffne **{url}** und tippe auf [[Quick install]].', b_open_s: 'Den Konfigurator gibt es auf English, Español, Português, Français und Deutsch; umschalten mit dem Button oben rechts.',
  b_app: 'Tippe in **Schritt 1** auf [[{appLabel}]].', b_app_stremio_s: 'Lass oben [[Direct Install]] ausgewählt.',
  b_free: 'Tippe in **Schritt 2** auf [[Free / P2P]]. Kein Schlüssel nötig.', b_free_s: 'Lass den AIOStreams-Host auf [[Auto]].',
  b_svc: 'Tippe in **Schritt 2** auf **{svc}**.', b_key: 'Tippe auf [[Get key ↗]], kopiere den Schlüssel von der {svc}-Seite, komm zurück und füge ihn ein.', b_key_s: 'Den ganzen Schlüssel, ohne Leerzeichen am Anfang oder Ende. Lass den AIOStreams-Host auf [[Auto]].',
  b_en: 'Gib in **Schritt 2** deinen **EasyNews-Benutzernamen und dein Passwort** ein: dieselben wie beim Login auf easynews.com.', b_en_s: 'Lass den AIOStreams-Host auf [[Auto]].', miniUser: '{svc}-Benutzername', miniPass: '{svc}-Passwort',
  chillFree: 'Chillio kann keine kostenlosen P2P-Streams (Torrents) abspielen, dieses Setup fände also nichts. Wähle oben einen bezahlten Dienst oder nimm Stremio oder Nuvio als App.',
  b_pref: 'Lass in **Schritt 3** [[Balanced]] ausgewählt und öffne [[Options & defaults]] nicht.', b_pref_s: 'Langsames Internet? Nimm [[Fast]]. Schnelles Internet und 4K-Fernseher? [[Maximum]].',
  b_login: 'Gib in Schritt 1 deine **Stremio-E-Mail und dein Passwort** ein.', b_login_s: 'Nur für die Anmeldung bei Stremio für diese Installation. Noch kein Konto? Leg kostenlos eins auf stremio.com an.',
  b_go: 'Tippe auf [[Install in ~30 seconds]].', b_pw: 'Lass bei [[Set a Password]] [[Auto-generate]] ausgewählt, **speichere das Passwort** sicher und tippe auf [[Continue →]].', b_pw_s: 'Du brauchst es später zum Aktualisieren. Niemand kann es wiederherstellen.',
  ad_st_tv: 'Installiere **Stremio** auf dem Fernseher und melde dich mit **demselben Konto** an.', ad_st_tv_s: 'Addons folgen deinem Konto: Mit der Fernbedienung musst du nichts tippen.',
  ad_st_seen: 'Öffne **Addons** und prüfe, ob Core Builds dort steht.', ad_st_seen_s: 'War Stremio schon offen? Schließen und neu öffnen.',
  ad_nv_open: 'Öffne Nuvio → **Account → Addons** (oder **Settings → Add-ons**).', ad_nv_paste: 'Füge die Manifest-URL ein (schon kopiert) und bestätige.',
  ad_nv_paste_tv: 'Füge die Manifest-URL am Fernseher ein oder tippe sie ab und bestätige.', ad_nv_paste_tv_s: 'Lass den Link zum Ablesen auf dem Handy offen.',
  ad_wu_cfg: 'Öffne auf dem Fernseher WuPlay → **Settings → Configuration**. Notiere den **Profile Key**.', ad_wu_cfg_s: 'Ein verlorener Profile Key lässt sich nicht wiederherstellen.',
  ad_wu_scan: 'Scanne den QR-Code mit dem Handy, füge die Manifest-URL unter **Add-ons** ein und speichere.', ad_wu_scan_s: 'Sie landet von selbst auf dem Fernseher.',
  ad_wu_phone: 'Öffne WuPlay → **Addons** → **Add Addon** und füge den Link ein.',
  ad_ch: 'In Chillio: **Settings → Manage Account → Add Account → ChillLink Protocol**, einfügen, **Save**.', ad_ch_s: 'Die ChillLink-URL ist schon kopiert.',
  ad_ot: 'Kopiere die Manifest-URL, suche in deiner App **Addons** oder **Install from URL**, füge sie ein und bestätige.', ad_ot_s: 'Fragt sie nach „Manifest“ oder „Addon-URL“? Es ist dieser Link.',
  f_none: 'Gar keine Streams', f_none_x: 'Prüfe, ob der ganze Schlüssel ohne Leerzeichen eingefügt ist und dein Abo aktiv ist, dann installiere erneut. Free / P2P findet bei seltenen Titeln manchmal wenig.',
  f_install: 'Das Addon lässt sich nicht installieren', f_install_x: 'Kopiere den Link erneut aus dem Konfigurator und füge ihn neu ein. Er muss auf manifest.json enden.',
  f_play: 'Streams erscheinen, starten aber nicht', f_play_x: 'Probier den nächsten. Wenn auf einem Fernseher fast alle scheitern, öffne [[Options & defaults]], stelle [[Device]] auf deinen Fernseher oder Stick und installiere erneut.',
  f_buffer: 'Alles lädt ständig nach', f_buffer_x: 'Installiere erneut mit [[Fast]], oder trag dein Internettempo unter [[Options & defaults]] → [[Connection speed]] ein.',
},
};

/** Translate a key, falling back to English. */
export const t = (lang, key) => STR[lang]?.[key] ?? STR.en[key] ?? key;

// ---- Choices ----------------------------------------------------------------
export const DEVICES = [
  { id: 'android', rec: 'stremio' }, { id: 'ios', rec: 'nuvio' }, { id: 'atv', rec: 'stremio', tv: true },
  { id: 'appletv', rec: 'nuvio', tv: true }, { id: 'pc', rec: 'stremio' }, { id: 'tvother', rec: 'stremio', tv: true },
];
// `label` is the configurator tile for this app (Quick install → Step 1 → App).
export const APPS = [
  { id: 'stremio', name: 'Stremio', label: 'Stremio' }, { id: 'nuvio', name: 'Nuvio', label: 'Nuvio' },
  { id: 'wuplay', name: 'WuPlay', label: 'WuPlay' }, { id: 'chillio', name: 'Chillio', label: 'Chillio' },
  { id: 'other', name: null, label: 'Other app' },
];
// `label` is the configurator tile for this service (Quick install → Step 2).
export const SERVICES = [
  { id: 'torbox', name: 'TorBox', label: 'TorBox' }, { id: 'rd', name: 'Real-Debrid', label: 'Real-Debrid' },
  { id: 'ad', name: 'AllDebrid', label: 'AllDebrid' }, { id: 'pm', name: 'Premiumize', label: 'Premiumize' },
  { id: 'en', name: 'EasyNews', label: 'EasyNews' }, { id: 'free', name: null, label: 'Free / P2P' },
];
export const CONFIGURATOR_URL = 'brevitya.github.io/Core-Builds/configurator';

export const deviceName = (lang, id) => t(lang, 'd_' + id);
export const appName = (lang, id) => (id === 'other' ? t(lang, 'yourApp') : APPS.find(a => a.id === id)?.name);
export const isTV = id => !!DEVICES.find(d => d.id === id)?.tv;

/**
 * The tasks for a finished set of answers. Each task is [id, textKey, smallKey?, vars?].
 * Build is grouped by the configurator screen it happens on (`mini`).
 */
export function plan({ device, app, service }) {
  const tv = isTV(device);
  const a = APPS.find(x => x.id === app);
  const v = SERVICES.find(x => x.id === service);
  const build = [
    { mini: null, tasks: [tv ? ['open', 'b_open_tv', 'b_open_tv_s'] : ['open', 'b_open', 'b_open_s']] },
    { mini: 'app', tasks: [['app', 'b_app', app === 'stremio' ? 'b_app_stremio_s' : null, { appLabel: a.label }]] },
    { mini: 'svc', tasks: service === 'free'
      ? [['svc', 'b_free', 'b_free_s']]
      : service === 'en'
        // EasyNews signs in with a username and password, not an API key.
        ? [['svc', 'b_svc', null, { svc: v.name }], ['login-en', 'b_en', 'b_en_s']]
        : [['svc', 'b_svc', null, { svc: v.name }], ['key', 'b_key', 'b_key_s', { svc: v.name }]] },
    { mini: 'pref', tasks: [['pref', 'b_pref', 'b_pref_s']] },
    { mini: 'go', tasks: [...(app === 'stremio' ? [['login', 'b_login', 'b_login_s']] : []), ['go', 'b_go'], ['pw', 'b_pw', 'b_pw_s']] },
  ];
  let add;
  if (app === 'stremio') add = tv ? [['tvapp', 'ad_st_tv', 'ad_st_tv_s'], ['seen', 'ad_st_seen']] : [['seen', 'ad_st_seen', 'ad_st_seen_s']];
  else if (app === 'nuvio') add = [['open', 'ad_nv_open'], tv ? ['paste', 'ad_nv_paste_tv', 'ad_nv_paste_tv_s'] : ['paste', 'ad_nv_paste']];
  else if (app === 'wuplay') add = tv ? [['cfg', 'ad_wu_cfg', 'ad_wu_cfg_s'], ['scan', 'ad_wu_scan', 'ad_wu_scan_s']] : [['paste', 'ad_wu_phone']];
  else if (app === 'chillio') add = [['paste', 'ad_ch', 'ad_ch_s']];
  else add = [['paste', 'ad_ot', 'ad_ot_s']];
  // Task ids are namespaced so a ticked "open" in Build never ticks "open" in Add.
  build.forEach(g => g.tasks.forEach(task => { task[0] = 'b.' + task[0]; }));
  add.forEach(task => { task[0] = 'a.' + task[0]; });
  return { build, add };
}

export const FIXES = ['none', 'install', 'play', 'buffer'];

/**
 * A combination Quick install refuses, as the text key that explains why, or null.
 * Chillio cannot play P2P streams (configurator src/core/chilllink-policy.js), so
 * Quick install blocks Chillio with Free / P2P; the guide stops before the steps.
 */
export const blocked = ({ app, service }) => (app === 'chillio' && service === 'free' ? 'chillFree' : null);
