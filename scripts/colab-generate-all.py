# ============================================================
# LevelUp Audio - 全系列多音色音频生成
# 在 Google Colab 中运行：https://colab.research.google.com/
# 不需要安装任何东西到本地电脑，全部在云端运行
# ============================================================

# 第 1 步：安装 edge-tts
!pip install edge-tts -q

# 第 2 步：下载项目剧本
!git clone https://github.com/t16090120504-del/levelup-audio.git /content/levelup-audio 2>/dev/null
print("✅ 项目下载完成")

# 第 3 步：运行生成代码（复制下面全部到一个新的 Code 单元格）
import asyncio, edge_tts, os, re, json
from datetime import datetime

SERIES_CONFIG = [
    {"name": "The Last System", "script": "the-last-system-season1.md",
     "voice": "en-US-AndrewMultilingualNeural", "desc": "深沉史诗男声", "output": "audio-the-last-system"},
    {"name": "The Corporate Ascendant", "script": "corporate-ascendant-season1.md",
     "voice": "en-US-ChristopherNeural", "desc": "温暖沉稳男声", "output": "audio-corporate-ascendant"},
    {"name": "Infinite Loop", "script": "infinite-loop-season1.md",
     "voice": "en-US-GuyNeural", "desc": "活力叙事男声", "output": "audio-infinite-loop"},
    {"name": "Jade Dynasty", "script": "jade-dynasty-season1.md",
     "voice": "en-US-SteffanNeural", "desc": "优雅知性男声", "output": "audio-jade-dynasty"},
    {"name": "Midnight Protocol", "script": "midnight-protocol-season1.md",
     "voice": "en-US-AvaNeural", "desc": "清冷女声", "output": "audio-midnight-protocol"},
    {"name": "Reborn Dragon", "script": "reborn-dragon-season1.md",
     "voice": "en-US-EmmaMultilingualNeural", "desc": "知性女声", "output": "audio-reborn-dragon"},
    {"name": "Stone Heart", "script": "stone-heart-season1.md",
     "voice": "en-US-BrianMultilingualNeural", "desc": "力量感男声", "output": "audio-stone-heart"},
    {"name": "Zero Hour", "script": "zero-hour-season1.md",
     "voice": "en-US-EricNeural", "desc": "紧张感男声", "output": "audio-zero-hour"},
]

SCRIPTS_DIR = "/content/levelup-audio/assets/scripts"
BASE_OUTPUT = "/content/output"

def extract_episodes(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    episodes = []
    for idx, part in enumerate(re.split(r'## Episode \d+:', content)[1:], 1):
        lines = part.strip().split('\n')
        title = next((l.strip().strip('"').strip("'") for l in lines if l.strip()), "")
        narration = []
        skip = {title}
        for line in lines:
            s = line.strip()
            if not s or s in skip: continue
            if s.startswith('**') and ('Duration' in s or 'Genre' in s): continue
            if s.startswith('[') and s.endswith(']'): continue
            if s.startswith('[end') or s.startswith('[beat'): continue
            if s == '[narration begins]': continue
            narration.append(s)
        text = "\n".join(narration).strip()
        if text:
            episodes.append((idx, title, text))
    return episodes

def clean(t):
    c = t.replace('"','"').replace('"','"').replace("'","'").replace("'","'").replace("---","—").replace("--","—")
    c = re.sub(r'\*\*([^*]+)\*\*', r'\1', c)
    c = re.sub(r'\*([^*]+)\*', r'\1', c)
    c = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', c)
    c = re.sub(r'\n{2,}', '. ', c)
    c = re.sub(r'\n', '. ', c)
    return re.sub(r' {2,}', ' ', c).strip()

async def gen_one(num, title, text, voice, outdir):
    os.makedirs(outdir, exist_ok=True)
    safe = re.sub(r'[^a-zA-Z0-9\s-]', '', title).strip().lower()
    safe = re.sub(r'\s+', '-', safe)[:50]
    outfile = os.path.join(outdir, f"ep{num:02d}-{safe}.mp3")
    ct = clean(text)
    if len(ct) < 20: return None
    c = edge_tts.Communicate(ct, voice, rate="-5%")
    await c.save(outfile)
    return outfile

async def gen_series(cfg):
    sp = os.path.join(SCRIPTS_DIR, cfg["script"])
    od = os.path.join(BASE_OUTPUT, cfg["output"])
    if not os.path.exists(sp):
        print(f"  ⚠️ 剧本不存在，跳过")
        return 0
    eps = extract_episodes(sp)
    print(f"\n{'='*55}")
    print(f"  📖 {cfg['name']}  |  🎙️ {cfg['voice']} ({cfg['desc']})  |  {len(eps)} 集")
    print(f"{'='*55}")
    count = 0
    for n, t, txt in eps:
        r = await gen_one(n, t, txt, cfg["voice"], od)
        if r:
            sz = os.path.getsize(r)/1024
            print(f"  ✅ Ep{n}: {t} ({sz:.0f} KB)")
            count += 1
    return count

async def main():
    os.makedirs(BASE_OUTPUT, exist_ok=True)
    print(f"{'='*55}")
    print(f"  🎧 LevelUp Audio - 全系列音频生成")
    print(f"  ⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  📚 共 {len(SERIES_CONFIG)} 个系列")
    print(f"{'='*55}")

    total = 0
    for i, cfg in enumerate(SERIES_CONFIG):
        print(f"\n[{i+1}/{len(SERIES_CONFIG)}] {cfg['name']}")
        total += await gen_series(cfg)

    print(f"\n{'='*55}")
    print(f"  🎉 完成！共生成 {total} 个音频文件")
    print(f"  ⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*55}")

    !cd /content && zip -r audio-all-series.zip output/ -q
    zsz = os.path.getsize("/content/audio-all-series.zip")/1024/1024
    print(f"\n📦 打包下载: audio-all-series.zip ({zsz:.1f} MB)")
    print("📁 左侧文件列表 → audio-all-series.zip → 点击 ⬇️ 下载")

await main()
