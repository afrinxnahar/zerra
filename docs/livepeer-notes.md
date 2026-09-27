# Livepeer Agent notes (probed Sep 2026)

Endpoint `https://agent.livepeer.org/api/mcp` (raw surface, 23 tools). `/api/mcp/creative` is the
intent based studio, `/api/mcp/full` exposes ~200 tools. Everything here goes through `run_capability`.

The docs' `X-Livepeer Agent-Tool-Profile: lean` header has a space in its name, which is not a valid
HTTP header, so we don't send it. The raw surface is already lean.

## Auth and credits

* Keyless works. `spend_cap` shows the demo allowance ($200 after email verification via `signup` then `signup_confirm`).
* Keyless allowance is tied to the caller (IP), so a new machine or a Vercel deploy gets its own.
* Daydream `sk_` keys are rejected: "This API key is no longer accepted here".
* The hackathon's $200 Livepeer Creative MCP credits: email qiang@livepeer.org.

## Params that actually work

Undeclared params come back as `warnings` and enum mistakes are refused before dispatch (free),
which is how these were found.

| Capability | Params | Notes |
|---|---|---|
| `gemini-text` | `prompt` | Returns `result.text`. Wraps JSON in markdown fences sometimes. ~$0.0001 |
| `flux-dev` | `prompt`, `inputs.image_size: portrait_16_9 / landscape_16_9` | 576x1024, ~$0.026 |
| `inworld-tts` | `prompt` (the text), `inputs.voice: "Tessa (en)"` etc (113 voices) | WAV out, ~$0.0006 per line |
| `sonilo-t2m` | `prompt`, `inputs.duration` (sec) | m4a, ~60s latency |
| `ffmpeg-kenburns` | `source_url`, `inputs.duration_sec, width, height, direction (in/out/left/right), fps` | Defaults to 1280x720 5s if you don't pass width/height |
| `ffmpeg-concat` | `inputs.clips[]`, `transition: cut / crossfade-300 / fade-black` | |
| `ffmpeg-overlay` | `source_url` + `inputs.base_url, video_url, overlay_url, image_url` (send all aliases), `x, y` (center, 0..1), `scale` (width fraction), `start_sec, end_sec` | Validator and container disagree on key names |
| `ffmpeg-burn-subtitles` | `source_url`, `inputs.cues: [{start_sec, end_sec, text}]`, `font_size` (~14 for 1080x1920), `position: top/bottom` | `srt` string also accepted |
| `ffmpeg-audio-mix` | `inputs.tracks: [{url, volume, delay_ms}]`, `format`, `duration_mode` | |
| `ffmpeg-mux` | `source_url`, `inputs.audio_url, shortest` | |
| `ideogram-bg-remove` | `source_url` | Transparent PNG, ~$0.01 |
| `upload` (tool) | `data` base64 or `source_url` | Re-hosts on Livepeer storage |

## Reliability

* Parallel ffmpeg tool calls get cut off ("operation was aborted"). We gate them to 3 at a time and retry (they're free).
* Models sometimes answer "no capacity available for runner" (HTTP 502/503) before dispatch. Safe to retry.
* Never retry a paid model after a timeout: the provider may still finish and bill.
