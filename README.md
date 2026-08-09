# 🚀 ABTalks AI Interview Agent (God Mode Dual-Persona)

An intelligent, autonomous AI Technical Interview Agent built for the **ABTalks Hackathon** (judged by **Anil Bajpai**).

🎬 **Demo Video**: [Watch 2-Min Live Interview Demo](https://youtu.be/m4YVTdReBa0?si=F04wui-IUgLc5Vi5)
🌐 **Live App**: [https://admirable-mooncake-4bab98.netlify.app](https://admirable-mooncake-4bab98.netlify.app)

---

## 🌟 What Makes It "God Mode"?

1. **🎭 Dual-Persona Agentic Workflow**:
   - **Persona A (Alex Vance - FAANG Principal EM)**: Conducts a rigorous, deep technical grill session on concurrency, race conditions, distributed locks, database isolation, and vector systems.
   - **Persona B (Anil Bajpai - ABTalks Career Mentor)**: Transitions seamlessly at the end of the interview to deliver the candidate's **Industry Readiness Index** and an actionable career acceleration roadmap.
2. **👥 Preset Candidate Roster & Resume Inspector Modal**:
   - Includes verified candidate profiles from top Indian institutes (**IIT Bombay**, **IISc Bangalore**, **IIT Delhi**) on a **10.0 CGPA scale**.
   - Features an interactive **Background Resume Inspector Modal** displaying candidate education, executive summary, tech stack, and GitHub project ASTs.
3. **🎯 100% Strict Role-Grounded Interview Engine**:
   - Tailors all interview questions, pushbacks, and technical module transitions strictly according to the candidate's applied target role (*Senior Backend Engineer*, *AI/RAG Platform Engineer*, *Staff Systems Architect*).
4. **📚 RAG Knowledge Base — 7 FAANG System Rubrics**:
   - Evaluates answers in real-time against 7 enterprise grading rubrics: BM25+Dense RRF, Distributed Locking & DB Isolation, HNSW vs IVF-PQ Quantization, ReAct Loops, MCP v1.0 JSON-RPC, vLLM PagedAttention, and Microservice Gateway Mesh.
5. **⚡ Mock Model Context Protocol (MCP)**:
   - Simulates live inspection of the candidate’s GitHub repository (`mcp__inspect_github_repo`), detecting architecture patterns, test coverage, and code smells to tailor interview questions.
6. **📊 6-Dimensional Competency SVG Radar Visualization**:
   - Renders dynamic SVG Radar Chart polygon, axis spokes, vertex data points, and dimension labels (*Technical Depth*, *Architecture*, *Problem Solving*, *Communication*, *Code Craft*, *Domain Expertise*).
7. **🔊 AI Text Reader Voice Engine**:
   - Real-time SpeechSynthesis text reader with auto-silence upon entering the ABTalks report card view.
8. **📄 1-Click Markdown & JSON Export**:
   - Exports `ABTalks_Report_CandidateName.md` and copies structured JSON payloads directly for judge evaluation.

---

## 🏆 The 4 Evaluation Rating Tiers

| Score Range | Verdict Tag | Meaning in ABTalks Cohort Evaluation |
| :--- | :--- | :--- |
| **88 – 100** | 🟢 **Immediate Strong Hire** | Passed deep technical grill (RAG BM25 + Dense, HNSW vector indexing, vLLM PagedAttention). FAANG L5/L6 Ready. |
| **75 – 87** | 🔵 **Hire (L4 / Mid-Level)** | Solid technical depth, clean code snippets, and good system design intuition. |
| **60 – 74** | 🟠 **Needs Mentorship & Refinement** | Baseline setup completed & role background verified. Ready to complete Stage 2-4 technical modules. |
| **0 – 59** | 🔴 **Not Ready Yet** | Submitted brief/vague one-word answers (`"hi"`, `"idk"`) during technical questions or failed trade-off rigor. |

---

## 👥 3-Member Team Domain Ownership (Equal Contribution & Work Distribution)

| Member | Primary Role & Equal Domain Ownership | Core Modules & Deliverables |
| :--- | :--- | :--- |
| **Dhanwinn (Lead)** | **Agent Engine & Orchestration** | `src/agent/dualPersonaEngine.ts`<br>`src/agent/stateMachine.ts`<br>`src/server.ts` |
| **Sreesanth (Member 2)** | **RAG Knowledge Base & Scoring Pipeline** | `src/rag/rubricStore.ts`<br>`src/scoring/evaluator.ts`<br>`src/types.ts` |
| **Moguluri Sri Ranga Sesha Siva Jaswanth / Jash-4 (Member 3)** | **Interactive UI, Netlify Cloud & Submission** | `public/index.html`<br>`public/style.css`<br>`public/app.js`<br>`netlify.toml`<br>`src/functions/server.ts` |

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
    "name": "Aarav Sharma",
    "role": "Senior Backend Engineer",
    "experienceYears": 4,
    "githubUsername": "aarav-sharma-dev"
  }'
```

### 2. Send Candidate Answer
```bash
curl -X POST http://localhost:3000/api/interview/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<SESSION_ID>",
    "message": "We use Redis distributed locks with a fence token and optimistic locking in PostgreSQL with Repeatable Read isolation.",
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
curl "http://localhost:3000/api/mcp/github-inspect?username=aarav-sharma-dev&role=backend"
```

---

## ☁️ Deployment on Netlify Cloud

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
3. Sign in to [Netlify.com](https://app.netlify.com), click **Import from Git**, connect your repository, and Netlify automatically detects `netlify.toml`:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `public`
   - **Functions Directory**: `dist/functions`
   - **Environment Variable**: `GEMINI_API_KEY` = your Google AI Studio API key.
4. **Live Netlify Application Link**: [https://admirable-mooncake-4bab98.netlify.app](https://admirable-mooncake-4bab98.netlify.app)
