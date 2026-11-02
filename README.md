<div align="center">

# Discord RPC
### A polished glass UI Electron app for Discord Rich Presence

[![GitHub release](https://img.shields.io/github/v/release/kiwizariudev/discord-rpc?style=flat-square&color=5865F2)](https://github.com/kiwizariudev/discord-rpc/releases)
[![License](https://img.shields.io/github/license/kiwizariudev/discord-rpc?style=flat-square&color=5865F2)](LICENSE)
[![Stars](https://img.shields.io/github/stars/kiwizariudev/discord-rpc?style=flat-square&color=5865F2)](https://github.com/kiwizariudev/discord-rpc/stargazers)

</div>

---

## Features

- **Glass UI** with animated video background (Saturn rings)
- **Activity types** — Playing, Streaming, Listening, Watching, Competing
- **Image support** — Art Asset Key or raw Image ID
- **Buttons** — up to 2 clickable RPC buttons
- **Presets** — one-click ready-made profiles (Valorant included)
- **Auto-save** — all fields saved automatically between sessions
- **Auto-start** — RPC launches automatically if previously configured
- **Character counters** on text fields
- **Elapsed timer** toggle

---

## Quick Start

> Requires [Node.js](https://nodejs.org/) v18+ and Discord running on your PC.

```bash
git clone https://github.com/kiwizariudev/discord-rpc.git
cd discord-rpc
npm install
npm start
```

---

## Build

```bash
npm run build
```

Installer output goes to `dist/`.

---

## Project Structure

```
discord-rpc/
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Preload script
│   ├── renderer.js      # UI logic
│   └── style.css        # Styles
├── public/
│   └── index.html       # App HTML
├── assets/
│   ├── presets/         # Preset artwork
│   │   ├── val_banner.png
│   │   └── val_logo.png
│   └── bg.mp4           # Background video
├── .gitignore
├── package.json
└── README.md
```

---

## How to get your Client ID

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Create or select an application
3. Copy the **Application ID** from General Information
4. Enable **Rich Presence** in the app settings

---

## Adding a Preset

In `src/renderer.js`, add an entry to the `PRESETS` object:

```js
mygame: {
  details:        'Playing My Game',
  state:          'In a match',
  largeImageKey:  'my_banner',
  largeImageText: 'My Game',
  smallImageKey:  'my_logo',
  smallImageText: 'My Game',
  showTimestamp:  true,
}
```

Then add a matching card in `public/index.html` inside `.presets-grid`.

---

<div align="center">
Made by <a href="https://github.com/kiwizariudev">kiwizariudev</a>
</div>
