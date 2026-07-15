# ============================================================
# LevelUp Audio - 一键生成 + 上传（修复版 v2）
# 复制粘贴到 Google Colab 的一个代码格子里，点运行即可
# ============================================================

# 第1步：安装依赖
!pip install edge-tts requests -q

# 第2步：下载项目剧本
!git clone https://github.com/t16090120504-del/levelup-audio.git /content/levelup-audio 2>/dev/null
print("✅ 项目下载完成\n")

# 第3步：生成 + 上传
import asyncio, edge_tts, os, re, requests
from datetime import datetime

# Supabase 配置
SUPABASE_URL = "https://ihfaoksiurmucryfzfvd.supabase.co"
SUPABASE_KEY = "sb_publishable_cLvmBr7GYj_BUh7gmwvg0g_ZmiBg6va"
BUCKET = "audio"

SERIES_CONFIG = [
    {"name": "The Last System", "script": "the-last-system-season1.md",
     "voice": "en-US-AndrewMultilingualNeural", "storage": "series/the-last-system"},
    {"name": "The Corporate Ascendant", "script": "corporate-ascendant-season1.md",
     "voice": "en-US-ChristopherNeural", "storage": "series/corporate-ascendant"},
    {"name": "Infinite Loop", "script": "infinite-loop-season1.md",
     "voice": "en-US-GuyNeural", "storage": "series/infinite-loop"},
    {"name": "Jade Dynasty", "script": "jade-dynasty-season1.md",
     "voice": "en-US-SteffanNeural", "storage": "series/jade-dynasty"},
    {"name": "Midnight Protocol", "script": "midnight-protocol-season1.md",
     "voice": "en-US-AvaNeural", "storage": "series/midnight-protocol"},
    {"name": "Reborn Dragon", "script": "reborn-dragon-season1.md",
     "voice": "en-US-EmmaMultilingualNeural", "storage": "series/reborn-dragon"},
    {"name": "Stone Heart", "script": "stone-heart-season1.md",
     "voice": "en-US-BrianMultilingualNeural", "storage": "series/stone-heart"},
    {"name": "Zero Hour", "script": "zero-hour-season1.md",
     "voice": "en-US-EricNeural", "storage": "series/zero-hour"},
]

SCRIPTS_DIR = "/content/levelup-audio/assets/scripts"

def upload_to_supabase(storage_path, file_data):
    """用 requests 上传到 Supabase Storage"""
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "audio/mpeg",
    }
    params = {"upsert": "true"}
    resp = requests.put(url, headers=headers, params=params, data=file_data)
    return resp.status_code in (200, 201)

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
    sp = os.path.join(SCRIPTS_DIR, cfg["script"])
    if not os.path.exists(sp):
        print(f"  ⚠️ 跳过: {cfg['script']} 不存在")
        return 0, 0
    
    eps = extract_episodes(sp)
    print(f"\n{'='*55}")
    print(f"  📖 {cfg['name']}  |  🎙️ {cfg['voice']}  |  {len(eps)} 集")
    print(f"{'='*55}")
    
    generated = 0
    uploaded = 0
    
    for n, t, txt in eps:
        ct = clean(txt)
        if len(ct) < 20:
            continue
        
        tmp = f"/tmp/ep{n:02d}.mp3"
        c = edge_tts.Communicate(ct, cfg["voice"], rate="-5%")
        await c.save(tmp)
        generated += 1
        
        with open(tmp, "rb") as f:
            data = f.read()
        
        storage_path = f"{cfg['storage']}/ep{n:02d}.mp3"
        ok = upload_to_supabase(storage_path, data)
        
        if ok:
            uploaded += 1
            sz = len(data) / 1024
            print(f"  ✅ Ep{n}: {t} ({sz:.0f} KB) → 上传成功")
        else:
            print(f"  ❌ Ep{n}: {t} → 上传失败")
        
        os.remove(tmp)
    
    return generated, uploaded

async def main():
    print(f"{'='*55}")
    print(f"  🎧 LevelUp Audio - 一键生成+上传")
    print(f"  ⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
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
    print(f"\n🌐 刷新网站就能听到新音频了！")

await main()
