# Generate TTS audio for each episode using espeak-ng + ffmpeg for MP3 conversion
# Usage: bash scripts/generate-audio.sh

SCRIPT="/workspace/levelup-audio/assets/scripts/the-last-system-season1.md"
OUTPUT_DIR="/data/user/work/audio-episodes"
VOICE="en-us+m3"  # English male, moderate speed
SPEED="140"       # Words per minute (slightly slow for dramatic effect)
PITCH="40"        # Pitch (lower for dramatic narration)

mkdir -p "$OUTPUT_DIR"

# Extract episode narration text using Python
python3 -c "
import re, os, sys

script_file = '$SCRIPT'
output_dir = '$OUTPUT_DIR'

with open(script_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Split by episode headers
parts = re.split(r'## Episode \d+:', content)

for part in parts[1:]:
    lines = part.strip().split('\n')
    title_line = lines[0].strip().strip('\"').strip(\"'\")
    
    # Extract episode number
    ep_match = re.search(r'Episode (\d+)', part[:30])
    ep_num = int(ep_match.group(1)) if ep_match else 0
    
    # Extract narration text only (skip metadata and stage directions)
    narration = []
    for line in lines[2:]:
        s = line.strip()
        if not s: continue
        if s.startswith('**') and ('Duration' in s or 'Episode' in s): continue
        if s.startswith('[end') or s.startswith('[beat]'): continue
        if s.startswith('[') and s.endswith(']'): continue
        if s == '[narration begins]': continue
        # Clean markdown
        s = re.sub(r'\*\*([^*]+)\*\*', r'\1', s)
        s = re.sub(r'\*([^*]+)\*', r'\1', s)
        s = re.sub(r'\"', '\"', s)
        s = re.sub(r'\"', '\"', s)
        if s:
            narration.append(s)
    
    text = '. '.join(narration)
    # Add pauses for dramatic effect
    text = text.replace('. .', '... ')
    text = text.replace('...', ',,,, ')
    
    out_file = os.path.join(output_dir, f'ep{ep_num:02d}.txt')
    with open(out_file, 'w') as f:
        f.write(text)
    print(f'Extracted Episode {ep_num}: {title_line} ({len(text)} chars) -> {out_file}')
"

echo ""
echo "Generating audio with espeak-ng..."

for txt_file in "$OUTPUT_DIR"/ep*.txt; do
    ep_num=$(basename "$txt_file" .txt | sed 's/ep//')
    wav_file="$OUTPUT_DIR/ep${ep_num}.wav"
    mp3_file="$OUTPUT_DIR/ep${ep_num:02d}.mp3"
    
    echo "  Episode $ep_num: $(wc -c < "$txt_file") chars"
    
    # Generate WAV with espeak-ng
    espeak-ng -v "$VOICE" -s "$SPEED" -p "$PITCH" -w "$wav_file" -f "$txt_file" 2>/dev/null
    
    # Convert to MP3 with ffmpeg (add slight reverb for depth)
    ffmpeg -y -i "$wav_file" -af "aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo,areverb=0.3:0.5:50:0.5,volume=1.5" \
        -c:a libmp3lame -b:a 128k "$mp3_file" 2>/dev/null
    
    # Clean up WAV
    rm -f "$wav_file"
    rm -f "$txt_file"
    
    # Show result
    duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$mp3_file" 2>/dev/null)
    size=$(du -h "$mp3_file" | cut -f1)
    echo "    -> Duration: ${duration}s, Size: $size"
done

echo ""
echo "=== All episodes generated! ==="
ls -lh "$OUTPUT_DIR"/*.mp3 2>/dev/null
