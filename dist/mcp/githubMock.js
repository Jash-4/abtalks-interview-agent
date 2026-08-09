"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockGithubMcpService = void 0;
/**
 * Mock Model Context Protocol (MCP) Server for Candidate GitHub Code Review.
 *
 * Simulates tool invocation where the LLM queries the candidate's live code,
 * inspects ASTs, commits, and tests to ground interview questions on their real project.
 *
 * @author Moguluri Sri Ranga Sesha Siva Jaswanth <sivajaswanthmsr@gmail.com>
 */
class MockGithubMcpService {
    static repositoryBank = {
        default: {
            repoName: 'candidate-portfolio-service',
            primaryLanguage: 'TypeScript / Node.js',
            codeQualityRating: 'A',
            architectureType: 'Clean Architecture with Layered Controllers & Services',
            highlights: [
                'Used connection pooling for PostgreSQL',
                'Implemented JWT with rotating refresh tokens',
                'Good unit test coverage (~84%) using Vitest'
            ],
            vulnerabilitiesOrSmells: [
                'Missing rate limiting middleware on public auth endpoints',
                'N+1 query potential in user relations fetch without DataLoader',
                'Error handler leaks raw stack traces in development mode'
            ],
            recentCommitSummary: 'feat: add redis caching layer for high-throughput product catalog'
        },
        frontend: {
            repoName: 'nextjs-fintech-dashboard',
            primaryLanguage: 'React / Next.js / TypeScript',
            codeQualityRating: 'B',
            architectureType: 'Next.js App Router with Server & Client Component separation',
            highlights: [
                'Optimized bundle size with dynamic imports',
                'Strict TypeScript type guards and Zod schema validation',
                'Accessible color contrast and WCAG 2.1 AA keyboard navigation'
            ],
            vulnerabilitiesOrSmells: [
                'Frequent re-renders in chart components due to non-memoized state handlers',
                'No error boundaries around 3rd-party iframe integrations'
            ],
            recentCommitSummary: 'perf: memoize expensive financial calculation worker threads'
        },
        ai_ml: {
            repoName: 'rag-document-intelligence-agent',
            primaryLanguage: 'Python / LangChain / FastAPI',
            codeQualityRating: 'A',
            architectureType: 'Asynchronous Vector Pipeline with Qdrant and Hybrid Search',
            highlights: [
                'Implemented semantic chunking with sliding window overlapping',
                'Added reciprocal rank fusion (RRF) for BM25 + dense embedding re-ranking',
                'Asynchronous background worker queue via Celery and Redis'
            ],
            vulnerabilitiesOrSmells: [
                'No fallback circuit breaker when primary LLM endpoint hits rate limits',
                'Missing token usage telemetry and cost attribution logs'
            ],
            recentCommitSummary: 'refactor: replace naive text splitters with semantic boundary segmenters'
        }
    };
    /**
     * Tool invocation simulated as an MCP Tool Call: `mcp__inspect_github_repo`
     */
    static async inspectRepository(username = 'candidate', roleHint) {
        // Artificial slight delay to simulate real MCP protocol RPC round-trip
        await new Promise((resolve) => setTimeout(resolve, 350));
        const normalizedRole = (roleHint || '').toLowerCase();
        if (normalizedRole.includes('front') || normalizedRole.includes('react') || normalizedRole.includes('ui')) {
            return {
                ...this.repositoryBank.frontend,
                repoName: `${username}-frontend-engine`
            };
        }
        else if (normalizedRole.includes('ai') || normalizedRole.includes('ml') || normalizedRole.includes('rag')) {
            return {
                ...this.repositoryBank.ai_ml,
                repoName: `${username}-intelligence-core`
            };
        }
        return {
            ...this.repositoryBank.default,
            repoName: `${username}-production-backend`
        };
    }
    /**
     * Generates a context block formatted for LLM system context
     */
    static formatMcpContextForAgent(data) {
        return `
[MCP TOOL CONTEXT: GITHUB CODE INSPECTOR PROTOCOL]
Target Repository: ${data.repoName}
Language/Stack: ${data.primaryLanguage}
Code Quality Grade: ${data.codeQualityRating}
Architectural Pattern: ${data.architectureType}
Recent Commit: "${data.recentCommitSummary}"
Strengths Observed in Codebase:
${data.highlights.map(h => ` - ${h}`).join('\n')}
Identified Code Smells / Discussion Topics:
${data.vulnerabilitiesOrSmells.map(v => ` - ${v}`).join('\n')}
`;
    }
}
exports.MockGithubMcpService = MockGithubMcpService;
