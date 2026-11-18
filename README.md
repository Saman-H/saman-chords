# 🎹 Saman Chords

Play guitar chords with your hand gestures, using only your camera.
Runs in the browser and as a Telegram Mini App.

**Live demo:** https://saman-h.github.io/saman-chords/
**Telegram channel:** [@Saman_sing](https://t.me/Saman_sing) · **Instagram:** [@saman.tunes](https://www.instagram.com/saman.tunes)

## Features
- Real-time hand tracking with [MediaPipe Hands](https://github.com/google/mediapipe)
- 8 chords: fingers 1–4 with open thumb (top row) and 1–4 with closed thumb (bottom row)
- Closed fist or hand out of frame = silence; hand up/down = volume
- Two sounds: piano and synth pad
- Records a video of the performance (app audio + microphone) and sends it to the user's Telegram chat
- Persian UI

## Tech stack
| Part | Technology |
|------|------------|
| Frontend | HTML, CSS, JavaScript, MediaPipe Hands, Web Audio API, MediaRecorder |
| Telegram bot | Cloudflare Worker (JavaScript), webhook-based |
| Video upload API | Cloudflare Worker (JavaScript) |

## Architecture
```
Telegram user ──/start──▶ Bot Worker ──▶ inline button (web_app)
                                              │
                                              ▼
                          Mini App (GitHub Pages, index.html)
                                              │  recorded video + initData
                                              ▼
                          Video-upload Worker ── verifies initData (HMAC-SHA256)
                                              │
                                              ▼
                          Telegram sendVideo / sendDocument ──▶ user's chat
```

## Project structure
```
index.html                  # Web app / Mini App
workers/bot/                # Telegram bot (webhook)
workers/video-upload/       # Receives recordings, validates the Telegram user
```

## Setup
Requires Node.js and a Cloudflare account.

**Bot**
```bash
cd workers/bot
npx wrangler deploy
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
```
Then open once: `https://<your-worker-url>/?setup=<WEBHOOK_SECRET>` to register the webhook.

**Video upload**
```bash
cd workers/video-upload
npx wrangler deploy
npx wrangler secret put BOT_TOKEN
```

Never commit tokens. Secrets are stored in Cloudflare, not in the code.

## Security notes
- Webhook requests are checked with Telegram's secret-token header.
- Uploads are accepted only if Telegram `initData` has a valid signature and is less than 24 hours old.
- Upload size is limited to 49 MB.

## Author
Made by Saman · [@saman.tunes](https://www.instagram.com/saman.tunes)
