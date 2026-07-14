import re, os, subprocess

SCRIPT = "/workspace/levelup-audio/assets/scripts/the-last-system-season1.md"
OUTPUT_DIR = "/data/user/work/audio-episodes"
VOICE = "en-us+m3"
SPEED = "140"
PITCH = "40"

os.makedirs(OUTPUT_DIR, exist_ok=True)

with open(SCRIPT, "r", encoding="utf-8") as f:
    content = f.read()

parts = re.split(r'## Episode (\d+):', content)

for i in range(1, len(parts), 2):
    ep_num = int(parts[i])
    part = parts[i + 1]
    lines = part.strip().split('\n')
    title = lines[0].strip().strip('"').strip("'")

    narration = []
    for line in lines[2:]:
        s = line.strip()
        if not s:
            continue
        if s.startswith('**') and ('Duration' in s or 'Episode' in s):
            continue
        if s.startswith('[end') or s.startswith('[beat]'):
            continue
        if s.startswith('[') and s.endswith(']'):
            continue
        if s == '[narration begins]':
            continue
        s = re.sub(r'\*\*([^*]+)\*\*', r'\1', s)
        s = re.sub(r'\*([^*]+)\*', r'\1', s)
        s = s.replace('\u201c', '"').replace('\u201d', '"')
        if s:
            narration.append(s)

    text = '. '.join(narration)

    txt_file = os.path.join(OUTPUT_DIR, f"ep{ep_num}.txt")
    wav_file = os.path.join(OUTPUT_DIR, f"ep{ep_num}.wav")
    mp3_file = os.path.join(OUTPUT_DIR, f"ep{ep_num:02d}.mp3")

    with open(txt_file, "w") as f:
        f.write(text)

    print(f"Episode {ep_num}: {title} ({len(text)} chars)")

    subprocess.run(
        ["espeak-ng", "-v", VOICE, "-s", SPEED, "-p", PITCH, "-w", wav_file, "-f", txt_file],
        capture_output=True
    )

    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_file,
         "-af", "aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo,volume=1.5",
         "-c:a", "libmp3lame", "-b:a", "128k", mp3_file],
        capture_output=True
    )

    os.remove(txt_file)
    if os.path.exists(wav_file):
        os.remove(wav_file)

    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", mp3_file],
        capture_output=True, text=True
    )
    duration = result.stdout.strip()
    size = os.path.getsize(mp3_file) / 1024
    print(f"  -> Duration: {float(duration):.1f}s, Size: {size:.0f} KB")
