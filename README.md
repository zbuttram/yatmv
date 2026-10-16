# YATMV - Yet Another Twitch Multi-View

## Development

Requires Node 22.12+ and [pnpm](https://pnpm.io) (`corepack enable` will pick up the pinned version).

```sh
cp .env.example .env   # then fill in your Twitch client ID
pnpm install
pnpm dev               # http://localhost:3000
```

| Script       | What it does                    |
| ------------ | ------------------------------- |
| `pnpm build` | Typecheck and build to `build/` |
| `pnpm test`  | Unit tests (Vitest)             |
| `pnpm e2e`   | End-to-end tests (Playwright)   |
| `pnpm lint`  | ESLint                          |

Register a Twitch app at https://dev.twitch.tv and set `REACT_APP_TWITCH_CLIENT_ID`.
