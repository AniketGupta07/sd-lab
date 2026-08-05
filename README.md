# System Design Interview Lab

An eight-week, local-first study workspace for system design interviews spanning distributed systems, backend infrastructure, ML system design, and LLM infrastructure.

The workspace includes:

- A progress-aware dashboard and complete eight-week curriculum
- 49 technically deep modules with mechanisms, decision frameworks, diagnosed failure modes, quizzes, and primary reading
- Eight estimation drills with worked reasoning and architectural interpretation
- 25 timed design rooms with senior-level reference architectures across classic, ML, and LLM systems
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
node --test tests/static-export.test.mjs
```

Progress is stored in the browser under the versioned key `ai-system-design-study:v1`. It stays on the current device and browser profile.

## Deployment

Pushes to `main` publish the static export through GitHub Pages. The workflow is intentionally limited to repository read access and Pages deployment permissions.
