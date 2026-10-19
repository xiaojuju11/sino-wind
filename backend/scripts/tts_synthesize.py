import sys
import os
import argparse
import asyncio
import edge_tts

async def synthesize(text, voice, rate, outfile):
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate)
    await communicate.save(outfile)

def main():
    parser = argparse.ArgumentParser(description="Edge-TTS synthesis helper for SinoWind")
    parser.add_argument("--voice", default="zh-CN-YunxiNeural")
    parser.add_argument("--rate", default="-10%")
    parser.add_argument("--text-file", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    if not os.path.exists(args.text_file):
        print(f"Error: text file not found: {args.text_file}", file=sys.stderr)
        sys.exit(1)

    with open(args.text_file, "r", encoding="utf-8") as f:
        text = f.read().strip()

    if not text:
        print("Error: empty text", file=sys.stderr)
        sys.exit(1)

    out_dir = os.path.dirname(os.path.abspath(args.out))
    if not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    max_attempts = 2
    for attempt in range(1, max_attempts + 1):
        try:
            asyncio.run(asyncio.wait_for(synthesize(text, args.voice, args.rate, args.out), timeout=25.0))
            if os.path.exists(args.out) and os.path.getsize(args.out) > 500:
                print("OK")
                sys.exit(0)
        except Exception as e:
            if attempt < max_attempts:
                import time
                time.sleep(1.2)
                continue
            print(f"Error during TTS synthesis: {e}", file=sys.stderr)
            sys.exit(2)

    sys.exit(2)

if __name__ == "__main__":
    main()
