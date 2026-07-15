# ============================================================
# 更新 Supabase 数据库中 episodes 的 audio_url
# 指向新生成的 Edge TTS 音频
# 在 Google Colab 中运行
# ============================================================

import requests
import json

SUPABASE_URL = "https://ihfaoksiurmucryfzfvd.supabase.co"
SUPABASE_KEY = "sb_publishable_cLvmBr7GYj_BUh7gmwvg0g_ZmiBg6va"
STORAGE_BASE = f"{SUPABASE_URL}/storage/v1/object/public/audio"

# 每个系列对应的 Storage 路径前缀
SERIES_MAP = {
    "The Last System": "series/the-last-system",
    "The Corporate Ascendant": "series/corporate-ascendant",
    "Infinite Loop": "series/infinite-loop",
    "Jade Dynasty": "series/jade-dynasty",
    "Midnight Protocol": "series/midnight-protocol",
    "Reborn Dragon": "series/reborn-dragon",
    "Stone Heart": "series/stone-heart",
    "Zero Hour": "series/zero-hour",
}

# 获取所有 episodes
headers = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
}

# 第1步：获取所有 series
print("正在获取 series 列表...")
resp = requests.get(f"{SUPABASE_URL}/rest/v1/series", headers=headers)
series_list = resp.json()
print(f"找到 {len(series_list)} 个 series\n")

# 第2步：获取所有 episodes
print("正在获取 episodes 列表...")
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/episodes?select=id,series_id,title,episode_number,audio_url",
    headers=headers
)
episodes = resp.json()
print(f"找到 {len(episodes)} 个 episodes\n")

# 建立 series_id -> slug 的映射
series_slug = {}
for s in series_list:
    title = s.get("title", "")
    # 找匹配的 storage 路径
    for name, path in SERIES_MAP.items():
        if name.lower() in title.lower():
            series_slug[s["id"]] = path
            break

print(f"匹配到 {len(series_slug)} 个系列的路径映射\n")

# 第3步：更新每个 episode 的 audio_url
updated = 0
failed = 0

for ep in episodes:
    sid = ep.get("series_id")
    if sid not in series_slug:
        continue
    
    ep_num = ep.get("episode_number", 1)
    storage_path = series_slug[sid]
    new_url = f"{STORAGE_BASE}/{storage_path}/ep{ep_num:02d}.mp3"
    
    # 更新数据库
    update_resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/episodes",
        headers=headers,
        params={"id": f"eq.{ep['id']}"},
        json={"audio_url": new_url}
    )
    
    if update_resp.status_code in (200, 204):
        updated += 1
        print(f"  ✅ Ep{ep_num}: {ep.get('title','')} → {new_url}")
    else:
        failed += 1
        print(f"  ❌ Ep{ep_num}: 更新失败 ({update_resp.status_code})")

print(f"\n{'='*55}")
print(f"  更新完成！")
print(f"  ✅ 成功: {updated} 个")
if failed:
    print(f"  ❌ 失败: {failed} 个")
print(f"{'='*55}")
print(f"\n🌐 刷新网站就能听到新音频了！")
