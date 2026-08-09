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
        console.warn('[DualPersonaEngine] Gemini key fallback.');
      }
    }
  }

  private getFaangEmPrompt(candidate: CandidateProfile, rubrics: RubricCriteria[], mcpContext?: GithubRepoMockData): string {
    return `
You are Alex Vance, a Principal Engineering Manager at a top FAANG AI lab (Google DeepMind / Meta FAIR).
You are evaluating an engineer on the 31-Day Enterprise AI Engineering Cohort.

STRICT INTERVIEWER RULES & BEHAVIOR:
1. IF THE CANDIDATE GIVES A SHORT, VAGUE, WEAK, OR NON-TECHNICAL ANSWER (e.g., "idk", "hi", "ok", "yes", "whatever", or < 30 characters), DO NOT ADVANCE TO A NEW TOPIC AND DO NOT PRAISE THEM.
2. Politely but firmly push back: call out the lack of technical depth, explain why their response is insufficient for a FAANG engineering evaluation, and demand concrete algorithms, memory trade-offs, and system architecture choices.
3. IF THE CANDIDATE GIVES A DEEP TECHNICAL ANSWER: Acknowledge their specific architectural points and progress adaptive follow-up questions to test edge cases, p99 latency, and failure modes.
4. Test cohort modules: RAG & Hybrid Search (BM25 + Dense + RRF), Vector DB Indexing (HNSW vs IVF-PQ), Agentic AI ReAct Loops & Circuit Breakers, Model Context Protocol (MCP), and vLLM Serving (PagedAttention).

Candidate Details:
- Name: ${candidate.name}
- Target Role: ${candidate.role}

${mcpContext ? MockGithubMcpService.formatMcpContextForAgent(mcpContext) : ''}
${RubricKnowledgeBase.formatRubricsForPrompt(rubrics)}
`;
  }

  private getAbTalksMentorPrompt(candidate: CandidateProfile): string {
    return `
You are Anil Bajpai, Founder of ABTalks & Tech Leadership Mentor.
Evaluate the candidate's performance across the 31-Day Enterprise AI Engineering Cohort.
Synthesize their strengths, honest growth areas, and outline an actionable career acceleration roadmap.
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
    isPushback?: boolean;
  }): Promise<{ reply: string; persona: PersonaType; usedGemini: boolean }> {
    const { persona, candidate, userMessage, rubrics, mcpContext, isGreeting, isWrapUp, currentModule, isPushback } = params;

    // Hard pushback override for vague/short/troll answers
    if (isPushback) {
      return {
        reply: `That answer ("${userMessage.trim()}") is not an engineering response, ${candidate.name}. In a Principal FAANG systems evaluation, one-word answers, greetings, or vague statements will not pass.\n\nPlease address the technical challenge: How do you implement **Hybrid Search (BM25 + Dense embeddings)** and normalize ranking scores using **Reciprocal Rank Fusion (RRF)**? What chunking strategy prevents context fragmentation?`,
        persona: persona,
        usedGemini: false
      };
    }

    if (this.genAI) {
      try {
        const systemInstruction = persona === 'FAANG_EM' 
          ? this.getFaangEmPrompt(candidate, rubrics, mcpContext)
          : this.getAbTalksMentorPrompt(candidate);

        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: systemInstruction
        });

        let promptText = '';
        if (isPushback) {
          promptText = `
CRITICAL INSTRUCTION: The candidate gave a brief, vague, or non-technical response: "${userMessage}".
DO NOT PRAISE THEM. DO NOT MOVE TO A NEW TECHNICAL TOPIC.
In character as ${persona}, politely but strictly inform candidate ${candidate.name} that their answer ("${userMessage}") lacks technical substance for a FAANG engineering evaluation. Demand specific algorithms, memory footprints, and architectural trade-offs for Module ${currentModule || 'RAG_EMBEDDINGS'}.
`;
        } else {
          promptText = `
Candidate Name: ${candidate.name}
Current Persona: ${persona}
Phase: ${isGreeting ? 'GREETING' : isWrapUp ? 'FINAL_SYNTHESIS' : 'TECHNICAL_EVALUATION'}
Module: ${currentModule || 'GENERAL'}

Candidate's Answer: "${userMessage}"

Respond in character. If the answer is too short or lacks technical substance, demand algorithmic precision.
`;
        }

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
        console.warn('[DualPersonaEngine] Gemini API call had an issue, falling back to intelligent procedural agent.');
      }
    }

    const fallbackReply = this.generateCohortFallback({
      persona,
      candidate,
      userMessage,
      rubrics,
      mcpContext,
      isGreeting,
      isWrapUp,
      currentModule,
      isPushback
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
    isWrapUp?: boolean;
    currentModule?: string;
    isPushback?: boolean;
  }): string {
    const { persona, candidate, userMessage, mcpContext, isGreeting, isWrapUp, currentModule, isPushback } = params;
    const name = candidate.name || 'Candidate';
    const text = (userMessage || '').trim().toLowerCase();

    const roleLower = (candidate.role || '').toLowerCase();
    const isBackendRole = roleLower.includes('backend');
    const isArchitectRole = roleLower.includes('full stack') || roleLower.includes('architect');

    if (isGreeting) {
      if (isBackendRole) {
        return `Welcome, ${name}. I'm Alex Vance, Principal Engineering Manager. I see you've applied for **${candidate.role}** and brought 4+ years of distributed backend experience.\n\nLet's start with **Module 1: High-Concurrency Backend Systems & Distributed Locking**.\n\nWhen scaling a distributed payment or inventory service to handle 50,000 QPS with zero double-spending, why is simple Redis key setting insufficient, and how do you implement the **Redis Redlock algorithm with fencing tokens** and **PostgreSQL Repeatable Read / Serializable isolation levels**? Walk me through your deadlock handling and connection pool tuning.`;
      } else if (isArchitectRole) {
        return `Welcome, ${name}. I'm Alex Vance, Principal Engineering Manager. I see you've applied for **${candidate.role}** with extensive full-stack system architecture experience.\n\nLet's start with **Module 1: Real-Time Full Stack Architecture & Resilient Microservices**.\n\nWhen serving millions of concurrent web clients with live updates, how do you architect a **WebSocket Gateway with Redis Pub/Sub backplane**, and how do you implement **circuit breaker state machines with fallback queues** to prevent cascading failures across backend microservices?`;
      } else {
        return `Welcome, ${name}. I'm Alex Vance, Principal Engineering Manager. I see you've applied for **${candidate.role}** covering RAG, Vector DBs, Agentic AI, and MCP.\n\nLet's start with **Module 2: RAG & Hybrid Retrieval**.\n\nWhen building a production RAG system for legal or financial documents, why is pure dense embedding search insufficient for exact acronyms and part numbers, and how do you implement **Hybrid Search (BM25 + Dense)** with **Reciprocal Rank Fusion (RRF)**? Walk me through your chunking strategy and score normalization.`;
      }
    }

    // Direct pushback strictly tailored to applied role
    if (isPushback || text.length < 25 || text === 'hi' || text === 'hello' || text === 'ok' || text === 'yes') {
      if (isBackendRole) {
        return `That is not an engineering response, ${name}. In a Principal FAANG evaluation for a **Senior Backend Engineer**, one-word answers or high-level buzzwords will not pass.\n\nPlease address the technical challenge: How do you implement **Redis Redlock with fencing tokens** and **PostgreSQL Repeatable Read isolation** to guarantee zero double-spending under 50,000 concurrent QPS?`;
      } else if (isArchitectRole) {
        return `That is not an engineering response, ${name}. In a Principal FAANG evaluation for a **Staff Systems Architect**, one-word answers or high-level buzzwords will not pass.\n\nPlease address the technical challenge: How do you architect a **WebSocket Gateway with Redis Pub/Sub backplane** to handle 500,000 concurrent client connections without memory leaks or dropped frames?`;
      } else {
        return `That is not an engineering response, ${name}. In a Principal FAANG evaluation for an **AI / RAG Platform Engineer**, one-word answers or high-level buzzwords will not pass.\n\nPlease address the technical challenge: How do you implement **Hybrid Search (BM25 + Dense embeddings)** and normalize ranking scores using **Reciprocal Rank Fusion (RRF)**? What chunking strategy prevents context fragmentation?`;
      }
    }

    if (persona === 'FAANG_EM') {
      if (isBackendRole) {
        if (currentModule === 'VECTOR_INDEXING' || currentModule === 'BACKEND_MODULE_2') {
          return `Good breakdown on distributed locking, ${name}. Now let's test **Module 2: High-Scale Database Replication & Change Data Capture (CDC)**.\n\nWhen scaling your primary database to millions of write operations, how do you configure **PostgreSQL Logical Replication** with **Debezium and Apache Kafka** to stream order ledger changes to read replicas without locking primary tables? How do you handle schema evolution?`;
        }
        if (currentModule === 'AGENTIC_AI' || currentModule === 'BACKEND_MODULE_3') {
          return `Solid reasoning on CDC event streaming, ${name}.\n\nLet's test **Module 3: Asynchronous Message Queues & Rate Limiting**. How do you design a **Token Bucket Rate Limiter middleware in Go/Node.js** with Redis sliding logs to prevent DDoS, and how do you configure Kafka consumer groups and Dead Letter Queues (DLQ) for guaranteed at-least-once message processing?`;
        }
        return `Excellent backend analysis, ${name}. How do you tune PgBouncer connection pooling and TCP keepalive parameters to maintain sub-5ms latency under sudden 10x traffic spikes?`;
      }

      if (isArchitectRole) {
        if (currentModule === 'VECTOR_INDEXING' || currentModule === 'ARCH_MODULE_2') {
          return `Good architectural breakdown, ${name}. Now let's test **Module 2: Microservices Circuit Breakers & Service Mesh Resilience**.\n\nWhen a downstream payment microservice experiences 2000ms latency degradation, how do you configure **Envoy Service Mesh circuit breakers (consecutive 5xx errors, outlier detection)** and dynamic fallback queues to preserve client UX?`;
        }
        if (currentModule === 'AGENTIC_AI' || currentModule === 'ARCH_MODULE_3') {
          return `Solid design on service mesh circuit breaking, ${name}.\n\nLet's test **Module 3: Frontend Streaming SSR & Real-Time State Hydration**. How do you optimize React 18 Streaming SSR with Selective Hydration to achieve sub-1.0s First Contentful Paint (FCP) across multi-tenant enterprise dashboards?`;
        }
        return `Great system design perspective, ${name}. How do you configure Kubernetes Horizontal Pod Autoscaling (HPA) based on custom Prometheus QPS metrics rather than CPU utilization alone?`;
      }

      // Default AI / RAG Role
      if (currentModule === 'VECTOR_INDEXING') {
        return `Good breakdown on hybrid search and RRF normalization, ${name}. Now let's test **Module 3: Vector Databases & Indexing Internals**.\n\nWhen scaling to 20 million 1536-dimensional embeddings, an in-memory HNSW index will consume significant RAM (~120GB+). How do you decide between **HNSW** and **IVF-PQ (Inverted File with Product Quantization)**? What is the mathematical trade-off between recall degradation and query QPS under high concurrent load?`;
      }

      if (currentModule === 'AGENTIC_AI') {
        const mcpNote = mcpContext ? `\n\n[MCP AST Inspection]: I checked your GitHub repository (${mcpContext.repoName}) and examined your agent loop design.` : '';
        return `Solid reasoning on vector quantization trade-offs, ${name}.${mcpNote}\n\nLet's test **Module 4: Agentic AI & Tool Orchestration**. In an autonomous multi-agent supervisor system, what happens when a sub-agent gets caught in an infinite or non-convergent ReAct loop? How do you implement state persistence, circuit breakers, and reflection/evaluator steps for deterministic recovery?`;
      }

      if (currentModule === 'MCP_PROTOCOL') {
        return `Now let's examine **Module 5: Model Context Protocol (MCP)**. How does MCP standardize tool discovery over JSON-RPC compared to legacy vendor-locked tool calling? What security boundaries and permission sandboxes do you enforce when an LLM requests dynamic filesystem or database resources via MCP?`;
      }

      if (currentModule === 'PRODUCTION_SERVING') {
        return `Let's close our technical grill on **Module 6: Production AI Systems & vLLM Serving**. In a high-traffic inference cluster, explain how **PagedAttention** eliminates memory fragmentation in the KV cache, and how you design **Semantic Caching** with Redis to drop Time-To-First-Token (TTFT) from 800ms down to sub-50ms for similar prompts.`;
      }

      return `Good technical analysis, ${name}. Now walk me through the failure modes: When your p99 latency spikes above 1.5s under sudden burst traffic, how do you handle graceful degradation and telemetry tracing across your worker nodes?`;
    }

    if (isWrapUp || persona === 'ABTALKS_MENTOR') {
      return `Hello ${name}! I'm transitioning in now—Anil Bajpai here from ABTalks. Congratulations on completing that rigorous technical evaluation tailored strictly for your **${candidate.role}** role!\n\nYou demonstrated your technical depth across your domain specialization. Your ability to think through real-world system trade-offs is what separates average engineers from top-tier talent.\n\nI have synthesized your complete **ABTalks Industry Readiness Scorecard** below. Take a look at your competency breakdown, your top strengths, and the actionable career roadmap we've prepared for you!`;
    }

    return `Great reflection, ${name}. Let's look at your finalized evaluation report!`;
  }
}
