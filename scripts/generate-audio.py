# Extract narration text from the script and generate TTS audio for each episode.
# Uses Edge TTS (Microsoft) for high-quality English narration.
# Usage: python3 scripts/generate-audio.py

import asyncio
import edge_tts
import os
import re

VOICE = "en-US-GuyNeural"  # Novel-style male narrator with passion
OUTPUT_DIR = "/data/user/work/audio-episodes"
SCRIPT_FILE = "/workspace/levelup-audio/assets/scripts/the-last-system-season1.md"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)


def extract_episode_text(filepath: str) -> list[tuple[str, str]]:
    """Extract episode number and narration text from the markdown script."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    episodes = []
    # Split by episode headers
    parts = re.split(r'## Episode \d+:', content)

    for part in parts[1:]:  # Skip the series overview
        lines = part.strip().split('\n')
        # First line is the title
        title_line = lines[0].strip().strip('"').strip("'")
        # Remove the title from narration text
        narration_lines = lines[2:]  # Skip title and blank line

        # Extract only narration text (skip stage directions in brackets)
        narration_parts = []
        in_narration = False
        for line in narration_lines:
            stripped = line.strip()
            if not stripped:
                continue
            # Skip markdown headers, metadata, and system messages
            if stripped.startswith('**') and 'Duration' in stripped:
                continue
            if stripped.startswith('[end') or stripped.startswith('[beat]'):
                # These are stage directions, skip but add pause
                continue
            if stripped.startswith('[') and stripped.endswith(']'):
                # Stage direction, skip
                continue
            if stripped == '[narration begins]' or stripped == '[beat]':
                in_narration = True
                continue

            # This is actual narration text
            narration_parts.append(stripped)

        narration_text = "\n".join(narration_parts).strip()
        if narration_text:
            # Extract episode number from the part
            ep_match = re.search(r'Episode (\d+)', part[:20])
            ep_num = int(ep_match.group(1)) if ep_match else len(episodes) + 1
            episodes.append((ep_num, title_line, narration_text))

    return episodes


async def generate_episode_audio(ep_num: int, title: str, text: str):
    """Generate TTS audio for a single episode."""
    output_file = os.path.join(OUTPUT_DIR, f"ep{ep_num:02d}-{title.replace(' ', '-').lower()}.mp3")
    
    # Clean text - remove markdown formatting but keep natural pauses
    clean_text = text.replace('"', '"').replace('"', '"')
    clean_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', clean_text)  # Remove bold markers
    clean_text = re.sub(r'\*([^*]+)\*', r'\1', clean_text)  # Remove italic markers
    clean_text = re.sub(r'\n{2,}', '. ', clean_text)  # Double newlines to period
    clean_text = re.sub(r'\n', '. ', clean_text)  # Single newlines to period
    clean_text = re.sub(r'\.{2,}', '. ', clean_text)  # Multiple periods
    clean_text = clean_text.strip()

    if not clean_text:
        print(f"  Episode {ep_num}: No narration text found, skipping.")
        return None

    print(f"  Generating Episode {ep_num}: {title}")
    print(f"    Text length: {len(clean_text)} characters")
    print(f"    Voice: {VOICE}")
    print(f"    Output: {output_file}")

    communicate = edge_tts.Communicate(clean_text, VOICE, rate="-5%", pitch="-2Hz")
    await communicate.save(output_file)

    # Get file size
    size = os.path.getsize(output_file)
    print(f"    Done! Size: {size / 1024:.1f} KB")
    return output_file


async def main():
    print(f"=== The Last System - Audio Generation ===\n")
    print(f"Script: {SCRIPT_FILE}")
    print(f"Voice: {VOICE}")
    print(f"Output: {OUTPUT_DIR}\n")

    episodes = extract_episode_text(SCRIPT_FILE)
    print(f"Found {len(episodes)} episodes\n")

    for ep_num, title, text in episodes:
        await generate_episode_audio(ep_num, title, text)
        print()

    print("=== All episodes generated! ===")
    
    # List generated files
    files = sorted(os.listdir(OUTPUT_DIR))
    total_size = sum(os.path.getsize(os.path.join(OUTPUT_DIR, f)) for f in files)
    print(f"\nTotal files: {len(files)}")
    print(f"Total size: {total_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    asyncio.run(main())
