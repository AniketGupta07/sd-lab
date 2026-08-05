# System Design Interview Lab

An eight-week, local-first study workspace for system design interviews spanning distributed systems, backend infrastructure, ML system design, and LLM infrastructure.

The first version includes:

- A Week 1 dashboard and full eight-week curriculum
- Detailed foundation topics with confidence and completion tracking
- Estimation drills with worked reasoning and architectural interpretation
- Timed URL-shortener and distributed-rate-limiter design workspaces
- Structured design notes, self-evaluation, saved attempts, and mock prompts
- Personal notes, a focused mistake log, review dates, and dark mode
- Browser-local persistence with no account or backend required

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by the development server.

## Validate

```bash
npm run build
node --test tests/rendered-html.test.mjs
```

Progress is stored in the browser under the versioned key `ai-system-design-study:v1`. It stays on the current device and browser profile.

## Deployment

Pushes to `main` publish the static export through GitHub Pages. The workflow is intentionally limited to repository read access and Pages deployment permissions.
