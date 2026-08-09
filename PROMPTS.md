# 🤖 AI Usage & Vibe-Coding Logs (PROMPTS.md)

This log documents the prompts, architectural decisions, and agentic workflows used to build the **God Mode ABTalks AI Interview Agent** for the ABTalks Hackathon (judged by Anil Bajpai).

---

## 🏗️ 1. Architecture & Dual-Persona Design Prompt

```text
Build a God-Mode AI Technical Interview Agent with a Dual-Persona Agentic Workflow:
1. Persona A (Alex Vance - Principal FAANG Engineering Manager):
   - Strict technical rigor, evaluates concurrency, distributed locking (Redis Redlock), database isolation levels (Repeatable Read, Serializable), and cache stampedes.
2. Persona B (Anil Bajpai - ABTalks Career Mentor):
   - Transitions smoothly at the conclusion to deliver an "Industry Readiness Index" and actionable mentorship roadmap.
3. Model Context Protocol (MCP):
   - Implement a mock MCP tool `mcp__inspect_github_repo` to analyze candidate ASTs, commit history, and code smells.
4. RAG Knowledge Base:
   - Vector/semantic retrieval against FAANG L4/L5/L6 competency rubrics.
5. Structured JSON Output:
   - Output an industry-standard evaluation scorecard with category breakdowns, strengths, growth areas, and career acceleration roadmap.
```

---

## ⚡ 2. Mock MCP Protocol Integration Prompt

```text
Design a TypeScript service simulating the Model Context Protocol (MCP) for code review:
- Method: inspectRepository(username, roleHint)
- Analyze code quality grades (Grade A/B), architecture patterns, and potential code smells.
- Format the tool context into standard Markdown blocks injected into the agent's system instruction.
- Provide a dedicated REST endpoint `GET /api/mcp/github-inspect` for judge evaluation.
```

---

## 📚 3. RAG Rubrics & Scoring Formulation Prompt

```text
Create a semantic rubric store and evaluation engine:
- Vector/keyword matching for categories: concurrency, system_architecture, data_structures, problem_solving, communication, and industry_readiness.
- Compute the ABTalks Industry Readiness Score using the formula:
  Readiness Score = (0.30 * Technical) + (0.25 * Architecture) + (0.25 * ProblemSolving) + (0.20 * Communication)
- Return clean JSON formatted for the ABTalks dashboard.
```

---

## 🎨 4. Frontend Candidate Portal Prompt

```text
Create a modern, dark-mode web application (HTML/CSS/JS):
- Glassmorphism design with Outfit and JetBrains Mono typography.
- Interactive terminal chat area with live audio/typing status.
- Left sidebar with live Mock MCP Tool Inspector drawer.
- Stage tracker (1. Greeting -> 2. Concurrency -> 3. System Design -> 4. MCP Review -> 5. ABTalks Scorecard).
- Rich scorecard view with animated progress bars, badges, and a 1-click JSON copy button.
```

---

## ☁️ 5. Zero-Downtime Reliability & Netlify Cloud Deployment Prompt

```text
Ensure 100% test reliability:
- Implement a robust procedural fallback in `src/agent/dualPersonaEngine.ts` so the API never fails even if API keys expire or hit rate limits during judging.
- Provide `netlify.toml` and serverless API handlers for 1-click zero-downtime deployment on Netlify Cloud.
```

---

## 🔒 6. Proctored Fullscreen Interview & Cross-Browser Event Prompt

```text
Implement a distraction-free Proctored Fullscreen Interview Mode:
- Trigger synchronous Fullscreen API request on user launch gestures.
- Add CSS viewport overlay (`100vw`/`100vh` with `z-index: 999999`) for 100% viewport coverage.
- Add cross-browser vendor listeners (`fullscreenchange`, `webkitfullscreenchange`, `mozfullscreenchange`).
- Add glowing green header badge (`🔒 Proctored Fullscreen: ACTIVE`) and interactive F11 keyboard guide banner.
```
