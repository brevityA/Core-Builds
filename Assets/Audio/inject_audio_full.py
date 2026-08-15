import base64
b64 = base64.b64encode(open('final_master.mp3','rb').read()).decode()
html = open('core-wallpaper.html','r',encoding='utf-8').read()
audio = ('<audio id="music" loop preload="auto" src="data:audio/mpeg;base64,' + b64 + '"></audio>')
hint = ('<div id="sfxHint" style="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:60;'
        'font-family:system-ui;font-size:13px;font-weight:600;letter-spacing:.14em;color:rgba(0,212,255,.85);'
        'background:rgba(10,16,26,.55);border:1px solid rgba(0,212,255,.35);padding:8px 18px;'
        'border-radius:999px;backdrop-filter:blur(6px);opacity:1;transition:opacity 1.2s ease;pointer-events:none;">'
        'TAP FOR SOUND</div>')
script = ('<script>(function(){var a=document.getElementById("music"),h=document.getElementById("sfxHint"),s=false;'
          'function hide(){if(h){h.style.opacity="0";setTimeout(function(){if(h)h.remove();},1300);}}'
          'function p(){if(s)return;s=true;a.play().catch(function(){});hide();}'
          'document.addEventListener("click",p,{once:true});'
          'document.addEventListener("pointerdown",p,{once:true});'
          '// Never show the hint during headless video capture (it would appear in every frame)'
          'setInterval(function(){if(window.__capture){hide();}},200);'
          '})();</script>')
insert = audio + hint + script
# idempotent: remove any prior audio tag, hint, or injected script before injecting fresh
import re
html = re.sub(r'<audio id="music"[^>]*></audio>', '', html)
html = re.sub(r'<div id="sfxHint"[^>]*>TAP FOR SOUND</div>', '', html)
html = re.sub(r'<script>\(function\(\)\{var a=document\.getElementById\("music"\)[^<]*</script>', '', html, flags=re.S)
idx = html.find('</body>')
assert idx != -1
html = html[:idx] + insert + '\n</body>\n</html>\n'
open('core-wallpaper.html','w',encoding='utf-8').write(html)
print("injected audio+hint+script, total b64", len(b64))
