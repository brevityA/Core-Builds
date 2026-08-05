import { ICO } from '../data/icons.js';
import { CHANGELOG } from '../data/changelog.js';
import { FORMATTERS, AUDIO_HELP } from '../data/formatters.js';
import { OPTIONAL_SCRAPER_DEFS } from '../data/scrapers.js';
import { HOST_BASE_URLS, HOST_LABEL_MAP, HOST_META, MIN_AIOSTREAMS_VERSION } from '../data/hosts.js';
import { DEVICE_AUDIO_DEFAULTS, DEVICE_FORCE_LIMITED_AUDIO, DEVICE_AV1_SAFE, DEVICE_DV_SAFE, POPULAR_DEVICE_IDS } from '../data/devices.js';
import { CAROUSEL_SVCS } from '../data/services.js';
import { PROVIDER_CREDENTIALS } from '../data/credentials.js';
import { initErrorLogger, logError, errorLogHtml, formatErrorLog, clearErrorLog, exportErrorLog } from './error-logger.js';
import { initContactWidget } from './contact-widget.js';
import { AGE_RATINGS, generateAgeRatingESE } from '../data/agerating.js';
import { SPEED_TIERS, calculateBitrateLimit, DEVICE_BANDWIDTH_HINTS } from '../data/bandwidth.js';
import { hasTmdbCredentials, bandwidthCapMbps, templateInput } from '../core/template-policy.js';
import { resolutionPolicy, encodePolicy, audioPolicy } from '../core/device-policies.js';
import { sortPolicy } from '../core/sort-policy.js';
import { sizePolicy, bitratePolicy } from '../core/filter-policy.js';
import { addonPolicy, assertAddonPolicy } from '../core/addon-policy.js';
import { generateTemplate } from '../core/generate-template.js';
import { assembleTemplate } from '../core/assemble-template.js';
import { sanitizeTemplateForRemoteImport } from '../core/import-template.js';
import { getSelPolicy } from '../core/sel-policy.js';
import { SCORE_IQR_GUARD } from '../core/sel-iqr-policy.js';
import { APEX_MIXED_PSES } from '../core/sel-policy-data.js';
import { iqrExpression } from '../core/iqr-expression.js';
import { createUpdateSession, commitUpdate, cancelUpdate } from '../core/update-session.js';
import { scoreStream, scoreFormattedStream } from '../core/core-score-policy.js';
import { AIOSTREAMS_COMPATIBILITY_TARGETS, OUTPUT_PROFILES, OUTPUT_PROFILE_INFO, resolveOutputProfile, applyOutputProfile } from '../core/output-profile-policy.js';
import { inspectTemplateComplexity, findFeatureConflicts, validateOutputProfileBudget } from '../core/feature-conflict-policy.js';
import { buildFeedbackReport } from '../core/feedback-report-policy.js';

function toggleTheme(){const html=document.documentElement;const t=html.getAttribute('data-theme')==='dark'?'light':'dark';html.setAttribute('data-theme',t);localStorage.setItem('cbTheme',t);}

const STEPS = 6;
const CONFIGURATOR_VERSION = '2.90';
// Set to a collector endpoint to enable the opt-in anonymous usage ping (service+device+resolution only).
// Leave empty to keep the feature fully disabled and hidden.
const USAGE_BEACON_URL = '';
const COUNTER_URL = 'https://core-builds-cors-proxy.tlorenzato26.workers.dev';
const EXCLUDED_REGEX = ["/(\\bAI[ ._-]?(Upscaled?|Enhanced|Remaster(ed)?)?\\b)|(\\b(AIUS|RW|GuyZo|BR-GuyZo)\\b)|(\\b((Upscale)?Re-?graded?)\\b)|(\\b(The[ ._-]?Upscaler)\\b)|(\\b(AI[ ._-]?Enhanced?|UPS(UHD)?|Upscaled?([ ._-]?UHD)?|UpRez)\\b)/i","/(?<=\\b[12]\\d{3}\\b).*\\b(Extras|Bonus|Extended[ ._-]Clip)\\b/i","/(?<=\\bS\\d+\\b).*\\b(Extras|Bonus|Extended[ ._-]Clip)\\b/i","/\\b(beAst|COLLECTiVE|EPiC|iVy|KiNGDOM|LUCY|Scene|SUNSCREEN)\\b/","/(?<=\\b[12]\\d{3}\\b).*\\b(Sing[-_. ]Along)\\b/i","/^(?!.*\\b((?<!HD[._ -]|HD)DVD|BDRip|720p|MKV|XviD|WMV|d3g|(BD)?REMUX|^(?=.*1080p)(?=.*HEVC)|[xh][-_. ]?26[45]|German.*[DM]L|((?<=\\d{4}).*German.*([DM]L)?)(?=.*\\b(AVC|HEVC|VC[-_. ]?1|MVC|MPEG[-_. ]?2)\\b))\\b)(((?=.*\\b(Blu[-_. ]?ray|BD|HD[-_. ]?DVD)\\b)(?=.*\\b(AVC|HEVC|VC[-_. ]?1|MVC|MPEG[-_. ]?2|BDMV|ISO)\\b))|^((?=.*\\b(((?=.*\\b((.*_)?COMPLETE.*|Dis[ck])\\b)(?=.*(Blu[-_. ]?ray|HD[-_. ]?DVD)))|3D[-_. ]?BD|BR[-_. ]?DISK|Full[-_. ]?Blu[-_. ]?ray|^((?=.*((BD|UHD)[-_. ]?(25|50|66|100|ISO)))))))).*$/i","/[.]heb\\b|\\[eztvx?[ ._-]?(io|re|to)?\\]|\\[(rarbg|rartv|TGx)\\]|[.]VAV\\b|\\b(ORARBG)\\b/i","/[.]heb\\b|\\[eztvx?[ ._-]?(io|re|to)?\\]|\\[(rarbg|rartv|TGx)\\]/i"];
const PREFERRED_REGEX_4K = [{"name":"Radarr Remux T1","pattern":"/^(?=.*(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)(?=.*\\b(3L|BiZKiT|BLURANiUM|BMF|CiNEPHiLES|FraMeSToR|PiRAMiDHEAD|PmP|WiLDCAT|ZQ)\\b).*/i"},{"name":"Sonarr Remux T1","pattern":"/^(?=.*(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)(?=.*\\b(BLURANiUM|BMF|FraMeSToR|PmP)\\b).*/i"},{"name":"Radarr UHD Bluray T1","pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|UHD|4K))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*\\b(?:CtrlHD|MainFrame|W4NK3R)\\b).*/i"},{"name":"Radarr UHD Bluray T1 — DON","pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|UHD|4K))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*(?:\\b(?:DON)\\b)).*/"},{"name":"Anime BD T1","pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[(Moxie|smol|SoM)\\]|-(Moxie|smol|SoM)\\b|\\b(DemiHuman|FLE|Flugel|LYS1TH3A)\\b)).*/i"},{"name":"Anime BD T1 [sam]","pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[sam\\]|-sam\\b)).*/"},{"name":"FraMeSToR","pattern":"/\\b(FraMeSToR)\\b/"}];
const PREFERRED_REGEX_1080P = [{"name":"Web T1","pattern":"/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:APEX|FLUX|KiNGS|TOMMY)\\b).*/"},{"name":"126811","pattern":"/\\b(126811)\\b/i"},{"name":"FLUX","pattern":"/\\b(FLUX)\\b/i"},{"name":"SiC","pattern":"/\\b(SiC)\\b/"},{"name":"BHDStudio","pattern":"/\\b(BHDStudio)\\b/i"}];
const RANKED_REGEX_COMMON = [{"name": "Anime BD T1", "pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[(Moxie|smol|SoM)\\]|-(Moxie|smol|SoM)\\b|\\b(DemiHuman|FLE|Flugel|LYS1TH3A)\\b)).*/i", "score": 100}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[sam\\]|-sam\\b)).*/", "name": "Anime BD T1 [B]", "score": 100}, {"pattern": "/\\b(FraMeSToR)\\b/", "name": "FraMeSToR", "score": 100}, {"pattern": "/^(?=.*(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)(?=.*\\b(3L|BiZKiT|BLURANiUM|BMF|CiNEPHiLES|FraMeSToR|PiRAMiDHEAD|PmP|WiLDCAT|ZQ)\\b).*/i", "name": "Radarr Remux T1", "score": 100}, {"pattern": "/^(?=.*(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)(?=.*\\b(BLURANiUM|BMF|FraMeSToR|PmP)\\b).*/i", "name": "Sonarr Remux T1", "score": 100}, {"pattern": "/\\b(126811)\\b/i", "name": "126811", "score": 80}, {"pattern": "/\\b(FLUX)\\b/i", "name": "FLUX", "score": 80}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*\\b(?:BBQ|BMF|c0kE|Chotab|CRiSC|CtrlHD|D-Z0N3|Dariush|decibeL|EbP|EDPH|LolHD|NCmt|PTer|TayTO|TDD|TnP|VietHD|ZQ|ZoroSenpai)\\b).*/i", "name": "Radarr HD Bluray T1", "score": 80}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*(?:\\b(?:DON|Geek)\\b)).*/", "name": "Radarr HD Bluray T1 [B]", "score": 80}, {"pattern": "/\\b(SiC)\\b/", "name": "SiC", "score": 80}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*\\b(?:Chotab|CtrlHD|EbP|NTb|PTer)\\b).*/i", "name": "Sonarr HD Bluray T1", "score": 80}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*(?:\\b(?:DON)\\b)).*/", "name": "Sonarr HD Bluray T1 [B]", "score": 80}, {"pattern": "/\\b(TheFarm)\\b/i", "name": "TheFarm", "score": 80}, {"name": "Anime BD T2", "pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[(Aergia|Arid|koala|Lulu|Vodes|YURI)\\]|-(Aergia(?!-raws)|Arid|koala|Lulu|YURI)\\b|\\b(Arg0|BlackRose|FateSucks|hchcsen|hydes|JOHNTiTOR|JySzE|Kulot|LostYears|Meakes|WAP|ZeroBuild)\\b|-Orphan\\b|(?<!Not)-Vodes\\b)).*/i", "score": 60}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[Orphan\\])).*/", "name": "Anime BD T2 [B]", "score": 60}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux|\\[WEB\\]|[\\[\\(]WEB[ .]))(?=.*(\\[(Arid|smol|SoM|Vodes)\\]|-(Arid|smol|SoM)\\b|\\b(Arg0|Baws|FLE|LostYears|LYS1TH3A|McBalls|SCY|Setsugen|Z4ST1N|ZeroBuild)\\b|(?<!Not)-Vodes\\b)).*/i", "name": "Anime Web T1", "score": 60}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux|\\[WEB\\]|[\\[\\(]WEB[ .]))(?=.*(\\[sam\\]|-sam\\b)).*/", "name": "Anime Web T1 [B]", "score": 60}, {"pattern": "/\\b(BHDStudio)\\b/i", "name": "BHDStudio", "score": 60}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*\\b(?:ATELiER|EA|HiDt|HiSD|iFT|NTb|QOQ|SA89|sbR)\\b).*/i", "name": "Radarr HD Bluray T2", "score": 60}, {"pattern": "/^(?=.*(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)(?=.*\\b(ATELiER|NCmt|playBD|SiCFoI|SURFINBIRD|TEPES)\\b).*/i", "name": "Radarr Remux T2", "score": 60}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*\\b(?:SA89|sbR)\\b).*/i", "name": "Sonarr HD Bluray T2", "score": 60}, {"pattern": "/^(?=.*(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)(?=.*\\b(12GaugeShotgun|decibeL|EPSiLON|HiFi|KRaLiMaRKo|playBD|PTer|SiCFoI|TRiToN)\\b).*/i", "name": "Sonarr Remux T2", "score": 60}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:APEX|FLUX|KiNGS|TOMMY)\\b).*/", "name": "Web T1", "score": 60}, {"name": "Anime BD T3", "pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[(ARC|cappybara|CRUCiBLE|Doc|fig|Headpatter|Legion|Mehul|Mysteria|RaiN|RUDY|Serendipity|sgt|uba)\\]|-(ARC|cappybara|CRUCiBLE|Doc|fig|Headpatter|Legion|Mehul|Mysteria|RaiN|RUDY|Serendipity|sgt|uba)\\b|\\b(BBT-RMX|ChucksMux|CUNNY|Cunnysseur|Inka-Subs|LaCroiX|MTBB|Netaro|Noiy|npz|NTRX|Okay-Subs|P9|RMX|Sekkon|SubsMix|Sylvar|ZR)\\b|(?<=remux).*\\b(NAN0)\\b|^(?=.*\\b(PMR)\\b)(?=.*\\b(Remux)\\b)|-ZR-)).*/i", "score": 40}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[(Afro|Chimera|derp|DIY|EXP|Foxtrot|Kawatare|Metal|Pizza|Smoke|Vanilla|VULCAN)\\]|-(Afro|Chimera|derp|DIY|EXP|Foxtrot|Kawatare|Metal|Pizza|Smoke|Vanilla|VULCAN)\\b|\\b(ABdex|aRMX|BiRJU|BKC|CBT|grimf|IK|Iznjie[ .-]Biznjie|Kaleido-subs|Kametsu|KH|LazyRemux|MK|neko-kBaraka|OZR|pog42|Quetzal|Reza|SCY|Shimatta|Spirale|UDF|UQW|Virtuality)\\b)).*/i", "name": "Anime BD T4", "score": 40}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux|\\[WEB\\]|[\\[\\(]WEB[ .]))(?=.*(\\[(Asakura|Cyan|Dae|Foxtrot|Gao|Not-Vodes|Pizza|tenshi)\\]|-(Asakura|Cyan|Dae|Foxtrot|Gao|Not-Vodes|Pizza)\\b|-tenshi$|\\b(0x539|Cytox|GSK[._-]kun|Half-Baked|HatSubs|MALD|MTBB|Okay-Subs|Reza|Slyfox|SoLCE)\\b)).*/i", "name": "Anime Web T2", "score": 40}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux|\\[WEB\\]|[\\[\\(]WEB[ .]))(?=.*(\\[Kitsune\\]|-Kitsune\\b|\\b(AnoZu|Dooky|SubsPlus\\+?|ZR)\\b)).*/i", "name": "Anime Web T3", "score": 40}, {"name": "DV (Disk)", "pattern": "/^(?=.*\\b(FraMeSToR)\\b)(?=.*\\b(dv|dovi|dolby[ .]?v(ision)?)\\b)(?!.*\\b(FANRES)\\b)(?!.*\\bhybrid(\\b|\\d)).*/i", "score": 40}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*\\b(?:BHDStudio|hallowed|HiFi|HONE|playHD|SPHD|W4NK3R)\\b).*/i", "name": "Radarr HD Bluray T3", "score": 40}, {"pattern": "/^(?=.*(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)(?=.*\\b(12GaugeShotgun|decibeL|EPSiLON|HiFi|iFT|KRaLiMaRKo|NTb|PTP|SumVision|TOA|TRiToN)\\b).*/i", "name": "Radarr Remux T3", "score": 40}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:dB|MiU|MZABI|playWEB|SbR|SMURF|XEBEC|4KBEC|CEBEX)\\b).*/i", "name": "Radarr Web T2", "score": 40}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:TOMMY)\\b).*/", "name": "Radarr Web T2 [B]", "score": 40}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:Flights|PHOENiX)\\b).*/", "name": "Radarr Web T2 [C]", "score": 40}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:BLOOM|Dooky|GNOMiSSiON|HHWEB|NINJACENTRAL|NPMS|ROCCaT|SiGMA|SLiGNOME|SwAgLaNdEr)\\b).*/i", "name": "Radarr Web T3", "score": 40}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:3cTWeB|4KBEC|BTW|BLUTONiUM|BYNDR|CEBEX|Chotab|Cinefeel|CiT|Coo7|dB|FC|iJP|iKA|iT00NZ|JETIX|KHN|MiU|MZABI|NPMS|NYH|orbitron|playWEB|PSiG|ROCCaT|RTFM|SA89|SbR|SDCC|TEPES|TVSmash|WELP|XEBEC)\\b).*/i", "name": "Sonarr Web T2", "score": 40}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:DEEP|END|ETHiCS|Flights|GNOME|KiMCHI|LAZY|PHOENiX|SIGMA|SiGMA|SMURF|SPiRiT)\\b).*/", "name": "Sonarr Web T2 [B]", "score": 40}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:BLOOM|Dooky|HHWEB|NINJACENTRAL|SLiGNOME|SwAgLaNdEr|T4H)\\b).*/i", "name": "Sonarr Web T3", "score": 40}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:DRACULA|ViSiON)\\b).*/", "name": "Sonarr Web T3 [B]", "score": 40}, {"pattern": "/10[.-]?bit|hi10p?/i", "name": "10bit", "score": 20}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[(Beatrice|Drag|Judgment|Thighs|Yuki)\\]|-(Beatrice(?!-raws)|Drag|Judgment|Thighs|Yuki)\\b|\\b(Animorphs|AOmundson|ASC|Baws|McBalls|B00BA|Cait-Sidhe|CsS|CTR|D4C|deanzel|eldon|Freehold|GHS|Hark0N|Holomux|MC|mottoj|NH|NTRM|o7|QM|TTGA|UltraRemux|WBDP|WSE)\\b)).*/i", "name": "Anime BD T5", "score": 20}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[(ANE|Tsundere|YURASUKA)\\]|-ANE$|-(Tsundere(?!-)|YURASUKA)\\b|\\b(Bunny-Apocalypse|CyC|Datte13|EJF|GetItTwisted|GSK[._-]kun|iKaos|karios|Pookie|RASETSU|Starbez|Yoghurt)\\b)).*/i", "name": "Anime BD T6", "score": 20}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[(Almighty|Asakura|Bolshevik|Chihiro|Crow|Dekinai|Senjou|Vivid|AC)\\]|-(Almighty|Asakura|Bolshevik|Chihiro|Crow|Dekinai|Senjou|Vivid)\\b|-AC$|\\b(9volt|Asenshi|BlurayDesuYo|Brrrrrrr|Commie|Dae|Dragon-Releases|DragsterPS|Exiled-Destiny|E-D|FFF|Final8|Geonope|GJM|iAHD|inid4c|Koten[ ._-]Gars|kuchikirukia|LCE|NTW|orz|RAI|REVO|SCP-2223|SEV|THORA)\\b)).*/i", "name": "Anime BD T7", "score": 20}, {"pattern": "/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[(EDGE|EMBER|GHOST|naiyas|Prof|Judas)\\]|-(EDGE|EMBER|GHOST|naiyas|Prof|Judas)\\b|\\b(AkihitoSubs|Arukoru|Nep[ ._-]Blanc|Shirσ)\\b)).*/i", "name": "Anime BD T8", "score": 20}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux|\\[WEB\\]|[\\[\\(]WEB[ .]))(?=.*\\b(Erai-raws|ToonsHub|VARYG)\\b).*/i", "name": "Anime Web T4", "score": 20}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux|\\[WEB\\]|[\\[\\(]WEB[ .]))(?=.*(\\[(Lia|ZigZag)\\]|-(Lia|ZigZab)\\b|\\b(BlueLobster|GST|HorribleRips|HorribleSubs|KAN3D2M|KS|KiyoshiStar|NanDesuKa|PlayWeb|SobsPlease|Some-Stuffs|SubsPlease|URANIME)\\b)).*/i", "name": "Anime Web T5", "score": 20}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux|\\[WEB\\]|[\\[\\(]WEB[ .]))(?=.*(\\[(Chihiro|Doki|Kantai|Tsundere)\\]|-(Chihiro|Doki|Kantai|Tsundere(?!-))\\b|\\b(9volt|Asenshi|Commie|DameDesuYo|GJM|Kaleido|KawaSubs)\\b)).*/i", "name": "Anime Web T6", "score": 20}, {"pattern": "/\\b\\d{2,3}(?:th)?[.\\s\\-\\+_\\/(),]Anniversary[.\\s\\-\\+_\\/(),](?:Edition|Ed)?\\b/i", "name": "Anniversary Edition", "score": 20}, {"pattern": "/\\bCollector'?s\\b/i", "name": "Collector's Edition", "score": 20}, {"pattern": "/\\bCC\\b/", "name": "Color Corrected", "score": 20}, {"pattern": "/\\b(Criterion|CC)\\b/i", "name": "Criterion Collection", "score": 20}, {"pattern": "/\\b\\.Diamond\\.\\b/i", "name": "Diamond Edition", "score": 20}, {"pattern": "/\\bDirector'?s.?Cut\\b/i", "name": "Director's Cut", "score": 20}, {"pattern": "/\\bDBOX\\b/i", "name": "Dragon Box", "score": 20}, {"pattern": "/\\b(Extended[ ._-]Clip)\\b/i", "name": "Extended Clip", "score": 20}, {"pattern": "/\\b(?:custom.?)?Extended\\b/i", "name": "Extended Edition", "score": 20}, {"pattern": "/\\bhi10p?\\b|(?=.*10[.-]?bit)(?=.*\\b[xh][-_. ]?264\\b)/i", "name": "H.264 10bit", "score": 20}, {"pattern": "/(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)))(?=.*(hybrid(\\b|\\d)))/i", "name": "Hybrid", "score": 20}, {"pattern": "/\\b((?<!NON[ ._-])IMAX)\\b/i", "name": "IMAX", "score": 20}, {"pattern": "/\\b(IMAX[ ._-]Edition)\\b/i", "name": "IMAX Edition", "score": 20}, {"pattern": "/^(?=.*\\b((DSNP|BC|B?CORE)\\b|Disney\\+)(?=.*\\bWEB[ ._-]?(DL|Rip)\\b))(?=.*\\b((?<!NON[ ._-])IMAX)\\b)|^(?=.*\\b(IMAX[ ._-]Enhanced)\\b)/i", "name": "IMAX Enhanced", "score": 20}, {"pattern": "/\\b(Masters[ .-]?Of[ .-]?Cinema|MoC)(\\b|\\d)/i", "name": "Masters of Cinema", "score": 20}, {"pattern": "/\\b(Open[ ._-]?Matte)\\b/i", "name": "Open Matte", "score": 20}, {"pattern": "/\\b(Remaster)\\b/i", "name": "Remaster", "score": 20}, {"pattern": "/\\b(Repack|Proper|Rerip)\\b/i", "name": "Repack/Proper", "score": 20}, {"pattern": "/\\b((repack|proper)2)\\b|\\b(REAL\\.(PROPER|REPACK))\\b/i", "name": "Repack2", "score": 20}, {"pattern": "/\\b((repack|proper)3)\\b|\\b(REAL\\.REAL\\.(PROPER|REPACK))\\b/i", "name": "Repack3", "score": 20}, {"pattern": "/(?<!^)\\b(extended|uncut|directors|special|unrated|uncensored|cut|version|(?<!{)edition)(\\b|\\d)/i", "name": "Special Edition", "score": 20}, {"pattern": "/\\b(Theatrical)\\b/i", "name": "Theatrical Cut", "score": 20}, {"pattern": "/\\bUltimate[.\\s\\-\\+_\\/(),]Edition\\b/i", "name": "Ultimate Edition", "score": 20}, {"name": "Uncensored", "pattern": "/\\b(Uncut|Unrated|Uncensored|AT[-_. ]?X)\\b/i", "score": 20}, {"pattern": "/\\b(Vinegar[ ._-]Syndrome|V-S|VinSyn)\\b/i", "name": "Vinegar Syndrome", "score": 20}, {"pattern": "/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:DEFLATE|INFLATE)\\b).*/i", "name": "Web Scene", "score": 20}, {"pattern": "/(\\b|\\d)(v1)\\b/i", "name": "v1", "score": 20}, {"pattern": "/(\\b|\\d)(v2)\\b/i", "name": "v2", "score": 20}, {"pattern": "/(\\b|\\d)(v3)\\b/i", "name": "v3", "score": 20}, {"pattern": "/(\\b|\\d)(v4)\\b/i", "name": "v4", "score": 20}, {"name": "x266", "pattern": "/[xh][ ._-]?266|\\bVVC(\\b|\\d)/i", "score": 20}, {"pattern": "/\\b(Asuka|Beatrice|Daddy|Fumi|Iriza|Kawaiika|Koi|Lilith|LowPower|Nanako|NC|neko|New|Ohys|Pandoratv|Scryous|Seicher|Shiniori)[ ._-]?(Raws)\\b|\\b(Moozzi2|Raws-Maji|ReinForce)\\b|\\[km\\]|-km\\b/i", "name": "Anime Raws", "score": -25}, {"pattern": "/\\b(Golumpa|KamiFS|torenter69)\\b|\\[Yameii\\]|-Yameii\\b|^(?!.*(Dual|Multi)[-_. ]?Audio).*((?<!multi-)\\b(dub(bed)?)\\b|(funi|eng(lish)?)_?dub)|^(?!.*(dual[ ._-]?audio|(JA|ZH|KO)\\+EN|EN\\+(JA|ZH|KO))).*\\b(KaiDubs|KS)\\b/i", "name": "Dubs Only", "score": -25}, {"pattern": "/\\b(INTERNAL)\\b/i", "name": "INTERNAL", "score": -25}, {"pattern": "/\\bSDR\\b/i", "name": "SDR", "score": -25}, {"pattern": "/\\b((FRENCH|MULTi|WiTH|((BA?|A)SL[ ._-]and))[ ._-](AD|Audio[ ._-]Description))\\b/i", "name": "WiTH AD", "score": -25}, {"pattern": "/\\b((WiTH)[ ._-](ASL))\\b/i", "name": "WiTH ASL", "score": -25}, {"pattern": "/\\b(BASL)\\b/i", "name": "WiTH BASL", "score": -25}, {"pattern": "/\\b((WiTH)[ ._-](BSL))\\b/i", "name": "WiTH BSL", "score": -25}, {"name": "v0", "pattern": "/(\\b|\\d)(v0)\\b/i", "score": -25}, {"pattern": "/[xh][ ._-]?264|\\bAVC(\\b|\\d)/i", "name": "x264", "score": -25}, {"pattern": "/(?<=\\b[12]\\d{3}\\b).*\\b(3d|sbs|half[ .-]ou|half[ .-]sbs|BluRay3D|BD3D)\\b/i", "name": "3D", "score": -50}, {"pattern": "/\\b(W4NK3R|HQMUX)\\b/i", "name": "Atmos Exclude Groups", "score": -50}, {"pattern": "/^(?=.*\\b(BiTOR|DepraveD|SasukeducK|tarunk9c|VD0N|VECTOR|VisionXpert)\\b)(?=.*(?:\\bHDR10(\\+|P(lus)?)\\b|\\b(dv|dovi|dolby[ .]?v(ision)?)\\b)).*/i", "name": "Generated Dynamic HDR", "score": -50}, {"pattern": "/^(?=.*\\b(Flights|GuyZo|BR-GuyZo)\\b)(?=.*(?:\\bHDR10(\\+|P(lus)?)\\b|\\b(dv|dovi|dolby[ .]?v(ision)?)\\b)).*/", "name": "Generated Dynamic HDR [B]", "score": -50}, {"pattern": "/-4P\\b|-4Planet\\b|-AsRequested\\b|-BUYMORE\\b|-Chamele0n\\b|-GEROV\\b|-iNC0GNiTO\\b|-NZBGeek\\b|-Obfuscated\\b|-postbot\\b|-Rakuv\\b|(?<=\\b[12]\\d{3}\\b).*(Scrambled)\\b|-WhiteRev\\b|-xpost\\b|-WRTEAM\\b|-CAPTCHA\\b|_nzb\\b/i", "name": "Obfuscated (Radarr)", "score": -50}, {"pattern": "/-4P\\b|-4Planet\\b|-AsRequested\\b|-BUYMORE\\b|-Chamele0n\\b|-GEROV\\b|-iNC0GNiTO\\b|-NZBGeek\\b|-Obfuscated\\b|-postbot\\b|-Rakuv\\b|(?<=\\bS\\d+\\b).*(Scrambled)\\b|-WhiteRev\\b|-xpost\\b|-WRTEAM\\b|-CAPTCHA\\b|_nzb\\b/i", "name": "Obfuscated (Sonarr)", "score": -50}, {"pattern": "/\\b(CtrlHD|W4NK3R|DON)\\b/i", "name": "TrueHD Exclude Groups", "score": -50}, {"pattern": "/^(?!.*\\b((?<!HD[._ -]|HD)DVD|BDRip|720p|MKV|XviD|WMV|d3g|(BD)?REMUX|^(?=.*1080p)(?=.*HEVC)|[xh][-_. ]?26[45]|German.*[DM]L|((?<=\\d{4}).*German.*([DM]L)?)(?=.*\\b(AVC|HEVC|VC[-_. ]?1|MVC|MPEG[-_. ]?2)\\b))\\b)(((?=.*\\b(Blu[-_. ]?ray|BD|HD[-_. ]?DVD)\\b)(?=.*\\b(AVC|HEVC|VC[-_. ]?1|MVC|MPEG[-_. ]?2|BDMV|ISO)\\b))|^((?=.*\\b(((?=.*\\b((.*_)?COMPLETE.*|Dis[ck])\\b)(?=.*(Blu[-_. ]?ray|HD[-_. ]?DVD)))|3D[-_. ]?BD|BR[-_. ]?DISK|Full[-_. ]?Blu[-_. ]?ray|^((?=.*((BD|UHD)[-_. ]?(25|50|66|100|ISO)))))))).*$/i", "name": "BR-DISK", "score": -75}, {"pattern": "/[.]heb\\b|\\[eztvx?[ ._-]?(io|re|to)?\\]|\\[(rarbg|rartv|TGx)\\]|[.]VAV\\b|\\b(ORARBG)\\b/i", "name": "Retags (Radarr)", "score": -75}, {"pattern": "/[.]heb\\b|\\[eztvx?[ ._-]?(io|re|to)?\\]|\\[(rarbg|rartv|TGx)\\]/i", "name": "Retags (Sonarr)", "score": -75}, {"pattern": "/(?<=\\b[12]\\d{3}\\b).*\\b(Sing[-_. ]Along)\\b/i", "name": "Sing-Along Versions", "score": -75}, {"pattern": "/(\\bAI[ ._-]?(Upscaled?|Enhanced|Remaster(ed)?)?\\b)|(\\b(AIUS|RW|GuyZo|BR-GuyZo)\\b)|(\\b((Upscale)?Re-?graded?)\\b)|(\\b(The[ ._-]?Upscaler)\\b)|(\\b(AI[ ._-]?Enhanced?|UPS(UHD)?|Upscaled?([ ._-]?UHD)?|UpRez)\\b)/i", "name": "Upscaled", "score": -75}, {"pattern": "/(?<=\\b[12]\\d{3}\\b).*\\b(Extras|Bonus|Extended[ ._-]Clip)\\b/i", "name": "Extras (Radarr)", "score": -200}, {"pattern": "/(?<=\\bS\\d+\\b).*\\b(Extras|Bonus|Extended[ ._-]Clip)\\b/i", "name": "Extras (Sonarr)", "score": -200}];
const RANKED_REGEX_UHD = [{"pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|UHD|4K))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*\\b(?:CtrlHD|MainFrame|W4NK3R)\\b).*/i","name":"Radarr UHD Bluray T1","score":80},{"pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|UHD|4K))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*(?:\\b(?:DON)\\b)).*/","name":"Radarr UHD Bluray T1 [B]","score":80},{"pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|UHD|4K))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*\\b(?:HQMUX)\\b).*/i","name":"Radarr UHD Bluray T2","score":60},{"pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|UHD|4K))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*\\b(?:BHDStudio|hallowed|HONE|PTer|SPHD|WEBDV)\\b).*/i","name":"Radarr UHD Bluray T3","score":40}];

let step = 0;
let showAdvanced = false;
let hadSavedState = false;
let _sharedImport = false;
let _detectedDevice = null;
let _savedStep = 0;
let _disabledAddons = new Set();
let _lastInstall = { target: 'app', pwd: '' };
let _lastAddonKey = '';
const _simulateAddonFail = (() => { try { return new URLSearchParams(location.search).get('simulateAddonFail'); } catch(e){ return null; } })();
let pasteMode = false;
function hostEntries() { return Object.entries(HOST_BASE_URLS).map(([k,u]) => [HOST_LABEL_MAP[k]||k, u]); }
function hostKeyFromUrl(url) { return Object.keys(HOST_BASE_URLS).find(k=>HOST_BASE_URLS[k]===url) || ''; }
function versionAtLeast(actual, minimum) {
  const a=String(actual||'0').split('.').map(Number), b=String(minimum||'0').split('.').map(Number);
  for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d>0;} return true;
}
function orderedHostEntries() {
  const entries = hostEntries();
  let preferred = '';
  try { preferred = localStorage.getItem('coreBuildLastGoodHost') || ''; } catch(e) {}
  return entries.sort((a,b) => {
    if (a[1]===preferred) return -1; if (b[1]===preferred) return 1;
    return (HOST_META[hostKeyFromUrl(a[1])]?.priority||99) - (HOST_META[hostKeyFromUrl(b[1])]?.priority||99);
  });
}
function rememberGoodHost(host) {
  try { if (host) localStorage.setItem('coreBuildLastGoodHost', host); } catch(e) {}
}
// AIOStreams' express.json() body parser has a hardcoded 100 KB (102,400-byte)
// request limit (verified in upstream packages/server/src/app.ts). The payload
// POSTed to /api/v1/user is the compact serialized config — guard it before
// any Direct Install so the user gets a clear message instead of a 413.
const AIOSTREAMS_PAYLOAD_LIMIT = 102400;
const AIOSTREAMS_PAYLOAD_WARN = 90000;
function payloadSizeGuard(cfg) {
  let bytes = 0;
  try { bytes = new TextEncoder().encode(JSON.stringify(cfg)).length; } catch(e) { bytes = JSON.stringify(cfg).length; }
  return { over: bytes > AIOSTREAMS_PAYLOAD_LIMIT, near: bytes > AIOSTREAMS_PAYLOAD_WARN, bytes, kb: Math.round(bytes/1024) };
}
function payloadTooLargeHtml(sz) {
  return `<div class="import-success import-error" style="margin-top:12px"><strong style="color:#f87171">Config too large for AIOStreams</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 2px;line-height:1.5">${sz.kb} KB exceeds AIOStreams' 100 KB (102,400-byte) save limit. Trim filters (e.g. fewer optional scrapers), use a Lite template, or export the JSON and trim it manually.</div></div>`;
}
async function selectHealthyHost(timeout=4000) {
  const isFree = typeof S!=='undefined' && (S.service==='p2p' || S.service==='http');
  const entries = orderedHostEntries().filter(([,host])=>!(isFree && HOST_META[hostKeyFromUrl(host)]?.blocksFree));
  let preferred='';
  try { preferred=localStorage.getItem('coreBuildLastGoodHost')||''; } catch(e) {}
  const probe = async host => {
    const res=await raceHostFetch(host,'/api/v1/status',{method:'GET'},timeout);
    if(!res.ok) throw new Error('host unavailable');
    const payload=await res.clone().json().catch(()=>null);
    const version=payload?.data?.version || payload?.version || '';
    if(version && !versionAtLeast(version,MIN_AIOSTREAMS_VERSION)) throw new Error(`host outdated (${version})`);
    return host;
  };
  if (preferred && entries.some(([,host])=>host===preferred)) {
    try { const host=await probe(preferred); rememberGoodHost(host); return host; } catch(e) {}
  }
  const candidates=entries.filter(([,host])=>host!==preferred);
  const stable=candidates.filter(([,host])=>(HOST_META[hostKeyFromUrl(host)]?.channel||'stable')==='stable').map(([,host])=>host);
  const nightly=candidates.filter(([,host])=>HOST_META[hostKeyFromUrl(host)]?.channel==='nightly').map(([,host])=>host);
  let winner;
  try { winner=await Promise.any(stable.map(probe)); }
  catch(e) { winner=await Promise.any(nightly.map(probe)); }
  rememberGoodHost(winner); return winner;
}
// Cloudflare Worker CORS proxy — see cloudflare-worker/README.md for deployment.
// Set to '' to disable and fall back to direct-only fetches.
const CORS_PROXY = 'https://core-builds-cors-proxy.tlorenzato26.workers.dev';
const S = { service:null, device:null, resolution:null, audio:'limited', bandwidthMbps:0, content:null, name:'', multiServices:[], sizeLimit:'unlimited', formatter:'family-v4', p2pEnabled:false, qualityFirst:false, resolutionFirst:false, foreignLangKill:true, matchMode:'balanced', exclude4K:false, excludeDV:false, tmdbToken:'', tmdbApiKey:'', creds:{torbox:'',realdebrid:'',alldebrid:'',premiumize:'',debridlink:'',offcloud:'',easynews:'',easynewsPass:'',nzbgeek:'',debridio:'',debrider:'',nzbnoob:'',althub:'',usenetcrawler:'',drunkenslug:'',nzbfinder:'',jackett:'',prowlarr:'',subdl:''}, instanceHost:'elfhosted', instanceUrl:'', instanceUuid:'', instancePassword:'', baseUuid:'', basePassword:'', quickStart:false, langs: ['English'], langExclusive: false, cacheMode: 'mixed', streamPool: 'normal', pseArch: 'standard', telemetryOk: false, simpleMode: false, outputProfile:'auto', aiostreamsVersion:'2.32.0', installMode: 'direct', stremioEmail: '', stremioPassword: '', subtitleLangs: ['en'], subtitleAddons: ['aiosubtitle'], proxyEnabled: false, proxiedServices: [], catalogs: ['tmdb-addon'], dedupMerge: false, optionalScrapers: [], cleanInstall: false, quickProfile: 'balanced', preloadEnabled:true, autoPlayMethod:'matchingFile', addonTimeout:6000, patchCinemeta:false, installAIOMeta:false, ageLimit:'none', libraryBoost:'default', nzbFailover:false, nzbFailoverPosition:'after-torrents', maxFailoverNzbs:3 };
const SENSITIVE_TOP_LEVEL_KEYS = new Set(['instancePassword', 'basePassword', 'stremioPassword']);
const SENSITIVE_KEY_TOKENS = ['password', 'apikey', 'api_key', 'token', 'secret', 'credential', 'auth'];

function isSensitiveKeyName(key) {
  const n = String(key || '').toLowerCase();
  if (!n) return false;
  if (SENSITIVE_TOP_LEVEL_KEYS.has(key)) return true;
  return SENSITIVE_KEY_TOKENS.some(t => n.includes(t));
}

function sanitizeValueForStorage(val) {
  if (Array.isArray(val)) return val.map(sanitizeValueForStorage);
  if (!val || typeof val !== 'object') return val;
  const out = {};
  Object.keys(val).forEach((k) => {
    if (isSensitiveKeyName(k)) { out[k] = ''; return; }
    out[k] = sanitizeValueForStorage(val[k]);
  });
  return out;
}

function sanitizeSnapshotForStorage(raw) {
  const out = {};
  Object.keys(raw || {}).forEach((k) => {
    if (SENSITIVE_TOP_LEVEL_KEYS.has(k)) return;
    if (k === 'creds' && raw.creds && typeof raw.creds === 'object') {
      const scrubbed = {};
      Object.keys(raw.creds).forEach((ck) => { scrubbed[ck] = ''; });
      out.creds = scrubbed;
      return;
    }
    if (isSensitiveKeyName(k)) { out[k] = ''; return; }
    out[k] = sanitizeValueForStorage(raw[k]);
  });
  return out;
}
// Conservative playback defaults. These describe the device/app itself, not an AVR attached elsewhere.
const LANG_OPTS = [
  {v:'English'},{v:'Spanish'},{v:'French'},{v:'German'},{v:'Italian'},
  {v:'Portuguese'},{v:'Japanese'},{v:'Korean'},{v:'Chinese (Simplified)'},
  {v:'Chinese (Traditional)'},{v:'Arabic'},{v:'Hindi'},{v:'Russian'},
  {v:'Dutch'},{v:'Polish'},{v:'Turkish'}
];

const DEFS = [
  { id:'service', title:'Sources', desc:'Choose one or more providers for streams. Add optional sources separately.', key:'service', cols:'c4d', layout:'svc-list',
    opts:[
      { v:'torbox-pro',   icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="6" y="8" width="32" height="28" rx="4" stroke="#22c55e" stroke-width="1.5" fill="#22c55e" fill-opacity=".06"/><path d="M14 16h16M14 22h10M14 28h13" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"/><circle cx="34" cy="14" r="3.5" fill="#22c55e" stroke="#22c55e" stroke-width="1"/><path d="M33 14l1 1 2-2" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/><text x="22" y="7" text-anchor="middle" fill="#22c55e" font-size="5" font-weight="800" letter-spacing=".5">PRO</text></svg>', name:'TorBox Pro', desc:'Best pick — full scraper stack<br><span style="color:#3fb950;font-size:.8em">e.g. Core Nexus Stream · 4K Apex</span>' },
      { v:'torbox-ess',   icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="6" y="10" width="32" height="26" rx="4" stroke="#4ade80" stroke-width="1.5" fill="#4ade80" fill-opacity=".05"/><path d="M14 18h16M14 24h10M14 30h8" stroke="#4ade80" stroke-width="1.5" stroke-linecap="round"/><text x="22" y="9" text-anchor="middle" fill="#4ade80" font-size="4.5" font-weight="700" letter-spacing=".4">ESS</text></svg>', name:'TorBox Essential', desc:'Essential plan — same smart sorting<br><span style="color:#3fb950;font-size:.8em">e.g. Core Nexus Essential · 4K Essential</span>' },
      { v:'realdebrid',   icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="15" stroke="#10b981" stroke-width="1.5" fill="#10b981" fill-opacity=".06"/><path d="M15 22h14M22 15v14" stroke="#10b981" stroke-width="1.8" stroke-linecap="round"/><circle cx="22" cy="22" r="5" stroke="#10b981" stroke-width="1.2" fill="none"/><text x="22" y="42" text-anchor="middle" fill="#10b981" font-size="4.5" font-weight="800" letter-spacing=".3">RD</text></svg>', name:'Real-Debrid', desc:'Real-Debrid subscribers<br><span style="color:#dc2626;font-size:.8em">e.g. Core Nexus RD</span>' },
      { v:'alldebrid',    icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><path d="M22 6L38 34H6Z" stroke="#f97316" stroke-width="1.5" fill="#f97316" fill-opacity=".06" stroke-linejoin="round"/><path d="M22 16v10M22 30v.5" stroke="#f97316" stroke-width="2" stroke-linecap="round"/><text x="22" y="41" text-anchor="middle" fill="#f97316" font-size="4.5" font-weight="800" letter-spacing=".3">AD</text></svg>', name:'AllDebrid', desc:'AllDebrid subscribers<br><span style="color:#ea580c;font-size:.8em">e.g. Core Nexus AllDebrid · 4K AllDebrid</span>' },
      { v:'easynews',    icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="6" y="10" width="32" height="24" rx="4" stroke="#06b6d4" stroke-width="1.5" fill="#06b6d4" fill-opacity=".06"/><path d="M12 18l10 6 10-6" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 28l6-4M32 28l-6-4" stroke="#06b6d4" stroke-width="1.2" stroke-linecap="round"/><text x="22" y="9" text-anchor="middle" fill="#06b6d4" font-size="4" font-weight="700" letter-spacing=".3">EN</text></svg>', name:'EasyNews', desc:'Usenet — username &amp; password<br><span style="color:#0ea5e9;font-size:.8em">e.g. Speed EasyNews · Speed 4K+</span>' },
      { v:'premiumize',   icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="7" y="7" width="30" height="30" rx="8" stroke="#a78bfa" stroke-width="1.5" fill="#a78bfa" fill-opacity=".06"/><path d="M16 22l4 4 8-8" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="14" r="2" fill="#a78bfa" fill-opacity=".4"/></svg>', name:'Premiumize', desc:'Premiumize subscribers<br><span style="color:#d97706;font-size:.8em">e.g. Core Nexus Premiumize</span>' },
      { v:'easydebrid',  icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="7" y="8" width="30" height="28" rx="5" stroke="#10b981" stroke-width="1.5" fill="#10b981" fill-opacity=".06"/><text x="22" y="24" text-anchor="middle" fill="#10b981" font-size="11" font-weight="900" font-family="system-ui,sans-serif">ED</text><path d="M13 30h18" stroke="#10b981" stroke-width="1" stroke-linecap="round" stroke-opacity=".4"/><text x="22" y="7" text-anchor="middle" fill="#10b981" font-size="4.5" font-weight="700" letter-spacing=".3">EASY</text></svg>', name:'EasyDebrid', desc:'EasyDebrid subscribers · API key<br><span style="color:#10b981;font-size:.8em">multi-debrid aggregator service</span>' },
      { v:'debridlink',   icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><path d="M18 18l-4 4a5.66 5.66 0 008 8l4-4" stroke="#3b82f6" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M26 26l4-4a5.66 5.66 0 00-8-8l-4 4" stroke="#3b82f6" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="22" cy="22" r="14" stroke="#3b82f6" stroke-width="1" fill="#3b82f6" fill-opacity=".04" stroke-dasharray="3 3"/></svg>', name:'Debrid-Link', desc:'Debrid-Link subscribers<br><span style="color:#0284c7;font-size:.8em">e.g. Core Nexus Debrid-Link</span>' },
      { v:'offcloud',    icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><path d="M12 28a8 8 0 0114-6.5A6 6 0 0134 24a5 5 0 01-2 9.5H14a6 6 0 01-2-5.5z" stroke="#94a3b8" stroke-width="1.5" fill="#94a3b8" fill-opacity=".06"/><path d="M18 24h8M18 28h5" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round"/></svg>', name:'Offcloud', desc:'Cloud debrid — API key required<br><span style="color:#06b6d4;font-size:.8em">torrent + HTTP download caching</span>' },
      { v:'pikpak',      icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="7" y="8" width="30" height="28" rx="5" stroke="#38bdf8" stroke-width="1.5" fill="#38bdf8" fill-opacity=".06"/><path d="M17 16l10 6-10 6z" fill="#38bdf8" fill-opacity=".6" stroke="#38bdf8" stroke-width="1.2" stroke-linejoin="round"/><text x="22" y="7" text-anchor="middle" fill="#38bdf8" font-size="4" font-weight="800" letter-spacing=".3">PIKPAK</text></svg>', name:'PikPak', desc:'PikPak cloud storage · API key<br><span style="color:#38bdf8;font-size:.8em">cloud torrent + download caching</span>' },
      { v:'seedr',       icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="15" stroke="#a3e635" stroke-width="1.5" fill="#a3e635" fill-opacity=".05"/><circle cx="22" cy="22" r="6" fill="none" stroke="#a3e635" stroke-width="1.5"/><path d="M22 16v-4M19 17l-3-3M25 17l3-3" stroke="#a3e635" stroke-width="1.3" stroke-linecap="round"/><path d="M22 28v3" stroke="#a3e635" stroke-width="1.2" stroke-linecap="round" stroke-opacity=".4"/><text x="22" y="42" text-anchor="middle" fill="#a3e635" font-size="4.5" font-weight="800" letter-spacing=".3">SEEDR</text></svg>', name:'Seedr', desc:'Seedr cloud torrent · API key<br><span style="color:#a3e635;font-size:.8em">torrent to cloud streaming</span>' },
      { v:'debridio',     icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="15" stroke="#14b8a6" stroke-width="1.5" fill="#14b8a6" fill-opacity=".06"/><circle cx="19" cy="19" r="5.5" fill="none" stroke="#14b8a6" stroke-width="1.5"/><line x1="23" y1="23" x2="29" y2="29" stroke="#14b8a6" stroke-width="2" stroke-linecap="round"/><text x="22" y="42" text-anchor="middle" fill="#14b8a6" font-size="4" font-weight="800" letter-spacing=".3">DEBRIDIO</text></svg>', name:'Debridio', desc:'Debridio scraper · API key required<br><span style="color:#14b8a6;font-size:.8em">search + caching via Debridio</span>' },
      { v:'debrider',    icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="7" y="8" width="30" height="28" rx="5" stroke="#06b6d4" stroke-width="1.5" fill="#06b6d4" fill-opacity=".06"/><text x="22" y="22" text-anchor="middle" fill="#06b6d4" font-size="7" font-weight="900" font-family="system-ui,sans-serif">DBR</text><path d="M13 30h18" stroke="#06b6d4" stroke-width="1" stroke-linecap="round" stroke-opacity=".4"/><text x="22" y="34" text-anchor="middle" fill="#06b6d4" font-size="4.5" font-weight="700" letter-spacing=".3">DEBRIDER</text></svg>', name:'Debrider', desc:'Multi-debrid aggregator · API key<br><span style="color:#06b6d4;font-size:.8em">one API for multiple debrid services</span>' },
      { v:'p2p',         icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="7" y="7" width="30" height="30" rx="6" stroke="#8b5cf6" stroke-width="1.5" fill="#8b5cf6" fill-opacity=".05"/><circle cx="15" cy="22" r="4" fill="none" stroke="#8b5cf6" stroke-width="1.5"/><circle cx="29" cy="22" r="4" fill="none" stroke="#8b5cf6" stroke-width="1.5"/><line x1="19" y1="22" x2="25" y2="22" stroke="#8b5cf6" stroke-width="1.5"/><path d="M27 18l4-3M27 26l4 3M17 18l-4-3M17 26l-4 3" stroke="#8b5cf6" stroke-width="1.2" stroke-linecap="round" stroke-opacity=".5"/></svg>', name:'P2P Free', desc:'No subscription — torrents only<br><span style="color:#8b5cf6;font-size:.8em">free · no API key needed</span>' },
      { v:'http',        icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="15" stroke="#f472b6" stroke-width="1.5" fill="#f472b6" fill-opacity=".05"/><rect x="12" y="16" width="20" height="13" rx="2.5" fill="none" stroke="#f472b6" stroke-width="1.5"/><path d="M16 20l4 3-4 3" fill="none" stroke="#f472b6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="22" y1="26" x2="28" y2="26" stroke="#f472b6" stroke-width="1.5" stroke-linecap="round"/></svg>', name:'HTTP Streams', desc:'Streaming sites — no debrid, no torrents<br><span style="color:#f472b6;font-size:.8em">WebStreamr · Nuvio · Flix-Streams</span>' },
      { v:'nzbgeek', icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="7" y="8" width="30" height="28" rx="5" stroke="#22c55e" stroke-width="1.5" fill="#22c55e" fill-opacity=".06"/><text x="22" y="22" text-anchor="middle" fill="#22c55e" font-size="9" font-weight="900" font-family="system-ui,sans-serif">NZB</text><path d="M13 26h18" stroke="#22c55e" stroke-width="1" stroke-linecap="round" stroke-opacity=".4"/><text x="22" y="34" text-anchor="middle" fill="#22c55e" font-size="6.5" font-weight="700" font-family="system-ui,sans-serif">GEEK</text></svg>', name:'NZBGeek', desc:'Usenet indexer · API key required<br><span style="color:#22c55e;font-size:.8em">pairs with Meteor for Usenet coverage</span>' },
      { v:'streamnzb', icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="7" y="8" width="30" height="28" rx="5" stroke="#f59e0b" stroke-width="1.5" fill="#f59e0b" fill-opacity=".06"/><circle cx="22" cy="18" r="2" fill="#f59e0b"/><path d="M18 15c0 0 4-4 8 0" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M15 12c0 0 7-6 14 0" stroke="#f59e0b" stroke-width="1.3" stroke-linecap="round" fill="none" stroke-opacity=".5"/><path d="M13 23h18" stroke="#f59e0b" stroke-width="1" stroke-linecap="round" stroke-opacity=".4"/><text x="22" y="33" text-anchor="middle" fill="#f59e0b" font-size="9" font-weight="900" font-family="system-ui,sans-serif">NZB</text></svg>', name:'StreamNZB', desc:'Usenet streaming · manifest URL required<br><span style="color:#f59e0b;font-size:.8em">self-hosted Usenet indexer + streamer</span>' },
    ]
  },
  { id:'device', title:'Your Device', desc:'Sets audio format limits, codec exclusions, and HDR/DV handling.', key:'device', cols:'c1', layout:'device-hybrid', noHero:true,
    featured:['generic','onn','shield','firestick-4kmax','googletv','samsung'],
    opts:[
      { v:'generic',         icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg1"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#a78bfa" flood-opacity=".4"/></filter></defs><rect x="4" y="12" width="36" height="22" rx="2.5" stroke="#a78bfa" stroke-width="1.5" filter="url(#dg1)"/><rect x="7" y="14.5" width="30" height="17" rx="1" fill="#00d4ff" opacity=".06"/><line x1="17" y1="34" x2="14" y2="40" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/><line x1="27" y1="34" x2="30" y2="40" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="40" x2="32" y2="40" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/><circle cx="22" cy="7" r="2" stroke="#a78bfa" stroke-width="1.5" fill="none" filter="url(#dg1)"/><line x1="22" y1="9" x2="22" y2="12" stroke="#a78bfa" stroke-width="1.5"/></svg>', name:'Standard / Not Sure', desc:'Conservative video · DD+/AAC audio · broad compatibility', help:'Safe default when the exact playback hardware is unknown. Prioritises HEVC/AVC and streaming-grade DD+/AAC audio instead of assuming AV1 or lossless passthrough support.' },
      { v:'samsung',         icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg2"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#3b82f6" flood-opacity=".4"/></filter></defs><rect x="3" y="10" width="38" height="22" rx="2" stroke="#3b82f6" stroke-width="1.5" filter="url(#dg2)"/><rect x="6" y="12.5" width="32" height="17" rx="1" fill="#00d4ff" opacity=".06"/><rect x="19" y="32" width="6" height="3" rx="1" fill="#3b82f6" opacity=".5"/><path d="M13 39 Q22 36 31 39" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M28 19 Q26 17.5 24 19 Q22 20.5 20 19 Q18 17.5 16 19" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".5"/></svg>', name:'Samsung TV',           desc:'DV-Only Kill · AV1/VC-1 excluded · HDR10+', help:'<b>DV-Only Kill</b>: Samsung TVs have no Dolby Vision support — DV streams without an HDR10 fallback show a purple/green tint, so they are removed. <b>AV1 / VC-1 excluded</b>: 2018–2022 Samsung models lack these video decoders. <b>HDR10+</b> is Samsung&#39;s own HDR format and is prioritised.' },
      { v:'appletv-old',     icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg3"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#9ca3af" flood-opacity=".4"/></filter></defs><rect x="10" y="12" width="24" height="18" rx="5.5" stroke="#9ca3af" stroke-width="1.5" filter="url(#dg3)"/><rect x="10" y="12" width="24" height="18" rx="5.5" fill="#00d4ff" opacity=".05"/><path d="M20 20.5 C20 18.5 21.5 17.5 22.5 17.5 C23 17.5 23.3 17.7 23.8 17.9 C24.3 17.7 24.6 17.5 25 17.5 C26.5 17.5 28 18.5 28 20.5 C28 22.5 26.5 24 25 24 C24.6 24 24.3 23.8 23.8 23.6 C23.3 23.8 23 24 22.5 24 C21 24 20 22.5 20 20.5Z" fill="#9ca3af" filter="url(#dg3)"/><line x1="23.5" y1="16" x2="25" y2="13.5" stroke="#9ca3af" stroke-width="1.2" stroke-linecap="round"/><circle cx="22" cy="35" r="2.5" stroke="#9ca3af" stroke-width="1.5" fill="none"/><circle cx="22" cy="35" r="1" fill="#f59e0b"/></svg>', name:'Apple TV 4K Gen 1–2', desc:'DV · no AV1 · DD+/Atmos · multichannel PCM', help:'Dolby Vision is supported. Apple TV does not bitstream TrueHD or DTS-HD; compatible apps may decode them to multichannel PCM, but lossless Atmos metadata is not preserved. AV1 is excluded for reliable high-bitrate playback.' },
      { v:'appletv-new',     icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg4"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#60a5fa" flood-opacity=".4"/></filter></defs><rect x="10" y="12" width="24" height="18" rx="5.5" stroke="#60a5fa" stroke-width="1.5" filter="url(#dg4)"/><rect x="10" y="12" width="24" height="18" rx="5.5" fill="#00d4ff" opacity=".05"/><path d="M20 20.5 C20 18.5 21.5 17.5 22.5 17.5 C23 17.5 23.3 17.7 23.8 17.9 C24.3 17.7 24.6 17.5 25 17.5 C26.5 17.5 28 18.5 28 20.5 C28 22.5 26.5 24 25 24 C24.6 24 24.3 23.8 23.8 23.6 C23.3 23.8 23 24 22.5 24 C21 24 20 22.5 20 20.5Z" fill="#60a5fa" filter="url(#dg4)"/><line x1="23.5" y1="16" x2="25" y2="13.5" stroke="#60a5fa" stroke-width="1.2" stroke-linecap="round"/><circle cx="22" cy="35" r="2.5" stroke="#60a5fa" stroke-width="1.5" fill="none" filter="url(#dg4)"/></svg>', name:'Apple TV 4K Gen 3',   desc:'DV · HDR10+ · no hardware AV1 · DD+/Atmos', help:'Apple TV 4K Gen 3 adds HDR10+ but the A15 does not include an AV1 hardware decoder. TrueHD/DTS-HD are not bitstreamed; compatible apps may decode to multichannel PCM.' },
      { v:'lgtv',            icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg5"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#ef4444" flood-opacity=".4"/></filter></defs><rect x="3" y="8" width="38" height="24" rx="2" stroke="#ef4444" stroke-width="1.5" filter="url(#dg5)"/><rect x="6" y="10.5" width="32" height="19" rx="1" fill="#00d4ff" opacity=".06"/><rect x="18" y="32" width="8" height="3" rx="1" fill="#ef4444" opacity=".4"/><line x1="13" y1="39" x2="31" y2="39" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/><path d="M19 20 L19 23 L24 23" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>', name:'LG TV webOS',          desc:'DV · AV1 varies · DD+/Atmos · no internal-app TrueHD', help:'LG webOS supports Dolby Vision. AV1 depends on model year. Internal TV apps generally do not pass TrueHD/DTS-HD over eARC, so the profile uses streaming-grade audio; external HDMI devices are a separate path.' },
      { v:'windows',         icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg6"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#38bdf8" flood-opacity=".4"/></filter></defs><rect x="4" y="7" width="36" height="24" rx="2.5" stroke="#38bdf8" stroke-width="1.5" filter="url(#dg6)"/><rect x="7" y="9.5" width="30" height="19" rx="1" fill="#00d4ff" opacity=".06"/><rect x="18" y="31" width="8" height="3" rx="1" fill="#38bdf8" opacity=".4"/><line x1="13" y1="38" x2="31" y2="38" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/><line x1="13" y1="14" x2="21" y2="12.5" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/><line x1="13" y1="19.5" x2="21" y2="18" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/><line x1="13" y1="25" x2="21" y2="23.5" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/><line x1="23" y1="12" x2="31" y2="10.5" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/><line x1="23" y1="17.5" x2="31" y2="16" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/><line x1="23" y1="23" x2="31" y2="21.5" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/></svg>', name:'Windows PC',           desc:'Full lossless · AV1 · HDR-first · 7.1', help:'PCs can decode anything in software if needed, so nothing is excluded. <b>HDR-first</b>: HDR streams ranked above SDR. Full lossless audio ranked for external DACs and receivers.' },
      { v:'firestick-hd',    icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg7"><feDropShadow dx="0" dy="0" stdDeviation="1.8" flood-color="#f97316" flood-opacity=".4"/></filter></defs><rect x="6" y="23" width="24" height="9" rx="4.5" stroke="#f97316" stroke-width="1.5" filter="url(#dg7)"/><rect x="6" y="23" width="24" height="9" rx="4.5" fill="#00d4ff" opacity=".04"/><rect x="32" y="25" width="7" height="5" rx="1.5" fill="#f97316" opacity=".35"/><path d="M18 23 C18 19 16 15 18 12 C18 12 19.5 14 21 13 C21 10 23 7 24.5 5 C24.5 5 24.5 9 27 12 C28.5 14 28 16.5 26 18.5 C26 18.5 26 16 24 17 C24 20 22 23 18 23Z" fill="#f97316" filter="url(#dg7)"/></svg>', name:'Fire Stick HD',        desc:'DV-Only Kill · no AV1/lossless · HDR10/HLG', help:'The HD stick has no Dolby Vision, no AV1 decoder, and no lossless audio passthrough — those streams are removed or down-ranked so everything actually plays. <b>HDR10 / HLG</b> still work.' },
      { v:'firestick-4kmax', icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg8"><feDropShadow dx="0" dy="0" stdDeviation="1.8" flood-color="#fb923c" flood-opacity=".4"/></filter></defs><rect x="6" y="23" width="24" height="9" rx="4.5" stroke="#fb923c" stroke-width="1.5" filter="url(#dg8)"/><rect x="6" y="23" width="24" height="9" rx="4.5" fill="#00d4ff" opacity=".04"/><rect x="32" y="25" width="7" height="5" rx="1.5" fill="#fb923c" opacity=".35"/><path d="M16 23 C16 18 14 13 17 9 C17 9 19 13 21 11.5 C21 7 24 3 25.5 2 C25.5 2 25.5 7 29 10.5 C31 13 30.5 15.5 28 18.5 C28 18.5 28 15.5 25.5 16.5 C25.5 20 23 23 16 23Z" fill="#fb923c" filter="url(#dg8)"/><circle cx="18" cy="27.5" r="1.5" fill="#fb923c" opacity=".5"/></svg>', name:'Fire Stick 4K Max',   desc:'DV · AV1 · VC-1 excluded · HD audio varies by generation', help:'All 4K Max models support Dolby Vision and AV1. The 2nd generation officially supports TrueHD/DTS-HD passthrough, while earlier firmware and apps vary; Standard audio is the safe default.' },
      { v:'shield',          icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg9"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#84cc16" flood-opacity=".4"/></filter></defs><path d="M22 5 L34 11 L34 25 Q34 32 22 37 Q10 32 10 25 L10 11 Z" stroke="#84cc16" stroke-width="1.5" stroke-linejoin="round" fill="none" filter="url(#dg9)"/><path d="M22 8 L31 13 L31 25 Q31 30 22 34" fill="#00d4ff" opacity=".05"/><path d="M22 15 L28 18 L28 24 Q28 27 22 29 Q16 27 16 24 L16 18 Z" stroke="#84cc16" stroke-width="1" stroke-linejoin="round" fill="#84cc16" opacity=".15" filter="url(#dg9)"/></svg>', name:'Nvidia Shield',          desc:'No AV1 · no HLG · DV · lossless audio', help:'<b>No AV1</b>: the Nvidia Shield (2019) has no AV1 decoder. <b>No HLG</b>: a broadcast HDR format with known Shield playback issues. Everything else, including Dolby Vision and lossless audio, works.' },
      { v:'googletv',          icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg16"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#4285f4" flood-opacity=".4"/></filter></defs><rect x="8" y="14" width="28" height="16" rx="8" stroke="#4285f4" stroke-width="1.5" filter="url(#dg16)" fill="none"/><rect x="8" y="14" width="28" height="16" rx="8" fill="#00d4ff" opacity=".04"/><circle cx="17" cy="22" r="3" fill="#ea4335" opacity=".7"/><circle cx="22" cy="22" r="3" fill="#fbbc04" opacity=".7"/><circle cx="27" cy="22" r="3" fill="#34a853" opacity=".7"/><circle cx="22" cy="22" r="3" fill="#4285f4" opacity=".5"/><line x1="18" y1="33" x2="26" y2="33" stroke="#4285f4" stroke-width="1.3" stroke-linecap="round" opacity=".4"/><line x1="22" y1="30" x2="22" y2="32" stroke="#4285f4" stroke-width="1.3" stroke-linecap="round" opacity=".4"/></svg>', name:'Google TV Streamer',    desc:'DV · AV1 · no lossless · DD+ Atmos · HDR10+', help:'Google TV Streamer (2024) — DV, HDR10+, HDR10, HLG all supported. AV1 hardware decode. No lossless audio passthrough — DD+ Atmos is the ceiling, 5.1 channels max. Similar to Chromecast with Google TV but newer hardware.' },
      { v:'roku',            icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg10"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#7c3aed" flood-opacity=".4"/></filter></defs><rect x="12" y="6" width="20" height="32" rx="4" stroke="#7c3aed" stroke-width="1.5" fill="none" filter="url(#dg10)"/><rect x="12" y="6" width="20" height="32" rx="4" fill="#00d4ff" opacity=".05"/><circle cx="22" cy="16" r="4.5" stroke="#7c3aed" stroke-width="1.3" fill="none" filter="url(#dg10)"/><circle cx="22" cy="16" r="1.5" fill="#7c3aed"/><circle cx="18" cy="26" r="2" stroke="#7c3aed" stroke-width="1.1" fill="none"/><circle cx="26" cy="26" r="2" stroke="#7c3aed" stroke-width="1.1" fill="none"/><rect x="18" y="31" width="8" height="3" rx="1.5" stroke="#7c3aed" stroke-width="1.1" fill="none"/></svg>', name:'Roku',                   desc:'HDR10 safe · DV/AV1 vary by model · no TrueHD', help:'Roku capabilities differ substantially by model. This conservative profile excludes DV-only and lossless audio; newer Roku Ultra models can handle Dolby Vision and AV1.' },
      { v:'chromecast',      icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg11"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#4285f4" flood-opacity=".4"/></filter></defs><circle cx="22" cy="18" r="11" stroke="#4285f4" stroke-width="1.5" fill="none" filter="url(#dg11)"/><circle cx="22" cy="18" r="11" fill="#00d4ff" opacity=".04"/><circle cx="22" cy="18" r="4" fill="#34a853" opacity=".6" filter="url(#dg11)"/><rect x="19" y="30" width="6" height="8" rx="3" stroke="#4285f4" stroke-width="1.5" fill="none"/></svg>', name:'Chromecast w/ Google TV', desc:'DV · no AV1 on 4K model · DD+/Atmos', help:'Chromecast with Google TV 4K supports Dolby Vision but not AV1 hardware decode. The separate 1080p HD model supports AV1. This profile follows the more common 4K model and uses DD+/Atmos audio.' },
      { v:'sony',            icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg12"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#2563eb" flood-opacity=".4"/></filter></defs><rect x="3" y="9" width="38" height="23" rx="1.5" stroke="#2563eb" stroke-width="1.5" filter="url(#dg12)"/><rect x="6" y="11.5" width="32" height="18" rx="1" fill="#00d4ff" opacity=".06"/><rect x="18" y="32" width="8" height="3" rx="1" fill="#2563eb" opacity=".4"/><line x1="13" y1="39" x2="31" y2="39" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round"/><path d="M14 19 Q16 17 18 19 Q20 21 22 19 Q24 17 26 19 Q28 21 30 19" stroke="#2563eb" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".5"/></svg>', name:'Sony Bravia',            desc:'DV · AV1 varies · DD+/Atmos · no internal-app TrueHD', help:'Recent Sony Google TVs support Dolby Vision and some support AV1, but capabilities vary by model year. Internal TV apps do not reliably pass TrueHD/DTS-HD, so Standard audio is recommended.' },
      { v:'android-mobile', icon:ICO.androidMobile(), name:'Android Phone / Tablet', desc:'Conservative mobile profile · HEVC/AVC · AAC/DD+', help:'Model and playback-app capabilities vary. AV1, lossless audio, and Dolby Vision are not assumed.' },
      { v:'android-tv', icon:ICO.androidTv(), name:'Android TV / Google TV', desc:'4K HDR · HEVC/AV1 · DD+ Atmos', help:'Generic Android TV profile with conservative 5.1 audio and conditional Dolby Vision/passthrough.' },
      { v:'samsung-tizen', icon:ICO.samsungTv(), name:'Samsung Tizen TV', desc:'4K HDR10+ · HEVC · no Dolby Vision', help:'Samsung TVs do not support Dolby Vision; exact codec support varies by model year.' },
      { v:'lg-webos', icon:ICO.lgTv(), name:'LG webOS TV', desc:'4K HDR · HEVC · conditional Dolby Vision', help:'Model-year dependent profile with conservative audio passthrough.' },
      { v:'sony-google-tv', icon:ICO.sonyGoogleTv(), name:'Sony / Google TV', desc:'4K HDR · HEVC/AV1 · DD+ Atmos', help:'Capabilities vary by Sony model, Android version, and playback app.' },
      { v:'generic-4k-hdr-tv', icon:ICO.generic4kTv(), name:'Generic 4K HDR TV', desc:'Conservative 4K HDR profile · HEVC', help:'Safe profile for an unknown 4K HDR television.' },
      { v:'ipad',            icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg13"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#a1a1aa" flood-opacity=".3"/></filter></defs><rect x="10" y="5" width="24" height="34" rx="3.5" stroke="#a1a1aa" stroke-width="1.5" fill="none" filter="url(#dg13)"/><rect x="10" y="5" width="24" height="34" rx="3.5" fill="#00d4ff" opacity=".04"/><rect x="13" y="8" width="18" height="25" rx="1" fill="#a1a1aa" opacity=".08"/><line x1="19" y1="36" x2="25" y2="36" stroke="#a1a1aa" stroke-width="1.5" stroke-linecap="round"/><circle cx="22" cy="6.5" r="1" fill="#a1a1aa" opacity=".4"/></svg>', name:'iPad / iPhone',          desc:'DV · AV1 on newer chips only · AAC/DD+ audio', help:'Dolby Vision is broadly supported. AV1 hardware decoding starts with newer Apple silicon such as A17 Pro/A18 and M-series generations; the conservative profile excludes AV1 for older iPhones and iPads.' },
      { v:'projector',       icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg14"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#eab308" flood-opacity=".4"/></filter></defs><rect x="5" y="14" width="34" height="18" rx="3" stroke="#eab308" stroke-width="1.5" filter="url(#dg14)"/><rect x="5" y="14" width="34" height="18" rx="3" fill="#00d4ff" opacity=".05"/><circle cx="16" cy="23" r="5" stroke="#eab308" stroke-width="1.5" fill="none"/><circle cx="16" cy="23" r="2" fill="#eab308" opacity=".6"/><line x1="24" y1="20" x2="35" y2="20" stroke="#eab308" stroke-width="1.2" stroke-linecap="round" opacity=".4"/><line x1="24" y1="23.5" x2="32" y2="23.5" stroke="#eab308" stroke-width="1.2" stroke-linecap="round" opacity=".4"/><line x1="24" y1="27" x2="29" y2="27" stroke="#eab308" stroke-width="1.2" stroke-linecap="round" opacity=".4"/><line x1="11" y1="32" x2="11" y2="38" stroke="#eab308" stroke-width="1.5" stroke-linecap="round"/><line x1="33" y1="32" x2="33" y2="38" stroke="#eab308" stroke-width="1.5" stroke-linecap="round"/></svg>', name:'Projector',              desc:'HDR10 · no DV · no lossless · AV1 varies', help:'Most projectors (Epson, BenQ, XGIMI) lack Dolby Vision — DV-Only streams are killed. HDR10 is the primary HDR format. Audio depends on your receiver/soundbar. AV1 support varies by model — excluded by default for safety.' },
      { v:'onn',             icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg15"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#f59e0b" flood-opacity=".4"/></filter></defs><rect x="8" y="12" width="28" height="16" rx="2.5" stroke="#f59e0b" stroke-width="1.5" filter="url(#dg15)"/><rect x="8" y="12" width="28" height="16" rx="2.5" fill="#00d4ff" opacity=".05"/><circle cx="22" cy="20" r="4" stroke="#f59e0b" stroke-width="1.3" fill="none" filter="url(#dg15)"/><circle cx="22" cy="20" r="1.5" fill="#f59e0b" opacity=".6"/><line x1="16" y1="33" x2="28" y2="33" stroke="#f59e0b" stroke-width="1.3" stroke-linecap="round" opacity=".4"/><line x1="22" y1="28" x2="22" y2="31" stroke="#f59e0b" stroke-width="1.3" stroke-linecap="round" opacity=".4"/></svg>', name:'ONN Box',                desc:'AV1 · HDR10 · DV only on Pro models · DD+/Atmos', help:'ONN hardware varies: recent boxes support AV1, while Dolby Vision is mainly a Pro-model capability. The shared profile avoids DV-only streams and lossless audio for broad compatibility.' },
      { v:'xiaomi',            icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg17"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#ff6900" flood-opacity=".4"/></filter></defs><rect x="8" y="12" width="28" height="18" rx="3" stroke="#ff6900" stroke-width="1.5" filter="url(#dg17)" fill="none"/><rect x="8" y="12" width="28" height="18" rx="3" fill="#00d4ff" opacity=".04"/><text x="22" y="24" text-anchor="middle" fill="#ff6900" font-size="8" font-weight="800" font-family="system-ui,sans-serif" opacity=".7">Mi</text><line x1="18" y1="33" x2="26" y2="33" stroke="#ff6900" stroke-width="1.3" stroke-linecap="round" opacity=".4"/><line x1="22" y1="30" x2="22" y2="32" stroke="#ff6900" stroke-width="1.3" stroke-linecap="round" opacity=".4"/></svg>', name:'Xiaomi Mi Box S (2nd Gen)', desc:'DV · HDR10+ · AV1 · Atmos/DTS-HD support', help:'Xiaomi TV Box S 2nd gen uses an Amlogic S905X4-class decoder with AV1, Dolby Vision, HDR10+, HDR10 and HLG support. HD-audio passthrough can depend on player and firmware, so Standard audio is recommended.' },
      { v:'xiaomi-3rd',        icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><defs><filter id="dg18"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#ff6900" flood-opacity=".4"/></filter></defs><rect x="8" y="12" width="28" height="18" rx="3" stroke="#ff6900" stroke-width="1.5" filter="url(#dg18)" fill="none"/><rect x="8" y="12" width="28" height="18" rx="3" fill="#00d4ff" opacity=".04"/><text x="22" y="24" text-anchor="middle" fill="#ff6900" font-size="8" font-weight="800" font-family="system-ui,sans-serif" opacity=".7">Mi</text><circle cx="32" cy="14" r="3" fill="#ff6900" opacity=".5"/><line x1="18" y1="33" x2="26" y2="33" stroke="#ff6900" stroke-width="1.3" stroke-linecap="round" opacity=".4"/><line x1="22" y1="30" x2="22" y2="32" stroke="#ff6900" stroke-width="1.3" stroke-linecap="round" opacity=".4"/></svg>', name:'Xiaomi Mi Box S (3rd Gen)', desc:'DV · HDR10+ · AV1 · Standard audio recommended', help:'Xiaomi TV Box S 3rd gen supports AV1 and modern HDR formats. Audio passthrough still varies by app and firmware, so the profile avoids assuming a full lossless home-theatre chain.' },
    ]
  },
  { id:'resolution', title:'Video Quality', desc:'Choose your target resolution, HDR and audio compatibility.', key:'resolution', cols:'c1', layout:'svc-list', noHero:true,
    opts:[
      { v:'4k',        icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><polygon points="22,3 40,16 22,42 4,16" stroke="#7c3aed" stroke-width="2" fill="#1a0a3a"/><polygon points="22,3 40,16 22,16 4,16" fill="#7c3aed" opacity="0.4"/><text x="22" y="34" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="800" font-family="system-ui,sans-serif">4K</text></svg>', name:'4K HDR',        desc:'2160p first · 1080p fallback · for 4K displays' },
      { v:'1080p',     icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="3" y="8" width="38" height="24" rx="3" stroke="#3b82f6" stroke-width="2" fill="#0a1428"/><text x="22" y="25" text-anchor="middle" fill="#3b82f6" font-size="11" font-weight="800" font-family="system-ui,sans-serif">1080p</text><rect x="17" y="32" width="10" height="4" rx="1" fill="#3b82f6"/><line x1="13" y1="40" x2="31" y2="40" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>', name:'1080p',          desc:'Hard lock · 2160p excluded · bandwidth-friendly' },
      { v:'mixed',     icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="3" y="7" width="38" height="8" rx="2" stroke="#f59e0b" stroke-width="1.5" fill="#f59e0b" fill-opacity=".07"/><text x="22" y="13.4" text-anchor="middle" fill="#f59e0b" font-size="5.5" font-weight="800" font-family="system-ui,sans-serif">4K</text><rect x="3" y="18" width="38" height="8" rx="2" stroke="#22c55e" stroke-width="1.5" fill="#22c55e" fill-opacity=".07"/><text x="22" y="24.4" text-anchor="middle" fill="#22c55e" font-size="5.5" font-weight="800" font-family="system-ui,sans-serif">1080p</text><rect x="3" y="29" width="38" height="8" rx="2" stroke="#00d4ff" stroke-width="1.5" fill="#00d4ff" fill-opacity=".07"/><text x="22" y="35.4" text-anchor="middle" fill="#00d4ff" font-size="5.5" font-weight="800" font-family="system-ui,sans-serif">720p+</text></svg>', name:'Mixed · Adaptive', desc:'No hard caps · cached × quality blend · niche-friendly' },
      { v:'ultrawide', icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="2" y="11" width="40" height="22" rx="2" stroke="#8b5cf6" stroke-width="2" fill="#0e0a1f"/><text x="22" y="26" text-anchor="middle" fill="#8b5cf6" font-size="8" font-weight="700" font-family="system-ui,sans-serif">21 : 9</text><rect x="17" y="33" width="10" height="4" rx="1" fill="#8b5cf6"/><line x1="12" y1="41" x2="32" y2="41" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/></svg>', name:'Ultrawide',      desc:'1080p → 1440p → 4K tiers · pair with Windows PC device' },
    ]
  },
  { id:'content', title:'Content Preferences', desc:'What will you primarily watch? Not sure? <strong style="color:#e6edf3">Skip — it covers everything.</strong>', key:'content', cols:'c1', layout:'svc-list', noHero:true,
    opts:[
      { v:'all',   icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="18" stroke="#64748b" stroke-width="2" fill="#0f172a"/><circle cx="15" cy="16" r="4.5" fill="#ef4444" opacity="0.85"/><circle cx="29" cy="16" r="4.5" fill="#3b82f6" opacity="0.85"/><circle cx="15" cy="28" r="4.5" fill="#f9a8d4" opacity="0.85"/><circle cx="29" cy="28" r="4.5" fill="#94a3b8" opacity="0.6"/></svg>', name:'Everything',       desc:'Movies · TV · anime · safe default' },
      { v:'live',  icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="5" y="17" width="34" height="22" rx="2" fill="#1a0808" stroke="#ef4444" stroke-width="2"/><rect x="5" y="9" width="34" height="10" rx="2" fill="#ef4444"/><line x1="13" y1="9" x2="9" y2="19" stroke="#1a0808" stroke-width="3" stroke-linecap="round"/><line x1="21" y1="9" x2="17" y2="19" stroke="#1a0808" stroke-width="3" stroke-linecap="round"/><line x1="29" y1="9" x2="25" y2="19" stroke="#1a0808" stroke-width="3" stroke-linecap="round"/><line x1="37" y1="9" x2="33" y2="19" stroke="#1a0808" stroke-width="3" stroke-linecap="round"/><line x1="9" y1="25" x2="35" y2="25" stroke="#ef4444" stroke-width="1" opacity="0.5"/><line x1="9" y1="31" x2="35" y2="31" stroke="#ef4444" stroke-width="1" opacity="0.5"/></svg>', name:'Movies & TV',      desc:'Films &amp; series · no anime scrapers' },
      { v:'mixed', icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="3" y="15" width="18" height="22" rx="2" fill="#1a0808" stroke="#ef4444" stroke-width="1.5"/><rect x="3" y="8" width="18" height="9" rx="2" fill="#ef4444"/><line x1="9" y1="8" x2="6" y2="17" stroke="#1a0808" stroke-width="2" stroke-linecap="round"/><line x1="15" y1="8" x2="12" y2="17" stroke="#1a0808" stroke-width="2" stroke-linecap="round"/><line x1="21" y1="8" x2="18" y2="17" stroke="#1a0808" stroke-width="2" stroke-linecap="round"/><circle cx="33" cy="13" r="4" fill="#f9a8d4"/><circle cx="39" cy="19" r="4" fill="#f9a8d4"/><circle cx="37" cy="27" r="4" fill="#f9a8d4"/><circle cx="27" cy="27" r="4" fill="#f9a8d4"/><circle cx="25" cy="19" r="4" fill="#f9a8d4"/><circle cx="33" cy="22" r="5" fill="#fce7f3"/></svg>', name:'Movies + Anime',   desc:'Movies &amp; TV + SeaDex anime releases' },
      { v:'anime', icon:'<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="13" r="5.5" fill="#f9a8d4"/><circle cx="31" cy="18" r="5.5" fill="#f9a8d4"/><circle cx="28" cy="29" r="5.5" fill="#f9a8d4"/><circle cx="16" cy="29" r="5.5" fill="#f9a8d4"/><circle cx="13" cy="18" r="5.5" fill="#f9a8d4"/><circle cx="22" cy="22" r="5.5" fill="#fce7f3"/><circle cx="22" cy="22" r="2" fill="#f472b6"/><line x1="37" y1="5" x2="37" y2="10" stroke="#f9a8d4" stroke-width="1.5" stroke-linecap="round"/><line x1="34.5" y1="7.5" x2="39.5" y2="7.5" stroke="#f9a8d4" stroke-width="1.5" stroke-linecap="round"/></svg>', name:'Anime',            desc:'SeaDex Best-Only · confirmed best releases' },
    ]
  },
  { id:'apis', title:'Accounts & Keys', desc:'Optional — add credentials for selected providers. <strong style="color:#3fb950">Export JSON</strong> keeps the generated file local; <strong style="color:#fbbf24">Direct Install</strong> sends it to the AIOStreams host you choose.', key:null, cols:'c1', opts:[] },
  { id:'review', title:'Review & Install', desc:'Confirm your settings, install directly, or generate a manifest URL.', key:null, cols:'c2', opts:[] }
];

const RADIO_ALLOWED = (() => {
  const m = {};
  for (const d of DEFS) {
    if (d && d.key && Array.isArray(d.opts)) m[d.key] = new Set(d.opts.map(o => o.v));
  }
  return m;
})();

/* STATE MANAGEMENT */
const STATE_SCHEMA = 4;
function migrateState(input) {
  const d={...(input||{})}, schema=Number(d._schema||0);
  if(schema<1){
    if(DEVICE_FORCE_LIMITED_AUDIO.has(d.device) && ['lossless','dolby'].includes(d.audio)) d.audio=DEVICE_AUDIO_DEFAULTS[d.device]||'standard';
    if(!Array.isArray(d.multiServices)) d.multiServices=[];
    if(!Array.isArray(d.optionalScrapers)) d.optionalScrapers=[];
    if(typeof d.cleanInstall!=='boolean') d.cleanInstall=false;
    if(!d.quickProfile) d.quickProfile='balanced';
  }
  if(schema<2){
    if(typeof d.preloadEnabled!=='boolean') d.preloadEnabled=true;
    if(!['matchingFile','matchingIndex','firstFile'].includes(d.autoPlayMethod)) d.autoPlayMethod='matchingFile';
    if(![4000,6000,8000,10000].includes(Number(d.addonTimeout))) d.addonTimeout=6000;
  }
  if(schema<3){
    if(!['auto', ...OUTPUT_PROFILES].includes(d.outputProfile)) d.outputProfile='auto';
  }
  if(schema<4){
    if(!AIOSTREAMS_COMPATIBILITY_TARGETS.includes(d.aiostreamsVersion)) d.aiostreamsVersion='2.32.0';
  }
  d._schema=STATE_SCHEMA; return d;
}
function saveState() {
  const {stremioPassword: _, ...persist} = S;
  persist._schema=STATE_SCHEMA;
  localStorage.setItem('coreBuild', JSON.stringify(persist));
  localStorage.setItem('coreBuildStep', step);
  if (S.service) localStorage.setItem('coreBuildLastSvc', S.service);
  const badge = document.getElementById('autoSavedBadge');
  if (badge) { badge.classList.add('show'); clearTimeout(saveState._t); saveState._t = setTimeout(() => badge.classList.remove('show'), 2000); }
}
// Only wizard selections are shareable — never credentials, tokens, UUIDs, or passwords
const SHARE_KEYS = ['device','resolution','audio','content','name','multiServices','sizeLimit','formatter','p2pEnabled','qualityFirst','resolutionFirst','foreignLangKill','matchMode','exclude4K','excludeDV','quickStart','langs','langExclusive','cacheMode','streamPool','instanceHost','simpleMode','outputProfile','aiostreamsVersion','pseArch','subtitleLangs','subtitleAddons','proxyEnabled','proxiedServices','catalogs','dedupMerge','optionalScrapers','preloadEnabled','autoPlayMethod','addonTimeout','bandwidthMbps','patchCinemeta','installAIOMeta','ageLimit','libraryBoost','nzbFailover','nzbFailoverPosition','maxFailoverNzbs'];
function shareConfig() {
  try {
    const pub = {};
    SHARE_KEYS.forEach(k => { pub[k] = S[k]; });
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(pub))));
    const url = location.origin + location.pathname + '#cfg=' + encoded;
    navigator.clipboard.writeText(url).then(() => showToast('Share link copied — settings only, no API keys or passwords included'));
  } catch(e) { showToast('Failed to copy share link', true); }
}

function sanitizeSharedConfig(d) {
  if (!d || typeof d !== 'object') return {};
  const optVals = key => { const def = DEFS.find(x => x.key === key); return def ? def.opts.map(o => o.v) : []; };
  const SVC_IDS = ['torbox-pro','torbox-ess','alldebrid','realdebrid','premiumize','debridlink','easynews','offcloud','debridio','debrider','easydebrid','pikpak','seedr','p2p','http','nzbgeek','streamnzb'];
  const out = {};
  const pick = (k, ok) => { if (k in d && ok(d[k])) out[k] = d[k]; };
  pick('device',       v => optVals('device').includes(v));
  pick('resolution',   v => optVals('resolution').includes(v));
  pick('content',      v => optVals('content').includes(v));
  pick('audio',        v => ['lossless','standard','limited','dolby'].includes(v));
  pick('formatter',    v => v === 'custom' || FORMATTERS.some(f => f.id === v));
  pick('matchMode',    v => ['relaxed','balanced','strict'].includes(v));
  pick('cacheMode',    v => ['mixed','cached','uncached'].includes(v));
  pick('streamPool',   v => ['normal','large','max'].includes(v));
  pick('pseArch',      v => ['standard','iqr','apex-mixed'].includes(v));
  pick('outputProfile', v => ['auto', ...OUTPUT_PROFILES].includes(v));
  pick('aiostreamsVersion', v => AIOSTREAMS_COMPATIBILITY_TARGETS.includes(v));
  pick('sizeLimit',    v => ['10','20','30','50','unlimited'].includes(String(v).replace(/GB$/,'')));
  pick('ageLimit',     v => AGE_RATINGS.some(r => r.v === v));
  pick('libraryBoost', v => ['none','default','strong'].includes(v));
  pick('nzbFailoverPosition', v => ['before-torrents','after-torrents'].includes(v));
  pick('maxFailoverNzbs', v => [1,2,3,5].includes(Number(v)));
  pick('instanceHost', v => v === 'auto' || v === 'custom' || Object.prototype.hasOwnProperty.call(HOST_BASE_URLS, v));
  ['p2pEnabled','qualityFirst','resolutionFirst','foreignLangKill','exclude4K','excludeDV','quickStart','langExclusive','simpleMode','dedupMerge','proxyEnabled','preloadEnabled','patchCinemeta','installAIOMeta','nzbFailover'].forEach(k => pick(k, v => typeof v === 'boolean'));
  pick('autoPlayMethod', v => ['matchingFile','matchingIndex','firstFile'].includes(v));
  pick('addonTimeout', v => [4000,6000,8000,10000].includes(Number(v)));
  if (Array.isArray(d.multiServices)) out.multiServices = d.multiServices.filter(v => SVC_IDS.includes(v));
  if (Array.isArray(d.langs)) { const l = d.langs.filter(v => LANG_OPTS.some(o => o.v === v)); if (l.length) out.langs = l; }
  if (typeof d.name === 'string') out.name = d.name.replace(/[<>"'&`]/g, '').slice(0, 60);
  if (Array.isArray(d.optionalScrapers)) out.optionalScrapers = d.optionalScrapers.filter(v => OPTIONAL_SCRAPER_DEFS.some(x => x.id === v));
  if (Array.isArray(d.subtitleAddons)) out.subtitleAddons = d.subtitleAddons.filter(v => ['aiosubtitle', 'opensubtitles-v3-plus', 'subdl'].includes(v));
  if (Array.isArray(d.subtitleLangs)) out.subtitleLangs = d.subtitleLangs.filter(v => typeof v === 'string' && v.length >= 2 && v.length <= 5);
  if (Array.isArray(d.catalogs)) out.catalogs = d.catalogs.filter(v => ['tmdb-addon', 'streaming-catalogs', 'anime-catalogs', 'rpdb-catalogs', 'torrent-catalogs'].includes(v));
  if (Array.isArray(d.proxiedServices)) out.proxiedServices = d.proxiedServices.filter(v => SVC_IDS.includes(v));
  return out;
}

function saveLastGen() {
  try {
    const snap = {}; SHARE_KEYS.forEach(k => { snap[k] = S[k]; });
    snap._ver = CONFIGURATOR_VERSION;
    snap._ts = Date.now();
    localStorage.setItem('coreBuildLastGen', JSON.stringify(snap));
  } catch(e) {}
  saveBackup();
}
const BACKUP_MAX = 20;
function saveBackup() {
  try {
    const snap = {}; SHARE_KEYS.forEach(k => { snap[k] = S[k]; });
    snap._ts = Date.now();
    snap._ver = CONFIGURATOR_VERSION;
    const list = JSON.parse(localStorage.getItem('coreBuildBackups') || '[]');
    const same = (a, b) => SHARE_KEYS.every(k => JSON.stringify(a[k]) === JSON.stringify(b[k]));
    const deduped = list.filter(entry => !same(entry, snap));
    deduped.unshift(snap);
    const list2 = deduped;
    if (list2.length > BACKUP_MAX) list2.length = BACKUP_MAX;
    localStorage.setItem('coreBuildBackups', JSON.stringify(list2));
  } catch(e) {}
}
function getBackups() {
  try { return JSON.parse(localStorage.getItem('coreBuildBackups') || '[]'); } catch(e) { return []; }
}
function restoreBackup(idx) {
  const list = getBackups();
  if (!list[idx]) return;
  const snap = list[idx];
  const safe = sanitizeSharedConfig(snap);
  Object.assign(S, safe);
  S.service = deriveService();
  saveState();
  render();
  showToast('Restored backup from ' + new Date(snap._ts).toLocaleString());
}
function deleteBackup(idx) {
  try {
    const list = getBackups();
    list.splice(idx, 1);
    localStorage.setItem('coreBuildBackups', JSON.stringify(list));
  } catch(e) {}
}
function backupTimelineHtml() {
  const list = getBackups();
  if (!list.length) return '';
  const rows = list.map((b, i) => {
    const d = new Date(b._ts);
    const time = d.toLocaleDateString(undefined, {month:'short',day:'numeric'}) + ' ' + d.toLocaleTimeString(undefined, {hour:'2-digit',minute:'2-digit'});
    const svc = b.multiServices && b.multiServices.length ? b.multiServices[0] : (b.device || '?');
    const res = b.resolution || '?';
    return `<div class="bk-row" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;transition:background .12s" onmouseover="this.style.background='rgba(255,255,255,.04)'" onmouseout="this.style.background='transparent'"><span style="font-size:.68rem;color:#6b7280;min-width:110px">${time}</span><span style="font-size:.68rem;color:#8b949e;flex:1">${svc} · ${res}${b._ver?' · v'+b._ver:''}</span><button data-action="restore-backup" data-idx="${i}" style="padding:3px 10px;font-size:.65rem;font-weight:700;border-radius:5px;border:1px solid rgba(0,212,255,.2);background:rgba(0,212,255,.06);color:#3d9db5;cursor:pointer;transition:background .12s" onmouseover="this.style.background='rgba(0,212,255,.14)'" onmouseout="this.style.background='rgba(0,212,255,.06)'">Restore</button></div>`;
  }).join('');
  return `<details class="hc-box" style="margin-top:8px"><summary class="hc-hdr" style="list-style:none;cursor:pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b949e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Backup History (${list.length}) <span style="margin-left:auto;font-size:.65rem;opacity:.6">▼</span></summary><div class="hc-hosts" style="max-height:240px;overflow-y:auto">${rows}</div></details>`;
}
function lastGenDiff() {
  try {
    const last = JSON.parse(localStorage.getItem('coreBuildLastGen') || 'null');
    if (!last) return [];
    const NICE = { sizeLimit: v => v === 'unlimited' ? 'Unlimited' : v + 'GB', cacheMode: v => ({ mixed:'Mixed', cached:'Cached Only', uncached:'Uncached' })[v] || v, streamPool: v => ({ normal:'Normal', large:'Large', max:'Maximum' })[v] || v };
    const KEYS = [['device','Device'],['resolution','Resolution'],['audio','Audio'],['content','Content'],['formatter','Formatter'],['sizeLimit','Size limit'],['cacheMode','Cache'],['streamPool','Stream pool']];
    const out = [];
    KEYS.forEach(([k, lbl]) => {
      const a = last[k], b = S[k];
      if (a == null || b == null || a === b) return;
      const fmt = v => NICE[k] ? NICE[k](v) : (label(k, v) || v);
      out.push(lbl + ': ' + fmt(a) + ' → ' + fmt(b));
    });
    if (Array.isArray(last.multiServices) && JSON.stringify([...last.multiServices].sort()) !== JSON.stringify([...(S.multiServices||[])].sort())) out.push('Services changed');
    return out;
  } catch(e) { return []; }
}

function loadState() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.has('fresh')) {
      localStorage.removeItem('coreBuild');
      localStorage.removeItem('coreBuildStep');
      history.replaceState(null, '', location.pathname + location.hash);
      return;
    }
    const hash = location.hash;
    if (hash.startsWith('#cfg=')) {
      try {
        const b64 = hash.slice(5);
        if (b64.length > 100000) throw new Error('Share link too large');
        const decoded = JSON.parse(decodeURIComponent(escape(atob(b64))));
        Object.assign(S, sanitizeSharedConfig(decoded));
        hadSavedState = true;
        _sharedImport = true;
        S.service = deriveService();
        history.replaceState(null, '', location.pathname);
        return;
      } catch(e) { console.warn('Failed to load shared config', e); logError('import', 'Share link decode failed', { error: e.message }); history.replaceState(null, '', location.pathname); setTimeout(() => showToast('Share link could not be loaded — it may be corrupted or from an older version', true), 300); }
    }
    const savedS = localStorage.getItem('coreBuild');
    const savedStep = localStorage.getItem('coreBuildStep');
    if (savedS) {
      try {
        const parsed = migrateState(JSON.parse(savedS));
        Object.assign(S, sanitizeSharedConfig(parsed));
        if (parsed.creds && typeof parsed.creds === 'object' && !Array.isArray(parsed.creds)) {
          const safeCreds = Object.create(null);
          for (const k of Object.keys(parsed.creds)) {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
            if (typeof parsed.creds[k] === 'string') safeCreds[k] = parsed.creds[k];
          }
          Object.assign(S.creds, safeCreds);
        }
        if (parsed.instanceUrl) S.instanceUrl = parsed.instanceUrl;
        if (parsed.instanceUuid) S.instanceUuid = parsed.instanceUuid;
        if (parsed.instancePassword) S.instancePassword = parsed.instancePassword;
        if (parsed.baseUuid) S.baseUuid = parsed.baseUuid;
        if (parsed.basePassword) S.basePassword = parsed.basePassword;
        if (parsed.stremioEmail) S.stremioEmail = parsed.stremioEmail;
        if (parsed.stremioPassword) S.stremioPassword = parsed.stremioPassword;
        if (typeof parsed.cleanInstall === 'boolean') S.cleanInstall = parsed.cleanInstall;
        if (['fast','balanced','maximum'].includes(parsed.quickProfile)) S.quickProfile = parsed.quickProfile;
        hadSavedState = true;
        S.service = deriveService();
      } catch(e) {
        console.warn("Failed to sanitize local storage config, starting fresh", e);
        logError('import', 'Local storage config corrupted', { error: e.message });
        localStorage.removeItem('coreBuild');
      }
    }
    if (savedStep) _savedStep = parseInt(savedStep, 10) || 0;
    // Always start at splash (step 0) so user can choose to continue or start fresh
  } catch (e) { console.warn("Failed to load state", e); }
}
function clearState() {
  localStorage.removeItem('coreBuild');
  localStorage.removeItem('coreBuildStep');
  location.assign(location.pathname + '?fresh');
}

function pushStep() { try { history.pushState({ step: step }, ''); } catch(e) {} }

function deriveService() {
  const PRIMARY = ['torbox-pro','torbox-ess','alldebrid','realdebrid','premiumize','debridlink','easynews','offcloud','debridio','debrider','easydebrid','pikpak','seedr'];
  const primary = S.multiServices.filter(s => PRIMARY.includes(s));
  if (primary.length > 1) return 'multi';
  if (primary.length === 1) return primary[0];
  if (S.multiServices.includes('http')) return 'http';
  if (S.multiServices.includes('p2p')) return 'p2p';
  return null;
}

/* RENDERING */
function label(key, val) {
  if (key === 'formatter') { if (val === 'custom') return S.customFormatter ? (S.customFormatter.label || 'Custom') : 'Custom'; const f = FORMATTERS.find(x => x.id === val); return f ? f.label : val || ''; }
  if (key === 'audio') { const m = {lossless:'Full Lossless',standard:'DD+ / Atmos',limited:'Auto',dolby:'Dolby Only'}; return m[val] || val || ''; }
  if (key === 'service' && val === 'multi') {
    const d2 = DEFS.find(x => x.key === 'service');
    if (d2) return S.multiServices.filter(s => ['torbox-pro','torbox-ess','alldebrid','realdebrid','premiumize','debridlink','easynews','offcloud','debridio','debrider','easydebrid','pikpak','seedr'].includes(s)).map(s => { const o = d2.opts.find(x => x.v === s); return o ? o.name : s; }).join(' + ');
  }
  const d = DEFS.find(x => x.key === key);
  if (!d) return val || '';
  const o = d.opts.find(x => x.v === val);
  return o ? o.name : val || '';
}

function renderOpts(def) {
  const key = def.key, id = def.id;
  const inp = (o) => `<input type="radio" name="${id}" id="o_${o.v}" value="${o.v}" ${S[key]===o.v?'checked':''} data-action="update-radio" data-key="${key}">`;
  const body = (o) => `<div class="opt-body"><div class="opt-name">${o.name}</div><div class="opt-desc">${o.desc}</div></div>`;
  const std = (o, cls='') => `<div class="opt${cls}">${inp(o)}<label for="o_${o.v}" tabindex="0"><div class="opt-icon">${o.icon}</div>${body(o)}</label></div>`;

  if (def.layout === 'device-hybrid') {
    // Responsive grid of equal-height device cards + a single contextual
    // explanation banner for the currently selected device (neat + consistent
    // with the vertical list steps, instead of a sideways-scrolling carousel).
    const activeOpt = def.opts.find(o => o.v === S[key]);
    const cards = def.opts.map(o => {
      const active = (S[key] === o.v);
      return `<div class="device-card" data-active="${active}" data-action="device-scroll-pick" data-val="${o.v}" role="radio" aria-checked="${active}" tabindex="0">
        <div class="device-card-head">
          <div class="device-card-icon">${o.icon}</div>
          <span class="device-card-check">${active ? ICO.check(15,'#00d4ff') : ''}</span>
        </div>
        <div class="device-card-name">${o.name}${POPULAR_DEVICE_IDS.has(o.v) ? '<span class="device-card-pop">Popular</span>' : ''}</div>
        <div class="device-card-desc">${o.desc}</div>
      </div>`;
    }).join('');
    const banner = activeOpt && activeOpt.help
      ? `<div class="device-help-banner"><div class="device-help-banner-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="7.8" r="0.4" fill="#00d4ff"/></svg></div><div class="device-help-banner-text"><div class="device-help-banner-title">${activeOpt.name}</div><div class="device-help-banner-body">${activeOpt.help}</div></div></div>`
      : '';
    return `<div class="device-grid" role="radiogroup" aria-label="Your device">${cards}</div>${banner}`;
  }
  if (def.layout === 'formatter-picker') return fmtDropdownHtml() +
    `<button data-action="import-formatter" style="margin-top:10px;width:100%;padding:10px;border-radius:8px;border:1.5px dashed rgba(167,139,250,.3);background:transparent;color:#a78bfa;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='rgba(167,139,250,.6)'" onmouseout="this.style.borderColor='rgba(167,139,250,.3)'">${S.customFormatter ? '⟳ Replace Custom Formatter' : ICO.folder(14,'#a78bfa')+' Import Custom Formatter'}</button>` +
    `<div style="font-size:.65rem;color:#4b5563;margin-top:6px;text-align:center">Want to build your own custom formatter? Design one visually at <a href="https://crispyduck.xyz" target="_blank" rel="noopener noreferrer" style="color:#a78bfa;text-decoration:none;font-weight:700">crispyduck.xyz</a></div>`;
  if (def.layout === 'list') return `<div class="opts list">${def.opts.map(o => std(o)).join('')}</div>`;
  if (def.layout === 'pills') return `<div class="opts pills">${def.opts.map(o => std(o)).join('')}</div>`;
  if (def.layout === 'svc-list') {
    if (def.noHero) {
      const rows = def.opts.map(o => `<div class="svc-list-row opt">${inp(o)}<label for="o_${o.v}" tabindex="0">
        <div class="opt-icon">${o.icon}</div>
        <div class="opt-body"><div class="opt-name">${o.name}</div><div class="opt-desc">${o.desc}</div></div>
        ${o.help ? `<button type="button" class="help-btn" data-action="toggle-device-help" data-v="${o.v}" title="What does this mean?" aria-label="Explain ${o.name}">?</button>` : ''}
        <span class="svc-list-arr">›</span>
      </label>${o.help ? `<div class="device-help" id="help_${o.v}">${o.help}</div>` : ''}</div>`).join('');
      if (def.id === 'resolution') {
        if (S.simpleMode) return `<div class="svc-list">${rows}</div>`;
        const AUDIO_OPTS = [
          { v:'lossless', icon:'<svg width="28" height="28" viewBox="0 0 44 44" fill="none"><path d="M8 17v10h5l8 6V11l-8 6H8z" stroke="#10b981" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M26 15a6 6 0 010 14" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M30 11a11 11 0 010 22" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M34 7a16 16 0 010 30" stroke="#10b981" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>', name:'Full Lossless', desc:'TrueHD · Atmos · DTS-HD MA · FLAC · eARC required' },
          { v:'standard', icon:'<svg width="28" height="28" viewBox="0 0 44 44" fill="none"><path d="M8 17v10h5l8 6V11l-8 6H8z" stroke="#f59e0b" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M26 15a6 6 0 010 14" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M30 11a11 11 0 010 22" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" fill="none"/><text x="40" y="14" text-anchor="middle" fill="#f59e0b" font-size="8" font-weight="800" font-family="system-ui,sans-serif">D+</text></svg>', name:'DD+ / Atmos', desc:'Soundbar or smart TV · Dolby Digital Plus' },
          { v:'limited',  icon:'<svg width="28" height="28" viewBox="0 0 44 44" fill="none"><path d="M6 18v8h5l7 5V13l-7 5H6z" stroke="#94a3b8" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M24 18a4 4 0 010 8" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="35" cy="22" r="7" stroke="#94a3b8" stroke-width="1.5" fill="none"/><circle cx="35" cy="22" r="2" stroke="#94a3b8" stroke-width="1.2" fill="none"/><line x1="35" y1="13" x2="35" y2="16" stroke="#94a3b8" stroke-width="1.3" stroke-linecap="round"/><line x1="35" y1="28" x2="35" y2="31" stroke="#94a3b8" stroke-width="1.3" stroke-linecap="round"/><line x1="26" y1="22" x2="29" y2="22" stroke="#94a3b8" stroke-width="1.3" stroke-linecap="round"/><line x1="41" y1="22" x2="44" y2="22" stroke="#94a3b8" stroke-width="1.3" stroke-linecap="round"/></svg>', name:'Auto', desc:'Let device profile decide · safe default' },
          { v:'dolby',    icon:'<svg width="28" height="28" viewBox="0 0 44 44" fill="none"><path d="M8 17v10h5l8 6V11l-8 6H8z" stroke="#818cf8" stroke-width="1.5" stroke-linejoin="round" fill="none"/><rect x="26" y="13" width="14" height="18" rx="3" stroke="#818cf8" stroke-width="1.5" fill="none"/><path d="M30 13v18" stroke="#818cf8" stroke-width="1.8" stroke-linecap="round"/><path d="M36 13v18" stroke="#818cf8" stroke-width="1.8" stroke-linecap="round"/><path d="M30 13a9 9 0 010 18" stroke="#818cf8" stroke-width="1.5" fill="none"/><path d="M36 13a9 9 0 000 18" stroke="#818cf8" stroke-width="1.5" fill="none"/></svg>', name:'Dolby Only', desc:'Atmos · TrueHD · DD+ · no DTS' },
        ];
        const DEV_REC = DEVICE_AUDIO_DEFAULTS;
        const recAudio = DEV_REC[S.device];
        const devLabel = label('device', S.device);
        const audioRows = AUDIO_OPTS.map(o => {
          const on = S.audio === o.v;
          const isRec = recAudio === o.v && S.device && S.device !== 'generic';
          return `<div class="svc-list-row opt adv-audio-row" data-action="set-audio" data-val="${o.v}" data-active="${on}" style="cursor:pointer;border:1px solid ${on?'rgba(0,212,255,.35)':'rgba(255,255,255,.07)'};background:${on?'rgba(0,212,255,.05)':'rgba(13,17,23,.7)'};border-radius:11px;padding:11px 14px;display:flex;align-items:center;gap:12px;transition:border-color .15s,background .15s">
            <div class="opt-icon" style="flex-shrink:0;pointer-events:none">${o.icon}</div>
            <div class="opt-body" style="flex:1;min-width:0;pointer-events:none"><div class="opt-name" style="font-size:.86rem;font-weight:600;color:${on?'#00d4ff':'#e6edf3'}">${o.name}${isRec?' <span style="font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:3px;background:rgba(52,211,153,.12);color:#34d399;border:1px solid rgba(52,211,153,.3);vertical-align:middle">'+devLabel+'</span>':''}</div><div class="opt-desc" style="font-size:.69rem;color:#6b7280;margin-top:1px">${o.desc}</div></div>
            <button type="button" class="help-btn" data-action="toggle-help-target" data-target="audiohelp_res_${o.v}" title="What does this mean?" aria-label="Explain ${o.name}">?</button>
            <span style="color:${on?'#00d4ff':'#374151'};flex-shrink:0;pointer-events:none">${on?ICO.check(14,'#00d4ff'):'<span style="font-size:.9rem">›</span>'}</span>
          </div><div class="device-help" id="audiohelp_res_${o.v}" style="border:none;padding:6px 14px 2px">${AUDIO_HELP[o.v] || ''}</div>`;
        }).join('');
        const curAudioLabel = AUDIO_OPTS.find(o => o.v === S.audio)?.name || 'Auto';
        const advOpen = !!S.audio && S.audio !== 'limited';
        return `<div class="svc-list">${rows}</div>
        <details class="adv-audio-details"${advOpen ? ' open' : ''} style="margin-top:10px">
          <summary style="list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);user-select:none;transition:background .15s" onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='rgba(255,255,255,.03)'">
            <span style="font-size:.78rem;font-weight:700;color:#4b5563;letter-spacing:.04em;text-transform:uppercase">Advanced options · Sound profile</span>
            <span style="font-size:.76rem;color:#374151;font-weight:600">${curAudioLabel} ›</span>
          </summary>
          <div style="display:flex;flex-direction:column;gap:7px;margin-top:8px">${audioRows}</div>
        </details>`;
      }
      return `<div class="svc-list">${rows}</div>`;
    }
    const SVC_TAGS = {
      'torbox-pro': ['4K Apex','Stream','Flash','Speed','Anime'],
      'torbox-ess': ['4K Essential','Essential'],
      'alldebrid':  ['4K AllDebrid','AllDebrid'],
      'realdebrid': ['Core Nexus RD'],
      'premiumize': ['Core Nexus Premiumize'],
      'debridlink': ['Debrid-Link'],
      'easynews':   ['Speed EasyNews','Speed 4K+'],
    };
    const SVC_DESC = {
      'torbox-pro': 'Full scraper stack · best results',
      'torbox-ess': 'Same smart sorting, Essential plan',
      'alldebrid':  'AllDebrid subscribers',
      'realdebrid': 'Real-Debrid subscribers',
      'premiumize': 'Premiumize subscribers',
      'debridlink': 'Debrid-Link subscribers',
      'easynews':   'Usenet streaming',
      'offcloud':   'Cloud debrid service',
      'p2p':        'Direct torrents · no account needed',
      'http':       'Streaming sites · no debrid required',
      'debridio':   'Debridio scraper',
      'debrider':   'Multi-debrid aggregator — one API for all',
      'easydebrid': 'Multi-debrid aggregator',
      'pikpak':     'Cloud torrent + download caching',
      'seedr':      'Cloud torrent streaming',
      'nzbgeek':    'Usenet indexer',
      'streamnzb':  'Self-hosted Usenet streaming',
    };
    const SVC_AUTH = {
      'torbox-pro':'API key','torbox-ess':'API key','alldebrid':'API key','realdebrid':'API key',
      'premiumize':'API key','debridlink':'API key','offcloud':'API key','debridio':'API key',
      'debrider':'API key','easydebrid':'API key','pikpak':'API key','seedr':'API key',
      'easynews':'User + pass','nzbgeek':'API key','streamnzb':'Manifest URL',
      'p2p':'Free','http':'Free',
    };
    const SVC_CAT = {
      'torbox-pro':'debrid','torbox-ess':'debrid','alldebrid':'debrid','realdebrid':'debrid',
      'premiumize':'debrid','debridlink':'debrid','offcloud':'debrid','debridio':'debrid',
      'debrider':'debrid','easydebrid':'debrid','pikpak':'debrid','seedr':'debrid',
      'easynews':'usenet','nzbgeek':'usenet','streamnzb':'usenet',
      'p2p':'noaccount','http':'noaccount',
    };
    const chk = (o) => `<input type="checkbox" id="o_${o.v}" value="${o.v}" ${S.multiServices.includes(o.v)?'checked':''} data-action="toggle-service">`;
    const ckSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    const hero = def.opts[0];
    const heroTags = (SVC_TAGS[hero.v] || []).map(t => `<span class="svc-hero-tag">${t}</span>`).join('');
    const heroHtml = `<div class="svc-list-hero opt">${chk(hero)}<label for="o_${hero.v}" tabindex="0">
      <div class="opt-icon">${hero.icon}</div>
      <div class="opt-body">
        <div class="opt-name">${hero.name} <span class="svc-hero-badge">${ICO.star(12,'currentColor')} POPULAR</span></div>
        <div class="opt-desc">${SVC_DESC[hero.v] || ''}</div>
        ${heroTags ? `<div class="svc-hero-tags">${heroTags}</div>` : ''}
      </div>
    </label></div>`;
    const searchHtml = `<div class="svc-search"><span class="svc-search-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg></span><input type="text" placeholder="Filter services…" data-action="svc-filter" id="svcFilterInput"></div>`;
    const segHtml = `<div class="svc-seg" id="svcSeg">
      <button type="button" class="svc-seg-b act" data-action="svc-cat" data-cat="all">All</button>
      <button type="button" class="svc-seg-b" data-action="svc-cat" data-cat="debrid">Debrid<span class="svc-seg-help">?<span class="svc-seg-tip">Debrid services cache torrents on fast servers so you stream instantly without seeding. You need a paid subscription to one of these.</span></span></button>
      <button type="button" class="svc-seg-b" data-action="svc-cat" data-cat="usenet">Usenet<span class="svc-seg-help">?<span class="svc-seg-tip">Usenet is a paid alternative to torrents. Streams come from news servers instead of peers — often faster, with no seeding required.</span></span></button>
      <button type="button" class="svc-seg-b" data-action="svc-cat" data-cat="noaccount">No Account</button>
    </div>`;
    const rowsHtml = def.opts.slice(1).filter(o => !CAROUSEL_SVCS.includes(o.v)).map(o => {
      const auth = SVC_AUTH[o.v] || '';
      const cat = SVC_CAT[o.v] || 'debrid';
      const isFree = auth === 'Free';
      return `<div class="svc-list-row opt" data-svc-cat="${cat}" data-svc-name="${o.name.toLowerCase()}">${chk(o)}<label for="o_${o.v}" tabindex="0">
        <div class="opt-icon">${o.icon}</div>
        <div class="opt-body"><div class="opt-name">${o.name}</div><div class="opt-desc">${SVC_DESC[o.v] || ''}</div></div>
        <span class="svc-row-auth${isFree?' free':''}">${auth}</span>
        <span class="svc-row-ck">${ckSvg}</span>
      </label></div>`;
    }).join('');
    const emptyHtml = '<div class="svc-empty" id="svcEmpty">No services match your search</div>';
    const ckIcon = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const svcCarouselCards = CAROUSEL_SVCS.map(sv => {
      const o = def.opts.find(x => x.v === sv); if (!o) return '';
      const active = S.multiServices.includes(sv);
      const cat = SVC_CAT[sv] || 'debrid';
      const catLabel = cat === 'debrid' ? 'Debrid' : cat === 'usenet' ? 'Usenet' : cat === 'noaccount' ? 'Free' : cat;
      return `<div class="opt-scraper-card" data-active="${active}" data-action="toggle-carousel-service" data-svc-id="${sv}" role="checkbox" aria-checked="${active}" tabindex="0">
        <div class="opt-scraper-card-ck">${ckIcon}</div>
        <div class="opt-scraper-card-head"><div class="opt-scraper-icon opt-scraper-icon-svg">${o.icon}</div><span class="opt-scraper-name">${o.name}</span></div>
        <div class="opt-scraper-subdesc">${SVC_DESC[sv] || ''}</div>
        <span class="opt-scraper-badge opt-scraper-badge-${cat}">${catLabel}</span>
      </div>`;
    }).join('');
    const scraperCards = OPTIONAL_SCRAPER_DEFS.map(d => {
      const active = S.optionalScrapers.includes(d.id);
      const catLabel = d.cat === 'debrid' ? 'Debrid' : d.cat === 'usenet' ? 'Usenet' : d.cat;
      return `<div class="opt-scraper-card" data-active="${active}" data-action="toggle-optional-scraper" data-scraper-id="${d.id}" role="checkbox" aria-checked="${active}" tabindex="0">
        <div class="opt-scraper-card-ck">${ckIcon}</div>
        <div class="opt-scraper-card-head"><div class="opt-scraper-icon" style="background:${d.color}15;color:${d.color}">${d.label.substring(0,2).toUpperCase()}</div><span class="opt-scraper-name">${d.label}</span></div>
        <div class="opt-scraper-subdesc">${d.desc}</div>
        <span class="opt-scraper-badge opt-scraper-badge-${d.cat}">${catLabel}</span>
      </div>`;
    }).join('');
    const hasExtras = S.multiServices.some(s => CAROUSEL_SVCS.includes(s)) || S.optionalScrapers.length;
    const extraCount = S.multiServices.filter(s=>CAROUSEL_SVCS.includes(s)).length + S.optionalScrapers.length;
    const compactOptSection = `<div class="opt-scraper-section"><button type="button" class="additional-services-btn" data-action="open-additional-services" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:13px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(145deg,#111b27,#0d151f);color:#c9d5df;cursor:pointer;text-align:left"><span style="width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:rgba(167,139,250,.09);color:#a78bfa">＋</span><span style="flex:1"><b style="display:block;font-size:.82rem">Additional services &amp; scrapers</b><span style="display:block;color:#718093;font-size:.68rem;margin-top:2px">P2P, HTTP, Usenet, Debridio and optional indexers</span></span>${extraCount?`<span style="padding:3px 8px;border-radius:99px;background:rgba(0,212,255,.09);border:1px solid rgba(0,212,255,.2);color:#67e8f9;font-size:.62rem;font-weight:900">${extraCount} selected</span>`:''}<span style="color:#637185">→</span></button>${hasExtras?'<div class="opt-scraper-hint">Selected extras are active. Their credentials appear on Accounts &amp; Keys.</div>':''}</div>`;
    const carouselOptSection = `<div class="opt-scraper-section"><div class="opt-scraper-divider"><span class="opt-scraper-line"></span><span class="opt-scraper-label">Extras &amp; Optional Scrapers</span><span class="opt-scraper-count" id="extrasCarouselCount">${extraCount ? extraCount+' selected' : 'Optional'}</span><span class="opt-scraper-line"></span></div><div class="opt-scraper-desc">Swipe or scroll, then tap any card to toggle it. Multi-select is supported.</div><div class="scroll-fade-wrap" data-scroll-start="true" data-scroll-end="false"><div class="opt-scraper-scroll" aria-label="Additional services and optional scrapers">${svcCarouselCards}${scraperCards}</div></div>${hasExtras ? '<div class="opt-scraper-hint">Selected extras are active. Required credentials appear on Accounts &amp; Keys.</div>' : ''}</div>`;
    const optSection = S.simpleMode ? compactOptSection : carouselOptSection;
    return `<div class="svc-list">${heroHtml}${searchHtml}${segHtml}<div id="svcRows">${rowsHtml}</div>${emptyHtml}${optSection}</div>`;
  }
  if (def.layout === 'hero') {
    const hero = def.opts[0], rest = def.opts.slice(1);
    return `<div class="hero-wrap">
      <div class="hero-hero opt">${inp(hero)}<label for="o_${hero.v}" tabindex="0"><div class="opt-icon">${hero.icon}</div><div class="opt-body"><div class="hero-badge">${ICO.star(11,'currentColor')} Most popular</div><div class="opt-name">${hero.name}</div><div class="opt-desc">${hero.desc}</div></div></label></div>
      <div class="hero-sub">${rest.map(o => std(o)).join('')}</div>
    </div>`;
  }
  return `<div class="opts ${def.cols}">${def.opts.map(o => std(o)).join('')}</div>`;
}

const FMT_PREVIEWS = {
  'family-v4': {
    n:'4K ⚡ Frankenstein S01 • E05',
    d:['✅ Plays Fast 🥇 Good Stream 🏷 FraMeSToR','📺 From Apple TV','🎥 WEB-DL • HEVC • HDR10+','🔊 5.1 • Atmos, EAC3  ⚡ 16.2 Mbps','💾 4.2G • 🌱 1247 • ⏱ 3d','🏞 torrentio • debrid • 🔍 Torrentio • 🥈 Radarr Remux T1','🗣 English']
  },
  'family-v3': {
    n:'Torrentio | "Frankenstein" S01 • E05',
    d:['✅ Plays Fast 🥇 Good Stream','📺 From Apple TV','🖥️ Highest Resolution 4k','🎥 WEB-DL • HEVC • HDR10+','🔊 5.1 • Atmos, EAC3','💾 4.2 GB','🏞️ torbox • debrid','🗣️ English']
  },
  'ultra': {
    n:'4K · ⚡ TORBOX · REMUX · FRANKENSTEIN',
    d:['🎥 HEVC  DV | HDR10+ | 10bit','🎧 TRUEHD  7.1  🌍 🇬🇧','💾 45.2 GB  📦 PACK  🏷 FraMeSToR ✅  🌱 1 247  📡 torrentio']
  },
  'apex-v2': {
    n:'🟣 4K  ⚡ TB  👁️ DV ✨ HDR¹⁰⁺  FRANKENSTEIN',
    d:['🚀 INSTANT  💎 ELITE  ✦ 94  🏷️ ᴅᴏɴ  👑 PREMIER','🎬 💎 REMUX  ʜᴇᴠᴄ  38.4 ᴍʙᴘs  👁️ DV ✨ HDR¹⁰⁺ 🎨 10ʙɪᴛ','🎛️ 🔮 ATMOS 💎 TRUEHD  🔊 7.1  🌍 🇬🇧  📝 🇬🇧','📦 PACK  45.2 GB  🌱 1 247  ⏱️ 3ᴅ  🔍 ᴛᴏʀʀᴇɴᴛɪᴏ  🔌 ᴅᴇʙʀɪᴅ']
  },
  'sigma': {
    n:'✦ Frankenstein 「 TB 」 「 🟣 4K 」 「 💎 ʀᴇᴍᴜx 」 👁️ DV ✨ HDR¹⁰⁺ 「 🔮 ᴀᴛᴍᴏs 」 「 7.1 」',
    d:['『 💎 ELITE 』 『 🚀 INSTANT 』 『 🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ 』 『 👑 ᴘʀᴇᴍɪᴇʀ 』','「 🎬 💎 ʀᴇᴍᴜx 」 「 ʜᴇᴠᴄ 」 「 38.4 ᴍʙᴘs 」 「 👁️ DV ✨ HDR¹⁰⁺ 🎨 10ʙɪᴛ 」','「 🎛️ 🔮 ATMOS 💎 TRUEHD 」 🔊 7.1  🌍 🇬🇧','「 📦 PACK → 45.2 ɢʙ 」 「 🌱 1 247 」 「 ⏱️ 3ᴅ 」 「 🔍 ᴛᴏʀʀᴇɴᴛɪᴏ 」']
  },
  'minimal': {
    n:'🟣 4K  ⚡ TB  🔮 ATMOS  FRANKENSTEIN',
    d:['🚀 INSTANT  💎 ELITE  ✦ QUALITY  🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ  👑 PREMIER','🎬 💎 REMUX  ʜᴇᴠᴄ  👁️ DV ✨ HDR¹⁰⁺  🎛️ 🔮 ATMOS 💎 TRUEHD  🔊 7.1  🌍 🇬🇧','📦 PACK  45.2 GB  🌱 1 247  ⏱️ 3ᴅ  🔍 ᴛᴏʀʀᴇɴᴛɪᴏ  🔌 ᴅᴇʙʀɪᴅ']
  },
  'prime': {
    n:'🖥️ 2160P  ⚡ TB  FRANKENSTEIN',
    d:['🚀 INSTANT  💎 ELITE  🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ  👑 PREMIER','🎬 💎 REMUX  ʜᴇᴠᴄ  👁️ DV ✨ HDR¹⁰⁺ 🎨 10ʙɪᴛ  38.4 ᴍʙᴘs','🎛️ 🔮 ATMOS 💎 TRUEHD  🔊 7.1  🌍 🇬🇧','📦 PACK  45.2 GB  📁 92.1 GB  🌱 1 247  ⏱️ 3ᴅ  🔍 ᴛᴏʀʀᴇɴᴛɪᴏ  🔌 ᴅᴇʙʀɪᴅ']
  },
  'tv': {
    n:'🔴 4K  ⚡ TB  FRANKENSTEIN',
    d:['🚀 INSTANT  💎 ELITE  🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ  👑 PREMIER','🎬 💎 REMUX  ʜᴇᴠᴄ  👁️ DV ✨ HDR¹⁰⁺  🎛️ 🔮 ATMOS 💎 TRUEHD  🔊 7.1','📦 PACK  45.2 GB  🌍 🇬🇧  🌱 1 247  ⏱️ 3ᴅ','🔍 ᴛᴏʀʀᴇɴᴛɪᴏ  🔌 ᴅᴇʙʀɪᴅ']
  },
  'apex': {
    n:'🟣 4K  ⚡ TB  👁️ DV ✨ HDR¹⁰⁺  🔮 ATMOS  FRANKENSTEIN',
    d:['🚀 INSTANT  💎 ELITE  ✦ QUALITY  🎯 ʀᴀᴅᴀʀʀ ʀᴇᴍᴜx  🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ  👑 PREMIER','🎬 💎 REMUX  ʜᴇᴠᴄ  ᴍᴋᴠ  👁️ DV ✨ HDR¹⁰⁺ 🎨 10ʙɪᴛ  38.4 ᴍʙᴘs','🎛️ 🔮 ATMOS 💎 TRUEHD  🔊 7.1  🌍 🇬🇧','📦 PACK  45.2 GB  📁 92.1 GB  🌱 1 247  ⏱️ 3ᴅ  🔍 ᴛᴏʀʀᴇɴᴛɪᴏ  🔌 ᴅᴇʙʀɪᴅ']
  },
  'elite': {
    n:'🟣 4K  ⚡ TB  👁️ DV ✨ HDR¹⁰⁺  FRANKENSTEIN',
    d:['🚀 INSTANT  💎 94  🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ  👑 PREMIER','🎬 💎 REMUX  ʜᴇᴠᴄ  👁️ DV ✨ HDR¹⁰⁺ 🎨 10ʙɪᴛ  38.4 ᴍʙᴘs','🎛️ 🔮 ATMOS 💎 TRUEHD  🔊 7.1  🌍 🇬🇧','💾 45.2 GB  📁 92.1 GB  📦 PACK  🌱 1 247  ⏱️ 3ᴅ  🔍 ᴛᴏʀʀᴇɴᴛɪᴏ  🔌 ᴅᴇʙʀɪᴅ']
  },
  'uniform': {
    n:'🖥️ 2160P  ⚡ TB  FRANKENSTEIN',
    d:['🚀 INSTANT  💎 ELITE  🎯 ʀᴀᴅᴀʀʀ ʀᴇᴍᴜx  🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ  👑 PREMIER','🎬 💎 REMUX  ʜᴇᴠᴄ  👁️ DV ✨ HDR¹⁰⁺  38.4 ᴍʙᴘs','🎛️ 🔮 ATMOS 💎 TRUEHD  🔊 7.1  🌍 🇬🇧','📦 PACK  45.2 GB  📁 92.1 GB  🌱 1 247  ⏱️ 3ᴅ  🔍 ᴛᴏʀʀᴇɴᴛɪᴏ  🔌 ᴅᴇʙʀɪᴅ']
  },
  'syntax': {
    n:'✦ Frankenstein 「 TB 」 「 4K UHD 」 「 BLURAY REMUX 」 「 ᴀᴛᴍᴏs | ᴛʀᴜᴇʜᴅ 」 「 7.1 」',
    d:['「 ◼ ᴛᴏʀʀᴇɴᴛɪᴏ 」 「 ⬤ ᴅᴇʙʀɪᴅ 」 「 ⧗ 3ᴅ 」','「 💾 45.2 ɢʙ 」 「 📦 ᴘᴀᴄᴋ 」 「 🌱 1 247 」','「 🎥 ʜᴇᴠᴄ 」 「 👁️ ᴅᴠ 」 「 ✨ ʜᴅʀ¹⁰⁺ 」 「 🎨 10ʙɪᴛ 」','「 🎛️ 🔮 ᴀᴛᴍᴏs | 💎 ᴛʀᴜᴇʜᴅ 」 「 🔊 7.1 」 「 🌍 🇬🇧 」','「 🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ 」 『 👑 ᴘʀᴇᴍɪᴇʀ 』']
  },
  'syntax-v3': {
    n:'✦ Frankenstein 「 TB 」 「 4K UHD 」 「 BLURAY REMUX 」 「 ᴀᴛᴍᴏs | ᴛʀᴜᴇʜᴅ 」 「 7.1 」',
    d:['「 ◼ ᴛᴏʀʀᴇɴᴛɪᴏ 」 「 ⬤ ᴅᴇʙʀɪᴅ 」 「 ⧗ 3ᴅ 」 「 💎 94 」','「 💾 45.2 ɢʙ 」 「 📦 ᴘᴀᴄᴋ 」 「 🌱 1 247 」','「 🎥 ʜᴇᴠᴄ 」 「 👁️ ᴅᴠ 」 「 ✨ ʜᴅʀ¹⁰⁺ 」 「 🎨 10ʙɪᴛ 」 「 38.4 ᴍʙᴘs 」','「 🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ 」 『 👑 ᴘʀᴇᴍɪᴇʀ 』']
  },
  'omni-diamond': {
    n:'⚡ [ᴛʙ] 🔹 ᴛᴏʀʀᴇɴᴛɪᴏ 🟣 4K UHD  ☀️ ✨ ᴅᴠ | ✨ ʜᴅʀ¹⁰⁺ | 🎨 10ʙɪᴛ',
    d:['💎 ʀᴇᴍᴜx 🔹 ʜᴇᴠᴄ 🔹 38.4 ᴍʙᴘs','🔮 ᴀᴛᴍᴏs | 💎 ᴛʀᴜᴇʜᴅ 🔹 🔊 7.1 🔹 🌍 🇬🇧 🔹 📝 🇬🇧','🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ 🔹 💎 ELITE 🔹 📦 ᴘᴀᴄᴋ 🔹 45.2 ɢʙ','🌱 1 247 🔹 ⏱️ 3ᴅ']
  },
  'zenith-diamond': {
    n:'⚡ Iɴsᴛᴀɴᴛ • TB 🔹 🟣 4K UHD • 💎 ʀᴇᴍᴜx 🔹 ᴀᴛᴍᴏs • ᴛʀᴜᴇʜᴅ • 🔊 7.1',
    d:['🗓️ 3ᴅ 🔹 ☁️ ᴅᴇʙʀɪᴅ 🔹 🧩 ᴛᴏʀʀᴇɴᴛɪᴏ','⚡ 38.4 ᴍʙᴘs 🔹 💾 45.2 ɢʙ 🔹 📦 ᴘᴀᴄᴋ 🔹 🌱 1 247','⚙️ ʜᴇᴠᴄ 🔹 👁️ ᴅᴠ ✨ ʜᴅʀ¹⁰⁺ 🎨 10ʙɪᴛ','🌍 🇬🇧 🔹 📝 🇬🇧 🔹 🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ 🔹 👑 PREMIER']
  },
  'auburn-tiger': {
    n:'⚡ Iɴsᴛᴀɴᴛ 🔸 TB 🔸 🟠 4K UHD 🔸 💎 ʀᴇᴍᴜx 🔸 ⚙️ ʜᴇᴠᴄ 🔸 ᴀᴛᴍᴏs 🔸 ᴛʀᴜᴇʜᴅ 🔸 🔊 7.1',
    d:['🗓️ 3ᴅ 🔸 ☁️ ᴅᴇʙʀɪᴅ 🔹 💾 45.2 ɢʙ 🔸 📦 ᴘᴀᴄᴋ 🔸 🌱 1 247','⚡ 38.4 ᴍʙᴘs 🔸 👁️ ᴅᴠ ✨ ʜᴅʀ¹⁰⁺ 🔸 🎨 10ʙɪᴛ','🌍 🇬🇧 🔸 📝 🇬🇧 🔸 🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ 🔸 👑 PREMIER','🧩 ᴛᴏʀʀᴇɴᴛɪᴏ']
  },
  'midnight-slate': {
    n:'✦ Frankenstein [TB] 4K UHD  REMUX  ᴀᴛᴍᴏs  ᴛʀᴜᴇʜᴅ  7.1',
    d:['◼ ᴛᴏʀʀᴇɴᴛɪᴏ  ⬤ ᴅᴇʙʀɪᴅ  ⧗ 3ᴅ','▼ 38.4 ᴍʙᴘs  45.2 ɢʙ  ᴘᴀᴄᴋ  1 247 sᴇᴇᴅᴇʀs','ʜᴇᴠᴄ  ᴅᴠ  ʜᴅʀ¹⁰⁺  10ʙɪᴛ','ᴀᴛᴍᴏs  ᴛʀᴜᴇʜᴅ  7.1  🇬🇧','ꜰʀᴀᴍᴇsᴛᴏʀ']
  },
  'rb3-clean': {
    n:'TB ⚡  𝟰𝗞 𝗨𝗛𝗗  𝘉𝘭𝘶-𝘳𝘢𝘺 𝘙𝘦𝘮𝘶𝘹',
    d:['📁 Frankenstein (2024)','👁️ DV  ✨ HDR10+  🎨 10BIT  🎬 HEVC  ⚡ 38.4 Mbps','🔮 ATMOS  💎 TRUEHD  🔊 7.1  🌍 🇬🇧','💾 45.2 GB  📦 PACK  🌱 1 247  🏷️ FraMeSToR  ⏱️ 3d','🔍 torrentio  💎 ELITE']
  },
  'rb3': {
    n:'⚡ Iɴsᴛᴀɴᴛ 🔸 TB 🔸 🟠 4K UHD 🔸 💎 ʀᴇᴍᴜx 🔸 ⚙️ ʜᴇᴠᴄ 🔸 ᴀᴛᴍᴏs 🔸 ᴛʀᴜᴇʜᴅ 🔸 🔊 7.1',
    d:['🦅 3ᴅ 🔸 ☁️ ᴅᴇʙʀɪᴅ 🔹 💾 45.2 ɢʙ 🔸 📦 ᴘᴀᴄᴋ 🔸 🌱 1 247','⚡ 38.4 ᴍʙᴘs 🔸 👁️ ᴅᴠ ✨ ʜᴅʀ¹⁰⁺ 🔸 🎨 10ʙɪᴛ','🌍 🇬🇧 🔸 📝 🇬🇧 🔸 🏷️ ꜰʀᴀᴍᴇsᴛᴏʀ 🔸 👑 PREMIER','🧩 ᴛᴏʀʀᴇɴᴛɪᴏ']
  }
};

function fmtPreviewHtml(fmtId) {
  const p = FMT_PREVIEWS[fmtId] || FMT_PREVIEWS['family-v4'];
  return `<div class="fmt-live-preview">
    <div class="fmt-live-poster">${ICO.film(16,'#6b7280')}</div>
    <div class="fmt-live-lines">
      <div class="fmt-live-n">${p.n}</div>
      ${p.d.map(l=>`<div class="fmt-live-d">${l}</div>`).join('')}
    </div>
  </div>`;
}

function fmtDropdownHtml() {
  const isCustom = S.formatter === 'custom' && S.customFormatter;
  const allFmts = [...FORMATTERS];
  if (S.customFormatter) allFmts.push({ id:'custom', label:S.customFormatter.label||'Custom', badge:'Imported', bc:'#a78bfa', desc:'Your imported formatter' });
  const cards = allFmts.map(f => {
    const active = (isCustom && f.id === 'custom') || (!isCustom && f.id === S.formatter);
    const p = FMT_PREVIEWS[f.id] || FMT_PREVIEWS['family-v4'];
    return `<div class="fmt-scroll-card" data-active="${active}" data-action="fmt-scroll-pick" data-fmt="${f.id}">
      <div class="fmt-scroll-head">
        <div class="fmt-scroll-dot" style="background:${f.bc}"></div>
        <span class="fmt-scroll-label">${f.label}</span>
        <span class="fmt-scroll-badge" style="background:${f.bc}22;color:${f.bc}">${f.badge}</span>
      </div>
      <div class="fmt-scroll-desc">${f.desc}</div>
      <div class="fmt-live-preview">
        <div class="fmt-live-poster">${ICO.film(14,'#6b7280')}</div>
        <div class="fmt-live-lines">
          <div class="fmt-live-n">${p.n}</div>
          ${p.d.map(l=>`<div class="fmt-live-d">${l}</div>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
  return `<div class="scroll-fade-wrap" data-scroll-start="true" data-scroll-end="false"><div class="fmt-scroll" id="fmtScroll">${cards}</div></div>`;
}

function updateFmtFeatured() {
  document.querySelectorAll('.fmt-scroll-card').forEach(card => {
    const isSel = card.dataset.fmt === S.formatter;
    card.dataset.active = isSel ? 'true' : 'false';
    if (isSel) card.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
  });
}

function updateDeviceScroll() {
  // The device picker is now a responsive grid rebuilt from state on every
  // render, so there are no carousel snaps or inline help panels to sync.
  // Just bring the selected card gently into view (vertical only).
  document.querySelectorAll('.device-card[data-action="device-scroll-pick"]').forEach(card => {
    if (card.dataset.val === S.device) card.scrollIntoView({ behavior:'smooth', block:'nearest' });
  });
}
function updateFmtReceiptRow() {
  const fmtLbl = label('formatter', S.formatter);
  const fmtSummary = document.querySelector('#fmtPickerDetails > summary span:first-child');
  if (fmtSummary) fmtSummary.innerHTML = `<span>${ICO.palette(14,'#8b949e')}</span> Stream Formatter <span style="font-weight:600;color:#374151;text-transform:none;letter-spacing:0;font-size:.72rem">— ${fmtLbl}</span>`;
  document.querySelectorAll('.receipt-row').forEach(row => {
    const lbl2 = row.querySelector('.receipt-row-lbl');
    if (lbl2 && lbl2.textContent.trim() === 'formatter') {
      const val = row.querySelector('.receipt-row-val');
      if (val) { val.textContent = fmtLbl; val.className = `receipt-row-val${S.formatter !== 'family-v4' ? ' hl' : ''}`; }
    }
  });
}

function customFormatterCard() {
  if (!S.customFormatter) return '';
  const on = S.formatter === 'custom';
  const lbl = S.customFormatter.label || 'Custom';
  return `<div class="fmt-card" data-action="set-formatter" data-val="custom" data-active="${on}">
    <div style="display:flex;align-items:center;gap:14px;padding:13px 16px">
      <div style="width:10px;height:10px;border-radius:50%;background:#a78bfa;flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <span class="fmt-lbl" style="font-weight:700;font-size:.9rem">${lbl.replace(/</g,'&lt;')}</span>
        <span style="margin-left:6px;background:rgba(167,139,250,.15);border-radius:4px;padding:2px 6px;font-size:.65rem;color:#a78bfa">Imported</span>
        <div style="color:#6b7280;font-size:.72rem;margin-top:2px">Your imported formatter · <a href="#" data-action="clear-custom-formatter" style="color:#ef4444;text-decoration:none;font-size:.7rem">Remove</a></div>
      </div>
      <span class="fmt-arr"></span>
    </div>
  </div>`;
}

function videoPrefHtml() {
  const chk = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0d1117" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const card = (key, title, desc) => {
    const on = !!S[key];
    return `<div class="pref-card${on?' pref-on':''}" data-action="toggle-pref" data-key="${key}">
      <div class="pref-body-inner"><div class="pref-title">${title}</div><div class="pref-desc">${desc}</div></div>
      <div class="pref-circle">${on?chk:''}</div>
    </div>`;
  };
  return `<div class="pref-section">
    <div class="pref-section-label">Video Preferences</div>
    ${card('qualityFirst','Prioritize Quality over Resolution','Sorts by source quality (e.g. REMUX) before resolution.')}
    ${card('resolutionFirst','Resolution First','Higher resolution always ranks above lower, even if lower-res is cached.')}
    ${card('exclude4K','Exclude 4K / UHD','Removes 2160p content. Good for bandwidth saving.')}
    ${card('excludeDV','Exclude Dolby Vision','Fixes purple/green tint on unsupported screens.')}
  </div>`;
}

function renderP2pToggle() {
  const on = S.p2pEnabled !== false;
  return `<div class="pref-card${on?' pref-on':''}" style="margin-top:12px;cursor:default">
    <div class="pref-body-inner">
      <div class="pref-title">Include Raw Torrents</div>
      <div class="pref-desc">Direct peer-to-peer streams with no debrid. Most debrid users should leave this off — it does not affect uncached debrid results.</div>
    </div>
    <label class="toggle-sw" style="cursor:pointer;flex-shrink:0">
      <input type="checkbox" data-action="toggle-p2p"${on ? ' checked' : ''}>
      <span class="toggle-track"></span>
    </label>
  </div>`;
}

function ftTip(text) {
  // Text is stashed in a data attribute (entity-escaped for attribute safety). The popup
  // itself is portaled to <body> on open (showFtTip) so it can never be clipped by an
  // ancestor's overflow — the Fine-Tune drawer scrolls, which used to cut these help
  // cards off mid-sentence. Reported by the Core Crew (layering bug #2).
  const esc = String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<i class="ft-info" data-fttip="${esc}" tabindex="0" role="button" aria-label="More information">?</i>`;
}

let _ftPop = null, _ftActiveIcon = null;
function _ftPopup() {
  if (_ftPop) return _ftPop;
  _ftPop = document.createElement('div');
  _ftPop.className = 'ft-popup';
  document.body.appendChild(_ftPop);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { hideFtTip(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.closest) {
      const i = e.target.closest('.ft-info[data-fttip]');
      if (i) { e.preventDefault(); toggleFtTip(i); }
    }
  });
  document.addEventListener('scroll', hideFtTip, true); // capture phase — drawer scroll closes the tip
  window.addEventListener('resize', hideFtTip);
  return _ftPop;
}
function hideFtTip() { if (_ftPop) _ftPop.classList.remove('active'); _ftActiveIcon = null; }
function toggleFtTip(icon) { (_ftActiveIcon === icon && _ftPop && _ftPop.classList.contains('active')) ? hideFtTip() : showFtTip(icon); }
function showFtTip(icon) {
  const pop = _ftPopup();
  pop.innerHTML = icon.getAttribute('data-fttip') || '';
  pop.classList.add('active');
  const iw = window.innerWidth, ih = window.innerHeight;
  const r = icon.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = Math.round(r.left + r.width / 2 - pw / 2);
  left = Math.max(8, Math.min(left, iw - pw - 8));
  let top = Math.round(r.bottom + 8);
  if (top + ph > ih - 8) top = Math.round(r.top - ph - 8); // flip above the icon if it would clip the viewport bottom
  if (top < 8) top = 8;                                     // popup scrolls internally if still taller than the viewport
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  _ftActiveIcon = icon;
}

function renderMatchMode() {
  const modes = [
    { v:'relaxed',  icon:'<svg width="16" height="16" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="15" stroke="#22c55e" stroke-width="1.5" fill="#22c55e" fill-opacity=".05"/><circle cx="15" cy="20" r="2.5" fill="#22c55e" fill-opacity=".7"/><circle cx="22" cy="17" r="2.5" fill="#22c55e" fill-opacity=".5"/><circle cx="29" cy="20" r="2.5" fill="#22c55e" fill-opacity=".3"/><circle cx="18" cy="27" r="2.5" fill="#22c55e" fill-opacity=".4"/><circle cx="26" cy="27" r="2.5" fill="#22c55e" fill-opacity=".6"/></svg>', label:'Relaxed',  desc:'More results, conservative dedup' },
    { v:'balanced', icon:'<svg width="16" height="16" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="15" stroke="#3b82f6" stroke-width="1.5" fill="#3b82f6" fill-opacity=".05"/><rect x="13" y="14" width="18" height="16" rx="2" stroke="#3b82f6" stroke-width="1.2" fill="none"/><path d="M13 20h18M22 14v16" stroke="#3b82f6" stroke-width="1" stroke-opacity=".5"/><circle cx="17.5" cy="17" r="1.5" fill="#3b82f6" fill-opacity=".7"/><circle cx="26.5" cy="17" r="1.5" fill="#3b82f6" fill-opacity=".7"/></svg>', label:'Balanced', desc:'Smart dedup, recommended default' },
    { v:'strict',   icon:'<svg width="16" height="16" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="15" stroke="#ef4444" stroke-width="1.5" fill="#ef4444" fill-opacity=".05"/><path d="M22 12v8l5 3" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="22" r="4" fill="#ef4444" fill-opacity=".7"/><path d="M14 30l3-3M30 30l-3-3" stroke="#ef4444" stroke-width="1.3" stroke-linecap="round"/></svg>', label:'Strict',   desc:'Aggressive dedup, quality-first sort' },
  ];
  const cur = S.matchMode || 'balanced';
  const pills = modes.map(m => {
    const on = cur === m.v;
    return `<button data-action="set-match-mode" data-val="${m.v}" data-active="${on}" style="flex:1;padding:8px 4px;border-radius:8px;border:1.5px solid ${on?'rgba(0,212,255,.4)':'rgba(255,255,255,.07)'};background:${on?'rgba(0,212,255,.1)':'transparent'};color:${on?'#00d4ff':'#6b7280'};font-size:.8rem;font-weight:${on?'700':'500'};cursor:pointer;transition:all .15s;line-height:1.3">
      <div style="display:flex;align-items:center;justify-content:center;gap:4px">${m.icon}<span>${m.label}</span></div>
      <div style="font-size:.62rem;opacity:.7;margin-top:2px">${m.desc}</div>
    </button>`;
  }).join('');
  return `<div class="pref-card" style="cursor:default;flex-direction:column;align-items:stretch;gap:10px;margin-top:8px">
    <div style="font-size:.78rem;font-weight:700;color:#9ca3af;letter-spacing:.03em;text-transform:uppercase;display:flex;align-items:center;gap:6px">Match Aggressiveness ${ftTip('Controls how aggressively AIOStreams <strong>deduplicates</strong> (removes duplicate) streams. <strong>Relaxed</strong> keeps more results &mdash; you see more options but some may be near-identical. <strong>Balanced</strong> removes obvious duplicates while keeping variety (recommended). <strong>Strict</strong> aggressively merges similar streams, showing fewer but higher-quality results.')}</div>
    <div style="display:flex;gap:6px">${pills}</div>
  </div>`;
}

function renderCacheMode() {
  const modes = [
    { v:'mixed',   icon:'<svg width="16" height="16" viewBox="0 0 44 44" fill="none"><rect x="7" y="7" width="30" height="30" rx="6" stroke="#06b6d4" stroke-width="1.5" fill="#06b6d4" fill-opacity=".06"/><circle cx="16" cy="18" r="3.5" fill="#22c55e" fill-opacity=".8"/><circle cx="28" cy="18" r="3.5" stroke="#f59e0b" stroke-width="1.2" fill="none"/><path d="M16 27h12" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round"/></svg>', label:'Mixed',       desc:'Cached + uncached, cached first' },
    { v:'cached',  icon:'<svg width="16" height="16" viewBox="0 0 44 44" fill="none"><rect x="7" y="7" width="30" height="30" rx="6" stroke="#22c55e" stroke-width="1.5" fill="#22c55e" fill-opacity=".08"/><path d="M15 22l4 4 10-10" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>', label:'Cached Only', desc:'Instant play — cached debrid only' },
    { v:'uncached',icon:'<svg width="16" height="16" viewBox="0 0 44 44" fill="none"><rect x="7" y="7" width="30" height="30" rx="6" stroke="#f59e0b" stroke-width="1.5" fill="#f59e0b" fill-opacity=".06"/><circle cx="22" cy="20" r="6" stroke="#f59e0b" stroke-width="1.5" fill="none"/><path d="M22 17v4l2.5 2.5" stroke="#f59e0b" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>', label:'Uncached',    desc:'Show uncached downloads only' },
  ];
  const cur = S.cacheMode || 'mixed';
  const pills = modes.map(m => {
    const on = cur === m.v;
    return `<button data-action="set-cache-mode" data-val="${m.v}" data-active="${on}" style="flex:1;padding:8px 4px;border-radius:8px;border:1.5px solid ${on?'rgba(0,212,255,.4)':'rgba(255,255,255,.07)'};background:${on?'rgba(0,212,255,.1)':'transparent'};color:${on?'#00d4ff':'#6b7280'};font-size:.8rem;font-weight:${on?'700':'500'};cursor:pointer;transition:all .15s;line-height:1.3">
      <div style="display:flex;align-items:center;justify-content:center;gap:4px">${m.icon}<span>${m.label}</span></div>
      <div style="font-size:.62rem;opacity:.7;margin-top:2px">${m.desc}</div>
    </button>`;
  }).join('');
  return `<div class="pref-card" style="cursor:default;flex-direction:column;align-items:stretch;gap:10px;margin-top:8px">
    <div style="font-size:.78rem;font-weight:700;color:#9ca3af;letter-spacing:.03em;text-transform:uppercase;display:flex;align-items:center;gap:6px">Stream Availability ${ftTip('<strong>Mixed</strong> shows both cached (instant play) and uncached (needs downloading) streams, with cached ranked first. <strong>Cached Only</strong> shows only streams already stored on your debrid service for instant playback. <strong>Uncached</strong> shows only streams that need to be downloaded first &mdash; useful for building your debrid library.')}</div>
    <div style="display:flex;gap:6px">${pills}</div>
  </div>`;
}

function outputProfileContext() {
  return {
    outputProfile: S.outputProfile || 'auto',
    simpleMode: Boolean(S.simpleMode),
    quickStart: Boolean(S.quickStart),
    pseArch: S.pseArch || 'standard',
    service: S.service,
    multiServices: [...(S.multiServices || [])],
    optionalScrapers: [...(S.optionalScrapers || [])],
    resolution: S.resolution,
    content: S.content,
    langs: [...(S.langs || [])],
    langExclusive: Boolean(S.langExclusive),
    sizeLimit: S.sizeLimit,
    bandwidthMbps: Number(S.bandwidthMbps) || 0,
    cacheMode: S.cacheMode,
    aiostreamsVersion: AIOSTREAMS_COMPATIBILITY_TARGETS.includes(S.aiostreamsVersion) ? S.aiostreamsVersion : '2.32.0',
  };
}

function activeOutputProfile() {
  return resolveOutputProfile(outputProfileContext());
}

function renderOutputProfilePicker({ compact=false } = {}) {
  const active = activeOutputProfile();
  const choices = compact ? ['stable', 'balanced'] : ['stable', 'balanced', 'advanced', 'labs'];
  const palette = {
    stable: ['#34d399', 'rgba(52,211,153,.09)', 'rgba(52,211,153,.28)'],
    balanced: ['#00d4ff', 'rgba(0,212,255,.09)', 'rgba(0,212,255,.28)'],
    advanced: ['#a78bfa', 'rgba(167,139,250,.09)', 'rgba(167,139,250,.28)'],
    labs: ['#fbbf24', 'rgba(251,191,36,.09)', 'rgba(251,191,36,.28)'],
  };
  const cards = choices.map(profile => {
    const [color, bg, border] = palette[profile];
    const info = OUTPUT_PROFILE_INFO[profile];
    const on = active === profile;
    return `<button type="button" data-action="set-output-profile" data-val="${profile}" aria-pressed="${on}" style="text-align:left;padding:9px 10px;border-radius:9px;border:1px solid ${on ? border : 'rgba(255,255,255,.08)'};background:${on ? bg : 'rgba(255,255,255,.015)'};color:#e6edf3;cursor:pointer;min-width:0;flex:1;transition:all .15s">
      <span style="display:block;font-size:.73rem;font-weight:800;color:${on ? color : '#9ca3af'}">${info.label}${on ? ' ✓' : ''}</span>
      <span style="display:block;font-size:.62rem;line-height:1.35;color:${on ? '#c9d1d9' : '#6b7280'};margin-top:3px">${info.description}</span>
    </button>`;
  }).join('');
  const flowDefault = S.simpleMode || S.quickStart ? 'Core Stable' : (S.pseArch === 'apex-mixed' ? 'Labs' : S.pseArch === 'iqr' ? 'Advanced' : 'Balanced');
  const target = AIOSTREAMS_COMPATIBILITY_TARGETS.includes(S.aiostreamsVersion) ? S.aiostreamsVersion : '2.32.0';
  const targetNote = target === '2.31.1'
    ? 'v2.31.1 legacy lane: Advanced/Labs may retain the old TorBox Search preset. Stable and Balanced do not emit it.'
    : target === '2.32.0'
      ? 'v2.32 lane: the old TorBox Search preset is removed. A Newznab replacement is not auto-added until endpoint/import tests pass.'
      : 'Unknown target: old TorBox Search is removed rather than assumed portable.';
  const targetControl = `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)"><label style="display:block;font-size:.64rem;color:#8b949e;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:5px">AIOStreams compatibility target</label><select data-action="set-aiostreams-target" style="width:100%;background:#0b0f16;color:#e6edf3;border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:7px 8px;font-size:.72rem"><option value="2.31.1" ${target === '2.31.1' ? 'selected' : ''}>2.31.1 — legacy TorBox Search compatibility lane</option><option value="2.32.0" ${target === '2.32.0' ? 'selected' : ''}>2.32.0 — remove legacy preset; Newznab migration review</option><option value="unknown" ${target === 'unknown' ? 'selected' : ''}>Unknown / older — do not assume legacy preset support</option></select><div style="font-size:.62rem;line-height:1.4;color:#6b7280;margin-top:5px">${targetNote}</div></div>`;
  const reset = S.outputProfile && S.outputProfile !== 'auto'
    ? `<button type="button" data-action="set-output-profile" data-val="auto" style="margin-top:7px;padding:0;border:0;background:none;color:#6b7280;font-size:.66rem;font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:2px">Use this flow’s default (${flowDefault})</button>`
    : `<span style="display:block;margin-top:7px;color:#4b5563;font-size:.66rem">This flow defaults to ${flowDefault}.</span>`;
  return `<div class="pref-card" style="cursor:default;flex-direction:column;align-items:stretch;gap:8px;margin-top:10px">
    <div style="display:flex;align-items:center;gap:7px"><span style="font-size:.76rem;font-weight:800;color:#9ca3af;letter-spacing:.04em;text-transform:uppercase">Output profile</span><span style="font-size:.62rem;font-weight:700;color:${palette[active][0]};padding:2px 6px;border-radius:4px;background:${palette[active][1]};border:1px solid ${palette[active][2]}">${OUTPUT_PROFILE_INFO[active].shortLabel}</span></div>
    <div style="display:grid;grid-template-columns:repeat(${compact ? 2 : 2},minmax(0,1fr));gap:6px">${cards}</div>
    ${active === 'stable' ? `<div style="font-size:.66rem;line-height:1.45;color:#8b949e">No remote scoring or synced rules. Groups, dynamic fetch exit, background prefetch, and autoplay are disabled so import and stream problems are easier to reproduce. Stream-pool and quality-first tuning are not exported in this profile.</div>` : ''}
    ${active === 'labs' ? `<div style="font-size:.66rem;line-height:1.45;color:#fbbf24">Labs uses experimental behaviour. Review every warning before installing.</div>` : ''}
    ${targetControl}
    ${reset}
  </div>`;
}

function outputProfileAudit(template) {
  const built = template || buildFinal();
  const profile = activeOutputProfile();
  const complexity = inspectTemplateComplexity(built);
  const conflicts = findFeatureConflicts(built);
  const budget = validateOutputProfileBudget(built, profile);
  return { profile, complexity, conflicts, budget };
}

function outputProfileAuditHtml() {
  const audit = outputProfileAudit();
  const profile = OUTPUT_PROFILE_INFO[audit.profile];
  const color = { stable:'#34d399', balanced:'#00d4ff', advanced:'#a78bfa', labs:'#fbbf24' }[audit.profile];
  const c = audit.complexity;
  const counts = [
    `ESE ${c.expressions.excluded}`,
    `ISE ${c.expressions.included}`,
    `PSE ${c.expressions.preferred}`,
    `Remote ${c.remoteDependencies.syncedSelUrls + c.remoteDependencies.syncedRegexUrls}`,
    `Add-ons ${c.runtime.enabledPresets}`,
  ];
  const visibleIssues = audit.conflicts.slice(0, 4);
  const budgetLine = audit.budget.ok
    ? `<span style="color:#34d399">Within ${profile.shortLabel} complexity budget</span>`
    : `<span style="color:#fbbf24">${audit.budget.violations.length} ${profile.shortLabel.toLowerCase()} budget check${audit.budget.violations.length === 1 ? '' : 's'} exceeded</span>`;
  const issueHtml = visibleIssues.length
    ? `<div style="margin-top:7px;display:flex;flex-direction:column;gap:4px">${visibleIssues.map(item => `<div style="font-size:.67rem;line-height:1.4;color:${item.severity === 'error' ? '#f87171' : '#fbbf24'}">${item.severity === 'error' ? '✕' : '⚠'} <b>${item.title}</b> — ${item.message}</div>`).join('')}${audit.conflicts.length > visibleIssues.length ? `<div style="font-size:.64rem;color:#6b7280">+${audit.conflicts.length - visibleIssues.length} more conflict check${audit.conflicts.length - visibleIssues.length === 1 ? '' : 's'} in diagnostics</div>` : ''}</div>`
    : `<div style="margin-top:7px;font-size:.67rem;color:#34d399">✓ No conflicting rule stacks detected.</div>`;
  return `<div style="margin-top:9px;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08)">
    <div style="display:flex;align-items:center;gap:7px"><span style="font-size:.74rem;font-weight:800;color:${color}">${profile.label}</span><span style="font-size:.64rem;color:#6b7280">Template complexity</span><span style="margin-left:auto;font-size:.63rem;font-weight:700">${budgetLine}</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:7px">${counts.map(count => `<span style="font-size:.62rem;color:#9ca3af;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:4px;padding:2px 5px">${count}</span>`).join('')}</div>
    ${issueHtml}
  </div>`;
}

function renderAdvancedPanel() {
  const chk = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0d1117" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const reachedReview = (localStorage.getItem('coreBuildStep') && parseInt(localStorage.getItem('coreBuildStep'), 10) === STEPS);
  const backText = reachedReview ? '✓ Save & Close' : '✕ Close';
  const AUDIO_OPTS = [
    { v:'lossless', icon:'<svg width="28" height="28" viewBox="0 0 44 44" fill="none"><path d="M8 17v10h5l8 6V11l-8 6H8z" stroke="#10b981" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M26 15a6 6 0 010 14" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M30 11a11 11 0 010 22" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M34 7a16 16 0 010 30" stroke="#10b981" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>', name:'Full Lossless', desc:'TrueHD · Atmos · DTS-HD MA · FLAC · eARC required' },
    { v:'standard', icon:'<svg width="28" height="28" viewBox="0 0 44 44" fill="none"><path d="M8 17v10h5l8 6V11l-8 6H8z" stroke="#f59e0b" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M26 15a6 6 0 010 14" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M30 11a11 11 0 010 22" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" fill="none"/><text x="40" y="14" text-anchor="middle" fill="#f59e0b" font-size="8" font-weight="800" font-family="system-ui,sans-serif">D+</text></svg>', name:'DD+ / Atmos', desc:'Soundbar or smart TV · Dolby Digital Plus' },
    { v:'limited',  icon:'<svg width="28" height="28" viewBox="0 0 44 44" fill="none"><path d="M6 18v8h5l7 5V13l-7 5H6z" stroke="#94a3b8" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M24 18a4 4 0 010 8" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="35" cy="22" r="7" stroke="#94a3b8" stroke-width="1.5" fill="none"/><circle cx="35" cy="22" r="2" stroke="#94a3b8" stroke-width="1.2" fill="none"/></svg>', name:'Auto', desc:'Let device profile decide · safe default' },
    { v:'dolby',    icon:'<svg width="28" height="28" viewBox="0 0 44 44" fill="none"><path d="M8 17v10h5l8 6V11l-8 6H8z" stroke="#818cf8" stroke-width="1.5" stroke-linejoin="round" fill="none"/><rect x="26" y="13" width="14" height="18" rx="3" stroke="#818cf8" stroke-width="1.5" fill="none"/><path d="M30 13v18" stroke="#818cf8" stroke-width="1.8" stroke-linecap="round"/><path d="M36 13v18" stroke="#818cf8" stroke-width="1.8" stroke-linecap="round"/><path d="M30 13a9 9 0 010 18" stroke="#818cf8" stroke-width="1.5" fill="none"/><path d="M36 13a9 9 0 000 18" stroke="#818cf8" stroke-width="1.5" fill="none"/></svg>', name:'Dolby Only', desc:'Atmos · TrueHD · DD+ · no DTS' },
  ];
  const audioRows = AUDIO_OPTS.map(o => {
    const on = S.audio === o.v;
    return `<div class="svc-list-row opt adv-audio-row" data-action="set-audio" data-val="${o.v}" data-active="${on}" style="cursor:pointer;border:1px solid ${on?'rgba(0,212,255,.35)':'rgba(255,255,255,.07)'};background:${on?'rgba(0,212,255,.05)':'rgba(13,17,23,.7)'};border-radius:11px;padding:11px 14px;display:flex;align-items:center;gap:12px;transition:border-color .15s,background .15s">
      <div style="flex-shrink:0;pointer-events:none">${o.icon}</div>
      <div style="flex:1;min-width:0;pointer-events:none"><div style="font-size:.86rem;font-weight:600;color:${on?'#00d4ff':'#e6edf3'}">${o.name}</div><div style="font-size:.69rem;color:#6b7280;margin-top:1px">${o.desc}</div></div>
      <button type="button" class="help-btn" data-action="toggle-help-target" data-target="audiohelp_adv_${o.v}" title="What does this mean?" aria-label="Explain ${o.name}">?</button>
      <span style="color:${on?'#00d4ff':'#374151'};flex-shrink:0;pointer-events:none">${on?ICO.check(14,'#00d4ff'):'<span style="font-size:.9rem">›</span>'}</span>
    </div><div class="device-help" id="audiohelp_adv_${o.v}" style="border:none;padding:6px 14px 2px">${AUDIO_HELP[o.v] || ''}</div>`;
  }).join('');


  const sizeOpts = ['10','20','30','50','unlimited'];
  const sizePills = sizeOpts.map(v => {
    const on = (S.sizeLimit || 'unlimited') === v;
    const lbl = v === 'unlimited' ? 'Unlimited' : v + 'GB';
    return `<button data-action="set-size-limit" data-val="${v}" class="size-btn${on?' size-btn-active':''}" style="flex:1;padding:8px 4px;border-radius:8px;border:1.5px solid ${on?'rgba(0,212,255,.4)':'rgba(255,255,255,.07)'};background:${on?'rgba(0,212,255,.1)':'transparent'};color:${on?'#00d4ff':'#6b7280'};font-size:.8rem;font-weight:${on?'700':'500'};cursor:pointer;transition:all .15s">${lbl}</button>`;
  }).join('');

  const prefCard = (key, title, desc) => {
    const on = !!S[key];
    return `<div class="pref-card${on?' pref-on':''}" data-action="toggle-pref" data-key="${key}" style="cursor:pointer">
      <div class="pref-body-inner"><div class="pref-title">${title}</div><div class="pref-desc">${desc}</div></div>
      <div class="pref-circle">${on?chk:''}</div>
    </div>`;
  };

  return `<div class="card" style="padding:0">
    <div style="display:flex;align-items:center;gap:12px;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
      <button data-action="close-advanced" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:8px;color:#9ca3af;font-size:.9rem;padding:6px 11px;cursor:pointer;transition:all .15s" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='rgba(255,255,255,.05)'">${backText}</button>
      <div>
        <div style="font-weight:800;font-size:1rem;color:#e6edf3">Fine-Tune</div>
        <div style="font-size:.72rem;color:#4b5563;margin-top:1px">Audio · Video · Formatter</div>
      </div>
    </div>
    <div style="padding:18px 20px;display:flex;flex-direction:column;gap:20px">
      ${renderOutputProfilePicker()}

      <div>
        <div style="font-size:.72rem;font-weight:700;color:#4b5563;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px">${ICO.speaker(16,'#f59e0b')} Sound Profile ${ftTip('Controls which <strong>audio codecs</strong> are allowed in your streams. <strong>Limited</strong> excludes lossless formats (TrueHD, DTS-HD MA) that need high bandwidth. <strong>Full</strong> includes everything for home theater setups with proper receivers.')}</div>
        <div style="display:flex;flex-direction:column;gap:7px">${audioRows}</div>
      </div>

      <div>
        <div style="font-size:.72rem;font-weight:700;color:#4b5563;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px">${ICO.video(16,'#ec4899')} Video Preferences ${ftTip('<strong>Size Limit</strong> caps per-file size. <strong>Quality vs Resolution</strong> decides ranking priority &mdash; quality prefers REMUX/WEB-DL over raw resolution. <strong>Exclude 4K</strong> removes 2160p for bandwidth saving. <strong>Exclude DV</strong> removes Dolby Vision streams that cause purple/green tint on unsupported screens.')}</div>
        <div style="background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;margin-bottom:8px">
          <div style="font-size:.78rem;font-weight:600;color:#6b7280;margin-bottom:10px">Size Limit</div>
          <div style="display:flex;gap:5px">${sizePills}</div>
        </div>
        ${prefCard('qualityFirst','Prioritize Quality over Resolution','Sorts by source quality (e.g. REMUX) before resolution.')}
        ${prefCard('resolutionFirst','Resolution First','Higher resolution always ranks above lower, even if lower-res is cached.')}
        ${prefCard('exclude4K','Exclude 4K / UHD','Removes 2160p streams. Good for bandwidth saving.')}
        ${prefCard('excludeDV','Exclude Dolby Vision','Fixes purple/green tint on unsupported screens.')}
        <div style="background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;margin-top:8px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:.78rem;font-weight:600;color:#6b7280">Age Rating Limit</span> ${ftTip('Filter content by age certification (MPAA/TV). <strong>None</strong> shows everything. Lower ratings restrict to age-appropriate content. Requires <strong>certification()</strong> SEL support in AIOStreams.')}
          </div>
          <div style="font-size:.65rem;color:#4b5563;margin-bottom:10px;line-height:1.4">Restrict streams by age rating — useful for shared/family setups</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${AGE_RATINGS.map(r => { const on = S.ageLimit === r.v; return `<button data-action="set-age-limit" data-val="${r.v}" style="padding:6px 10px;border-radius:6px;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid ${on?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${on?'rgba(0,212,255,.1)':'transparent'};color:${on?'#00d4ff':'#6b7280'}">${r.label.split(' — ')[0]}</button>`; }).join('')}
          </div>
        </div>
        <div style="background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;margin-top:8px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
            <span style="font-size:.78rem;font-weight:600;color:#6b7280">Stream Pool</span> ${ftTip('How many streams AIOStreams collects before sorting and filtering. <strong>More streams = better quality picks</strong> but slower load times. Normal is good for most users. Increase if you want the absolute best quality match.')}
            <span style="font-size:.65rem;color:#4b5563">${{normal:'30–35 results',large:'50 results',max:'75 results'}[S.streamPool||'normal']}</span>
          </div>
          <div style="display:flex;gap:5px">
            ${[['normal','Normal','20'],['large','Large','30–35'],['max','Maximum','50']].map(([v,l,c]) => `<button data-action="set-pool" data-val="${v}" style="flex:1;padding:8px 8px 6px;border-radius:6px;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid ${(S.streamPool||'normal')===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${(S.streamPool||'normal')===v?'rgba(0,212,255,.1)':'transparent'};color:${(S.streamPool||'normal')===v?'#00d4ff':'#6b7280'};line-height:1.3">${l}<br><span style="font-size:.6rem;font-weight:600;opacity:.7">${c} results</span></button>`).join('')}
          </div>
          <div style="font-size:.65rem;color:#4b5563;margin-top:6px;line-height:1.4">More streams = better quality picks but slower load times</div>
        </div>
        ${(S.service !== 'http' && S.service !== 'p2p') ? `<div style="background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;margin-top:8px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:.78rem;font-weight:600;color:#6b7280">PSE Quality Architecture</span> ${ftTip('<strong>Standard</strong> uses simple resolution/quality tiers to rank streams. <strong>Apex IQR</strong> uses statistical bitrate analysis (interquartile range) to detect outliers &mdash; it adapts to what&apos;s actually available, filtering out suspiciously low or high bitrates. Apex IQR matches the flagship 4K Apex template.')}
          </div>
          <div style="font-size:.65rem;color:#4b5563;margin-bottom:10px;line-height:1.4">How stream quality tiers are built. Standard uses simple resolution/quality filters. Apex IQR uses statistical bitrate analysis matching the flagship Apex template.</div>
          <div style="display:flex;gap:5px">
            ${[['standard','Standard','Simple quality tiers'],['iqr','Apex IQR','Statistical bitrate filtering'],['apex-mixed','Apex Mixed','IQR + adaptive · niche-friendly']].map(([v,l,d]) => { const on=(S.pseArch||'standard')===v; return `<button data-action="set-pse-arch" data-val="${v}" data-active="${on}" style="flex:1;padding:8px 8px 6px;border-radius:6px;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid ${on?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${on?'rgba(0,212,255,.1)':'transparent'};color:${on?'#00d4ff':'#6b7280'};line-height:1.3">${l}<br><span style="font-size:.6rem;font-weight:600;opacity:.7">${d}</span></button>`; }).join('')}
          </div>
        </div>` : ''}
        ${(S.service !== 'http' && S.service !== 'p2p') ? `<div style="background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;margin-top:8px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:.78rem;font-weight:600;color:#6b7280">Library Boost</span> ${ftTip('<strong>Default</strong> ranks library items first within each quality tier. <strong>Strong</strong> always puts library items at the very top regardless of quality. <strong>None</strong> removes library sorting entirely.')}
          </div>
          <div style="font-size:.65rem;color:#4b5563;margin-bottom:10px;line-height:1.4">How much priority your existing library items get in results</div>
          <div style="display:flex;gap:5px">
            ${[['none','None','Sorted normally'],['default','Default','First within tier'],['strong','Strong','Always top']].map(([v,l,dd]) => { const on=(S.libraryBoost||'default')===v; return `<button data-action="set-library-boost" data-val="${v}" style="flex:1;padding:8px 8px 6px;border-radius:6px;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid ${on?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${on?'rgba(0,212,255,.1)':'transparent'};color:${on?'#00d4ff':'#6b7280'};line-height:1.3">${l}<br><span style="font-size:.6rem;font-weight:600;opacity:.7">${dd}</span></button>`; }).join('')}
          </div>
        </div>` : ''}
        ${(S.service !== 'http' && S.service !== 'p2p' && (S.multiServices.includes('easynews') || S.multiServices.includes('nzbgeek') || S.multiServices.includes('streamnzb') || S.service === 'easynews' || S.service === 'nzbgeek' || S.service === 'streamnzb')) ? `<div style="background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;margin-top:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div>
              <div style="font-size:.78rem;font-weight:700;color:#e6edf3">NZB Failover</div>
              <div style="font-size:.68rem;color:#6b7280">Configurable NZB failover position and count</div>
            </div>
            <label class="toggle-sw"><input type="checkbox" data-action="toggle-nzb-failover" ${S.nzbFailover?'checked':''}><span class="toggle-track"></span></label>
          </div>
          ${S.nzbFailover ? `
            <div style="display:flex;gap:6px;margin-bottom:8px">
              ${[['before-torrents','Before Torrents'],['after-torrents','After Torrents']].map(([v,l]) => { const on=(S.nzbFailoverPosition||'after-torrents')===v; return `<button data-action="set-nzb-failover-pos" data-val="${v}" style="flex:1;padding:6px 8px;border-radius:7px;border:1px solid ${on?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${on?'rgba(0,212,255,.1)':'transparent'};color:${on?'#00d4ff':'#6b7280'};font-size:.7rem;font-weight:700;cursor:pointer">${l}</button>`; }).join('')}
            </div>
            <div style="display:flex;gap:6px">
              ${[[1,'1 NZB'],[2,'2 NZBs'],[3,'3 NZBs'],[5,'5 NZBs']].map(([v,l]) => { const on=(S.maxFailoverNzbs||3)===v; return `<button data-action="set-max-failover-nzbs" data-val="${v}" style="flex:1;padding:6px 8px;border-radius:7px;border:1px solid ${on?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${on?'rgba(0,212,255,.1)':'transparent'};color:${on?'#00d4ff':'#6b7280'};font-size:.7rem;font-weight:700;cursor:pointer">${l}</button>`; }).join('')}
            </div>
          ` : ''}
        </div>` : ''}
      </div>

      <div>
        <div style="font-size:.72rem;font-weight:700;color:#4b5563;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px">${ICO.palette(16,'#a78bfa')} Stream Layout (Formatter) ${ftTip('Controls how streams appear in Stremio. The <strong>formatter</strong> defines the layout of each stream result &mdash; what info is shown (codec, resolution, size, etc.) and how it&apos;s arranged. You can import custom formatters for different visual styles.')}</div>
        ${fmtDropdownHtml()}
        <button data-action="import-formatter" style="margin-top:10px;width:100%;padding:10px;border-radius:8px;border:1.5px dashed rgba(167,139,250,.3);background:transparent;color:#a78bfa;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='rgba(167,139,250,.6)'" onmouseout="this.style.borderColor='rgba(167,139,250,.3)'">${S.customFormatter ? '⟳ Replace Custom Formatter' : ICO.folder(14,'#a78bfa')+' Import Custom Formatter'}</button>
      </div>

      <div>
        <div style="font-size:.72rem;font-weight:700;color:#4b5563;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px">${ICO.globe(16,'#06b6d4')} Subtitles ${ftTip('Choose subtitle providers and languages. <strong>AIOSubtitle</strong> is built-in and fast. <strong>OpenSubtitles v3+</strong> has the largest database. <strong>SubDL</strong> is a fast alternative (requires a free API key from subdl.com). Select languages your household needs &mdash; this affects which subtitles are fetched.')}</div>
        <div style="background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px">
          <div style="font-size:.78rem;font-weight:600;color:#6b7280;margin-bottom:8px">Subtitle Sources</div>
          <div style="display:flex;flex-direction:column;gap:5px">
            ${[['aiosubtitle','AIOSubtitle','Built-in, fast'],['opensubtitles-v3-plus','OpenSubtitles v3+','Largest database'],['subdl','SubDL','Fast alternative']].map(([id,name,desc])=>{
              const on=(S.subtitleAddons||['aiosubtitle']).includes(id);
              return `<div data-action="toggle-sub-addon" data-val="${id}" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;border:1px solid ${on?'rgba(6,182,212,.35)':'rgba(255,255,255,.06)'};background:${on?'rgba(6,182,212,.05)':'transparent'};transition:all .15s">
                <div class="chk-box" style="width:16px;height:16px;border-radius:4px;border:1.5px solid ${on?'#06b6d4':'#374151'};display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${on?'#06b6d4':'transparent'}">${on?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0d1117" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':''}</div>
                <div style="flex:1"><div class="opt-nm" style="font-size:.8rem;font-weight:600;color:${on?'#06b6d4':'#9ca3af'}">${name}</div><div style="font-size:.65rem;color:#4b5563">${desc}</div></div>
              </div>`;
            }).join('')}
          </div>
          ${(S.subtitleAddons||[]).includes('subdl') ? `
          <div style="margin-top:10px;padding:10px 12px;background:rgba(6,182,212,.04);border:1px solid rgba(6,182,212,.15);border-radius:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:.72rem;font-weight:600;color:#06b6d4">SubDL API Key</span>
              <a href="https://subdl.com/panel/api" target="_blank" rel="noopener noreferrer" style="font-size:.68rem;color:#06b6d4;text-decoration:none;font-weight:700;opacity:.7">Get key &rarr;</a>
            </div>
            <div style="position:relative;display:flex;align-items:center">
              <input class="name-input" id="cred_subdl" data-service="subdl" data-action="update-cred" type="password" placeholder="Your SubDL API key"
                value="${escH(S.creds.subdl || '')}" maxlength="120" style="padding-right:38px;font-size:.78rem">
              <button type="button" data-action="toggle-cred-vis" data-target="cred_subdl" title="Show / hide"
                style="position:absolute;right:10px;background:none;border:none;cursor:pointer;color:#4b5563;padding:0;line-height:1;font-size:.72rem;transition:color .15s"
                onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div style="font-size:.62rem;color:#4b5563;margin-top:5px;line-height:1.4">Required by SubDL. Free keys available at subdl.com/panel/api</div>
          </div>` : ''}
          <div style="font-size:.78rem;font-weight:600;color:#6b7280;margin-top:12px;margin-bottom:8px">Subtitle Languages</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${['en','es','fr','de','it','pt','nl','pl','ru','ar','ja','ko','zh','hi','tr','sv','da','no','fi','cs','hu','ro','el','he','th','vi','id','ms','uk','bg'].map(l=>{
              const on=(S.subtitleLangs||['en']).includes(l);
              const names={en:'English',es:'Spanish',fr:'French',de:'German',it:'Italian',pt:'Portuguese',nl:'Dutch',pl:'Polish',ru:'Russian',ar:'Arabic',ja:'Japanese',ko:'Korean',zh:'Chinese',hi:'Hindi',tr:'Turkish',sv:'Swedish',da:'Danish',no:'Norwegian',fi:'Finnish',cs:'Czech',hu:'Hungarian',ro:'Romanian',el:'Greek',he:'Hebrew',th:'Thai',vi:'Vietnamese',id:'Indonesian',ms:'Malay',uk:'Ukrainian',bg:'Bulgarian'};
              return `<button data-action="toggle-sub-lang" data-val="${l}" style="padding:4px 8px;border-radius:6px;font-size:.68rem;font-weight:${on?'700':'500'};border:1px solid ${on?'rgba(6,182,212,.4)':'rgba(255,255,255,.07)'};background:${on?'rgba(6,182,212,.1)':'transparent'};color:${on?'#06b6d4':'#6b7280'};cursor:pointer;transition:all .15s" title="${names[l]||l}">${l.toUpperCase()}</button>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div>
        <div style="font-size:.72rem;font-weight:700;color:#4b5563;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px">${ICO.compass(16,'#f97316')} Catalogs & Discovery ${ftTip('Adds <strong>browse catalogs</strong> to your Stremio home screen for discovering content. These don&apos;t affect stream quality &mdash; they just add new ways to find movies and shows (trending, by streaming service, anime databases, etc).')}</div>
        <div style="background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px">
          <div style="font-size:.65rem;color:#4b5563;margin-bottom:10px;line-height:1.4">Add browse catalogs to your Stremio home screen for discovering content.</div>
          <div style="display:flex;flex-direction:column;gap:5px">
            ${[['tmdb-addon','TMDB Addon','Popular & trending movies/series'],['streaming-catalogs','Streaming Catalogs','Netflix, Disney+, etc.'],['anime-catalogs','Anime Catalogs','MAL, AniList, Kitsu'],['rpdb-catalogs','RPDB Catalogs','Release tracking & ratings'],['torrent-catalogs','Torrent Catalogs','Top seeded torrents']].map(([id,name,desc])=>{
              const on=(S.catalogs||['tmdb-addon']).includes(id);
              return `<div data-action="toggle-catalog" data-val="${id}" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;border:1px solid ${on?'rgba(249,115,22,.35)':'rgba(255,255,255,.06)'};background:${on?'rgba(249,115,22,.05)':'transparent'};transition:all .15s">
                <div class="chk-box" style="width:16px;height:16px;border-radius:4px;border:1.5px solid ${on?'#f97316':'#374151'};display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${on?'#f97316':'transparent'}">${on?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0d1117" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':''}</div>
                <div style="flex:1"><div class="opt-nm" style="font-size:.8rem;font-weight:600;color:${on?'#f97316':'#9ca3af'}">${name}</div><div style="font-size:.65rem;color:#4b5563">${desc}</div></div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      ${(S.service !== 'p2p' && S.service !== 'http') ? `<div>
        <div style="font-size:.72rem;font-weight:700;color:#4b5563;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px">${ICO.gear(16,'#64748b')} Proxy & Resilience</div>
        <div style="background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px">
          ${prefCard('proxyEnabled','Enable Stream Proxy','Route streams through MediaFlow proxy. Helps with geo-restrictions and ISP throttling.')}
          ${S.proxyEnabled ? `<div style="margin-top:10px">
            <div style="font-size:.78rem;font-weight:600;color:#6b7280;margin-bottom:8px">Proxy Through Services</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${['realdebrid','alldebrid','torbox','premiumize','debridlink','easynews'].map(s=>{
                const on=(S.proxiedServices||[]).includes(s);
                const names={realdebrid:'Real-Debrid',alldebrid:'AllDebrid',torbox:'TorBox',premiumize:'Premiumize',debridlink:'Debrid-Link',easynews:'EasyNews'};
                return `<button data-action="toggle-proxy-svc" data-val="${s}" style="padding:6px 10px;border-radius:6px;font-size:.72rem;font-weight:${on?'700':'500'};border:1px solid ${on?'rgba(100,116,139,.5)':'rgba(255,255,255,.07)'};background:${on?'rgba(100,116,139,.12)':'transparent'};color:${on?'#94a3b8':'#6b7280'};cursor:pointer;transition:all .15s">${names[s]||s}</button>`;
              }).join('')}
            </div>
          </div>` : ''}
          <div style="margin-top:10px">
            ${prefCard('dedupMerge','Failover Streams','Keep deduplicated streams as fallbacks instead of discarding. If the primary stream fails, AIOStreams tries the next best match.')}
          </div>
        </div>
      </div>` : `<div>
        <div style="font-size:.72rem;font-weight:700;color:#4b5563;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px">${ICO.gear(16,'#64748b')} Resilience</div>
        ${prefCard('dedupMerge','Failover Streams','Keep deduplicated streams as fallbacks. If the primary stream fails, AIOStreams tries the next best match.')}
      </div>`}

      <div>
        <div style="font-size:.72rem;font-weight:700;color:#4b5563;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px">Playback & Timing</div>
        ${prefCard('preloadEnabled','Preload first streams','Preload cached candidates to reduce wait time. Disable to reduce background requests.')}
        <div style="margin-top:8px"><div style="font-size:.68rem;color:#6b7280;margin-bottom:5px">Autoplay method</div><div style="display:flex;gap:5px">${[['matchingFile','Matching file'],['matchingIndex','Matching index'],['firstFile','First file']].map(([v,l])=>`<button data-action="set-autoplay-method" data-val="${v}" style="flex:1;padding:6px;border-radius:7px;border:1px solid ${(S.autoPlayMethod||'matchingFile')===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${(S.autoPlayMethod||'matchingFile')===v?'rgba(0,212,255,.1)':'transparent'};color:${(S.autoPlayMethod||'matchingFile')===v?'#67e8f9':'#6b7280'};font-size:.65rem;cursor:pointer">${l}</button>`).join('')}</div></div>
        <div style="margin-top:8px"><div style="font-size:.68rem;color:#6b7280;margin-bottom:5px">Global addon timeout</div><div style="display:flex;gap:5px">${[4000,6000,8000,10000].map(v=>`<button data-action="set-addon-timeout" data-val="${v}" style="flex:1;padding:6px;border-radius:7px;border:1px solid ${Number(S.addonTimeout||6000)===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${Number(S.addonTimeout||6000)===v?'rgba(0,212,255,.1)':'transparent'};color:${Number(S.addonTimeout||6000)===v?'#67e8f9':'#6b7280'};font-size:.65rem;cursor:pointer">${v/1000}s</button>`).join('')}</div></div>
        <div style="margin-top:8px"><div style="font-size:.68rem;color:#6b7280;margin-bottom:5px">Bandwidth cap (Mbps) <span style="opacity:.6">— auto-limits bitrate to 80% of your speed</span></div><input type="number" min="1" max="10000" placeholder="e.g. 100" value="${S.bandwidthMbps||''}" data-action="set-bandwidth" style="width:100%;padding:7px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#e6edf3;font-size:.72rem;outline:none" /></div>
      </div>

      <div>
        <div style="font-size:.72rem;font-weight:700;color:#4b5563;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px">Partial Exports</div>
        <div style="font-size:.67rem;color:#6b7280;margin-bottom:8px">Download only the layer you want to apply. Credentials are excluded.</div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">
          ${[['formatter','Formatter only'],['filtering','Filtering only'],['sorting','Sorting only'],['device','Device limits'],['services','Services & presets']].map(([kind,label])=>`<button data-action="export-partial" data-kind="${kind}" style="padding:8px;border-radius:8px;border:1px solid rgba(0,212,255,.18);background:rgba(0,212,255,.04);color:#67e8f9;font-size:.7rem;font-weight:700;cursor:pointer">${label}</button>`).join('')}
        </div>
      </div>

    </div>
    ${S.multiServices.length > 0 ? `<div style="position:sticky;bottom:0;padding:14px 20px;border-top:1px solid rgba(255,255,255,.06);background:linear-gradient(to top,#0d1017 60%,transparent)"><button data-action="close-and-next" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:linear-gradient(135deg,#0891b2,#00d4ff);color:#0d1017;font-size:.92rem;font-weight:800;cursor:pointer;letter-spacing:.02em;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;box-shadow:0 4px 20px rgba(0,212,255,.3)" onmouseover="this.style.boxShadow='0 6px 28px rgba(0,212,255,.5)';this.style.transform='translateY(-1px)'" onmouseout="this.style.boxShadow='0 4px 20px rgba(0,212,255,.3)';this.style.transform='none'">Save &amp; Continue<span style="font-size:1.1rem">→</span></button></div>` : ''}
  </div>`;
}

let _advancedTrigger = null;
function openAdvancedDrawer(trigger) {
  document.getElementById('advancedDrawer')?.remove();
  _advancedTrigger = trigger || document.activeElement;
  let content;
  try { content = renderAdvancedPanel(); }
  catch (error) {
    showAdvanced = false;
    showToast('Fine-Tune could not open — your setup is still safe', true);
    console.error('Fine-Tune render failed', error);
    return;
  }
  showAdvanced = true;
  const overlay = document.createElement('div');
  overlay.id = 'advancedDrawer';
  overlay.className = 'advanced-drawer-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Fine-Tune settings');
  overlay.innerHTML = `<div class="advanced-drawer-panel"><div class="advanced-drawer-content">${content}</div></div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('advanced-drawer-open');
  overlay.addEventListener('click', event => { if (event.target === overlay) closeAdvancedDrawer(); });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeAdvancedDrawer(); return; }
    if (event.key !== 'Tab') return;
    const focusable = overlay.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary,[tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  overlay.querySelector('[data-action="close-advanced"]')?.focus();
  requestAnimationFrame(() => overlay.classList.add('active'));
}

function closeAdvancedDrawer() {
  const overlay = document.getElementById('advancedDrawer');
  showAdvanced = false;
  document.body.classList.remove('advanced-drawer-open');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 180);
  }
  render();
  _advancedTrigger = null;
  setTimeout(() => document.querySelector('[data-action="open-advanced"]')?.focus(), 200);
}

function refreshAdvancedDrawer() {
  const content = document.querySelector('#advancedDrawer .advanced-drawer-content');
  if (!content) return false;
  try { content.innerHTML = renderAdvancedPanel(); }
  catch (error) {
    console.error('Fine-Tune refresh failed', error);
    closeAdvancedDrawer();
    showToast('Fine-Tune closed after a rendering error — your setup was preserved', true);
  }
  return true;
}

function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function renderSidebar() {
  const sb = document.getElementById('cbSidebar');
  if (!sb) return;
  const stepsEl = document.getElementById('sbSteps');
  const SHORT = {0:'Sources',1:'Device',2:'Video Quality',3:'Content Preferences',4:'Accounts & Keys',5:'Review & Install'};
  if (step === 0) { sb.classList.add('sb-hidden'); return; }
  sb.classList.remove('sb-hidden');
  const items = Array.from({length: STEPS}, (_, i) => {
    const n = i + 1;
    const isDone = n < step;
    const isActive = n === step;
    const cls = isDone ? 'sb-step sb-done' : isActive ? 'sb-step sb-active' : 'sb-step';
    const numContent = isDone ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : n;
    const k = DEFS[i] ? DEFS[i].key : null;
    let sub = '—';
    if (isDone && k && S[k]) { sub = label(k, S[k]) || '—'; }
    else if (isActive && DEFS[i]) { const t = document.createElement('div'); t.innerHTML = DEFS[i].desc; sub = (t.textContent || '').slice(0,50); }
    const clickAttr = isDone ? ` data-action="jump-step" data-step="${n}"` : '';
    return `<li class="${cls}"${clickAttr}><div class="sb-num">${numContent}</div><div><div class="sb-step-title">${escH(SHORT[i])}</div><div class="sb-step-sub">${escH(sub)}</div></div></li>`;
  }).join('');
  if (stepsEl) stepsEl.innerHTML = items;
  const numEl = document.getElementById('sbStepNum');
  const totalEl = document.getElementById('sbStepTotal');
  const fillEl = document.getElementById('sbProgFill');
  if (numEl) numEl.textContent = step;
  if (totalEl) totalEl.textContent = STEPS;
  if (fillEl) fillEl.style.width = Math.round((step / STEPS) * 100) + '%';
}

function renderProgress() {
  renderSidebar();
  const progWrap = document.querySelector('.prog-wrap');
  const nav = document.getElementById('nav');
  const hdrBadge = document.getElementById('hdrVersionBadge');
  if (step === 0) {
    if (progWrap) progWrap.style.display = 'none';
    if (nav) nav.style.display = 'none';
    if (hdrBadge) hdrBadge.style.display = 'none';
    return;
  }
  if (progWrap) progWrap.style.display = '';
  if (nav) nav.style.display = '';
  if (hdrBadge) hdrBadge.style.display = '';

  const keys  = ['service','device','resolution','audio','content',null];

  // Step bubble strip
  const bubbles = Array.from({length: STEPS}, (_, i) => {
    const n = i + 1;
    const state = n < step ? 'done' : n === step ? 'active' : 'pending';
    const tipName = DEFS[i] ? DEFS[i].title : (n === STEPS ? 'Review' : `Step ${n}`);
    const SHORT_LABELS = {0:'Sources',1:'Device',2:'Quality',3:'Content',4:'Accounts',5:'Install'};
    const shortName = SHORT_LABELS[i] || tipName;
    const clickable = state === 'done' ? ` data-action="jump-step" data-step="${n}" role="button" tabindex="0" aria-label="Go back to ${tipName}"` : '';
    const k = keys[i];
    const tipVal = k && S[k] ? label(k, S[k]) : null;
    const tipHtml = tipVal ? `<span class="step-tip">${tipName}: ${tipVal}</span>` : '';
    return `<div class="step-unit ${state}"${clickable}>${tipHtml}<div class="step-bub">${state==='done'?ICO.check(12,'currentColor'):''}</div><div class="step-lbl">${shortName}</div></div>`;
  }).join('');

  const strip = document.getElementById('stepStrip');
  if (strip) strip.innerHTML = `<div class="step-strip">${bubbles}<button class="btn-reset-strip" data-action="reset-state" title="Start over from scratch">${ICO.refresh(14,'currentColor')} Start Over</button></div><div class="auto-saved" id="autoSavedBadge">${ICO.check(10,'currentColor')} Auto-saved</div>`;

  // Breadcrumb chips — show completed selections
  const chips = keys.slice(0, step - 1).map((k, i) => {
    if (!k || !S[k]) return '';
    const lbl = label(k, S[k]);
    return lbl ? `<span class="bc-chip">${ICO.check(10,'currentColor')} ${lbl}</span>` : '';
  }).filter(Boolean);

  const bc = document.getElementById('breadcrumbs');
  if (bc) bc.innerHTML = chips.length ? `<div class="bc-row">${chips.join('')}</div>` : '';
}

function splashPresetsHtml(svc) {
  const debrid = !['free','http','p2p'].includes(svc);
  const presets = [];
  if (debrid) {
    presets.push({action:'quick-start',preset:'4k',icon:ICO.crown(22,'#a78bfa'),name:'4K Apex',detail:'Flagship · IQR · Lossless'});
    presets.push({action:'quick-start',preset:'1080p',icon:ICO.tv(22,'#00d4ff'),name:'1080p Stream',detail:'Balanced · DD+ audio'});
  }
  if (svc === 'easynews') presets.push({action:'quick-start',preset:'1080p',icon:ICO.newspaper(22,'#94a3b8'),name:'Usenet Stream',detail:'EasyNews · Fast'});
  if (!debrid || svc === 'free') {
    presets.push({action:'quick-start',preset:'http',icon:ICO.globe(22,'#34d399'),name:'Free Streaming',detail:'No account needed'});
    presets.push({action:'quick-start',preset:'p2p',icon:ICO.link(22,'#fbbf24'),name:'Free P2P',detail:'Torrents · No debrid'});
  }
  presets.push({action:'open-tutorial',preset:'',icon:ICO.question(22,'#f472b6'),name:'Tutorial',detail:'New here? Start here'});
  presets.push({action:'paste-manifest-splash',preset:'',icon:ICO.clipboard(22,'#fb923c'),name:'Paste Manifest',detail:'Import existing config'});
  return presets.map(p => `<div class="splash-preset-card" data-action="${p.action}"${p.preset?` data-preset="${p.preset}"`:''} tabindex="0" role="button">
    <div class="splash-preset-icon">${p.icon}</div>
    <div class="splash-preset-name">${p.name}</div>
    <div class="splash-preset-detail">${p.detail}</div>
  </div>`).join('');
}
function splashHtml() {
  const _splashSvc = S.service || (hadSavedState ? 'torbox' : (localStorage.getItem('coreBuildLastSvc') || 'torbox'));
  return `<div class="card splash hybrid-splash">
    <div class="hybrid-topbar splash-anim splash-anim-d1">
      <div class="hybrid-mini-brand">CORE <b>BUILDS</b></div>
      <div class="hybrid-toplinks">
        <a href="https://corebuilds-docs.docsalot.dev/templates/directory" target="_blank" rel="noopener noreferrer">Templates</a>
        <a href="https://github.com/brevityA/Core-Builds" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="https://www.reddit.com/r/CoreBuilds/" target="_blank" rel="noopener noreferrer">Core Crew</a>
        <a href="https://discord.gg/ZvjnKbrq" target="_blank" rel="noopener noreferrer">Discord</a>
        <button data-action="show-changelog" class="hybrid-version">v${CONFIGURATOR_VERSION}</button>
      </div>
    </div>

    <div class="hybrid-hero">
      <div class="splash-anim splash-anim-d2">
        <div class="hybrid-eyebrow">AIOStreams template configurator</div>
        <h1>Build streams<br>with intent.</h1>
        <div class="hybrid-lede">Choose your service, device, and preferences. Core Builds turns them into a polished <strong>AIOStreams template</strong> — without touching JSON.</div>
        <div class="hybrid-trust"><span><i></i> Runs locally</span><span><i></i> Open source</span><span><i></i> No account required</span></div>
        <div class="splash-stats" id="splashStats"></div>
      </div>
      <div class="hybrid-core-stage splash-anim splash-anim-d2">
        <button type="button" class="core-support-mark" data-action="open-support" aria-label="Support Core Builds" title="Support Core Builds">
          <svg class="splash-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
            <defs>
              <linearGradient id="hsg1" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="#00e5ff"/><stop offset="100%" stop-color="#4facfe"/></linearGradient>
              <linearGradient id="hsg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4facfe"/><stop offset="50%" stop-color="#c060c0"/><stop offset="100%" stop-color="#ff4b2b"/></linearGradient>
              <filter id="hsf"><feGaussianBlur stdDeviation="12" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
            </defs>
            <polygon points="256,41 442,149 442,363 256,471 70,363 70,149" fill="#00e5ff" opacity=".05"/>
            <polygon class="hex-glow-layer" points="256,41 442,149 442,363 256,471 70,363 70,149" fill="none" stroke="url(#hsg1)" stroke-width="14" stroke-linejoin="round" opacity=".88"/>
            <polygon class="diamond-glow" points="256,166 346,256 256,346 166,256" fill="url(#hsg2)" opacity=".34" filter="url(#hsf)"/>
            <polygon class="diamond-core core-support-gem" points="256,166 346,256 256,346 166,256" fill="url(#hsg2)" opacity=".9"/>
            <circle class="core-click-ring" cx="256" cy="256" r="86"/>
          </svg>
        </button>
        <div class="hybrid-core-caption">Tap the core to support</div>
      </div>
    </div>

    ${hadSavedState && _savedStep > 0 ? `<div class="hybrid-session continue-banner">
      ${versionBannerHtml()}
      <div style="flex:1;min-width:180px"><div style="font-size:.76rem;font-weight:800;color:#00d4ff">Continue where you left off</div><div style="font-size:.66rem;color:#6b7280;margin-top:2px">Step ${_savedStep} of 6${S.service ? ' · ' + label('service', S.service) : ''}</div></div>
      <button data-action="continue-session" class="splash-cta-continue" style="padding:8px 14px;background:rgba(0,212,255,.15);border:1px solid rgba(0,212,255,.35);border-radius:8px;color:#00d4ff;font-size:.76rem;font-weight:800;cursor:pointer">Resume</button>
      <button data-action="start-fresh" class="splash-cta-discard" style="padding:6px 9px;background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:7px;color:#6b7280;cursor:pointer" title="Discard saved session">&#10005;</button>
      ${S.service && S.device && S.resolution ? `<button data-action="quick-reinstall" style="padding:8px 13px;background:rgba(52,211,153,.07);border:1px solid rgba(52,211,153,.22);border-radius:8px;color:#34d399;font-size:.72rem;font-weight:800;cursor:pointer">${ICO.bolt(14,'#34d399')} Previous settings → Install</button>` : ''}
    </div>` : ''}

    <div class="hybrid-services splash-anim splash-anim-d3">
      <div class="hybrid-services-label">Your service</div>
      <div class="splash-chips" role="radiogroup" aria-label="Select your service">
        <span class="splash-chip${_splashSvc==='torbox'?' active':''}" data-svc="torbox" role="radio" aria-checked="${_splashSvc==='torbox'}" tabindex="0"><span class="splash-chip-icon">${ICO.bolt(14,'#fbbf24')}</span> TorBox</span>
        <span class="splash-chip${_splashSvc==='alldebrid'?' active':''}" data-svc="alldebrid" role="radio" aria-checked="${_splashSvc==='alldebrid'}" tabindex="0"><span class="splash-chip-icon">${ICO.diamond(14,'#60a5fa')}</span> AllDebrid</span>
        <span class="splash-chip${_splashSvc==='realdebrid'?' active':''}" data-svc="realdebrid" role="radio" aria-checked="${_splashSvc==='realdebrid'}" tabindex="0"><span class="splash-chip-icon">${ICO.circle(14,'#4ade80')}</span> Real-Debrid</span>
        <span class="splash-chip${_splashSvc==='easynews'?' active':''}" data-svc="easynews" role="radio" aria-checked="${_splashSvc==='easynews'}" tabindex="0"><span class="splash-chip-icon">${ICO.newspaper(14,'#94a3b8')}</span> EasyNews</span>
        <span class="splash-chip${_splashSvc==='free'?' active':''}" data-svc="free" role="radio" aria-checked="${_splashSvc==='free'}" tabindex="0"><span class="splash-chip-icon">${ICO.free(14,'#34d399')}</span> Free</span>
      </div>
    </div>

    <div class="hybrid-section-head splash-anim splash-anim-d4"><div><h2>Choose your route</h2><p>Start simple or take full control.</p></div><p class="hybrid-section-index">01 / Workflow</p></div>
    <div class="splash-doors splash-anim splash-anim-d4">
      <div class="splash-door fastlane-door" data-action="open-express-lane" tabindex="0" role="button"><div class="splash-door-icon">${ICO.bolt(22,'#00d4ff')}</div><div class="splash-door-text"><div class="splash-door-title">Express Install <span class="splash-door-tag fastlane-badge">One-click</span></div><div class="splash-door-desc">Pick your debrid, connect Stremio, and install — about 30 seconds.</div></div></div>
      <div class="splash-door fastlane-door" data-action="open-fast-lane" tabindex="0" role="button"><div class="splash-door-icon">${ICO.rocket(22,'#00d4ff')}</div><div class="splash-door-text"><div class="splash-door-title">Quick Install <span class="splash-door-tag fastlane-badge">Fastest</span></div><div class="splash-door-desc">Choose an app, service, and performance profile — then install in one short flow.</div></div></div>
      <div class="splash-door" data-action="custom-start" tabindex="0" role="button"><div class="splash-door-icon">${ICO.gear(22,'#a78bfa')}</div><div class="splash-door-text"><div class="splash-door-title">Advanced Builder <span class="splash-door-tag splash-tag-advanced">Advanced</span></div><div class="splash-door-desc">Fine control over every filter, sort rule, and formatter.</div></div></div>
      <div class="splash-door" data-action="update-template" tabindex="0" role="button"><div class="splash-door-icon">${ICO.refresh(22,'#34d399')}</div><div class="splash-door-text"><div class="splash-door-title">Update Existing Setup <span class="splash-door-tag" style="background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2)">Updater</span></div><div class="splash-door-desc">Import an existing template and rebuild it with current logic.</div></div></div>
    </div>

    <div class="hybrid-section-head splash-anim splash-anim-d5"><div><h2>Ready-Made Setups</h2><p>Opinionated presets for common setups.</p></div><p class="hybrid-section-index">02 / Presets</p></div>
    <div class="splash-presets splash-anim splash-anim-d5" id="splashPresets">${splashPresetsHtml(_splashSvc)}</div>

    <div class="hybrid-section-head splash-anim splash-anim-d6"><div><h2>Utilities</h2><p>Back up or explore the Core tool suite.</p></div><p class="hybrid-section-index">03 / Tools</p></div>
    <div class="splash-doors splash-anim splash-anim-d6">
      <a class="splash-door core-tool-door" href="../account-tools/" target="_blank" rel="noopener noreferrer"><div class="splash-door-icon">${ICO.download(22,'#34d399')}</div><div class="splash-door-text"><div class="splash-door-title">Back Up Addons <span class="splash-door-tag" style="background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2)">Read-only</span></div><div class="splash-door-desc">View and download your current Stremio addon setup. Nothing is changed.</div></div></a>
      <a class="splash-door core-tool-door" href="../tools/"><div class="splash-door-icon">${ICO.folder(22,'#a78bfa')}</div><div class="splash-door-text"><div class="splash-door-title">All Core Tools</div><div class="splash-door-desc">Builder, backup, and upcoming inspection utilities.</div></div></a>
    </div>

    <div class="splash-tertiary splash-anim splash-anim-d6">
      <button data-action="easy-start" class="splash-tertiary-btn">Guided Setup</button>
      <a href="https://corebuilds-docs.docsalot.dev/templates/directory" target="_blank" rel="noopener noreferrer" class="splash-tertiary-btn">Browse Templates</a>
      <button data-action="compare-templates" class="splash-tertiary-btn">Compare</button>
      <a href="https://github.com/brevityA/Core-Builds" target="_blank" rel="noopener noreferrer" class="splash-tertiary-btn">GitHub</a>
      <a href="https://www.reddit.com/r/CoreBuilds/" target="_blank" rel="noopener noreferrer" class="splash-tertiary-btn">Core Crew</a>
      <a href="https://discord.gg/ZvjnKbrq" target="_blank" rel="noopener noreferrer" class="splash-tertiary-btn">Discord</a>
      <button data-action="show-changelog" class="splash-tertiary-btn">What's new · v${CONFIGURATOR_VERSION}</button>
      <button data-action="open-diagnostics" class="splash-tertiary-btn">Report Issue</button>
    </div>
    <div class="splash-footer">Built by Brevity · Core Builds is not affiliated with TorBox or AIOStreams</div>
  </div>`;
}
function initScrollFades() {
  document.querySelectorAll('.scroll-fade-wrap').forEach(wrap => {
    const inner = wrap.firstElementChild;
    if (!inner) return;
    function update() {
      wrap.dataset.scrollStart = inner.scrollLeft <= 1 ? 'true' : 'false';
      wrap.dataset.scrollEnd = (inner.scrollLeft + inner.clientWidth >= inner.scrollWidth - 1) ? 'true' : 'false';
    }
    if (!inner._scrollFadeBound) {
      inner.addEventListener('scroll', update, { passive: true });
      inner._scrollFadeBound = true;
    }
    update();
  });
}

function render() {
  renderProgress();
  const main = document.getElementById('main');
  const nav  = document.getElementById('nav');

  if (step === 0) {
    main.innerHTML = splashHtml();
    main.style.justifyContent = 'center';
    return;
  }
  main.style.justifyContent = '';

  if (showAdvanced && refreshAdvancedDrawer()) return;

  const def  = DEFS[step - 1];

  if (step === STEPS && S.simpleMode) {
    if (!S.name) { S.name = defaultName(); saveState(); }
    main.innerHTML = simpleFinishHtml();
    nav.style.display = 'flex';
    const _sb = document.getElementById('btnBack');
    _sb.style.visibility = 'visible';
    _sb.innerHTML = '← Edit answers';
    document.getElementById('btnNext').style.display = 'none';
    return;
  }

  if (step === STEPS) {
    if (!S.name) { S.name = defaultName(); saveState(); }
    const auto = S.name;
    const hasApis = S.tmdbToken || S.tmdbApiKey || Object.values(S.creds).some(v=>v);
    main.innerHTML = `
      <div class="card">
        <div class="receipt-card">
          <div class="receipt-hdr">
            <div class="receipt-hdr-icon">${ICO.bolt(18,'#fbbf24')}</div>
            <div>
              <div class="receipt-hdr-name">${S.name || auto}</div>
              <div class="receipt-hdr-sub">Template ready to generate</div>
            </div>
          </div>
          ${[
            {k:'service',    ico:ICO.plug(14,'#8b949e')},
            {k:'device',     ico:ICO.tv(14,'#8b949e')},
            {k:'resolution', ico:ICO.monitor(14,'#8b949e')},
            {k:'audio',      ico:ICO.speaker(14,'#8b949e')},
            {k:'content',    ico:ICO.film(14,'#8b949e')},
            {k:'formatter',  ico:ICO.palette(14,'#8b949e')},
          ].map(({k, ico}) => {
            const JUMP = { service:1, device:2, resolution:3, audio:3, content:4 };
            const jumpAttr = JUMP[k] ? ` data-action="jump-step" data-step="${JUMP[k]}" title="Click to change"` : (k === 'formatter' ? ` data-action="open-fmt-picker" title="Click to change"` : '');
            const audioOverride = k==='audio' && ['lossless','dolby'].includes(S.audio) && DEVICE_FORCE_LIMITED_AUDIO.has(S.device);
            const val = label(k, S[k]) || '—';
            const isNonDefault = k==='service' || (k==='audio' && S.audio!=='limited') || (k==='content' && S.content && S.content!=='all') || (k==='resolution' && (S.resolution==='4k'||S.resolution==='mixed')) || (k==='formatter' && S.formatter!=='family-v4');
            return `<div class="receipt-row"${jumpAttr}>
              <div class="receipt-row-left">
                <span class="receipt-row-ico">${ico}</span>
                <span class="receipt-row-lbl">${k}</span>
              </div>
              <div class="receipt-row-val${isNonDefault?' hl':''}">
                ${val}${audioOverride ? ` <span style="color:#f59e0b;font-size:.7rem">${ICO.warn(11,'#f59e0b')} capped</span>` : ''}
              </div>
            </div>`;
          }).join('')}
          ${S.cacheMode !== 'mixed' ? `<div class="receipt-row"><div class="receipt-row-left"><span class="receipt-row-ico">${ICO.antenna(14,'#8b949e')}</span><span class="receipt-row-lbl">cache</span></div><div class="receipt-row-val hl">${S.cacheMode === 'cached' ? 'Cached Only' : 'Uncached Only'}</div></div>` : ''}
          ${S.langs && (S.langs.length > 1 || !S.langs.includes('English') || S.langExclusive) ? `<div class="receipt-row"><div class="receipt-row-left"><span class="receipt-row-ico">${ICO.globe(14,'#8b949e')}</span><span class="receipt-row-lbl">languages</span></div><div class="receipt-row-val hl">${S.langs.slice(0,3).join(', ')}${S.langs.length>3?` +${S.langs.length-3}`:''}${S.langExclusive?' · Exclusive':''}</div></div>` : ''}
          ${hasApis ? `<div class="receipt-row">
            <div class="receipt-row-left">
              <span class="receipt-row-ico">${ICO.key(14,'#8b949e')}</span>
              <span class="receipt-row-lbl">Accounts &amp; Keys</span>
            </div>
            <div class="receipt-row-val" style="color:#10b981">${[
              Object.values(S.creds).filter(v=>v).length ? ICO.check(10,'#10b981')+' Debrid' : '',
              S.tmdbToken ? ICO.check(10,'#10b981')+' TMDB' : '',
              S.tmdbApiKey ? ICO.check(10,'#10b981')+' TMDB Key' : ''
            ].filter(Boolean).join(' · ')}</div>
          </div>` : ''}
        </div>
        ${renderOutputProfilePicker()}
        ${outputProfileAuditHtml()}
        ${(() => { const d = lastGenDiff(); return d.length ? `<div style="margin-top:2px;padding:8px 12px;border-radius:8px;background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.12)"><div style="font-size:.68rem;font-weight:700;color:#f59e0b;margin-bottom:3px;letter-spacing:.04em;text-transform:uppercase">Changed since last download</div><div style="font-size:.72rem;color:#8b949e;line-height:1.5">${d.map(c=>'<span style="display:inline-block;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.15);border-radius:4px;padding:1px 7px;margin:2px 3px 2px 0;font-size:.68rem;font-weight:600;color:#fbbf24">'+c+'</span>').join('')}</div></div>` : ''; })()}
        ${(() => { const h = templateHealthCheck(); return h.length ? `<div class="th-alert th-alert-red" style="margin-top:6px"><div style="font-size:.68rem;font-weight:700;color:var(--th-red);margin-bottom:3px;letter-spacing:.04em;text-transform:uppercase">Health check</div><div style="font-size:.72rem;color:var(--th-tx2);line-height:1.6">${h.map(w=>`<div style="display:flex;align-items:baseline;gap:5px;margin-bottom:2px"><span style="color:var(--th-red);flex-shrink:0">${ICO.warn(12,'currentColor')}</span><span>${w}</span></div>`).join('')}</div></div>` : `<div class="th-alert th-alert-green" style="margin-top:6px;font-weight:600">${ICO.check(12,'currentColor')} Template looks good</div>`; })()}
        ${healthScoreHtml()}
        ${versionBannerHtml()}
        ${hostCompatHtml()}
        ${backupTimelineHtml()}
        <details class="rv-accord" style="margin-top:10px">
          <summary class="rv-accord-hdr"><span class="rv-accord-ico"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> Tools<span class="rv-arr">›</span></summary>
          <div class="rv-accord-body" style="display:flex;flex-direction:column;gap:8px">
            <button data-action="open-troubleshooter" style="width:100%;padding:10px;font-size:.78rem;font-weight:700;border-radius:10px;border:1px solid var(--th-yellow-border);background:var(--th-yellow-bg);color:var(--th-yellow);cursor:pointer;transition:background .15s;display:flex;align-items:center;justify-content:center;gap:6px">🔧 Troubleshooter — Fix Common Issues</button>
            <button data-action="open-feedback-report" style="width:100%;padding:10px;font-size:.78rem;font-weight:700;border-radius:10px;border:1px solid rgba(0,212,255,.24);background:rgba(0,212,255,.05);color:#00d4ff;cursor:pointer;transition:background .15s;display:flex;align-items:center;justify-content:center;gap:6px">🧾 Copy Safe Feedback Report</button>
            <button class="btn-td" data-action="test-drive">${ICO.eye(15,'currentColor')} Test Drive — Preview Your Streams</button>
          </div>
        </details>
        <div class="name-row">
          <label>Template name (optional)</label>
          <input class="name-input" id="nameIn" type="text" placeholder="${auto}"
            value="${escH(S.name)}" data-action="update-name" maxlength="60">
        </div>
        ${sizeLimitHtml()}
        <button class="btn-dl" data-action="generate-dl">${ICO.download(14,'currentColor')} Export Template JSON</button>
        <button data-action="open-feedback-report" style="width:100%;margin-top:8px;padding:10px;font-size:.78rem;font-weight:700;border-radius:10px;border:1px solid rgba(0,212,255,.24);background:rgba(0,212,255,.05);color:#00d4ff;cursor:pointer">🧾 Need help? Copy a safe feedback report</button>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button data-action="share-config" style="flex:1;padding:11px;font-size:.82rem;font-weight:700;border-radius:10px;border:1px solid rgba(0,212,255,.18);background:rgba(0,212,255,.04);color:#3d9db5;cursor:pointer;transition:background .15s;display:flex;align-items:center;justify-content:center;gap:6px" onmouseover="this.style.background='rgba(0,212,255,.1)'" onmouseout="this.style.background='rgba(0,212,255,.04)'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share</button>
          <button class="btn-aio" data-action="create-import" id="btnImport" style="flex:1;margin-top:0;padding:11px;font-size:.82rem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Import to AIOStreams
          </button>
        </div>
        <div id="importUrlResult"></div>
        <details class="rv-section" open>
          <summary class="rv-section-hdr"><span class="rv-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Deploy</span><span class="rv-arr">›</span></summary>
          <div class="rv-section-body">
            ${S.service === 'p2p' || S.service === 'http' ? `
            <div style="margin-bottom:14px;font-size:.8rem;color:#8b949e;line-height:1.5">Free templates need manual import — we'll create a link and open AIOStreams for you.</div>
            <button class="btn-manifest" id="btnAutoCreate" data-action="simple-install" data-target="app" style="margin-bottom:8px">${ICO.link(18,'currentColor')} Import to AIOStreams</button>
            <div id="aioResult"></div>` : `
            <div class="install-toggle" style="display:flex;border-radius:10px;border:1px solid var(--th-input-border);background:var(--th-input-bg);padding:3px;margin-bottom:14px;gap:2px">
              <button data-action="set-install-mode" data-mode="direct" class="install-toggle-btn${S.installMode==='direct'?' active':''}" style="flex:1;padding:8px 10px;border-radius:8px;border:none;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .15s;${S.installMode==='direct'?'background:var(--th-accent-bg);color:var(--th-accent)':'background:transparent;color:var(--th-tx3)'}">${ICO.rocket(13,'currentColor')} Direct Install</button>
              <button data-action="set-install-mode" data-mode="manifest" class="install-toggle-btn${S.installMode==='manifest'?' active':''}" style="flex:1;padding:8px 10px;border-radius:8px;border:none;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .15s;${S.installMode==='manifest'?'background:var(--th-accent-bg);color:var(--th-accent)':'background:transparent;color:var(--th-tx3)'}">${ICO.link(13,'currentColor')} Get Manifest URL</button>
            </div>
            ${S.installMode === 'direct' ? `
            <div style="margin-bottom:14px;font-size:.8rem;color:#8b949e;line-height:1.5">Enter your Stremio credentials to install the addon directly to your library.</div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
              <input id="stremioEmailInline" type="email" placeholder="Stremio email" autocomplete="email" data-action="update-stremio-email"
                value="${escH(S.stremioEmail||'')}"
                class="th-input">
              <div style="position:relative">
                <input id="stremioPasswordInline" type="password" placeholder="Stremio password" autocomplete="current-password" data-action="update-stremio-password"
                  value="${escH(S.stremioPassword||'')}"
                  class="th-input" style="padding-right:40px">
                <button type="button" data-action="toggle-stremio-pwd" aria-label="Show or hide password"
                  style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--th-tx4);padding:2px;line-height:1;display:flex;align-items:center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:-2px">
                <button type="button" data-action="create-stremio-account" style="font-size:.74rem;color:var(--th-accent);background:none;border:none;cursor:pointer;padding:0;font-weight:600;opacity:.8;transition:opacity .15s">Create random account →</button>
                <a href="https://www.stremio.com/register" target="_blank" rel="noopener noreferrer" style="font-size:.72rem;color:var(--th-tx3);text-decoration:none;transition:color .15s">Sign up at stremio.com</a>
              </div>
            </div>
            <button class="btn-manifest" id="btnAutoCreate" data-action="simple-install" data-target="app" style="margin-bottom:8px">${ICO.rocket(18,'currentColor')} Install to Stremio</button>
            <div style="display:flex;align-items:center;gap:6px;justify-content:center;margin-top:2px;margin-bottom:8px;font-size:.68rem;color:#059669;font-weight:600">
              <span>🔐</span> <span>Safe Auth — Credentials are used locally to authenticate with Stremio API. Never stored or shared.</span>
            </div>
            <div id="aioResult"></div>
            ` : `
            <div style="margin-bottom:14px;font-size:.8rem;color:#8b949e;line-height:1.5">Creates your config on the fastest AIOStreams host and gives you an install link.</div>
            <button class="btn-manifest" id="btnAutoCreate" data-action="simple-install" data-target="app" style="margin-bottom:8px">${ICO.rocket(18,'currentColor')} Deploy to Stremio</button>
            <div style="display:flex;gap:8px">
              <button class="btn-manifest" data-action="simple-install" data-target="wuplay" style="flex:1;font-size:.82rem;padding:11px 10px;background:rgba(167,139,250,.10);border-color:rgba(167,139,250,.3);color:#a78bfa">${ICO.wuplay(16,'#a78bfa')} WuPlay</button>
              <button class="btn-manifest" data-action="simple-install" data-target="nuvio" style="flex:1;font-size:.82rem;padding:11px 10px;background:rgba(168,85,247,.08);border-color:rgba(168,85,247,.25);color:#c084fc">${ICO.nuvio(16)} Nuvio</button>
            </div>
            <div id="aioResult"></div>
            `}`}
            <details style="margin-top:16px;border-top:1px solid rgba(255,255,255,.06);padding-top:14px">
              <summary style="list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;color:#4b5563;font-size:.79rem;font-weight:600;letter-spacing:.02em;user-select:none">
                <span>Manual setup (existing config / self-hosted)</span>
                <span style="font-size:.75rem;color:#374151">›</span>
              </summary>
              <div style="margin-top:12px">
            <div class="aio-fields" style="display:grid;gap:10px">
              <div class="name-row" style="margin-bottom:0">
                <label>AIOStreams Host</label>
                <select class="name-input" id="aioHost" data-action="update-host" style="cursor:pointer;color-scheme:dark">
                  <option value="auto"       ${S.instanceHost==='auto'?'selected':''}>Auto (tries all public hosts)</option>
                  <option value="elfhosted"  ${S.instanceHost==='elfhosted'||S.instanceHost===''?'selected':''}>ElfHosted — aiostreams.elfhosted.com</option>
                  <option value="fortheweak" ${S.instanceHost==='fortheweak'?'selected':''}>ForthWeak — aiostreams.fortheweak.cloud</option>
                  <option value="midnight"   ${S.instanceHost==='midnight'?'selected':''}>Midnight's — midnightignite.me</option>
                  <option value="viren"      ${S.instanceHost==='viren'?'selected':''}>Viren's — aiostreams.viren070.me</option>
                  <option value="kuu"        ${S.instanceHost==='kuu'?'selected':''}>Kuu's — aiostreams.stremio.ru</option>
                  <option value="atbp"       ${S.instanceHost==='atbp'?'selected':''}>ATBP — aio.atbphosting.com</option>
                  <option value="omni"       ${S.instanceHost==='omni'?'selected':''}>Omni's — aiostreams.12312023.xyz</option>
                  <option value="wizaardd"   ${S.instanceHost==='wizaardd'?'selected':''}>Wizaardd — forthewizards.uk</option>
                  <option value="custom"     ${S.instanceHost==='custom'?'selected':''}>Custom / Self-hosted</option>
                </select>
              </div>
              <div id="aioUrlRow" class="name-row" style="margin-bottom:0;${S.instanceHost==='custom'?'':'display:none'}">
                <label>Instance URL</label>
                <input class="name-input" id="aioUrl" type="url" placeholder="https://your-aiostreams.example.com"
                  value="${S.instanceHost==='custom'?escH(S.instanceUrl):''}" data-action="update-url" maxlength="200">
              </div>
              <div class="name-row" style="margin-bottom:0">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                  <span style="color:#8b949e;font-size:.82rem;text-transform:uppercase;letter-spacing:.05em">Password</span>
                  <button type="button" data-action="gen-pwd" style="font-size:.82rem;color:#00d4ff;background:none;border:none;cursor:pointer;padding:0;font-weight:700">Generate →</button>
                </div>
                <div style="position:relative">
                  <input class="name-input" id="aioPwd" type="password" placeholder="Create a password to protect your manifest"
                    value="${escH(S.instancePassword||'')}" data-action="update-pwd" maxlength="200" autocomplete="new-password"
                    style="padding-right:40px">
                  <button type="button" id="pwdEye" data-action="toggle-pwd"
                    title="Show/hide password"
                    style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#4b5563;padding:2px;line-height:1;display:flex;align-items:center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <div id="hostConfigLinkRow" style="margin-top:-4px;margin-bottom:2px;${S.instanceHost==='auto'||S.instanceHost==='custom'?'display:none':''}">
                <a id="hostConfigLink" href="${HOST_BASE_URLS[S.instanceHost]?HOST_BASE_URLS[S.instanceHost]+'/configure':'#'}" target="_blank" rel="noopener noreferrer" class="host-cfg-link">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Open configure page
                </a>
              </div>
              <div id="aioUuidRow" class="name-row" style="margin-bottom:0;${S.instanceHost==='auto'||S.instanceHost==='custom'?'display:none':''}">
                <label>UUID</label>
                <input class="name-input" id="aioUuid" type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx or paste manifest URL"
                  value="${S.instanceUuid}" data-action="update-uuid" maxlength="500" style="font-family:monospace;font-size:.88rem;transition:border-color .15s">
                <div id="uuidStatus" style="font-size:.73rem;margin-top:4px;min-height:18px"></div>
              </div>
            </div>
            <details id="baseConfigDetails" style="margin-top:12px;border:1px solid var(--th-purple-border);border-radius:10px;padding:10px 13px;background:var(--th-purple-bg)">
              <summary style="list-style:none;display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;outline:none">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--th-purple)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                <span style="font-size:.74rem;font-weight:700;color:var(--th-purple);letter-spacing:.03em">Base Config</span>
                <span style="font-size:.65rem;color:var(--th-tx3);margin-left:2px">${S.baseUuid ? '· active' : '· optional'}</span>
                <span style="margin-left:auto;font-size:.72rem;color:var(--th-tx3)">›</span>
              </summary>
              <div style="margin-top:10px">
                <div style="font-size:.72rem;color:var(--th-tx3);line-height:1.5;margin-bottom:10px">
                  If you've imported <strong style="color:var(--th-purple)">Core Builds Base — TorBox</strong>, enter its UUID here.
                  Your generated template will inherit all shared config from the parent — smaller JSON, instant propagation of base updates.
                </div>
                <div class="name-row" style="margin-bottom:6px">
                  <label style="color:var(--th-purple)">Base UUID</label>
                  <input class="name-input" id="baseUuidInput" type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value="${escH(S.baseUuid||'')}" data-action="update-base-uuid" maxlength="36"
                    style="font-family:monospace;font-size:.85rem;border-color:${S.baseUuid ? 'var(--th-purple-border)' : ''}">
                </div>
                <div class="name-row" style="margin-bottom:0">
                  <label style="color:var(--th-purple)">Base Password</label>
                  <input class="name-input" id="basePwdInput" type="password"
                    placeholder="leave blank if none"
                    value="${escH(S.basePassword||'')}" data-action="update-base-pwd" maxlength="200"
                    autocomplete="new-password">
                </div>
                ${S.baseUuid ? `<div style="font-size:.7rem;color:#a855f7;margin-top:8px;display:flex;align-items:center;gap:5px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Generated template will use parentConfig — formatter, sort, presets inherited from base.</div>` : ''}
              </div>
            </details>
            <button class="btn-manifest" id="btnAio" data-action="install-stremio" style="margin-top:14px">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Get Install Link
            </button>
            <div id="manualAioResult"></div>
              </div>
            </details>
            <details id="pasteManifestDetails" style="margin-top:16px;border-top:1px solid rgba(255,255,255,.06);padding-top:14px" ${pasteMode ? 'open' : ''}>
              <summary style="list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;color:#4b5563;font-size:.79rem;font-weight:600;letter-spacing:.02em;user-select:none">
                <span>Already have a manifest URL?</span>
                <span style="font-size:.75rem;color:#374151">›</span>
              </summary>
              <div style="margin-top:10px">
                <div style="color:#6b7280;font-size:.76rem;margin-bottom:8px;line-height:1.45">Paste a manifest URL for instant install links:</div>
                <input class="name-input" id="pasteManifest" type="url"
                  placeholder="https://aiostreams.elfhosted.com/stremio/uuid/password/manifest.json"
                  data-action="paste-manifest" style="font-size:.8rem;font-family:monospace">
                <div id="pasteManifestResult"></div>
              </div>
            </details>
          </div>
        </details>
        <details class="rv-section">
          <summary class="rv-section-hdr"><span class="rv-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Customize</span><span class="rv-arr">›</span></summary>
          <div class="rv-section-body">
            ${insightsHtml()}
            ${telemetryHtml()}
            <details id="fmtPickerDetails" class="rv-accord" style="margin-top:0;margin-bottom:12px">
              <summary class="rv-accord-hdr">
                <span style="display:flex;align-items:center;gap:8px"><span>${ICO.palette(14,'currentColor')}</span> Stream Formatter <span style="font-weight:600;color:var(--th-tx5);text-transform:none;letter-spacing:0;font-size:.72rem">— ${label('formatter', S.formatter)}</span></span><span class="rv-arr">›</span>
              </summary>
              <div class="rv-accord-body">${formatterPickerHtml()}</div>
            </details>
            <details id="jsonPreviewDetails" class="rv-accord" style="margin-top:0;margin-bottom:12px">
              <summary class="rv-accord-hdr">
                <span>Preview JSON</span><span style="display:flex;align-items:center;gap:10px"><button type="button" data-action="copy-json" style="font-size:.74rem;font-weight:700;color:var(--th-accent);background:var(--th-accent-bg);border:1px solid var(--th-accent-border);border-radius:6px;padding:3px 11px;cursor:pointer;text-transform:none;letter-spacing:0">Copy JSON</button><span class="rv-arr">›</span></span>
              </summary>
              <pre id="jsonPreview" style="margin:0;padding:12px 16px;background:var(--th-card-alt);overflow-x:auto;font-size:.68rem;color:var(--th-tx2);font-family:monospace;line-height:1.5;max-height:260px;overflow-y:auto"></pre>
            </details>
          </div>
        </details>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06);text-align:center">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:.61rem;font-weight:700;color:#374151;letter-spacing:.09em;text-transform:uppercase">More from Core Builds</div>
            <div style="display:flex;gap:12px;align-items:center">
              <button data-action="open-diagnostics" style="font-size:.74rem;font-weight:700;color:#6b7280;background:none;border:none;cursor:pointer;padding:2px 0;text-decoration:underline;text-underline-offset:2px;transition:color .15s">Report Issue</button>
              <button data-action="show-changelog" style="font-size:.74rem;font-weight:700;color:#6b7280;background:none;border:none;cursor:pointer;padding:2px 0;text-decoration:underline;text-underline-offset:2px;transition:color .15s" onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">Changelog</button>
              <a href="../tools/" style="font-size:.74rem;font-weight:700;color:#6b7280;padding:2px 0;text-decoration:underline;text-underline-offset:2px;transition:color .15s" onmouseover="this.style.color='#00d4ff'" onmouseout="this.style.color='#6b7280'">Tools</a>
              <button data-action="start-setup" style="font-size:.74rem;font-weight:700;color:#6b7280;background:none;border:none;cursor:pointer;padding:2px 0;text-decoration:underline;text-underline-offset:2px;transition:color .15s" onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">Start Over</button>
            </div>
          </div>
          <div style="display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:6px 16px">
            <a href="https://corebuilds-docs.docsalot.dev/templates/directory" target="_blank" rel="noopener noreferrer" class="community-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Browse Templates
            </a>
            <a href="../tools/" class="community-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Tools
            </a>
            <a href="https://github.com/brevityA/Core-Builds" target="_blank" rel="noopener noreferrer" class="community-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
              GitHub
            </a>
            <a href="https://www.reddit.com/r/CoreBuilds/" target="_blank" rel="noopener noreferrer" class="community-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
              Core Crew
            </a>
            <a href="https://discord.gg/ZvjnKbrq" target="_blank" rel="noopener noreferrer" class="community-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              Discord
            </a>
          </div>
        </div>
      </div>`;
    nav.style.display = 'flex';
    const _rb = document.getElementById('btnBack');
    _rb.style.visibility = 'visible';
    _rb.innerHTML = '← Edit Config';
    document.getElementById('btnNext').style.display = 'none';
    if (pasteMode) {
      pasteMode = false;
      setTimeout(() => {
        const details = document.getElementById('pasteManifestDetails');
        const input = document.getElementById('pasteManifest');
        if (details) details.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (input) setTimeout(() => input.focus(), 300);
      }, 100);
    }
    updateUuidValidation(S.instanceUuid);
    const jpd = document.getElementById('jsonPreviewDetails');
    if (jpd) jpd.addEventListener('toggle', () => {
      const pre = document.getElementById('jsonPreview');
      if (jpd.open && pre) pre.textContent = JSON.stringify(buildFinal(), null, 2);
    });

  } else if (def.id === 'apis') {
    const debridInputs = getDebridInputs();
    const ringC = 131.9, ringPct = (step - 1) / (STEPS - 1);
    main.innerHTML = `
      <div class="card">
        <div class="srh">
          <div class="srh-ring">
            <svg viewBox="0 0 52 52" width="52" height="52" style="overflow:visible">
              <defs><linearGradient id="rg${step}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00d4ff"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs>
              <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="2.5"/>
              <circle cx="26" cy="26" r="21" fill="none" stroke="url(#rg${step})" stroke-width="2.5"
                stroke-dasharray="${ringC}" stroke-dashoffset="${(ringC*(1-ringPct)).toFixed(1)}"
                stroke-linecap="round" transform="rotate(-90 26 26)"/>
            </svg>
            <div class="srh-num">${step}</div>
          </div>
          <div>
            <div class="srh-title">${def.title} <span style="font-size:.72rem;font-weight:600;color:#374151;letter-spacing:.04em">OPTIONAL</span></div>
            <div class="srh-sub">${def.desc}</div>
          </div>
        </div>
        <!-- Transparent credential-handling notice -->
        <div style="display:flex;align-items:flex-start;gap:12px;background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.18);border-radius:10px;padding:12px 14px;margin-bottom:16px;box-shadow:0 2px 10px rgba(16,185,129,.02)">
          <div style="font-size:1.3rem;line-height:1.2;flex-shrink:0;color:#10b981">🛡️</div>
          <div style="text-align:left">
            <div style="font-size:.82rem;font-weight:800;color:#34d399;letter-spacing:.02em;margin-bottom:2px">Transparent Credential Handling</div>
            <div style="font-size:.7rem;color:#8b949e;line-height:1.45">Core Builds does not log your credentials. <b>Export JSON</b> creates the file locally in your browser. If you choose <b>Direct Install</b>, the generated configuration is transmitted to the AIOStreams host you selected so it can create your manifest.</div>
          </div>
        </div>
        <details id="langDetails" style="margin-bottom:16px;border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden">
          <summary style="list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:11px 14px;background:rgba(255,255,255,.03);user-select:none" onclick="this.parentElement.querySelector('.lang-chevron').style.transform=this.parentElement.open?'rotate(0deg)':'rotate(90deg)'">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:.74rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em">Language Preferences</span>
              <span style="font-size:.7rem;color:#00d4ff;font-weight:600">${(S.langs||['English']).join(' · ')}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${S.langExclusive ? `<span style="font-size:.62rem;font-weight:700;padding:2px 6px;border-radius:4px;background:var(--th-accent-bg);color:var(--th-accent);border:1px solid rgba(0,212,255,.25)">EXCLUSIVE</span>` : ''}
              <span class="lang-chevron" style="font-size:.7rem;color:#374151;transition:transform .2s;transform:rotate(0deg)">›</span>
            </div>
          </summary>
          <div style="padding:12px 14px;border-top:1px solid rgba(255,255,255,.05)">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px 6px;margin-bottom:12px">
              ${LANG_OPTS.map(l => `
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:7px 9px;border-radius:8px;border:1px solid ${S.langs.includes(l.v)?'rgba(0,212,255,.4)':'rgba(255,255,255,.06)'};background:${S.langs.includes(l.v)?'rgba(0,212,255,.07)':'transparent'};transition:all .15s">
                <input type="checkbox" value="${l.v}" ${S.langs.includes(l.v)?'checked':''} data-action="toggle-lang" style="accent-color:#00d4ff;flex-shrink:0">
                <span style="font-size:.75rem;color:${S.langs.includes(l.v)?'#e6edf3':'#8b949e'};font-weight:${S.langs.includes(l.v)?'600':'400'}">${l.v}</span>
              </label>`).join('')}
            </div>
            <label style="display:flex;align-items:center;gap:9px;cursor:pointer;padding:9px 11px;border-radius:8px;border:1px solid ${S.langExclusive?'rgba(0,212,255,.35)':'rgba(255,255,255,.06)'};background:${S.langExclusive?'rgba(0,212,255,.06)':'transparent'};transition:all .15s">
              <input type="checkbox" ${S.langExclusive?'checked':''} data-action="toggle-lang-exclusive" style="accent-color:#00d4ff;flex-shrink:0">
              <div>
                <div style="font-size:.79rem;font-weight:700;color:${S.langExclusive?'#e6edf3':'#8b949e'}">Exclusive mode</div>
                <div style="font-size:.67rem;color:#4b5563;margin-top:1px">Only include streams in selected languages — Multi, Dubbed &amp; Original always pass</div>
              </div>
            </label>
            <label style="display:flex;align-items:center;gap:9px;cursor:pointer;padding:9px 11px;border-radius:8px;margin-top:7px;border:1px solid ${S.foreignLangKill!==false?'rgba(239,68,68,.35)':'rgba(255,255,255,.06)'};background:${S.foreignLangKill!==false?'rgba(239,68,68,.06)':'transparent'};transition:all .15s">
              <input type="checkbox" ${S.foreignLangKill!==false?'checked':''} data-action="toggle-foreign-kill" style="accent-color:#ef4444;flex-shrink:0">
              <div>
                <div style="font-size:.79rem;font-weight:700;color:${S.foreignLangKill!==false?'#e6edf3':'#8b949e'}">Foreign language kill</div>
                <div style="font-size:.67rem;color:#4b5563;margin-top:1px">Hard-block streams not in your selected languages — Library &amp; SeaDex always pass. Anime exempt.</div>
              </div>
            </label>
          </div>
        </details>
        ${debridInputs.length ? `
        <div style="color:#8b949e;font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Debrid Service</div>
        ${debridInputs.map(inp => `
        <div class="name-row" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="color:#8b949e;font-size:.82rem;text-transform:uppercase;letter-spacing:.05em">${inp.label}</span>
            ${inp.url ? `<a href="${inp.url}" target="_blank" rel="noopener noreferrer" style="font-size:.83rem;color:#00d4ff;text-decoration:none;font-weight:700">Get key →</a>` : ''}
          </div>
          <div style="position:relative;display:flex;align-items:center">
            <input class="name-input" id="cred_${inp.id}" data-service="${inp.id}" data-action="update-cred" type="password" placeholder="${inp.placeholder}"
              value="${escH(S.creds[inp.id] || '')}" maxlength="120" style="padding-right:38px">
            <button type="button" data-action="toggle-cred-vis" data-target="cred_${inp.id}" title="Show / hide"
              style="position:absolute;right:10px;background:none;border:none;cursor:pointer;color:#4b5563;padding:0;line-height:1;font-size:.72rem;transition:color .15s"
              onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>`).join('')}
        <div style="border-top:1px solid rgba(255,255,255,.06);margin:18px 0 14px"></div>
        ` : ''}
        <details id="tmdbDetails" style="border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden;margin-top:${debridInputs.length?'0':'4'}px" ${S.tmdbToken||S.tmdbApiKey?'open':''}>
          <summary style="list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:11px 14px;background:rgba(255,255,255,.02);user-select:none">
            <span style="display:flex;align-items:center;gap:8px">
              <span style="font-size:.75rem;font-weight:700;color:#8b949e;text-transform:uppercase;letter-spacing:.06em">TMDB Keys</span>
              <span style="font-size:.65rem;color:#4b5563;font-weight:600">optional</span>
              ${S.tmdbToken||S.tmdbApiKey?'<span style="font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:3px;background:rgba(52,211,153,.12);color:#34d399;border:1px solid rgba(52,211,153,.3)">SET</span>':''}
            </span>
            <span style="font-size:.7rem;color:#374151">›</span>
          </summary>
          <div style="padding:12px 14px;border-top:1px solid rgba(255,255,255,.04)">
            <div style="font-size:.72rem;color:#6b7280;line-height:1.5;margin-bottom:12px">Improves poster quality and metadata. Not required — AIOStreams works fine without it.</div>
            <div class="name-row" style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="color:#8b949e;font-size:.82rem;text-transform:uppercase;letter-spacing:.05em">TMDB Read Access Token</span>
                <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" style="font-size:.83rem;color:#00d4ff;text-decoration:none;font-weight:700">Get key →</a>
              </div>
              <div style="position:relative;display:flex;align-items:center">
                <input class="name-input" id="tmdbIn" data-action="update-tmdb" type="password" placeholder="eyJhbGciOiJSUzI1NiJ9…"
                  value="${escH(S.tmdbToken)}" maxlength="400" style="padding-right:38px">
                <button type="button" data-action="toggle-cred-vis" data-target="tmdbIn" title="Show / hide"
                  style="position:absolute;right:10px;background:none;border:none;cursor:pointer;color:#4b5563;padding:0;line-height:1;font-size:.72rem;transition:color .15s"
                  onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <div style="font-size:.72rem;color:#6b7280;margin-top:5px;line-height:1.45">The <strong style="color:#8b949e">long</strong> token starting with <code style="color:#8b949e;font-family:monospace">eyJ</code> — not the 32-character API Key.</div>
              <span class="cred-status" id="tmdbStatus" role="status" aria-live="polite"></span>
            </div>
            <div class="name-row">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="color:#8b949e;font-size:.82rem;text-transform:uppercase;letter-spacing:.05em">TMDB API Key</span>
                <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" style="font-size:.83rem;color:#00d4ff;text-decoration:none;font-weight:700">Get key →</a>
              </div>
              <div style="position:relative;display:flex;align-items:center">
                <input class="name-input" id="tmdbKeyIn" data-action="update-tmdb-key" type="password" placeholder="abc123def456…"
                  value="${escH(S.tmdbApiKey)}" maxlength="60" style="padding-right:38px">
                <button type="button" data-action="toggle-cred-vis" data-target="tmdbKeyIn" title="Show / hide"
                  style="position:absolute;right:10px;background:none;border:none;cursor:pointer;color:#4b5563;padding:0;line-height:1;font-size:.72rem;transition:color .15s"
                  onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <div style="font-size:.72rem;color:#6b7280;margin-top:5px;line-height:1.45">The <strong style="color:#8b949e">32-character</strong> key — not the Read Access Token.</div>
              <span class="cred-status" id="tmdbKeyStatus" role="status" aria-live="polite"></span>
            </div>
          </div>
        </details>
      </div>`;
    nav.style.display = 'flex';
    document.getElementById('btnBack').style.visibility = 'visible';
    syncNext();
  } else {
    const ringC = 131.9;
    const ringPct = S.simpleMode ? ((step - 1) / 2) : ((step - 1) / (STEPS - 1));
    main.innerHTML = `
      <div class="card">
        <div class="srh">
          <div class="srh-ring">
            <svg viewBox="0 0 52 52" width="52" height="52" style="overflow:visible">
              <defs><linearGradient id="rg${step}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00d4ff"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs>
              <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="2.5"/>
              <circle cx="26" cy="26" r="21" fill="none" stroke="url(#rg${step})" stroke-width="2.5"
                stroke-dasharray="${ringC}" stroke-dashoffset="${(ringC * (1 - ringPct)).toFixed(1)}"
                stroke-linecap="round" transform="rotate(-90 26 26)"/>
            </svg>
            <div class="srh-num">${S.simpleMode ? ({1:1,2:2,3:3}[step]||step) : step}</div>
          </div>
          <div>
            <div class="srh-title">${def.title}${S.simpleMode ? ` <span style="font-size:.62rem;font-weight:600;color:#4b5563;margin-left:4px">${Math.min({1:1,2:2,3:3}[step]||step, 3)} of 3</span>` : ''}${step===1&&((S.resolution==='4k'&&S.audio==='lossless')||(S.resolution==='1080p'&&S.audio==='standard'))&&S.content==='all'?` <span style="font-size:.65rem;font-weight:700;color:#00d4ff;letter-spacing:.05em;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.2);border-radius:4px;padding:1px 5px">${ICO.bolt(11,'#00d4ff')} QUICK START</span>`:''}${step===1&&S.multiServices.length>=2?` <span style="font-size:.62rem;font-weight:800;color:#a855f7;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.25);border-radius:12px;padding:1px 7px">${S.multiServices.filter(s=>['torbox-pro','torbox-ess','alldebrid','realdebrid','premiumize','debridlink','easynews','offcloud','hybrid','debridio','debrider','easydebrid','pikpak','seedr'].includes(s)).length} selected</span>`:''}
            </div>
            <div class="srh-sub">${def.desc}</div>
          </div>
        </div>
        ${def.id === 'device' && _detectedDevice ? `<div style="margin-bottom:12px;padding:9px 14px;border-radius:10px;background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.2);display:flex;align-items:center;gap:8px;font-size:.8rem;color:#34d399;font-weight:600"><span>${ICO.search(14,'#34d399')}</span> We detected <b style="margin:0 2px">${(def.opts.find(o=>o.v===_detectedDevice)||{}).name||_detectedDevice}</b> — change below if wrong</div>` : ''}
        ${renderOpts(def)}
        ${def.id === 'device' ? `<button data-action="skip-device" style="width:100%;margin-top:10px;padding:9px 14px;background:transparent;border:1px dashed rgba(255,255,255,.1);border-radius:10px;color:#6b7280;font-size:.86rem;font-weight:600;cursor:pointer;transition:all .15s;letter-spacing:.02em" onmouseover="this.style.color='#6b7280';this.style.borderColor='rgba(255,255,255,.2)'" onmouseout="this.style.color='#4b5563';this.style.borderColor='rgba(255,255,255,.1)'">Skip — use standard settings →</button>` : ''}
        ${def.id === 'content' ? renderCacheMode() + renderMatchMode() + renderP2pToggle() : ''}
        ${def.id === 'content' ? `<button data-action="skip-content" style="width:100%;margin-top:10px;padding:9px 14px;background:transparent;border:1px dashed rgba(255,255,255,.1);border-radius:10px;color:#6b7280;font-size:.86rem;font-weight:600;cursor:pointer;transition:all .15s;letter-spacing:.02em" onmouseover="this.style.color='#6b7280';this.style.borderColor='rgba(255,255,255,.2)'" onmouseout="this.style.color='#4b5563';this.style.borderColor='rgba(255,255,255,.1)'">Skip — use Everything (safe default) →</button>` : ''}
        ${def.id === 'service' ? `<button data-action="open-advanced" style="width:100%;margin-top:14px;padding:12px 16px;background:rgba(0,212,255,.04);border:1px solid rgba(0,212,255,.18);border-radius:11px;color:#67e8f9;font-size:.88rem;font-weight:700;cursor:pointer;letter-spacing:.05em;text-transform:uppercase;transition:all .18s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px" onmouseover="this.style.background='rgba(0,212,255,.10)';this.style.borderColor='rgba(0,212,255,.35)'" onmouseout="this.style.background='rgba(0,212,255,.04)';this.style.borderColor='rgba(0,212,255,.18)'"><div style="display:flex;align-items:center;gap:8px">${ICO.gear(16,'#67e8f9')} Fine-Tune</div><div style="font-size:.68rem;font-weight:500;color:#4b5563;text-transform:none;letter-spacing:.01em;margin-top:1px">Audio · Video · Formatter</div></button>` : ''}
      </div>`;
    nav.style.display = 'flex';
    const btnBack = document.getElementById('btnBack');
    btnBack.style.visibility = step > 1 ? 'visible' : 'hidden';
    if (step > 1) {
      const prevTitle = step === 2 ? 'Service' : (DEFS[step-2]?.title || 'Back');
      btnBack.innerHTML = `← ${prevTitle}`;
    }
    syncNext();
  }
  initScrollFades();
  if (def && def.id === 'device') {
    updateDeviceScroll();
  }
}

function syncNext() {
  const def = DEFS[step - 1];
  const btn = document.getElementById('btnNext');
  if (!btn) return;
  btn.style.display = '';
  let ok = !def.key || !!S[def.key];
  if (step === 1) ok = S.multiServices.length > 0;
  btn.disabled = !ok;
  const nextDef = step < STEPS ? DEFS[((S.quickStart && step === 2) || (S.simpleMode && step === 3)) ? STEPS - 1 : step] : null;
  const nextLabel = nextDef ? nextDef.title : null;
  if (step === STEPS) {
    btn.innerHTML = `<span style="flex:1">Review &amp; Generate</span><span class="cta-arr">→</span>`;
  } else if (ok && nextLabel) {
    btn.innerHTML = `<div style="flex:1"><div class="cta-step-lbl" style="font-size:.64rem;font-weight:700;color:#374151;letter-spacing:.07em;text-transform:uppercase;margin-bottom:1px">Next</div><div class="cta-step-val" style="font-size:.9rem;font-weight:800">${nextLabel}</div></div><span class="cta-arr">→</span>`;
  } else if (!def.key) {
    btn.innerHTML = `<span style="flex:1;font-size:.92rem;font-weight:700">Continue</span><span class="cta-arr">→</span>`;
  } else {
    const _ph = document.documentElement.getAttribute('data-theme')==='light';
    btn.innerHTML = `<span style="flex:1;font-size:.88rem;font-weight:600;color:${_ph?'#9ca3af':'#4b5563'}">Select one to continue</span><span class="cta-arr" style="color:${_ph?'#9ca3af':'#374151'}">→</span>`;
  }
}

/* DELEGATED EVENTS */
{ const l = document.getElementById('cb-loader'); if (l) l.addEventListener('animationend', () => l.remove()); }
// ── Onboarding Tutorial System ──
const TUT_STEPS = [
  { id:'welcome' },
  {
    id:'paths', badge:'Step 1 of 7', title:'Choose the Right Path',
    desc:'Use <strong>Quick Install</strong> for the shortest setup: app, providers, credentials, and a performance profile in one place.<br><br><span class="hl">Advanced Builder</span> exposes every filter and formatter. <span class="gold">Update Existing Setup</span> imports an older template. Guided Setup remains available below for a step-by-step route.',
    target:'.splash-doors', arrow:'top', nextLabel:'Next'
  },
  {
    id:'sources', badge:'Step 2 of 7', title:'Choose One or More Providers',
    desc:'Select every provider you actually use. Multi-select is supported for debrid and Usenet services.<br><br>Optional P2P, HTTP, Debridio, NZBGeek, StreamNZB, and extra indexers live under <strong>Additional services & scrapers</strong> so the main list stays simple.',
    target:'.hybrid-services', arrow:'top', nextLabel:'Next'
  },
  {
    id:'presets', badge:'Step 3 of 7', title:'Ready-Made Setups',
    desc:'These presets apply sensible device, quality, cache, and sorting choices for common use cases. They are the fastest route when one of the descriptions already matches what you want.',
    target:'#splashPresets', arrow:'top', nextLabel:'Next'
  },
  {
    id:'quick', badge:'Step 4 of 7', title:'Quick Install',
    desc:'Quick Install asks only what is required. Choose Stremio, Nuvio, WuPlay, or another app; select multiple providers; then pick <strong>Fast & Light</strong>, <strong>Balanced</strong>, or <strong>Maximum Quality</strong>.<br><br>Credential fields appear only for selected providers.',
    target:'.splash-doors [data-action="open-fast-lane"]', arrow:'top', nextLabel:'Next'
  },
  {
    id:'guided', badge:'Step 5 of 7', title:'Guided Setup and Advanced Builder',
    desc:'<strong>Guided Setup</strong> walks through Sources, Device, Video Quality, Content Preferences, Accounts & Keys, and Review & Install.<br><br><span class="hl">Advanced Builder</span> adds detailed audio, video, formatter, subtitles, catalogs, proxy, matching, and filtering controls. Safe defaults are used when you skip an option.',
    center:true, nextLabel:'Next'
  },
  {
    id:'install', badge:'Step 6 of 7', title:'Review, Validate, and Install',
    desc:'Before installation, Core Builds runs credential, template, device, and host checks. The final screen prioritises the install action, then manifest recovery, exports, diagnostics, and the detailed configuration summary.<br><br>Direct Install sends the generated configuration to the selected AIOStreams host. Export JSON keeps the generated file local until you import it yourself.',
    center:true, nextLabel:'Next'
  },
  {
    id:'start', badge:'Step 7 of 7', title:'Ready to Build',
    desc:'For most people, start with <strong>Quick Install</strong>. Choose Guided Setup if you want help with each decision, or Advanced Builder when you already know the exact formats and filters you need.',
    target:'.splash-doors [data-action="open-fast-lane"]', arrow:'top', nextLabel:'Open Quick Install'
  },
];
let _tutStep = -1;
function tutFill(s,n){
  document.getElementById('tutBadge').textContent=s.badge||'';
  document.getElementById('tutTitle').textContent=s.title||'';
  document.getElementById('tutDesc').innerHTML=s.desc||'';
  document.getElementById('tutNext').textContent=s.nextLabel||'Next';
  document.getElementById('tutBack').style.display=n<=1?'none':'';
  document.getElementById('tutProgress').innerHTML=TUT_STEPS.slice(1).map((_,i)=>`<div class="tut-prog-dot ${i<n-1?'done':i===n-1?'active':''}"></div>`).join('');
}
function tutResetPosition(){
  const tip=document.getElementById('tutTooltip'),spot=document.getElementById('tutSpotlight');
  ['top','left','right','bottom','width','height','maxWidth','maxHeight','overflowY','transform'].forEach(k=>tip.style[k]='');
  ['top','left','right','bottom','width','height'].forEach(k=>spot.style[k]='');
  tip.className='tut-tooltip';
}
function tutShowCentered(s,n){
  const tip=document.getElementById('tutTooltip'),spot=document.getElementById('tutSpotlight'),back=document.getElementById('tutBackdrop');
  spot.style.display='none';back.style.display='';tutFill(s,n);tutResetPosition();
  tip.style.display='';tip.style.position='fixed';tip.style.left='50%';tip.style.top='50%';tip.style.transform='translate(-50%,-50%)';tip.style.width='min(420px,calc(100vw - 28px))';tip.style.maxHeight='calc(100dvh - 28px)';tip.style.overflowY='auto';
}
function tutPositionTarget(el,s,n){
  if(_tutStep!==n||!document.body.contains(el))return;
  const tip=document.getElementById('tutTooltip'),spot=document.getElementById('tutSpotlight'),back=document.getElementById('tutBackdrop');
  const r=el.getBoundingClientRect(),pad=8,vw=document.documentElement.clientWidth,vh=window.innerHeight;
  if(!r.width||!r.height||r.bottom<0||r.top>vh){tutShowCentered(s,n);return;}
  tutResetPosition();back.style.display='none';spot.style.display='';spot.style.position='fixed';spot.style.top=Math.max(4,r.top-pad)+'px';spot.style.left=Math.max(4,r.left-pad)+'px';spot.style.width=Math.min(vw-8,r.width+pad*2)+'px';spot.style.height=Math.min(vh-8,r.height+pad*2)+'px';
  tutFill(s,n);tip.style.display='';tip.style.position='fixed';tip.style.width='min(380px,calc(100vw - 28px))';tip.style.maxHeight='calc(100dvh - 28px)';tip.style.overflowY='auto';
  const tipW=Math.min(380,vw-28),estimatedH=Math.min(tip.scrollHeight||280,vh-28),below=vh-r.bottom-14,above=r.top-14;
  const placeBelow=below>=Math.min(estimatedH,300)||below>=above;
  tip.className='tut-tooltip arrow-'+(placeBelow?'top':'bottom');
  tip.style.left=Math.max(14,Math.min(r.left,vw-tipW-14))+'px';
  tip.style.top=(placeBelow?Math.min(r.bottom+14,vh-estimatedH-14):Math.max(14,r.top-estimatedH-14))+'px';
}
function tutGo(n,reposition=false){
  if(n<0||n>=TUT_STEPS.length)return;
  _tutStep=n;
  const ov=document.getElementById('tutOverlay'),welcome=document.getElementById('tutWelcome'),spot=document.getElementById('tutSpotlight'),tip=document.getElementById('tutTooltip'),back=document.getElementById('tutBackdrop'),s=TUT_STEPS[n];
  ov.classList.add('active');tutResetPosition();
  if(s.id==='welcome'){
    welcome.style.display='';spot.style.display='none';tip.style.display='none';back.style.display='';
    if(!reposition)setTimeout(()=>welcome.querySelector('button')?.focus(),0);
    return;
  }
  welcome.style.display='none';
  const el=s.target?document.querySelector(s.target):null;
  if(s.center||window.innerWidth<720||!el){tutShowCentered(s,n);if(!reposition)setTimeout(()=>document.getElementById('tutNext')?.focus(),0);return;}
  el.scrollIntoView({behavior:'auto',block:'center',inline:'nearest'});
  requestAnimationFrame(()=>requestAnimationFrame(()=>{tutPositionTarget(el,s,n);if(!reposition)document.getElementById('tutNext')?.focus();}));
}
function tutClose(){
  const ov=document.getElementById('tutOverlay');ov.classList.remove('active');
  document.getElementById('tutWelcome').style.display='none';document.getElementById('tutSpotlight').style.display='none';document.getElementById('tutTooltip').style.display='none';document.getElementById('tutBackdrop').style.display='none';
  localStorage.setItem('cb_tut_seen','1');_tutStep=-1;
}
window.addEventListener('resize',()=>{if(_tutStep>0)tutGo(_tutStep,true);},{passive:true});
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initErrorLogger();
  initContactWidget(() => ({
    service: S.service === 'multi' ? 'multi' : S.service,
    device: S.device,
    resolution: S.resolution,
    pseArch: S.pseArch,
    formatter: S.formatter,
    configuratorVersion: CONFIGURATOR_VERSION,
    labels: {
      service: S.service === 'multi' ? (S.multiServices || []).join(' + ') : S.service,
      device: S.device,
      resolution: S.resolution === 'mixed' ? 'Mixed · Adaptive' : S.resolution,
      pseArch: S.pseArch === 'apex-mixed' ? 'Apex Mixed' : S.pseArch,
      formatter: S.formatter === 'family-v4' ? 'Family v4' : S.formatter,
    },
  }));
  window._formatErrorLog = formatErrorLog;
  window._clearErrorLog = () => { clearErrorLog(); document.querySelectorAll('.cb-error-log-section').forEach(el => { el.innerHTML = errorLogHtml(); }); };
  window._exportErrorLog = exportErrorLog;

  // Mobile optimization: select all on focus for text/password/url inputs to make replacing easier on iOS
  document.addEventListener('focusin', e => {
    if (e.target && e.target.tagName === 'INPUT' && ['text', 'password', 'url'].includes(e.target.type)) {
      setTimeout(() => {
        if (e.target.value) {
          try {
            e.target.select();
            e.target.setSelectionRange(0, 99999);
          } catch(err) {}
        }
      }, 50);
    }
  });
  // Migrate legacy '10GB'-style size limits saved by older versions
  if (typeof S.sizeLimit === 'string' && /^\d+GB$/.test(S.sizeLimit)) S.sizeLimit = S.sizeLimit.replace(/GB$/, '');
  const hb = document.getElementById('hdrVersionBadge');
  if (hb) hb.textContent = 'v' + CONFIGURATOR_VERSION;
  if (!hadSavedState && S.resolution === null) {
    try {
      const px = (screen.width || 0) * (window.devicePixelRatio || 1);
      if (px >= 3840) S.resolution = '4k';
    } catch(e) {}
  }
  if (!hadSavedState && !S.device) {
    try {
      const ua = navigator.userAgent || '';
      if (/Tizen/i.test(ua)) S.device = 'samsung';
      else if (/AFTM|AFTS|AFTB|AFTT|AFTKA|Fire\s?TV/i.test(ua)) S.device = /4K|AFTKA/i.test(ua) ? 'firestick-4kmax' : 'firestick-hd';
      else if (/AppleTV/i.test(ua)) S.device = 'appletv-new';
      else if (/Android\s?TV|SHIELD|BRAVIA|Chromecast/i.test(ua)) S.device = 'shield';
      if (S.device) _detectedDevice = S.device;
    } catch(e) {}
  }
  if (_sharedImport) {
    step = S.simpleMode ? STEPS + 1 : STEPS;
    setTimeout(() => showToast('Shared config loaded — review and install'), 300);
  }
  render();
  try { handleDeepLink(location.hash); } catch(e) { logError('deeplink', e.message, { hash: location.hash }); }
  if (!hadSavedState && !_sharedImport && !localStorage.getItem('cb_tut_seen')) {
    setTimeout(() => tutGo(0), 1000);
  }
  if (COUNTER_URL) {
    fetch(COUNTER_URL + '/api/stats').then(r => r.json()).then(d => {
      const el = document.getElementById('splashStats');
      if (!el) return;
      const fmt = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : n.toLocaleString();
      el.innerHTML = `<span class="stat"><span class="stat-val">${fmt(d.visits)}</span> visits</span><span class="stat-dot"></span><span class="stat"><span class="stat-val">${fmt(d.generates)}</span> templates built</span>`;
      el.classList.add('loaded');
    }).catch(() => {});
    if (navigator.sendBeacon) {
      try { navigator.sendBeacon(COUNTER_URL + '/api/visit'); } catch(e) {}
    }
  }
  try { history.replaceState({ step: step }, ''); } catch(e) {}
  window.addEventListener('popstate', (e) => {
    const m = document.getElementById('manifestModal'); if (m) m.remove();
    showAdvanced = false;
    step = (e.state && typeof e.state.step === 'number') ? e.state.step : 0;
    saveState(); render(); window.scrollTo(0, 0);
  });

  // Keyboard shortcuts: Enter = next, Escape = back, Arrows = navigate options
  document.addEventListener('keydown', (e) => {
    if (_tutStep >= 0) { if (e.key === 'Escape') tutClose(); else if (e.key === 'ArrowRight' || e.key === 'Enter') document.getElementById('tutNext')?.click(); else if (e.key === 'ArrowLeft') document.getElementById('tutBack')?.click(); return; }
    const qsOv = document.getElementById('qsOverlay');
    if (qsOv && qsOv.classList.contains('open')) { if (e.key === 'Escape') qsOv.classList.remove('open'); return; }

    // Modal focus trap + Escape to close
    const modal = document.getElementById('manifestModal') || document.getElementById('advModal');
    if (modal) {
      if (e.key === 'Escape') { modal.remove(); return; }
      if (e.key === 'Tab') {
        const focusable = modal.querySelectorAll('button,a,[tabindex]:not([tabindex="-1"]),input,select,textarea');
        if (focusable.length) {
          const first = focusable[0], last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      return;
    }

    if (step === 0) {
      const chip = document.activeElement?.closest('.splash-chip[data-svc]');
      if (chip && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        const chips = [...document.querySelectorAll('.splash-chip[data-svc]')];
        const idx = chips.indexOf(chip);
        const next = e.key === 'ArrowRight' ? chips[(idx+1) % chips.length] : chips[(idx-1+chips.length) % chips.length];
        next.focus(); next.click();
      }
      if (chip && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); chip.click(); }
      const card = document.activeElement?.closest('.splash-door,.splash-preset-card');
      if (card && (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const cards = [...card.parentElement.children];
        const idx = cards.indexOf(card);
        const next = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? cards[(idx+1) % cards.length] : cards[(idx-1+cards.length) % cards.length];
        next.focus();
      }
      return;
    }
    const rem = document.getElementById('apiReminder');
    if (rem && !rem.classList.contains('hidden')) return;
    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
    const extrasCard = document.activeElement?.closest('.opt-scraper-card[data-action]');
    if (extrasCard && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      extrasCard.click();
      return;
    }

    // Arrow key navigation within option grids
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && !inInput) {
      const grid = document.querySelector('.opts');
      if (!grid) return;
      const labels = [...grid.querySelectorAll('.opt > label')];
      if (!labels.length) return;
      const checked = grid.querySelector('.opt input:checked');
      let idx = checked ? labels.indexOf(checked.nextElementSibling) : -1;
      const cols = Math.round(grid.offsetWidth / labels[0].closest('.opt').offsetWidth) || 1;
      if (e.key === 'ArrowRight') idx = idx < labels.length - 1 ? idx + 1 : 0;
      else if (e.key === 'ArrowLeft') idx = idx > 0 ? idx - 1 : labels.length - 1;
      else if (e.key === 'ArrowDown') idx = (idx + cols) % labels.length;
      else if (e.key === 'ArrowUp') idx = (idx - cols + labels.length) % labels.length;
      e.preventDefault();
      labels[idx].click();
      labels[idx].focus();
    }

    if (e.key === 'Enter' && !inInput && !e.shiftKey) {
      e.preventDefault();
      const ae = document.activeElement;
      if (ae && ae.dataset && ae.dataset.action) { ae.click(); return; }
      const btn = document.getElementById('btnNext');
      if (btn && !btn.disabled && btn.style.display !== 'none') btn.click();
    }
    if (e.key === 'Escape' && !inInput) {
      const btn = document.getElementById('btnBack');
      if (btn && btn.style.visibility !== 'hidden') btn.click();
    }
  });

  // Handle all clicks
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-action="fmt-dropdown-change"]')) {
      S.formatter = e.target.value;
      saveState();
      updateFmtFeatured();
      updateFmtReceiptRow();
      document.querySelectorAll('[data-action="fmt-dropdown-change"]').forEach(sel => { if (sel !== e.target) sel.value = S.formatter; });
    }
    if (e.target.matches('[data-action="add-optional-scraper"]')) {
      const id = e.target.value;
      if (id && OPTIONAL_SCRAPER_DEFS.find(d => d.id === id) && !S.optionalScrapers.includes(id)) {
        S.optionalScrapers.push(id);
        saveState(); render();
      }
      e.target.value = '';
    }
    if (e.target.matches('[data-action="dev-more-select"]')) {
      const val = e.target.value;
      if (val) {
        S.device = val;
        const DEV_AUDIO = DEVICE_AUDIO_DEFAULTS;
        const AUDIO_NAMES = { lossless:'Lossless (TrueHD / DTS-HD)', standard:'DD+ / Atmos', limited:'Auto', dolby:'Dolby Only' };
        const newAudio = DEV_AUDIO[val];
        if (newAudio && newAudio !== S.audio) { S.audio = newAudio; showToast(`Audio auto-set to ${AUDIO_NAMES[newAudio] || newAudio}`); }
        document.querySelectorAll('input[name="device"]').forEach(r => r.checked = false);
        saveState();
        render();
      } else {
        if (S.device && !document.querySelector('input[name="device"]:checked')) render();
      }
    }
  });
  // Keyboard support for the device grid cards (Enter / Space activates them).
  document.addEventListener('keydown', (e) => {
    const card = e.target.closest && e.target.closest('.device-card');
    if (!card) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
  });
  document.addEventListener('click', (e) => {
    const flashBtn = e.target.closest('button:not(:disabled):not(.btn-manifest):not(.btn-dl)');
    if (flashBtn) {
      flashBtn.classList.remove('btn-flash');
      void flashBtn.offsetWidth;
      flashBtn.classList.add('btn-flash');
      flashBtn.addEventListener('animationend', () => flashBtn.classList.remove('btn-flash'), {once:true});
    }
    const svcChip = e.target.closest('.splash-chip[data-svc]');
    if (svcChip) {
      document.querySelectorAll('.splash-chip[data-svc]').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-checked','false'); });
      svcChip.classList.add('active');
      svcChip.setAttribute('aria-checked','true');
      const pp = document.getElementById('splashPresets');
      if (pp) pp.innerHTML = splashPresetsHtml(svcChip.dataset.svc);
      return;
    }
    const ftInfo = e.target.closest('.ft-info[data-fttip]');
    if (ftInfo) {
      e.stopPropagation();
      toggleFtTip(ftInfo);
      return;
    }
    if (!e.target.closest('.ft-popup')) hideFtTip();
    const el = e.target.dataset.action ? e.target : e.target.closest('[data-action]');
    const action = el?.dataset.action;
    if(!action) return;

    if (action === 'fmt-scroll-pick') {
      S.formatter = el.dataset.fmt;
      saveState();
      updateFmtFeatured();
      updateFmtReceiptRow();
      return;
    }

    if (action === 'device-scroll-pick') {
      const val = el.dataset.val;
      S.device = val;
      const DEV_AUDIO = DEVICE_AUDIO_DEFAULTS;
      const AUDIO_NAMES = { lossless:'Lossless (TrueHD / DTS-HD)', standard:'DD+ / Atmos', limited:'Auto', dolby:'Dolby Only' };
      const newAudio = DEV_AUDIO[val];
      const devCantDoLossless = DEVICE_FORCE_LIMITED_AUDIO.has(val);
      if (newAudio && newAudio !== S.audio) {
        if (S.quickStart && S.audio === 'lossless' && !devCantDoLossless) {
          // Keep lossless
        } else {
          S.audio = newAudio;
          showToast(`Audio auto-set to ${AUDIO_NAMES[newAudio] || newAudio}` + (S.quickStart && devCantDoLossless ? ' — this device can\'t do lossless' : ''));
        }
      }
      saveState();
      render();
      const picked = document.querySelector(`.device-card[data-val="${val}"]`);
      if (picked) picked.focus();
      if (S.simpleMode && step === 3) {
        setTimeout(() => { const b = document.getElementById('btnNext'); if (b && !b.disabled) b.click(); }, 350);
      }
      return;
    }

    if (action === 'nav-next') {
      if (step === 1 && S.multiServices.length === 0) return;
      if (DEFS[step-1].key && !S[DEFS[step-1].key] && step !== 1) return;
      if (step < STEPS) {
        // On API step: show reminder if debrid inputs exist but none are filled (custom mode only)
        if (step === 5 && !S.simpleMode) {
          const needed = getDebridInputs();
          const anyFilled = needed.some(i => S.creds[i.id] && S.creds[i.id].trim());
          if (needed.length > 0 && !anyFilled) {
            showApiReminder(() => {
              document.getElementById('main').classList.remove('nav-back');
              step = 6; pushStep(); saveState(); render(); window.scrollTo(0,0);
            });
            return;
          }
        }
        document.getElementById('main').classList.remove('nav-back');
        step = (S.quickStart && step === 2) ? STEPS : ((S.simpleMode && step === 3) ? STEPS : step + 1);
        if (S.simpleMode && !S.content) S.content = 'all';
        pushStep(); saveState(); render(); window.scrollTo(0,0);
      }
    }
    if (action === 'nav-back') {
      if (step > 0) {
        document.getElementById('main').classList.add('nav-back');
        step = (S.quickStart && step === STEPS) ? 2 : ((S.simpleMode && step === STEPS) ? 3 : step - 1);
        pushStep(); saveState(); render(); window.scrollTo(0,0);
      }
    }
    if (action === 'skip-device') {
      S.device = 'generic';
      document.getElementById('main').classList.remove('nav-back');
      step = S.quickStart ? 5 : step + 1;
      pushStep(); saveState(); render(); window.scrollTo(0,0);
    }
    if (action === 'skip-content') {
      S.content = 'all';
      document.getElementById('main').classList.remove('nav-back');
      step = S.quickStart ? 5 : step + 1;
      pushStep(); saveState(); render(); window.scrollTo(0,0);
    }
    if (action === 'quick-start') {
      const preset = (e.target.closest('[data-preset]') || e.target).dataset.preset;
      if (preset === 'http') {
        Object.assign(S, { service:'http', multiServices:['http'], resolution:'1080p', audio:'limited', content:'all', formatter:'family-v4', matchMode:'balanced', p2pEnabled:false, quickStart:true, simpleMode:true, outputProfile:'auto' });
        saveState(); document.getElementById('main').classList.remove('nav-back');
        step = STEPS; pushStep(); render(); window.scrollTo(0,0);
      } else if (preset === 'p2p') {
        Object.assign(S, { service:'p2p', multiServices:['p2p'], resolution:'1080p', audio:'limited', content:'all', formatter:'family-v4', matchMode:'balanced', p2pEnabled:true, quickStart:true, simpleMode:true, outputProfile:'auto' });
        saveState(); document.getElementById('main').classList.remove('nav-back');
        step = 5; pushStep(); render(); window.scrollTo(0,0);
      } else {
        if (preset === '1080p') Object.assign(S, { resolution:'1080p', audio:'standard', content:'all', formatter:'family-v4', matchMode:'balanced', p2pEnabled:false, quickStart:true, simpleMode:true, outputProfile:'auto' });
        else Object.assign(S, { resolution:'4k', audio:'lossless', content:'all', formatter:'family-v4', matchMode:'balanced', p2pEnabled:false, quickStart:true, simpleMode:true, outputProfile:'auto' });
        saveState(); document.getElementById('main').classList.remove('nav-back');
        step = 1; pushStep(); render(); window.scrollTo(0,0);
      }
    }
    if (action === 'jump-step') {
      const n = parseInt((e.target.closest('[data-step]') || e.target).dataset.step, 10);
      if (n >= 1 && n < step) {
        document.getElementById('main').classList.add('nav-back');
        step = n; pushStep(); saveState(); render(); window.scrollTo(0,0);
      }
    }
    if (action === 'open-fmt-picker') {
      const d = document.getElementById('fmtPickerDetails');
      if (d) { d.open = true; d.scrollIntoView({ behavior:'smooth', block:'center' }); }
    }
    if (action === 'open-advanced') openAdvancedDrawer(el);
    if (action === 'close-advanced') closeAdvancedDrawer();
    if (action === 'close-and-next') { closeAdvancedDrawer(); if (step < STEPS && S.multiServices.length > 0) { step++; pushStep(); saveState(); render(); window.scrollTo(0,0); } }
    if (action === 'start-setup') { S.quickStart = false; document.getElementById('main').classList.remove('nav-back'); step = 1; pushStep(); saveState(); render(); window.scrollTo(0,0); }
    if (action === 'open-fast-lane') showFastLane();
    if (action === 'open-express-lane') showExpressLane();
    if (action === 'open-diagnostics') showDiagnosticsModal();
    if (action === 'open-additional-services') showAdditionalServicesPicker();
    if (action === 'easy-start')   { S.simpleMode = true;  S.quickStart = false; S.outputProfile='auto'; document.getElementById('main').classList.remove('nav-back'); step = 1; pushStep(); saveState(); render(); window.scrollTo(0,0); }
    if (action === 'custom-start') { S.simpleMode = false; S.quickStart = false; S.outputProfile='auto'; document.getElementById('main').classList.remove('nav-back'); step = 1; pushStep(); saveState(); render(); window.scrollTo(0,0); }
    if (action === 'show-full-review') { S.outputProfile = activeOutputProfile(); S.simpleMode = false; saveState(); render(); window.scrollTo(0,0); }
    if (action === 'set-simple-fmt') { S.formatter = el.dataset.val; saveState(); render(); }
    if (action === 'set-output-profile') {
      const requested = el.dataset.val;
      if (requested && ['auto', ...OUTPUT_PROFILES].includes(requested)) {
        S.outputProfile = requested;
        saveState(); render();
        const active = activeOutputProfile();
        showToast(`${OUTPUT_PROFILE_INFO[active].label} output selected`);
      }
    }
    if (action === 'set-simple-match') { S.matchMode = el.dataset.val; saveState(); render(); }
    if (action === 'set-simple-cache') { S.cacheMode = el.dataset.val; saveState(); render(); }
    if (action === 'set-simple-pool') { S.streamPool = el.dataset.val; saveState(); render(); }
    if (action === 'set-simple-quality') { S.qualityFirst = !S.qualityFirst; saveState(); render(); }
    if (action === 'set-simple-resfirst') { S.resolutionFirst = !S.resolutionFirst; saveState(); render(); }
    if (action === 'set-autoplay-method') { S.autoPlayMethod=el.dataset.val; saveState(); render(); }
    if (action === 'set-addon-timeout') { S.addonTimeout=Number(el.dataset.val); saveState(); render(); }
    if (action === 'save-without-addon') { if (_lastAddonKey) _disabledAddons.add(_lastAddonKey); simpleInstall(_lastInstall.target || el.dataset.target || 'app'); }
    if (action === 'simple-install') simpleInstall(el.dataset.target || 'app');
    if (action === 'set-install-mode') {
      S.installMode = el.dataset.mode;
      saveState(); render();
    }
    if (action === 'toggle-stremio-pwd') {
      const inp = document.getElementById('stremioPasswordInline');
      if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
    }
    if (action === 'create-stremio-account') createRandomStremioAccount();
    if (action === 'continue-session') { step = _savedStep || 1; pushStep(); saveState(); render(); window.scrollTo(0,0); }
    if (action === 'quick-reinstall') { S.simpleMode = true; S.outputProfile='auto'; step = STEPS; pushStep(); saveState(); render(); window.scrollTo(0,0); showToast('Using your previous settings — review and install'); }
    if (action === 'start-fresh') { clearState(); }
    if (action === 'paste-manifest-splash') { S.simpleMode = false; document.getElementById('main').classList.remove('nav-back'); step = STEPS; pasteMode = true; pushStep(); saveState(); render(); window.scrollTo(0,0); }
    if (action === 'update-template') { showUpdateTemplateModal(); }
    if (action === 'test-drive') { showTestDriveModal(); }
    if (action === 'reset-state') { if (confirm('Start over? Your current selections will be cleared.')) { showAdvanced = false; clearState(); } }
    if (action === 'open-quickstart') { document.getElementById('qsOverlay').classList.add('open'); }
    if (action === 'close-quickstart') { document.getElementById('qsOverlay').classList.remove('open'); }
    if (action === 'close-quickstart-overlay' && e.target.id === 'qsOverlay') { document.getElementById('qsOverlay').classList.remove('open'); }
    if (action === 'tut-start') { tutGo(1); }
    if (action === 'tut-next') { if (_tutStep < TUT_STEPS.length - 1) tutGo(_tutStep + 1); else { tutClose(); showFastLane(); } }
    if (action === 'tut-back') { if (_tutStep > 1) tutGo(_tutStep - 1); }
    if (action === 'tut-close') { tutClose(); }
    if (action === 'open-tutorial') { tutGo(0); }
    if (action === 'share-config') shareConfig();
    if (action === 'open-troubleshooter') showTroubleshooter();
    if (action === 'open-feedback-report') showFeedbackReportModal();
    if (action === 'restore-backup') {
      const idx = parseInt((e.target.closest('[data-idx]')||e.target).dataset.idx, 10);
      if (!isNaN(idx) && confirm('Restore this backup? Your current settings will be overwritten.')) restoreBackup(idx);
    }
    if (action === 'copy-json') {
      e.preventDefault();
      if (!S.service) { showToast('No service selected — go back and pick your debrid service first', true); }
      else {
        const _ct = buildFinal();
        navigator.clipboard.writeText(JSON.stringify(_ct, null, 2)).then(() => showToast('Template JSON copied — paste it into AIOStreams → Import'));
        saveLastGen();
      }
    }
    if (action === 'generate-dl') generate();
    if (action === 'export-partial') exportPartial(el.dataset.kind);
    if (action === 'create-import') createImportUrl();
    if (action === 'gen-pwd') genPwd();
    if (action === 'toggle-pwd') togglePwd();
    if (action === 'toggle-cred-vis') {
      const inp = document.getElementById(e.target.closest('[data-target]').dataset.target);
      if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
    }
    if (action === 'toggle-device-help') {
      e.preventDefault();
      const v = (e.target.closest('[data-v]') || e.target).dataset.v;
      const h = document.getElementById('help_' + v);
      if (h) h.style.display = h.style.display === 'block' ? 'none' : 'block';
    }
    if (action === 'toggle-help-target') {
      e.preventDefault();
      const t = (e.target.closest('[data-target]') || e.target).dataset.target;
      const h = document.getElementById(t);
      if (h) h.style.display = h.style.display === 'block' ? 'none' : 'block';
    }
    if (action === 'install-stremio') openInAIOStreams();
    if (action === 'copy-manifest') {
      const btn = e.target.closest('[data-action="copy-manifest"]') || e.target.closest('[data-url]') || e.target;
      const url = btn.dataset.url;
      const isUrl = url.startsWith('http') && !url.includes('api') && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url) && !/^[0-9a-f]{16,40}$/i.test(url);
      
      const manifestUrlDiv = btn.closest('div')?.querySelector('.manifest-url') || btn.closest('.manifest-url');
      if (manifestUrlDiv) {
        try {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(manifestUrlDiv);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch(err) {}
      }

      navigator.clipboard.writeText(url).then(() => {
        showToast(isUrl ? 'Manifest URL copied' : 'Copied to clipboard');
        if (btn && btn.tagName === 'BUTTON') {
          const origHtml = btn.innerHTML;
          const origBg = btn.style.background;
          const origColor = btn.style.color;
          const origBdr = btn.style.borderColor;
          btn.innerHTML = '✓ Copied';
          btn.style.background = 'rgba(16, 185, 129, 0.15)';
          btn.style.color = '#34d399';
          btn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          setTimeout(() => {
            btn.innerHTML = origHtml;
            btn.style.background = origBg;
            btn.style.color = origColor;
            btn.style.borderColor = origBdr;
          }, 2000);
        }
      });
    }
    if (action === 'open-support') {
      const modal = document.getElementById('supportOverlay');
      if (modal) modal.classList.add('active');
    }
    if (action === 'close-support') {
      const modal = document.getElementById('supportOverlay');
      if (modal) modal.classList.remove('active');
    }
    if (action === 'copy-crypt') {
      const btn = e.target.closest('[data-target]') || e.target;
      const targetId = btn.dataset.target;
      const textNode = document.getElementById(targetId);
      if (textNode) {
        navigator.clipboard.writeText(textNode.textContent.trim()).then(() => {
          showToast('Address copied to clipboard');
          const origText = btn.textContent;
          btn.textContent = '✓ Copied';
          btn.style.color = '#34d399';
          btn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          btn.style.background = 'rgba(16, 185, 129, 0.12)';
          setTimeout(() => {
            btn.textContent = origText;
            btn.style.color = '';
            btn.style.borderColor = '';
            btn.style.background = '';
          }, 2000);
        });
      }
    }
    if (action === 'copy-wuplay') {
      const btn = e.target.closest('[data-action="copy-wuplay"]') || e.target;
      const url = btn.dataset.url;
      navigator.clipboard.writeText(url).then(() => {
        showToast('Copied! Paste into WuPlay configurer → Addons');
        if (btn && btn.tagName === 'BUTTON') {
          const origHtml = btn.innerHTML;
          const origBg = btn.style.background;
          const origColor = btn.style.color;
          const origBdr = btn.style.borderColor;
          btn.innerHTML = '✓ Copied';
          btn.style.background = 'rgba(16, 185, 129, 0.15)';
          btn.style.color = '#34d399';
          btn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          setTimeout(() => {
            btn.innerHTML = origHtml;
            btn.style.background = origBg;
            btn.style.color = origColor;
            btn.style.borderColor = origBdr;
          }, 2000);
        }
      });
    }
    if (action === 'toggle-pref') {
      const card = e.target.closest('[data-action="toggle-pref"]') || e.target;
      const key = card.dataset.key;
      if (key && key in S) {
        S[key] = !S[key]; saveState();
        const on = !!S[key];
        if (key === 'proxyEnabled') {
          const sy = window.scrollY; render(); window.scrollTo(0, sy);
        } else {
          card.classList.toggle('pref-on', on);
          const circ = card.querySelector('.pref-circle');
          if (circ) circ.innerHTML = on ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0d1117" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : '';
        }
      }
    }
    if (action === 'set-size-limit') {
      S.sizeLimit = (e.target.closest('[data-action]') || e.target).dataset.val;
      saveState();
      document.querySelectorAll('[data-action="set-size-limit"]').forEach(b => {
        b.classList.toggle('size-btn-active', b.dataset.val === S.sizeLimit);
      });
    }
    if (action === 'set-cache-mode') {
      S.cacheMode = (e.target.closest('[data-action="set-cache-mode"]') || e.target).dataset.val;
      saveState();
      document.querySelectorAll('[data-action="set-cache-mode"]').forEach(btn => {
        const on = btn.dataset.val === S.cacheMode;
        btn.dataset.active = on ? 'true' : 'false';
        btn.style.borderColor = on ? 'rgba(0,212,255,.4)' : 'rgba(255,255,255,.07)';
        btn.style.background  = on ? 'rgba(0,212,255,.1)' : 'transparent';
        btn.style.color       = on ? '#00d4ff' : '#6b7280';
        btn.style.fontWeight  = on ? '700' : '500';
      });
    }
    if (action === 'set-pool') {
      S.streamPool = (e.target.closest('[data-action="set-pool"]') || e.target).dataset.val;
      saveState();
      document.querySelectorAll('[data-action="set-pool"]').forEach(btn => {
        const on = btn.dataset.val === (S.streamPool||'normal');
        btn.dataset.active = on ? 'true' : 'false';
        btn.style.borderColor = on ? 'rgba(0,212,255,.4)' : 'rgba(255,255,255,.08)';
        btn.style.background  = on ? 'rgba(0,212,255,.1)' : 'transparent';
        btn.style.color       = on ? '#00d4ff' : '#6b7280';
        btn.style.fontWeight  = on ? '700' : '500';
      });
    }
    if (action === 'set-library-boost') {
      S.libraryBoost = (e.target.closest('[data-action="set-library-boost"]') || e.target).dataset.val;
      saveState();
      document.querySelectorAll('[data-action="set-library-boost"]').forEach(btn => {
        const on = btn.dataset.val === (S.libraryBoost||'default');
        btn.style.borderColor = on ? 'rgba(0,212,255,.4)' : 'rgba(255,255,255,.08)';
        btn.style.background  = on ? 'rgba(0,212,255,.1)' : 'transparent';
        btn.style.color       = on ? '#00d4ff' : '#6b7280';
      });
    }
    if (action === 'toggle-nzb-failover') { S.nzbFailover = !S.nzbFailover; saveState(); render(); }
    if (action === 'set-nzb-failover-pos') {
      S.nzbFailoverPosition = (e.target.closest('[data-action="set-nzb-failover-pos"]') || e.target).dataset.val;
      saveState(); render();
    }
    if (action === 'set-max-failover-nzbs') {
      S.maxFailoverNzbs = Number((e.target.closest('[data-action="set-max-failover-nzbs"]') || e.target).dataset.val);
      saveState(); render();
    }
    if (action === 'set-age-limit') {
      S.ageLimit = (e.target.closest('[data-action="set-age-limit"]') || e.target).dataset.val;
      saveState();
      document.querySelectorAll('[data-action="set-age-limit"]').forEach(btn => {
        const on = btn.dataset.val === S.ageLimit;
        btn.style.borderColor = on ? 'rgba(0,212,255,.4)' : 'rgba(255,255,255,.08)';
        btn.style.background  = on ? 'rgba(0,212,255,.1)' : 'transparent';
        btn.style.color       = on ? '#00d4ff' : '#6b7280';
      });
    }
    if (action === 'set-pse-arch') {
      S.pseArch = (e.target.closest('[data-action="set-pse-arch"]') || e.target).dataset.val;
      saveState();
      document.querySelectorAll('[data-action="set-pse-arch"]').forEach(btn => {
        const on = btn.dataset.val === (S.pseArch||'standard');
        btn.dataset.active = on ? 'true' : 'false';
        btn.style.borderColor = on ? 'rgba(0,212,255,.4)' : 'rgba(255,255,255,.08)';
        btn.style.background  = on ? 'rgba(0,212,255,.1)' : 'transparent';
        btn.style.color       = on ? '#00d4ff' : '#6b7280';
        btn.style.fontWeight  = on ? '700' : '500';
      });
    }
    if (action === 'toggle-sub-addon') {
      const row = e.target.closest('[data-action="toggle-sub-addon"]') || e.target;
      const val = row.dataset.val;
      if (!S.subtitleAddons) S.subtitleAddons = ['aiosubtitle'];
      const idx = S.subtitleAddons.indexOf(val);
      if (idx >= 0) { if (S.subtitleAddons.length > 1) S.subtitleAddons.splice(idx, 1); }
      else {
        if (val === 'subdl' && (S.subtitleLangs || ['en']).length > 5) {
          showToast('SubDL supports at most 5 subtitle languages — reduce the selection first', true);
          return;
        }
        S.subtitleAddons.push(val);
      }
      const on = S.subtitleAddons.includes(val);
      row.style.borderColor = on ? 'rgba(6,182,212,.35)' : 'rgba(255,255,255,.06)';
      row.style.background = on ? 'rgba(6,182,212,.05)' : 'transparent';
      const box = row.querySelector('.chk-box');
      if (box) { box.style.borderColor = on ? '#06b6d4' : '#374151'; box.style.background = on ? '#06b6d4' : 'transparent'; box.innerHTML = on ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0d1117" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''; }
      const nm = row.querySelector('.opt-nm');
      if (nm) nm.style.color = on ? '#06b6d4' : '#9ca3af';
      saveState();
      if (val === 'subdl') {
        render();
        if (on) {
          setTimeout(() => {
            const credCard = document.getElementById('cred_subdl')?.closest('div[style*="background:rgba(6,182,212"]');
            if (credCard) credCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 50);
        }
      }
    }
    if (action === 'toggle-sub-lang') {
      const btn = e.target.closest('[data-action="toggle-sub-lang"]') || e.target;
      const val = btn.dataset.val;
      if (!S.subtitleLangs) S.subtitleLangs = ['en'];
      const idx = S.subtitleLangs.indexOf(val);
      if (idx >= 0) { if (S.subtitleLangs.length > 1) S.subtitleLangs.splice(idx, 1); }
      else {
        if ((S.subtitleAddons || []).includes('subdl') && S.subtitleLangs.length >= 5) {
          showToast('SubDL supports at most 5 subtitle languages', true);
          return;
        }
        S.subtitleLangs.push(val);
      }
      const on = S.subtitleLangs.includes(val);
      btn.style.borderColor = on ? 'rgba(6,182,212,.4)' : 'rgba(255,255,255,.07)';
      btn.style.background = on ? 'rgba(6,182,212,.1)' : 'transparent';
      btn.style.color = on ? '#06b6d4' : '#6b7280';
      btn.style.fontWeight = on ? '700' : '500';
      saveState();
    }
    if (action === 'toggle-catalog') {
      const row = e.target.closest('[data-action="toggle-catalog"]') || e.target;
      const val = row.dataset.val;
      if (!S.catalogs) S.catalogs = ['tmdb-addon'];
      const idx = S.catalogs.indexOf(val);
      if (idx >= 0) S.catalogs.splice(idx, 1);
      else S.catalogs.push(val);
      const on = S.catalogs.includes(val);
      row.style.borderColor = on ? 'rgba(249,115,22,.35)' : 'rgba(255,255,255,.06)';
      row.style.background = on ? 'rgba(249,115,22,.05)' : 'transparent';
      const box = row.querySelector('.chk-box');
      if (box) { box.style.borderColor = on ? '#f97316' : '#374151'; box.style.background = on ? '#f97316' : 'transparent'; box.innerHTML = on ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0d1117" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''; }
      const nm = row.querySelector('.opt-nm');
      if (nm) nm.style.color = on ? '#f97316' : '#9ca3af';
      saveState();
    }
    if (action === 'toggle-proxy-svc') {
      const btn = e.target.closest('[data-action="toggle-proxy-svc"]') || e.target;
      const val = btn.dataset.val;
      if (!S.proxiedServices) S.proxiedServices = [];
      const idx = S.proxiedServices.indexOf(val);
      if (idx >= 0) S.proxiedServices.splice(idx, 1);
      else S.proxiedServices.push(val);
      const on = S.proxiedServices.includes(val);
      btn.style.borderColor = on ? 'rgba(100,116,139,.5)' : 'rgba(255,255,255,.07)';
      btn.style.background = on ? 'rgba(100,116,139,.12)' : 'transparent';
      btn.style.color = on ? '#94a3b8' : '#6b7280';
      btn.style.fontWeight = on ? '700' : '500';
      saveState();
    }
    if (action === 'set-match-mode') {
      S.matchMode = (e.target.closest('[data-action="set-match-mode"]') || e.target).dataset.val;
      if (S.matchMode === 'strict') S.qualityFirst = true;
      else S.qualityFirst = false;
      saveState();
      document.querySelectorAll('[data-action="set-match-mode"]').forEach(btn => {
        const on = btn.dataset.val === S.matchMode;
        btn.dataset.active = on ? 'true' : 'false';
        btn.style.borderColor = on ? 'rgba(0,212,255,.4)' : 'rgba(255,255,255,.07)';
        btn.style.background  = on ? 'rgba(0,212,255,.1)' : 'transparent';
        btn.style.color       = on ? '#00d4ff' : '#6b7280';
        btn.style.fontWeight  = on ? '700' : '500';
      });
      const qfCard = document.querySelector('[data-key="qualityFirst"]');
      if (qfCard) {
        qfCard.classList.toggle('pref-on', !!S.qualityFirst);
        const circ = qfCard.querySelector('.pref-circle');
        if (circ) circ.innerHTML = S.qualityFirst ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0d1117" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : '';
      }
    }
    if (action === 'set-audio') {
      S.audio = (e.target.closest('[data-action="set-audio"]') || e.target).dataset.val;
      saveState();
      document.querySelectorAll('[data-action="set-audio"]').forEach(row => {
        const on = row.dataset.val === S.audio;
        row.dataset.active = on ? 'true' : 'false';
        row.style.borderColor = on ? 'rgba(0,212,255,.35)' : 'rgba(255,255,255,.07)';
        row.style.background  = on ? 'rgba(0,212,255,.05)' : 'rgba(13,17,23,.7)';
        const nm = row.querySelector('.opt-name');
        if (nm) nm.style.color = on ? '#00d4ff' : '#e6edf3';
        const arr = row.querySelector('span:last-child');
        if (arr) { arr.innerHTML = on ? ICO.check(14,'#00d4ff') : '<span style="font-size:.9rem">›</span>'; arr.style.color = on ? '#00d4ff' : '#374151'; }
      });
      const sum = document.querySelector('.adv-audio-details summary span:last-child');
      const AUDIO_LABELS = { lossless:'Full Lossless', standard:'DD+ / Atmos', limited:'Auto', dolby:'Dolby Only' };
      if (sum) sum.textContent = (AUDIO_LABELS[S.audio] || 'Auto') + ' ›';
    }
    if (action === 'set-formatter') {
      S.formatter = (e.target.closest('[data-action="set-formatter"]') || e.target).dataset.val;
      saveState();
      document.querySelectorAll('[data-action="set-formatter"]').forEach(card => {
        card.dataset.active = String(card.dataset.val === S.formatter);
      });
      updateFmtFeatured();
      updateFmtReceiptRow();
    }
    if (action === 'import-formatter') { showFormatterImport(); }
    if (action === 'compare-templates') { showCompareTemplates(); }
    if (action === 'show-changelog') { showChangelog(); }
    if (action === 'toggle-carousel-service') {
      const sv = el.dataset.svcId;
      if (!sv) return;
      const idx = S.multiServices.indexOf(sv);
      if (idx >= 0) { S.multiServices.splice(idx, 1); } else { S.multiServices.push(sv); }
      S.service = deriveService() || S.service;
      const card = el.closest('.opt-scraper-card') || el;
      const selected = S.multiServices.includes(sv);
      card.dataset.active = String(selected);
      card.setAttribute('aria-checked', String(selected));
      const count = S.multiServices.filter(s=>CAROUSEL_SVCS.includes(s)).length + S.optionalScrapers.length;
      const countEl = document.getElementById('extrasCarouselCount');
      if (countEl) countEl.textContent = count ? `${count} selected` : 'Optional';
      const hasExtras = S.multiServices.some(s => CAROUSEL_SVCS.includes(s)) || S.optionalScrapers.length;
      const hint = document.querySelector('.opt-scraper-hint');
      if (hasExtras && !hint) {
        const sec = document.querySelector('.opt-scraper-section');
        if (sec) sec.insertAdjacentHTML('beforeend', '<div class="opt-scraper-hint">API keys for selected extras appear on Accounts & Keys.</div>');
      } else if (!hasExtras && hint) { hint.remove(); }
      saveState(); renderProgress();
    }
    if (action === 'toggle-optional-scraper') {
      const sid = el.dataset.scraperId;
      if (!sid) return;
      const idx = S.optionalScrapers.indexOf(sid);
      if (idx >= 0) { S.optionalScrapers.splice(idx, 1); } else if (OPTIONAL_SCRAPER_DEFS.find(d => d.id === sid)) { S.optionalScrapers.push(sid); }
      const card = el.closest('.opt-scraper-card') || el;
      const selected = S.optionalScrapers.includes(sid);
      card.dataset.active = String(selected);
      card.setAttribute('aria-checked', String(selected));
      const count = S.multiServices.filter(s=>CAROUSEL_SVCS.includes(s)).length + S.optionalScrapers.length;
      const countEl = document.getElementById('extrasCarouselCount');
      if (countEl) countEl.textContent = count ? `${count} selected` : 'Optional';
      const hasExtras = S.multiServices.some(s => CAROUSEL_SVCS.includes(s)) || S.optionalScrapers.length;
      const hint = document.querySelector('.opt-scraper-hint');
      if (hasExtras && !hint) {
        const sec = document.querySelector('.opt-scraper-section');
        if (sec) sec.insertAdjacentHTML('beforeend', '<div class="opt-scraper-hint">API keys for selected extras appear on Accounts & Keys.</div>');
      } else if (!hasExtras && hint) { hint.remove(); }
      saveState(); renderProgress();
    }
    if (action === 'remove-optional-scraper') {
      const sid = el.dataset.scraperId;
      const i = S.optionalScrapers.indexOf(sid);
      if (i >= 0) { S.optionalScrapers.splice(i, 1); saveState(); render(); }
    }
    if (action === 'svc-cat') {
      const cat = el.dataset.cat;
      document.querySelectorAll('.svc-seg-b').forEach(b => b.classList.toggle('act', b.dataset.cat === cat));
      const q = document.getElementById('svcFilterInput');
      if (q) q.value = '';
      filterSvcRows(cat, '');
    }
    if (action === 'clear-custom-formatter') {
      e.preventDefault();
      delete S.customFormatter;
      if (S.formatter === 'custom') S.formatter = 'family-v4';
      saveState(); render();
    }
  });

  // Handle inputs and changes
  document.addEventListener('change', (e) => {
    if (e.target.dataset.action === 'set-aiostreams-target') {
      const target = e.target.value;
      if (!AIOSTREAMS_COMPATIBILITY_TARGETS.includes(target)) return;
      S.aiostreamsVersion = target;
      saveState();
      render();
      showToast(target === '2.31.1' ? 'Using v2.31.1 legacy compatibility lane' : 'Legacy TorBox Search preset removed for this target');
      return;
    }
    if (e.target.dataset.action === 'update-radio') {
      const k = e.target.dataset.key;
      const v = e.target.value;
      const allowed = RADIO_ALLOWED[k];
      if (!allowed || !allowed.has(v)) return;
      S[k] = v;
      if (k === 'device') {
        const DEV_AUDIO = DEVICE_AUDIO_DEFAULTS;
        const AUDIO_NAMES = { lossless:'Lossless (TrueHD / DTS-HD)', standard:'DD+ / Atmos', limited:'Auto', dolby:'Dolby Only' };
        const newAudio = DEV_AUDIO[v];
        const devCantDoLossless = DEVICE_FORCE_LIMITED_AUDIO.has(v);
        if (newAudio && newAudio !== S.audio) {
          if (S.quickStart && S.audio === 'lossless' && !devCantDoLossless) {
            // Preset chose lossless and this device supports it — keep it
          } else {
            S.audio = newAudio;
            showToast(`Audio auto-set to ${AUDIO_NAMES[newAudio] || newAudio}` + (S.quickStart && devCantDoLossless ? ' — this device can\'t do lossless' : ''));
          }
        }
      }
      saveState();
      syncNext();
      if (S.simpleMode && (step === 2 || step === 3)) {
        setTimeout(() => { const b = document.getElementById('btnNext'); if (b && !b.disabled) b.click(); }, 350);
      }
    }
    if (e.target.dataset.action === 'toggle-telemetry') {
      S.telemetryOk = e.target.checked;
      saveState();
    }
    if (e.target.dataset.action === 'toggle-p2p') {
      S.p2pEnabled = e.target.checked;
      e.target.closest('.pref-card')?.classList.toggle('pref-on', e.target.checked);
      saveState();
    }
    if (e.target.dataset.action === 'toggle-service') {
      const val = e.target.value;
      const i = S.multiServices.indexOf(val);
      if (i >= 0) S.multiServices.splice(i, 1);
      else S.multiServices.push(val);
      S.service = deriveService();
      if (val === 'p2p' && S.multiServices.includes('p2p') && !S.p2pEnabled) {
        S.p2pEnabled = true;
        showToast('Raw torrents enabled — required for P2P streams');
      }
      saveState();
      syncNext();
    }
    if (e.target.dataset.action === 'toggle-lang') {
      const v = e.target.value;
      const i = S.langs.indexOf(v);
      if (i >= 0) { if (S.langs.length > 1) S.langs.splice(i, 1); }
      else S.langs.push(v);
      saveState();
      const wasOpen = document.getElementById('langDetails')?.open;
      render();
      if (wasOpen) { const d = document.getElementById('langDetails'); if (d) d.open = true; }
    }
    if (e.target.dataset.action === 'toggle-lang-exclusive') {
      S.langExclusive = e.target.checked;
      saveState();
      const wasOpen = document.getElementById('langDetails')?.open;
      render();
      if (wasOpen) { const d = document.getElementById('langDetails'); if (d) d.open = true; }
    }
    if (e.target.dataset.action === 'toggle-foreign-kill') {
      S.foreignLangKill = e.target.checked;
      saveState();
      const wasOpen = document.getElementById('langDetails')?.open;
      render();
      if (wasOpen) { const d = document.getElementById('langDetails'); if (d) d.open = true; }
    }
    if (e.target.dataset.action === 'update-host') {
      S.instanceHost = e.target.value;
      saveState();
      const val = S.instanceHost;
      const urlRow  = document.getElementById('aioUrlRow');
      const uuidRow = document.getElementById('aioUuidRow');
      const cfgLinkRow = document.getElementById('hostConfigLinkRow');
      const cfgLink = document.getElementById('hostConfigLink');
      const showUuid = (val !== 'custom' && val !== 'auto');
      if (urlRow)  urlRow.style.display  = (val === 'custom') ? '' : 'none';
      if (uuidRow) uuidRow.style.display = showUuid ? '' : 'none';
      if (cfgLinkRow) cfgLinkRow.style.display = showUuid ? '' : 'none';
      if (cfgLink && HOST_BASE_URLS[val]) cfgLink.href = HOST_BASE_URLS[val] + '/configure';
      if (val === 'custom') { const u = document.getElementById('aioUrl'); if (u) u.value = S.instanceUrl || ''; }
      const _ar = document.getElementById('manualAioResult') || document.getElementById('aioResult');
      if (_ar) _ar.innerHTML = '';
      if (showUuid) updateUuidValidation(S.instanceUuid); else updateUuidValidation('');
    }
  });

  document.addEventListener('input', (e) => {
    const a = e.target.dataset.action;
    if (a === 'update-name') S.name = e.target.value.replace(/[<>"'&`]/g, '');
    else if (a === 'update-cred') {
      S.creds[e.target.dataset.service] = e.target.value;
    }
    else if (a === 'update-tmdb') {
      S.tmdbToken = e.target.value;
      const st = document.getElementById('tmdbStatus');
      if (st) st.innerHTML = tmdbHint('token', e.target.value);
    }
    else if (a === 'update-tmdb-key') {
      S.tmdbApiKey = e.target.value;
      const st = document.getElementById('tmdbKeyStatus');
      if (st) st.innerHTML = tmdbHint('key', e.target.value);
    }
    else if (a === 'svc-filter') {
      const q = e.target.value.toLowerCase().trim();
      if (q) {
        document.querySelectorAll('.svc-seg-b').forEach(b => b.classList.toggle('act', b.dataset.cat === 'all'));
        filterSvcRows('all', q);
      } else {
        const activeCat = document.querySelector('.svc-seg-b.act');
        filterSvcRows(activeCat ? activeCat.dataset.cat : 'all', '');
      }
    }
    else if (a === 'update-url') {
      const raw = e.target.value.trim();
      if (raw && !/^https?:\/\/.+/i.test(raw)) { showToast('URL must start with http:// or https://', true); return; }
      S.instanceUrl = raw;
    }
    else if (a === 'update-pwd') S.instancePassword = e.target.value;
    else if (a === 'update-base-uuid') { S.baseUuid = e.target.value.trim(); e.target.style.borderColor = S.baseUuid ? 'rgba(168,85,247,.5)' : ''; }
    else if (a === 'update-base-pwd') S.basePassword = e.target.value;
    else if (a === 'update-uuid') {
      const raw = e.target.value.trim();
      const extracted = extractManifestParts(raw);
      if (extracted) {
        S.instanceUuid = extracted.uuid;
        if (extracted.hostKey) { S.instanceHost = extracted.hostKey; const sel = document.getElementById('aioHost'); if(sel) sel.value = extracted.hostKey; const uuidRow=document.getElementById('aioUuidRow'),cfgLinkRow=document.getElementById('hostConfigLinkRow'),cfgLink=document.getElementById('hostConfigLink'); if(uuidRow)uuidRow.style.display=''; if(cfgLinkRow)cfgLinkRow.style.display=''; if(cfgLink&&HOST_BASE_URLS[extracted.hostKey])cfgLink.href=HOST_BASE_URLS[extracted.hostKey]+'/configure'; }
        if (extracted.password && !S.instancePassword) { S.instancePassword = extracted.password; const pe=document.getElementById('aioPwd'); if(pe)pe.value=extracted.password; }
        e.target.value = extracted.uuid;
        showToast('Manifest URL detected — fields auto-filled');
      } else { S.instanceUuid = raw; }
      updateUuidValidation(S.instanceUuid);
    }
    else if (a === 'paste-manifest') onPasteManifest(e.target.value);
    else if (a === 'update-stremio-email') S.stremioEmail = e.target.value.trim();
    else if (a === 'update-stremio-password') S.stremioPassword = e.target.value;

    if(['update-name', 'update-cred', 'update-tmdb', 'update-tmdb-key', 'update-url', 'update-pwd', 'update-uuid', 'update-stremio-email', 'update-stremio-password'].includes(a)){
      saveState();
    }
  });
});

/* PAYLOAD GENERATION & API LOGIC */
function insights() {
  const pts = [], dev = S.device, aud = S.audio, cnt = S.content, svc = S.service;
  if (dev === 'samsung') pts.push('<b>DV-Only Kill</b> — blocks DV streams missing HDR10 fallback (prevents purple screen)');
  else if (dev === 'firestick-hd') pts.push('<b>DV-Only Kill</b> on · AV1 excluded · limited audio (DD+ max)');
  else if (dev === 'shield') pts.push('<b>AV1 + HLG excluded</b> — prevents Nvidia Shield playback failures');
  else if (dev === 'appletv-old') pts.push('<b>AV1 excluded</b> — Apple TV 4K Gen 1/2 hardware limit');
  else if (dev === 'appletv-new') pts.push('<b>DV + HDR10+</b> · AV1 excluded · DD+/Atmos or multichannel PCM');
  else if (dev === 'windows') pts.push('<b>Full lossless + AV1</b> — Windows PC optimised, HDR-first visual tags');
  else if (dev === 'lgtv' || dev === 'sony') pts.push('<b>DV profile</b> · AV1 varies by model · internal apps use streaming-grade audio');
  else if (dev === 'roku') pts.push('<b>DV-Only Kill</b> · AV1 allowed · DD+ ceiling · HDR10 primary');
  else if (dev === 'chromecast') pts.push('<b>DV + HDR</b> · AV1 excluded for Chromecast 4K · DD+ Atmos');
  else if (dev === 'ipad') pts.push('<b>DV + AV1</b> · stereo/headphone audio · no lossless passthrough');
  else if (dev === 'projector') pts.push('<b>DV-Only Kill</b> · AV1 excluded · HDR10 primary · audio via receiver');
  else if (dev === 'onn') pts.push('<b>AV1 + HDR10</b> · DV-only excluded for non-Pro ONN models · DD+ Atmos');
  else if (dev === 'googletv') pts.push('<b>DV + AV1 + HDR10+</b> · no lossless audio · DD+ Atmos ceiling · 5.1ch');
  else if (dev === 'xiaomi') pts.push('<b>DV + HDR10+ + AV1</b> · Standard audio recommended');
  else if (dev === 'xiaomi-3rd') pts.push('<b>DV + HDR10+ + AV1</b> · Standard audio recommended');
  if (aud === 'dolby') pts.push('<b>All DTS excluded</b> — safe for Bose / Dolby soundbars (Atmos · TrueHD · DD+ only)');
  else if (aud === 'lossless') pts.push('<b>Full lossless audio ranked</b> — TrueHD · Atmos · DTS-HD MA · FLAC prioritised');
  else if (aud === 'standard') pts.push('<b>DD+ / Atmos ranked</b> — soundbar and smart TV profile');
  if (cnt === 'anime') pts.push('<b>SeaDex Best-Only</b> — only the confirmed best release group per title');
  else if (cnt === 'mixed') pts.push('<b>SeaDex + live-action</b> scrapers active simultaneously');
  else if (cnt === 'live') pts.push('<b>Anime scrapers off</b> — leaner fetch stack for Movies &amp; TV');
  if (svc === 'torbox-pro') pts.push('<b>Full scraper stack</b> — Meteor · Comet · MediaFusion · Zilean');
  if (!S.p2pEnabled) pts.push('<b>Raw torrents excluded</b> — direct P2P streams blocked; debrid results unaffected');
  if (S.qualityFirst) pts.push('<b>Quality over resolution</b> — REMUX ranked above resolution in sort order');
  if (S.resolutionFirst) pts.push('<b>Resolution first</b> — higher resolution always ranks above lower regardless of cache status');
  if (S.foreignLangKill !== false && cnt !== 'anime') pts.push('<b>Foreign language kill</b> — streams not in ' + (S.langs||['English']).join('/') + ' are hard-blocked (Library &amp; SeaDex exempt)');
  if (S.exclude4K) pts.push('<b>4K / UHD excluded</b> — 1080p and below only');
  if (S.excludeDV) pts.push('<b>Dolby Vision excluded</b> — DV streams removed, prevents tint on unsupported screens');
  if (S.sizeLimit !== 'unlimited') pts.push('<b>Size limit: max ' + S.sizeLimit + 'GB</b> — streams over ' + S.sizeLimit + 'GB excluded from results');
  if ((S.streamPool||'normal') !== 'normal') pts.push('<b>Stream pool: ' + (S.streamPool==='max'?'Maximum':'Large') + '</b> — more streams fetched for better quality picks');
  pts.push('<b>Per-Addon Flood Guard</b> — no single scraper can flood results');
  pts.push('<b>REPACK / PROPER priority</b> — fixed releases ranked above originals');
  return pts.slice(0, 6);
}

function insightsHtml() {
  const pts = insights();
  if (!pts.length) return '';
  return '<div class="insights-box"><div class="insights-hdr">Template Highlights</div><ul style="list-style:none;display:flex;flex-direction:column;gap:5px">' + pts.map(p => '<li><span style="color:#3fb950;flex-shrink:0">' + ICO.check(12,'#3fb950') + '</span><span>' + p + '</span></li>').join('') + '</ul></div>';
}

function telemetryHtml() {
  if (!USAGE_BEACON_URL) return '';
  return `<label style="display:flex;align-items:center;gap:9px;margin-bottom:14px;cursor:pointer;font-size:.78rem;color:#8b949e"><input type="checkbox" data-action="toggle-telemetry" ${S.telemetryOk ? 'checked' : ''} style="accent-color:#00d4ff;flex-shrink:0">Share an anonymous usage ping on download (service + device only — never keys or names)</label>`;
}

function sizeLimitHtml() {
  return '<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span style="color:#8b949e;font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Max File Size</span><span style="color:#4b5563;font-size:.72rem">Unlimited preserves REMUXes</span></div><div style="display:flex;gap:6px;flex-wrap:wrap">' + ['10','20','30','50','unlimited'].map(v => '<button type="button" data-action="set-size-limit" data-val="' + v + '" class="size-btn' + (S.sizeLimit === v ? ' size-btn-active' : '') + '">' + (v === 'unlimited' ? ICO.infinity(12,'currentColor')+' Unlimited' : v + 'GB') + '</button>').join('') + '</div></div>';
}

function formatterPickerHtml() {
  const cur = FORMATTERS.find(f => f.id === S.formatter) || FORMATTERS[0];
  const isCustom = S.formatter === 'custom' && S.customFormatter;
  return '<div style="margin-bottom:16px"><div style="color:#8b949e;font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Stream Layout</div>' +
    fmtDropdownHtml() +
    `<button data-action="import-formatter" style="margin-top:10px;width:100%;padding:9px;border-radius:8px;border:1.5px dashed rgba(167,139,250,.3);background:transparent;color:#a78bfa;font-size:.78rem;font-weight:600;cursor:pointer">${S.customFormatter ? '⟳ Replace Custom Formatter' : ICO.folder(14,'#a78bfa')+' Import Custom Formatter'}</button>` +
  '</div>';
}

function getDebridInputs() {
  const m = S.multiServices;
  const defs = PROVIDER_CREDENTIALS;
  const ids = [];
  if (m.includes('torbox-pro')||m.includes('torbox-ess')||m.includes('hybrid')) ids.push('torbox');
  if (m.includes('realdebrid')||m.includes('hybrid')) ids.push('realdebrid');
  if (m.includes('alldebrid'))  ids.push('alldebrid');
  if (m.includes('premiumize')) ids.push('premiumize');
  if (m.includes('debridlink')) ids.push('debridlink');
  if (m.includes('offcloud'))   ids.push('offcloud');
  if (m.includes('easynews'))   { ids.push('easynews'); ids.push('easynewsPass'); }
  if (m.includes('debridio'))   ids.push('debridio');
  if (m.includes('debrider'))   ids.push('debrider');
  if (m.includes('easydebrid')) ids.push('easydebrid');
  if (m.includes('pikpak'))     ids.push('pikpak');
  if (m.includes('seedr'))      ids.push('seedr');
  if (m.includes('nzbgeek'))    ids.push('nzbgeek');
  if (m.includes('streamnzb'))  ids.push('streamnzb');
  S.optionalScrapers.forEach(sid => {
    const d = OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid);
    if (d && d.credKey && defs[d.credKey] && !ids.includes(d.credKey)) ids.push(d.credKey);
  });
  return [...new Set(ids)].map(id => ({id, ...defs[id]})).filter(d => d.label);
}

function subtitlePresets() {
  const addons = S.subtitleAddons || ['aiosubtitle'];
  const langs = S.subtitleLangs || ['en'];
  const out = [];
  if (addons.includes('aiosubtitle')) out.push({ type:'aiosubtitle', instanceId:'aio-sub-1', enabled:true, options:{ name:'AIOSubtitle', timeout:4000, languages:langs } });
  if (addons.includes('opensubtitles-v3-plus')) out.push({ type:'opensubtitles-v3-plus', instanceId:'osub-v3-1', enabled:true, options:{ name:'OpenSubtitles v3+', timeout:5000, language:langs, sources:'all', includeAiTranslated:false, movieHashPlusAutoAdjustment:false } });
  if (addons.includes('subdl')) {
    // AIOStreams SubDL accepts up to five uppercase provider language codes.
    const subdlLanguages = [...new Set(langs.map(lang => String(lang).trim().toUpperCase()).filter(Boolean))].slice(0, 5);
    out.push({ type:'subdl', instanceId:'subdl-1', enabled:true, options:{ name:'SubDL', timeout:5000, resources:['subtitles'], language:subdlLanguages, hearingImpairment:'hiInclude', ...(S.creds.subdl ? { subDlApiKey:S.creds.subdl } : {}) } });
  }
  return out;
}

function catalogPresets() {
  const cats = S.catalogs || ['tmdb-addon'];
  const out = [];
  if (cats.includes('tmdb-addon')) out.push({ type:'tmdb-addon', instanceId:'tmdb-cat-1', enabled:true, options:{ name:'TMDB', timeout:5000 }, resources:['catalog','meta'], category:'meta_catalogs' });
  if (cats.includes('streaming-catalogs')) out.push({ type:'streaming-catalogs', instanceId:'strm-cat-1', enabled:true, options:{ name:'Streaming Catalogs', timeout:5000 }, resources:['catalog'], category:'meta_catalogs' });
  if (cats.includes('anime-catalogs')) out.push({ type:'anime-catalogs', instanceId:'ani-cat-1', enabled:true, options:{ name:'Anime Catalogs', timeout:5000 }, resources:['catalog'], category:'meta_catalogs' });
  if (cats.includes('rpdb-catalogs')) out.push({ type:'rpdb-catalogs', instanceId:'rpdb-cat-1', enabled:true, options:{ name:'RPDB Catalogs', timeout:5000 }, resources:['catalog'], category:'meta_catalogs' });
  if (cats.includes('torrent-catalogs')) out.push({ type:'torrent-catalogs', instanceId:'torr-cat-1', enabled:true, options:{ name:'Torrent Catalogs', timeout:5000 }, resources:['catalog'], category:'meta_catalogs' });
  return out;
}

function sid() { const a = new Uint8Array(6); crypto.getRandomValues(a); return Array.from(a, b => b.toString(36).padStart(2, '0')).join('').slice(0, 8); }

function defaultName() {
  const res = S.resolution, svc = S.service, dev = S.device;
  const is4k = res === '4k', isUW = res === 'ultrawide';
  const resSuffix = S.pseArch === 'apex-mixed' ? ' Apex Mixed' : is4k ? ' 4K' : isUW ? ' Ultrawide' : res === 'mixed' ? ' Mixed' : '';
  const devLabel = {'samsung':'Samsung TV','xiaomi':'Xiaomi','xiaomi-3rd':'Xiaomi','firestick-hd':'Fire Stick','firestick-4kmax':'Fire Stick 4K','appletv-old':'Apple TV','appletv-new':'Apple TV','shield':'Shield','googletv':'Google TV','roku':'Roku','chromecast':'Chromecast','sony':'Sony TV','lgtv':'LG TV','ipad':'iPad','projector':'Projector','onn':'ONN'}[dev] || '';
  const svcName = {'torbox-pro':'TorBox','torbox-ess':'TorBox Essential','alldebrid':'AllDebrid','realdebrid':'Real-Debrid','premiumize':'Premiumize','debridlink':'Debrid-Link','offcloud':'Offcloud','easynews':'EasyNews','p2p':'P2P','http':'HTTP','debridio':'Debridio','debrider':'Debrider'}[svc] || '';
  if (svc === 'multi') {
    const names = {'alldebrid':'AllDebrid','realdebrid':'RD','premiumize':'Premiumize','debridlink':'DL','offcloud':'Offcloud','easynews':'EasyNews','torbox-pro':'TorBox','torbox-ess':'TB Essential','debridio':'Debridio','debrider':'Debrider','easydebrid':'EasyDebrid','pikpak':'PikPak','seedr':'Seedr'};
    const PRIMARY = ['torbox-pro','torbox-ess','alldebrid','realdebrid','premiumize','debridlink','easynews','offcloud','debridio','debrider','easydebrid','pikpak','seedr'];
    const mainSvcs = S.multiServices.filter(s => PRIMARY.includes(s));
    const svcStr = mainSvcs.length <= 3 ? mainSvcs.map(s => names[s] || s).join(' + ') : mainSvcs.slice(0,2).map(s => names[s] || s).join(' + ') + ` +${mainSvcs.length - 2}`;
    return `Core Nexus${resSuffix}${devLabel ? ' · ' + devLabel : ''} — ${svcStr}`.trim();
  }
  return `Core Nexus${resSuffix}${devLabel ? ' · ' + devLabel : ''}${svcName ? ' — ' + svcName : ''}`.trim();
}

function presets() {
  const svc = S.service;
  const isMulti = svc === 'multi', isP2P = svc === 'p2p', isEasynews = svc === 'easynews', isHttp = svc === 'http', isDebridio = svc === 'debridio';
  const hasDebridio = isDebridio || (isMulti && S.multiServices.includes('debridio'));
  const multiHasEasynews = isMulti && S.multiServices.includes('easynews');
  const hasExtraHttp = isMulti && S.multiServices.includes('http') && !isHttp;
  const isNzbgeek = isMulti && S.multiServices.includes('nzbgeek');
  const isStreamnzb = isMulti && S.multiServices.includes('streamnzb');
  const useStore = ['alldebrid','realdebrid','premiumize','debridlink','offcloud','easydebrid','pikpak','seedr'].includes(svc) || (isMulti && S.multiServices.some(s => ['alldebrid','realdebrid','premiumize','debridlink','offcloud','easydebrid','pikpak','seedr'].includes(s)));
  if (isHttp) return [
    { type:'sootio', instanceId:'sootio-core-builds', enabled:true, options:{ name:'Sootio', timeout:5000 }, resources:['stream'] },
    { type:'peerflix', instanceId:'pflx-1', enabled:true, options:{ name:'Peerflix', timeout:7000, useMultipleInstances:false }, resources:['stream'] },
    { type:'webstreamr', instanceId:'wsr-1', enabled:false, options:{ name:'WebStreamr', timeout:7000 }, resources:['stream'] },
    { type:'nuvio-streams', instanceId:'nvs-1', enabled:false, options:{ name:'Nuvio Streams', timeout:7000 }, resources:['stream'] },
    { type:'flix-streams', instanceId:'flx-1', enabled:false, options:{ name:'Flix-Streams', timeout:7000 }, resources:['stream'] },
    { type:'hdhub', instanceId:'hdhub-1', enabled:true, options:{ name:'HdHub', timeout:5000, resources:['stream'], mediaTypes:['movie','series','anime'] } },
    ...subtitlePresets(),
    ...catalogPresets()
  ];
  const storeLabels = {'alldebrid':'StremThru AllDebrid','realdebrid':'StremThru RD','premiumize':'StremThru Premiumize','debridlink':'StremThru Debrid-Link','offcloud':'StremThru Offcloud','easydebrid':'StremThru EasyDebrid','pikpak':'StremThru PikPak','seedr':'StremThru Seedr'};
  const debridServices = ['alldebrid','realdebrid','premiumize','debridlink','offcloud','easydebrid','pikpak','seedr'];
  const multiHasTorbox = isMulti && (S.multiServices.includes('torbox-pro') || S.multiServices.includes('torbox-ess'));
  const storeSlot = isMulti
    ? [...(multiHasTorbox ? [{ type:'stremthruTorz', instanceId:'67c', enabled:true, options:{ name:'StremThru Torz', timeout:5000, includeP2P:false, useMultipleInstances:false }, resources:['stream'] }] : []), ...S.multiServices.filter(s => debridServices.includes(s)).map((s, i) => ({ type:'stremthruStore', instanceId:`68${String.fromCharCode(97+i)}`, enabled:true, options:{ name:storeLabels[s] || 'StremThru Store', timeout:5000, useMultipleInstances:false }, resources:['stream'] }))]
    : useStore ? [{ type:'stremthruStore', instanceId:'68a', enabled:true, options:{ name:storeLabels[svc] || 'StremThru Store', timeout:5000, useMultipleInstances:false }, resources:['stream'] }]
    : svc === 'hybrid' ? [{ type:'stremthruTorz', instanceId:'67c', enabled:true, options:{ name:'StremThru Torz', timeout:5000, includeP2P:false, useMultipleInstances:false }, resources:['stream'] }, { type:'stremthruStore', instanceId:'68a', enabled:true, options:{ name:'StremThru RD', timeout:5000, useMultipleInstances:false }, resources:['stream'] }]
    : isP2P || isEasynews || isDebridio ? []
    : [{ type:'stremthruTorz', instanceId:'67c', enabled:true, options:{ name:'StremThru Torz', timeout:5000, includeP2P:false, useMultipleInstances:false }, resources:['stream'] }];

  const list = [
    { type:'library', instanceId:'lib-1', enabled:!isP2P, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } },
    ...(isP2P ? [{ type:'torrentio', instanceId:'tio-p2p-1', enabled:true, options:{ name:'Torrentio', timeout:7000 }, resources:['stream'] }] : []),
    { type:'zilean', instanceId:'nx-fix-04', enabled:true, options:{ name:'Zilean', timeout:4000, resources:['stream'] } },
    { type:'seadex', instanceId:'tam-seadex', enabled:S.content !== 'live', options:{ name:'SeaDex', timeout:4000, mediaTypes:['anime'] }, resources:['stream'] },
    ...storeSlot,
    ...(isEasynews || multiHasEasynews ? [
      { type:'easynewsPlusPlus', instanceId:'en-ppp-1', enabled:true, options:{ name:'EasyNews++', timeout:6000 }, resources:['stream'] },
      { type:'easynews-search', instanceId:'en-srch-1', enabled:true, options:{ name:'EasyNews Search', timeout:5000, apiVersion:'3.0' }, resources:['stream'] },
    ] : []),
    ...(isNzbgeek && S.creds.nzbgeek ? [
      { type:'newznab', instanceId:'nzbgeek-1', enabled:true, options:{ name:'NZBGeek', api:{ url:'https://api.nzbgeek.info/api', apiKey:S.creds.nzbgeek }, timeout:6000, mediaTypes:['movie','series','anime'], searchMode:'auto', seasonEpisodeStrategy:'episode', paginate:true, useMultipleInstances:false } },
    ] : []),
    ...(isStreamnzb ? [
      { type:'streamnzb', instanceId:'nx-snzb-01', enabled:true, options:{ name:'StreamNZB', timeout:5000, ...(S.creds.streamnzb ? { url:S.creds.streamnzb } : { url:'' }), mediaTypes:['movie','series','anime'] } },
    ] : []),
    ...(hasDebridio && S.creds.debridio ? [
      { type:'debridio', instanceId:'dbio-1', enabled:true, options:{ name:'Debridio', timeout:7000, ...(S.creds.debridio ? { apiKey:S.creds.debridio } : {}) }, resources:['stream'] },
    ] : []),
    ...(S.multiServices.includes('debrider') && S.creds.debrider ? [
      { type:'debrider', instanceId:'dbr-1', enabled:true, options:{ name:'Debrider', timeout:7000, ...(S.creds.debrider ? { apiKey:S.creds.debrider } : {}) }, resources:['stream'] },
    ] : []),
    ...S.optionalScrapers.filter(sid => OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid && !x.credKey && !x.apiUrl)).map(sid => {
      const d = OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid);
      if (d.id === 'knaben') return { type:'knaben', instanceId:'knaben-1', enabled:true, options:{ name:'Knaben', timeout:7000 }, resources:['stream'] };
      if (d.id === 'zilean') return null;
      return null;
    }).filter(Boolean),
    ...S.optionalScrapers.filter(sid => OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid && x.credKey && !x.apiUrl)).map(sid => {
      const d = OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid);
      if (d.id === 'jackett') return { type:'jackett', instanceId:'jackett-1', enabled:true, options:{ name:'Jackett', timeout:10000, ...(S.creds.jackett ? { apiKey:S.creds.jackett } : {}) }, resources:['stream'] };
      if (d.id === 'prowlarr') return { type:'prowlarr', instanceId:'prowlarr-1', enabled:true, options:{ name:'Prowlarr', timeout:10000, ...(S.creds.prowlarr ? { apiKey:S.creds.prowlarr } : {}) }, resources:['stream'] };
      return null;
    }).filter(Boolean),
    ...S.optionalScrapers.filter(sid => OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid && x.presetType === 'newznab')).map(sid => {
      const d = OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid);
      return { type:'newznab', instanceId:`${d.id}-1`, enabled:true, options:{ name:d.label, api:{ url:d.apiUrl, apiKey:S.creds[d.credKey] || '' }, timeout:6000, mediaTypes:['movie','series','anime'], searchMode:'auto', seasonEpisodeStrategy:'episode', paginate:true, useMultipleInstances:false } };
    }),
    ...(hasExtraHttp ? [
      { type:'webstreamr', instanceId:'wsr-1', enabled:false, options:{ name:'WebStreamr', timeout:7000 }, resources:['stream'] },
      { type:'nuvio-streams', instanceId:'nvs-1', enabled:false, options:{ name:'Nuvio Streams', timeout:7000 }, resources:['stream'] },
      { type:'flix-streams', instanceId:'flx-1', enabled:false, options:{ name:'Flix-Streams', timeout:7000 }, resources:['stream'] },
    ] : []),
    { type:'meteor', instanceId:'nx-fix-02', enabled:true, options:{ name:'Meteor', timeout:6000, yourMedia:{ sources:['torrent','webdl','usenet'], showStreams:true, enabled:true }, usenet:{ enabled:true, customSearchEngines:true }, url:'https://meteorfortheweebs.midnightignite.me', resources:['stream'] } },
    { type:'comet', instanceId:'nx-fix-01', enabled:true, options:{ name:'Comet', timeout:7000, resources:['stream'], mediaTypes:['movie','series','anime'], scrapeDebridAccountTorrents:true } },
    { type:'mediafusion', instanceId:'nx-mf-01', enabled:true, options:{ name:'MediaFusion', timeout:7000, resources:['stream'], mediaTypes:['movie','series','anime'] } },
    { type:'hdhub', instanceId:'hdhub-1', enabled:isP2P, options:{ name:'HdHub', timeout:5000, resources:['stream'], mediaTypes:['movie','series','anime'], ...(!isP2P && (multiHasTorbox || svc === 'torbox-pro' || svc === 'torbox-ess') ? {tb_only:true} : {}) } },
    { type:'eztv', instanceId:'nx-ez-01', enabled:true, options:{ name:'EZTV', timeout:5000 }, resources:['stream'] },
    { type:'torrent-galaxy', instanceId:'nx-tg-01', enabled:true, options:{ name:'Torrent Galaxy', timeout:5000 }, resources:['stream'] },
    { type:'knaben', instanceId:'tam-knaben', enabled:true, options:{ name:'Knaben', timeout:6000, mediaTypes:[], useMultipleInstances:false }, resources:['stream'] },
    { type:'torrents-db', instanceId:'nx-tdb-1', enabled:false, options:{ name:'TorrentsDB', timeout:5000, useMultipleInstances:false }, resources:['stream'] },
    ...(S.content === 'anime' || S.content === 'all' || S.content === 'mixed' ? [
      { type:'animetosho', instanceId:'nx-at-01', enabled:S.content === 'anime', options:{ name:'AnimeTosho', timeout:5000, mediaTypes:['anime'] }, resources:['stream'] },
      { type:'neko-bt', instanceId:'neko-bt-core-builds', enabled:false, options:{ name:'NekoBT', timeout:5000, mediaTypes:['anime'] }, resources:['stream'] },
    ] : []),
    { type:'sootio', instanceId:'sootio-core-builds', enabled:isP2P, options:{ name:'Sootio', timeout:5000 }, resources:['stream'] },
    ...(isP2P ? [{ type:'peerflix', instanceId:'pflx-1', enabled:true, options:{ name:'Peerflix', timeout:7000, useMultipleInstances:false }, resources:['stream'] }] : []),
    ...subtitlePresets(),
    ...catalogPresets()
  ];
  // The legacy built-in torbox-search preset was removed in AIOStreams v2.32
  // (TorBox Search API shut down). Emitting it — even disabled — makes the
  // config fail to save on v2.32+ hosts, so it is never generated here.
  return list;
}

function cred(id) { return S.creds[id] ? {apiKey: S.creds[id]} : {}; }
function services() {
  const svc = S.service, isMulti = svc === 'multi', m = S.multiServices;
  return [
    {id:'realdebrid', enabled: svc==='realdebrid' || svc==='hybrid' || (isMulti && m.includes('realdebrid')), credentials:cred('realdebrid')},
    {id:'alldebrid', enabled: svc==='alldebrid' || (isMulti && m.includes('alldebrid')), credentials:cred('alldebrid')},
    {id:'premiumize', enabled: svc==='premiumize' || (isMulti && m.includes('premiumize')), credentials:cred('premiumize')},
    {id:'debridlink', enabled: svc==='debridlink' || (isMulti && m.includes('debridlink')), credentials:cred('debridlink')},
    {id:'torbox', enabled: svc==='torbox-pro' || svc==='torbox-ess' || svc==='hybrid' || (isMulti && (m.includes('torbox-pro')||m.includes('torbox-ess'))), credentials:cred('torbox')},
    {id:'offcloud', enabled: svc==='offcloud' || (isMulti && m.includes('offcloud')), credentials:cred('offcloud')},
    {id:'easydebrid', enabled: svc==='easydebrid' || (isMulti && m.includes('easydebrid')), credentials:cred('easydebrid')},
    {id:'pikpak', enabled: svc==='pikpak' || (isMulti && m.includes('pikpak')), credentials:cred('pikpak')},
    {id:'seedr', enabled: svc==='seedr' || (isMulti && m.includes('seedr')), credentials:cred('seedr')},
    {id:'easynews', enabled: svc==='easynews' || (isMulti && m.includes('easynews')), credentials: (svc==='easynews' || (isMulti && m.includes('easynews'))) && S.creds.easynews ? { username:S.creds.easynews, password:S.creds.easynewsPass||'' } : {}},
    {id:'putio', enabled: false, credentials:{}},
    {id:'debrider', enabled: svc==='debrider' || (isMulti && m.includes('debrider')), credentials:cred('debrider')},
    {id:'nzbdav', enabled: false, credentials:{}}, {id:'altmount', enabled: false, credentials:{}}, {id:'stremthru_newz', enabled: false, credentials:{}},
    {id:'stremio_nntp', enabled: false, credentials:{}}, {id:'aiostreams', enabled: false, credentials:{}}
  ];
}

function filterSvcRows(cat, q) {
  const rows = document.querySelectorAll('#svcRows .svc-list-row');
  let anyVis = false;
  rows.forEach(r => {
    const rCat = r.dataset.svcCat || '';
    const rName = r.dataset.svcName || '';
    const text = r.textContent.toLowerCase();
    const catMatch = cat === 'all' || rCat === cat;
    const searchMatch = !q || rName.includes(q) || text.includes(q);
    const vis = catMatch && searchMatch;
    r.style.display = vis ? '' : 'none';
    if (vis) anyVis = true;
  });
  const empty = document.getElementById('svcEmpty');
  if (empty) empty.style.display = anyVis ? 'none' : 'block';
}

function resolutionCfg() { return resolutionPolicy(templateInput(S)); }
function encodeCfg() { return encodePolicy(templateInput(S), DEVICE_AV1_SAFE); }
function audioCfg() { return audioPolicy(templateInput(S), DEVICE_FORCE_LIMITED_AUDIO); }

function visualTags() {
  const dev = S.device;
  if (dev === 'appletv-old') return ['DV','HDR+DV','HDR10','HDR','HLG','10bit','SDR','IMAX'];
  if (dev === 'appletv-new') return ['DV','HDR+DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'];
  if (dev === 'lgtv' || dev === 'sony') return ['DV','HDR+DV','HDR10','HDR','HLG','10bit','SDR','IMAX'];
  if (dev === 'samsung') return ['HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'];
  if (dev === 'firestick-hd') return ['HDR10','HDR','HLG','SDR'];
  if (['firestick-4kmax','chromecast','googletv','xiaomi','xiaomi-3rd'].includes(dev)) return ['DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'];
  if (dev === 'onn') return ['HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'];
  if (dev === 'shield') return ['DV','HDR+DV','HDR10','HDR','10bit','SDR','IMAX'];
  if (dev === 'ipad') return ['DV','HDR+DV','HDR10','HDR','10bit','SDR'];
  if (dev === 'roku' || dev === 'projector' || dev === 'generic') return ['HDR10','HDR','HLG','10bit','SDR','IMAX'];
  if (dev === 'windows' || S.resolution === '4k' || S.resolution === 'ultrawide' || S.resolution === 'mixed' || S.pseArch === 'apex-mixed') return ['HDR+DV','DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'];
  return ['HDR10','HDR','HLG','10bit','SDR','IMAX'];
}
// Keep valid episode packs as a fallback. These are appended after every
// quality/cache/result-cap ESE so they only hide packs when three playable
// single-episode results have actually survived.
function lateEpisodePackFallbackEses() {
  return [
    { enabled:true, expression:"/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? multiEpisode(streams) : []" },
    { enabled:true, expression:"/* CB | Late Pack Fallback — hide ambiguous season packs only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? seasonPack(streams,'onlySeasons') : []" },
  ];
}

function eses() {
  const out = [], dev = S.device, is1080= S.resolution === '1080p';
  const isFree = S.service === 'p2p' || S.service === 'http';

  if (S.service === 'http') {
    out.push({ enabled:true, expression:"/* CB | Hard YouTube Kill */ type(streams,'youtube','external')" });
    if (is1080) out.push({ enabled:true, expression:"/* Hard Resolution Kill */ resolution(streams,'2160p','1440p')" });
    if (S.exclude4K && !is1080) out.push({ enabled:true, expression:"/* Exclude 4K / UHD */ resolution(streams,'2160p','1440p')" });
    if (S.excludeDV) out.push({ enabled:true, expression:"/* Exclude Dolby Vision */ visualTag(streams,'DV','HDR+DV')" });
    { const ae = generateAgeRatingESE(S.ageLimit); if (ae) out.push(ae); }
    return out;
  }

  if (S.service === 'p2p') {
    out.push({ enabled:true, expression:"/* CB | Hard YouTube Kill */ type(streams,'youtube','external')" }, { enabled:true, expression:"/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')" });
    out.push({ enabled:true, expression:"/* Auto-Hide SD */ count(resolution(streams,'1080p'))>=5 and count(resolution(streams,'720p'))>=5 ? resolution(streams,'480p','360p','SD') : []" });
    out.push({ enabled:true, expression:"/* Auto-Hide 720p */ count(resolution(streams,'1080p'))>=15 or count(resolution(streams,'2160p'))>=15 ? resolution(streams,'720p') : []" });
    if (S.foreignLangKill !== false && S.content !== 'anime') {
      const langArgs = [...new Set([...(S.langs||['English']),'Original','Multi','Dual Audio','Dubbed','Unknown'])].map(l=>`'${l}'`).join(',');
      out.push({ enabled:true, expression:`/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, ${langArgs})), streams) : []` });
    }
    if (S.content !== 'anime') out.push({ enabled:true, expression: "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')" });
    if (is1080) out.push({ enabled:true, expression:"/* Hard Resolution Kill */ resolution(streams,'2160p','1440p')" });
    if (['generic','samsung','firestick-hd','roku','projector','onn'].includes(dev)) out.push({ enabled:true, expression: "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))" });
    if (S.exclude4K && !is1080) out.push({ enabled:true, expression:"/* Exclude 4K / UHD */ resolution(streams,'2160p','1440p')" });
    if (S.excludeDV) out.push({ enabled:true, expression:"/* Exclude Dolby Vision */ visualTag(streams,'DV','HDR+DV')" });
    if (S.sizeLimit !== 'unlimited') {
      out.push({ enabled:true, expression:`/* Size Limit — max ${S.sizeLimit}GB */ size(streams,'1B','${S.sizeLimit}GB')` });
    }
    { const ae = generateAgeRatingESE(S.ageLimit); if (ae) out.push(ae); }
    out.push(...lateEpisodePackFallbackEses());
    return out;
  }

  out.push({ enabled:true, expression: "/*Per-Addon Flood Guard*/ merge(slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Meteor'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Comet'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'MediaFusion'),4),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Torrent Galaxy'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'EZTV'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'HdHub'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Knaben'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'TorrentsDB'),1))" });
  const usesIqrPolicy = S.pseArch === 'iqr' && ['4k', '1080p'].includes(S.resolution);
  if (usesIqrPolicy || S.pseArch === 'apex-mixed') out.push({ ...SCORE_IQR_GUARD });
  if (S.content !== 'anime') out.push({ enabled:true, expression: "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')" });
  if (S.foreignLangKill !== false && S.content !== 'anime') {
    const langArgs = [...new Set([...(S.langs||['English']),'Original','Multi','Dual Audio','Dubbed','Unknown'])].map(l=>`'${l}'`).join(',');
    out.push({ enabled:true, expression:`/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, ${langArgs})), streams) : []` });
  }
  out.push(
    { enabled:true, expression: "/*Usenet Propagation Guard*/ count(negate(age(type(streams,'usenet','stremio-usenet'),0,'2'),type(streams,'usenet','stremio-usenet')))>0?age(type(streams,'usenet','stremio-usenet'),0,'2'):[]" },
    { enabled:true, expression:"/*AI Upscale Exclusion*/ keyword(negate(merge(library(streams),seadex(streams)),streams),'all','topaz','ai-upscale','aiupscale','upscaled','neural','enhancedai')" },
    { enabled:true, expression:"/*Info & Other Unwanted*/ merge(type(streams,'info'),releaseGroup(type(streams,'usenet','stremio-usenet'),'sample'),type(keyword(streams,'all','-sample'),'usenet','stremio-usenet'),message(type(streams,'usenet','stremio-usenet'),'includes','🚫'))" },
    { enabled:true, expression:"/* CB | Hard CAM Kill */ quality(streams,'CAM','SCR','TS','TC','HC HD-Rip')" },
    { enabled:true, expression:"/* CB | Hard External Kill */ type(streams,'external')" },
    { enabled:true, expression:"/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')" },
    { enabled:true, expression:"/*Extra SeaDex*/ count(seadex(streams,'best'))>1 or count(negate(seadex(streams,'best'),seadex(streams)))>1 ? merge(slice(negate(seadex(streams,'best'),seadex(streams)),1),slice(seadex(streams,'best'),1)) : []" },
    { enabled:true, expression:"/*Bad 4k Anime*/ (isAnime and originalLanguage == 'Japanese' and count(quality(resolution(cached(streams),'2160p'),'Bluray REMUX')) == 0 and count(seadex(resolution(streams,'2160p'))) == 0) ? negate(merge(library(streams),seadex(streams)),resolution(streams,'2160p')) : []" },
    { enabled:true, expression:"/*Upscaled 4k*/ (queryType=='movie' or queryType=='series') and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))>=1) and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'))==0 ? negate(merge(seadex(streams),library(streams)),resolution(streams,'2160p')) : []" },
    { enabled:true, expression:"/*Bad 4k Bluray*/ (queryType=='movie' or queryType=='series') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(seadex(resolution(streams,'2160p')))==0 ? negate(merge(seadex(streams),library(streams)),resolution(quality(streams,'Bluray'),'2160p')) : []" },
    { enabled:true, expression:"/*Bad 1080P Bluray*/ (queryType=='movie') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))==0) and count(seadex(resolution(streams,'1080p')))==0 ? negate(merge(seadex(streams),library(streams)),quality(resolution(streams,'1080p'),'Bluray')) : []" },
    { enabled:true, expression:"/* Adaptive Score Floor */ count(streamExpressionScore(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),-50+min(30,daysSinceRelease*0.1)))<5?[]:streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,-50+min(30,daysSinceRelease*0.1))" },
    { enabled:true, expression:"/* Low Seeder Cull */ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=3?[]:seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,0)" },
    ...(S.service!=='p2p'&&S.service!=='http'&&((S.multiServices||[]).includes('realdebrid')||S.service==='realdebrid') ? [{ enabled:true, expression:"/* RD Copyright */ service(keyword(streams,'all','web-dl','webrip','bdrip','hdrip','dvdrip','bluray.x264','hdtv.x264','hdtv.xvid','web.x264','web.h264'),'realdebrid')" }] : []),
    { enabled:true, expression:"/*G's Low Bitrate*/ count(negate((isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))),cached(streams)))>10?(isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))):[]" },
    { enabled:true, expression:"/*Low Seeders*/ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=5?[]:count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10)))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))>5?negate(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),1),merge(type(streams,'p2p'),type(uncached(streams),'debrid'))):[]" },
    { enabled:true, expression:"/*Final Limit (All)*/ merge(count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip'))>12?quality(negate(merge(library(streams),seadex(streams)),streams),'HDRip','HC HD-Rip','DVDRip','HDTV','CAM','TS','TC','SCR'):count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip','HDRip','HC HD-Rip','DVDRip','HDTV'))>12?quality(streams,'CAM','TS','TC','SCR'):[],count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>15?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>9?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>6?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),6))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>3?negate(merge(library(streams),seadex(streams)),merge(slice(type(uncached(streams),'debrid'),6),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),-1))):[])" }
  );
  if (is1080) out.push({ enabled:true, expression:"/* Hard Resolution Kill */ resolution(streams,'2160p','1440p')" });
  if (['generic','samsung','firestick-hd','roku','projector','onn'].includes(dev)) out.push({ enabled:true, expression: "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))" });
  const hasRD = S.service==='realdebrid' || S.service==='hybrid' || (S.service==='multi' && S.multiServices && S.multiServices.includes('realdebrid'));
  if (hasRD) out.push({ enabled:true, expression:"/*RD Copyright (per DMM)*/ service(keyword(streams,'all','web-dl','webrip','bdrip','hdrip','dvdrip','bluray.x264','hdtv.x264','hdtv.xvid','web.x264','web.h264'),'realdebrid')" });
  out.push({ enabled:true, expression:"/* Indexer Diversity */ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>20 ? negate(perGroup(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'indexer',2),negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http')))) : []" });
  if (S.cacheMode !== 'uncached') out.push({ enabled:true, expression: "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')))" }, { enabled:true, expression: "/* Extra Cached LQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')))" });
  if (S.cacheMode !== 'cached') out.push({ enabled:true, expression: "/* Extra Uncached */ negate(perGroup(uncached(streams),'resolution',3),uncached(streams))" });
  if (S.cacheMode === 'cached')   out.push({ enabled:true, expression:"/* Cached Only — hard kill uncached */ uncached(streams)" });
  if (S.cacheMode === 'uncached') out.push({ enabled:true, expression:"/* Uncached Only — hard kill cached */ cached(streams)" });
  if (!S.p2pEnabled && !S.multiServices.includes('p2p')) out.push({ enabled:true, expression:"/* P2P Kill */ type(streams,'p2p')" });
  if (S.exclude4K && !is1080) out.push({ enabled:true, expression:"/* Exclude 4K / UHD */ resolution(streams,'2160p','1440p')" });
  if (S.excludeDV) out.push({ enabled:true, expression:"/* Exclude Dolby Vision */ visualTag(streams,'DV','HDR+DV')" });
  if (S.sizeLimit !== 'unlimited') {
    out.push({ enabled:true, expression:`/* Size Limit — max ${S.sizeLimit}GB */ size(streams,'1B','${S.sizeLimit}GB')` });
  }
  const ageEse = generateAgeRatingESE(S.ageLimit);
  if (ageEse) out.push(ageEse);
  out.push(...lateEpisodePackFallbackEses());
  return out;
}

function pses() {
  const out = [], res = S.resolution, dev = S.device, dv = DEVICE_DV_SAFE.has(dev), supportsAv1 = DEVICE_AV1_SAFE.has(dev), codecExpr = supportsAv1 ? "/* Codec Efficiency Booster */ encode(streams,'HEVC','AV1')" : "/* Codec Efficiency Booster */ encode(streams,'HEVC')";
  const pinLQ = { enabled:true, expression:"/* LQ Pin Bottom */ pin(releaseGroup(streams,'YIFY','RARBG','EVO','YTS','PSA','MeGusta','Tigole'),'bottom')" };

  if (S.langs && S.langs.length) {
    out.push({ enabled:true, expression:`/* Language Preference — ${(S.langs||['English']).join('/')} */ language(streams,${(S.langs||['English']).map(l=>`'${l}'`).join(',')})` });
  }

  // Ecosystem: Sub-First Anime Booster & Dolby Priority
  out.push({ enabled:true, expression:"/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []" });
  if (S.audio === 'dolby') {
    out.push({ enabled:true, expression:"/* Dolby Priority for Sonos/Bose */ audioTag(streams,'Atmos','TrueHD','DDP','DD+')" });
  }

  if (S.service === 'http') {
    out.push({ enabled:true, expression:"/* Resolution Preference */ resolution(streams,'1080p','720p','480p')" });
    return out;
  }

  if (S.service === 'p2p') {
    out.push(pinLQ);
    if (res === '4k' || res === 'mixed') {
      out.push({ enabled:true, expression:"/* S-Tier 4K */ resolution(streams,'2160p')" }, { enabled:true, expression:"/* A-Tier 1080p */ resolution(streams,'1080p')" }, { enabled:true, expression:codecExpr });
    } else {
      out.push({ enabled:true, expression:"/* S-Tier 1080p */ resolution(streams,'1080p')" }, { enabled:true, expression:"/* A-Tier 720p Fallback */ resolution(streams,'720p')" }, { enabled:true, expression:codecExpr });
    }
    out.push({ enabled:true, expression:"/* Seeder Priority */ seeders(streams,5,99999)" });
    return out;
  }

  const forceLimitedAudio = S.audio === 'limited' || DEVICE_FORCE_LIMITED_AUDIO.has(dev);
  const sel = getSelPolicy({ architecture: S.pseArch || 'standard', resolution: res, dv, audio: S.audio, forceLimitedAudio, supportsAv1 });
  out.push(...sel.preferredStreamExpressions);
  return out;
}

function build() {
  const name = (S.name.trim() || defaultName()), rc = resolutionCfg(), ec = encodeCfg(), ac = audioCfg();
  const input = templateInput(S);
  const hasTmdb = hasTmdbCredentials(input);
  const useBase = !!(S.baseUuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(S.baseUuid.trim()));

  const globalTimeout = Number(input.addonTimeout)||6000;
  const normalizedPresets = assertAddonPolicy(addonPolicy(input, presets(), { defaultTimeout: globalTimeout }));
  const activePresets = normalizedPresets.presets;
  // Fields only included when NOT using a base config (inherited via misc/sorting/formatter/services)
  const standaloneOnly = useBase ? {} : {
    preferredQualities: ['BluRay REMUX','BluRay','WEB-DL','WEBRip','HDRip','HDTV'],
    excludedLanguages: [], includedLanguages: [], requiredLanguages: [...new Set([...(S.langs||['English']),'Original','Dual Audio','Multi','Dubbed','Unknown'])], preferredLanguages: [...new Set([...(S.langs||['English']),'Original','Dual Audio','Multi','Dubbed'])],
    preferredAudioTags: ac.preferredAudioTags,
    syncedRankedRegexUrls: ['https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json'],
    rankedRegexPatterns: (S.service==='p2p'||S.service==='http') ? [] : ((S.resolution==='4k'||S.resolution==='ultrawide'||S.resolution==='mixed'||S.pseArch==='apex-mixed') ? [...RANKED_REGEX_COMMON,...RANKED_REGEX_UHD] : [...RANKED_REGEX_COMMON]),
    excludedRegexPatterns: [...EXCLUDED_REGEX],
    addonCategoryColors: {Mix:'indigo',Debrid:'emerald',Usenet:'lime',HTTP:'cyan',P2P:'orange',Subs:'purple'},
    mergedCatalogs: [], rpdbApiKey: 't0-free-rpdb', posterService: 'rpdb', enhanceResults: true,
    usePosterRedirectApi: true, usePosterServiceForMeta: true,
    ...(S.tmdbToken ? { tmdbAccessToken: S.tmdbToken } : {}),
    ...(S.tmdbApiKey ? { tmdbApiKey: S.tmdbApiKey } : {}),
    sortCriteria: sortPolicy(S),
    deduplicator: (function(){ const isFree=S.service==='p2p'||S.service==='http'; return { enabled:true, excludeAddons:[], multiGroupBehaviour: S.matchMode === 'relaxed' ? 'conservative' : 'aggressive', keys:isFree?['filename','infoHash','smartDetect']:['filename','infoHash','smartDetect'], cached: isFree ? 'disabled' : (S.matchMode === 'relaxed' ? 'per_service' : 'single_result'), uncached: isFree ? 'disabled' : 'per_service', p2p:'per_addon', smartDetectAttributes:['size','resolution','quality','visualTags','audioTags','audioChannels','languages','encode','edition','network','remastered','bitrate','releaseGroup'], smartDetectRounding: S.matchMode === 'strict' ? 5 : 10, libraryBehaviour: isFree ? 'ignore' : 'prefer', tiebreakers:[{type:'torrent_seeders',position:'before_addon'},{type:'usenet_age',position:'before_addon'}], ...(S.dedupMerge ? { merge: { enabled: true, failoverVariants: true, fields: [] } } : {}) }; })(),
    formatter: (function(){ const _f = S.formatter === 'custom' && S.customFormatter ? S.customFormatter : FORMATTERS.find(f => f.id === (S.formatter||'family-v4')) || FORMATTERS[0]; return { id:'tamtaro', definitions:{ overrides:{ tamtaro:{ name: _f.name, description: _f.d } } } }; })(),
    proxy: { id:'mediaflow', proxiedAddons:[], proxiedServices: S.proxyEnabled ? (S.proxiedServices.length ? [...S.proxiedServices] : []) : [] },
    resultLimits: { global: rc.maxResults, resolution: rc.maxResultsPerResolution, mode: 'conjunctive' },
    size: sizePolicy(input),
    bitrate: bitratePolicy(input, hasTmdb),
    hideErrors: true, hideErrorsForResources: ['addon_catalog','catalog','subtitles'],
    digitalReleaseFilter: { enabled:hasTmdb, tolerance:7, requestTypes:['movie','series','anime'], addons:[] },
    autoPlay: { enabled:true, method:S.autoPlayMethod||'matchingFile', attributes:['resolution','quality','audioTags'] },
    precacheNextEpisode: true,
    precacheSelector: "count(cached(streams)) == 0 ? slice(uncached(type(streams, 'debrid', 'usenet')), 0, 1) : []",
    precacheSingleStream: true,
    preloadStreams: { enabled:S.preloadEnabled!==false, selector:"slice(perGroup(cached(streams), 'resolution', 2), 0, 4)", singleStream:true },
    cacheAndPlay: { enabled:true, streamTypes:['usenet','torrent'] },
    nzbFailover: S.nzbFailover ? { enabled:true, position:S.nzbFailoverPosition==='before-torrents'?'first':'last', maxFailoverNzbs:Number(S.maxFailoverNzbs)||3 } : { enabled:false },
    areYouStillThere: { enabled:false },
    checkOwned: false, externalDownloads: false, autoRemoveDownloads: false,
    presets: activePresets, services: services(),
  };

  const cfg = {
    trusted: false, showChanges: true,
    addonName: name, addonLogo: 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/core_icon.svg', addonDescription: name,
    ...standaloneOnly,
    excludedResolutions: rc.excludedResolutions, includedResolutions: rc.includedResolutions, requiredResolutions: rc.requiredResolutions, preferredResolutions: rc.preferredResolutions,
    excludedQualities: [], includedQualities: [], requiredQualities: [],
    excludedEncodes: ec.excludedEncodes, preferredEncodes: ec.preferredEncodes,
    excludedAudioTags: ac.excludedAudioTags, preferredAudioChannels: ac.preferredAudioChannels, preferredVisualTags: visualTags(),
    enableSeadex: S.content !== 'live', seadexBestOnly: S.content === 'anime',
    excludeCached: (S.service!=='p2p'&&S.service!=='http') && S.cacheMode === 'uncached', excludeCachedFromAddons: [], excludeCachedFromServices: [], excludeCachedFromStreamTypes: [],
    excludeUncached: (S.service!=='p2p'&&S.service!=='http') && S.cacheMode === 'cached', excludeUncachedFromAddons: [], excludeUncachedFromServices: [], excludeUncachedFromStreamTypes: [],
    excludeUncachedMode: 'or', excludedStreamSources: ['YouTube','AI Enhanced'],
    ...(S.service==='p2p' ? { minSeeders:1 } : {}),
    preferredRegexPatterns: (S.service==='p2p'||S.service==='http') ? [] : ((S.resolution==='4k'||S.resolution==='ultrawide'||S.resolution==='mixed'||S.pseArch==='apex-mixed') ? PREFERRED_REGEX_4K : PREFERRED_REGEX_1080P),
    maxResults: rc.maxResults, maxResultsPerResolution: rc.maxResultsPerResolution,
    excludedStreamExpressions: eses(),
    includedStreamExpressions: [
      { enabled:true, expression:"/* Protect Library & SeaDex */ passthrough(merge(library(streams), seadex(streams)), 'excluded')" },
      { enabled:true, expression:"/* Smart Play Pin */ pin(message(streams, 'includes', '🎯'), 'top')" },
      { enabled:true, expression:"/*Library*/ count(streams)==count(library(streams)) ? library(streams) : []" },
      ...(hasTmdb ? [{ enabled:true, expression:"/*digitalRelease Bypass*/ queryType=='movie' or queryType=='anime.movie' ? (count(passthrough(quality(streams,'CAM','TS','TC','SCR','WEBRip'),'digitalRelease'))>15 ? passthrough(quality(streams,'CAM','TS','TC','SCR','WEBRip'),'digitalRelease') : passthrough(streams,'digitalRelease')) : []" }] : []),
      { enabled:true, expression:"/*0Cached*/ count(merge(cached(streams),type(streams,'p2p','http','usenet','stremio-usenet')))==0 ? passthrough(streams,'title') : []" },
      { enabled:true, expression:"/*REPACK/PROPER Passthrough*/ count(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'))>0 ? passthrough(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'),'excluded','limit') : []" },
      ...(S.langExclusive && S.langs && S.langs.length ? [{
        enabled: true,
        expression: `/* Language Exclusive — only ${(S.langs||['English']).join('/')} */ language(streams,${[...new Set([...(S.langs||['English']),'Original','Multi','Dual Audio','Dubbed','Unknown'])].map(l=>`'${l}'`).join(',')})`
      }] : [])
    ],
    preferredStreamExpressions: pses(),
    dynamicAddonFetching: (function(){ const pool=S.streamPool||'normal', timeout=pool==='max'?10000:pool==='large'?8000:6000, isFree=S.service==='p2p'||S.service==='http', wrap=expr=>isFree?expr:`cached(${expr})`;
      if(S.resolution==='4k'){ const c4k=pool==='max'?25:pool==='large'?15:8; return{enabled:true,condition:`count(${wrap("resolution(totalStreams,'2160p')")})>=${c4k} or totalTimeTaken>${timeout}`}; }
      if(S.resolution==='ultrawide'){ return{enabled:true,condition:`count(${wrap("resolution(totalStreams,'1080p')")})>=15 or count(${wrap("resolution(totalStreams,'2160p')")})>=5 or totalTimeTaken>${timeout}`}; }
      if(S.resolution==='mixed'||S.pseArch==='apex-mixed'){ const c1m=pool==='max'?35:pool==='large'?22:12, c4m=pool==='max'?20:pool==='large'?12:6; return{enabled:true,condition:`count(${wrap("resolution(totalStreams,'1080p')")})>=${c1m} or count(${wrap("resolution(totalStreams,'2160p')")})>=${c4m} or totalTimeTaken>${timeout}`}; }
      const c1k=pool==='max'?45:pool==='large'?30:20; return{enabled:true,condition:`count(${wrap("resolution(totalStreams,'1080p')")})>=${c1k} or totalTimeTaken>${timeout}`}; })(),
    titleMatching: { enabled:hasTmdb, mode:'contains', similarityThreshold:0.75, requestTypes:[], addons:[] },
    yearMatching: { enabled:hasTmdb, strict:false, useInitialAirDate:true, tolerance:2, requestTypes:[], addons:[] },
    seasonEpisodeMatching: { enabled:true, strict:false, requestTypes:[], addons:[] },
    groups: (function(){
      const pool=S.streamPool||'normal', timeout=pool==='max'?10000:pool==='large'?8000:6000;
      const isFree=S.service==='p2p'||S.service==='http';
      const threshold=isFree?5:(S.resolution==='4k'?4:S.resolution==='ultrawide'?12:8);
      const wrap=isFree?'totalStreams':'cached(totalStreams)';
      const skip=new Set(['Library','AIOSubtitle','OpenSubtitles','AIOStreams']);
      const active=activePresets.filter(p=>p.enabled!==false&&p.instanceId&&!skip.has(p.options?.name||''));
      const ids=active.map(p=>p.instanceId);
      if(ids.length<2) return {enabled:false,groupings:[]};
      const mid=Math.ceil(ids.length/2);
      const g1=ids.slice(0,mid), g2=ids.slice(mid);
      const groupings=[{name:'Primary',addons:g1,condition:'true'}];
      if(g2.length) groupings.push({name:'Secondary',addons:g2,condition:`count(${wrap})<${threshold} and totalTimeTaken<${timeout}`});
      return {enabled:true,behaviour:'sequential',groupings};
    })(),
  };

  const result = {
    metadata: { id: 'core-custom-' + sid(), name, description: `Custom template generated by Core Builds Configurator.`, source: 'external', author:'Branding-Brevity', version: '0.1.0', category: (S.service==='p2p'?'P2P':S.service==='http'?'HTTP':'Debrid'), serviceRequired: false, setToSaveInstallMenu: true, sourceUrl: 'https://github.com/brevityA/Core-Builds', changelogUrl: 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/CHANGELOG.md' },
    config: cfg
  };

  if (useBase) {
    result.parentConfig = {
      uuid: S.baseUuid.trim(),
      password: S.basePassword || '',
      mergeStrategies: {
        presets: 'extend',
        services: 'inherit',
        filters: 'override',
        sorting: 'inherit',
        formatter: 'inherit',
        branding: 'override',
        proxy: 'inherit',
        metadata: 'inherit',
        misc: 'inherit'
      }
    };
  }

  return result;
}

let _cachedBuildResult = null;
function parseAddonFetchError(msg) {
  if (!msg) return null;
  const m = /Failed to fetch manifest for\s*([^:]+?)\s*:\s*(.+)$/i.exec(String(msg).trim());
  return m ? { name: m[1].trim(), reason: m[2].trim() } : null;
}
function normAddonName(n) { return String(n || '').replace(/\s+(TB|AD|RD|STORE)\s*$/i, '').trim().toLowerCase(); }
function presetMatchesAddon(p, name) {
  const n = normAddonName(name); if (!n) return false;
  const cands = [p && p.options && p.options.name, p && p.type, p && p.instanceId].map(normAddonName).filter(Boolean);
  return cands.some(c => c === n || c.includes(n) || n.includes(c));
}
function renderAddonFetchFallback(name, reason, safeMsg) {
  const k = escH(_lastAddonKey || name || 'the addon');
  const safeName = escH(name);
  const safeTarget = escH(_lastInstall.target || '');
  return `<div style="margin-top:10px;padding:12px 14px;border-radius:10px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.25)">`+
    `<div style="font-size:.82rem;font-weight:700;color:#fbbf24;margin-bottom:6px">${ICO.warn(14,'#fbbf24')} Your config is valid — one addon couldn't be reached</div>`+
    `<div style="font-size:.76rem;color:#8b949e;line-height:1.5;margin-bottom:8px">AIOStreams couldn't fetch the manifest for <strong style="color:#fbbf24">${safeName}</strong> — its backend is likely <strong>temporarily down</strong> (not a problem with your config). Save without it and re-add it later from AIOStreams → Addons when it's back.</div>`+
    `<code style="font-size:.7rem;background:rgba(0,0,0,.3);padding:4px 8px;border-radius:4px;display:block;margin-bottom:8px;word-break:break-word;color:#f59e0b">${safeMsg}</code>`+
    `<div style="display:flex;gap:8px;flex-wrap:wrap">`+
    `<button data-action="save-without-addon" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.12);color:#fbbf24;font-size:.78rem;font-weight:700;cursor:pointer">Save without ${k}</button>`+
    `<button data-action="simple-install" data-target="${safeTarget}" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(0,212,255,.3);background:rgba(0,212,255,.06);color:#00d4ff;font-size:.78rem;font-weight:700;cursor:pointer">Retry</button>`+
    `<button data-action="generate-dl" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#9ca3af;font-size:.78rem;font-weight:700;cursor:pointer">Export JSON</button>`+
    `</div></div>`;
}
function renderConfigRejectedDispatch(safeMsg, apiDetail) {
  try { const snap={}; SHARE_KEYS.forEach(k=>{snap[k]=S[k];}); const safeSnap = sanitizeSnapshotForStorage(snap); safeSnap._ver=CONFIGURATOR_VERSION; safeSnap._ts=Date.now(); safeSnap._reason='soft-fail-recovery'; const list=JSON.parse(localStorage.getItem('coreBuildBackups')||'[]'); list.unshift(safeSnap); localStorage.setItem('coreBuildBackups',JSON.stringify(list.slice(0,10))); } catch(e) {}
  const sim = (typeof _simulateAddonFail !== 'undefined' && _simulateAddonFail) ? parseAddonFetchError('Failed to fetch manifest for ' + _simulateAddonFail) : null;
  const afe = sim || parseAddonFetchError(apiDetail);
  if (afe) {
    const built = (typeof _cachedBuildResult !== 'undefined' && _cachedBuildResult && _cachedBuildResult.config && _cachedBuildResult.config.presets) || [];
    const mp = built.find(p => presetMatchesAddon(p, afe.name));
    _lastAddonKey = mp ? (mp.options && mp.options.name) || mp.type || afe.name : afe.name;
    return renderAddonFetchFallback(afe.name, afe.reason, safeMsg);
  }
  return `<div style="margin-top:10px;padding:12px 14px;border-radius:10px;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.2)"><div style="font-size:.82rem;font-weight:700;color:#f87171;margin-bottom:6px">${ICO.warn(14,'#f87171')} Config rejected by AIOStreams</div><div style="font-size:.76rem;color:#8b949e;line-height:1.5;margin-bottom:8px"><code style="font-size:.72rem;background:rgba(0,0,0,.3);padding:4px 8px;border-radius:4px;display:block;margin-top:4px;word-break:break-word;color:#f87171">${safeMsg}</code></div><div style="display:flex;gap:8px"><button data-action="simple-install" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(0,212,255,.3);background:rgba(0,212,255,.06);color:#00d4ff;font-size:.8rem;font-weight:700;cursor:pointer">Retry</button><button data-action="generate-dl" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#9ca3af;font-size:.8rem;font-weight:700;cursor:pointer">Export JSON</button></div></div>`;
}

function buildFinal() {
  try {
    const tpl = build();
    const assembled = assembleTemplate(tpl, {
      metadata: { coreBuildsVersion: TEMPLATE_VERSION, generatedAt: new Date().toISOString() },
      disabledAddons: _disabledAddons,
      presetMatchesAddon,
      migrationKeep: S._migrationKeep,
    });
    const result = applyOutputProfile(assembled, activeOutputProfile(), outputProfileContext());
    _cachedBuildResult = result;
    return result;
  } catch (err) {
    logError('build', err.message, { service: S.service, device: S.device, resolution: S.resolution, stack: err.stack?.slice(0, 300) });
    throw err;
  }
}

const PARTIAL_EXPORT_FIELDS = {
  formatter: ['formatter'],
  sorting: ['sortCriteria','deduplicator','resultLimits'],
  services: ['services','presets','groups'],
  device: ['excludedResolutions','includedResolutions','requiredResolutions','preferredResolutions','excludedEncodes','preferredEncodes','excludedAudioTags','preferredAudioTags','preferredAudioChannels','preferredVisualTags','size','bitrate'],
  filtering: ['excludedLanguages','includedLanguages','requiredLanguages','preferredLanguages','excludedQualities','includedQualities','requiredQualities','preferredQualities','excludedVisualTags','includedVisualTags','requiredVisualTags','excludedStreamExpressions','includedStreamExpressions','requiredStreamExpressions','preferredStreamExpressions','rankedStreamExpressions','excludedRegexPatterns','rankedRegexPatterns','preferredRegexPatterns','syncedExcludedRegexUrls','syncedRankedRegexUrls','titleMatching','yearMatching','seasonEpisodeMatching','digitalReleaseFilter'],
};

function downloadJsonFile(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function exportPartial(kind) {
  const fields = PARTIAL_EXPORT_FIELDS[kind];
  if (!fields) { showToast('Unknown partial export', true); return; }
  const full = buildFinal().config, config = {};
  for (const field of fields) if (field in full) config[field] = structuredClone(full[field]);
  if (Array.isArray(config.services)) config.services = config.services.map(service => ({...service, credentials:{}}));
  const payload = {
    metadata: { id:`core-partial-${kind}-${sid()}`, name:`Core Builds — ${kind} only`, description:`Partial Core Builds export containing ${kind} settings only.`, author:'Branding-Brevity', version:'1.0.0', category:'Utility', source:'external' },
    config,
  };
  downloadJsonFile(payload, `core-builds-${kind}-only.json`);
  showToast(`${kind[0].toUpperCase()+kind.slice(1)} partial export downloaded`);
}

function generate() {
  if (!S.service) { showToast('No service selected — go back and pick your debrid service first', true); return; }
  const tpl = buildFinal();
  const json = JSON.stringify(tpl, null, 2), blob = new Blob([json], {type:'application/json'}), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = (S.name.trim()||defaultName()).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 100);
  saveLastGen();
  if (USAGE_BEACON_URL && S.telemetryOk && navigator.sendBeacon) {
    try { navigator.sendBeacon(USAGE_BEACON_URL, JSON.stringify({ v: CONFIGURATOR_VERSION, service: S.service, device: S.device, resolution: S.resolution })); } catch(e) {}
  }
  if (COUNTER_URL && navigator.sendBeacon) {
    try { navigator.sendBeacon(COUNTER_URL + '/api/generate', JSON.stringify({ v: CONFIGURATOR_VERSION, service: S.service, device: S.device, resolution: S.resolution })); } catch(e) {}
  }
  const dlBtn = document.querySelector('.btn-dl');
  if (dlBtn) {
    const orig = dlBtn.innerHTML;
    dlBtn.innerHTML = ICO.check(14,'currentColor') + ' Downloaded!';
    dlBtn.style.background = 'linear-gradient(135deg,#065f46,#059669)';
    setTimeout(() => { dlBtn.innerHTML = orig; dlBtn.style.background = ''; }, 2200);
  }
}

const CMP_TEMPLATES = [{"n":"Core Nexus 4K AllDebrid Lite","v":"0.2.5","c":"AllDebrid","r":"4K","p":15,"e":15,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":8,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus 4K AllDebrid","v":"0.4.5","c":"AllDebrid","r":"4K","p":20,"e":28,"i":7,"iq":true,"pw":true,"tw":false,"sk":16,"sc":9,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus AllDebrid Lite","v":"0.2.5","c":"AllDebrid","r":"1080p","p":10,"e":28,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":8,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus AllDebrid","v":"0.2.5","c":"AllDebrid","r":"1080p","p":10,"e":28,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":9,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Anime 4K Lite","v":"2.8.11","c":"Anime","r":"4K","p":14,"e":13,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":10,"sn":["zilean","seadex","meteor","comet","mediafusion","animetosho"],"sv":["torbox"],"rr":0,"er":0,"pr":0,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":false},{"n":"Core Nexus Anime 4K","v":"2.8.13","c":"Anime","r":"4K","p":14,"e":26,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":12,"sn":["zilean","seadex","meteor","comet","mediafusion","hdhub"],"sv":["torbox"],"rr":0,"er":0,"pr":0,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":false},{"n":"Core Nexus Anime Dub Lite","v":"2.8.11","c":"Anime","r":"1080p","p":14,"e":13,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":10,"sn":["zilean","seadex","meteor","comet","mediafusion","animetosho"],"sv":["torbox"],"rr":0,"er":0,"pr":0,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":false},{"n":"Core Nexus Anime Dub","v":"2.8.13","c":"Anime","r":"1080p","p":14,"e":26,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":12,"sn":["zilean","seadex","meteor","comet","mediafusion","hdhub"],"sv":["torbox"],"rr":0,"er":0,"pr":0,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":false},{"n":"Core Nexus Anime Lite","v":"2.8.11","c":"Anime","r":"1080p","p":12,"e":13,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":10,"sn":["zilean","seadex","meteor","comet","mediafusion","animetosho"],"sv":["torbox"],"rr":0,"er":0,"pr":0,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":false},{"n":"Core Nexus Anime","v":"2.8.13","c":"Anime","r":"1080p","p":12,"e":26,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":12,"sn":["zilean","seadex","meteor","comet","mediafusion","hdhub"],"sv":["torbox"],"rr":0,"er":0,"pr":0,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":false},{"n":"Core Nexus Samsung RU7100 4K","v":"0.3.5","c":"Device","r":"4K","p":17,"e":29,"i":6,"iq":true,"pw":true,"tw":false,"sk":16,"sc":10,"sn":["zilean","meteor","comet","mediafusion","newznab","eztv"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1","VC-1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Samsung TV 4K","v":"0.3.5","c":"Device","r":"4K","p":10,"e":27,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":9,"sn":["zilean","meteor","comet","mediafusion","eztv","knaben"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1","VC-1"],"df":true,"tb":false,"cm":"mixed","sx":true},{"n":"Core Nexus Samsung TV","v":"0.3.5","c":"Device","r":"1080p","p":10,"e":27,"i":7,"iq":false,"pw":false,"tw":false,"sk":16,"sc":9,"sn":["zilean","meteor","comet","mediafusion","eztv","knaben"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1","VC-1"],"df":true,"tb":false,"cm":"mixed","sx":true},{"n":"Core Nexus Ultrawide","v":"0.2.5","c":"Device","r":"1080p","p":14,"e":28,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":9,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":107,"er":8,"pr":5,"ea":[],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus 4K Essential Lite","v":"2.10.5","c":"Essential","r":"4K","p":15,"e":16,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":8,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus 4K Essential","v":"2.12.5","c":"Essential","r":"4K","p":20,"e":29,"i":6,"iq":true,"pw":true,"tw":false,"sk":16,"sc":9,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Essential Lite","v":"2.10.5","c":"Essential","r":"1080p","p":10,"e":17,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":8,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Essential","v":"2.10.5","c":"Essential","r":"1080p","p":10,"e":29,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":9,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Flash 4K","v":"2.10.5","c":"Flash","r":"4K","p":16,"e":29,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":5,"sn":["zilean","comet","meteor","knaben","aiosubtitle"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Flash","v":"2.10.5","c":"Flash","r":"1080p","p":11,"e":30,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":4,"sn":["zilean","comet","meteor","knaben"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus 4K Hybrid","v":"2.12.6","c":"Hybrid","r":"4K","p":24,"e":29,"i":6,"iq":true,"pw":true,"tw":true,"sk":17,"sc":10,"sn":["zilean","meteor","comet","mediafusion","eztv","newznab"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Hybrid Lite","v":"2.10.6","c":"Hybrid","r":"1080p","p":12,"e":17,"i":6,"iq":false,"pw":false,"tw":true,"sk":17,"sc":9,"sn":["zilean","meteor","comet","mediafusion","eztv","newznab"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Hybrid","v":"2.10.6","c":"Hybrid","r":"1080p","p":12,"e":29,"i":6,"iq":true,"pw":true,"tw":true,"sk":17,"sc":10,"sn":["zilean","meteor","comet","mediafusion","eztv","newznab"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus 4K Apex (TorBox)","v":"2.12.5","c":"Single","r":"4K","p":20,"e":29,"i":6,"iq":false,"pw":true,"tw":false,"sk":16,"sc":4,"sn":["zilean","newznab","torrents-db","aiosubtitle"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus 4K Apex","v":"0.7.6","c":"Single","r":"4K","p":20,"e":29,"i":6,"iq":true,"pw":true,"tw":false,"sk":16,"sc":10,"sn":["zilean","meteor","comet","mediafusion","eztv","newznab"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Stream Firestick Lite","v":"2.10.5","c":"Single","r":"1080p","p":10,"e":17,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":8,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Stream Firestick","v":"2.10.5","c":"Single","r":"1080p","p":10,"e":29,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":9,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Stream Lite","v":"2.10.5","c":"Single","r":"1080p","p":10,"e":17,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":8,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Stream","v":"2.10.5","c":"Single","r":"1080p","p":10,"e":29,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":9,"sn":["zilean","meteor","comet","mediafusion","eztv","torrent-galaxy"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Speed 4K+","v":"2.10.6","c":"Speed","r":"4K","p":15,"e":28,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":6,"sn":["zilean","easynews","comet","meteor","knaben","aiosubtitle"],"sv":["torbox","easynews"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Speed EasyNews","v":"2.10.6","c":"Speed","r":"1080p","p":10,"e":29,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":3,"sn":["zilean","easynews","meteor"],"sv":["easynews"],"rr":103,"er":8,"pr":5,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Speed 4K Lite","v":"2.10.5","c":"Speed","r":"4K","p":16,"e":19,"i":6,"iq":true,"pw":true,"tw":false,"sk":16,"sc":2,"sn":["zilean","aiosubtitle"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Speed 4K","v":"2.10.5","c":"Speed","r":"4K","p":16,"e":31,"i":6,"iq":true,"pw":true,"tw":false,"sk":16,"sc":2,"sn":["zilean","aiosubtitle"],"sv":["torbox"],"rr":107,"er":8,"pr":7,"ea":[],"ee":[],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Speed Lite","v":"2.10.5","c":"Speed","r":"1080p","p":10,"e":17,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":2,"sn":["zilean","aiosubtitle"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true},{"n":"Core Nexus Speed","v":"2.10.5","c":"Speed","r":"1080p","p":10,"e":29,"i":6,"iq":false,"pw":false,"tw":false,"sk":16,"sc":2,"sn":["zilean","aiosubtitle"],"sv":["torbox"],"rr":103,"er":8,"pr":5,"ea":["TrueHD","DTS-HD MA","DTS:X","FLAC"],"ee":["AV1"],"df":true,"tb":true,"cm":"mixed","sx":true}];

function showChangelog() {
  const ex = document.getElementById('changelogModal');
  if (ex) ex.remove();
  const _lt = document.documentElement.getAttribute('data-theme')==='light';
  const _bg = _lt ? '#ffffff' : '#0d1117';
  const _card = _lt ? '#f6f8fa' : '#161b22';
  const _bdr = _lt ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.06)';
  const _txt = _lt ? '#1f2328' : '#e6edf3';
  const _sub = _lt ? '#656d76' : '#8b949e';
  const _dim = _lt ? '#8b949e' : '#4b5563';
  const _acc = '#00d4ff';
  const _accBg = _lt ? 'rgba(0,133,204,.1)' : 'rgba(0,212,255,.1)';
  const _accBdr = _lt ? 'rgba(0,133,204,.3)' : 'rgba(0,212,255,.4)';
  const entries = CHANGELOG.map((e, i) => `
    <div style="padding:18px 20px;border-bottom:1px solid ${_bdr}${i===0?';background:'+_accBg:''}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
        <span style="font-size:.7rem;font-weight:800;color:${_acc};background:${_accBg};border:1px solid ${_accBdr};border-radius:4px;padding:2px 8px;letter-spacing:.04em">v${e.v}</span>
        <span style="font-size:.68rem;color:${_dim}">${e.date}</span>
        ${i===0?'<span style="font-size:.6rem;font-weight:700;color:#10b981;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);border-radius:4px;padding:1px 6px;letter-spacing:.04em;text-transform:uppercase">Latest</span>':''}
      </div>
      <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">
        ${e.items.map(it => `<li style="font-size:.76rem;color:${i===0?_txt:_sub};line-height:1.5">${it}</li>`).join('')}
      </ul>
    </div>`).join('');
  const overlay = document.createElement('div');
  overlay.id = 'changelogModal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);animation:fadeIn .15s ease';
  overlay.innerHTML = `
    <div style="background:${_bg};border-radius:14px;border:1px solid ${_bdr};width:min(560px,92vw);max-height:82vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4);animation:scaleIn .2s ease">
      <div style="display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid ${_bdr};flex-shrink:0">
        <span style="font-size:1rem">${ICO.newspaper(20,_acc)}</span>
        <div style="flex:1">
          <div style="font-weight:800;font-size:.95rem;color:${_txt}">Changelog</div>
          <div style="font-size:.68rem;color:${_dim}">${CHANGELOG.length} releases</div>
        </div>
        <a href="https://github.com/brevityA/Core-Builds/blob/main/Guides/CHANGELOG.md" target="_blank" rel="noopener noreferrer" style="font-size:.68rem;font-weight:600;color:${_acc};text-decoration:none;margin-right:8px">Full history</a>
        <button data-action="close-changelog" style="background:rgba(255,255,255,.05);border:1px solid ${_bdr};border-radius:6px;color:${_sub};font-size:.85rem;padding:4px 10px;cursor:pointer;line-height:1">✕</button>
      </div>
      <div style="overflow-y:auto;flex:1">${entries}</div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('[data-action="close-changelog"]').addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

function showCompareTemplates() {
  const ex = document.getElementById('cmpModal');
  if (ex) ex.remove();
  const overlay = document.createElement('div');
  overlay.id = 'cmpModal';
  overlay.className = 'modal-overlay cmp-modal';

  const cats = [...new Set(CMP_TEMPLATES.map(t => t.c))];
  const optHtml = cats.map(c => {
    const items = CMP_TEMPLATES.filter(t => t.c === c);
    return `<optgroup label="${c}">${items.map((t,i) => {
      const idx = CMP_TEMPLATES.indexOf(t);
      return `<option value="${idx}">${t.n} (v${t.v})</option>`;
    }).join('')}</optgroup>`;
  }).join('');

  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="Compare Templates">
      <button class="modal-close" id="cmpClose" aria-label="Close">×</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <div style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.1)">${ICO.compare(20,'#00d4ff')}</div>
        <div>
          <div class="modal-title" style="text-align:left;margin-bottom:1px">Compare Templates</div>
          <div style="font-size:.72rem;color:#6b7280">Side-by-side feature comparison</div>
        </div>
      </div>
      <div class="cmp-cols">
        <div class="cmp-pick">
          <label>Template A</label>
          <select id="cmpSelA">${optHtml}</select>
        </div>
        <div class="cmp-pick">
          <label>Template B</label>
          <select id="cmpSelB">${optHtml}</select>
        </div>
      </div>
      <div id="cmpBody" class="cmp-empty">Select two different templates to compare</div>
    </div>`;
  document.body.appendChild(overlay);

  const selA = document.getElementById('cmpSelA');
  const selB = document.getElementById('cmpSelB');
  const body = document.getElementById('cmpBody');

  selB.selectedIndex = Math.min(1, CMP_TEMPLATES.length - 1);

  function yn(v) { return v ? '<span class="cmp-badge yes">Yes</span>' : '<span class="cmp-badge no">No</span>'; }
  function diffCls(a, b) { return a !== b ? ' diff' : ''; }
  function numCls(a, b, higherBetter) {
    if (a === b) return '';
    return higherBetter ? (a > b ? ' good' : ' bad') : '';
  }

  function updateComparison() {
    const ai = parseInt(selA.value), bi = parseInt(selB.value);
    if (ai === bi) { body.className = 'cmp-empty'; body.innerHTML = 'Select two different templates to compare'; return; }
    const a = CMP_TEMPLATES[ai], b = CMP_TEMPLATES[bi];

    const rows = [
      { hdr: 'Overview' },
      { l: 'Version',     a: `v${a.v}`,    b: `v${b.v}` },
      { l: 'Category',    a: a.c,           b: b.c,          d: a.c !== b.c },
      { l: 'Resolution',  a: a.r,           b: b.r,          d: a.r !== b.r },
      { l: 'Cache Mode',  a: a.cm === 'mixed' ? 'Mixed' : a.cm === 'cached' ? 'Cached Only' : 'Uncached Only',
                           b: b.cm === 'mixed' ? 'Mixed' : b.cm === 'cached' ? 'Cached Only' : 'Uncached Only', d: a.cm !== b.cm },
      { hdr: 'Filtering & Sorting' },
      { l: 'PSEs',        a: String(a.p),   b: String(b.p),  d: a.p !== b.p },
      { l: 'ESEs',        a: String(a.e),   b: String(b.e),  d: a.e !== b.e },
      { l: 'ISEs',        a: String(a.i),   b: String(b.i),  d: a.i !== b.i },
      { l: 'IQR Tukey',   a: yn(a.iq),      b: yn(b.iq),     raw: true },
      { l: 'Linear Decay', a: yn(a.pw),      b: yn(b.pw),     raw: true },
      { l: 'Svc Twins',   a: yn(a.tw),      b: yn(b.tw),     raw: true },
      { l: 'Sort Keys',   a: String(a.sk),  b: String(b.sk),  d: a.sk !== b.sk },
      { l: 'SeaDex',      a: yn(a.sx),      b: yn(b.sx),     raw: true },
      { hdr: 'Regex & Scoring' },
      { l: 'Ranked',      a: String(a.rr),  b: String(b.rr),  d: a.rr !== b.rr },
      { l: 'Excluded',    a: String(a.er),  b: String(b.er),  d: a.er !== b.er },
      { l: 'Preferred',   a: String(a.pr),  b: String(b.pr),  d: a.pr !== b.pr },
      { hdr: 'Scrapers & Services' },
      { l: 'Scrapers',    a: String(a.sc),  b: String(b.sc),  d: a.sc !== b.sc },
      { l: 'Top Sources', a: a.sn.slice(0,4).join(', '), b: b.sn.slice(0,4).join(', '), d: a.sn.join() !== b.sn.join() },
      { l: 'Services',    a: a.sv.join(', ') || 'none', b: b.sv.join(', ') || 'none', d: a.sv.join() !== b.sv.join() },
      { l: 'Tiebreakers', a: yn(a.tb),      b: yn(b.tb),     raw: true },
      { hdr: 'Audio & Codec' },
      { l: 'Excl. Audio', a: a.ea.length ? a.ea.join(', ') : 'None', b: b.ea.length ? b.ea.join(', ') : 'None', d: a.ea.join() !== b.ea.join() },
      { l: 'Excl. Codec', a: a.ee.length ? a.ee.join(', ') : 'None', b: b.ee.length ? b.ee.join(', ') : 'None', d: a.ee.join() !== b.ee.join() },
    ];

    body.className = 'cmp-body';
    body.innerHTML = rows.map(r => {
      if (r.hdr) return `<div class="cmp-row cmp-row-hdr"><div class="cmp-label" style="grid-column:1/-1">${r.hdr}</div></div>`;
      const ac = r.raw ? '' : (r.d ? ' diff' : '');
      const bc = r.raw ? '' : (r.d ? ' diff' : '');
      return `<div class="cmp-row"><div class="cmp-label">${r.l}</div><div class="cmp-val${ac}">${r.a}</div><div class="cmp-val${bc}">${r.b}</div></div>`;
    }).join('');
  }

  selA.addEventListener('change', updateComparison);
  selB.addEventListener('change', updateComparison);
  updateComparison();

  document.getElementById('cmpClose').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function showFormatterImport() {
  const ex = document.getElementById('fmtImportModal');
  if (ex) ex.remove();
  const overlay = document.createElement('div');
  overlay.id = 'fmtImportModal';
  overlay.className = 'modal-overlay above-drawer';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="Import Formatter" style="max-width:420px">
      <button class="modal-close" id="fmtImClose" aria-label="Close">×</button>
      <div class="modal-title" style="font-size:1.05rem">Import Custom Formatter</div>
      <div class="modal-sub" style="margin-bottom:12px">Paste a formatter JSON with <code style="background:rgba(255,255,255,.08);padding:1px 5px;border-radius:4px;font-size:.78rem">name</code> and <code style="background:rgba(255,255,255,.08);padding:1px 5px;border-radius:4px;font-size:.78rem">description</code> fields, or load a .json file.</div>
      <textarea id="fmtImInput" rows="6" placeholder='{"name": "...", "description": "..."}' style="width:100%;box-sizing:border-box;background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#e6edf3;font-family:monospace;font-size:.78rem;resize:vertical;outline:none"></textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <label style="flex:1;padding:9px;border-radius:8px;border:1.5px dashed rgba(167,139,250,.3);background:transparent;color:#a78bfa;font-size:.8rem;font-weight:600;cursor:pointer;text-align:center;transition:all .15s">
          ${ICO.folder(14,'#a78bfa')} Load File
          <input type="file" accept=".json,application/json" id="fmtImFile" style="display:none">
        </label>
        <button id="fmtImApply" style="flex:2;padding:9px;border-radius:8px;border:1.5px solid rgba(0,212,255,.4);background:rgba(0,212,255,.08);color:#00d4ff;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .15s">Apply Formatter</button>
      </div>
      <div id="fmtImErr" style="margin-top:8px;font-size:.76rem;color:#ef4444;display:none"></div>
    </div>`;
  document.body.appendChild(overlay);

  const textarea = document.getElementById('fmtImInput');
  const errEl = document.getElementById('fmtImErr');

  function parseAndApply(raw) {
    errEl.style.display = 'none';
    try {
      const obj = JSON.parse(raw);
      if (!obj.name || typeof obj.name !== 'string') { errEl.textContent = 'Missing or invalid "name" field'; errEl.style.display = ''; return; }
      if (!obj.description || typeof obj.description !== 'string') { errEl.textContent = 'Missing or invalid "description" field'; errEl.style.display = ''; return; }
      S.customFormatter = { name: obj.name, d: obj.description, label: obj._label || obj.label || 'Custom' };
      S.formatter = 'custom';
      saveState();
      overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s';
      setTimeout(() => { overlay.remove(); render(); showToast('Custom formatter imported'); }, 160);
    } catch(e) { errEl.textContent = 'Invalid JSON: ' + e.message; errEl.style.display = ''; }
  }

  document.getElementById('fmtImApply').addEventListener('click', () => parseAndApply(textarea.value));
  document.getElementById('fmtImFile').addEventListener('change', function() {
    if (!this.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => { textarea.value = reader.result; parseAndApply(reader.result); };
    reader.readAsText(this.files[0]);
  });
  document.getElementById('fmtImClose').addEventListener('click', () => {
    overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s';
    setTimeout(() => overlay.remove(), 160);
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s'; setTimeout(() => overlay.remove(), 160); } });
}

function parseTemplateToState(tpl) {
  const c = tpl.config || tpl;
  const st = {
    service: null, device: null, resolution: null, audio: 'limited', content: null,
    name: '', multiServices: [], sizeLimit: 'unlimited', formatter: 'family-v4',
    p2pEnabled: false, qualityFirst: false, resolutionFirst: false, foreignLangKill: true, matchMode: 'balanced',
    exclude4K: false, excludeDV: false, langs: ['English'], langExclusive: false,
    cacheMode: 'mixed', streamPool: 'normal', simpleMode: false, outputProfile: 'auto', aiostreamsVersion: '2.32.0'
  };
  if (OUTPUT_PROFILES.includes(tpl?.metadata?.coreBuildsProfile)) st.outputProfile = tpl.metadata.coreBuildsProfile;
  if (AIOSTREAMS_COMPATIBILITY_TARGETS.includes(tpl?.metadata?.coreBuildsAIOStreamsTarget)) st.aiostreamsVersion = tpl.metadata.coreBuildsAIOStreamsTarget;

  const presets = c.presets || [];
  const enabledPresets = presets.filter(p => p.enabled);
  const presetTypes = new Set(enabledPresets.map(p => p.type));

  // Service detection: use presets + services together for accuracy
  const svcs = (c.services || []).filter(s => s.enabled);
  const svcIds = new Set(svcs.map(s => s.id));
  const hasTB = svcIds.has('torbox'), hasRD = svcIds.has('realdebrid'), hasAD = svcIds.has('alldebrid');
  const hasEN = svcIds.has('easynews'), hasPM = svcIds.has('premiumize'), hasDL = svcIds.has('debridlink');
  const hasOC = svcIds.has('offcloud'), hasED = svcIds.has('easydebrid'), hasPP = svcIds.has('pikpak'), hasSR = svcIds.has('seedr');

  const hasStremthruStore = presetTypes.has('stremthruStore');
  const hasStremthruTorz = presetTypes.has('stremthruTorz');
  const hasEasyNewsPreset = presetTypes.has('easynews') || presetTypes.has('easynewsPlusPlus') || presetTypes.has('easynews-search') || presetTypes.has('easynewsPlus');
  const hasSvcSortKey = ((c.sortCriteria && c.sortCriteria.global) || []).some(k => k.key === 'service');
  const hasSvcPSEs = (c.preferredStreamExpressions || []).some(e => e.expression && /service\(/.test(e.expression));
  const isHybrid = (hasTB && hasRD) || (hasTB && (hasSvcSortKey || hasSvcPSEs) && hasStremthruTorz);

  if (isHybrid) { st.service = 'multi'; st.multiServices = ['torbox-pro','realdebrid']; }
  else if (hasStremthruStore && hasTB) st.service = 'alldebrid';
  else if (hasEN && hasEasyNewsPreset) st.service = 'easynews';
  else if (hasTB) st.service = 'torbox-pro';
  else if (hasRD) st.service = 'realdebrid';
  else if (hasAD) st.service = 'alldebrid';
  else if (hasPM) st.service = 'premiumize';
  else if (hasDL) st.service = 'debridlink';
  else if (hasOC) st.service = 'offcloud';
  else if (hasED) st.service = 'easydebrid';
  else if (hasPP) st.service = 'pikpak';
  else if (hasSR) st.service = 'seedr';
  else if (hasEN) st.service = 'easynews';

  st.multiServices = [];
  if (hasTB) st.multiServices.push('torbox-pro');
  if (hasRD) st.multiServices.push('realdebrid');
  if (hasAD) st.multiServices.push('alldebrid');
  if (hasPM) st.multiServices.push('premiumize');
  if (hasDL) st.multiServices.push('debridlink');
  if (hasOC) st.multiServices.push('offcloud');
  if (hasEN) st.multiServices.push('easynews');
  if (hasED) st.multiServices.push('easydebrid');
  if (hasPP) st.multiServices.push('pikpak');
  if (hasSR) st.multiServices.push('seedr');

  // Credentials
  const creds = {};
  svcs.forEach(s => {
    const k = s.credentials || {};
    if (s.id === 'torbox' && k.apiKey) creds.torbox = k.apiKey;
    if (s.id === 'realdebrid' && k.apiKey) creds.realdebrid = k.apiKey;
    if (s.id === 'alldebrid' && k.apiKey) creds.alldebrid = k.apiKey;
    if (s.id === 'premiumize' && k.apiKey) creds.premiumize = k.apiKey;
    if (s.id === 'debridlink' && k.apiKey) creds.debridlink = k.apiKey;
    if (s.id === 'offcloud' && k.apiKey) creds.offcloud = k.apiKey;
    if (s.id === 'easydebrid' && k.apiKey) creds.easydebrid = k.apiKey;
    if (s.id === 'pikpak' && k.apiKey) creds.pikpak = k.apiKey;
    if (s.id === 'seedr' && k.apiKey) creds.seedr = k.apiKey;
    if (s.id === 'easynews') { if (k.username) creds.easynews = k.username; if (k.password) creds.easynewsPass = k.password; }
  });
  st.creds = creds;

  // NZBGeek from presets (v2.32 api shape)
  const nzbg = presets.find(p => p.type === 'newznab' && p.options && (p.options.api?.url||'').includes('nzbgeek'));
  if (nzbg && nzbg.options && nzbg.options.api && nzbg.options.api.apiKey) creds.nzbgeek = nzbg.options.api.apiKey;

  // Resolution: check requiredResolutions, excludedResolutions, and ESEs
  const req = c.requiredResolutions || [];
  const excl = c.excludedResolutions || [];
  const eses = c.excludedStreamExpressions || [];
  const has4kESEKill = eses.some(e => e.enabled !== false && e.expression && /^(?:\/\*[^*]*\*\/\s*)?resolution\s*\(\s*streams\s*,\s*['"]2160p/.test(e.expression.trim()));
  if (excl.includes('2160p') || has4kESEKill) st.resolution = '1080p';
  else if (!req.length && (c.preferredResolutions||[])[0] === '2160p' && ((c.preferredResolutions||[]).includes('576p') || (c.preferredResolutions||[]).includes('480p'))) st.resolution = 'mixed';
  else if (req.includes('2160p') || (c.preferredResolutions && c.preferredResolutions[0] === '2160p')) st.resolution = '4k';
  else if (req.length > 0 && !req.includes('2160p')) st.resolution = '1080p';
  else st.resolution = '1080p';

  // Device detection from encode/audio/visual signature and name hints
  const ee = new Set(c.excludedEncodes || []);
  const pvt = c.preferredVisualTags || [];
  const nameLC = ((tpl.metadata && tpl.metadata.name) || c.addonName || '').toLowerCase();
  if (nameLC.includes('xiaomi')) {
    st.device = nameLC.includes('3rd') ? 'xiaomi-3rd' : 'xiaomi';
  } else if (nameLC.includes('samsung') || (ee.has('AV1') && ee.has('VC-1') && pvt.includes('HDR10+') && !pvt.includes('DV'))) {
    st.device = 'samsung';
  } else if (nameLC.includes('fire') || nameLC.includes('firestick')) {
    st.device = ee.has('AV1') ? 'firestick-hd' : 'firestick-4kmax';
  } else if (nameLC.includes('apple tv')) {
    st.device = 'appletv-new';
  } else if (nameLC.includes('shield')) {
    st.device = 'shield';
  } else if (nameLC.includes('google tv') || nameLC.includes('googletv')) {
    st.device = 'googletv';
  } else if (nameLC.includes('ultrawide')) {
    st.device = 'windows';
  }

  // Audio profile from excludedAudioTags
  const eat = c.excludedAudioTags || [];
  if (eat.length === 0) st.audio = 'lossless';
  else if (eat.some(t => t === 'TrueHD') && !eat.some(t => t === 'Atmos')) st.audio = 'limited';
  else if (eat.some(t => t === 'DTS') && !eat.some(t => t === 'TrueHD')) st.audio = 'dolby';
  else st.audio = 'standard';

  // Formatter
  if (c.formatter && c.formatter.definitions && c.formatter.definitions.overrides) {
    const ov = c.formatter.definitions.overrides[Object.keys(c.formatter.definitions.overrides)[0]];
    if (ov) {
      const match = FORMATTERS.find(f => f.name === ov.name || f.d === ov.description);
      if (match) st.formatter = match.id;
      else {
        st.formatter = 'custom';
        st.customFormatter = { name: ov.name || '', d: ov.description || '', label: 'Imported' };
      }
    }
  }

  // Deduplicator → matchMode
  if (c.deduplicator) {
    const dd = c.deduplicator;
    if (dd.multiGroupBehaviour === 'conservative') st.matchMode = 'relaxed';
    else if (dd.smartDetectRounding <= 5) st.matchMode = 'strict';
    else st.matchMode = 'balanced';
  }

  // Cache mode
  const hasP2P = presets.some(p => ['torrentio','comet','jackettio','knaben','torrent-galaxy'].includes(p.type) && p.enabled);
  st.p2pEnabled = hasP2P;

  // Max results → stream pool
  const mr = c.maxResults || 20;
  if (mr >= 50) st.streamPool = 'max';
  else if (mr >= 30) st.streamPool = 'large';
  else st.streamPool = 'normal';

  // Sort criteria → qualityFirst
  const gs = (c.sortCriteria && c.sortCriteria.global) || [];
  const qIdx = gs.findIndex(k => k.key === 'quality');
  const rIdx = gs.findIndex(k => k.key === 'resolution');
  st.qualityFirst = qIdx >= 0 && rIdx >= 0 && qIdx < rIdx;

  const cIdx = gs.findIndex(k => k.key === 'cached');
  const resIdx = rIdx >= 0 ? rIdx : gs.findIndex(k => k.key === 'resolution');
  st.resolutionFirst = resIdx >= 0 && cIdx >= 0 && resIdx < cIdx;

  // Foreign language kill
  const eseList = c.excludedStreamExpressions || [];
  st.foreignLangKill = eseList.some(e => e.enabled && e.expression && e.expression.includes('Foreign Language Kill'));

  // Languages
  if (c.requiredLanguages && c.requiredLanguages.length > 0) {
    st.langs = c.requiredLanguages.filter(l => !['Original','Dual Audio','Multi','Dubbed','Unknown'].includes(l));
    if (st.langs.length === 0) st.langs = ['English'];
  }

  // Name from metadata
  if (tpl.metadata && tpl.metadata.name) st.name = tpl.metadata.name;
  else if (c.addonName) st.name = c.addonName;

  // Content type from presets
  const mTypes = presets.filter(p => p.enabled && p.options && p.options.mediaTypes);
  if (mTypes.length > 0) {
    const allMt = new Set();
    mTypes.forEach(p => (p.options.mediaTypes||[]).forEach(t => allMt.add(t)));
    if (allMt.has('movie') && allMt.has('series') && allMt.has('anime')) st.content = 'all';
    else if (allMt.has('movie') && !allMt.has('series')) st.content = 'movies';
    else if (allMt.has('series') && !allMt.has('movie')) st.content = 'series';
    else st.content = 'all';
  }

  // Exclude DV/4K from ESEs
  st.excludeDV = eses.some(e => e.expression && /DV-Only Kill|visualTag.*DV/.test(e.expression));
  st.exclude4K = has4kESEKill;

  // Subtitle addons & languages
  const subAddons = enabledPresets.filter(p => ['aiosubtitle', 'opensubtitles-v3-plus', 'subdl'].includes(p.type)).map(p => p.type);
  st.subtitleAddons = subAddons.length > 0 ? subAddons : ['aiosubtitle'];

  const subPreset = enabledPresets.find(p => ['aiosubtitle', 'opensubtitles-v3-plus', 'subdl'].includes(p.type));
  if (subPreset && subPreset.options) {
    const l = subPreset.options.languages || subPreset.options.language;
    if (Array.isArray(l) && l.length > 0) {
      st.subtitleLangs = l;
    } else if (typeof l === 'string' && l.trim()) {
      st.subtitleLangs = [l.trim()];
    } else {
      st.subtitleLangs = ['en'];
    }
  } else {
    st.subtitleLangs = ['en'];
  }

  // Catalogs
  const cats = enabledPresets.filter(p => ['tmdb-addon', 'streaming-catalogs', 'anime-catalogs', 'rpdb-catalogs', 'torrent-catalogs'].includes(p.type)).map(p => p.type);
  st.catalogs = cats.length > 0 ? cats : ['tmdb-addon'];

  // Deduplicator Merge
  if (c.deduplicator && c.deduplicator.merge) {
    st.dedupMerge = !!c.deduplicator.merge.enabled;
  } else {
    st.dedupMerge = false;
  }

  // Proxy settings
  if (c.proxy) {
    st.proxyEnabled = Array.isArray(c.proxy.proxiedServices) && c.proxy.proxiedServices.length > 0;
    st.proxiedServices = Array.isArray(c.proxy.proxiedServices) ? c.proxy.proxiedServices : [];
  } else {
    st.proxyEnabled = false;
    st.proxiedServices = [];
  }

  // Optional Scrapers (v2.32 api shape)
  const optScrapers = enabledPresets.filter(p => p.type === 'newznab' && p.options && p.options.api?.url).map(p => {
    const d = OPTIONAL_SCRAPER_DEFS.find(x => x.apiUrl && p.options.api.url.toLowerCase().includes(x.apiUrl.toLowerCase()));
    return d ? d.id : null;
  }).filter(Boolean);
  st.optionalScrapers = optScrapers;

  return st;
}

function diffConfigs(oldCfg, newCfg) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sections = [];
  const extractLabel = expr => { const m = (expr||'').match(/\/\*\s*(.+?)\s*\*\//); return m ? m[1] : expr.slice(0,60); };

  function diffExprArray(oldArr, newArr, label, icon, key) {
    const oldLabels = (oldArr||[]).filter(e=>e.enabled!==false).map(e => extractLabel(e.expression));
    const newLabels = (newArr||[]).filter(e=>e.enabled!==false).map(e => extractLabel(e.expression));
    const added = newLabels.filter(l => !oldLabels.includes(l));
    const removed = oldLabels.filter(l => !newLabels.includes(l));
    const rows = [];
    added.forEach(l => rows.push({type:'add', text:esc(l)}));
    removed.forEach(l => rows.push({type:'rem', text:esc(l)}));
    if (rows.length) sections.push({label, icon, rows, added:added.length, removed:removed.length, changed:0, key});
  }

  function diffRegexArray(oldArr, newArr, label, icon, hasScore, key) {
    const toMap = arr => { const m = new Map(); (arr||[]).forEach((r,i) => { const n = typeof r === 'string' ? 'Pattern #'+(i+1) : (r.name||'unnamed'); m.set(n, r); }); return m; };
    const oldMap = toMap(oldArr), newMap = toMap(newArr);
    const rows = [];
    for (const [name, entry] of newMap) {
      if (!oldMap.has(name)) { rows.push({type:'add', text:esc(name) + (hasScore && entry.score != null ? ' <span style="opacity:.5">(score '+esc(entry.score)+')</span>' : '')}); }
      else if (hasScore && entry.score != null && oldMap.get(name).score != null && entry.score !== oldMap.get(name).score) {
        rows.push({type:'chg', text:esc(name) + ' <span style="opacity:.5">score '+esc(oldMap.get(name).score)+' &rarr; '+esc(entry.score)+'</span>'});
      }
    }
    for (const [name] of oldMap) { if (!newMap.has(name)) rows.push({type:'rem', text:esc(name)}); }
    if (rows.length) { const a = rows.filter(r=>r.type==='add').length, r = rows.filter(r=>r.type==='rem').length, c = rows.filter(r=>r.type==='chg').length; sections.push({label, icon, rows, added:a, removed:r, changed:c, key}); }
  }

  function diffSortCriteria(oldSort, newSort) {
    const allKeys = new Set([...Object.keys(oldSort||{}), ...Object.keys(newSort||{})]);
    const rows = [];
    for (const sec of allKeys) {
      const oldKeys = ((oldSort||{})[sec]||[]).map(k => k.key);
      const newKeys = ((newSort||{})[sec]||[]).map(k => k.key);
      if (JSON.stringify(oldKeys) !== JSON.stringify(newKeys)) {
        const added = newKeys.filter(k => !oldKeys.includes(k));
        const removed = oldKeys.filter(k => !newKeys.includes(k));
        const reordered = added.length === 0 && removed.length === 0;
        let detail = '';
        if (added.length) detail += '+' + added.join(', ');
        if (removed.length) detail += (detail ? ' ' : '') + '-' + removed.join(', ');
        if (reordered) detail = 'key order changed';
        rows.push({type: removed.length && !added.length ? 'rem' : added.length ? 'add' : 'chg', text: esc(sec) + (detail ? ' <span style="opacity:.5">('+esc(detail)+')</span>' : '')});
      }
    }
    if (rows.length) sections.push({label:'Sort Criteria', icon:ICO.shuffle(14,'#a78bfa'), rows, added:rows.filter(r=>r.type==='add').length, removed:rows.filter(r=>r.type==='rem').length, changed:rows.filter(r=>r.type==='chg').length, key:'sort'});
  }

  diffExprArray(oldCfg.preferredStreamExpressions, newCfg.preferredStreamExpressions, 'PSE Tiers', ICO.crown(14,'#fbbf24'), 'pses');
  diffExprArray(oldCfg.excludedStreamExpressions, newCfg.excludedStreamExpressions, 'Excluded Stream Expressions', ICO.bolt(14,'#f87171'), 'eses');
  diffExprArray(oldCfg.includedStreamExpressions, newCfg.includedStreamExpressions, 'Included Stream Expressions', ICO.check(14,'#34d399'), 'ises');
  diffRegexArray(oldCfg.rankedRegexPatterns, newCfg.rankedRegexPatterns, 'Ranked Regex Patterns', ICO.search(14,'#a78bfa'), true, 'ranked_regex');
  diffRegexArray(oldCfg.preferredRegexPatterns, newCfg.preferredRegexPatterns, 'Preferred Regex Patterns', ICO.diamond(14,'#00d4ff'), false, 'pref_regex');
  diffRegexArray(oldCfg.excludedRegexPatterns, newCfg.excludedRegexPatterns, 'Excluded Regex Patterns', ICO.bolt(14,'#f87171'), false, 'excl_regex');
  diffSortCriteria(oldCfg.sortCriteria, newCfg.sortCriteria);

  const miscRows = [];
  const ddOld = oldCfg.deduplicator || {}, ddNew = newCfg.deduplicator || {};
  if (JSON.stringify(ddOld) !== JSON.stringify(ddNew)) {
    if (ddOld.multiGroupBehaviour !== ddNew.multiGroupBehaviour) miscRows.push({type:'chg', text:'Dedup mode: <span style="opacity:.5">'+esc(ddOld.multiGroupBehaviour||'(none)')+' &rarr; '+esc(ddNew.multiGroupBehaviour||'(none)')+'</span>'});
    if (ddOld.smartDetectRounding !== ddNew.smartDetectRounding) miscRows.push({type:'chg', text:'Dedup rounding: <span style="opacity:.5">'+esc(ddOld.smartDetectRounding||'(none)')+' &rarr; '+esc(ddNew.smartDetectRounding||'(none)')+'</span>'});
    if (ddOld.cached !== ddNew.cached) miscRows.push({type:'chg', text:'Dedup cached: <span style="opacity:.5">'+esc(ddOld.cached||'(none)')+' &rarr; '+esc(ddNew.cached||'(none)')+'</span>'});
    if (JSON.stringify(ddOld.tiebreakers) !== JSON.stringify(ddNew.tiebreakers)) miscRows.push({type:'add', text:'Dedup tiebreakers updated'});
    if (ddOld.libraryBehaviour !== ddNew.libraryBehaviour) miscRows.push({type:'chg', text:'Library behaviour: <span style="opacity:.5">'+esc(ddOld.libraryBehaviour||'ignore')+' &rarr; '+esc(ddNew.libraryBehaviour||'ignore')+'</span>'});
  }
  const fmtOld = oldCfg.formatter, fmtNew = newCfg.formatter;
  if (fmtOld && fmtNew) {
    const ovOld = fmtOld.definitions && fmtOld.definitions.overrides && fmtOld.definitions.overrides[Object.keys(fmtOld.definitions.overrides)[0]];
    const ovNew = fmtNew.definitions && fmtNew.definitions.overrides && fmtNew.definitions.overrides[Object.keys(fmtNew.definitions.overrides)[0]];
    if (ovOld && ovNew && ovOld.name !== ovNew.name) miscRows.push({type:'chg', text:'Formatter: <span style="opacity:.5">'+esc(ovOld.name||'unknown')+' &rarr; '+esc(ovNew.name||'unknown')+'</span>'});
  }
  const dafOld = oldCfg.dynamicAddonFetching, dafNew = newCfg.dynamicAddonFetching;
  if (dafOld && dafNew && dafOld.condition !== dafNew.condition) miscRows.push({type:'chg', text:'Dynamic addon fetching condition updated'});
  if ((oldCfg.maxResults||20) !== (newCfg.maxResults||20)) miscRows.push({type:'chg', text:'Max results: <span style="opacity:.5">'+esc(oldCfg.maxResults||20)+' &rarr; '+esc(newCfg.maxResults||20)+'</span>'});

  const syncFields = ['syncedRankedRegexUrls','syncedExcludedRegexUrls','syncedIncludedStreamExpressionUrls','syncedPreferredStreamExpressionUrls','syncedExcludedStreamExpressionUrls'];
  const syncOld = syncFields.flatMap(f => oldCfg[f]||[]);
  const syncNew = syncFields.flatMap(f => newCfg[f]||[]);
  const addedUrls = syncNew.filter(u => !syncOld.includes(u)), removedUrls = syncOld.filter(u => !syncNew.includes(u));
  addedUrls.forEach(u => miscRows.push({type:'add', text:'Synced URL: ' + esc(u.split('/').pop())}));
  removedUrls.forEach(u => miscRows.push({type:'rem', text:'Synced URL: ' + esc(u.split('/').pop())}));

  if (miscRows.length) sections.push({label:'Settings & Config', icon:ICO.gear(14,'#8b949e'), rows:miscRows, added:miscRows.filter(r=>r.type==='add').length, removed:miscRows.filter(r=>r.type==='rem').length, changed:miscRows.filter(r=>r.type==='chg').length, key:'settings'});

  return sections;
}

function showDiffModal(oldCfg, newCfg, parsed, onApply, onCancel, importedConflicts = []) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ex = document.getElementById('diffModal');
  if (ex) ex.remove();
  const sections = diffConfigs(oldCfg, newCfg);
  const totalAdded = sections.reduce((s,x) => s+x.added, 0);
  const totalRemoved = sections.reduce((s,x) => s+x.removed, 0);
  const totalChanged = sections.reduce((s,x) => s+x.changed, 0);
  const totalDiffs = totalAdded + totalRemoved + totalChanged;

  const overlay = document.createElement('div');
  overlay.id = 'diffModal';
  overlay.className = 'df-overlay';

  const selectAllId = 'dfSelAll';
  const selectAllHtml = sections.length > 1 ? '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;padding:6px 10px;background:rgba(0,212,255,.04);border:1px solid rgba(0,212,255,.1);border-radius:8px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.72rem;color:#8b949e;user-select:none;flex:1"><input type="checkbox" id="'+selectAllId+'" checked style="accent-color:#00d4ff;width:14px;height:14px;cursor:pointer"> Select all sections</label><span style="font-size:.65rem;color:#4b5563">Uncheck to keep your existing values</span></div>' : '';

  const sectionsHtml = sections.length ? sections.map((sec, si) => {
    const countHtml = [];
    if (sec.added) countHtml.push('<span style="color:#34d399">+'+sec.added+'</span>');
    if (sec.removed) countHtml.push('<span style="color:#f87171">-'+sec.removed+'</span>');
    if (sec.changed) countHtml.push('<span style="color:#fbbf24">~'+sec.changed+'</span>');
    const rowsHtml = sec.rows.map(r => {
      const cls = r.type === 'add' ? 'df-row-add' : r.type === 'rem' ? 'df-row-rem' : 'df-row-chg';
      const ico = r.type === 'add' ? '+' : r.type === 'rem' ? '&minus;' : '~';
      return '<div class="df-row '+cls+'"><span class="df-row-ico">'+ico+'</span><span class="df-row-txt">'+r.text+'</span></div>';
    }).join('');
    const cbId = 'dfSec'+si;
    return '<div class="df-section" data-sec-key="'+(sec.key||'')+'"><div class="df-sec-hdr"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0" onclick="event.stopPropagation()"><input type="checkbox" class="df-sec-cb" id="'+cbId+'" data-sec-idx="'+si+'" checked style="accent-color:#00d4ff;width:14px;height:14px;cursor:pointer;flex-shrink:0">'+sec.icon+' '+esc(sec.label)+'</label><span class="df-sec-count" style="cursor:pointer" onclick="const b=this.closest(\'.df-section\').querySelector(\'.df-sec-body\');b.style.display=b.style.display===\'none\'?\'\':\'none\'">'+countHtml.join(' ')+' <span style="font-size:.6rem;opacity:.5">&#9660;</span></span></div><div class="df-sec-body">'+rowsHtml+'</div></div>';
  }).join('') : '<div class="df-empty">'+ICO.check(18,'#34d399')+'<br>Your template is already up to date.</div>';

  const detected = [];
  if (parsed.service) detected.push(esc(parsed.service));
  if (parsed.resolution) detected.push(esc(parsed.resolution));
  if (parsed.audio) detected.push(esc(parsed.audio));

  const visibleImportedConflicts = importedConflicts.filter(item => item.severity !== 'info').slice(0, 4);
  const importedConflictHtml = visibleImportedConflicts.length
    ? '<div style="margin-bottom:10px;padding:10px 11px;border-radius:8px;background:rgba(251,191,36,.05);border:1px solid rgba(251,191,36,.22)"><div style="font-size:.68rem;font-weight:800;color:#fbbf24;letter-spacing:.04em;text-transform:uppercase;margin-bottom:5px">Existing template conflicts</div>'
      + visibleImportedConflicts.map(item => '<div style="font-size:.67rem;line-height:1.45;color:'+(item.severity === 'error' ? '#f87171' : '#fbbf24')+';margin-top:3px">'+(item.severity === 'error' ? '✕' : '⚠')+' <b>'+esc(item.title)+'</b> — '+esc(item.message)+'</div>').join('')
      + (importedConflicts.length > visibleImportedConflicts.length ? '<div style="font-size:.64rem;color:#8b949e;margin-top:5px">+'+(importedConflicts.length-visibleImportedConflicts.length)+' more safe conflict check(s) in diagnostics after migration.</div>' : '')
      + '</div>'
    : '';

  overlay.innerHTML = '<div class="df-box">'
    + '<div class="df-hdr"><span class="df-hdr-title">'+ICO.shuffle(18,'#00d4ff')+' Template Migration</span>'
    + '<button id="dfClose" style="background:none;border:none;color:#8b949e;font-size:1.3rem;cursor:pointer;padding:4px 8px;line-height:1" aria-label="Close">&times;</button></div>'
    + '<div class="df-body">'
    + '<div style="font-size:.72rem;color:#8b949e;margin-bottom:12px;line-height:1.5">'
    + 'Detected <strong style="color:#e6edf3">'+detected.join(' / ')+'</strong>'+(parsed.name ? ' &mdash; <strong style="color:#e6edf3">'+esc(parsed.name)+'</strong>' : '')+'. Here\'s what changes when you upgrade to the latest configurator logic.</div>'
    + importedConflictHtml
    + '<div class="df-summary">'
    + '<div class="df-stat"><div class="df-stat-num" style="color:#34d399">'+totalAdded+'</div><div class="df-stat-label">Added</div></div>'
    + '<div class="df-stat"><div class="df-stat-num" style="color:#f87171">'+totalRemoved+'</div><div class="df-stat-label">Removed</div></div>'
    + '<div class="df-stat"><div class="df-stat-num" style="color:#fbbf24">'+totalChanged+'</div><div class="df-stat-label">Changed</div></div>'
    + '<div class="df-stat"><div class="df-stat-num" style="color:#00d4ff">'+totalDiffs+'</div><div class="df-stat-label">Total</div></div></div>'
    + selectAllHtml + sectionsHtml + '</div>'
    + '<div class="df-footer"><button class="df-btn df-btn-secondary" id="dfCancel">Cancel</button>'
    + '<button class="df-btn df-btn-primary" id="dfApply">'+(totalDiffs ? 'Apply &amp; Upgrade' : 'Continue Anyway')+'</button></div></div>';
  document.body.appendChild(overlay);

  const allCbs = overlay.querySelectorAll('.df-sec-cb');
  const selAllEl = document.getElementById(selectAllId);
  if (selAllEl) {
    selAllEl.addEventListener('change', () => { allCbs.forEach(cb => { cb.checked = selAllEl.checked; cb.closest('.df-section').style.opacity = cb.checked ? '1' : '.45'; }); });
  }
  allCbs.forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.df-section').style.opacity = cb.checked ? '1' : '.45';
      if (selAllEl) selAllEl.checked = [...allCbs].every(c => c.checked);
    });
  });

  const close = (cb) => { overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s'; setTimeout(() => { overlay.remove(); if (cb) cb(); }, 160); };
  document.getElementById('dfClose').addEventListener('click', () => close(onCancel));
  document.getElementById('dfCancel').addEventListener('click', () => close(onCancel));
  document.getElementById('dfApply').addEventListener('click', () => {
    const selected = new Set();
    const offered = new Set();
    allCbs.forEach((cb, i) => {
      if (sections[i] && sections[i].key) {
        offered.add(sections[i].key);
        if (cb.checked) selected.add(sections[i].key);
      }
    });
    close(() => onApply(selected, offered));
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(onCancel); });
}

function showUpdateTemplateModal() {
  const ex = document.getElementById('updateTplModal');
  if (ex) ex.remove();
  const overlay = document.createElement('div');
  overlay.id = 'updateTplModal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="Update Existing Setup" style="max-width:480px">
      <button class="modal-close" id="updTplClose" aria-label="Close">×</button>
      <div class="modal-title" style="font-size:1.05rem">${ICO.refresh(18,'#00d4ff')} Update Existing Setup</div>
      <div class="modal-sub" style="margin-bottom:8px">Paste your existing template JSON below. We'll show you exactly what changes before upgrading to the latest sort logic, regex patterns, and formatters, and flag safe rule conflicts before you apply anything.</div>
      <div style="background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.12);border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:.72rem;color:#8b949e;line-height:1.5">
        <strong style="color:#00d4ff">What gets updated:</strong> Sort criteria, regex patterns, PSE tiers, formatter, deduplicator settings, and filter expressions — all rebuilt with the latest configurator logic.<br>
        <strong style="color:#00d4ff">What's preserved:</strong> Your service, credentials, resolution, audio, and content preferences are detected and kept.
      </div>
      <textarea id="updTplInput" rows="8" placeholder='Paste your full template JSON here...' style="width:100%;box-sizing:border-box;background:#111720;border:1.5px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#e6edf3;font-family:monospace;font-size:.72rem;resize:vertical;outline:none;line-height:1.4"></textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <label style="flex:1;padding:9px;border-radius:8px;border:1.5px dashed rgba(0,212,255,.25);background:transparent;color:#00d4ff;font-size:.8rem;font-weight:600;cursor:pointer;text-align:center;transition:all .15s">
          ${ICO.folder(14,'#00d4ff')} Load File
          <input type="file" accept=".json,application/json" id="updTplFile" style="display:none">
        </label>
        <button id="updTplApply" style="flex:2;padding:9px;border-radius:8px;border:1.5px solid rgba(0,212,255,.4);background:rgba(0,212,255,.08);color:#00d4ff;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .15s">Update & Review</button>
      </div>
      <div id="updTplErr" style="margin-top:8px;font-size:.76rem;color:#ef4444;display:none"></div>
      <div id="updTplInfo" style="margin-top:8px;font-size:.76rem;color:#34d399;display:none"></div>
    </div>`;
  document.body.appendChild(overlay);

  const textarea = document.getElementById('updTplInput');
  const errEl = document.getElementById('updTplErr');
  const infoEl = document.getElementById('updTplInfo');

  function parseAndApply(raw) {
    errEl.style.display = 'none';
    infoEl.style.display = 'none';
    try {
      const obj = JSON.parse(raw);
      if (!obj.config && !obj.services && !obj.presets) { errEl.textContent = 'Not a valid AIOStreams template — missing config object'; errEl.style.display = ''; return; }
      const tpl = obj.config ? obj : { config: obj };
      const parsed = parseTemplateToState(tpl);
      if (!parsed.service) { errEl.textContent = 'Could not detect a debrid service — no enabled services found in template'; errEl.style.display = ''; return; }

      const oldCfg = tpl.config || tpl;
      const importedConflicts = findFeatureConflicts(tpl);

      // Build a preview from temporary state; do not commit until the user confirms.
      const savedState = JSON.parse(JSON.stringify(S));
      const session = createUpdateSession(S, parsed);
      S.service = null; S.device = null; S.resolution = null; S.audio = 'limited';
      S.content = null; S.name = ''; S.multiServices = []; S.sizeLimit = 'unlimited';
      S.formatter = 'family-v4'; S.p2pEnabled = false; S.qualityFirst = false; S.resolutionFirst = false; S.foreignLangKill = true;
      S.matchMode = 'balanced'; S.exclude4K = false; S.excludeDV = false;
      S.langs = ['English']; S.langExclusive = false; S.cacheMode = 'mixed';
      S.streamPool = 'normal'; S.outputProfile = 'auto';
      S.subtitleAddons = ['aiosubtitle']; S.subtitleLangs = ['en']; S.catalogs = ['tmdb-addon'];
      S.dedupMerge = false; S.proxyEnabled = false; S.proxiedServices = []; S.optionalScrapers = [];
      const defaultCreds = {torbox:'',realdebrid:'',alldebrid:'',premiumize:'',debridlink:'',offcloud:'',easynews:'',easynewsPass:'',nzbgeek:'',debridio:'',subdl:''};
      Object.assign(S, parsed);
      S.creds = Object.assign(defaultCreds, parsed.creds || {});
      S.simpleMode = false;
      let newTpl, newCfg;
      try {
        newTpl = build();
        newCfg = newTpl.config || newTpl;
      } catch(buildErr) {
        Object.assign(S, savedState);
        errEl.textContent = 'Preview generation failed: ' + buildErr.message;
        errEl.style.display = '';
        return;
      }
      Object.assign(S, savedState);

      overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s';
      setTimeout(() => {
        overlay.remove();
        showDiffModal(oldCfg, newCfg, parsed, (selectedKeys, offeredKeys = new Set()) => {
          const SECTION_FIELDS = {
            pses: ['preferredStreamExpressions'],
            eses: ['excludedStreamExpressions'],
            ises: ['includedStreamExpressions'],
            ranked_regex: ['rankedRegexPatterns'],
            pref_regex: ['preferredRegexPatterns'],
            excl_regex: ['excludedRegexPatterns'],
            sort: ['sortCriteria'],
            settings: ['deduplicator','formatter','dynamicAddonFetching','maxResults','syncedRankedRegexUrls','syncedExcludedRegexUrls','syncedIncludedStreamExpressionUrls','syncedPreferredStreamExpressionUrls','syncedExcludedStreamExpressionUrls']
          };
          const keep = {};
          for (const [key, fields] of Object.entries(SECTION_FIELDS)) {
            if (offeredKeys.has(key) && !selectedKeys.has(key)) {
              fields.forEach(f => { if (oldCfg[f] !== undefined) keep[f] = oldCfg[f]; });
            }
          }
          commitUpdate(session, parsed);
          Object.assign(S, parsed);
          S._migrationKeep = Object.keys(keep).length ? keep : null;
          saveState();
          const skipped = Object.keys(SECTION_FIELDS).filter(k => offeredKeys.has(k) && !selectedKeys.has(k)).length;
          step = STEPS;
          pushStep(); render(); window.scrollTo(0,0);
          showToast(skipped ? 'Template upgraded — '+selectedKeys.size+' section'+(selectedKeys.size!==1?'s':'')+' applied, '+skipped+' kept from original' : 'Template upgraded — review settings and generate your new template');
        }, () => {
          cancelUpdate(session);
          showToast('Migration cancelled — no changes applied', true);
        }, importedConflicts);
      }, 160);
    } catch(e) { errEl.textContent = 'Invalid JSON: ' + e.message; errEl.style.display = ''; }
  }

  document.getElementById('updTplApply').addEventListener('click', () => parseAndApply(textarea.value));
  document.getElementById('updTplFile').addEventListener('change', function() {
    if (!this.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => { textarea.value = reader.result; parseAndApply(reader.result); };
    reader.readAsText(this.files[0]);
  });
  document.getElementById('updTplClose').addEventListener('click', () => {
    overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s';
    setTimeout(() => overlay.remove(), 160);
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s'; setTimeout(() => overlay.remove(), 160); } });
}

function showTestDriveModal() {
  const hasKey = getDebridInputs().some(inp => S.creds[inp.id] && S.creds[inp.id].trim());
  const isFree = S.service === 'p2p' || S.service === 'http';
  if (!isFree && !hasKey) {
    showToast('Enter your debrid API key first to test drive', true);
    return;
  }
  const ex = document.getElementById('testDriveModal');
  if (ex) ex.remove();

  const PRESETS = [
    { title:'Interstellar', id:'tt0816692', type:'movie', meta:'Movie · 4K REMUX test' },
    { title:'Oppenheimer', id:'tt15398776', type:'movie', meta:'Movie · Recent blockbuster' },
    { title:'Dune: Part Two', id:'tt15239678', type:'movie', meta:'Movie · 4K HDR test' },
    { title:'Breaking Bad S1E1', id:'tt0903747:1:1', type:'series', meta:'Series · Classic TV' },
    { title:'Demon Slayer S1E1', id:'tt9335498:1:1', type:'series', meta:'Series · Anime test' },
    { title:'The Bear S1E1', id:'tt14452776:1:1', type:'series', meta:'Series · Recent TV' },
  ];
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  const overlay = document.createElement('div');
  overlay.id = 'testDriveModal';
  overlay.className = 'modal-overlay td-modal';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="Test Drive">
      <button class="modal-close" id="tdClose" aria-label="Close">×</button>
      <div class="modal-title">${ICO.eye(20,'#a78bfa')} Test Drive</div>
      <div style="text-align:center;font-size:.78rem;color:#8b949e;margin-bottom:8px">Pick a title to preview what streams your config returns</div>
      <div class="td-tiles">
        ${PRESETS.map(p => `<div class="td-tile" data-td-id="${esc(p.id)}" data-td-type="${p.type}">
          <div class="td-tile-title">${esc(p.title)}</div>
          <div class="td-tile-meta">${esc(p.meta)}</div>
        </div>`).join('')}
      </div>
      <div style="font-size:.72rem;color:#6b7280;font-weight:600;letter-spacing:.03em;text-transform:uppercase;margin-bottom:4px">Or enter an IMDB ID</div>
      <div class="td-custom">
        <input type="text" id="tdImdbInput" placeholder="tt1375666 or tt0903747:1:1" spellcheck="false">
        <button id="tdCustomBtn">Fetch</button>
      </div>
      <div id="tdResults"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  async function runTestDrive(imdbId, contentType) {
    const resultsEl = document.getElementById('tdResults');
    resultsEl.innerHTML = '<div class="td-loading"><span class="dot-spin"><span></span><span></span><span></span></span> Uploading config & fetching streams…</div>';

    try {
      const cfg = buildFinal().config;
      const tempPwd = makePwd();

      // Prefer the last known-good host; fall back to racing the remaining hosts.
      const fastest = await selectHealthyHost(4000);

      // Upload config
      const uploadRes = await writeHostFetch(fastest, '/api/v1/user', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ config:cfg, password:tempPwd })
      }, 10000);
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || uploadData?.success === false) {
        const apiMsg = uploadData?.error?.message || uploadData?.message || uploadData?.detail || 'Upload failed';
        throw new Error(apiMsg);
      }

      const uuid = uploadData?.data?.uuid || uploadData?.uuid || uploadData?.user?.uuid || uploadData?.id;
      const epwd = uploadData?.data?.encryptedPassword || encodeURIComponent(tempPwd);
      if (!uuid) throw new Error('No UUID returned from server');

      // Determine type from ID format
      if (!contentType) {
        contentType = imdbId.includes(':') ? 'series' : 'movie';
      }

      resultsEl.innerHTML = '<div class="td-loading"><span class="dot-spin"><span></span><span></span><span></span></span> Fetching streams…</div>';

      // Fetch streams
      const streamRes = await raceHostFetch(fastest, `/stremio/${uuid}/${epwd}/stream/${contentType}/${encodeURIComponent(imdbId)}.json`, {
        method:'GET'
      }, 30000);
      if (!streamRes.ok) throw new Error(`Stream fetch failed (HTTP ${streamRes.status})`);
      const streamData = await streamRes.json();
      const streams = streamData?.streams || [];

      if (streams.length === 0) {
        resultsEl.innerHTML = '<div class="td-error" style="text-align:center;background:rgba(245,158,11,.06);border-color:rgba(245,158,11,.18);color:#fbbf24">No streams found for this title. This can happen if scrapers have no results or if the IMDB ID is invalid.</div>';
        return;
      }

      const cleanDSL = str => (str || '').replace(/\{stream\.\w+(::[^}]*)?\}/g, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

      // ── Core Score: brand the results with an explainable quality number ──
      const scored = streams.map(s => {
        const cs = scoreFormattedStream(s);
        const b = cs.breakdown;
        const rows = Object.entries(b)
          .filter(([, p]) => p.points !== null)
          .map(([, p]) => `<div class="cs-row"><span class="cs-row-lab">${p.label}</span><span class="cs-row-bar"><i style="width:${p.points}%;background:${p.points >= 75 ? '#3fb950' : p.points >= 50 ? '#fbbf24' : '#f87171'}"></i></span><span class="cs-row-val">${p.points}</span><span class="cs-row-note">${esc(p.note)}</span></div>`)
          .join('');
        const gates = cs.gates.map(g => `<div class="cs-gate ${g.passed ? 'ok' : 'bad'}">${g.passed ? '✓' : '✗'} ${g.name} — ${esc(g.note)}</div>`).join('');
        return { s, cs, rows, gates };
      });

      resultsEl.innerHTML = `
        <div class="td-count">${streams.length} stream${streams.length !== 1 ? 's' : ''} returned</div>
        <div class="td-results">
          ${scored.map(({ s, cs, rows, gates }) => `
            <div class="td-stream">
              <div class="td-stream-name">${esc(cleanDSL(s.name))} <span class="cs-badge" style="background:${cs.score >= 75 ? 'rgba(63,185,80,.14)' : cs.score >= 50 ? 'rgba(251,191,36,.14)' : 'rgba(248,113,113,.14)'};color:${cs.score >= 75 ? '#3fb950' : cs.score >= 50 ? '#fbbf24' : '#f87171'}" title="Core Score — tap the name for the full breakdown">${cs.rank} Core ${cs.score}</span></div>
              ${s.description ? `<div class="td-stream-desc">${esc(cleanDSL(s.description))}</div>` : ''}
              <details class="cs-explain"><summary>Why Core ${cs.score}?</summary>
                <div class="cs-summary">${esc(cs.summary)}</div>
                <div class="cs-rows">${rows}</div>
                <div class="cs-gates">${gates}</div>
                ${cs.partial ? `<div class="cs-partial">Score computed from the formatted stream line. The full score (bitrate/IQR, parsed fields) is applied in your actual config.</div>` : ''}
              </details>
            </div>`).join('')}
        </div>
      `;
    } catch(err) {
      resultsEl.innerHTML = `<div class="td-error">${ICO.warn(13,'#f87171')} ${esc(err.message || 'Something went wrong')}</div>`;
    }
  }

  // Tile clicks
  overlay.querySelectorAll('.td-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      overlay.querySelectorAll('.td-tile').forEach(t => t.style.borderColor = '');
      tile.style.borderColor = 'rgba(167,139,250,.5)';
      runTestDrive(tile.dataset.tdId, tile.dataset.tdType);
    });
  });

  // Custom IMDB input
  document.getElementById('tdCustomBtn').addEventListener('click', () => {
    const val = (document.getElementById('tdImdbInput').value || '').trim();
    if (!val) { showToast('Enter an IMDB ID like tt1375666', true); return; }
    if (!/^tt\d+/.test(val)) { showToast('IMDB ID should start with tt (e.g. tt1375666)', true); return; }
    overlay.querySelectorAll('.td-tile').forEach(t => t.style.borderColor = '');
    runTestDrive(val);
  });
  document.getElementById('tdImdbInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('tdCustomBtn').click();
  });

  // Close handlers
  document.getElementById('tdClose').addEventListener('click', () => {
    overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s';
    setTimeout(() => overlay.remove(), 160);
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s';
      setTimeout(() => overlay.remove(), 160);
    }
  });
}

function showManifestModal(manifestUrl, password, hostLabel, initialTab) {
  const ex = document.getElementById('manifestModal');
  if (ex) ex.remove();

  const FMTS = [
    { key:'app',    label:'Stremio App', getUrl: u => u.replace(/^https?:\/\//, 'stremio://'), action:'link' },
    { key:'web',    label:'Web',         getUrl: u => `https://web.stremio.com/#/addons?addon=${encodeURIComponent(u)}`, action:'link' },
    { key:'wuplay',  label:'WuPlay',       getUrl: u => u, action:'open', configUrl:'https://config.wuplay.app/#addons' },
    { key:'nuvio',   label:'Nuvio',        getUrl: u => u, action:'open', configUrl:'https://nuvio.tv/account?tab=addons' },
    { key:'manifest',label:'Manifest URL', getUrl: u => u, action:'copy' },
  ];
  const qrSrc = u => {
    try {
      const qr = qrcode(0, 'M'); qr.addData(u); qr.make();
      let svg = qr.createSvgTag({ cellSize: 4, margin: 2 });
      svg = svg.replace('fill="white"', 'fill="#0d1117"').replace(/fill="black"/g, 'fill="#00d4ff"');
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    } catch(e) { return ''; }
  };
  const esc  = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  // Extract password from AIOStreams URL format if not provided
  if (!password) {
    const m = manifestUrl.match(/\/stremio\/[^\/]+\/([^\/]+)\/manifest\.json/);
    if (m) try { password = decodeURIComponent(m[1]); } catch(e) {}
  }

  const overlay = document.createElement('div');
  overlay.id = 'manifestModal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="Manifest Ready">
      <button class="modal-close" id="mClose" aria-label="Close">×</button>
      <div class="modal-success-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="modal-title">Manifest Ready ${ICO.confetti(22,'#fbbf24')}</div>
      <div class="modal-sub">${hostLabel ? `<span style="color:#3fb950">${esc(hostLabel)}</span> · ` : ''}Your config is live — install or copy below</div>
      <div class="fmt-tabs" id="mFmtTabs">
        ${FMTS.map((f,i) => `<button class="fmt-tab${i===0?' active':''}" data-fi="${i}">${f.label}</button>`).join('')}
      </div>
      <div class="copy-fields-card">
        <div class="copy-field">
          <div style="flex:1;min-width:0">
            <div class="copy-field-label" id="mUrlLabel">Manifest URL</div>
            <div class="copy-field-val" id="mUrlVal">${esc(FMTS[0].getUrl(manifestUrl))}</div>
          </div>
          <button class="copy-btn" id="mCopyUrl">Copy</button>
        </div>
        ${password ? `<div class="copy-field">
          <div style="flex:1;min-width:0">
            <div class="copy-field-label">Password</div>
            <div class="copy-field-val pwd-val">${esc(password)}</div>
          </div>
          <button class="copy-btn" id="mCopyPwd">Copy</button>
        </div>` : ''}
      </div>
      <div id="mAppHelp" style="display:none;margin:8px 0 4px;padding:10px 13px;border-radius:8px;border:1px solid rgba(79,70,229,.2);background:rgba(79,70,229,.04)">
        <div style="font-size:.78rem;font-weight:700;color:#a78bfa;margin-bottom:6px" id="mAppHelpTitle"></div>
        <div style="font-size:.76rem;color:#8b949e;line-height:1.55" id="mAppHelpBody"></div>
      </div>
      <div class="qr-wrap" id="mQrWrap">
        <img id="mQr" src="${qrSrc(FMTS[0].getUrl(manifestUrl))}" width="140" height="140" alt="QR code" loading="lazy" onerror="this.parentElement.style.display='none'">
      </div>
      <div id="mQrHint" style="text-align:center;color:#4b5563;font-size:.7rem;margin-bottom:2px">Scan to install on another device</div>
      <div class="modal-actions">
        <a href="${esc(FMTS[0].getUrl(manifestUrl))}" id="mActionBtn" class="m-btn m-install">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>Install
        </a>
        <button class="m-btn m-done" id="mDone">Done</button>
      </div>
      <div style="margin-top:12px;padding:10px 13px;border-radius:8px;background:rgba(52,211,153,.04);border:1px solid rgba(52,211,153,.12)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <div style="font-size:.72rem;font-weight:700;color:#34d399">What's next</div>
          <button id="mTestStreams" style="font-size:.68rem;font-weight:700;padding:3px 10px;border-radius:5px;border:1px solid rgba(0,212,255,.25);background:rgba(0,212,255,.06);color:#00d4ff;cursor:pointer;transition:background .15s" onmouseover="this.style.background='rgba(0,212,255,.12)'" onmouseout="this.style.background='rgba(0,212,255,.06)'">Test streams</button>
        </div>
        <div style="font-size:.72rem;color:#8b949e;line-height:1.55">
          <strong style="color:#e6edf3">1.</strong> Open Stremio and search for any movie or show<br>
          <strong style="color:#e6edf3">2.</strong> Streams should appear with Core Builds sorting<br>
          <strong style="color:#e6edf3">3.</strong> Save your password — you'll need it to edit settings later
        </div>
        <div style="margin-top:6px"><a href="../account-tools/" target="_blank" rel="noopener noreferrer" style="font-size:.68rem;color:#8b949e;text-decoration:none;transition:color .15s" onmouseover="this.style.color='#34d399'" onmouseout="this.style.color='#8b949e'">Back up your current addons first →</a></div>
        <div id="mTestResult" style="margin-top:6px;font-size:.72rem"></div>
      </div>
      <details style="margin-top:10px;border:1px solid rgba(255,255,255,.06);border-radius:8px;overflow:hidden">
        <summary style="list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:8px 12px;background:rgba(255,255,255,.02);user-select:none;font-size:.72rem;font-weight:700;color:#6b7280;letter-spacing:.03em">
          <span>${ICO.clipboard(13,'#8b949e')} Config summary</span><span style="font-size:.7rem">›</span>
        </summary>
        <div style="padding:8px 12px;border-top:1px solid rgba(255,255,255,.04);font-size:.7rem;color:#8b949e;line-height:1.7">
          ${(() => {
            const cfg = buildFinal().config;
            const rows = [];
            rows.push('<b style="color:#e6edf3">Host:</b> ' + esc(hostLabel));
            rows.push('<b style="color:#e6edf3">Presets:</b> ' + (cfg.presets ? cfg.presets.filter(p=>p.enabled!==false).length + ' active' : 'inherited'));
            rows.push('<b style="color:#e6edf3">ESEs:</b> ' + (cfg.excludedStreamExpressions ? cfg.excludedStreamExpressions.filter(e=>e.enabled!==false).length : '0'));
            rows.push('<b style="color:#e6edf3">ISEs:</b> ' + (cfg.includedStreamExpressions ? cfg.includedStreamExpressions.filter(e=>e.enabled!==false).length : '0'));
            rows.push('<b style="color:#e6edf3">PSEs:</b> ' + (cfg.preferredStreamExpressions ? cfg.preferredStreamExpressions.filter(e=>e.enabled!==false).length : '0'));
            rows.push('<b style="color:#e6edf3">Sort keys:</b> ' + (cfg.sortCriteria?.global ? cfg.sortCriteria.global.length : 'inherited'));
            rows.push('<b style="color:#e6edf3">Title matching:</b> ' + (cfg.titleMatching?.enabled ? '<span style="color:#34d399">on</span>' : '<span style="color:#f87171">off</span>'));
            rows.push('<b style="color:#e6edf3">Year matching:</b> ' + (cfg.yearMatching?.enabled ? '<span style="color:#34d399">on</span>' : '<span style="color:#f87171">off</span>'));
            rows.push('<b style="color:#e6edf3">Cache mode:</b> ' + (cfg.excludeUncached ? 'cached only' : cfg.excludeCached ? 'uncached only' : 'mixed'));
            rows.push('<b style="color:#e6edf3">Stream pool:</b> ' + ({normal:'Normal',large:'Large',max:'Maximum'}[S.streamPool||'normal']) + ' (' + (cfg.maxResults || 'default') + ' max)');
            return rows.join('<br>');
          })()}
        </div>
      </details>
      <details style="margin-top:14px;border-top:1px solid rgba(255,255,255,.06);padding-top:14px">
        <summary style="list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-size:.76rem;font-weight:700;color:#4b5563;letter-spacing:.03em;user-select:none">
          <span>${ICO.rocket(13,'#8b949e')} Push to Stremio Library</span><span style="font-size:.7rem">›</span>
        </summary>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
          <input id="stremioEmail" type="email" placeholder="Stremio email" autocomplete="email" style="width:100%;box-sizing:border-box;background:#111720;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:9px 12px;color:#e6edf3;font-size:.82rem;outline:none">
          <input id="stremioPassword" type="password" placeholder="Stremio password" autocomplete="current-password" style="width:100%;box-sizing:border-box;background:#111720;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:9px 12px;color:#e6edf3;font-size:.82rem;outline:none">
          <button id="stremioInstallBtn" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid rgba(0,212,255,.3);background:rgba(0,212,255,.07);color:#00d4ff;font-size:.9rem;font-weight:700;cursor:pointer;transition:all .15s">${ICO.download(14,'#00d4ff')} Log in &amp; Install</button>
          <div id="stremioInstallResult" style="font-size:.75rem"></div>
        </div>
      </details>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.05);display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:6px 14px">
        <a href="https://corebuilds-docs.docsalot.dev/templates/directory" target="_blank" rel="noopener noreferrer" class="community-link">Browse Templates →</a>
        <a href="https://www.reddit.com/r/CoreBuilds/" target="_blank" rel="noopener noreferrer" class="community-link">Core Crew</a>
        <a href="https://github.com/brevityA/Core-Builds" target="_blank" rel="noopener noreferrer" class="community-link">GitHub</a>
        <a href="https://discord.gg/ZvjnKbrq" target="_blank" rel="noopener noreferrer" class="community-link">Discord</a>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const initFi = initialTab ? FMTS.findIndex(f => f.key === initialTab) : 0;
  const startFi = initFi > 0 ? initFi : 0;

  // Auto-copy the initial manifest URL to clipboard on modal open
  navigator.clipboard.writeText(FMTS[startFi].getUrl(manifestUrl)).then(() => {
    showToast('Manifest URL copied to clipboard');
    const cb = document.getElementById('mCopyUrl');
    if (cb) { cb.innerHTML = ICO.check(12,'currentColor'); cb.classList.add('copied'); setTimeout(() => { cb.textContent = 'Copy'; cb.classList.remove('copied'); }, 2200); }
  }).catch(() => {});

  const urlVal   = document.getElementById('mUrlVal');
  const qrImg    = document.getElementById('mQr');
  const actionBtn = document.getElementById('mActionBtn');
  let activeFi = 0;

  const BTN_CLS = ['m-install','m-web','m-wu','m-nuvio','m-web'];
  const BTN_LABELS = [
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>Install`,
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Web`,
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Open WuPlay`,
    `${ICO.nuvio(13)}Open Nuvio`,
    `${ICO.clipboard(13,'currentColor')}Copy Manifest`,
  ];

  function switchFmt(fi) {
    activeFi = fi;
    const f = FMTS[fi];
    const url = f.getUrl(manifestUrl);
    urlVal.textContent = url;
    if (qrImg) qrImg.src = qrSrc(url);
    // Auto-copy URL on every tab switch
    const copyBtn = document.getElementById('mCopyUrl');
    navigator.clipboard.writeText(url).then(() => {
      if (copyBtn) { copyBtn.innerHTML = ICO.check(12,'currentColor'); copyBtn.classList.add('copied'); setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2200); }
    }).catch(() => {});
    // action button
    actionBtn.className = `m-btn ${BTN_CLS[fi]}`;
    actionBtn.innerHTML = BTN_LABELS[fi];
    if (f.action === 'link') {
      actionBtn.href = url;
      actionBtn.target = fi === 1 ? '_blank' : '';
      actionBtn.onclick = null;
    } else if (f.action === 'open') {
      actionBtn.href = f.configUrl;
      actionBtn.target = '_blank';
      actionBtn.onclick = () => {
        navigator.clipboard.writeText(url).catch(() => {});
        showToast(`Manifest URL copied — opening ${f.label}…`);
      };
    } else {
      actionBtn.href = '#';
      actionBtn.target = '';
      actionBtn.onclick = ev => {
        ev.preventDefault();
        navigator.clipboard.writeText(url).then(() => showToast(`Copied! Paste into ${f.label} → Addons`));
      };
    }
    document.getElementById('mUrlLabel').innerHTML =
      fi === 2 ? 'Manifest URL — auto-copied ' + ICO.check(12,'currentColor') :
      fi === 3 ? 'Manifest URL — auto-copied ' + ICO.check(12,'currentColor') :
      fi === 4 ? 'Raw manifest URL — auto-copied ' + ICO.check(12,'currentColor') : 'Manifest URL';
    if (copyBtn) { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }
    const helpEl = document.getElementById('mAppHelp');
    const qrWrap = document.getElementById('mQrWrap');
    const qrHint = document.getElementById('mQrHint');
    if (fi === 2) {
      helpEl.style.display = '';
      document.getElementById('mAppHelpTitle').textContent = 'WuPlay Setup';
      document.getElementById('mAppHelpBody').innerHTML = '<strong style="color:#e6edf3">1.</strong> Manifest URL is <strong style="color:#3fb950">already copied</strong> to your clipboard<br><strong style="color:#e6edf3">2.</strong> Tap <strong style="color:#a78bfa">Open WuPlay</strong> below (or go to WuPlay → Addons)<br><strong style="color:#e6edf3">3.</strong> Tap <strong style="color:#a78bfa">Add Addon</strong> and paste the URL';
      if (qrWrap) qrWrap.style.display = 'none';
      if (qrHint) qrHint.style.display = 'none';
    } else if (fi === 3) {
      helpEl.style.display = '';
      document.getElementById('mAppHelpTitle').textContent = 'Nuvio Setup';
      document.getElementById('mAppHelpBody').innerHTML = '<strong style="color:#e6edf3">1.</strong> Manifest URL is <strong style="color:#3fb950">already copied</strong> to your clipboard<br><strong style="color:#e6edf3">2.</strong> Tap <strong style="color:#a78bfa">Open Nuvio</strong> below (or go to Nuvio → Account → Addons)<br><strong style="color:#e6edf3">3.</strong> Paste the URL in the addon field';
      if (qrWrap) qrWrap.style.display = 'none';
      if (qrHint) qrHint.style.display = 'none';
    } else {
      helpEl.style.display = 'none';
      if (qrWrap) qrWrap.style.display = '';
      if (qrHint) qrHint.style.display = '';
    }
  }

  document.getElementById('mFmtTabs').addEventListener('click', e => {
    const btn = e.target.closest('.fmt-tab');
    if (!btn) return;
    document.querySelectorAll('#mFmtTabs .fmt-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    switchFmt(parseInt(btn.dataset.fi));
  });

  document.getElementById('mCopyUrl').addEventListener('click', function() {
    navigator.clipboard.writeText(urlVal.textContent).then(() => {
      this.innerHTML = ICO.check(12,'currentColor'); this.classList.add('copied');
      setTimeout(() => { this.textContent = 'Copy'; this.classList.remove('copied'); }, 2200);
    });
  });

  if (password) {
    document.getElementById('mCopyPwd').addEventListener('click', function() {
      navigator.clipboard.writeText(password).then(() => {
        this.innerHTML = ICO.check(12,'currentColor'); this.classList.add('copied');
        setTimeout(() => { this.textContent = 'Copy'; this.classList.remove('copied'); }, 2200);
      });
    });
  }

  const close = () => {
    overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s';
    setTimeout(() => overlay.remove(), 160);
  };
  document.getElementById('mClose').addEventListener('click', close);
  document.getElementById('mDone').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  const escKey = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escKey); } };
  document.addEventListener('keydown', escKey);
  // Keep Tab focus inside the dialog
  overlay.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = overlay.querySelectorAll('button:not(:disabled), a[href], input, summary, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  if (startFi > 0) {
    document.querySelectorAll('#mFmtTabs .fmt-tab').forEach(t => t.classList.toggle('active', parseInt(t.dataset.fi) === startFi));
    switchFmt(startFi);
  }
  setTimeout(() => { const c = document.getElementById('mClose'); if (c) c.focus(); }, 50);

  document.getElementById('mTestStreams').addEventListener('click', async function() {
    const testBtn = this, resEl = document.getElementById('mTestResult');
    testBtn.disabled = true; testBtn.textContent = 'Testing…';
    resEl.innerHTML = '<span style="color:#8b949e">Checking catalog…</span>';
    const baseUrl = manifestUrl.replace(/\/manifest\.json$/, '');
    const testId = 'tt1375666';
    try {
      let r = null;
      if (CORS_PROXY) {
        try {
          r = await fetchWithTimeout(`${CORS_PROXY}/proxy/stream/movie/${testId}.json?host=${encodeURIComponent(baseUrl)}`, { method:'GET' }, 8000);
        } catch(err) {}
      }
      if (!r || !r.ok) {
        r = await fetchWithTimeout(`${baseUrl}/stream/movie/${testId}.json`, { method:'GET' }, 10000);
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const count = data?.streams?.length || 0;
      if (count > 0) {
        resEl.innerHTML = `<span style="color:#3fb950">${ICO.check(12,'#3fb950')} Found ${count} stream${count>1?'s':''} — your config is working!</span>`;
        testBtn.innerHTML = ICO.check(12,'currentColor') + ' Working'; testBtn.style.borderColor = 'rgba(63,185,80,.3)'; testBtn.style.color = '#3fb950';
      } else {
        resEl.innerHTML = `<span style="color:#f59e0b">${ICO.warn(12,'#f59e0b')} 0 streams returned — check your API key and try again in a few minutes</span>`;
        testBtn.disabled = false; testBtn.textContent = 'Retry';
      }
    } catch(e) {
      resEl.innerHTML = `<span style="color:#f87171">Could not reach the server — it may still be processing your config</span>`;
      testBtn.disabled = false; testBtn.textContent = 'Retry';
    }
  });

  document.getElementById('stremioInstallBtn').addEventListener('click', async () => {
    const email    = document.getElementById('stremioEmail').value.trim();
    const password = document.getElementById('stremioPassword').value;
    const resEl    = document.getElementById('stremioInstallResult');
    const btn      = document.getElementById('stremioInstallBtn');
    if (!email || !password) { resEl.innerHTML = `<span style="color:#f87171">Enter your Stremio email and password.</span>`; return; }
    btn.disabled = true; btn.textContent = 'Signing in…'; resEl.innerHTML = '';
    try {
      const SAPI = 'https://api.strem.io/api/';
      const loginRes = await fetch(SAPI, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'Login', email, password, facebook:false }) });
      const loginData = await loginRes.json();
      const authKey = loginData?.result?.authKey;
      if (!authKey) throw new Error(loginData?.error || 'Login failed — check your email and password.');
      btn.textContent = 'Installing…';
      const getRes = await fetch(SAPI, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'AddonCollectionGet', authKey, update:true }) });
      const getData = await getRes.json();
      if (!getData?.result?.addons) throw new Error(getData?.error || 'Could not fetch your addon list.');
      const existing = getData.result.addons;
      const already = existing.some(a => a.transportUrl === manifestUrl);
      if (!already) {
        const updated = [...existing, { transportName:'http', transportUrl: manifestUrl, flags:{} }];
        const setRes = await fetch(SAPI, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'AddonCollectionSet', authKey, addons: updated }) });
        const setData = await setRes.json();
        if (!setData?.result) throw new Error(setData?.error || 'Install failed.');
      }
      btn.innerHTML = ICO.check(12,'currentColor') + ' Installed!'; btn.style.borderColor = 'rgba(63,185,80,.4)'; btn.style.color = '#3fb950'; btn.style.background = 'rgba(63,185,80,.07)';
      resEl.innerHTML = already ? `<span style="color:#f59e0b">Already in your library.</span>` : `<span style="color:#3fb950">Done — reopen Stremio to see it.</span>`;
    } catch(err) {
      btn.disabled = false; btn.innerHTML = ICO.download(14,'#00d4ff') + ' Log in & Install';
      resEl.innerHTML = `<span style="color:#f87171">${err.message}</span>`;
    }
  });
}

function showApiReminder(onContinue) {
  const inputs = getDebridInputs();
  let el = document.getElementById('apiReminder');
  if (!el) {
    el = document.createElement('div');
    el.id = 'apiReminder';
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div id="apiReminderCard">
      <div class="rem-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div class="rem-title">Don't forget your API keys</div>
      <div class="rem-sub">Your template works without them, but you'll need to enter them in AIOStreams after importing. Bake them in now for a one-click setup.</div>
      <div class="rem-fields">
        ${inputs.map(inp => `
        <div>
          <div class="rem-field-lbl">
            <span class="rem-field-name">${inp.label}</span>
            <a href="${inp.url}" target="_blank" rel="noopener noreferrer" class="rem-field-link">Get key →</a>
          </div>
          <div style="position:relative;display:flex;align-items:center">
            <input class="rem-input" id="rem_${inp.id}" data-service="${inp.id}" data-action="update-cred"
              type="password"
              placeholder="${inp.placeholder}"
              value="${escH(S.creds[inp.id] || '')}" maxlength="120" style="padding-right:40px">
            <button type="button" data-action="toggle-cred-vis" data-target="rem_${inp.id}" title="Show / hide"
              style="position:absolute;right:10px;background:none;border:none;cursor:pointer;color:#4b5563;padding:0;line-height:1;transition:color .15s"
              onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>`).join('')}
      </div>
      <div class="rem-actions">
        <button class="rem-save" data-action="reminder-continue">Save &amp; Continue →</button>
        <button class="rem-skip" data-action="reminder-skip">Skip — I'll add them later in AIOStreams</button>
      </div>
    </div>`;
  el.classList.remove('hidden');
  if (el._remHandler) el.removeEventListener('click', el._remHandler, true);
  const handler = (e) => {
    const a = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
    if (a === 'reminder-continue' || a === 'reminder-skip') {
      el.classList.add('hidden');
      el.removeEventListener('click', handler, true);
      el._remHandler = null;
      onContinue();
    }
    if (e.target === el) {
      el.classList.add('hidden');
      el.removeEventListener('click', handler, true);
      el._remHandler = null;
    }
  };
  el._remHandler = handler;
  el.addEventListener('click', handler, true);
  // Focus first empty field
  const first = inputs.find(i => !S.creds[i.id]);
  if (first) { const f = document.getElementById('rem_' + first.id); if (f) setTimeout(() => f.focus(), 120); }
}

function showToast(msg, isError) {
  const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast' + (isError ? ' error' : '') + ' show';
  clearTimeout(t._timer); t._timer = setTimeout(() => { t.className = 'toast' + (isError ? ' error' : ''); }, 3200);
}

function togglePwd() {
  const el = document.getElementById('aioPwd'), eye = document.getElementById('pwdEye');
  if (!el) return;
  const show = el.type === 'password'; el.type = show ? 'text' : 'password';
  if (eye) eye.style.color = show ? '#00d4ff' : '#4b5563';
}

function makePwd() {
  const PWD_WORDS = ['Blue','Red','Dark','Bright','Swift','Deep','High','Storm','Wild','Sharp','Iron','Gold','Stone','Silver','Flash','Frost','Fire','Wind','Thunder','Star','River','Forest','Ocean','Mountain','Canyon','Desert','Arctic','Ember','Shadow','Crystal','Falcon','Tiger','Wolf','Eagle','Phoenix','Dragon','Hawk','Raven','Cobra','Viper'];
  const arr = new Uint8Array(4); crypto.getRandomValues(arr);
  return `${PWD_WORDS[arr[0] % PWD_WORDS.length]}${PWD_WORDS[arr[1] % PWD_WORDS.length]}${PWD_WORDS[arr[2] % PWD_WORDS.length]}${String(100 + (arr[3] % 900))}`;
}

function simpleFinishHtml() {
  const isFree = S.service === 'p2p' || S.service === 'http';
  const needed = getDebridInputs();
  const anyFilled = needed.some(i => S.creds[i.id] && S.creds[i.id].trim());
  const bits = [[ICO.plug(13,'#8b949e'), label('service', S.service)], [ICO.tv(13,'#8b949e'), label('device', S.device)], [ICO.monitor(13,'#8b949e'), label('resolution', S.resolution)], [ICO.speaker(13,'#8b949e'), label('audio', S.audio)]].filter(b => b[1]);
  return `
    <div class="card">
      <div style="text-align:center;padding:6px 0 2px">
        <div style="font-size:2rem;line-height:1">${ICO.confetti(32,'#fbbf24')}</div>
        <div style="font-size:1.25rem;font-weight:900;color:#e6edf3;margin-top:8px" class="wn-title">Almost done — one click left</div>
        <div style="font-size:.86rem;color:#8b949e;margin-top:6px;line-height:1.5">Enter your API key below, then tap create. Everything is handled behind the scenes — no extra steps.</div>
      </div>
      <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:7px;margin:16px 0">
        ${bits.map(([i2, t]) => `<span style="display:inline-flex;align-items:center;gap:6px;background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.16);border-radius:20px;padding:5px 13px;font-size:.8rem;font-weight:600;color:#9ca3af">${i2} ${t}</span>`).join('')}
      </div>
      ${renderOutputProfilePicker({ compact:true })}
      ${outputProfileAuditHtml()}
      ${(() => { const hint = DEVICE_BANDWIDTH_HINTS[S.device]; if (!hint) return ''; const bw = calculateBitrateLimit(hint.recommended); return `<div style="background:rgba(0,212,255,.03);border:1px solid rgba(0,212,255,.12);border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px"><span style="font-size:1.1rem">📶</span><div style="flex:1"><div style="font-size:.72rem;font-weight:700;color:#9ca3af">Bandwidth hint for your device</div><div style="font-size:.68rem;color:#6b7280;line-height:1.4">Recommended: <strong style="color:#00d4ff">${hint.recommended} Mbps+</strong> — ${hint.reason}. Safe bitrate cap: <strong style="color:#e6edf3">${bw.label}</strong> (${bw.description})</div></div></div>`; })()}
      ${needed.length ? `<div style="margin-bottom:14px">
        ${needed.map(inp => `
        <div class="name-row" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="color:#8b949e;font-size:.78rem;font-weight:700;letter-spacing:.04em">${inp.label}</span>
            ${inp.url ? `<a href="${inp.url}" target="_blank" rel="noopener noreferrer" style="font-size:.76rem;color:#00d4ff;text-decoration:none;font-weight:700">Get key →</a>` : ''}
          </div>
          <div style="position:relative;display:flex;align-items:center">
            <input class="name-input" id="cred_${inp.id}" data-service="${inp.id}" data-action="update-cred" type="password" placeholder="${inp.placeholder}"
              value="${escH(S.creds[inp.id] || '')}" maxlength="120" style="padding-right:38px">
            <button type="button" data-action="toggle-cred-vis" data-target="cred_${inp.id}" title="Show / hide"
              style="position:absolute;right:10px;background:none;border:none;cursor:pointer;color:#4b5563;padding:0;line-height:1;transition:color .15s"
              onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>`).join('')}
        ${!anyFilled ? `<div style="font-size:.74rem;color:#fbbf24;margin-top:4px">${ICO.warn(12,'#fbbf24')} Streams won't load without an API key</div>` : ''}
      </div>` : ''}
      <div style="border:1px solid ${S.tmdbToken||S.tmdbApiKey?'rgba(52,211,153,.25)':'rgba(251,191,36,.25)'};border-radius:10px;overflow:hidden;margin-bottom:14px;background:${S.tmdbToken||S.tmdbApiKey?'rgba(52,211,153,.03)':'rgba(251,191,36,.03)'}">
        <div style="padding:11px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.04)">
          <span style="display:flex;align-items:center;gap:8px">
            <span style="font-size:.75rem;font-weight:700;color:${S.tmdbToken||S.tmdbApiKey?'#34d399':'#fbbf24'};text-transform:uppercase;letter-spacing:.06em">${S.tmdbToken||S.tmdbApiKey?ICO.check(12,'#34d399')+' TMDB Connected':ICO.bolt(12,'#fbbf24')+' TMDB Key'}</span>
            ${S.tmdbToken||S.tmdbApiKey?'':'<span style="font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:3px;background:rgba(251,191,36,.12);color:#fbbf24;border:1px solid rgba(251,191,36,.3)">RECOMMENDED</span>'}
          </span>
        </div>
        ${S.tmdbToken||S.tmdbApiKey ? '' : `<div style="padding:10px 14px;font-size:.72rem;color:#9ca3af;line-height:1.6;border-bottom:1px solid rgba(255,255,255,.04)">
          <div style="font-weight:700;color:#e6edf3;margin-bottom:4px">Without a TMDB key, TMDB-powered filters are switched off automatically:</div>
          <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:8px">
            <span>× <b style="color:#fbbf24">Title matching</b> — similar names are not cross-checked</span>
            <span>× <b style="color:#fbbf24">Year matching</b> — remakes and reboots are not cross-checked</span>
            <span>× <b style="color:#fbbf24">Digital release filtering</b> — release dates are not checked</span>
          </div>
          <div style="font-weight:700;color:#e6edf3;margin-bottom:4px">How to get a free TMDB key (2 min):</div>
          <div style="display:flex;flex-direction:column;gap:2px">
            <span>1. Sign up at <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer" style="color:#00d4ff;font-weight:700;text-decoration:none">themoviedb.org/signup</a></span>
            <span>2. Go to <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" style="color:#00d4ff;font-weight:700;text-decoration:none">Settings → API</a> and request an API key</span>
            <span>3. Copy either the <b>Read Access Token</b> or the <b>API Key</b> below</span>
          </div>
        </div>`}
        <div style="padding:12px 14px">
          <div class="name-row" style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="color:#8b949e;font-size:.78rem;font-weight:700;letter-spacing:.04em">Read Access Token</span>
              <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" style="font-size:.76rem;color:#00d4ff;text-decoration:none;font-weight:700">Get key →</a>
            </div>
            <div style="position:relative;display:flex;align-items:center">
              <input class="name-input" id="tmdbIn" data-action="update-tmdb" type="password" placeholder="eyJhbGciOiJSUzI1NiJ9…"
                value="${escH(S.tmdbToken)}" maxlength="400" style="padding-right:38px">
              <button type="button" data-action="toggle-cred-vis" data-target="tmdbIn" title="Show / hide"
                style="position:absolute;right:10px;background:none;border:none;cursor:pointer;color:#4b5563;padding:0;line-height:1;transition:color .15s"
                onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div style="font-size:.68rem;color:#6b7280;margin-top:3px">The long token starting with <code style="color:#8b949e;font-family:monospace">eyJ</code></div>
            <span class="cred-status" id="tmdbStatus" role="status" aria-live="polite">${tmdbHint('token', S.tmdbToken)}</span>
          </div>
          <div class="name-row">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="color:#8b949e;font-size:.78rem;font-weight:700;letter-spacing:.04em">API Key</span>
              <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" style="font-size:.76rem;color:#00d4ff;text-decoration:none;font-weight:700">Get key →</a>
            </div>
            <div style="position:relative;display:flex;align-items:center">
              <input class="name-input" id="tmdbKeyIn" data-action="update-tmdb-key" type="password" placeholder="abc123def456…"
                value="${escH(S.tmdbApiKey)}" maxlength="60" style="padding-right:38px">
              <button type="button" data-action="toggle-cred-vis" data-target="tmdbKeyIn" title="Show / hide"
                style="position:absolute;right:10px;background:none;border:none;cursor:pointer;color:#4b5563;padding:0;line-height:1;transition:color .15s"
                onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div style="font-size:.68rem;color:#6b7280;margin-top:3px">The 32-character key</div>
            <span class="cred-status" id="tmdbKeyStatus" role="status" aria-live="polite">${tmdbHint('key', S.tmdbApiKey)}</span>
          </div>
        </div>
      </div>
      <details style="border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden;margin-bottom:14px">
        <summary style="list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:11px 14px;background:rgba(255,255,255,.02);user-select:none">
          <span style="display:flex;align-items:center;gap:8px">
            ${ICO.gear(14,'#8b949e')}
            <span style="font-size:.75rem;font-weight:700;color:#8b949e;text-transform:uppercase;letter-spacing:.06em">Fine-tune</span>
            <span style="font-size:.65rem;color:#4b5563;font-weight:600">optional</span>
          </span>
          <span style="font-size:.7rem;color:#374151">›</span>
        </summary>
        <div style="padding:12px 14px;border-top:1px solid rgba(255,255,255,.04);display:flex;flex-direction:column;gap:12px">
          <div>
            <div style="font-size:.72rem;font-weight:700;color:#8b949e;margin-bottom:6px">Formatter</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${FORMATTERS.slice(0,5).map(f => `<button data-action="set-simple-fmt" data-val="${f.id}" data-active="${S.formatter===f.id}" style="padding:5px 12px;border-radius:7px;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid ${S.formatter===f.id?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${S.formatter===f.id?'rgba(0,212,255,.1)':'transparent'};color:${S.formatter===f.id?'#00d4ff':'#6b7280'}">${f.label}</button>`).join('')}
            </div>
          </div>
          <div>
            <div style="font-size:.72rem;font-weight:700;color:#8b949e;margin-bottom:6px">Dedup matching</div>
            <div style="display:flex;gap:6px">
              ${[['strict','Strict'],['balanced','Balanced'],['relaxed','Relaxed']].map(([v,l]) => `<button data-action="set-simple-match" data-val="${v}" data-active="${S.matchMode===v}" style="flex:1;padding:5px 10px;border-radius:7px;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid ${S.matchMode===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${S.matchMode===v?'rgba(0,212,255,.1)':'transparent'};color:${S.matchMode===v?'#00d4ff':'#6b7280'}">${l}</button>`).join('')}
            </div>
          </div>
          <div>
            <div style="font-size:.72rem;font-weight:700;color:#8b949e;margin-bottom:6px">Cache mode</div>
            <div style="display:flex;gap:6px">
              ${[['mixed','Mixed'],['cached','Cached only'],['uncached','Uncached only']].map(([v,l]) => `<button data-action="set-simple-cache" data-val="${v}" data-active="${S.cacheMode===v}" style="flex:1;padding:5px 10px;border-radius:7px;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid ${S.cacheMode===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${S.cacheMode===v?'rgba(0,212,255,.1)':'transparent'};color:${S.cacheMode===v?'#00d4ff':'#6b7280'}">${l}</button>`).join('')}
            </div>
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span style="font-size:.72rem;font-weight:700;color:#8b949e">Stream pool</span>
              <span style="font-size:.6rem;color:#4b5563;font-weight:600">${{normal:'30–35 results',large:'50 results',max:'75 results'}[S.streamPool||'normal']}</span>
            </div>
            <div style="display:flex;gap:6px">
              ${[['normal','Normal','20'],['large','Large','30–35'],['max','Maximum','50']].map(([v,l,c]) => `<button data-action="set-simple-pool" data-val="${v}" data-active="${(S.streamPool||'normal')===v}" style="flex:1;padding:7px 10px 5px;border-radius:7px;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid ${(S.streamPool||'normal')===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${(S.streamPool||'normal')===v?'rgba(0,212,255,.1)':'transparent'};color:${(S.streamPool||'normal')===v?'#00d4ff':'#6b7280'};line-height:1.3">${l}<br><span style="font-size:.6rem;font-weight:600;opacity:.7">${c} results</span></button>`).join('')}
            </div>
            <div style="font-size:.65rem;color:#4b5563;margin-top:4px;line-height:1.4">More streams = better quality picks but slower load</div>
          </div>
          <div>
            <button data-action="set-simple-quality" data-active="${S.qualityFirst}" style="width:100%;padding:8px 12px;border-radius:7px;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid ${S.qualityFirst?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${S.qualityFirst?'rgba(0,212,255,.1)':'transparent'};color:${S.qualityFirst?'#00d4ff':'#6b7280'};display:flex;align-items:center;justify-content:space-between">
              <span>Quality over resolution</span>
              <span>${S.qualityFirst?ICO.check(13,'currentColor'):''}</span>
            </button>
            <div style="font-size:.65rem;color:#4b5563;margin-top:4px;line-height:1.4">A 1080p REMUX ranks above a 4K WEB-DL when enabled</div>
          </div>
          <div>
            <button data-action="set-simple-resfirst" data-active="${S.resolutionFirst}" style="width:100%;padding:8px 12px;border-radius:7px;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid ${S.resolutionFirst?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${S.resolutionFirst?'rgba(0,212,255,.1)':'transparent'};color:${S.resolutionFirst?'#00d4ff':'#6b7280'};display:flex;align-items:center;justify-content:space-between">
              <span>Resolution first</span>
              <span>${S.resolutionFirst?ICO.check(13,'currentColor'):''}</span>
            </button>
            <div style="font-size:.65rem;color:#4b5563;margin-top:4px;line-height:1.4">4K always ranks above 1080p/720p even if lower-res is cached</div>
          </div>
        </div>
      </details>
      <div class="name-row">
        <label>Template name (optional)</label>
        <input class="name-input" id="nameIn" type="text" placeholder="${escH(S.name)}" value="${escH(S.name)}" data-action="update-name" maxlength="60">
      </div>
      ${isFree ? `
      <button class="btn-manifest" id="btnAio" data-action="simple-install" data-target="app" style="margin-bottom:8px">${ICO.link(18,'currentColor')} Import to AIOStreams</button>
      <div style="font-size:.74rem;color:#6b7280;text-align:center;margin-top:8px;line-height:1.5">Free templates need manual import — we'll create a link and open AIOStreams for you.</div>
      <div id="aioResult"></div>` : `
      <div class="install-toggle" style="display:flex;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);padding:3px;margin-bottom:12px;gap:2px">
        <button data-action="set-install-mode" data-mode="direct" class="install-toggle-btn${S.installMode==='direct'?' active':''}" style="flex:1;padding:7px 8px;border-radius:8px;border:none;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;${S.installMode==='direct'?'background:var(--th-accent-bg);color:var(--th-accent)':'background:transparent;color:var(--th-tx3)'}">${ICO.rocket(12,'currentColor')} Direct Install</button>
        <button data-action="set-install-mode" data-mode="manifest" class="install-toggle-btn${S.installMode==='manifest'?' active':''}" style="flex:1;padding:7px 8px;border-radius:8px;border:none;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;${S.installMode==='manifest'?'background:var(--th-accent-bg);color:var(--th-accent)':'background:transparent;color:var(--th-tx3)'}">${ICO.link(12,'currentColor')} Manifest URL</button>
      </div>
      ${S.installMode === 'direct' ? `
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:10px">
        <input id="stremioEmailInline" type="email" placeholder="Stremio email" autocomplete="email" data-action="update-stremio-email"
          value="${escH(S.stremioEmail||'')}"
          style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 12px;color:var(--tx);font-size:.8rem;outline:none">
        <div style="position:relative">
          <input id="stremioPasswordInline" type="password" placeholder="Stremio password" autocomplete="current-password" data-action="update-stremio-password"
            value="${escH(S.stremioPassword||'')}"
            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 12px;padding-right:38px;color:var(--tx);font-size:.8rem;outline:none">
          <button type="button" data-action="toggle-stremio-pwd" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#4b5563;padding:2px;line-height:1;display:flex;align-items:center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <button type="button" data-action="create-stremio-account" style="align-self:flex-start;font-size:.7rem;color:#00d4ff;background:none;border:none;cursor:pointer;padding:0;font-weight:600;opacity:.8">Create random account →</button>
      </div>
      <button class="btn-manifest" id="btnAio" data-action="simple-install" data-target="app" style="margin-bottom:8px">${ICO.rocket(18,'currentColor')} Install to Stremio</button>
      ` : `
      <button class="btn-manifest" id="btnAio" data-action="simple-install" data-target="app" style="margin-bottom:8px">${ICO.rocket(18,'currentColor')} Deploy to Stremio</button>
      <div style="display:flex;gap:8px">
        <button class="btn-manifest" data-action="simple-install" data-target="wuplay" style="flex:1;font-size:.82rem;padding:11px 10px;background:rgba(167,139,250,.10);border-color:rgba(167,139,250,.3);color:#a78bfa">${ICO.wuplay(16,'#a78bfa')} WuPlay</button>
        <button class="btn-manifest" data-action="simple-install" data-target="nuvio" style="flex:1;font-size:.82rem;padding:11px 10px;background:rgba(168,85,247,.08);border-color:rgba(168,85,247,.25);color:#c084fc">${ICO.nuvio(16)} Nuvio</button>
      </div>
      `}
      <div id="aioResult"></div>`}
      <div style="display:flex;justify-content:center;gap:18px;margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06)">
        <button data-action="generate-dl" style="background:none;border:none;color:#67e8f9;font-size:.8rem;font-weight:700;cursor:pointer;padding:0">${ICO.download(13,'#67e8f9')} Export JSON instead</button>
        <button data-action="show-full-review" style="background:none;border:none;color:#6b7280;font-size:.8rem;font-weight:600;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px">Show all options →</button>
      </div>
    </div>`;
}

function promptPassword() {
  return new Promise((resolve) => {
    const autoPwd = makePwd();
    const overlay = document.createElement('div');
    overlay.id = 'pwdPrompt';
    overlay.innerHTML = `<div id="pwdPromptCard">
      <div class="pwd-title">${ICO.key(16,'#fbbf24')} Set a Password</div>
      <div class="pwd-sub">This password protects your AIOStreams config. You'll need it to edit your settings later.</div>
      <div class="pwd-option active" data-mode="auto">
        <div class="pwd-option-label">Auto-generate</div>
        <div class="pwd-option-hint">Strong random password — save it somewhere safe</div>
        <div class="pwd-auto-val">${autoPwd}</div>
      </div>
      <div class="pwd-option" data-mode="manual">
        <div class="pwd-option-label">Enter my own</div>
        <div class="pwd-option-hint">Use a password you'll remember</div>
        <input class="pwd-manual-input" type="text" placeholder="Type your password…" autocomplete="off" spellcheck="false" style="display:none">
      </div>
      <button class="pwd-go">Continue →</button>
      <button class="pwd-cancel">Cancel</button>
    </div>`;
    document.body.appendChild(overlay);
    let mode = 'auto';
    const opts = overlay.querySelectorAll('.pwd-option');
    const manualInput = overlay.querySelector('.pwd-manual-input');
    const goBtn = overlay.querySelector('.pwd-go');
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        mode = opt.dataset.mode;
        opts.forEach(o => o.classList.toggle('active', o === opt));
        manualInput.style.display = mode === 'manual' ? '' : 'none';
        if (mode === 'manual') { manualInput.focus(); goBtn.disabled = !manualInput.value.trim(); }
        else goBtn.disabled = false;
      });
    });
    manualInput.addEventListener('input', () => { goBtn.disabled = !manualInput.value.trim(); });
    manualInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && manualInput.value.trim()) done(); });
    const done = () => { overlay.remove(); resolve(mode === 'auto' ? autoPwd : manualInput.value.trim()); };
    const cancel = () => { overlay.remove(); resolve(null); };
    goBtn.addEventListener('click', done);
    overlay.querySelector('.pwd-cancel').addEventListener('click', cancel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cancel(); });
  });
}

function templateHealthCheck() {
  const warns = [];
  if (S.resolution === '1080p') {
    const profile = activeOutputProfile();
    if (profile === 'stable' || profile === 'balanced') {
      const cfg = buildFinal().config;
      const excluded = cfg.excludedResolutions || [];
      if (!excluded.includes('2160p') || !excluded.includes('1440p')) warns.push('1080p profile is missing native 4K/1440p exclusions — higher-resolution streams may leak through');
    } else {
      const ec = eses();
      const has1080pGuard = ec.some(e => e.expression && /resolution\s*\(\s*streams\s*,\s*'2160p'/.test(e.expression) && e.enabled !== false);
      if (!has1080pGuard) warns.push('1080p template missing 2160p exclusion ESE — 4K streams may leak through');
    }
  }
  if ((S.service === 'easynews' || S.multiServices.includes('easynews')) && (!S.creds.easynews || !S.creds.easynewsPass)) {
    warns.push('EasyNews selected but username or password is missing — Usenet streams won\'t load');
  }
  if ((S.subtitleAddons || []).includes('subdl') && !S.creds.subdl) {
    warns.push('SubDL subtitles enabled but API Key is missing — SubDL subtitles won\'t load');
  }
  if (S.audio === 'lossless' && DEVICE_FORCE_LIMITED_AUDIO.has(S.device)) warns.push('Lossless audio selected for a profile that does not reliably support passthrough');
  if (S.resolution === '4k' && S.device === 'firestick-hd') warns.push('4K resolution on Fire Stick HD — device cannot play 2160p');
  const credInputs = getDebridInputs();
  const filledCreds = credInputs.filter(i => S.creds[i.id] && S.creds[i.id].trim());
  if (credInputs.length && !filledCreds.length && !['p2p','http'].includes(S.service)) warns.push('No debrid API key — streams won\'t load');
  return warns;
}

// ── Template Health Score (unique to Core Builds) ──────────────────

function calculateHealthScore(prebuilt) {
  const built = prebuilt || buildFinal();
  const cfg = built.config;
  const breakdown = [];
  let score = 0, max = 0;
  const check = (label, maxPts, pts, reason) => { max += maxPts; score += Math.min(pts, maxPts); breakdown.push({ label, points: Math.min(pts, maxPts), max: maxPts, reason }); };

  if ((built.metadata?.coreBuildsProfile || activeOutputProfile()) === 'stable') {
    const complexity = inspectTemplateComplexity(built);
    const conflicts = findFeatureConflicts(built);
    const budget = validateOutputProfileBudget(built, 'stable');
    const sortKeys = (cfg.sortCriteria?.global || []).map(item => item.key);
    check('Stable complexity budget', 35, budget.ok ? 35 : 0, budget.ok ? 'No remote sync, groups, or dynamic exit' : `${budget.violations.length} budget check(s) exceeded`);
    check('Conflict checks', 25, conflicts.length ? 0 : 25, conflicts.length ? `${conflicts.length} conflict check(s) need review` : 'No redundant or contradictory rule stack');
    check('Device-safe native filters', 15, (cfg.excludedQualities?.length && cfg.preferredResolutions?.length) ? 15 : 6, 'Native quality and resolution policy');
    check('Predictable sort', 10, sortKeys.includes('resolution') && sortKeys.includes('quality') ? 10 : 4, 'Resolution and quality are explicit');
    check('Observable errors', 10, cfg.hideErrors === false && cfg.statistics?.enabled ? 10 : 3, 'Errors and timings stay visible');
    check('Distinct baseline coverage', 5, complexity.runtime.enabledPresets >= 3 ? 5 : 2, `${complexity.runtime.enabledPresets} enabled preset(s)`);
    const finalScore = Math.min(score, 100);
    return {
      score: finalScore,
      maxScore: 100,
      grade: finalScore >= 90 ? 'A' : finalScore >= 75 ? 'B' : finalScore >= 60 ? 'C' : 'D',
      summary: finalScore >= 90 ? 'Core Stable contract met' : finalScore >= 75 ? 'Core Stable needs a minor review' : 'Core Stable needs attention before install',
      breakdown,
    };
  }

  // 1. Sort criteria coverage (20)
  const sortKeys = (cfg.sortCriteria?.global || []).map(k => k.key);
  if (sortKeys.length >= 6) check('Sort criteria', 20, 20, `${sortKeys.length} keys — excellent`);
  else if (sortKeys.length >= 4) check('Sort criteria', 20, 15, `${sortKeys.length} keys — good`);
  else if (sortKeys.length >= 2) check('Sort criteria', 20, 10, `${sortKeys.length} keys — basic`);
  else check('Sort criteria', 20, 5, `${sortKeys.length} keys — add more`);

  // 2. Resolution + cached in sort (5)
  const hasRes = sortKeys.includes('resolution'), hasCached = sortKeys.includes('cached');
  if (hasRes && hasCached) check('Sort essentials', 5, 5, 'Resolution + cached present');
  else if (hasRes || hasCached) check('Sort essentials', 5, 3, 'Missing one of resolution/cached');
  else check('Sort essentials', 5, 0, 'Missing both');

  // 3. 0Cached ISE (15)
  const ises = cfg.includedStreamExpressions || [];
  if (ises.some(e => e.expression && /0Cached/i.test(e.expression))) check('0Cached ISE', 15, 15, 'Present — fallback when nothing cached');
  else check('0Cached ISE', 15, 0, 'Missing — no fallback for uncached');

  // 4. ESE coverage (10)
  const eses = cfg.excludedStreamExpressions || [];
  if (eses.length >= 5) check('Exclusion rules', 10, 10, `${eses.length} ESEs — thorough`);
  else if (eses.length >= 2) check('Exclusion rules', 10, 7, `${eses.length} ESEs — decent`);
  else if (eses.length >= 1) check('Exclusion rules', 10, 4, `${eses.length} ESE — minimal`);
  else check('Exclusion rules', 10, 0, 'No ESEs — no filtering');

  // 5. Device-aware exclusions (10)
  const esesText = eses.map(e => e.expression || '').join(' ');
  if (/visualTag|encode|resolution.*2160p/.test(esesText)) check('Device awareness', 10, 10, 'Device-aware exclusions present');
  else check('Device awareness', 10, 5, 'No device-aware exclusions');

  // 6. Formatter (10)
  const fmt = cfg.formatter || {};
  if (fmt.id === 'tamtaro' && fmt.definitions?.overrides?.tamtaro?.name) check('Formatter', 10, 10, 'Custom formatter');
  else if (fmt.id && fmt.id !== 'tamtaro') check('Formatter', 10, 7, `Built-in: ${fmt.id}`);
  else check('Formatter', 10, 3, 'No formatter');

  // 7. Title matching (5)
  const tm = cfg.titleMatching || {};
  if (tm.mode === 'fuzzy' && (tm.similarityThreshold || 0.85) <= 0.9) check('Title matching', 5, 5, `Fuzzy at ${tm.similarityThreshold || 0.85}`);
  else if (tm.mode === 'exact') check('Title matching', 5, 1, 'Exact — will miss variations');
  else check('Title matching', 5, 3, 'Default');

  // 8. Year matching (5)
  if (cfg.yearMatching?.strict === false) check('Year matching', 5, 5, 'Non-strict — allows remakes');
  else if (cfg.yearMatching?.strict === true) check('Year matching', 5, 2, 'Strict — may block valid');
  else check('Year matching', 5, 4, 'Default');

  // 9. Preset count (10)
  const presets = (cfg.presets || []).filter(p => p.enabled !== false);
  if (presets.length >= 4) check('Addon coverage', 10, 10, `${presets.length} presets — excellent`);
  else if (presets.length >= 2) check('Addon coverage', 10, 7, `${presets.length} presets — good`);
  else if (presets.length >= 1) check('Addon coverage', 10, 4, `${presets.length} preset — minimal`);
  else check('Addon coverage', 10, 0, 'No presets');

  // 10. Regex scoring (5)
  const ranked = cfg.rankedRegexPatterns || [];
  if (ranked.length >= 50) check('Regex scoring', 5, 5, `${ranked.length} patterns — full`);
  else if (ranked.length >= 10) check('Regex scoring', 5, 3, `${ranked.length} patterns — partial`);
  else check('Regex scoring', 5, 1, `${ranked.length} patterns — minimal`);

  // 11. Deduplicator (5)
  const dedup = cfg.deduplicator || {};
  if (dedup.cached && dedup.uncached) check('Deduplicator', 5, 5, `${dedup.cached} / ${dedup.uncached}`);
  else if (dedup.cached || dedup.uncached) check('Deduplicator', 5, 3, 'Partial');
  else check('Deduplicator', 5, 2, 'Default');

  const finalScore = Math.min(score, 100);
  const grade = finalScore >= 90 ? 'A' : finalScore >= 75 ? 'B' : finalScore >= 60 ? 'C' : finalScore >= 40 ? 'D' : 'F';
  const summary = finalScore >= 90 ? 'Excellent template' : finalScore >= 75 ? 'Good template — minor improvements possible' : finalScore >= 60 ? 'Decent — consider adding more features' : finalScore >= 40 ? 'Basic — significant improvements recommended' : 'Minimal — needs major configuration';
  return { score: finalScore, maxScore: 100, grade, summary, breakdown };
}

function healthScoreHtml() {
  const r = calculateHealthScore(_cachedBuildResult);
  const color = r.grade === 'A' ? '#34d399' : r.grade === 'B' ? '#00d4ff' : r.grade === 'C' ? '#fbbf24' : r.grade === 'D' ? '#f97316' : '#f87171';
  const pct = Math.round(r.score / r.maxScore * 100);
  const ring = `background:conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,.06) 0deg)`;
  const rows = r.breakdown.map(b => {
    const barColor = b.points === b.max ? '#34d399' : b.points === 0 ? '#f87171' : '#fbbf24';
    return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0"><span style="font-size:.68rem;color:#8b949e;flex:1;min-width:0">${b.label}</span><span style="font-size:.65rem;color:${barColor};font-weight:700;flex-shrink:0">${b.points}/${b.max}</span></div>`;
  }).join('');
  return `<div style="margin-top:10px;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06)">
    <div style="display:flex;align-items:center;gap:16px">
      <div style="width:64px;height:64px;border-radius:50%;${ring};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <div style="width:52px;height:52px;border-radius:50%;background:#0d1117;display:flex;align-items:center;justify-content:center;flex-direction:column">
          <span style="font-size:1.1rem;font-weight:900;color:${color}">${r.score}</span>
          <span style="font-size:.55rem;font-weight:700;color:${color};opacity:.7">${r.grade}</span>
        </div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.78rem;font-weight:700;color:#e6edf3">Template Health Score</div>
        <div style="font-size:.68rem;color:${color};font-weight:600;margin-top:2px">${r.summary}</div>
        <div style="font-size:.62rem;color:#4b5563;margin-top:2px">${r.breakdown.filter(b=>b.points===b.max).length}/${r.breakdown.length} checks passed</div>
      </div>
    </div>
    <details style="margin-top:10px"><summary style="list-style:none;cursor:pointer;font-size:.68rem;font-weight:600;color:#4b5563;display:flex;align-items:center;gap:4px"><span style="font-size:.55rem">▶</span> Breakdown</summary>
    <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.04)">${rows}</div></details>
  </div>`;
}

// ── Template Versioning ────────────────────────────────────────────

const TEMPLATE_VERSION = CONFIGURATOR_VERSION;

function addVersionMetadata(template) {
  if (!template.metadata) template.metadata = {};
  template.metadata.coreBuildsVersion = TEMPLATE_VERSION;
  template.metadata.generatedAt = new Date().toISOString();
  return template;
}

function checkTemplateVersion() {
  try {
    const last = JSON.parse(localStorage.getItem('coreBuildLastGen') || 'null');
    if (!last) return null;
    const ver = last._ver || last.coreBuildsVersion;
    // Legacy snapshots without version metadata cannot be classified reliably.
    if (!ver) return null;
    const installed = ver.split('.').map(Number);
    const current = TEMPLATE_VERSION.split('.').map(Number);
    let outdated = false;
    for (let i = 0; i < Math.max(installed.length, current.length); i++) {
      const a = installed[i] || 0, b = current[i] || 0;
      if (b > a) { outdated = true; break; }
      if (a > b) break;
    }
    const ts = last._ts;
    const daysOld = ts ? Math.floor((Date.now() - ts) / 86400000) : null;
    return { outdated, installed: ver, current: TEMPLATE_VERSION, daysOld, message: outdated ? `v${ver} is outdated — v${TEMPLATE_VERSION} available` : `v${ver} is current` };
  } catch(e) { return null; }
}

function versionBannerHtml() {
  const v = checkTemplateVersion();
  if (!v || !v.outdated) return '';
  return `<div style="padding:10px 14px;border-radius:10px;background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.15);margin-bottom:12px;display:flex;align-items:center;gap:10px">
    <span style="font-size:1.1rem">🔄</span>
    <div style="flex:1">
      <div style="font-size:.78rem;font-weight:700;color:#00d4ff">Update Available</div>
      <div style="font-size:.7rem;color:#8b949e">${v.message}${v.daysOld ? ` · ${v.daysOld} days old` : ''}</div>
    </div>
    <button data-action="start-fresh" style="padding:6px 14px;border-radius:7px;border:1px solid rgba(0,212,255,.25);background:rgba(0,212,255,.06);color:#00d4ff;font-size:.72rem;font-weight:700;cursor:pointer">Rebuild →</button>
  </div>`;
}

function hostCompatCheck() {
  const cfg = buildFinal().config;
  const FORTHEWEAK_BLOCKED = ['Radarr Web T1','Sonarr Web T1','Radarr Bad Dual Groups','Sonarr Bad Dual Groups','hallowed','LQ (Radarr)','LQ (Radarr) [B]','LQ (Sonarr)','LQ (Sonarr) [B]','LQ (Release Title) (Radarr)','LQ (Release Title) (Sonarr)'];
  const TAMTARO_URL_FRAGMENT = 'Tam-Taro/SEL-Filtering-and-Sorting';
  const TAMTARO_OLD_URL_FRAGMENT = 'Tamtaro/SEL-Filtering-and-Sorting';
  const regexFields = [
    ...(cfg.rankedRegexPatterns||[]),
    ...(cfg.excludedRegexPatterns||[]).map((p,i) => typeof p === 'string' ? {name:'Excluded #'+(i+1), pattern:p} : p),
    ...(cfg.preferredRegexPatterns||[]),
  ];
  const syncedUrls = [
    ...(cfg.syncedRankedRegexUrls||[]),
    ...(cfg.syncedExcludedRegexUrls||[]),
    ...(cfg.syncedIncludedStreamExpressionUrls||[]),
    ...(cfg.syncedPreferredStreamExpressionUrls||[]),
    ...(cfg.syncedExcludedStreamExpressionUrls||[]),
  ];
  const hosts = {
    selfhosted: { label:'Self-Hosted', issues:[], status:'ok' },
    elfhosted:  { label:'ElfHosted', issues:[], status:'ok' },
    fortheweak: { label:'ForTheWeak', issues:[], status:'ok' },
  };
  const tamtaroUrls = syncedUrls.filter(u => u.includes(TAMTARO_URL_FRAGMENT) || u.includes(TAMTARO_OLD_URL_FRAGMENT));
  if (tamtaroUrls.length) {
    hosts.elfhosted.issues.push('Tam-Taro synced URL not on elfhosted allowlist — will cause "Forbidden URL" error');
    hosts.elfhosted.status = 'err';
  }
  const ranked = cfg.rankedRegexPatterns||[];
  const ftwBlocked = ranked.filter(r => FORTHEWEAK_BLOCKED.includes(r.name));
  if (ftwBlocked.length) {
    hosts.fortheweak.issues.push(ftwBlocked.length + ' regex pattern' + (ftwBlocked.length>1?'s':'') + ' blocked on fortheweak: ' + ftwBlocked.map(r=>r.name).slice(0,4).join(', ') + (ftwBlocked.length>4?'…':''));
    hosts.fortheweak.status = 'err';
  }
  const allExprs = [
    ...(cfg.excludedStreamExpressions||[]),
    ...(cfg.includedStreamExpressions||[]),
    ...(cfg.preferredStreamExpressions||[]),
  ];
  const hasNot = allExprs.some(e => e.expression && /\bnot\s*\(/.test(e.expression));
  if (hasNot) {
    hosts.elfhosted.issues.push('SEL uses not() — must use negate() instead');
    hosts.elfhosted.status = 'err';
    hosts.fortheweak.issues.push('SEL uses not() — must use negate() instead');
    hosts.fortheweak.status = 'err';
  }
  const excluded = cfg.excludedRegexPatterns||[];
  const inlinePatterns = excluded.filter(p => {
    const s = typeof p === 'string' ? p : (p.pattern||'');
    return /\(\?[=!<]/.test(s);
  });
  if (!cfg.syncedRankedRegexUrls || !cfg.syncedRankedRegexUrls.some(u => u.includes('Vidhin05'))) {
    if (ranked.length) {
      hosts.elfhosted.issues.push('No Vidhin05 synced URL — inline regex patterns may not be whitelisted');
      if (hosts.elfhosted.status === 'ok') hosts.elfhosted.status = 'warn';
    }
  }
  const customSyncUrls = syncedUrls.filter(u => !u.includes('Vidhin05') && !u.includes(TAMTARO_URL_FRAGMENT) && !u.includes(TAMTARO_OLD_URL_FRAGMENT) && !u.includes('brevityA/Core-Builds'));
  if (customSyncUrls.length) {
    hosts.elfhosted.issues.push(customSyncUrls.length + ' custom synced URL' + (customSyncUrls.length>1?'s':'') + ' — may not be on host allowlist');
    if (hosts.elfhosted.status === 'ok') hosts.elfhosted.status = 'warn';
    hosts.fortheweak.issues.push(customSyncUrls.length + ' custom synced URL' + (customSyncUrls.length>1?'s':'') + ' — may not be on host allowlist');
    if (hosts.fortheweak.status === 'ok') hosts.fortheweak.status = 'warn';
  }
  return hosts;
}

function hostCompatHtml() {
  const hosts = hostCompatCheck();
  const order = ['selfhosted','elfhosted','fortheweak'];
  const statusLabel = {ok:'Compatible',warn:'Possible issues',err:'Blocked'};
  const statusColor = {ok:'#34d399',warn:'#fbbf24',err:'#f87171'};
  const allOk = order.every(k => hosts[k].status === 'ok');
  const rows = order.map(k => {
    const h = hosts[k];
    const badge = `<span class="hc-badge hc-badge-${h.status}"></span>`;
    const issues = h.issues.length ? `<div class="hc-detail">${h.issues.map(i => `<div class="hc-issue"><span class="hc-issue-ico" style="color:${statusColor[h.status]}">${h.status==='err'?'✕':'⚠'}</span><span>${i}</span></div>`).join('')}</div>` : '';
    return `<div class="hc-row">${badge}<span class="hc-name">${h.label}</span><span class="hc-status" style="color:${statusColor[h.status]}">${statusLabel[h.status]}</span></div>${issues}`;
  }).join('');
  return `<div class="hc-box"><div class="hc-hdr" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">${allOk ? ICO.check(12,'#34d399') : ICO.warn(12,'#fbbf24')} Host Compatibility <span style="margin-left:auto;font-size:.65rem;opacity:.6">▼</span></div><div class="hc-hosts">${rows}</div></div>`;
}

const TROUBLESHOOT_TREE = {
  root: {
    q: 'What issue are you experiencing?',
    opts: [
      { label: 'No streams showing', next: 'noStreams' },
      { label: 'Import / "Invalid input" error', next: 'importErr' },
      { label: 'Wrong quality or resolution', next: 'wrongQuality' },
      { label: 'Streams buffer or won\'t play', next: 'buffering' },
    ]
  },
  noStreams: {
    q: 'Are you seeing zero streams, or just fewer than expected?',
    opts: [
      { label: 'Zero streams', next: 'zeroStreams' },
      { label: 'Fewer than expected', next: 'fewStreams' },
    ]
  },
  zeroStreams: {
    q: 'Which service type are you using?',
    opts: [
      { label: 'Debrid (TorBox, RD, AllDebrid, etc.)', next: 'zeroDebrid' },
      { label: 'P2P / Free', next: 'zeroP2p' },
      { label: 'EasyNews / Usenet', next: 'zeroUsenet' },
    ]
  },
  zeroDebrid: {
    q: 'Check these common causes:',
    tips: [
      '🔑 <b>API key missing or expired</b> — Re-enter your debrid API key in AIOStreams settings. TorBox keys expire periodically.',
      '🔌 <b>Addon down</b> — Try disabling addons one by one. Comet, MediaFusion, and Torrentio occasionally go offline.',
      '⏱️ <b>Timeout too low</b> — If your instance has a short timeout (< 15s), addons may not respond in time. Try a larger stream pool or a different host.',
      '🧊 <b>Cached-only mode with nothing cached</b> — If you set Cache Mode to "Cached Only", there may be no cached results for niche content. Try "Mixed".',
    ],
    action: { label: 'Switch to Mixed cache mode', key: 'cacheMode', val: 'mixed', desc: 'Allows both cached and uncached streams' }
  },
  zeroP2p: {
    q: 'P2P streams depend on seeders and addon availability:',
    tips: [
      '🌐 <b>Torrentio may be blocked</b> — Torrentio is blocked on elfhosted by developer request. Use a different host or addon.',
      '📡 <b>No seeders</b> — Niche or old content may have zero active seeders. This is a content availability issue, not a config problem.',
      '🔒 <b>ISP blocking</b> — Some ISPs block torrent traffic. A VPN may help.',
    ]
  },
  zeroUsenet: {
    q: 'Usenet stream troubleshooting:',
    tips: [
      '🔑 <b>EasyNews credentials</b> — Verify your EasyNews username and password are entered correctly in AIOStreams.',
      '📦 <b>Newznab indexer</b> — NZBGeek and other indexers require a valid API key. Check it hasn\'t expired.',
      '🆕 <b>Content too new</b> — Usenet retention varies. Very new releases may not be indexed yet.',
    ]
  },
  fewStreams: {
    q: 'Fewer streams usually means filters are too aggressive:',
    tips: [
      '🚫 <b>Excluded regex too strict</b> — The 8 default excluded regex patterns filter known-bad groups. If you added custom exclusions, try removing them.',
      '📏 <b>Size limit too low</b> — A 10GB limit will exclude most 4K content. Try 30GB or unlimited.',
      '🎯 <b>Match mode too strict</b> — "Strict" mode filters aggressively. Try "Balanced" or "Relaxed".',
      '🔍 <b>ESE killing valid streams</b> — Score IQR Guard or resolution kill ESEs may be excluding streams. Check the ESE section in your template.',
    ],
    action: { label: 'Set match mode to Balanced', key: 'matchMode', val: 'balanced', desc: 'Less aggressive stream filtering' }
  },
  importErr: {
    q: 'What error message do you see?',
    opts: [
      { label: '"Invalid input" / validation error', next: 'invalidInput' },
      { label: '"Forbidden URL" error', next: 'forbiddenUrl' },
      { label: 'Regex not allowed / not whitelisted', next: 'regexBlocked' },
    ]
  },
  invalidInput: {
    q: 'Common causes of "Invalid input":',
    tips: [
      '📋 <b>Corrupted JSON</b> — If you hand-edited the template, a missing comma or bracket breaks parsing. Re-export from the configurator.',
      '🏷️ <b>Unknown or legacy preset</b> — "torbox" was deprecated in v2.30.2 and the legacy "torbox-search" built-in was removed in AIOStreams v2.32. Use the v2.31 compatibility lane or validate a separate Newznab endpoint before migration.',
      '📏 <b>Schema mismatch</b> — AIOStreams schema evolves. Templates from older configurator versions may use fields that changed. Upgrade by re-generating.',
    ],
    action: { label: 'Re-generate with latest configurator', key: '_regen', desc: 'Rebuilds your template with current schema' }
  },
  forbiddenUrl: {
    q: '"Forbidden URL" means the host doesn\'t trust a synced URL in your template:',
    tips: [
      '🔗 <b>Tam-Taro URL</b> — elfhosted\'s allowlist hasn\'t been updated for the Tam-Taro account rename. The configurator no longer includes this URL — re-generate your template.',
      '🌐 <b>Custom synced URLs</b> — Public hosts only allow specific synced URLs. Self-hosted instances allow any URL.',
      '✅ <b>Check Host Compatibility</b> — The checker above shows which hosts will accept your template.',
    ]
  },
  regexBlocked: {
    q: 'Regex pattern whitelist issues:',
    tips: [
      '📝 <b>Vidhin05 whitelist</b> — elfhosted and fortheweak validate all regex patterns against Vidhin05\'s regexes.json. Custom patterns will be rejected.',
      '🚫 <b>fortheweak is stricter</b> — 11 patterns that pass elfhosted are blocked on fortheweak (LQ variants, Bad Dual Groups, etc.). The configurator excludes these automatically.',
      '🔄 <b>Pattern drift</b> — If Vidhin05 updates their file, previously-valid patterns may stop working. Re-generate your template to get the latest compatible set.',
    ]
  },
  wrongQuality: {
    q: 'What quality issue are you seeing?',
    opts: [
      { label: '4K content playing at 1080p', next: 'no4k' },
      { label: 'Low quality streams ranked too high', next: 'lowQualityHigh' },
      { label: 'Missing HDR / Dolby Vision', next: 'noHdr' },
    ]
  },
  no4k: {
    q: '4K not appearing:',
    tips: [
      '📐 <b>Resolution set to 1080p</b> — Check your configurator resolution setting. 1080p templates actively exclude 4K content via ESEs.',
      '📺 <b>Device doesn\'t support 4K</b> — Fire Stick HD and some older devices can\'t do 4K. The configurator auto-detects this.',
      '🔢 <b>Sort criteria</b> — If resolution isn\'t high in your sort order, 4K streams may be buried below 1080p ones.',
    ],
    action: { label: 'Switch to 4K resolution', key: 'resolution', val: '4k', desc: 'Enables 4K stream selection' }
  },
  lowQualityHigh: {
    q: 'Low quality streams appearing above better ones:',
    tips: [
      '⚖️ <b>PSE architecture</b> — Standard mode uses simple quality tiers. Switch to "Apex IQR" for statistical bitrate filtering that pushes low-quality outliers down.',
      '📊 <b>Regex scoring inactive</b> — If rankedRegexPatterns is empty, the regexScore sort key is a no-op. Re-generate to get the 107-entry scored set.',
      '🎯 <b>Sort order matters</b> — seScore should be early in sort criteria (position 3-4). If it\'s too low, quality signals are ignored.',
    ],
    action: { label: 'Enable Apex IQR mode', key: 'pseArch', val: 'iqr', desc: 'Statistical bitrate filtering for better quality ranking' }
  },
  noHdr: {
    q: 'HDR / Dolby Vision not appearing:',
    tips: [
      '🚫 <b>DV excluded</b> — Check if "Exclude Dolby Vision" is enabled in your configurator settings.',
      '📺 <b>Device HDR support</b> — Samsung TVs and some Fire Sticks don\'t support DV Profile 7. The configurator may have auto-excluded it based on your device.',
      '📊 <b>Visual tag sort position</b> — In 1080p templates, visualTag is sorted lower since HDR is less relevant. For 4K, it should be at position 8-9.',
    ]
  },
  buffering: {
    q: 'Buffering and playback issues:',
    tips: [
      '📏 <b>File too large for your connection</b> — A 60GB remux needs ~80Mbps sustained. Set a size limit (20-30GB) or switch to Standard quality mode.',
      '🧊 <b>Uncached streams</b> — Uncached debrid streams download in real-time and may buffer. Set Cache Mode to "Cached Only" for instant playback.',
      '🔄 <b>Codec incompatibility</b> — AV1 and VC-1 codecs aren\'t supported on all devices. Samsung templates exclude these automatically.',
      '🌐 <b>CDN congestion</b> — Debrid CDN speeds vary by time of day and region. Try a different debrid service or wait.',
    ],
    action: { label: 'Switch to Cached Only', key: 'cacheMode', val: 'cached', desc: 'Only shows pre-cached instant-play streams' }
  },
};
let _tsNode = 'root';
let _tsHistory = [];
function troubleshootHtml() {
  const node = TROUBLESHOOT_TREE[_tsNode];
  if (!node) return '';
  const back = _tsHistory.length ? `<button data-action="ts-back" style="padding:4px 12px;font-size:.7rem;font-weight:600;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:transparent;color:#8b949e;cursor:pointer;margin-bottom:8px">← Back</button>` : '';
  let body = `<div style="font-size:.82rem;font-weight:600;color:#c9d1d9;margin-bottom:10px">${node.q}</div>`;
  if (node.opts) {
    body += node.opts.map((o, i) => `<button data-action="ts-choose" data-next="${o.next}" style="display:block;width:100%;text-align:left;padding:10px 14px;margin-bottom:6px;font-size:.78rem;font-weight:600;border-radius:8px;border:1px solid rgba(0,212,255,.12);background:rgba(0,212,255,.03);color:#8bb8c9;cursor:pointer;transition:all .12s" onmouseover="this.style.background='rgba(0,212,255,.1)';this.style.borderColor='rgba(0,212,255,.3)'" onmouseout="this.style.background='rgba(0,212,255,.03)';this.style.borderColor='rgba(0,212,255,.12)'">${o.label}</button>`).join('');
  }
  if (node.tips) {
    body += `<div style="display:flex;flex-direction:column;gap:8px">` + node.tips.map(t => `<div style="padding:8px 12px;border-radius:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);font-size:.74rem;color:#8b949e;line-height:1.5">${t}</div>`).join('') + `</div>`;
  }
  if (node.action && node.action.key !== '_regen') {
    const current = S[node.action.key];
    const alreadySet = current === node.action.val;
    body += `<button data-action="ts-fix" data-key="${node.action.key}" data-val="${node.action.val}" style="margin-top:10px;padding:9px 16px;font-size:.76rem;font-weight:700;border-radius:8px;border:1px solid ${alreadySet?'rgba(52,211,153,.3)':'rgba(0,212,255,.25)'};background:${alreadySet?'rgba(52,211,153,.08)':'rgba(0,212,255,.08)'};color:${alreadySet?'#34d399':'#00d4ff'};cursor:pointer;transition:all .12s" ${alreadySet?'disabled':''}>${alreadySet ? '✓ Already applied' : '⚡ ' + node.action.label}</button><div style="font-size:.65rem;color:#6b7280;margin-top:3px">${node.action.desc}</div>`;
  }
  return back + body;
}
function handleDeepLink(hash) {
  if (!hash || hash.startsWith('#cfg=')) return;
  if (hash === '#troubleshooter') { setTimeout(showTroubleshooter, 300); return; }
  if (hash === '#health-score') { step = STEPS; pushStep(); render(); window.scrollTo(0, 0); return; }
}

function showTroubleshooter() {
  _tsNode = 'root';
  _tsHistory = [];
  const trigger = document.activeElement;
  const modal = document.createElement('div');
  modal.id = 'tsModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Troubleshooter');
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(4px)';
  modal.innerHTML = `<div style="width:min(480px,90vw);max-height:80vh;overflow-y:auto;background:#0d1117;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.6)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-size:.88rem;font-weight:700;color:#c9d1d9">🔧 Troubleshooter</div><button data-action="ts-close" aria-label="Close troubleshooter" style="padding:4px 8px;font-size:.9rem;background:none;border:none;color:#8b949e;cursor:pointer">✕</button></div><div id="tsBody">${troubleshootHtml()}</div></div>`;
  const closeModal = () => { modal.remove(); if (trigger && trigger.focus) trigger.focus(); };
  modal.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); closeModal(); return; }
    if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll('button,a,[tabindex]');
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-action="ts-close"]')) { closeModal(); return; }
    const a = (e.target.closest('[data-action]') || e.target).dataset.action;
    if (a === 'ts-choose') {
      const next = (e.target.closest('[data-next]') || e.target).dataset.next;
      _tsHistory.push(_tsNode);
      _tsNode = next;
      document.getElementById('tsBody').innerHTML = troubleshootHtml();
    }
    if (a === 'ts-back') {
      _tsNode = _tsHistory.pop() || 'root';
      document.getElementById('tsBody').innerHTML = troubleshootHtml();
    }
    if (a === 'ts-fix') {
      const key = e.target.dataset.key, val = e.target.dataset.val;
      S[key] = val;
      saveState();
      render();
      document.getElementById('tsBody').innerHTML = troubleshootHtml();
      showToast('Applied: ' + key + ' → ' + val);
    }
  });
  document.body.appendChild(modal);
  const firstBtn = modal.querySelector('button[data-action="ts-choose"],button[data-action="ts-close"]');
  if (firstBtn) firstBtn.focus();
}

async function preflightCheck() {
  const warns = [];
  const needed = getDebridInputs();
  const hasCreds = needed.some(i => S.creds[i.id] && S.creds[i.id].trim());
  if (needed.length && !hasCreds && !['p2p','http'].includes(S.service)) warns.push('No API key entered — streams will not load without one');
  if (S.resolution === '4k' && S.device === 'firestick-hd') warns.push('Fire Stick HD cannot play 4K — consider 1080p resolution');
  if (S.multiServices.includes('easynews') && !S.creds.easynews) warns.push('EasyNews selected but no username entered');
  if (S.multiServices.includes('easynews') && !S.creds.easynewsPass) warns.push('EasyNews selected but no password entered');
  if (S.multiServices.includes('nzbgeek') && !S.creds.nzbgeek) warns.push('NZBGeek selected but no API key entered');
  if (S.multiServices.includes('debridio') && !S.creds.debridio) warns.push('Debridio selected but no API key entered — its preset is omitted until a key is added');
  if (S.multiServices.includes('debrider') && !S.creds.debrider) warns.push('Debrider selected but no API key entered — its preset is omitted until a key is added');
  if (S.multiServices.includes('streamnzb') && !S.creds.streamnzb) warns.push('StreamNZB selected but no manifest URL entered');
  if (S.audio === 'lossless' && DEVICE_FORCE_LIMITED_AUDIO.has(S.device)) warns.push('Lossless audio selected but this device profile does not reliably support passthrough');
  try {
    const cfg = buildFinal()?.config;
    if (!cfg || !Array.isArray(cfg.presets)) warns.push('Generated template is missing its preset list');
    const names=(cfg?.presets||[]).map(p=>p.name).filter(Boolean), duplicates=[...new Set(names.filter((n,i)=>names.indexOf(n)!==i))];
    if (duplicates.length) warns.push('Duplicate preset names detected: '+duplicates.slice(0,3).join(', '));
    const health=templateHealthCheck(); health.forEach(w=>{if(!warns.includes(w))warns.push(w);});
    const profileAudit = outputProfileAudit();
    if (!profileAudit.budget.ok) {
      warns.push(`${OUTPUT_PROFILE_INFO[profileAudit.profile].label} complexity budget exceeded — review the profile warnings before installing`);
    }
    profileAudit.conflicts.filter(item => item.severity !== 'info').slice(0, 3).forEach(item => {
      const message = `${item.title}: ${item.message}`;
      if (!warns.includes(message)) warns.push(message);
    });
    const compat=hostCompatCheck();
    const selected=S.instanceHost && compat[S.instanceHost];
    if (selected?.status==='err') warns.push((selected.label||S.instanceHost)+' host compatibility check is blocked');
  } catch(e) { warns.push('Template preflight could not complete: '+e.message); }
  return warns;
}

function applyQuickProfile(profile) {
  S.quickProfile = profile;
  S.device = 'generic';
  S.content = 'all';
  S.formatter = 'family-v4';
  S.matchMode = 'balanced';
  S.excludeDV = false;
  S.exclude4K = false;
  if (profile === 'fast') {
    Object.assign(S, { resolution:'1080p', audio:'limited', cacheMode:'cached', streamPool:'normal', sizeLimit:'20', qualityFirst:false, resolutionFirst:true });
  } else if (profile === 'maximum') {
    Object.assign(S, { resolution:'4k', audio:'standard', cacheMode:'mixed', streamPool:'max', sizeLimit:'unlimited', qualityFirst:true, resolutionFirst:false });
  } else {
    Object.assign(S, { resolution:'4k', audio:'standard', cacheMode:'mixed', streamPool:'normal', sizeLimit:'30', qualityFirst:false, resolutionFirst:true });
  }
}

function showAdditionalServicesPicker(options={}) {
  document.getElementById('additionalServicesModal')?.remove();
  const serviceDef=DEFS.find(d=>d.key==='service');
  const selectedServices=new Set(options.services || S.multiServices.filter(v=>CAROUSEL_SVCS.includes(v)));
  const selectedScrapers=new Set(options.scrapers || S.optionalScrapers||[]);
  const serviceCards=CAROUSEL_SVCS.map(id=>{const o=serviceDef?.opts.find(x=>x.v===id);if(!o)return'';return `<button type="button" class="fastlane-choice${selectedServices.has(id)?' active':''}" data-extra-service="${id}"><b>${o.name}</b><span>${id==='p2p'||id==='http'?'No account required':'Credentials may be required'}</span></button>`;}).join('');
  const scraperCards=OPTIONAL_SCRAPER_DEFS.map(d=>`<button type="button" class="fastlane-choice${selectedScrapers.has(d.id)?' active':''}" data-extra-scraper="${d.id}"><b>${d.label}</b><span>${d.desc}</span></button>`).join('');
  const overlay=document.createElement('div');overlay.id='additionalServicesModal';overlay.className='fastlane-overlay';
  overlay.innerHTML=`<div class="fastlane-panel" role="dialog" aria-modal="true" aria-labelledby="extraTitle" style="max-width:700px"><div class="fastlane-head"><div class="fastlane-head-copy"><div class="fastlane-kicker">Optional sources</div><div class="fastlane-title" id="extraTitle">Additional services &amp; scrapers</div><div class="fastlane-sub">Choose any extras you use. ${typeof options.onApply==='function'?'Required credential fields will appear when you return to Quick Install.':'Credentials for selected paid sources appear later under Accounts &amp; Keys.'}</div></div><button class="fastlane-close" id="extraClose" aria-label="Close">✕</button></div><div class="fastlane-section"><div class="fastlane-label">Additional services</div><div class="fastlane-grid services">${serviceCards}</div></div><div class="fastlane-section"><div class="fastlane-label">Optional Usenet indexers</div><div class="fastlane-grid services">${scraperCards}</div></div><button class="fastlane-go" id="extraApply">Apply selections</button></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click',e=>{
    const svc=e.target.closest('[data-extra-service]');if(svc){const id=svc.dataset.extraService;selectedServices.has(id)?selectedServices.delete(id):selectedServices.add(id);svc.classList.toggle('active',selectedServices.has(id));return;}
    const scr=e.target.closest('[data-extra-scraper]');if(scr){const id=scr.dataset.extraScraper;selectedScrapers.has(id)?selectedScrapers.delete(id):selectedScrapers.add(id);scr.classList.toggle('active',selectedScrapers.has(id));return;}
    if(e.target===overlay||e.target.closest('#extraClose')){overlay.remove();return;}
    if(e.target.closest('#extraApply')){const sv=[...selectedServices],sc=[...selectedScrapers];if(typeof options.onApply==='function'){options.onApply(sv,sc);overlay.remove();return;}S.multiServices=S.multiServices.filter(v=>!CAROUSEL_SVCS.includes(v));sv.forEach(v=>S.multiServices.push(v));S.optionalScrapers=sc;S.p2pEnabled=S.multiServices.includes('p2p');S.service=deriveService();saveState();overlay.remove();render();}
  });
  document.getElementById('extraClose').focus();
}

// ── Express Install lane ────────────────────────────────────────────────
// A minimal two-step, one-click install (Duck Streams / QuackStart pattern):
// pick a debrid service + key, connect Stremio (or grab the manifest), go.
// It reuses the full install pipeline (simpleInstall → host auto-select →
// POST → pushToStremio → Full-Stack AIOMetadata+Cinemeta) with Balanced
// defaults so novices get a working setup in ~30 seconds.
const EXPRESS_SERVICES = [
  ['torbox-pro','TorBox','Debrid · fast cache'],
  ['realdebrid','Real-Debrid','Debrid · large library'],
  ['alldebrid','AllDebrid','Debrid · uncached-friendly'],
  ['premiumize','Premiumize','Debrid · generous quota'],
  ['easynews','EasyNews','Usenet · NZB access'],
  ['p2p','Free / P2P','No account required'],
];

function showExpressLane() {
  document.getElementById('expressLaneModal')?.remove();
  const svc = (S.service && EXPRESS_SERVICES.some(([v]) => v === S.service)) ? S.service : 'torbox-pro';
  const state = { service: svc, target: 'app', extras:(S.multiServices||[]).filter(v=>CAROUSEL_SVCS.includes(v) && v!==svc), scrapers:[...(S.optionalScrapers||[])] };
  const credInput = (key) => {
    const d = PROVIDER_CREDENTIALS[key] || { label: key, placeholder:'Paste your key', url:'#', linkLabel:'Get key' };
    const link = (d.url && d.url !== '#') ? `<a class="fastlane-get-key" href="${d.url}" target="_blank" rel="noopener noreferrer">${d.linkLabel||'Get key'} &nearr;</a>` : '';
    return `<div class="fastlane-credential"><div class="fastlane-credential-head"><label>${d.label}</label>${link}</div><input class="fastlane-field" data-express-cred="${key}" type="password" autocomplete="off" spellcheck="false" placeholder="${d.placeholder||'Paste your API key'}" value="${escH(S.creds[key]||'')}"></div>`;
  };
  const credArea = (service) => {
    if (service === 'p2p') return `<div style="margin:10px 2px 4px;font-size:.78rem;color:#8b949e;line-height:1.5">No key needed — Core Builds uses free P2P scrapers. Results depend on public torrent availability.</div>`;
    if (service === 'easynews') return credInput('easynews') + credInput('easynewsPass');
    return credInput(service === 'torbox-pro' ? 'torbox' : service);
  };
  // Extra services that need a credential when added via the popout.
  const EXTRA_CRED = { debridio:'debridio', debrider:'debrider', nzbgeek:'nzbgeek', streamnzb:'streamnzb' };
  const renderCreds = () => {
    const prim = credArea(state.service);
    const extraCreds = [
      ...state.extras.filter(v => v !== state.service).map(v => EXTRA_CRED[v]).filter(Boolean).map(credInput),
      ...state.scrapers.map(sid => (OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid) || {}).credKey).filter(Boolean).map(credInput),
    ].join('');
    const extraBlock = extraCreds ? `<div style="margin-top:8px;border-top:1px dashed rgba(255,255,255,.12);padding-top:8px">${extraCreds}</div>` : '';
    return prim + extraBlock;
  };
  // Re-render #expressCreds while preserving typed values across re-renders.
  const renderCredsInto = () => {
    const drafts = {};
    document.querySelectorAll('#expressLaneModal [data-express-cred]').forEach(i => { drafts[i.dataset.expressCred] = i.value; });
    document.getElementById('expressCreds').innerHTML = renderCreds();
    document.querySelectorAll('#expressLaneModal [data-express-cred]').forEach(i => { const v = drafts[i.dataset.expressCred]; if (v !== undefined) i.value = v; });
  };
  const overlay = document.createElement('div');
  overlay.id = 'expressLaneModal';
  overlay.className = 'fastlane-overlay';
  overlay.innerHTML = `<div class="fastlane-panel" role="dialog" aria-modal="true" aria-labelledby="expressTitle" style="max-width:640px">
    <div class="fastlane-head"><div class="fastlane-head-copy"><div class="fastlane-kicker">Express install</div><div class="fastlane-title" id="expressTitle">Working streams in about 30 seconds.</div><div class="fastlane-sub">Pick your debrid, connect Stremio, done. Core Builds picks sensible defaults — fine-tune any of it later in Advanced.</div></div><button class="fastlane-close" id="expressClose" aria-label="Close">✕</button></div>
    <div class="fastlane-section"><div class="fastlane-label">1 · Debrid service</div>
      <div class="fastlane-grid services">${EXPRESS_SERVICES.map(([v,n,d])=>`<button type="button" class="fastlane-choice${state.service===v?' active':''}" data-express-service="${v}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>
      <div id="expressCreds">${renderCreds()}</div>
      <button type="button" id="expressExtrasBtn" class="additional-services-btn" style="width:100%;margin-top:8px;display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:11px;border:1px solid rgba(255,255,255,.09);background:#0e1621;color:#c9d5df;cursor:pointer;text-align:left"><span style="font-size:1rem;color:#a78bfa">＋</span><span style="flex:1"><b style="display:block;font-size:.72rem">Additional services &amp; scrapers</b><span style="display:block;font-size:.6rem;color:#718093;margin-top:1px">Debridio, Debrider, Usenet, indexers and more</span></span><span id="expressExtrasCount" style="font-size:.6rem;font-weight:900;color:#67e8f9"></span><span>→</span></button>
    </div>
    <div class="fastlane-section"><div class="fastlane-label">2 · Install to</div>
      <div class="fastlane-grid services">${[['app','Stremio','Recommended — direct install'],['manifest','Manifest URL','Use in Stremio, WuPlay or Nuvio']].map(([v,n,d])=>`<button type="button" class="fastlane-choice${state.target===v?' active':''}" data-express-target="${v}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>
      <div id="expressStremio"${state.target==='app'?'':' style="display:none"'}>
        <div style="display:flex;gap:8px;margin-top:10px">
          <input class="fastlane-field" id="stremioEmailInline" type="email" autocomplete="username" placeholder="Stremio email" value="${escH(S.stremioEmail||'')}" style="flex:1">
          <input class="fastlane-field" id="stremioPasswordInline" type="password" autocomplete="current-password" placeholder="Stremio password" value="${escH(S.stremioPassword||'')}" style="flex:1">
        </div>
        <button type="button" data-action="create-stremio-account" style="margin-top:6px;font-size:.74rem;color:var(--th-accent);background:none;border:none;cursor:pointer;padding:0;font-weight:600">Create random account →</button>
      </div>
    </div>
    <details style="margin:0 22px 8px;font-size:.74rem"><summary style="cursor:pointer;color:#8b949e;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Optional</summary>
      <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin-top:8px"><input type="checkbox" id="expressFullStack" ${S.installAIOMeta !== false?'checked':''} style="margin-top:2px"><span style="color:#c9d5df"><b style="color:#e6edf3">Full stack</b><br><span style="color:#8b949e">Install AIOMetadata + patch Cinemeta for better posters and catalogs.</span></span></label>
      <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin-top:8px"><input type="checkbox" id="expressClean" ${S.cleanInstall?'checked':''} style="margin-top:2px"><span style="color:#c9d5df"><b style="color:#e6edf3">Clean reinstall</b><br><span style="color:#8b949e">Remove previous Core Builds addons from your Stremio account.</span></span></label>
      <div style="margin-top:8px"><input class="fastlane-field" id="expressTmdb" type="password" autocomplete="off" spellcheck="false" placeholder="TMDB Read Access Token (optional — improves matching)" value="${escH(S.tmdbToken||'')}" style="width:100%"></div>
    </details>
    <div style="padding:0 22px 18px"><button class="fastlane-go" id="expressGo" style="width:100%">Install in ~30 seconds</button><div id="aioResult" style="margin-top:10px"></div><button id="btnAutoCreate" style="display:none" aria-hidden="true"></button></div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('#expressClose')) { overlay.remove(); return; }
    const svcBtn = e.target.closest('[data-express-service]');
    if (svcBtn) {
      state.service = svcBtn.dataset.expressService;
      overlay.querySelectorAll('[data-express-service]').forEach(b => b.classList.toggle('active', b.dataset.expressService === state.service));
      state.extras = state.extras.filter(v => v !== state.service);
      renderCredsInto();
      return;
    }
    const tgtBtn = e.target.closest('[data-express-target]');
    if (tgtBtn) {
      state.target = tgtBtn.dataset.expressTarget;
      overlay.querySelectorAll('[data-express-target]').forEach(b => b.classList.toggle('active', b.dataset.expressTarget === state.target));
      const box = document.getElementById('expressStremio');
      if (box) box.style.display = state.target === 'app' ? '' : 'none';
      return;
    }
    if (e.target.closest('#expressExtrasBtn')) {
      showAdditionalServicesPicker({
        services: state.extras,
        scrapers: state.scrapers,
        onApply: (sv, sc) => {
          state.extras = sv.filter(v => v !== state.service);
          state.scrapers = sc;
          renderCredsInto();
          const c = document.getElementById('expressExtrasCount');
          if (c) c.textContent = (state.extras.length + state.scrapers.length) ? `${state.extras.length + state.scrapers.length} selected` : '';
        },
      });
      return;
    }
    if (e.target.closest('#expressGo')) {
      const payload = {
        service: state.service,
        target: state.target,
        creds: Object.fromEntries([...overlay.querySelectorAll('[data-express-cred]')].map(i => [i.dataset.expressCred, i.value.trim()])),
        stremioEmail: document.getElementById('stremioEmailInline')?.value.trim() || '',
        stremioPassword: document.getElementById('stremioPasswordInline')?.value || '',
        fullStack: document.getElementById('expressFullStack')?.checked !== false,
        clean: document.getElementById('expressClean')?.checked === true,
        tmdb: document.getElementById('expressTmdb')?.value.trim() || '',
        extras: { services: state.extras, scrapers: state.scrapers },
      };
      const goBtn = document.getElementById('expressGo');
      if (goBtn) { goBtn.disabled = true; goBtn.textContent = 'Installing…'; }
      runExpressInstall(payload).finally(() => { if (goBtn) { goBtn.disabled = false; goBtn.textContent = 'Install in ~30 seconds'; } });
    }
  });
  document.getElementById('expressClose').focus();
}

async function runExpressInstall(p) {
  const isFree = p.service === 'p2p';
  if (!isFree && !Object.values(p.creds).some(v => v)) { showToast('Enter your API key first', true); return; }
  if (p.target === 'app' && !isFree) {
    if (!p.stremioEmail || !p.stremioPassword) { showToast('Add your Stremio login or create a random account', true); return; }
    S.stremioEmail = p.stremioEmail; S.stremioPassword = p.stremioPassword;
  }
  applyQuickProfile('balanced');
  S.service = p.service;
  S.p2pEnabled = isFree;
  const extrasSvc = p.extras?.services || [];
  const extrasScr = p.extras?.scrapers || [];
  S.multiServices = [...new Set([...(isFree ? ['p2p'] : [p.service]), ...extrasSvc])];
  S.optionalScrapers = extrasScr;
  S.p2pEnabled = isFree || extrasSvc.includes('p2p');
  // Extra services push the config into multi-service mode so their presets emit.
  S.service = deriveService() || S.service;
  S.content = 'all';
  S.installMode = 'direct';
  S.quickStart = true;
  Object.assign(S.creds, p.creds);
  S.patchCinemeta = p.fullStack;
  S.installAIOMeta = p.fullStack;
  S.cleanInstall = p.clean;
  if (p.tmdb) { S.tmdbToken = p.tmdb; S.tmdbApiKey = p.tmdb; }
  saveState();
  try {
    // Renders progress + result into the modal's #aioResult.
    await simpleInstall(p.target === 'app' ? 'app' : 'manifest');
  } catch (err) {
    showToast('Install failed: ' + (err?.message || err), true);
  }
}

function showFastLane() {
  document.getElementById('fastLaneModal')?.remove();
  const initialServices = (S.multiServices && S.multiServices.length ? S.multiServices : [S.service || 'torbox-pro']).map(v=>v==='torbox'?'torbox-pro':v).filter(v=>['torbox-pro','realdebrid','alldebrid','premiumize','easynews','p2p'].includes(v));
  const state = { target:'app', services:initialServices.length?initialServices:['torbox-pro'], extras:(S.multiServices||[]).filter(v=>CAROUSEL_SVCS.includes(v)), scrapers:[...(S.optionalScrapers||[])], profile:S.quickProfile || 'balanced', nuvioDevice:S.device||'generic', nuvioResolution:S.resolution||'4k' };
  const overlay = document.createElement('div');
  overlay.id = 'fastLaneModal';
  overlay.className = 'fastlane-overlay';
  overlay.innerHTML = `<div class="fastlane-panel" role="dialog" aria-modal="true" aria-labelledby="fastLaneTitle">
    <div class="fastlane-head"><div class="fastlane-head-copy"><div class="fastlane-kicker">Quick install</div><div class="fastlane-title" id="fastLaneTitle">Working streams in one short flow.</div><div class="fastlane-sub">Pick where you watch, your service, and how aggressively Core Builds should search. Advanced controls remain available later.</div></div><button class="fastlane-close" id="fastLaneClose" aria-label="Close">✕</button></div>
    <div class="fastlane-section"><div class="fastlane-label">1 / Where do you watch?</div><div class="fastlane-grid apps" id="flApps">
      ${[['app','Stremio','Direct or manifest'],['nuvio','Nuvio','Manifest URL'],['wuplay','WuPlay','Manifest URL'],['manifest','Other app','Copy manifest']].map(([v,n,d])=>`<button class="fastlane-choice${state.target===v?' active':''}" data-fl-target="${v}"><b>${n}</b><span>${d}</span></button>`).join('')}
    </div></div>
    <div class="fastlane-section" id="flServiceSection"><div class="fastlane-label">2 / Providers <span style="font-weight:600;text-transform:none;letter-spacing:0">— choose one or more</span></div><div class="fastlane-grid services" id="flServices">
      ${[['torbox-pro','TorBox'],['realdebrid','Real-Debrid'],['alldebrid','AllDebrid'],['premiumize','Premiumize'],['easynews','EasyNews'],['p2p','Free / P2P']].map(([v,n])=>`<button class="fastlane-choice${state.services.includes(v)?' active':''}" data-fl-service="${v}"><b>${n}</b><span>${v==='p2p'?'No key required':'Credentials required'}</span></button>`).join('')}
    </div><button type="button" id="flExtrasBtn" class="additional-services-btn" style="width:100%;margin-top:8px;display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:11px;border:1px solid rgba(255,255,255,.09);background:#0e1621;color:#c9d5df;cursor:pointer;text-align:left"><span style="font-size:1rem;color:#a78bfa">＋</span><span style="flex:1"><b style="display:block;font-size:.72rem">Additional services &amp; scrapers</b><span style="display:block;font-size:.6rem;color:#718093;margin-top:1px">P2P, HTTP, Debridio, Usenet and optional indexers</span></span><span id="flExtrasCount" style="font-size:.6rem;font-weight:900;color:#67e8f9"></span><span>→</span></button></div>
    <div id="flNuvioSection" style="display:none"></div>
    <div class="fastlane-section" id="flCredentials"></div>
    <div class="fastlane-section" id="flProfileSection"><div class="fastlane-label">3 / Performance profile</div><div class="fastlane-grid profiles" id="flProfiles">
      ${[['fast','Fast','1080p · cached first · smaller files'],['balanced','Balanced','4K · sensible pool · 30GB cap'],['maximum','Maximum','4K · largest pool · quality first']].map(([v,n,d])=>`<button class="fastlane-choice${state.profile===v?' active':''}" data-fl-profile="${v}"><b>${n}</b><span>${d}</span></button>`).join('')}
    </div></div>
    <div class="fastlane-section" id="flInstallFields"></div>
    <label class="fastlane-check" id="flCleanLabel"><input type="checkbox" id="flClean" ${S.cleanInstall?'checked':''}><span><b style="color:#b8c4ce">Replace older AIOStreams installs</b><br>When pushing directly to Stremio, remove older manifests from known public AIOStreams hosts before adding this one.</span></label><a href="../account-tools/" target="_blank" rel="noopener noreferrer" class="fastlane-backup-link" id="flBackupLink" style="display:block;margin:6px 0 0 28px">Back up your current addons first →</a>
    <a href="../tools/" target="_blank" rel="noopener noreferrer" style="display:block;margin:3px 0 0 28px;font-size:.72rem;color:#8b949e;text-decoration:none;transition:color .15s" onmouseover="this.style.color='#a78bfa'" onmouseout="this.style.color='#8b949e'">All Core Tools →</a>
    <div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:rgba(52,211,153,.04);border:1px solid rgba(52,211,153,.12)" id="flStackSetup">
      <div style="font-size:.72rem;font-weight:700;color:#34d399;margin-bottom:8px;display:flex;align-items:center;gap:6px">${ICO.rocket(12,'#34d399')} Full Stack Setup <span style="font-size:.58rem;font-weight:600;padding:1px 5px;border-radius:3px;background:rgba(52,211,153,.12);color:#34d399;border:1px solid rgba(52,211,153,.25)">NEW</span></div>
      <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin-bottom:6px"><input type="checkbox" id="flPatchCinemeta" ${S.patchCinemeta?'checked':''} style="margin-top:2px;flex-shrink:0"><span style="font-size:.74rem;color:#c9d5df"><b style="color:#e6edf3">Patch Cinemeta</b><br><span style="color:#8b949e">Hide Cinemeta catalogs/metadata so AIOMetadata takes over. Uses Cinebye.</span></span></label>
      <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer"><input type="checkbox" id="flInstallAIOMeta" ${S.installAIOMeta?'checked':''} style="margin-top:2px;flex-shrink:0"><span style="font-size:.74rem;color:#c9d5df"><b style="color:#e6edf3">Install AIOMetadata</b><br><span style="color:#8b949e">Better catalogs, metadata, and posters. Replaces Cinemeta.</span></span></label>
    </div>
    <button class="fastlane-go" id="btnAutoCreate">Create &amp; Install →</button><div id="aioResult" class="fastlane-result"></div>
  </div>`;
  document.body.appendChild(overlay);
  const creds = document.getElementById('flCredentials');
  const installFields = document.getElementById('flInstallFields');
  const captureCredentialDrafts = () => {
    overlay.querySelectorAll('[data-fl-cred]').forEach(inp=>{S.creds[inp.dataset.flCred]=inp.value.trim();});
    overlay.querySelectorAll('[data-fl-tmdb]').forEach(inp=>{S[inp.dataset.flTmdb]=inp.value.trim();});
  };
  const renderNuvioSections = () => {
    const isNuvio = state.target === 'nuvio';
    const svcSection = overlay.querySelector('#flServiceSection');
    const profileSection = overlay.querySelector('#flProfileSection');
    const nuvioSection = overlay.querySelector('#flNuvioSection');
    const extrasBtn = document.getElementById('flExtrasBtn');
    const stackSetup = overlay.querySelector('#flStackSetup');
    const cleanLabel = overlay.querySelector('#flCleanLabel');
    const backupLink = overlay.querySelector('#flBackupLink');
    if (svcSection) svcSection.style.display = isNuvio ? 'none' : '';
    if (profileSection) profileSection.style.display = isNuvio ? 'none' : '';
    if (extrasBtn) extrasBtn.style.display = isNuvio ? 'none' : '';
    if (stackSetup) stackSetup.style.display = isNuvio ? 'none' : '';
    if (cleanLabel) cleanLabel.style.display = isNuvio ? 'none' : '';
    if (backupLink) backupLink.style.display = isNuvio ? 'none' : '';
    if (!nuvioSection) return;
    if (!isNuvio) { nuvioSection.style.display = 'none'; return; }
    nuvioSection.style.display = '';
    const nuvioHosts = Object.entries(HOST_META).filter(([,m]) => m.supportsNuvioInstant && m.supportsP2P).map(([k]) => k);
    nuvioSection.innerHTML = `
      <div style="margin-bottom:14px;padding:12px 14px;border-radius:10px;background:rgba(251,146,60,.06);border:1px solid rgba(251,146,60,.2)">
        <div style="font-size:.78rem;font-weight:700;color:#fb923c;margin-bottom:5px">${ICO.warn(14,'#fb923c')} TorBox Connected Services</div>
        <div style="font-size:.76rem;color:#c9d5df;line-height:1.55">Connect TorBox in <strong style="color:#fb923c">Nuvio → Connected Services</strong>. Do <strong style="color:#f87171">not</strong> enter a TorBox API key into AIOStreams — the generated template uses P2P scrapers only.</div>
      </div>
      <div class="fastlane-section"><div class="fastlane-label">2 / Device</div><div class="fastlane-grid services" id="flNuvioDevices">
        ${[['generic','Standard'],['shield','NVIDIA Shield'],['firestick-4kmax','Fire Stick 4K Max'],['onn','onn 4K'],['googletv','Google TV'],['samsung','Samsung TV'],['appletv-new','Apple TV 4K'],['windows','Windows PC']].map(([v,n])=>`<button class="fastlane-choice${state.nuvioDevice===v?' active':''}" data-fl-nuvio-device="${v}"><b>${n}</b></button>`).join('')}
      </div></div>
      <div class="fastlane-section"><div class="fastlane-label">3 / Resolution</div><div class="fastlane-grid profiles" id="flNuvioRes">
        ${[['4k','4K','2160p primary · 1080p fallback'],['1080p','1080p','Excludes 4K content'],['mixed','Mixed','Adaptive · no hard caps']].map(([v,n,d])=>`<button class="fastlane-choice${state.nuvioResolution===v?' active':''}" data-fl-nuvio-res="${v}"><b>${n}</b><span>${d}</span></button>`).join('')}
      </div></div>
      <div class="fastlane-section"><div class="fastlane-label">4 / AIOStreams host</div>
        <div class="fastlane-note" style="margin-bottom:8px">Only hosts that support P2P and Nuvio Instant are shown.</div>
        <div class="fastlane-grid services" id="flNuvioHosts">
          ${nuvioHosts.map(k=>`<button class="fastlane-choice active" data-fl-nuvio-host="${k}" disabled style="opacity:.7;cursor:default"><b>${HOST_LABEL_MAP[k]||k}</b><span>${HOST_BASE_URLS[k]?.replace('https://','')}</span></button>`).join('')}
        </div>
      </div>`;
  };
  const renderContext = () => {
    const isNuvio = state.target === 'nuvio';
    renderNuvioSections();
    if (isNuvio) {
      creds.innerHTML = '';
      installFields.innerHTML = `<div class="fastlane-note">Core Builds will generate a P2P template and open Nuvio import instructions.</div>`;
      return;
    }
    const credKeys={ 'torbox-pro':'torbox',realdebrid:'realdebrid',alldebrid:'alldebrid',premiumize:'premiumize',debrider:'debrider' };
    const fields=[];
    const credentialField=(key,{type='password',autocomplete='off',showLink=true}={})=>{
      const d=PROVIDER_CREDENTIALS[key]||{label:key,placeholder:''};
      const link=showLink&&d.url?`<a class="fastlane-get-key" href="${d.url}" target="_blank" rel="noopener noreferrer">${d.linkLabel||'Get key'} &nearr;</a>`:key==='streamnzb'?'<span class="fastlane-key-hint">Use your instance manifest</span>':'';
      return `<div class="fastlane-credential"><div class="fastlane-credential-head"><label>${d.label}</label>${link}</div><input class="fastlane-field" data-fl-cred="${key}" type="${type}" autocomplete="${autocomplete}" placeholder="${d.placeholder||''}" value="${escH(S.creds[key]||'')}"></div>`;
    };
    state.services.filter(v=>credKeys[v]).forEach(v=>fields.push(credentialField(credKeys[v])));
    if(state.services.includes('easynews')) fields.push(credentialField('easynews',{type:'text',autocomplete:'username'}),credentialField('easynewsPass',{autocomplete:'current-password',showLink:false}));
    const extraCreds={debridio:'debridio',nzbgeek:'nzbgeek',streamnzb:'streamnzb'};
    state.extras.filter(v=>extraCreds[v]).forEach(v=>fields.push(credentialField(extraCreds[v],{type:v==='streamnzb'?'url':'password'})));
    state.scrapers.forEach(id=>{const d=OPTIONAL_SCRAPER_DEFS.find(x=>x.id===id);if(d?.credKey)fields.push(credentialField(d.credKey));});
    const tmdbField=(key,{type='password',maxlength=400}={})=>{const d=PROVIDER_CREDENTIALS[key];return `<div class="fastlane-credential"><div class="fastlane-credential-head"><label>${d.label}</label><a class="fastlane-get-key" href="${d.url}" target="_blank" rel="noopener noreferrer">${d.linkLabel||'Get key'} &nearr;</a></div><input class="fastlane-field" data-fl-tmdb="${key}" type="${type}" autocomplete="off" maxlength="${maxlength}" placeholder="${d.placeholder}" value="${(S[key]||'').replace(/"/g,'&quot;')}"></div>`;};
    const tmdbMetadata=`<details class="fastlane-metadata" ${S.tmdbToken||S.tmdbApiKey?'open':''}><summary><span><b>TMDB metadata</b><small>Optional · improves matching and release-date filtering</small></span><span class="fastlane-metadata-state">${S.tmdbToken||S.tmdbApiKey?'Set':'Add key'}</span></summary><div class="fastlane-metadata-body"><div class="fastlane-note">Add either a TMDB Read Access Token or API Key. Leave both blank and Core Builds will disable every TMDB-dependent feature so AIOStreams accepts the config.</div><div class="fastlane-fields">${tmdbField('tmdbToken')}${tmdbField('tmdbApiKey',{maxlength:60})}</div></div></details>`;
    const freeNote=[...state.services,...state.extras].some(v=>v==='p2p'||v==='http')?'<div class="fastlane-note">Free/P2P sources require no key and depend on active seeders and compatible hosts.</div>':'';
    const providerFields=fields.length?`<div class="fastlane-label">Provider credentials</div><div class="fastlane-fields">${fields.join('')}</div>${freeNote}`:freeNote||'<div class="fastlane-note">Select at least one provider.</div>';
    creds.innerHTML = providerFields + tmdbMetadata;
    const extraCount=state.extras.length+state.scrapers.length, countEl=document.getElementById('flExtrasCount');if(countEl)countEl.textContent=extraCount?`${extraCount} selected`:'';
    installFields.innerHTML = state.target === 'app' ? `<div class="fastlane-label">Stremio direct install <span style="font-weight:600;text-transform:none;letter-spacing:0">— optional</span></div><div class="fastlane-fields"><input class="fastlane-field" id="flStremioEmail" type="email" autocomplete="email" placeholder="Stremio email (leave blank for manifest)" value="${(S.stremioEmail||'').replace(/"/g,'&quot;')}"><input class="fastlane-field" id="flStremioPass" type="password" autocomplete="current-password" placeholder="Stremio password" value="${(S.stremioPassword||'').replace(/"/g,'&quot;')}"></div><div class="fastlane-note" style="margin-top:7px">Credentials are used only for the direct Stremio API request. Leave both blank to receive a manifest URL instead.</div>` : `<div class="fastlane-note">Core Builds will create a protected manifest and open the ${state.target==='manifest'?'copy/install':state.target} instructions.</div>`;
  };
  const activate = (selector, attr, value) => overlay.querySelectorAll(selector).forEach(b=>b.classList.toggle('active',b.getAttribute(attr)===value));
  overlay.addEventListener('click', async e => {
    const targetBtn = e.target.closest('[data-fl-target]');
    if (targetBtn) { state.target=targetBtn.dataset.flTarget; activate('[data-fl-target]','data-fl-target',state.target); renderContext(); return; }
    const nuvioDevBtn = e.target.closest('[data-fl-nuvio-device]');
    if (nuvioDevBtn) { state.nuvioDevice=nuvioDevBtn.dataset.flNuvioDevice; overlay.querySelectorAll('[data-fl-nuvio-device]').forEach(b=>b.classList.toggle('active',b.dataset.flNuvioDevice===state.nuvioDevice)); return; }
    const nuvioResBtn = e.target.closest('[data-fl-nuvio-res]');
    if (nuvioResBtn) { state.nuvioResolution=nuvioResBtn.dataset.flNuvioRes; overlay.querySelectorAll('[data-fl-nuvio-res]').forEach(b=>b.classList.toggle('active',b.dataset.flNuvioRes===state.nuvioResolution)); return; }
    const serviceBtn = e.target.closest('[data-fl-service]');
    if (serviceBtn) { captureCredentialDrafts(); const v=serviceBtn.dataset.flService, i=state.services.indexOf(v); if(i>=0){if(state.services.length===1)return;state.services.splice(i,1);}else state.services.push(v); overlay.querySelectorAll('[data-fl-service]').forEach(b=>b.classList.toggle('active',state.services.includes(b.dataset.flService))); renderContext(); return; }
    if(e.target.closest('#flExtrasBtn')){captureCredentialDrafts();showAdditionalServicesPicker({services:state.extras,scrapers:state.scrapers,onApply:(sv,sc)=>{state.extras=sv;state.scrapers=sc;renderContext();}});return;}
    const profileBtn = e.target.closest('[data-fl-profile]');
    if (profileBtn) { state.profile=profileBtn.dataset.flProfile; activate('[data-fl-profile]','data-fl-profile',state.profile); return; }
    if (e.target === overlay || e.target.closest('#fastLaneClose')) { overlay.remove(); return; }
    if (e.target.closest('#btnAutoCreate')) {
      const btn = document.getElementById('btnAutoCreate');
      const result = document.getElementById('aioResult');
      result.innerHTML='';
      if (state.target === 'nuvio') {
        btn.disabled=true;
        btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Generating Nuvio template…`;
        try {
          const nuvioHost = Object.entries(HOST_META).filter(([,m])=>m.supportsNuvioInstant&&m.supportsP2P).map(([k])=>({id:k,...HOST_META[k]}))[0];
          if (!nuvioHost) { result.innerHTML='<div class="td-error">No compatible Nuvio host found.</div>'; return; }
          const tmpl = generateTemplate({
            route: 'nuvio-torbox-instant', device: state.nuvioDevice, resolution: state.nuvioResolution,
            host: nuvioHost, formatter: 'family-v4', langs: S.langs || ['English'], foreignLangKill: S.foreignLangKill !== false,
            tmdbToken: S.tmdbToken || '', tmdbApiKey: S.tmdbApiKey || '',
          }, {
            host: nuvioHost,
            deviceAv1Safe: DEVICE_AV1_SAFE, deviceDvSafe: DEVICE_DV_SAFE, deviceForceLimitedAudio: DEVICE_FORCE_LIMITED_AUDIO,
            formatters: FORMATTERS,
            metadata: { coreBuildsVersion: CONFIGURATOR_VERSION, generatedAt: new Date().toISOString() },
          });
          if (tmpl.metadata) { delete tmpl.metadata.generatedAt; }
          // Nuvio uses the same public import-link transport as other routes;
          // TMDB values carried from a previous setup must not be uploaded.
          const jsonStr = JSON.stringify(sanitizeTemplateForRemoteImport(tmpl), null, 2);
          btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Creating import link…`;
          const importUrl = await uploadJsonForImport(jsonStr);
          btn.disabled=false; btn.innerHTML='Create &amp; Install →';
          if (importUrl) {
            const nuvioChips = Object.entries(HOST_META).filter(([,m])=>m.supportsNuvioInstant&&m.supportsP2P).map(([k])=>[HOST_LABEL_MAP[k]||k, HOST_BASE_URLS[k]+'/stremio/configure']);
            const chipHtml = nuvioChips.map(([n,u])=>`<a href="${u}?template=${encodeURIComponent(importUrl)}" target="_blank" rel="noopener noreferrer" class="inst-chip inst-chip-import">▶ ${n}</a>`).join('');
            const tmdbReminder = S.tmdbToken || S.tmdbApiKey
              ? `<div style="margin-bottom:10px;padding:9px 12px;border-radius:8px;background:rgba(245,158,11,.05);border:1px solid rgba(245,158,11,.16);font-size:.72rem;color:#c9d5df;line-height:1.5">${ICO.warn(12,'#fbbf24')} Your TMDB credential was removed from this public import link. Re-enter it in AIOStreams after import if you want metadata matching features.</div>`
              : '';
            result.innerHTML = `<div class="import-success" style="margin-top:12px">
              <div style="margin-bottom:10px;padding:10px 12px;border-radius:8px;background:rgba(251,146,60,.06);border:1px solid rgba(251,146,60,.18)"><div style="font-size:.74rem;font-weight:700;color:#fb923c;margin-bottom:3px">${ICO.warn(12,'#fb923c')} Next step: connect TorBox</div><div style="font-size:.72rem;color:#c9d5df;line-height:1.5">Go to <strong style="color:#fb923c">Nuvio → Connected Services</strong> and connect your TorBox account there. Do <strong style="color:#f87171">not</strong> enter a TorBox API key in AIOStreams.</div></div>${tmdbReminder}
              <strong style="color:#e6edf3">Tap a host to import your Nuvio template:</strong>
              <div style="color:#6b7280;font-size:.8rem;margin:6px 0 10px"><strong style="color:#e6edf3">1.</strong> Tap a host below to open AIOStreams<br><strong style="color:#e6edf3">2.</strong> Your template loads automatically<br><strong style="color:#e6edf3">3.</strong> Set a password and click Save<br><strong style="color:#e6edf3">4.</strong> Copy the manifest URL into Nuvio</div>
              <div class="inst-chips">${chipHtml}</div>
              <div style="color:#4b5563;font-size:.74rem;margin:8px 0 4px">Or copy this import URL:</div>
              <div style="display:flex;gap:6px;align-items:stretch"><div class="manifest-url" style="flex:1;min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-action="copy-manifest" data-url="${importUrl.replace(/"/g,'&quot;')}" title="Click to copy">${importUrl}</div><button data-action="copy-manifest" data-url="${importUrl.replace(/"/g,'&quot;')}" style="flex-shrink:0;padding:0 12px;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.28);border-radius:6px;color:#00d4ff;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap">Copy</button></div>
            </div>`;
            showToast('Nuvio template created — tap a host to import');
          } else {
            result.innerHTML = `<div class="import-success import-error" style="margin-top:12px"><strong style="color:#f87171">Could not reach any paste service</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 10px;line-height:1.5">Download the JSON and import it manually into AIOStreams.</div></div>`;
          }
        } catch(err) {
          btn.disabled=false; btn.innerHTML='Create &amp; Install →';
          result.innerHTML=`<div class="td-error">${err.message.replace(/</g,'&lt;')}</div>`;
        }
        return;
      }
      let missing='';
      overlay.querySelectorAll('[data-fl-cred]').forEach(inp=>{const v=inp.value.trim();if(!v&&!missing)missing=inp.placeholder;else S.creds[inp.dataset.flCred]=v;});
      overlay.querySelectorAll('[data-fl-tmdb]').forEach(inp=>{S[inp.dataset.flTmdb]=inp.value.trim();});
      if(missing){result.innerHTML=`<div class="td-error">Enter ${missing}.</div>`;return;}
      S.multiServices = [...new Set([...state.services,...state.extras])];
      S.optionalScrapers = [...state.scrapers];
      S.service = deriveService();
      S.p2pEnabled = S.multiServices.includes('p2p');
      S.simpleMode = true; S.quickStart = true; S.outputProfile = 'auto';
      applyQuickProfile(state.profile);
      S.cleanInstall = document.getElementById('flClean')?.checked || false;
      S.patchCinemeta = document.getElementById('flPatchCinemeta')?.checked !== false;
      S.installAIOMeta = document.getElementById('flInstallAIOMeta')?.checked !== false;
      let installTarget = state.target;
      if (state.target === 'app') {
        S.stremioEmail=document.getElementById('flStremioEmail').value.trim();
        S.stremioPassword=document.getElementById('flStremioPass').value;
        const hasLogin=S.stremioEmail && S.stremioPassword;
        S.installMode=hasLogin?'direct':'manifest';
        installTarget='app';
      } else { S.installMode='manifest'; }
      step=STEPS; saveState();
      btn.disabled=true;
      try { await simpleInstall(installTarget); } finally { btn.disabled=false; }
    }
  });
  renderContext();
  document.getElementById('fastLaneClose').focus();
}

function buildSanitizedDiagnostics() {
  const hosts = (()=>{ try{return hostCompatCheck();}catch(e){return null;} })();
  const profileAudit = (()=>{ try{return outputProfileAudit();}catch(e){return null;} })();
  return {
    coreBuildsVersion: CONFIGURATOR_VERSION,
    createdAt: new Date().toISOString(),
    browser: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    online: navigator.onLine,
    settings: { service:S.service, multiServices:S.multiServices, optionalScrapers:S.optionalScrapers, device:S.device, resolution:S.resolution, audio:S.audio, cacheMode:S.cacheMode, streamPool:S.streamPool, formatter:S.formatter, installMode:S.installMode, instanceHost:S.instanceHost, quickProfile:S.quickProfile, outputProfile:activeOutputProfile(), aiostreamsVersion:outputProfileContext().aiostreamsVersion },
    credentialPresence: Object.fromEntries(Object.entries(S.creds||{}).map(([k,v])=>[k,Boolean(v)])),
    templateWarnings: (()=>{try{return templateHealthCheck();}catch(e){return [e.message];}})(),
    templateComplexity: profileAudit?.complexity || null,
    templateConflicts: profileAudit?.conflicts?.map(({id,severity,title,fields}) => ({id,severity,title,fields})) || [],
    outputProfileBudget: profileAudit ? { profile:profileAudit.profile, ok:profileAudit.budget.ok, violations:profileAudit.budget.violations.map(({key,actual,allowed}) => ({key,actual,allowed})) } : null,
    hostCompatibility: hosts
  };
}
function feedbackReportContext() {
  const target = outputProfileContext().aiostreamsVersion;
  return {
    device: label('device', S.device) || S.device || 'Not selected',
    service: label('service', S.service) || S.service || 'Not selected',
    cacheMode: S.cacheMode === 'cached' ? 'Cached only' : S.cacheMode === 'uncached' ? 'Uncached only' : 'Mixed',
    resolution: label('resolution', S.resolution) || S.resolution || 'Not selected',
    host: HOST_LABEL_MAP[S.instanceHost] || S.instanceHost || 'Not selected',
    aiostreamsVersion: target,
    profile: OUTPUT_PROFILE_INFO[activeOutputProfile()]?.label || activeOutputProfile(),
  };
}

function showFeedbackReportModal() {
  document.getElementById('feedbackReportModal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'feedbackReportModal';
  overlay.className = 'fastlane-overlay';
  overlay.innerHTML = `<div class="fastlane-panel" role="dialog" aria-modal="true" aria-labelledby="feedbackReportTitle" style="max-width:620px">
    <div class="fastlane-head"><div class="fastlane-head-copy"><div class="fastlane-kicker">Safe support report</div><div class="fastlane-title" id="feedbackReportTitle">Copy a sanitized feedback report</div><div class="fastlane-sub">Only share the copied text. This tool never includes API keys, passwords, JSON, UUIDs, manifest URLs, or raw configuration data.</div></div><button class="fastlane-close" id="feedbackReportClose" aria-label="Close">✕</button></div>
    <div style="padding:0 20px 18px;display:flex;flex-direction:column;gap:11px">
      <label style="font-size:.75rem;font-weight:700;color:#c9d1d9">Content type<select id="feedbackContentType" class="fastlane-field" style="margin-top:5px"><option value="Series">Series</option><option value="Movie">Movie</option><option value="Anime">Anime</option><option value="Other / not sure">Other / not sure</option></select></label>
      <label style="font-size:.75rem;font-weight:700;color:#c9d1d9">Exact title + episode<input id="feedbackTitleEpisode" class="fastlane-field" maxlength="160" placeholder="Example: Title S02E03" style="margin-top:5px"></label>
      <label style="font-size:.75rem;font-weight:700;color:#c9d1d9">Did any AIOStreams addon return streams?<select id="feedbackAddonStreams" class="fastlane-field" style="margin-top:5px"><option value="Not sure">Not sure</option><option value="Yes">Yes</option><option value="No">No</option></select></label>
      <label style="font-size:.75rem;font-weight:700;color:#c9d1d9">Visible error text, if any<textarea id="feedbackVisibleError" maxlength="240" placeholder="Paste only the visible error text — URLs are redacted" style="margin-top:5px;width:100%;min-height:70px;resize:vertical;background:#0b0f16;color:#e6edf3;border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:8px;font:inherit"></textarea></label>
      <pre id="feedbackReportPreview" class="diag-pre" style="margin:0;white-space:pre-wrap"></pre>
      <div style="display:flex;gap:8px"><button id="feedbackReportCopy" class="fastlane-go" style="margin:0;flex:1">Copy sanitized report</button><button id="feedbackReportCancel" class="fastlane-close" style="position:static;width:auto;height:auto;padding:10px 14px;border:1px solid rgba(255,255,255,.12);border-radius:8px">Cancel</button></div>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const readReport = () => buildFeedbackReport(feedbackReportContext(), {
    contentType: document.getElementById('feedbackContentType')?.value,
    titleAndEpisode: document.getElementById('feedbackTitleEpisode')?.value,
    addonReturnedStreams: document.getElementById('feedbackAddonStreams')?.value,
    visibleError: document.getElementById('feedbackVisibleError')?.value,
  });
  const refresh = () => { document.getElementById('feedbackReportPreview').textContent = readReport(); };
  overlay.querySelectorAll('input, select, textarea').forEach(input => input.addEventListener('input', refresh));
  overlay.querySelectorAll('select').forEach(input => input.addEventListener('change', refresh));
  const close = () => overlay.remove();
  overlay.querySelector('#feedbackReportClose').addEventListener('click', close);
  overlay.querySelector('#feedbackReportCancel').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  overlay.querySelector('#feedbackReportCopy').addEventListener('click', async () => {
    const report = readReport();
    try {
      await navigator.clipboard.writeText(report);
      overlay.querySelector('#feedbackReportCopy').textContent = '✓ Copied — paste only this text';
    } catch {
      overlay.querySelector('#feedbackReportCopy').textContent = 'Clipboard unavailable — select the preview text';
    }
  });
  refresh();
  overlay.querySelector('#feedbackTitleEpisode').focus();
}

function showDiagnosticsModal() {
  document.getElementById('diagnosticsModal')?.remove();
  const data=buildSanitizedDiagnostics();
  const overlay=document.createElement('div'); overlay.id='diagnosticsModal'; overlay.className='fastlane-overlay';
  overlay.innerHTML=`<div class="fastlane-panel" role="dialog" aria-modal="true" aria-labelledby="diagTitle" style="max-width:620px"><div class="fastlane-head"><div class="fastlane-head-copy"><div class="fastlane-kicker">Sanitized diagnostics</div><div class="fastlane-title" id="diagTitle">Report an issue safely.</div><div class="fastlane-sub">Review and copy this report. It contains settings and credential presence only — never API keys, passwords, UUID passwords, or tokens.</div></div><button class="fastlane-close" id="diagClose" aria-label="Close">✕</button></div><pre class="diag-pre" id="diagPre">${JSON.stringify(data,null,2).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre><div class="cb-error-log-section" style="padding:0 20px 12px">${errorLogHtml()}</div><div class="diag-actions"><button class="diag-primary" id="diagCopy">Copy report</button><a class="diag-secondary" href="https://github.com/brevityA/Core-Builds/issues/new" target="_blank" rel="noopener noreferrer">Open GitHub issue</a></div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('#diagClose'))overlay.remove(); if(e.target.closest('#diagCopy'))navigator.clipboard.writeText(JSON.stringify(data,null,2)).then(()=>{e.target.closest('#diagCopy').textContent='✓ Copied';});});
  document.getElementById('diagClose').focus();
}

async function simpleInstall(target) {
  if (!S.service) { showToast('Pick a service first — go back to step 1', true); return; }
  const isFree = S.service === 'p2p' || S.service === 'http';
  const btn = document.getElementById('btnAio') || document.getElementById('btnAutoCreate'), result = document.getElementById('aioResult');
  const origBtnHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Checking…`; }
  const warns = await preflightCheck();
  if (btn) { btn.disabled = false; btn.innerHTML = origBtnHtml; }
  if (warns.length) {
    const proceed = confirm('⚠ Config check:\n\n• ' + warns.join('\n• ') + '\n\nContinue anyway?');
    if (!proceed) return;
  }
  if (S.installMode === 'direct' && target === 'app' && !isFree) {
    if (!S.stremioEmail || !S.stremioPassword) {
      showToast('Enter your Stremio email and password above', true); return;
    }
  }
  const origHtml = btn.innerHTML;
  if (isFree) {
    btn.disabled = true; btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Creating import link…`;
    result.innerHTML = '';
    const importUrl = await uploadTemplateForImport();
    btn.disabled = false; btn.innerHTML = origHtml;
    if (importUrl) {
      saveLastGen();
      result.innerHTML = `<div class="import-success" style="margin-top:12px"><strong style="color:#e6edf3">Tap an instance to import your free template:</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 10px"><strong style="color:#e6edf3">1.</strong> Tap an instance below to open AIOStreams<br><strong style="color:#e6edf3">2.</strong> Your template loads automatically<br><strong style="color:#e6edf3">3.</strong> Set a password and click Save</div>${instanceChips(importUrl)}<div style="color:#4b5563;font-size:.74rem;margin:8px 0 4px">Or copy this URL and paste it on your AIOStreams configure page → Import:</div><div style="display:flex;gap:6px;align-items:stretch"><div class="manifest-url" style="flex:1;min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-action="copy-manifest" data-url="${importUrl.replace(/"/g,'&quot;')}" title="Click to copy">${importUrl}</div><button data-action="copy-manifest" data-url="${importUrl.replace(/"/g,'&quot;')}" style="flex-shrink:0;padding:0 12px;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.28);border-radius:6px;color:#00d4ff;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap">Copy</button></div><div style="font-size:.72rem;color:#6b7280;margin-top:8px">⏳ This link can expire — keep the downloaded JSON as a backup.</div></div>`;
      showToast('Tap an instance chip to import your template');
    } else {
      result.innerHTML = `<div class="import-success import-error" style="margin-top:12px"><strong style="color:#f87171">Could not reach any paste service</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 10px;line-height:1.5">Download the JSON and import it manually into AIOStreams.</div><div style="display:flex;gap:10px;justify-content:center"><button data-action="simple-install" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(0,212,255,.3);background:rgba(0,212,255,.06);color:#00d4ff;font-size:.8rem;font-weight:700;cursor:pointer">Retry</button><button data-action="generate-dl" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#9ca3af;font-size:.8rem;font-weight:700;cursor:pointer">Export JSON</button></div></div>`;
    }
    return;
  }
  const pwd = await promptPassword();
  if (!pwd) return;
  _lastInstall = { target, pwd };
  btn.disabled = true; btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Creating config…`;
  result.innerHTML = '';
  const cfg = buildFinal().config;
  const sz = payloadSizeGuard(cfg);
  if (sz.over) { btn.disabled = false; btn.innerHTML = 'Install'; result.innerHTML = payloadTooLargeHtml(sz); return; }
  const _allHosts = orderedHostEntries();
  const hostLabels = {};
  _allHosts.forEach(([n, u]) => { hostLabels[u] = n; });

  try {
    const fastest = await selectHealthyHost(4000);
    const res = await writeHostFetch(fastest, '/api/v1/user', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ config:cfg, password:pwd }) }, 8000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      const apiMsg = data?.error?.message || data?.message || data?.detail || `Server returned ${res.status}`;
      throw new Error(`API_ERROR:${apiMsg}`);
    }
    {
      const uuid = data?.data?.uuid || data?.uuid || data?.user?.uuid || data?.id;
      const epwd = data?.data?.encryptedPassword || encodeURIComponent(pwd);
      if (uuid) { S.instanceUuid = uuid; S.instancePassword = pwd; saveState(); }
      const manifestUrl = `${fastest}/stremio/${uuid}/${epwd}/manifest.json`;
      const hostLbl = hostLabels[fastest] || fastest.replace('https://','').split('/')[0];
      saveLastGen();
      if (S.installMode === 'direct' && target === 'app' && S.stremioEmail && S.stremioPassword) {
        btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Pushing to Stremio…`;
        try {
          const installed = await pushToStremio(manifestUrl, S.stremioEmail, S.stremioPassword);
          // ── Full Stack: AIOMetadata + Cinemeta patch + addon ordering ──
          btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Setting up full stack…`;
          const stackResult = await fullStackAfterPush(
            (await stremioFetch('https://api.strem.io/api/login', { type:'Login', email:S.stremioEmail, password:S.stremioPassword, facebook:false }))?.result?.authKey,
            manifestUrl,
            { patchCinemeta: S.patchCinemeta !== false, installAIOMetadata: S.installAIOMeta !== false, reorder: true }
          );
          btn.disabled = false; btn.innerHTML = origHtml;
          const stackHtml = stackResult.steps.length ? `<div style="margin-top:8px;padding:8px 10px;border-radius:6px;background:rgba(52,211,153,.04);border:1px solid rgba(52,211,153,.1);font-size:.72rem;color:#8b949e;line-height:1.6">${stackResult.steps.join('<br>')}${stackResult.errors.length ? '<br>' + stackResult.errors.map(e=>`<span style="color:#f87171">⚠ ${e}</span>`).join('<br>') : ''}</div>` : '';
          if (installed === 'already') {
            result.innerHTML = `<div style="margin-top:10px;padding:12px 14px;border-radius:10px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2)"><div style="font-size:.82rem;font-weight:700;color:#fbbf24;margin-bottom:4px">${ICO.check(14,'#fbbf24')} Already installed</div><div style="font-size:.78rem;color:#8b949e">This addon is already in your Stremio library. Reopen Stremio to refresh.</div>${stackHtml}</div>`;
          } else {
            result.innerHTML = `<div style="margin-top:10px;padding:12px 14px;border-radius:10px;background:rgba(63,185,80,.06);border:1px solid rgba(63,185,80,.2)"><div style="font-size:.82rem;font-weight:700;color:#3fb950;margin-bottom:4px">${ICO.check(14,'#3fb950')} ${installed==='replaced'?'Previous install replaced!':'Full Stack Installed!'}</div><div style="font-size:.78rem;color:#8b949e">AIOStreams, AIOMetadata, and Cinemeta patch deployed. Reopen Stremio to see your new setup.</div>${stackHtml}<div style="margin-top:8px;font-size:.74rem;color:#6b7280">Config password: <code style="background:rgba(255,255,255,.05);padding:2px 6px;border-radius:4px;font-size:.72rem;color:#e6edf3">${pwd.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</code> — save it for later edits</div></div>`;
          }
          showToast('Addon installed to your Stremio library');
          return;
        } catch(err) {
          btn.disabled = false; btn.innerHTML = origHtml;
          result.innerHTML = `<div style="margin-top:10px;padding:12px 14px;border-radius:10px;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.2)"><div style="font-size:.82rem;font-weight:700;color:#f87171;margin-bottom:4px">Stremio login failed</div><div style="font-size:.78rem;color:#8b949e">${err.message}</div><div style="margin-top:8px;font-size:.76rem;color:#6b7280">Your config was created successfully — use the manifest URL below to install manually.</div><div style="margin-top:6px;display:flex;gap:6px;align-items:stretch"><div class="manifest-url" style="flex:1;min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem;padding:8px 10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:6px;color:#8b949e;cursor:pointer" data-action="copy-manifest" data-url="${manifestUrl.replace(/"/g,'&quot;')}">${manifestUrl}</div><button data-action="copy-manifest" data-url="${manifestUrl.replace(/"/g,'&quot;')}" style="flex-shrink:0;padding:0 12px;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.28);border-radius:6px;color:#00d4ff;font-size:.8rem;font-weight:700;cursor:pointer">Copy</button></div></div>`;
          return;
        }
      }
      btn.disabled = false; btn.innerHTML = origHtml;
      document.getElementById('fastLaneModal')?.remove();
      showManifestModal(manifestUrl, pwd, hostLbl, target);
      return;
    }
  } catch(e) {
    const isApiError = e.message && e.message.startsWith('API_ERROR:');
    const apiDetail = isApiError ? e.message.slice(10) : '';
    if (isApiError) {
      btn.disabled = false; btn.innerHTML = origHtml;
      const safeMsg = apiDetail.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
      result.innerHTML = renderConfigRejectedDispatch(safeMsg, apiDetail);
      return;
    }
    btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Creating import link…`;
    const importUrl = await uploadTemplateForImport();
    btn.disabled = false; btn.innerHTML = origHtml;
    if (importUrl) {
      saveLastGen();
      const credInputs = getDebridInputs().filter(i => S.creds[i.id] && S.creds[i.id].trim());
      let credBlock = '';
      if (credInputs.length) {
        const rows = credInputs.map(inp => {
          const val = (S.creds[inp.id] || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
          const preview = val.length > 32 ? val.slice(0, 14) + '…' + val.slice(-8) : val;
          return `<div style="display:flex;align-items:center;gap:6px;margin-top:5px"><span style="font-size:.68rem;color:#6b7280;flex-shrink:0;min-width:76px">${inp.label}</span><div style="flex:1;font-family:monospace;font-size:.63rem;color:#9ca3af;background:rgba(0,0,0,.25);border-radius:4px;padding:3px 7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${val}">${preview}</div><button data-action="copy-manifest" data-url="${val}" style="flex-shrink:0;padding:2px 8px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);border-radius:4px;color:#00d4ff;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap">Copy</button></div>`;
        }).join('');
        credBlock = `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.14)"><div style="font-size:.72rem;font-weight:800;color:#fbbf24;letter-spacing:.06em;margin-bottom:3px">${ICO.warn(12,'#fbbf24')} RE-ENTER THESE IN AIOSTREAMS → SERVICES AFTER IMPORT</div><div style="font-size:.72rem;color:#8b949e;margin-bottom:7px">Your credentials were <strong style="color:#fbbf24">stripped from the import URL</strong>. After importing, go to <strong style="color:#e6edf3">Services</strong> and paste each key back in.</div>${rows}</div>`;
      }
      result.innerHTML = `<div class="import-success" style="margin-top:12px"><strong style="color:#e6edf3">All hosts unreachable — tap an instance to import instead:</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 10px"><strong style="color:#e6edf3">1.</strong> Tap an instance below to open AIOStreams<br><strong style="color:#e6edf3">2.</strong> Your template loads automatically<br><strong style="color:#e6edf3">3.</strong> Set a password and click Save</div>${instanceChips(importUrl)}<div style="color:#4b5563;font-size:.74rem;margin:8px 0 4px">Or copy this URL and paste it on your AIOStreams configure page → Import:</div><div style="display:flex;gap:6px;align-items:stretch"><div class="manifest-url" style="flex:1;min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-action="copy-manifest" data-url="${importUrl.replace(/"/g,'&quot;')}" title="Click to copy">${importUrl}</div><button data-action="copy-manifest" data-url="${importUrl.replace(/"/g,'&quot;')}" style="flex-shrink:0;padding:0 12px;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.28);border-radius:6px;color:#00d4ff;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap">Copy</button></div><div style="font-size:.72rem;color:#6b7280;margin-top:8px">⏳ This link can expire — keep the downloaded JSON as a backup.</div>${credBlock}</div>`;
      showToast('Tap an instance chip to import your template');
    } else {
      result.innerHTML = `<div class="import-success import-error" style="margin-top:12px">
        <strong style="color:#f87171">Could not reach any host or paste service</strong>
        <div style="color:#6b7280;font-size:.8rem;margin:6px 0 10px;line-height:1.5">All methods failed. Download the JSON and import it manually into AIOStreams.</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button data-action="simple-install" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(0,212,255,.3);background:rgba(0,212,255,.06);color:#00d4ff;font-size:.8rem;font-weight:700;cursor:pointer">Retry</button>
          <button data-action="generate-dl" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#9ca3af;font-size:.8rem;font-weight:700;cursor:pointer">Export JSON</button>
        </div>
      </div>`;
    }
  }
}

function genPwd() {
  const pwd = makePwd();
  S.instancePassword = pwd; saveState();
  const el = document.getElementById('aioPwd'); if (el) { el.value = pwd; el.type = 'text'; }
  showToast('Password generated — copy it now');
  setTimeout(() => { const e = document.getElementById('aioPwd'); if (e) e.type = 'password'; }, 5000);
}

function stremioFetch(url, body, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body), signal: ctrl.signal })
    .then(r => { if (!r.ok) throw new Error(`Stremio API error (${r.status})`); return r.json(); })
    .finally(() => clearTimeout(timer));
}

async function pushToStremio(manifestUrl, email, password) {
  const loginData = await stremioFetch('https://api.strem.io/api/login', { type:'Login', email, password, facebook:false });
  const authKey = loginData?.result?.authKey;
  if (!authKey) throw new Error(loginData?.error || 'Login failed — check your email and password.');
  const getData = await stremioFetch('https://api.strem.io/api/addonCollectionGet', { type:'AddonCollectionGet', authKey, update:true });
  if (!getData?.result?.addons) throw new Error(getData?.error || 'Could not fetch your addon list.');
  const existing = getData.result.addons;
  const already = existing.some(a => a.transportUrl === manifestUrl);
  if (already && !S.cleanInstall) return 'already';
  const knownBases = Object.values(HOST_BASE_URLS);
  const isKnownAioManifest = a => typeof a?.transportUrl === 'string' && a.transportUrl.includes('/stremio/') && knownBases.some(base => a.transportUrl.startsWith(base));
  const kept = S.cleanInstall ? existing.filter(a => !isKnownAioManifest(a)) : existing.slice();
  if (!kept.some(a => a.transportUrl === manifestUrl)) kept.push({ transportName:'http', transportUrl: manifestUrl, flags:{} });
  const setData = await stremioFetch('https://api.strem.io/api/addonCollectionSet', { type:'AddonCollectionSet', authKey, addons: kept });
  if (!setData?.result) throw new Error(setData?.error || 'Install failed.');
  return S.cleanInstall ? 'replaced' : 'installed';
}

// ── Full Stack Install (Cinemeta patch + AIOMetadata + addon ordering) ──

const CINEBYE_HOSTS = ['https://cinebye.elfhosted.com', 'https://cinebye.dinsden.top'];
const AIOMETADATA_MANIFEST = 'https://aiometadata.elfhosted.com/manifest.json';

/**
 * Patch Cinemeta via Cinebye to hide its catalogs/metadata/search.
 * Returns { ok: boolean, message: string }
 */
async function patchCinemeta(authKey, patches = ['removeSearch','removeCatalogs']) {
  for (const host of CINEBYE_HOSTS) {
    try {
      const res = await fetchWithTimeout(`${host}/api/patch`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ authKey, patches })
      }, 8000);
      if (res.ok) return { ok:true, message:`Cinemeta patched: ${patches.join(', ')}` };
    } catch(e) { /* try next host */ }
  }
  return { ok:false, message:'Could not reach Cinebye — patch manually at cinebye.elfhosted.com' };
}

/**
 * Reorder addons: Cinemeta → AIOMetadata → AIOStreams → others
 * Returns { ok: boolean, message: string }
 */
async function reorderAddons(authKey, aiometadataUrl, aiostreamsUrl) {
  const getData = await stremioFetch('https://api.strem.io/api/addonCollectionGet', { type:'AddonCollectionGet', authKey, update:true });
  if (!getData?.result?.addons) return { ok:false, message:'Could not fetch addons' };
  const existing = getData.result.addons;
  const cinemeta = existing.find(a => a.transportUrl?.includes('cinemeta'));
  const aiometa = existing.find(a => a.transportUrl === aiometadataUrl);
  const aios = existing.find(a => a.transportUrl === aiostreamsUrl);
  const others = existing.filter(a => a !== cinemeta && a !== aiometa && a !== aios);
  const ordered = [];
  if (cinemeta) ordered.push(cinemeta);
  if (aiometa) ordered.push(aiometa);
  if (aios) ordered.push(aios);
  ordered.push(...others);
  const setData = await stremioFetch('https://api.strem.io/api/addonCollectionSet', { type:'AddonCollectionSet', authKey, addons: ordered });
  if (!setData?.result) return { ok:false, message:'Failed to save addon order' };
  return { ok:true, message:'Addon order: Cinemeta → AIOMetadata → AIOStreams' };
}

/**
 * Full stack install: AIOStreams + AIOMetadata + Cinemeta patch + addon order.
 * Called after the AIOStreams config has been pushed to Stremio.
 */
async function fullStackAfterPush(authKey, aiostreamsUrl, opts = {}) {
  const steps = [];
  const errors = [];
  const { patchCinemeta: doPatch = true, installAIOMetadata = true, reorder = true } = opts;

  // Step 1: Install AIOMetadata
  if (installAIOMetadata) {
    try {
      const getData = await stremioFetch('https://api.strem.io/api/addonCollectionGet', { type:'AddonCollectionGet', authKey, update:true });
      const existing = getData?.result?.addons || [];
      if (!existing.some(a => a.transportUrl === AIOMETADATA_MANIFEST)) {
        const updated = [...existing, { transportName:'http', transportUrl: AIOMETADATA_MANIFEST, flags:{} }];
        await stremioFetch('https://api.strem.io/api/addonCollectionSet', { type:'AddonCollectionSet', authKey, addons: updated });
        steps.push('✓ AIOMetadata installed');
      } else {
        steps.push('✓ AIOMetadata already installed');
      }
    } catch(e) { errors.push('AIOMetadata: ' + e.message); }
  }

  // Step 2: Patch Cinemeta
  if (doPatch) {
    const r = await patchCinemeta(authKey);
    if (r.ok) steps.push('✓ ' + r.message);
    else errors.push(r.message);
  }

  // Step 3: Reorder addons
  if (reorder) {
    const r = await reorderAddons(authKey, AIOMETADATA_MANIFEST, aiostreamsUrl);
    if (r.ok) steps.push('✓ ' + r.message);
    else errors.push(r.message);
  }

  return { steps, errors, ok: errors.length === 0 };
}

async function createRandomStremioAccount() {
  const btn = document.querySelector('[data-action="create-stremio-account"]');
  if (btn) { btn.textContent = 'Creating…'; btn.style.pointerEvents = 'none'; }
  try {
    const a = new Uint8Array(8); crypto.getRandomValues(a);
    const rand = Array.from(a, b => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
    const email = `corebuilds_${rand}@stremio.com`;
    const password = makePwd();
    const data = await stremioFetch('https://api.strem.io/api/register', { type:'Register', email, password, gdpr_consent:{ tos:true, privacy:true, marketing:false, from:'web' } });
    if (data?.result?.authKey || data?.result?.user) {
      S.stremioEmail = email;
      S.stremioPassword = password;
      saveState();
      const eI = document.getElementById('stremioEmailInline');
      const pI = document.getElementById('stremioPasswordInline');
      if (eI) eI.value = email;
      if (pI) { pI.value = password; pI.type = 'text'; setTimeout(() => { if (pI) pI.type = 'password'; }, 8000); }
      showToast('Stremio account created — credentials filled in');
    } else {
      throw new Error(data?.error || 'Registration failed');
    }
  } catch(err) {
    showToast('Could not create account: ' + err.message, true);
  }
  if (btn) { btn.textContent = 'Create random account →'; btn.style.pointerEvents = ''; }
}

function extractManifestParts(val) {
  if (!val || !val.includes('/stremio/')) return null;
  try {
    const u = new URL(val);
    const parts = u.pathname.split('/').filter(Boolean);
    const stremioIdx = parts.indexOf('stremio');
    if (stremioIdx === -1 || parts.length < stremioIdx + 2) return null;
    const uuid = parts[stremioIdx + 1];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) return null;
    const rawPwd = parts.length > stremioIdx + 2 ? parts[stremioIdx + 2] : '';
    const password = (rawPwd && rawPwd !== 'manifest.json') ? decodeURIComponent(rawPwd) : '';
    const origin = u.origin;
    const hostKey = Object.keys(HOST_BASE_URLS).find(k => HOST_BASE_URLS[k] === origin) || null;
    return { uuid, password, hostKey };
  } catch(e) { return null; }
}

function validateUuid(val) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '');
}

function updateUuidValidation(val) {
  const input = document.getElementById('aioUuid');
  const status = document.getElementById('uuidStatus');
  if (!input || !status) return;
  if (!val) { input.style.borderColor = ''; status.innerHTML = ''; return; }
  const ok = validateUuid(val);
  input.style.borderColor = ok ? '#22c55e' : '#f87171';
  status.innerHTML = ok
    ? '<span style="color:#22c55e;font-weight:700">' + ICO.check(12,'#22c55e') + ' Valid UUID — Saved</span>'
    : '<span style="color:#f87171">Invalid format — must be xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</span>';
}

function onPasteManifest(val) {
  val = (val || '').trim();
  const result = document.getElementById('pasteManifestResult');
  if (!val) { result.innerHTML = ''; return; }
  try { new URL(val); } catch(e) { result.innerHTML = ''; return; }
  result.innerHTML = '';
  const extracted = extractManifestParts(val);
  if (extracted) {
    if (extracted.uuid && !S.instanceUuid) { S.instanceUuid = extracted.uuid; saveState(); const uel=document.getElementById('aioUuid'); if(uel)uel.value=extracted.uuid; updateUuidValidation(extracted.uuid); }
    if (extracted.hostKey && S.instanceHost !== extracted.hostKey) { S.instanceHost = extracted.hostKey; saveState(); const sel=document.getElementById('aioHost'); if(sel)sel.value=extracted.hostKey; const uuidRow=document.getElementById('aioUuidRow'),cfgLinkRow=document.getElementById('hostConfigLinkRow'),cfgLink=document.getElementById('hostConfigLink'); if(uuidRow)uuidRow.style.display=''; if(cfgLinkRow)cfgLinkRow.style.display=''; if(cfgLink&&HOST_BASE_URLS[extracted.hostKey])cfgLink.href=HOST_BASE_URLS[extracted.hostKey]+'/configure'; }
    if (extracted.password && !S.instancePassword) { S.instancePassword = extracted.password; saveState(); const pe=document.getElementById('aioPwd'); if(pe)pe.value=extracted.password; }
  }
  showManifestModal(val, null, null);
}

function wuplayBtn(manifestUrl) {
  const safe = escH(manifestUrl||'');
  return `<button type="button" data-action="copy-wuplay" data-url="${safe}" title="Copy manifest URL — paste into WuPlay → Addons → Add Addon" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 14px;border-radius:8px;font-weight:700;font-size:.88rem;cursor:pointer;border:1px solid #4f46e5;background:#16103a;color:#a78bfa;transition:all .15s"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>WuPlay</button>`;
}

function instanceChips(templateUrl) {
  const _all = hostEntries().map(([n,u]) => [n, u + '/stremio/configure']);
  const hosts = (S.service === 'p2p' || S.service === 'http') ? _all.filter(([n]) => n !== 'ElfHosted') : _all;
  return `<div class="inst-chips">${hosts.map(([n,u])=>`<a href="${u}${templateUrl?`?template=${encodeURIComponent(templateUrl)}`:''}" target="_blank" rel="noopener noreferrer" class="inst-chip ${templateUrl?'inst-chip-import':''}">${templateUrl?'▶ ':''}${n}</a>`).join('')}</div>`;
}

function tmdbHint(field, val) {
  const v = (val || '').trim();
  if (!v) return '';
  const looksToken = v.startsWith('eyJ');
  const looksKey = /^[a-f0-9]{32}$/i.test(v);
  if (field === 'token' && looksKey) return '<span style="color:#f59e0b">' + ICO.warn(12,'#f59e0b') + ' That is the 32-character API Key — this field wants the long Read Access Token (starts with eyJ).</span>';
  if (field === 'token' && !looksToken && v.length >= 20) return '<span style="color:#f59e0b">' + ICO.warn(12,'#f59e0b') + ' Read Access Tokens start with eyJ — this does not look like one.</span>';
  if (field === 'token' && looksToken && v.length >= 100) return '<span style="color:#34d399">' + ICO.check(12,'#34d399') + ' Looks like a valid Read Access Token</span>';
  if (field === 'key' && looksToken) return '<span style="color:#f59e0b">' + ICO.warn(12,'#f59e0b') + ' That is the Read Access Token — this field wants the 32-character API Key.</span>';
  if (field === 'key' && !looksKey && v.length >= 24) return '<span style="color:#f59e0b">' + ICO.warn(12,'#f59e0b') + ' API Keys are exactly 32 characters (letters and numbers) — this does not look like one.</span>';
  if (field === 'key' && looksKey) return '<span style="color:#34d399">' + ICO.check(12,'#34d399') + ' Looks like a valid API Key</span>';
  return '';
}


async function fetchWithTimeout(url, options = {}, timeout = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(id); }
}

// Races a direct browser fetch against the Cloudflare Worker CORS proxy for the same
// AIOStreams host/path — most public instances don't send CORS headers, so the direct
// attempt fails fast and the proxied one (server-to-server, no CORS) wins. Whichever
// resolves first is used; if CORS_PROXY is unset only the direct attempt runs.
function raceHostFetch(host, path, options, timeout) {
  const attempts = [fetchWithTimeout(`${host}${path}`, options, timeout)];
  if (CORS_PROXY) attempts.push(fetchWithTimeout(`${CORS_PROXY}/proxy${path}?host=${encodeURIComponent(host)}`, options, timeout));
  return Promise.any(attempts);
}

// Never race mutating requests: a direct POST can succeed server-side while CORS hides
// the response, causing the proxied attempt to create a duplicate configuration.
function writeHostFetch(host, path, options, timeout) {
  const url = CORS_PROXY
    ? `${CORS_PROXY}/proxy${path}?host=${encodeURIComponent(host)}`
    : `${host}${path}`;
  return fetchWithTimeout(url, options, timeout);
}

async function uploadJsonForImport(jsonStr) {
  let url = null;
  if (CORS_PROXY) {
    try {
      const r = await fetchWithTimeout(`${CORS_PROXY}/paste`, { method:'POST', headers:{'Content-Type':'application/json'}, body:jsonStr }, 5000);
      if (r.ok) { const d = await r.json(); url = d.url || null; }
    } catch(e) { console.warn("CF paste failed", e); }
  }
  if (!url) {
    try {
      const r = await fetchWithTimeout('https://paste.rs/', { method:'POST', headers:{'Content-Type':'text/plain'}, body:jsonStr }, 5000);
      if (r.ok) url = (await r.text()).trim();
    } catch(e) { console.warn("paste.rs failed/timed out", e); }
  }
  if (!url) {
    try {
      const r = await fetchWithTimeout('https://dpaste.com/api/v2/', { method:'POST', body:new URLSearchParams({ content:jsonStr, syntax:'json', expiry_days:'365' }) }, 5000);
      if (r.ok) { const t=(await r.text()).trim().replace(/"/g,''); url = t.startsWith('http') ? t+'.txt' : null; }
    } catch(e) { console.warn("dpaste failed/timed out", e); }
  }
  return url;
}

async function uploadTemplateForImport() {
  const template = sanitizeTemplateForRemoteImport(buildFinal());
  return uploadJsonForImport(JSON.stringify(template, null, 2));
}

async function createImportUrl() {
  if (!S.service) { showToast('No service selected — go back and pick your debrid service first', true); return; }
  const btn = document.getElementById('btnImport'), result = document.getElementById('importUrlResult'), origHtml = btn.innerHTML;
  btn.disabled = true; btn.textContent = 'Creating…'; result.innerHTML = '';
  const url = await uploadTemplateForImport();
  btn.disabled = false; btn.innerHTML = origHtml;

  if (url) {
    saveLastGen();
    navigator.clipboard.writeText(url).catch(()=>{});

    // Build credential reminder block — keys were stripped from import URL
    const credInputs = getDebridInputs().filter(i => S.creds[i.id] && S.creds[i.id].trim());
    let credBlock = '';
    if (credInputs.length) {
      const rows = credInputs.map(inp => {
        const val = (S.creds[inp.id] || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
        const preview = val.length > 32 ? val.slice(0, 14) + '…' + val.slice(-8) : val;
        return `<div style="display:flex;align-items:center;gap:6px;margin-top:5px">
          <span style="font-size:.68rem;color:#6b7280;flex-shrink:0;min-width:76px">${inp.label}</span>
          <div style="flex:1;font-family:monospace;font-size:.63rem;color:#9ca3af;background:rgba(0,0,0,.25);border-radius:4px;padding:3px 7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${val}">${preview}</div>
          <button data-action="copy-manifest" data-url="${val}" style="flex-shrink:0;padding:2px 8px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);border-radius:4px;color:#00d4ff;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s" onmouseover="this.style.background='rgba(0,212,255,.18)'" onmouseout="this.style.background='rgba(0,212,255,.08)'">Copy</button>
        </div>`;
      }).join('');
      credBlock = `<div class="cred-remind" style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.14)">
        <div class="cr-hdr" style="font-size:.72rem;font-weight:800;color:#fbbf24;letter-spacing:.06em;margin-bottom:3px">${ICO.warn(12,'#fbbf24')} RE-ENTER THESE IN AIOSTREAMS → SERVICES AFTER IMPORT</div>
        <div style="font-size:.72rem;color:#8b949e;margin-bottom:7px">Your debrid credentials were <strong style="color:#fbbf24">stripped from the import URL</strong>. Once AIOStreams has loaded your template, go to <strong style="color:#e6edf3">Services</strong> and paste each key back in.</div>
        ${rows}
      </div>`;
    }

    result.innerHTML = `<div class="import-success" style="margin-top:10px"><strong>▶ Tap your instance to load the template into AIOStreams</strong><div style="color:#6b7280;font-size:.79rem;margin:4px 0 8px"><strong style="color:#e6edf3">This is not a Stremio link</strong> — it loads your settings into AIOStreams so you can get a manifest. <strong style="color:#fbbf24">Debrid credentials are stripped</strong>; you'll re-enter them in AIOStreams after import.</div>${instanceChips(url)}<div style="color:#4b5563;font-size:.74rem;margin:8px 0 4px">Or copy this URL and paste it on your AIOStreams configure page → Import button:</div><div style="display:flex;gap:6px;align-items:stretch"><div class="manifest-url" style="flex:1;min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-action="copy-manifest" data-url="${url.replace(/"/g,'&quot;')}" title="Click to copy">${url}</div><button data-action="copy-manifest" data-url="${url.replace(/"/g,'&quot;')}" style="flex-shrink:0;padding:0 12px;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.28);border-radius:6px;color:#00d4ff;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s" onmouseover="this.style.background='rgba(0,212,255,.2)'" onmouseout="this.style.background='rgba(0,212,255,.1)'">Copy URL</button></div><div style="font-size:.72rem;color:#6b7280;margin-top:8px">⏳ This link expires after 30 days — keep the downloaded JSON as a backup.</div>${credBlock}</div>`;
    showToast('Click an instance chip to auto-import your template');
  } else {
    logError('deploy', 'Paste service blocked or timed out', { service: S.service });
    result.innerHTML = `<div class="import-success import-error" style="margin-top:10px"><strong style="color:#f87171">Paste service blocked or timed out</strong><div style="color:#6b7280;font-size:.79rem;margin-top:4px">The upload failed — CORS block, rate limit, or paste.rs downtime. Use ⬇ Download instead, then import the file in AIOStreams.</div></div>`;
    showToast('Paste service unreachable', true);
  }
}

async function openInAIOStreams() {
  const HOST_URLS = HOST_BASE_URLS;
  const HOST_LABELS = Object.fromEntries(Object.entries(HOST_BASE_URLS).map(([k,u]) => [u, HOST_LABEL_MAP[k]||k]));
  const isAuto = S.instanceHost === 'auto', isCustom = S.instanceHost === 'custom';
  const base = HOST_URLS[S.instanceHost] || (S.instanceUrl || '').trim().replace(/\/$/, '');

  if (!isAuto && !base) { showToast('Enter your AIOStreams instance URL first', true); return; }

  const result = document.getElementById('manualAioResult'), btn = document.getElementById('btnAio');
  const uuid = (S.instanceUuid || '').trim(), pwd = S.instancePassword;
  const hostLabel = base ? (HOST_LABELS[base] || base.replace('https://','').split('/')[0]) : null;

  const setBtnLoading = () => { btn.disabled = true; btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Connecting…`; };
  const resetBtn = orig => { btn.disabled = false; btn.innerHTML = orig; };

  /* Auto mode — probe hosts first, then send credentials only to the winner */
  if (isAuto && pwd) {
    const origHtml = btn.innerHTML;
    setBtnLoading(); result.innerHTML = '';
    const cfg = buildFinal().config;
    const sz = payloadSizeGuard(cfg);
    if (sz.over) { resetBtn(origHtml); result.innerHTML = payloadTooLargeHtml(sz); return; }
    const existingUuid = validateUuid(uuid) ? uuid : null;
    const fastest = await selectHealthyHost(4000).catch(() => null);
    if (!fastest) { logError('deploy', 'All hosts unreachable', { service: S.service, host: S.instanceHost }); resetBtn(origHtml); result.innerHTML = `<div class="import-success import-error" style="margin-top:12px"><strong style="color:#f87171">All Hosts Unreachable</strong></div>`; return; }
    rememberGoodHost(fastest);
    const attempt = async (id) => {
      const path = id ? `/api/v1/user/${id}` : '/api/v1/user';
      const res = await writeHostFetch(fastest, path, { method: id ? 'PATCH' : 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ config:cfg, password:pwd }) }, 5000);
      const data = await res.json().catch(()=>({}));
      if (res.ok && data?.success !== false) return { host: fastest, uuid: id || data?.data?.uuid || data?.uuid || data?.user?.uuid || data?.id, epwd: data?.data?.encryptedPassword };
      const apiMsg = data?.error?.message || data?.message || data?.detail || `Server returned ${res.status}`;
      throw new Error(`API_ERROR:${apiMsg}`);
    };
    try {
      let winner;
      try { winner = await attempt(existingUuid); }
      catch(err) {
        if (existingUuid) winner = await attempt(null);
        else throw err;
      }
      if (winner.uuid) { S.instanceUuid = winner.uuid; saveState(); }
      const manifestPwd = winner.epwd || encodeURIComponent(pwd);
      resetBtn(origHtml);
      showManifestModal(`${winner.host}/stremio/${winner.uuid}/${manifestPwd}/manifest.json`, pwd, HOST_LABELS[winner.host] || winner.host.replace('https://','').split('/')[0]);
    } catch(e) {
      const isApiError = e.message && e.message.startsWith('API_ERROR:');
      const apiDetail = isApiError ? e.message.slice(10) : '';
      if (isApiError) {
        resetBtn(origHtml);
        const safeMsg = apiDetail.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
        result.innerHTML = renderConfigRejectedDispatch(safeMsg, apiDetail);
      } else if (S.simpleMode) {
        btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Creating import link…`;
        const importUrl = await uploadTemplateForImport();
        resetBtn(origHtml);
        if (importUrl) {
          saveLastGen();
          const credInputs = getDebridInputs().filter(i => S.creds[i.id] && S.creds[i.id].trim());
          let credBlock = '';
          if (credInputs.length) {
            const rows = credInputs.map(inp => {
              const val = (S.creds[inp.id] || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
              const preview = val.length > 32 ? val.slice(0, 14) + '…' + val.slice(-8) : val;
              return `<div style="display:flex;align-items:center;gap:6px;margin-top:5px"><span style="font-size:.68rem;color:#6b7280;flex-shrink:0;min-width:76px">${inp.label}</span><div style="flex:1;font-family:monospace;font-size:.63rem;color:#9ca3af;background:rgba(0,0,0,.25);border-radius:4px;padding:3px 7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${val}">${preview}</div><button data-action="copy-manifest" data-url="${val}" style="flex-shrink:0;padding:2px 8px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);border-radius:4px;color:#00d4ff;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap">Copy</button></div>`;
            }).join('');
            credBlock = `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.14)"><div style="font-size:.72rem;font-weight:800;color:#fbbf24;letter-spacing:.06em;margin-bottom:3px">${ICO.warn(12,'#fbbf24')} RE-ENTER THESE IN AIOSTREAMS → SERVICES AFTER IMPORT</div><div style="font-size:.72rem;color:#8b949e;margin-bottom:7px">Your credentials were <strong style="color:#fbbf24">stripped from the import URL</strong>. After importing, go to <strong style="color:#e6edf3">Services</strong> and paste each key back in.</div>${rows}</div>`;
          }
          result.innerHTML = `<div class="import-success" style="margin-top:12px"><strong style="color:#e6edf3">One-click wasn't available — here's the quick import instead:</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 10px"><strong style="color:#e6edf3">1.</strong> Tap an instance below to open AIOStreams<br><strong style="color:#e6edf3">2.</strong> Your template loads automatically<br><strong style="color:#e6edf3">3.</strong> Set a password and click Save</div>${instanceChips(importUrl)}<div style="color:#4b5563;font-size:.74rem;margin:8px 0 4px">Or copy this URL and paste it on your AIOStreams configure page → Import:</div><div style="display:flex;gap:6px;align-items:stretch"><div class="manifest-url" style="flex:1;min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-action="copy-manifest" data-url="${importUrl.replace(/"/g,'&quot;')}" title="Click to copy">${importUrl}</div><button data-action="copy-manifest" data-url="${importUrl.replace(/"/g,'&quot;')}" style="flex-shrink:0;padding:0 12px;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.28);border-radius:6px;color:#00d4ff;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap">Copy</button></div><div style="font-size:.72rem;color:#6b7280;margin-top:8px">⏳ This link can expire — keep the downloaded JSON as a backup.</div>${credBlock}</div>`;
          showToast('Tap an instance chip to import your template');
        } else {
          result.innerHTML = `<div class="import-success import-error" style="margin-top:12px"><strong style="color:#f87171">All Hosts Unreachable</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 10px">Couldn't connect directly or create an import link. Try again in a minute, or use the manual options.</div><button data-action="show-full-review" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(0,212,255,.3);background:rgba(0,212,255,.06);color:#00d4ff;font-size:.78rem;font-weight:700;cursor:pointer">Show manual setup options →</button></div>`;
        }
      } else {
        resetBtn(origHtml);
        result.innerHTML = `<div class="import-success import-error" style="margin-top:12px"><strong style="color:#f87171">All Hosts Unreachable</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 10px">All hosts timed out or refused the connection (CORS, rate limit, or downtime). Use <strong style="color:#8b949e">Step 1 — Import to AIOStreams</strong> or <strong style="color:#8b949e">Download</strong> instead.</div></div>`;
      }
    }
    return;
  }

  /* Known host + UUID — show manifest URL directly, no API call */
  if (uuid && !isAuto) {
    const manifestUrl = pwd ? `${base}/stremio/${uuid}/${encodeURIComponent(pwd)}/manifest.json` : `${base}/stremio/${uuid}/manifest.json`;
    showManifestModal(manifestUrl, pwd || null, hostLabel);
    return;
  }

  /* No UUID, not auto or custom — guide to get UUID */
  if (!uuid && !isCustom && !isAuto) {
    result.innerHTML = `<div class="import-success import-info" style="margin-top:12px"><strong style="color:#e6edf3">No UUID entered</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 2px">Sign in to your AIOStreams instance, copy your UUID from the configure page and paste it above.</div><div style="color:#4b5563;font-size:.77rem;margin:6px 0 4px">Or use <strong style="color:#8b949e">Import to AIOStreams</strong> above — click a chip below to open AIOStreams and import in one click:</div>${instanceChips()}</div>`;
    return;
  }

  /* Known host + password + no UUID — create new config via API */
  if (pwd) {
    const origHtml = btn.innerHTML;
    setBtnLoading(); result.innerHTML = '';
    try {
      const cfg = buildFinal().config;
      const sz = payloadSizeGuard(cfg);
      if (sz.over) { resetBtn(origHtml); result.innerHTML = payloadTooLargeHtml(sz); return; }
      const res = await writeHostFetch(base, '/api/v1/user', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ config: cfg, password: pwd }) }, 8000);
      const data = await res.json().catch(()=>({}));
      if (res.ok && data?.success !== false) {
        const outUuid = data?.data?.uuid || data?.uuid || data?.user?.uuid || data?.id;
        const epwd = data?.data?.encryptedPassword || encodeURIComponent(pwd);
        if (outUuid && !uuid) { S.instanceUuid = outUuid; saveState(); }
        resetBtn(origHtml);
        showManifestModal(`${base}/stremio/${outUuid}/${epwd}/manifest.json`, pwd, hostLabel);
      } else throw new Error('API Error');
    } catch(e) {
      logError('deploy', 'Connection failed to host', { host: S.instanceHost, error: e.message });
      resetBtn(origHtml);
      result.innerHTML = `<div class="import-success import-error" style="margin-top:12px"><strong style="color:#f87171">Connection Failed</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 10px">Host timed out or refused the connection (CORS, rate limit, or downtime). Use <strong style="color:#8b949e">Step 1 — Import to AIOStreams</strong> or <strong style="color:#8b949e">Download</strong> instead.</div></div>`;
    }
    return;
  }

  result.innerHTML = `<div class="import-success import-info" style="margin-top:12px"><strong style="color:#e6edf3">Enter a password to proceed</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 4px">Set a password above to generate or save your config. Or use <strong style="color:#8b949e">Import to AIOStreams</strong> above.</div></div>`;
}

window.toggleTheme = toggleTheme;

// Test-only generation hook — active only with ?cb-e2e=1. The golden-snapshot e2e
// specs (e2e/golden-configs.spec.mjs) drive the real pipeline (S → build() →
// buildFinal()) across a service × resolution × architecture matrix and diff the
// output against checked-in goldens. Exposes pure generation logic only; never
// credentials (none are set in the test states) and never the network.
if (new URLSearchParams(location.search).get('cb-e2e') === '1') {
  window.__coreBuilds = {
    generate(overrides) {
      Object.assign(S, overrides || {});
      // Transitional adapter: policy composition is now routed through the pure
      // facade; legacy assembly remains the injected adapter until Part 8's
      // full config assembly migration is complete.
      const out = generateTemplate(S, {
        deviceAv1Safe: DEVICE_AV1_SAFE,
        deviceForceLimitedAudio: DEVICE_FORCE_LIMITED_AUDIO,
        presets: presets(),
        defaultTimeout: Number(S.addonTimeout) || 6000,
        assemble: () => applyOutputProfile(assembleTemplate(build(), {
          metadata: { coreBuildsVersion: TEMPLATE_VERSION, generatedAt: new Date().toISOString() },
          disabledAddons: _disabledAddons,
          presetMatchesAddon,
          migrationKeep: S._migrationKeep,
        }), activeOutputProfile(), outputProfileContext()),
      });
      if (out && out.metadata) {
        delete out.metadata.generatedAt;                    // volatile timestamp
        out.metadata.id = 'core-custom-golden';             // sid() is random per build
      }
      return out;
    },
    diagnostics() {
      return buildSanitizedDiagnostics();
    },
    setState(overrides) {
      Object.assign(S, overrides || {});
      if (overrides && overrides.creds) Object.assign(S.creds, overrides.creds);
      return true;
    },
    openTestDrive() {
      showTestDriveModal();
      return true;
    },
    coreScore(stream, ctx) {
      return scoreStream(stream, ctx);
    },
  };
}
