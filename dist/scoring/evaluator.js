"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewEvaluator = void 0;
class InterviewEvaluator {
    static generateStructuredReport(session) {
        const candidateName = session.candidate.name || 'Candidate';
        const role = session.candidate.role || 'Enterprise AI Engineer';
        const userMessages = session.history.filter(m => m.sender === 'user');
        const isUnansweredEarlyFinish = userMessages.length === 0;
        const defaultBaseline = isUnansweredEarlyFinish ? 72 : 70;
        // Calculate aggregated scores with safety bounds
        const avg = (nums, fallback) => nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : fallback;
        const technical = avg(session.scoresAccumulated.technical, defaultBaseline);
        const architecture = avg(session.scoresAccumulated.architecture, defaultBaseline);
        const problemSolving = avg(session.scoresAccumulated.problemSolving, defaultBaseline);
        const communication = avg(session.scoresAccumulated.communication, isUnansweredEarlyFinish ? 75 : 60);
        const codeCraft = avg(session.scoresAccumulated.codeCraft, defaultBaseline);
        const domainExpertise = avg(session.scoresAccumulated.domain, defaultBaseline);
        const breakdown = {
            technicalProficiency: technical,
            systemArchitecture: architecture,
            problemSolving: problemSolving,
            communicationClarity: communication,
            codeCraftsmanship: codeCraft,
            domainExpertise: domainExpertise
        };
        // ABTalks Industry Readiness Index Formula
        const industryReadinessScore = Math.round(technical * 0.30 +
            architecture * 0.25 +
            problemSolving * 0.25 +
            communication * 0.20);
        // Dynamic verdict based on actual candidate performance
        let overallVerdict = 'Needs Mentorship & Refinement';
        if (isUnansweredEarlyFinish) {
            overallVerdict = 'Needs Mentorship & Refinement';
        }
        else if (industryReadinessScore >= 88) {
            overallVerdict = 'Immediate Strong Hire';
        }
        else if (industryReadinessScore >= 75) {
            overallVerdict = 'Hire (L4/Mid-Level)';
        }
        else if (industryReadinessScore >= 60) {
            overallVerdict = 'Needs Mentorship & Refinement';
        }
        else {
            overallVerdict = 'Not Ready Yet';
        }
        const isHighPerformer = industryReadinessScore >= 75;
        const strengths = isHighPerformer ? [
            'Strong understanding of Hybrid Search (BM25 + Dense) and Reciprocal Rank Fusion.',
            'Clear grasp of Vector Indexing trade-offs: HNSW memory footprint vs IVF-PQ quantization.',
            'Articulated autonomous multi-agent state machines with circuit breakers and reflection.',
            'Understands high-throughput vLLM serving, PagedAttention, and semantic caching.'
        ] : [
            'Familiarity with high-level AI terminology and modern AI stack components.',
            'Willingness to engage with technical interviewer prompts.'
        ];
        if (session.mcpData && session.mcpData.highlights.length > 0) {
            strengths.push(`GitHub Code Quality: ${session.mcpData.highlights[0]}`);
        }
        const areasForImprovement = isHighPerformer ? [
            'Deepen understanding of PagedAttention block table fragmentation under extreme burst concurrency.',
            'Proactively calculate QPS vs RAM footprints before choosing vector quantization compression ratios.',
            'Enforce OpenTelemetry tracing spans across autonomous agent sub-worker execution nodes.'
        ] : [
            'Requires substantial technical depth: avoid one-word answers and provide concrete algorithms/trade-offs.',
            'Review Module 2 (RAG Hybrid Search & RRF score normalization formulas).',
            'Study Module 3 Vector Indexing (HNSW graphs vs IVF Product Quantization).'
        ];
        if (session.mcpData && session.mcpData.vulnerabilitiesOrSmells.length > 0) {
            areasForImprovement.push(`Codebase Observation: Address ${session.mcpData.vulnerabilitiesOrSmells[0]}`);
        }
        const faangEmObservations = isHighPerformer ? [
            'Demonstrated rigorous systems intuition and handled memory trade-offs effectively.',
            'Responded with concrete architectures when challenged on distributed edge cases.'
        ] : [
            'Struggled to provide concrete implementation details when pushed by the interviewer.',
            'Relied on high-level statements rather than algorithmic or mathematical rigor.'
        ];
        const careerMentorshipRoadmap = [
            'Master Chapter 3 of the AI Cohort: Practice indexing 10M+ vectors with IVF-PQ in Qdrant/Milvus.',
            'Build an end-to-end multi-agent supervisor with LangGraph and test circuit breaker state recovery.',
            'Deploy vLLM with PagedAttention and benchmark TTFT latency improvements against vanilla HuggingFace.',
            'Frame technical solutions through business ROI and MTTR impact as advocated in ABTalks sessions.'
        ];
        const questionByQuestionAnalysis = userMessages.map((msg, index) => {
            const isBrief = msg.text.trim().length < 25;
            return {
                question: `Interview Turn ${index + 1}: ${msg.phase}`,
                candidateResponseSummary: msg.text.length > 100 ? msg.text.substring(0, 97) + '...' : msg.text,
                score: isBrief ? 45 : Math.min(100, Math.max(65, industryReadinessScore + (index % 2 === 0 ? 3 : -2))),
                feedback: isBrief
                    ? 'Response was too brief and lacked technical substance.'
                    : 'Good technical articulation with concrete terminology and architecture.'
            };
        });
        const report = {
            sessionId: session.sessionId,
            candidate: candidateName,
            role: role,
            timestamp: new Date().toISOString(),
            industryReadinessScore,
            overallVerdict,
            breakdown,
            strengths,
            areasForImprovement,
            faangEmObservations,
            careerMentorshipRoadmap,
            mcpGithubInsights: session.mcpData,
            questionByQuestionAnalysis
        };
        return report;
    }
}
exports.InterviewEvaluator = InterviewEvaluator;
