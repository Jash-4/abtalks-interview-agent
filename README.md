# 🚀 ABTalks AI Interview Agent (God Mode Dual-Persona)

An intelligent, autonomous AI Technical Interview Agent built for the **ABTalks Hackathon** (judged by **Anil Bajpai**).

🎬 **Demo Video**: [Watch 2-Min Live Interview Demo](https://youtube.com) *(Update with your YouTube Link)*
🌐 **Live App**: [https://abtalks-interview-agent.vercel.app](https://abtalks-interview-agent.vercel.app)

---

## 🌟 What Makes It "God Mode"?

1. **🎭 Dual-Persona Agentic Workflow**:
   - **Persona A (Alex Vance - FAANG Principal EM)**: Conducts a rigorous, deep technical grill session on concurrency, race conditions, distributed locks, and database isolation levels.
   - **Persona B (Anil Bajpai - ABTalks Career Mentor)**: Transitions seamlessly at the end of the interview to deliver the candidate's **Industry Readiness Index** and an actionable career acceleration roadmap.
2. **📚 Retrieval-Augmented Generation (RAG)**:
   - Evaluates answers in real-time against dynamic FAANG grading rubrics and systems benchmarks.
3. **⚡ Mock Model Context Protocol (MCP)**:
   - Simulates live inspection of the candidate’s GitHub repository (`mcp__inspect_github_repo`), detecting architecture patterns, test coverage, and code smells to tailor interview questions.
4. **📦 Structured Output JSON**:
   - Outputs a production-grade scorecard with category-by-category metrics, key strengths, targeted growth areas, and the ABTalks Industry Readiness Index.

---

## 👥 3-Member Team Domain Ownership

| Member | Primary Role | Core Modules & Deliverables |
| :--- | :--- | :--- |
| **Member 1 (Lead)** | **Agent Engine & Orchestration** | `src/agent/dualPersonaEngine.ts`<br>`src/agent/stateMachine.ts`<br>`src/server.ts` |
| **Member 2** | **RAG Knowledge Base & Scoring Pipeline** | `src/rag/rubricStore.ts`<br>`src/scoring/evaluator.ts`<br>`src/types.ts` |
| **Member 3** | **Interactive UI, Deployment & Submission** | `public/index.html`<br>`public/style.css`<br>`public/app.js`<br>`render.yaml` |

---

## 🚀 Quick Start (Local Setup)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` in the root folder:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 3. Build & Run
```bash
# Build TypeScript
npm run build

# Start Production Server
npm start
```
Open your browser at: **`http://localhost:3000`**

---

## 📡 REST API & MCP Endpoints

### 1. Start Interview Session
```bash
curl -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Rivera",
    "role": "Senior Backend Engineer",
    "experienceYears": 4,
    "githubUsername": "alex-rivera-dev"
  }'
```

### 2. Send Candidate Answer
```bash
curl -X POST http://localhost:3000/api/interview/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<SESSION_ID>",
    "message": "We use Redis distributed locks with a fence-token and optimistic locking in PostgreSQL with Repeatable Read isolation.",
    "codeSnippet": "const lock = await redis.lock(\"resource_key\", { ttl: 5000 });"
  }'
```

### 3. Finalize & Export ABTalks Scorecard JSON
```bash
curl -X POST http://localhost:3000/api/interview/finish \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<SESSION_ID>"
  }'
```

### 4. Direct Mock MCP GitHub Inspector
```bash
curl "http://localhost:3000/api/mcp/github-inspect?username=candidate-dev&role=backend"
```

---

## ☁️ Deployment on Render.com

1. Create a public repository on GitHub named `abtalks-interview-agent`.
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "feat: God Mode ABTalks AI Interview Agent"
   git branch -M main
   git remote add origin https://github.com/<your-username>/abtalks-interview-agent.git
   git push -u origin main
   ```
3. Sign in to [Render.com](https://render.com), click **New Web Service**, connect the repository, and set:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variable**: `GEMINI_API_KEY` = your Google AI Studio API key.
