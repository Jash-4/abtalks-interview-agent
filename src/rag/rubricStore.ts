import { RubricCriteria } from '../types';

/**
 * Rubric Knowledge Base & Retrieval-Augmented Generation (RAG) Store.
 * 
 * Provides vector-like semantic matching against FAANG grading benchmarks
 * and ABTalks readiness standards to ground the agent's grading.
 */
export class RubricKnowledgeBase {
  private static rubrics: RubricCriteria[] = [
    {
      id: 'rubric_concurrency_01',
      category: 'concurrency',
      topic: 'Race Conditions & Distributed Locks',
      difficulty: 'Senior',
      expectedKeywords: ['mutex', 'distributed lock', 'redis redlock', 'optimistic locking', 'isolation level', 'deadlock prevention'],
      evaluationGuide: 'Check if candidate understands atomicity, avoids naive check-then-act, mentions database transaction isolation (e.g. SERIALIZABLE or Repeatable Read), and selects appropriate distributed coordination.',
      weight: 1.2
    },
    {
      id: 'rubric_system_arch_02',
      category: 'system_architecture',
      topic: 'API Rate Limiting & High Throughput Ingestion',
      difficulty: 'Senior',
      expectedKeywords: ['token bucket', 'leaky bucket', 'sliding window counter', 'redis cluster', 'backpressure', 'circuit breaker'],
      evaluationGuide: 'Look for understanding of token bucket vs sliding window algorithms, Redis atomic scripts (Lua), and how to return HTTP 429 Retry-After headers gracefully without overwhelming downstream services.',
      weight: 1.15
    },
    {
      id: 'rubric_data_structures_03',
      category: 'data_structures',
      topic: 'Caching Strategies & Cache Invalidation',
      difficulty: 'Mid',
      expectedKeywords: ['lru', 'write-through', 'cache-aside', 'ttl', 'thundering herd', 'bloom filter', 'eviction policy'],
      evaluationGuide: 'Candidate must explain difference between Cache-Aside and Write-Through, address cache stampede / thundering herd (e.g., probabilistic early expiration or mutex locks), and space complexity.',
      weight: 1.0
    },
    {
      id: 'rubric_problem_solving_04',
      category: 'problem_solving',
      topic: 'Edge Case Probing & Tradeoff Analysis',
      difficulty: 'Senior',
      expectedKeywords: ['graceful degradation', 'fallbacks', 'latency vs consistency', 'cap theorem', 'memory leaks', 'monitoring/telemetry'],
      evaluationGuide: 'Does candidate volunteer tradeoffs before being asked? Do they identify single points of failure (SPOF) and discuss observability (p99 latency, Prometheus metrics)?',
      weight: 1.1
    },
    {
      id: 'rubric_industry_readiness_05',
      category: 'industry_readiness',
      topic: 'ABTalks Real-World Engineering Maturity & Communication',
      difficulty: 'Mid',
      expectedKeywords: ['business impact', 'clarity', 'cross-functional collaboration', 'pragmatic solutions', 'maintainability', 'ownership'],
      evaluationGuide: 'Evaluates whether the candidate communicates with high signal-to-noise ratio, justifies tech choices using business value rather than resume buzzwords, and exhibits mentorable, growth-oriented mindset.',
      weight: 1.25
    },
    {
      id: 'rubric_code_quality_06',
      category: 'problem_solving',
      topic: 'Clean Architecture, Dependency Injection & Modularity',
      difficulty: 'Mid',
      expectedKeywords: ['solid principles', 'unit testing', 'dependency inversion', 'interface separation', 'separation of concerns'],
      evaluationGuide: 'Candidate demonstrates modular structure, avoids monolithic controller logic, uses type safety effectively, and implements robust error boundary patterns.',
      weight: 1.0
    }
  ];

  /**
   * RAG Semantic Retrieval: Finds the most relevant rubrics based on candidate query/response context.
   */
  public static retrieveRelevantRubrics(context: string, maxResults: number = 3): RubricCriteria[] {
    const normalized = context.toLowerCase();
    
    // Compute semantic relevance score based on keyword matches and term frequencies
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

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Pick top rubrics or fallback to diverse default rubrics
    const results = scored.filter(s => s.score > 0).map(s => s.rubric).slice(0, maxResults);
    if (results.length === 0) {
      return this.rubrics.slice(0, maxResults);
    }
    return results;
  }

  /**
   * Formats rubrics into an LLM instruction string for RAG grounding
   */
  public static formatRubricsForPrompt(rubrics: RubricCriteria[]): string {
    return rubrics.map((r, i) => `
[RUBRIC CRITERION ${i + 1}: ${r.topic} (${r.difficulty} Level)]
Category: ${r.category}
Key Concepts Expected: ${r.expectedKeywords.join(', ')}
Evaluation Guide: ${r.evaluationGuide}
`).join('\n');
  }

  public static getAllRubrics(): RubricCriteria[] {
    return this.rubrics;
  }
}
