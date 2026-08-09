"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RubricKnowledgeBase = void 0;
/**
 * Rubric Knowledge Base & Retrieval-Augmented Generation (RAG) Store.
 *
 * Specifically grounded on the 31-Day Enterprise AI Engineering Cohort curriculum:
 * - Module 1: Prompt Engineering & Deterministic LLMs (Days 1-5)
 * - Module 2: Retrieval-Augmented Generation & Embeddings (Days 6-12)
 * - Module 3: Vector Databases & Indexing Internals (Days 13-17)
 * - Module 4: Agentic AI & Tool Calling Orchestration (Days 18-23)
 * - Module 5: Model Context Protocol (MCP) & Custom Tools (Days 24-27)
 * - Module 6: Production AI Systems, vLLM & Deployment (Days 28-31)
 *
 * @author Sreesanth <Muddarsusreesanth@gmail.com> (RAG Knowledge Base & Scoring Pipeline Specialist)
 */
class RubricKnowledgeBase {
    static rubrics = [
        {
            id: 'rubric_rag_01',
            category: 'system_architecture',
            topic: 'Hybrid Search (BM25 + Dense) & Reciprocal Rank Fusion',
            difficulty: 'Senior',
            expectedKeywords: ['bm25', 'dense embeddings', 'reciprocal rank fusion', 'cross-encoder', 'semantic similarity', 'cosine distance'],
            evaluationGuide: 'Assess whether candidate explains why keyword search (BM25) complements dense vector retrieval for exact acronyms/IDs, and how RRF normalizes rank scores.',
            weight: 1.25
        },
        {
            id: 'rubric_vectordb_02',
            category: 'data_structures',
            topic: 'Vector Indexing: HNSW Graphs vs IVF & Product Quantization',
            difficulty: 'Senior',
            expectedKeywords: ['hnsw', 'ivf', 'product quantization', 'pq', 'recall vs latency', 'm parameter', 'efconstruction'],
            evaluationGuide: 'Check if candidate understands memory vs recall trade-offs. Can they explain how HNSW multi-layer graphs achieve logarithmic search speed compared to cluster-based IVF?',
            weight: 1.2
        },
        {
            id: 'rubric_agentic_03',
            category: 'problem_solving',
            topic: 'Agentic ReAct Loop & Multi-Agent State Machines',
            difficulty: 'Senior',
            expectedKeywords: ['react loop', 'thought action observation', 'supervisor agent', 'circuit breaker', 'self-correction', 'langgraph/state machine'],
            evaluationGuide: 'Look for understanding of preventing infinite agent loops, implementing reflection/evaluator steps, and passing structured state across tool calls.',
            weight: 1.3
        },
        {
            id: 'rubric_mcp_04',
            category: 'system_architecture',
            topic: 'Model Context Protocol (MCP) Architecture & Tool Execution',
            difficulty: 'Senior',
            expectedKeywords: ['mcp host', 'json-rpc', 'mcp server', 'permission boundaries', 'tool schemas', 'resource templates'],
            evaluationGuide: 'Candidate must explain how MCP standardizes tool discovery and execution via JSON-RPC, keeping tool runtime isolated from LLM prompt injection.',
            weight: 1.15
        },
        {
            id: 'rubric_prompt_05',
            category: 'communication',
            topic: 'Structured Outputs, System Instructions & Jailbreak Defense',
            difficulty: 'Mid',
            expectedKeywords: ['json schema', 'few-shot', 'chain of thought', 'guardrails', 'token limits', 'temperature'],
            evaluationGuide: 'Evaluates whether the candidate uses JSON schema enforcement over fragile regex parsing, and implements clear system prompt sandboxing.',
            weight: 1.0
        },
        {
            id: 'rubric_production_06',
            category: 'concurrency',
            topic: 'vLLM Serving, TTFT / TPOT & Semantic Caching',
            difficulty: 'Senior',
            expectedKeywords: ['vllm', 'pagedattention', 'time to first token', 'tpot', 'semantic caching', 'continuous batching', 'opentelemetry'],
            evaluationGuide: 'Checks mastery of high-throughput LLM serving: continuous batching, PagedAttention memory optimization, and caching similar prompts in Redis.',
            weight: 1.25
        },
        {
            id: 'rubric_backend_08',
            category: 'concurrency',
            topic: 'Distributed Locking, Race Conditions & Database Isolation',
            difficulty: 'Senior',
            expectedKeywords: ['redlock', 'fencing tokens', 'repeatable read', 'serializable', 'pgbouncer', 'deadlock recovery', 'debezium', 'kafka cdc'],
            evaluationGuide: 'Evaluates candidate understanding of distributed concurrency control, zero double-spending guarantees, fencing tokens in Redis Redlock, and PostgreSQL transaction isolation levels.',
            weight: 1.3
        },
        {
            id: 'rubric_industry_readiness_07',
            category: 'industry_readiness',
            topic: 'ABTalks Real-World Engineering Maturity & Systems Ownership',
            difficulty: 'Mid',
            expectedKeywords: ['business impact', 'cost per token', 'production monitoring', 'maintainability', 'failure modes'],
            evaluationGuide: 'Evaluates whether candidate balances cutting-edge AI architecture with business ROI, reliability SLAs, and clear technical communication.',
            weight: 1.3
        }
    ];
    static computeReciprocalRankFusion(bm25Rank, denseRank, k = 60) {
        return (1 / (k + bm25Rank)) + (1 / (k + denseRank));
    }
    static retrieveRelevantRubrics(context, maxResults = 3) {
        const normalized = context.toLowerCase();
        const scored = this.rubrics.map((rubric) => {
            let score = 0;
            for (const kw of rubric.expectedKeywords) {
                if (normalized.includes(kw.toLowerCase())) {
                    score += 2.5;
                }
            }
            if (normalized.includes(rubric.category.toLowerCase())) {
                score += 1.5;
            }
            if (normalized.includes(rubric.topic.toLowerCase())) {
                score += 3.0;
            }
            return { rubric, score: score * rubric.weight };
        });
        scored.sort((a, b) => b.score - a.score);
        const results = scored.filter(s => s.score > 0).map(s => s.rubric).slice(0, maxResults);
        return results.length > 0 ? results : this.rubrics.slice(0, maxResults);
    }
    static formatRubricsForPrompt(rubrics) {
        return rubrics.map((r, i) => `
[COHORT RUBRIC ${i + 1}: ${r.topic} (${r.difficulty} Level)]
Category: ${r.category}
Key Concepts Expected: ${r.expectedKeywords.join(', ')}
Evaluation Guide: ${r.evaluationGuide}
`).join('\n');
    }
    static getAllRubrics() {
        return this.rubrics;
    }
}
exports.RubricKnowledgeBase = RubricKnowledgeBase;
