# gemini-ai

Minimal Node.js + React chat app using Google Gemini.

## Prerequisites

- Node.js 18+
- A Google Gemini API key

## Setup

1. Install root deps and set env:

```bash
npm install
# Copy .env.example to .env and set GOOGLE_GEMINI_API_KEY
```

2. Start the API (port 3001):

```bash
npm run dev:api
```

3. Install and start the web app (port 5173):

```bash
cd web
npm install
npm run dev
```

The web dev server proxies `/api` to `http://localhost:3001`.

## Structure

- `src/server/index.js`: Express API with `/api/chat`
- `web/`: Vite React app with a ChatGPT-style UI

## Notes

- Tailwind is configured in `web` with theme tokens.
- Change model name in `src/utils/gemini.js` if desired.