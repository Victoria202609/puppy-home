"""Generate original, local cartoon Foley. Python standard library only."""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 32000
ROOT = Path(__file__).resolve().parents[1] / "sounds"
ROOT.mkdir(exist_ok=True)
rng = random.Random(27)
TAU = math.tau


def track(seconds):
    return [0.0] * round(seconds * RATE)


def tone(dst, at, duration, start, end=None, volume=.5, kind="sine", wobble=0):
    phase = 0.0
    end = start if end is None else end
    begin = round(at * RATE)
    for i in range(round(duration * RATE)):
        pos = begin + i
        if pos >= len(dst):
            break
        t = i / RATE
        u = t / duration
        frequency = start * (end / start) ** u + wobble * math.sin(TAU * 9 * t) * (1 - u)
        phase += TAU * frequency / RATE
        attack = min(1, t / .009)
        env = attack * (1 - u) ** 1.5
        if kind == "boing":
            sample = math.sin(phase + 1.8 * math.sin(phase * .51) * (1 - u))
        elif kind == "voice":
            sample = math.sin(phase) + .42 * math.sin(phase * 2) + .2 * math.sin(phase * 3)
            sample *= .72 + .28 * math.sin(TAU * 7 * t)
        elif kind == "wood":
            sample = math.sin(phase) + .35 * math.sin(phase * 2.76)
            env *= math.exp(-12 * u)
        else:
            sample = math.sin(phase)
        dst[pos] += sample * env * volume


def noise(dst, at, duration, volume=.3, cutoff=1800, pulses=0):
    previous = 0.0
    alpha = 1 - math.exp(-TAU * cutoff / RATE)
    begin = round(at * RATE)
    for i in range(round(duration * RATE)):
        pos = begin + i
        if pos >= len(dst):
            break
        t = i / RATE
        u = t / duration
        previous += alpha * (rng.uniform(-1, 1) - previous)
        env = math.sin(math.pi * u) ** .7
        if pulses:
            env *= .18 + .82 * max(0, math.sin(TAU * pulses * t))
        dst[pos] += previous * volume * env


def save(name, data, peak=.86):
    # Soft saturation, fixed peak headroom and short edge fades avoid clicks.
    data = [math.tanh(value * 1.25) for value in data]
    scale = peak / max(.001, max(abs(value) for value in data))
    fade = int(RATE * .008)
    raw = bytearray()
    for i, value in enumerate(data):
        edge = min(1, i / fade, (len(data) - 1 - i) / fade)
        raw.extend(struct.pack('<h', round(value * scale * edge * 32767)))
    with wave.open(str(ROOT / f'{name}.wav'), 'wb') as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(raw)
    print(f'{name}: {len(data) / RATE:.3f}s')


roll = track(TAU / 2.6)
for i, at in enumerate([.03, .36, .8, 1.22, 1.64, 1.98]):
    tone(roll, at, .29, 200 + i % 3 * 75, 70, .65, 'boing', 45)
    noise(roll, at, .15, .14, 950)
tone(roll, 1.1, .2, 800, 1250, .19, 'voice')
save('roll', roll)

run = track(8 * math.pi / 13)
for i in range(8):
    at = .01 + i * math.pi / 13
    tone(run, at, .16, 245 if i % 2 else 340, 100, .75, 'wood')
    noise(run, at, .085, .25, 2300)
tone(run, 1.66, .19, 650, 1100, .28, 'boing')
save('run', run)

jump = track(1.55)
tone(jump, .04, .22, 150, 88, .22, 'boing')
tone(jump, .279, .46, 190, 850, .65, 'boing', 100)
noise(jump, .31, .3, .13, 1600)
tone(jump, 1.209, .24, 145, 48, .85, 'boing', 30)
tone(jump, 1.26, .14, 610, 390, .18)
save('jump', jump)

howl = track(2.8)
tone(howl, .03, .18, 370, 230, .6, 'voice')
tone(howl, .27, .17, 430, 280, .65, 'voice')
tone(howl, .55, .65, 240, 560, .65, 'voice', 35)
tone(howl, 1.06, .88, 560, 240, .7, 'voice', 35)
tone(howl, 2.15, .31, 600, 130, .4, 'boing')
save('howl', howl)

rest = track(3)
noise(rest, .1, .75, .25, 650, 19)
tone(rest, .18, .66, 105, 135, .3, 'voice', 15)
noise(rest, 1.35, .9, .22, 800, 25)
tone(rest, 1.46, .75, 160, 70, .25, 'voice', 10)
tone(rest, 2.36, .18, 530, 720, .13, 'boing')
save('rest', rest, .57)

crumple = track(1.25)
for i in range(9):
    at = i * .115
    noise(crumple, at, .16, .7, 1400 + i * 250, 32)
    tone(crumple, at + .02, .06, 300 + i * 30, 170, .12, 'wood')
save('crumple', crumple, .79)

kick = track(1.55)
tone(kick, .01, .19, 180, 45, .9, 'boing')
noise(kick, .015, .1, .6, 3000)
tone(kick, .1, .77, 1250, 180, .58, 'sine', 100)
noise(kick, .15, .72, .45, 2800)
tone(kick, .96, .38, 1700, 2400, .18)
save('kick', kick)

done = track(.85)
for at, freq in [(0.01, 523.25), (.14, 659.25), (.28, 783.99)]:
    tone(done, at, .42, freq, volume=.32)
save('done', done, .7)

hello = track(.48)
tone(hello, .01, .3, 450, 800, .4, 'boing')
save('hello', hello, .65)

walk = track(.9)
for i in range(4):
    tone(walk, i * .2 + .01, .14, 260 + i % 2 * 80, 110, .45, 'wood')
save('walk', walk, .65)
