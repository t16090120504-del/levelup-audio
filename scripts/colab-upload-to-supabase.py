# ============================================================
# LevelUp Audio - 从 Colab 直接上传音频到 Supabase
# 在 Google Colab 中运行
# 不需要下载任何文件到本地
# ============================================================

# 安装 supabase 客户端
!pip install supabase -q

# Supabase 配置
SUPABASE_URL = "https://ihfaoksiurmucryfzfvd.supabase.co"
SUPABASE_KEY = "sb_publishable_cLvmBr7GYj_BUh7gmwvg0g_ZmiBg6va"

import os
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET = "audio"

# 音频目录名 -> Storage 路径前缀 的映射
UPLOAD_MAP = [
    ("audio-the-last-system", "series/the-last-system"),
    ("audio-corporate-ascendant", "series/corporate-ascendant"),
    ("audio-infinite-loop", "series/infinite-loop"),
    ("audio-jade-dynasty", "series/jade-dynasty"),
    ("audio-midnight-protocol", "series/midnight-protocol"),
    ("audio-reborn-dragon", "series/reborn-dragon"),
    ("audio-stone-heart", "series/stone-heart"),
    ("audio-zero-hour", "series/zero-hour"),
]

BASE_DIR = "/content/output"

def upload_audio(local_dir, storage_prefix):
    """上传一个系列的全部 MP3 到 Supabase Storage"""
    uploaded = 0
    skipped = 0

    if not os.path.exists(local_dir):
        print(f"  ⚠️ 目录不存在: {local_dir}")
        return uploaded, skipped

    files = sorted([f for f in os.listdir(local_dir) if f.endswith('.mp3')])
    print(f"  找到 {len(files)} 个音频文件")

    for filename in files:
        filepath = os.path.join(local_dir, filename)
        # 规范化文件名: ep01-xxx.mp3 -> ep01.mp3
        ep_num = filename[:4]  # 取 "ep01" ~ "ep10"
        storage_path = f"{storage_prefix}/{ep_num}.mp3"

        with open(filepath, "rb") as f:
            data = f.read()

        result = supabase.storage.from_(BUCKET).upload(
            storage_path, data,
            {"content-type": "audio/mpeg", "upsert": True}
        )

        if result:
            uploaded += 1
            size_kb = len(data) / 1024
            print(f"  ✅ {filename} → {storage_path} ({size_kb:.0f} KB)")
        else:
            skipped += 1
            print(f"  ❌ {filename} 上传失败")

    return uploaded, skipped

print("=" * 55)
print("  📤 LevelUp Audio - 上传音频到 Supabase")
print("=" * 55)

total_uploaded = 0
total_failed = 0

for local_dir, storage_prefix in UPLOAD_MAP:
    local_path = os.path.join(BASE_DIR, local_dir)
    print(f"\n📁 {local_dir} → {storage_prefix}")
    uploaded, failed = upload_audio(local_path, storage_prefix)
    total_uploaded += uploaded
    total_failed += failed

print(f"\n{'='*55}")
print(f"  🎉 上传完成！")
print(f"  ✅ 成功: {total_uploaded} 个文件")
if total_failed > 0:
    print(f"  ❌ 失败: {total_failed} 个文件")
print(f"{'='*55}")
print(f"\n所有音频已上传到 Supabase Storage (bucket: {BUCKET})")
print(f"现在网站上的音频会自动使用新版本。")
