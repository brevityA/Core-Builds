import wave, numpy as np, subprocess, os
from scipy.signal import butter, lfilter

SR=44100; LOOP=48.0; N=int(SR*LOOP)

def load_wav(path):
    w=wave.open(path,'rb'); sr=w.getframerate(); n=w.getnframes()
    d=np.frombuffer(w.readframes(n),dtype=np.int16).astype(float)
    if len(d) % 2 != 0:
        d=np.concatenate([d,[d[-1]]])
    d=d.reshape(-1,2)
    return d, sr

def load_mp3(path):
    subprocess.run(['ffmpeg','-y','-i',path,'-ac','2','-ar',str(SR),'/tmp/sfx.wav'],capture_output=True)
    return load_wav('/tmp/sfx.wav')[0]

def lowpass(x, cutoff):
    b,a=butter(2, cutoff/(SR/2), btype='low')
    return lfilter(b,a,x,axis=0)

# Base: the seamless 48s dark-lofi loop (already 2x crossfade-joined, seamless)
base,_=load_wav('/tmp/loop48_darker.wav')
mix=np.zeros((N,2))
L=min(N, len(base)); mix[:L]=base[:L]

# Deep dark sub-bass drone breathing WITH the animation (8s ring pulse + 12s corner flow)
# NOTE: all drone freqs complete an integer cycle count in 48s -> phase-seamless at wrap:
#   39*48=1872, 55*48=2640, 29.5*48=1416  (no click at loop boundary)
t=np.arange(N)/SR
ring8=0.5+0.5*np.sin(2*np.pi*t/8 + 1.3)
corner12=0.5+0.5*np.sin(2*np.pi*t/12 + np.pi/2)
flow=0.7+0.2*ring8+0.3*corner12
drone=(np.sin(2*np.pi*39*t)+0.5*np.sin(2*np.pi*55*t)+0.3*np.sin(2*np.pi*29.5*t))
mix[:,0]+=drone*flow*0.05; mix[:,1]+=drone*flow*0.05

# Beat grid: 120 BPM, 0.5s beat, first beat 0.375s, downbeats every 4s
BEAT=0.5; PHASE=0.375
def down(t): return PHASE + round((t-PHASE)/4.0)*4.0

# --- Measured asset latencies (PERCEIVED peak/attack lands on the beat) ---
#   lightning: onset ~0.000s -> place on downbeat
#   explosion: onset 0.024s  -> place on downbeat
#   whoosh:    peak 0.774s   -> lead by 0.774 so crest resolves on the downbeat

def place(sig, t0, gain, trim=None):
    """Add sig at t0 seconds, wrapping seamlessly across the 48s loop boundary
    so a sound that would straddle the seam is never truncated (no click)."""
    assert sig.ndim==2 and sig.shape[1]==2, ("place sig bad", sig.shape)
    if trim is not None:
        sig=sig[:int(trim*SR)]
    Ls=len(sig)
    if Ls==0: return
    i=int(t0*SR) % N                 # start sample, wrapped into [0,N)
    # i..i+Ls may exceed N; write the piece within the loop, then the wrapped rest
    end=i+Ls
    if end<=N:
        mix[i:end]+=sig*gain
    else:
        n0=N-i                       # samples before the wrap
        mix[i:N]+=sig[:n0]*gain
        mix[:end-N]+=sig[n0:]*gain

lightning=load_mp3('audio/mixkit-electricity-lightning-blast-2601.wav')
whoosh=load_mp3('audio/mixkit-electric-whoosh-2596.wav')
explosion=load_mp3('audio/mixkit-explosion-hit-1704.wav')

# --- Musical design: a steady heartbeat + regular accents ---------------------
# A repeating 24s phrase (2x in the 48s loop) so EVERYTHING falls on the beat grid:
#   - SOFT SUB-PULSE on EVERY downbeat (every 4s) = the steady musical anchor.
#     This alone removes the "random" feel because there is now a constant pulse.
#   - LIGHTNING on corner landings (bars 0,3 of the 24s phrase = t 0,12,24,36)
#     = the climax accents.
#   - SOFT SHIMMER on ring pulses that don't coincide with corners (bars 2,4
#     = t 8,16,32,40) = secondary, lighter accents.
# Within 24s the pattern is:  [L +],  [+],  [S +],  [L +],  [S +],  [+]
# where +=pulse, L=lightning(corner), S=shimmer(ring). It repeats => intentional.

# 1) soft sub-bass pulse on every downbeat (a clean low thump derived from the real
#    explosion sample, lowpassed & trimmed short so it reads as a soft kick)
pulse = explosion[:int(0.7*SR)]
pulse = lowpass(pulse, 380)
# normalise the pulse attack to its own head (so the transient, not the tail, is audible)
pulse = pulse / np.abs(pulse[:int(0.25*SR)]).max()

# 2) soft shimmer = a lighter, high-trimmed lightning tick for ring pulses
shimmer = lightning[:int(1.0*SR)]

# Lay down the motif
for k in range(12):
    d = 0.375 + k*4.0                      # every downbeat
    place(pulse, d, 0.11)                  # heartbeat

for corner in (0,12,24,36):
    d = down(corner)
    place(lightning, d, 0.18, trim=2.5)    # corner accent (crack on the downbeat)

for rp in (8,16,32,40):
    d = down(rp)
    place(shimmer, d, 0.045, trim=0.9)     # ring accent (soft tick)

# normalize to a calm, dark background level (~-16 dB)
mix=mix/np.abs(mix).max()*0.63
p=(mix*32767).astype(np.int16)
out=np.empty((N,2),dtype=np.int16); out[:,0]=p[:,0]; out[:,1]=p[:,1]
w=wave.open('final_master.wav','w'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes()); w.close()
subprocess.run(['ffmpeg','-y','-i','final_master.wav','-codec:a','libmp3lame','-qscale:a','5','final_master.mp3'],capture_output=True)
os.remove('final_master.wav')
print("final_master built, peak", np.abs(mix).max(), "dur", N/SR)
