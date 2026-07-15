# ============================================================
# LevelUp Audio - 一键生成 + 上传
# 复制粘贴到 Google Colab 的一个代码格子里，点运行即可
# 生成70个音频 + 上传到Supabase，全部自动完成
# ============================================================

# 第1步：安装依赖
!pip install edge-tts supabase -q

# 第2步：下载项目剧本
!git clone https://github.com/t16090120504-del/levelup-audio.git /content/levelup-audio 2>/dev/null
print("✅ 项目下载完成\n")

# 第3步：生成 + 上传
import asyncio, edge_tts, os, re
from datetime import datetime
from supabase import create_client

# Supabase 配置
SUPABASE_URL = "https://ihfaoksiurmucryfzfvd.supabase.co"
SUPABASE_KEY = "sb_publishable_cLvmBr7GYj_BUh7gmwvg0g_ZmiBg6va"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET = "audio"

SERIES_CONFIG = [
    {"name": "The Last System", "script": "the-last-system-season1.md",
     "voice": "en-US-AndrewMultilingualNeural", "output": "audio-the-last-system",
     "storage": "series/the-last-system"},
    {"name": "The Corporate Ascendant", "script": "corporate-ascendant-season1.md",
     "voice": "en-US-ChristopherNeural", "output": "audio-corporate-ascendant",
     "storage": "series/corporate-ascendant"},
    {"name": "Infinite Loop", "script": "infinite-loop-season1.md",
     "voice": "en-US-GuyNeural", "output": "audio-infinite-loop",
     "storage": "series/infinite-loop"},
    {"name": "Jade Dynasty", "script": "jade-dynasty-season1.md",
     "voice": "en-US-SteffanNeural", "output": "audio-jade-dynasty",
     "storage": "series/jade-dynasty"},
    {"name": "Midnight Protocol", "script": "midnight-protocol-season1.md",
     "voice": "en-US-AvaNeural", "output": "audio-midnight-protocol",
     "storage": "series/midnight-protocol"},
    {"name": "Reborn Dragon", "script": "reborn-dragon-season1.md",
     "voice": "en-US-EmmaMultilingualNeural", "output": "audio-reborn-dragon",
     "storage": "series/reborn-dragon"},
    {"name": "Stone Heart", "script": "stone-heart-season1.md",
     "voice": "en-US-BrianMultilingualNeural", "output": "audio-stone-heart",
     "storage": "series/stone-heart"},
    {"name": "Zero Hour", "script": "zero-hour-season1.md",
     "voice": "en-US-EricNeural", "output": "audio-zero-hour",
     "storage": "series/zero-hour"},
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
        for line in lines:
            s = line.strip()
            if not s or s == title: continue
            if s.startswith('**') and ('Duration' in s or 'Genre' in s): continue
            if s.startswith('[') and s.endswith(']'): continue
            if s.startswith('[end') or s.startswith('[beat'): continue
            if s == '[narration begins]': continue
            narration.append(s)
        text = "\n".join(narration).strip()
        if text: episodes.append((idx, title, text))
    return episodes

def clean(t):
    c = t.replace('"','"').replace('"','"').replace("'","'").replace("'","'")
    c = re.sub(r'\*\*([^*]+)\*\*', r'\1', c)
    c = re.sub(r'\*([^*]+)\*', r'\1', c)
    c = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', c)
    c = re.sub(r'\n{2,}', '. ', c)
    c = re.sub(r'\n', '. ', c)
    return re.sub(r' {2,}', ' ', c).strip()

async def gen_and_upload(cfg):
    """生成一个系列并立即上传到Supabase"""
    sp = os.path.join(SCRIPTS_DIR, cfg["script"])
    od = os.path.join(BASE_OUTPUT, cfg["output"])
    
    if not os.path.exists(sp):
        print(f"  ⚠️ 跳过: {cfg['script']} 不存在")
        return 0, 0
    
    eps = extract_episodes(sp)
    print(f"\n{'='*55}")
    print(f"  📖 {cfg['name']}")
    print(f"  🎙️ {cfg['voice']} | {len(eps)} 集")
    print(f"  📤 上传路径: {cfg['storage']}")
    print(f"{'='*55}")
    
    generated = 0
    uploaded = 0
    
    for n, t, txt in eps:
        # 生成音频
        os.makedirs(od, exist_ok=True)
        safe = re.sub(r'[^a-zA-Z0-9\s-]', '', t).strip().lower()
        safe = re.sub(r'\s+', '-', safe)[:50]
        local_file = os.path.join(od, f"ep{n:02d}-{safe}.mp3")
        
        ct = clean(txt)
        if len(ct) < 20:
            continue
        
        c = edge_tts.Communicate(ct, cfg["voice"], rate="-5%")
        await c.save(local_file)
        generated += 1
        
        # 立即上传到Supabase
        storage_path = f"{cfg['storage']}/ep{n:02d}.mp3"
        with open(local_file, "rb") as f:
            data = f.read()
        
        result = supabase.storage.from_(BUCKET).upload(
            storage_path, data,
            {"content-type": "audio/mpeg", "upsert": True}
        )
        
        if result:
            uploaded += 1
            sz = len(data) / 1024
            print(f"  ✅ Ep{n}: {t} ({sz:.0f} KB) → 上传成功")
        else:
            print(f"  ❌ Ep{n}: {t} → 上传失败")
    
    return generated, uploaded

async def main():
    print(f"{'='*55}")
    print(f"  🎧 LevelUp Audio - 一键生成+上传")
    print(f"  ⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  📚 共 {len(SERIES_CONFIG)} 个系列")
    print(f"{'='*55}")
    
    total_gen = 0
    total_up = 0
    
    for i, cfg in enumerate(SERIES_CONFIG):
        print(f"\n[{i+1}/{len(SERIES_CONFIG)}]")
        g, u = await gen_and_upload(cfg)
        total_gen += g
        total_up += u
    
    print(f"\n{'='*55}")
    print(f"  🎉 全部完成！")
    print(f"  ✅ 生成: {total_gen} 个音频")
    print(f"  ✅ 上传: {total_up} 个到 Supabase")
    print(f"  ⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*55}")
    print(f"\n🌐 现在刷新你的网站，就能听到新音频了！")

await main()
