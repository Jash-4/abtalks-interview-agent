import { GoogleGenerativeAI } from '@google/generative-ai';
import { PersonaType, CandidateProfile, RubricCriteria, GithubRepoMockData } from '../types';
import { RubricKnowledgeBase } from '../rag/rubricStore';
import { MockGithubMcpService } from '../mcp/githubMock';

export class DualPersonaEngine {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string = 'gemini-1.5-flash';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key && key !== 'your_gemini_api_key_here' && key.trim() !== '') {
      try {
        this.genAI = new GoogleGenerativeAI(key);
      } catch (err) {
        console.warn('[DualPersonaEngine] Warning: Could not initialize Gemini client, using robust agentic fallback.');
      }
    }
  }

  /**
   * System Prompt for FAANG Engineering Manager Persona (Alex Vance)
   * Assessing 31-Day Enterprise AI Cohort concepts: RAG, Vector DBs, Agents, MCP, vLLM.
   */
  private getFaangEmPrompt(candidate: CandidateProfile, rubrics: RubricCriteria[], mcpContext?: GithubRepoMockData): string {
    return `
You are Alex Vance, a Principal Engineering Manager at a top FAANG AI lab (Google DeepMind / Meta FAIR).
You are interviewing a graduate from the 31-Day Enterprise AI Engineering Cohort.

Curriculum Areas to Assess Across Multi-Turn Questions:
1. Module 1 (Days 1-5): Prompt Engineering, JSON Schemas, Structured Outputs, Jailbreak Defenses.
2. Module 2 (Days 6-12): RAG Ingestion, Semantic Chunking, Hybrid Search (BM25 + Dense), RRF Re-ranking.
3. Module 3 (Days 13-17): Vector DB Internals, HNSW vs IVF, Product Quantization (PQ), Sharding.
4. Module 4 (Days 18-23): Agentic Workflows, ReAct loops, Multi-Agent Supervisor topologies, Circuit Breakers.
5. Module 5 (Days 24-27): Model Context Protocol (MCP), JSON-RPC Tool calls, Security boundaries.
6. Module 6 (Days 28-31): Production Serving with vLLM, PagedAttention, Semantic Caching, TTFT/TPOT latency.

Candidate Details:
- Name: ${candidate.name}
- Target Role: ${candidate.role}
- Experience: ${candidate.experienceYears} years

${mcpContext ? MockGithubMcpService.formatMcpContextForAgent(mcpContext) : ''}

${RubricKnowledgeBase.formatRubricsForPrompt(rubrics)}

Interview Rules:
1. Conduct an adaptive, conversational technical interview with sharp follow-up questions based on their answers.
2. Demand algorithmic rigor: memory trade-offs, vector dimensions, QPS vs recall, and concurrency safeguards.
3. If they give a superficial answer, probe deeper into failure modes and production edge cases.
`;
  }

  /**
   * System Prompt for ABTalks Career Mentor Persona (Anil Bajpai)
   */
  private getAbTalksMentorPrompt(candidate: CandidateProfile): string {
    return `
You are Anil Bajpai, Founder of ABTalks & Tech Leadership Mentor.
You are evaluating the candidate's completion of the 31-Day Enterprise AI Engineering Cohort.

Your Persona:
- Inspiring, constructive, deeply focused on real-world "Industry Readiness".
- You bridge the gap between cohort theoretical knowledge and shipping high-impact enterprise AI products.
- You celebrate their mastery of RAG, Vector DBs, Agents, and MCP while providing a concrete career roadmap.

Candidate Details:
- Name: ${candidate.name}
- Role: ${candidate.role}

Instructions:
1. Transition smoothly into the career mentor persona.
2. Highlight the strengths they demonstrated during the technical grill.
3. Provide an actionable roadmap to accelerate from mid-level AI Engineer to Staff AI Architect.
`;
  }

  public async generateResponse(params: {
    persona: PersonaType;
    candidate: CandidateProfile;
    userMessage: string;
    conversationHistory: { sender: string; text: string }[];
    rubrics: RubricCriteria[];
    mcpContext?: GithubRepoMockData;
    isGreeting?: boolean;
    isCodeChallenge?: boolean;
    isWrapUp?: boolean;
    currentModule?: string;
  }): Promise<{ reply: string; persona: PersonaType; usedGemini: boolean }> {
    const { persona, candidate, userMessage, rubrics, mcpContext, isGreeting, isCodeChallenge, isWrapUp } = params;

    if (this.genAI) {
      try {
        const systemInstruction = persona === 'FAANG_EM' 
          ? this.getFaangEmPrompt(candidate, rubrics, mcpContext)
          : this.getAbTalksMentorPrompt(candidate);

        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: systemInstruction
        });

        const promptText = `
Candidate Name: ${candidate.name}
Current Persona: ${persona}
Phase: ${isGreeting ? 'GREETING' : isCodeChallenge ? 'SYSTEM_DESIGN_CODE' : isWrapUp ? 'FINAL_SYNTHESIS' : 'TECHNICAL_EVALUATION'}

Candidate's Latest Message:
"${userMessage}"

Respond directly in character as ${persona}.
`;

        const result = await model.generateContent(promptText);
        const text = result.response.text();
        if (text && text.trim().length > 0) {
          return {
            reply: text.trim(),
            persona: persona,
            usedGemini: true
          };
        }
      } catch (error: any) {
        console.warn('[DualPersonaEngine] Smoothly falling back to intelligent procedural agent:', error?.message || error);
      }
    }

    // High-Fidelity Cohort Fallback Engine
    const fallbackReply = this.generateCohortFallback({
      persona,
      candidate,
      userMessage,
      rubrics,
      mcpContext,
      isGreeting,
      isCodeChallenge,
      isWrapUp,
      currentModule: params.currentModule
    });

    return {
      reply: fallbackReply,
      persona: persona,
      usedGemini: false
    };
  }

  private generateCohortFallback(params: {
    persona: PersonaType;
    candidate: CandidateProfile;
    userMessage: string;
    rubrics: RubricCriteria[];
    mcpContext?: GithubRepoMockData;
    isGreeting?: boolean;
    isCodeChallenge?: boolean;
    isWrapUp?: boolean;
    currentModule?: string;
  }): string {
    const { persona, candidate, userMessage, mcpContext, isGreeting, isWrapUp, currentModule } = params;
    const name = candidate.name || 'Candidate';

    if (isGreeting) {
      return `Welcome, ${name}. I'm Alex Vance, Principal Engineering Manager. I see you've completed the 31-Day Enterprise AI Engineering Cohort covering RAG, Vector DBs, Agentic AI, and MCP.\n\nToday, we're going to assess your deep systems mastery across the cohort modules. Let's start with **Module 2: RAG & Hybrid Retrieval**.\n\nWhen building a production RAG system for legal or financial documents, why is pure dense embedding search insufficient for exact acronyms and part numbers, and how do you implement **Hybrid Search (BM25 + Dense)** with **Reciprocal Rank Fusion (RRF)**? Walk me through your chunking strategy and score normalization.`;
    }

    if (persona === 'FAANG_EM') {
      const lower = userMessage.toLowerCase();

      if (currentModule === 'VECTOR_INDEXING' || lower.includes('vector') || lower.includes('hnsw') || lower.includes('ivf')) {
        return `Good explanation of hybrid search, ${name}. Now let's move to **Module 3: Vector Databases & Indexing Internals**.\n\nWhen scaling to 20 million 1536-dimensional embeddings, an in-memory HNSW index will consume significant RAM. How do you decide between **HNSW** and **IVF-PQ (Inverted File with Product Quantization)**? What is the mathematical trade-off between recall degradation and query QPS under high concurrent load?`;
      }

      if (currentModule === 'AGENTIC_AI' || lower.includes('agent') || lower.includes('react') || lower.includes('supervisor')) {
        const mcpNote = mcpContext ? `\n\n[MCP AST Inspection]: I examined your GitHub repo (${mcpContext.repoName}) and noticed your tool calling logic.` : '';
        return `Interesting points on vector sharding.${mcpNote}\n\nLet's test **Module 4: Agentic AI & Tool Orchestration**. In an autonomous multi-agent supervisor system, what happens when a sub-agent gets caught in a hallucinatory or non-convergent ReAct loop? How do you implement state persistence, circuit breakers, and reflection/evaluator steps to ensure deterministic recovery?`;
      }

      if (currentModule === 'MCP_PROTOCOL' || lower.includes('mcp') || lower.includes('json-rpc') || lower.includes('tool')) {
        return `Now let's examine **Module 5: Model Context Protocol (MCP)**. How does MCP standardize tool discovery over JSON-RPC compared to vendor-locked tool calling? What security boundaries and permission sandboxes do you enforce when an LLM requests dynamic filesystem or repository resources via MCP?`;
      }

      if (currentModule === 'PRODUCTION_SERVING' || lower.includes('vllm') || lower.includes('cache') || lower.includes('deploy')) {
        return `Let's close our technical grill on **Module 6: Production AI Systems & vLLM Serving**. In a high-traffic inference cluster, explain how **PagedAttention** eliminates memory fragmentation in the KV cache, and how you design **Semantic Caching** with Redis to drop Time-To-First-Token (TTFT) from 800ms down to sub-50ms for similar candidate prompts.`;
      }

      return `Solid reasoning on that architectural trade-off, ${name}. Let's probe the failure modes: When your p99 latency spikes above 1.5s under sudden burst traffic, how do you handle graceful degradation, fallback context compression, and open-telemetry tracing across your agent worker nodes?`;
    }

    // Persona B: ABTalks Career Mentor (Anil Bajpai)
    if (isWrapUp || persona === 'ABTALKS_MENTOR') {
      return `Hello ${name}! I'm transitioning in now—Anil Bajpai here from ABTalks. Congratulations on completing that rigorous technical evaluation across the 31-Day Enterprise AI Engineering Cohort!\n\nYou demonstrated remarkable technical depth across RAG architectures, Vector DB indexing, and Agentic orchestration. Your ability to think through memory vs. recall trade-offs and operational resilience is what separates average developers from top-tier AI Engineers.\n\nI have synthesized your complete **ABTalks Industry Readiness Scorecard** below. Take a look at your competency breakdown, your top strengths, and the actionable career acceleration roadmap we've prepared for you!`;
    }

    return `Great reflection, ${name}. You have shown genuine engineering maturity. Let's look at your finalized evaluation report!`;
  }
}
