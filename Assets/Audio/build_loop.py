import wave, numpy as np, subprocess
from scipy.signal import butter, lfilter

SR=44100
subprocess.run(['ffmpeg','-y','-i','audio/open-space.mp3','-ac','2','-ar',str(SR),'/tmp/openspace.wav'],capture_output=True)
w=wave.open('/tmp/openspace.wav','rb'); sr=w.getframerate(); n=w.getnframes()
d=np.frombuffer(w.readframes(n),dtype=np.int16).astype(float)
d=d.reshape(-1,2)
print('src', d.shape, 'sr',sr)

SEG=24.0            # loop length
CF=1.5              # crossfade seconds
start=int(30*sr)    # calm steady section
L=int(SEG*sr); cfl=int(CF*sr)
clip=d[start:start+L+cfl]
if len(clip)<L+cfl:
    raise SystemExit("not enough audio for a seamless window")

# ---- lofi treatment applied to the WHOLE (L+cfl) window FIRST, so the
#      crossfade (done LAST) heals whatever seam the treatment introduces. ----
def lowpass(x, cutoff):
    b,a=butter(2, cutoff/(SR/2), btype='low')
    return lfilter(b,a,x,axis=0)

# tape wobble: smooth, small pitch modulation (causes only tiny phase shift)
tt=np.arange(len(clip))/SR
wob=1+0.0015*np.sin(2*np.pi*0.8*tt)+0.0008*np.sin(2*np.pi*3.1*tt)
indices=np.cumsum(wob).astype(int)
indices=np.clip(indices,0,len(clip)-1)
clip=clip[indices]
# hiss (continuous smooth noise, applied to whole window)
rng=np.random.default_rng(7)
hiss=rng.normal(0,1,(len(clip),2))
b,a=butter(2,4000/(SR/2),btype='low'); hiss=lfilter(b,a,hiss,axis=0)
clip=clip + hiss*6.0
# crackle
crack=rng.random(len(clip))
mask=crack>0.99985
imp=np.zeros((len(clip),2))
imp[mask]=rng.normal(0,1,(mask.sum(),2))*1800
b,a=butter(1,1200/(SR/2),btype='low'); imp=lfilter(b,a,imp,axis=0)
clip=clip+imp
# lofi lowpass
clip=lowpass(clip, 5200)
clip=clip/np.abs(clip).max()

# ---- Build a SEAMLESS 24s loop: crossfade tail-extension onto head (LAST step) ----
#   loop[i] = clip[i]*fadein + clip[L+i]*fadeout   for i in [0,cfl)
#   loop[i] = clip[i]                                for i in [cfl,L)
# Then loop[L-1]=clip[L-1] and loop[0]=clip[L] are consecutive treated-source
# samples -> the wrap is perfectly continuous; the internal cfl seam is too.
loop=np.zeros((L,2))
fadein=np.linspace(0,1,cfl)[:,None]**2
fadeout=np.linspace(1,0,cfl)[:,None]**2
loop[:cfl]= clip[:cfl]*fadein + clip[L:L+cfl]*fadeout
loop[cfl:]= clip[cfl:L]
loop=loop/np.abs(loop).max()*0.42

# ---- 48s = two copies of the seamless 24s loop ----
N=int(SR*48.0)
mix=np.zeros((N,2))
for off in (0, int(SR*SEG)):
    e=min(off+len(loop),N); mix[off:e]=loop[:e-off]
mix=mix/np.abs(mix).max()*0.42

p=(mix*32767).astype(np.int16)
out=np.empty((N,2),dtype=np.int16); out[:,0]=p[:,0]; out[:,1]=p[:,1]
w=wave.open('/tmp/loop48_darker.wav','w'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes()); w.close()
print('wrote /tmp/loop48_darker.wav', out.shape)
