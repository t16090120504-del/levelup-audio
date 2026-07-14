#!/usr/bin/env python3
"""
Multi-language TTS audio generator using Edge TTS (Microsoft Azure Neural TTS).
Free, unlimited, no API key required.

Supports all Edge TTS languages including:
- English (en-US, en-GB, en-AU, etc.)
- Hindi (hi-IN), Urdu (ur-PK), Arabic (ar-*) 
- Vietnamese (vi-VN), Malay (ms-MY), Indonesian (id-ID)
- Chinese (zh-CN, zh-TW, zh-HK)
- Japanese (ja-JP), Korean (ko-KR)
- And 400+ more voices

Usage:
  python3 scripts/generate-audio-multilang.py --script assets/scripts/the-last-system-season1.md --voice en-US-AndrewMultilingualNeural --output /data/user/work/audio-episodes
  python3 scripts/generate-audio-multilang.py --script assets/scripts/corporate-ascendant-season1.md --voice en-US-DavisNeural --output /data/user/work/audio-corporate
  python3 scripts/generate-audio-multilang.py --script assets/scripts/the-last-system-season1.md --voice hi-IN-MadhurNeural --output /data/user/work/audio-episodes-hi --language hindi

To list all available voices:
  edge-tts --list-voices
"""

import asyncio
import edge_tts
import os
import re
import argparse
import json
from datetime import datetime

# ============================================================
# Recommended voices by language/market
# ============================================================

RECOMMENDED_VOICES = {
    # English - Storytelling voices
    "english_male_deep": "en-US-AndrewMultilingualNeural",   # Deep, commanding narrator (best for epic/fantasy)
    "english_male_warm": "en-US-DavisNeural",                 # Warm, friendly narrator
    "english_female": "en-US-AvaNeural",                      # Clear, engaging female
    "english_uk_male": "en-GB-RyanNeural",                    # British male, distinguished
    "english_au_female": "en-AU-NatashaNeural",               # Australian female

    # South Asian Market
    "hindi_male": "hi-IN-MadhurNeural",                       # Hindi male narrator
    "hindi_female": "hi-IN-SwaraNeural",                      # Hindi female
    "urdu_male": "ur-PK-AsadNeural",                          # Urdu male narrator
    "urdu_female": "ur-PK-UzmaNeural",                        # Urdu female

    # Middle Eastern Market
    "arabic_male": "ar-SA-HamedNeural",                       # Arabic (Saudi) male
    "arabic_female": "ar-SA-ZariyahNeural",                   # Arabic (Saudi) female
    "arabic_egypt_male": "ar-EG-AmrNeural",                   # Arabic (Egyptian) male

    # Southeast Asian Market
    "vietnamese_male": "vi-VN-HoaiMyNeural",                  # Vietnamese (note: limited male voices)
    "vietnamese_female": "vi-VN-NamMinhNeural",               # Vietnamese
    "malay_male": "ms-MY-OsmanNeural",                        # Malay male
    "malay_female": "ms-MY-YasminNeural",                     # Malay female
    "indonesian_male": "id-ID-ArdiNeural",                    # Indonesian male
    "indonesian_female": "id-ID-GadisNeural",                 # Indonesian female

    # East Asian Market
    "chinese_female": "zh-CN-XiaoxiaoNeural",                 # Chinese female, warm
    "chinese_male": "zh-CN-YunxiNeural",                      # Chinese male, calm
    "japanese_male": "ja-JP-KeitaNeural",                    # Japanese male
    "korean_male": "ko-KR-InJoonNeural",                      # Korean male
}


def extract_episode_text(filepath: str) -> list[tuple[int, str, str]]:
    """Extract episode number, title, and narration text from a markdown script."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    episodes = []
    # Split by episode headers (supports "Episode 1:", "Episode 10:", etc.)
    parts = re.split(r'## Episode \d+:', content)

    for idx, part in enumerate(parts[1:], start=1):
        lines = part.strip().split('\n')
        # First non-empty line is the title
        title_line = ""
        for line in lines:
            stripped = line.strip()
            if stripped:
                title_line = stripped.strip('"').strip("'")
                break

        # Extract narration text (skip stage directions in brackets)
        narration_parts = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            # Skip metadata lines
            if stripped.startswith('**') and ('Duration' in stripped or 'Genre' in stripped):
                continue
            # Skip stage directions
            if stripped.startswith('[') and stripped.endswith(']'):
                continue
            if stripped.startswith('[end') or stripped.startswith('[beat'):
                continue
            if stripped == '[narration begins]' or stripped == '[beat]':
                continue
            # Skip the title line
            if stripped == title_line:
                continue

            narration_parts.append(stripped)

        narration_text = "\n".join(narration_parts).strip()
        if narration_text:
            episodes.append((idx, title_line, narration_text))

    return episodes


def clean_text_for_tts(text: str) -> str:
    """Clean text for TTS: remove markdown formatting, normalize pauses."""
    # Replace smart quotes
    clean = text.replace('"', '"').replace('"', '"').replace("'", "'").replace("'", "'").replace("---", "—").replace("--", "—")
    # Remove bold/italic markers
    clean = re.sub(r'\*\*([^*]+)\*\*', r'\1', clean)
    clean = re.sub(r'\*([^*]+)\*', r'\1', clean)
    # Remove markdown links [text](url) -> text
    clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean)
    # Convert newlines to periods (natural sentence breaks)
    clean = re.sub(r'\n{2,}', '. ', clean)
    clean = re.sub(r'\n', '. ', clean)
    # Clean up multiple periods
    clean = re.sub(r'\.{3,}', '...', clean)
    clean = re.sub(r'\.{2}', '. ', clean)
    # Clean up multiple spaces
    clean = re.sub(r' {2,}', ' ', clean)
    return clean.strip()


async def generate_episode_audio(
    ep_num: int,
    title: str,
    text: str,
    voice: str,
    output_dir: str,
    rate: str = "-5%",
    pitch: str = "0Hz",
) -> str | None:
    """Generate TTS audio for a single episode using Edge TTS."""
    os.makedirs(output_dir, exist_ok=True)

    safe_title = re.sub(r'[^a-zA-Z0-9\s-]', '', title).strip().lower()
    safe_title = re.sub(r'\s+', '-', safe_title)[:50]
    output_file = os.path.join(output_dir, f"ep{ep_num:02d}-{safe_title}.mp3")

    clean_text = clean_text_for_tts(text)

    if not clean_text or len(clean_text) < 20:
        print(f"  Episode {ep_num}: Text too short ({len(clean_text)} chars), skipping.")
        return None

    print(f"  Generating Episode {ep_num}: {title}")
    print(f"    Voice: {voice}")
    print(f"    Rate: {rate}, Pitch: {pitch}")
    print(f"    Text length: {len(clean_text)} characters")
    print(f"    Output: {output_file}")

    communicate = edge_tts.Communicate(clean_text, voice, rate=rate, pitch=pitch)
    await communicate.save(output_file)

    size = os.path.getsize(output_file)
    print(f"    Done! Size: {size / 1024:.1f} KB")
    return output_file


async def generate_all_episodes(
    script_file: str,
    voice: str,
    output_dir: str,
    rate: str = "-5%",
    pitch: str = "0Hz",
    start_episode: int = 1,
):
    """Generate audio for all episodes in a script file."""
    print(f"\n{'='*60}")
    print(f"  Edge TTS Audio Generator")
    print(f"{'='*60}")
    print(f"  Script:    {script_file}")
    print(f"  Voice:     {voice}")
    print(f"  Rate:      {rate}")
    print(f"  Pitch:     {pitch}")
    print(f"  Output:    {output_dir}")
    print(f"  Start at:  Episode {start_episode}")
    print(f"  Time:      {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    episodes = extract_episode_text(script_file)
    print(f"Found {len(episodes)} episodes in script\n")

    generated = []
    for ep_num, title, text in episodes:
        if ep_num < start_episode:
            print(f"  Episode {ep_num}: Skipping (below start_episode)")
            continue
        result = await generate_episode_audio(ep_num, title, text, voice, output_dir, rate, pitch)
        if result:
            generated.append(result)
        print()

    # Summary
    print(f"{'='*60}")
    print(f"  Generation Complete!")
    print(f"  Episodes generated: {len(generated)}")
    if generated:
        total_size = sum(os.path.getsize(f) for f in generated)
        print(f"  Total size: {total_size / 1024 / 1024:.1f} MB")
    print(f"{'='*60}")

    # Save metadata
    metadata = {
        "script": script_file,
        "voice": voice,
        "rate": rate,
        "pitch": pitch,
        "generated_at": datetime.now().isoformat(),
        "episodes": [
            {"episode": i + 1, "file": os.path.basename(f), "size_bytes": os.path.getsize(f)}
            for i, f in enumerate(generated)
        ],
    }
    meta_file = os.path.join(output_dir, "metadata.json")
    with open(meta_file, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"  Metadata saved: {meta_file}")


def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio from markdown scripts using Edge TTS")
    parser.add_argument("--script", required=True, help="Path to the markdown script file")
    parser.add_argument("--voice", default="en-US-AndrewMultilingualNeural", help="Edge TTS voice name (default: en-US-AndrewMultilingualNeural)")
    parser.add_argument("--output", required=True, help="Output directory for MP3 files")
    parser.add_argument("--rate", default="-5%", help="Speech rate (default: -5%% for slightly slower, more dramatic)")
    parser.add_argument("--pitch", default="0Hz", help="Voice pitch adjustment (default: 0Hz)")
    parser.add_argument("--start", type=int, default=1, help="Start from episode number (default: 1)")
    parser.add_argument("--language", help="Language shortcut (english, hindi, arabic, vietnamese, etc.)")

    args = parser.parse_args()

    # Language shortcut mapping
    lang_voice_map = {
        "english": "en-US-AndrewMultilingualNeural",
        "hindi": "hi-IN-MadhurNeural",
        "urdu": "ur-PK-AsadNeural",
        "arabic": "ar-SA-HamedNeural",
        "vietnamese": "vi-VN-NamMinhNeural",
        "malay": "ms-MY-OsmanNeural",
        "indonesian": "id-ID-ArdiNeural",
        "chinese": "zh-CN-YunxiNeural",
        "japanese": "ja-JP-KeitaNeural",
        "korean": "ko-KR-InJoonNeural",
    }

    voice = args.voice
    if args.language and args.language in lang_voice_map:
        voice = lang_voice_map[args.language]
        print(f"Language '{args.language}' -> Voice: {voice}")

    asyncio.run(generate_all_episodes(
        script_file=args.script,
        voice=voice,
        output_dir=args.output,
        rate=args.rate,
        pitch=args.pitch,
        start_episode=args.start,
    ))


if __name__ == "__main__":
    main()
