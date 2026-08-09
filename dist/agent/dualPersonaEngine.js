"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualPersonaEngine = void 0;
const generative_ai_1 = require("@google/generative-ai");
const rubricStore_1 = require("../rag/rubricStore");
const githubMock_1 = require("../mcp/githubMock");
class DualPersonaEngine {
    genAI = null;
    modelName = 'gemini-1.5-flash';
    constructor(apiKey) {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (key && key !== 'your_gemini_api_key_here' && key.trim() !== '') {
            try {
                this.genAI = new generative_ai_1.GoogleGenerativeAI(key);
            }
            catch (err) {
                console.warn('[DualPersonaEngine] Gemini key fallback.');
            }
        }
    }
    getFaangEmPrompt(candidate, rubrics, mcpContext) {
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

${mcpContext ? githubMock_1.MockGithubMcpService.formatMcpContextForAgent(mcpContext) : ''}
${rubricStore_1.RubricKnowledgeBase.formatRubricsForPrompt(rubrics)}
`;
    }
    getAbTalksMentorPrompt(candidate) {
        return `
You are Anil Bajpai, Founder of ABTalks & Tech Leadership Mentor.
Evaluate the candidate's performance across the 31-Day Enterprise AI Engineering Cohort.
Synthesize their strengths, honest growth areas, and outline an actionable career acceleration roadmap.
`;
    }
    async generateResponse(params) {
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
                }
                else {
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
            }
            catch (error) {
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
    generateCohortFallback(params) {
        const { persona, candidate, userMessage, mcpContext, isGreeting, isWrapUp, currentModule, isPushback } = params;
        const name = candidate.name || 'Candidate';
        const text = (userMessage || '').trim().toLowerCase();
        if (isGreeting) {
            const roleLower = (candidate.role || '').toLowerCase();
            if (roleLower.includes('backend')) {
                return `Welcome, ${name}. I'm Alex Vance, Principal Engineering Manager. I see you've applied for **${candidate.role}** and brought 4+ years of distributed backend experience.\n\nLet's start with **Module 1: High-Concurrency Backend Systems & Distributed Locking**.\n\nWhen scaling a distributed payment or inventory service to handle 50,000 QPS with zero double-spending, why is simple Redis key setting insufficient, and how do you implement the **Redis Redlock algorithm with fencing tokens** and **PostgreSQL Repeatable Read / Serializable isolation levels**? Walk me through your deadlock handling and connection pool tuning.`;
            }
            else if (roleLower.includes('full stack') || roleLower.includes('architect')) {
                return `Welcome, ${name}. I'm Alex Vance, Principal Engineering Manager. I see you've applied for **${candidate.role}** with extensive full-stack system architecture experience.\n\nLet's start with **Module 1: Real-Time Full Stack Architecture & Resilient Microservices**.\n\nWhen serving millions of concurrent web clients with live updates, how do you architect a **WebSocket Gateway with Redis Pub/Sub backplane**, and how do you implement **circuit breaker state machines with fallback queues** to prevent cascading failures across backend microservices?`;
            }
            else {
                return `Welcome, ${name}. I'm Alex Vance, Principal Engineering Manager. I see you've applied for **${candidate.role}** covering RAG, Vector DBs, Agentic AI, and MCP.\n\nLet's start with **Module 2: RAG & Hybrid Retrieval**.\n\nWhen building a production RAG system for legal or financial documents, why is pure dense embedding search insufficient for exact acronyms and part numbers, and how do you implement **Hybrid Search (BM25 + Dense)** with **Reciprocal Rank Fusion (RRF)**? Walk me through your chunking strategy and score normalization.`;
            }
        }
        // Direct pushback for vague, short, or greeting responses
        if (isPushback || text.length < 25 || text === 'hi' || text === 'hello' || text === 'ok' || text === 'yes') {
            return `That is not an engineering response, ${name}. In a Principal FAANG systems interview, one-word answers or high-level buzzwords will not pass.\n\nPlease address the technical challenge: How do you implement **Hybrid Search (BM25 + Dense embeddings)** and normalize ranking scores using **Reciprocal Rank Fusion (RRF)**? What chunking strategy prevents context fragmentation?`;
        }
        if (persona === 'FAANG_EM') {
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
            return `Hello ${name}! I'm transitioning in now—Anil Bajpai here from ABTalks. Congratulations on completing that rigorous technical evaluation across the 31-Day Enterprise AI Engineering Cohort!\n\nYou demonstrated your technical depth across RAG architectures, Vector DB indexing, and Agentic orchestration. Your ability to think through memory vs. recall trade-offs is what separates average developers from top-tier AI Engineers.\n\nI have synthesized your complete **ABTalks Industry Readiness Scorecard** below. Take a look at your competency breakdown, your top strengths, and the actionable career roadmap we've prepared for you!`;
        }
        return `Great reflection, ${name}. Let's look at your finalized evaluation report!`;
    }
}
exports.DualPersonaEngine = DualPersonaEngine;
