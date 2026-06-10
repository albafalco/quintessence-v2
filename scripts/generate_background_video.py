"""Generate background video via xAI Grok Imagine image-to-video API."""
import base64
import json
import mimetypes
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

SOURCE_IMAGE = Path(
    r"C:\Users\Fazekas\Documents\Weblap\00-composer25\quintessence\public\auth\background-poster.jpg"
)
OUTPUT_VIDEO = Path(
    r"C:\Users\Fazekas\Documents\Weblap\00-composer25\quintessence\public\auth\background-imagine.mp4"
)
AUTH_PATH = Path(r"C:\Users\Fazekas\.grok\auth.json")
API_BASE = "https://api.x.ai/v1"

PROMPT = (
    "The Renaissance annunciation painting moves in sacred slow motion. "
    "The sheer veil on the marble lectern drifts very slowly and gently. "
    "The angel Gabriel's wings breathe with an extremely slow, graceful ripple. "
    "Red and blue drapery folds sway in the slowest possible motion. "
    "Cypress trees and distant landscape remain dreamlike and calm. "
    "Soft golden light pulses imperceptibly across stone and fabric. "
    "Every movement is languid, elegant, and unhurried. "
    "Camera remains completely fixed."
)


def load_token() -> str:
    data = json.loads(AUTH_PATH.read_text(encoding="utf-8"))
    for entry in data.values():
        if isinstance(entry, dict) and entry.get("key"):
            return entry["key"]
    raise RuntimeError("No auth token found in auth.json")


def image_to_data_url(path: Path) -> str:
    mime, _ = mimetypes.guess_type(path)
    mime = mime or "image/jpeg"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def api_request(method: str, url: str, token: str, payload: dict | None = None) -> dict:
    data = None
    headers = {"Authorization": f"Bearer {token}"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.loads(response.read().decode("utf-8"))


def download_file(url: str, dest: Path) -> None:
    request = urllib.request.Request(url)
    with urllib.request.urlopen(request, timeout=300) as response:
        dest.write_bytes(response.read())


def main() -> int:
    if not SOURCE_IMAGE.exists():
        print(f"ERROR: Source image not found: {SOURCE_IMAGE}", file=sys.stderr)
        return 1

    token = load_token()
    payload = {
        "model": "grok-imagine-video-1.5-preview",
        "prompt": PROMPT,
        "duration": 10,
        "aspect_ratio": "16:9",
        "image": {"url": image_to_data_url(SOURCE_IMAGE)},
    }

    print("Submitting image-to-video request...")
    try:
        submit = api_request("POST", f"{API_BASE}/videos/generations", token, payload)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"ERROR: API submit failed ({exc.code}): {body}", file=sys.stderr)
        return 1

    request_id = submit.get("request_id")
    if not request_id:
        print(f"ERROR: No request_id in response: {json.dumps(submit)}", file=sys.stderr)
        return 1

    print(f"Request ID: {request_id}")
    print("Polling for completion...")

    for _ in range(180):
        try:
            result = api_request("GET", f"{API_BASE}/videos/{request_id}", token)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            print(f"ERROR: Poll failed ({exc.code}): {body}", file=sys.stderr)
            return 1

        status = result.get("status")
        progress = result.get("progress")
        if progress is not None:
            print(f"  status={status} progress={progress}%")
        else:
            print(f"  status={status}")

        if status == "done":
            video = result.get("video") or {}
            video_url = video.get("url")
            if not video_url:
                error = result.get("error", {})
                print(
                    f"ERROR: Generation finished without video URL: {json.dumps(error)}",
                    file=sys.stderr,
                )
                return 1

            print("Downloading video...")
            try:
                download_file(video_url, OUTPUT_VIDEO)
            except urllib.error.HTTPError as exc:
                print(f"ERROR: Download failed ({exc.code})", file=sys.stderr)
                return 1

            size_bytes = OUTPUT_VIDEO.stat().st_size
            print(f"SUCCESS: {OUTPUT_VIDEO}")
            print(f"SIZE_BYTES: {size_bytes}")
            return 0

        if status == "failed":
            error = result.get("error", {})
            print(f"ERROR: Generation failed: {json.dumps(error)}", file=sys.stderr)
            return 1

        time.sleep(5)

    print("ERROR: Timed out waiting for video generation", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())