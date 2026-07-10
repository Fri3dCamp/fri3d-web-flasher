# Fri3d Web Flasher

Web flasher for the hardware of [Fri3d camp](https://fri3d.be), the biennial hacker family camp.
Every edition ships a main **badge** (ESP32-based, flashed over [WebSerial](https://web.dev/serial/)
with esptool-js) and optional **peripherals** (WCH-based, e.g. Communicator and DJ addon, flashed
over WebUSB with wchisp-web).

The app lists firmware releases straight from the Fri3dCamp GitHub repos. In simple mode you flash
the latest release with one click; advanced mode lets you pick a specific release/hardware version,
erase flash, and inspect the connected chip. Downloads are cached in the browser so re-flashing
doesn't re-download.

Requires a Chromium-based browser (Chrome, Edge, Brave, ...) for WebSerial/WebUSB.

Supported hardware:

- Badge 2026 and 2024 (full firmware image, flashed at 0x0)
- Communicator 2026 / 2024
- DJ Addon 2026

Hosted at https://fri3d-flasher.vercel.app/

## Architecture

- `src/lib/github.ts` — release listing + asset download (via proxy, with Cache Storage caching)
- `src/components/BadgeFlasher.tsx` — ESP32 badge flashing (esptool-js, WebSerial)
- `src/components/PeripheralFlasher.tsx` — WCH peripheral flashing (wchisp-web, WebUSB)
- `api/` — serverless proxies (Vercel + Vite dev middleware) for GitHub's API and release
  downloads, since GitHub serves neither with CORS headers. Firmware fetching may move to a
  central caching API later; swap it in `src/lib/github.ts`.

## Development

Vite + React. To start the development server:

```bash
npm install
npm run dev
```
