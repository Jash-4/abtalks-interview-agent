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
   * System Prompt for FAANG Engineering Manager Persona
   */
  private getFaangEmPrompt(candidate: CandidateProfile, rubrics: RubricCriteria[], mcpContext?: GithubRepoMockData): string {
    return `
You are Alex Vance, a Principal Engineering Manager at a top FAANG company (Google/Meta/Netflix).
Your interview style:
- High technical bar, uncompromising rigor, but respectful and objective.
- You do not accept generic or superficial buzzwords. You demand concrete algorithms, time/space complexity, and concurrency safeguards.
- You interrogate edge cases: distributed locks, race conditions, cache stampedes, API rate limiting, and database indexing.
- You evaluate the candidate against the standard FAANG L4/L5/L6 competency bar.

Candidate Details:
- Name: ${candidate.name}
- Target Role: ${candidate.role}
- Experience: ${candidate.experienceYears} years

${mcpContext ? MockGithubMcpService.formatMcpContextForAgent(mcpContext) : ''}

${RubricKnowledgeBase.formatRubricsForPrompt(rubrics)}

Instructions:
1. Actively challenge the candidate on technical trade-offs.
2. If code or architecture is submitted, pinpoint any flaw, scale bottleneck, or concurrency risk.
3. Keep answers concise, crisp, and focused directly on pushing the candidate to demonstrate their depth.
`;
  }

  /**
   * System Prompt for ABTalks Career Mentor Persona (Matching Anil Bajpai's brand)
   */
  private getAbTalksMentorPrompt(candidate: CandidateProfile): string {
    return `
You are Anil Bajpai (ABTalks Host & Tech Leadership Mentor).
Your interview style:
- Empathetic, inspiring, highly constructive, and laser-focused on "Industry Readiness".
- You bridge the gap between academic theory and real-world high-impact engineering.
- You assess communication clarity, ownership mindset, and leadership trajectory.
- You celebrate genuine strengths while providing a concrete, actionable roadmap for career acceleration.

Candidate Details:
- Name: ${candidate.name}
- Role: ${candidate.role}

Instructions:
1. Transition smoothly into mentor mode.
2. Provide constructive feedback on how they performed, highlighting what impressed you.
3. Provide high-impact advice on what separates good engineers from top 1% industry leaders.
4. Encourage them and outline their next steps for career growth.
`;
  }

  /**
   * Generates next agent response based on active persona, candidate message, and context.
   */
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
  }): Promise<{ reply: string; persona: PersonaType; usedGemini: boolean }> {
    const { persona, candidate, userMessage, conversationHistory, rubrics, mcpContext, isGreeting, isCodeChallenge, isWrapUp } = params;

    // Try Gemini API if configured
    if (this.genAI) {
      try {
        const systemInstruction = persona === 'FAANG_EM' 
          ? this.getFaangEmPrompt(candidate, rubrics, mcpContext)
          : this.getAbTalksMentorPrompt(candidate);

        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: systemInstruction
        });

        // Format history
        const promptText = `
Candidate Name: ${candidate.name}
Current Persona: ${persona}
Phase: ${isGreeting ? 'GREETING' : isCodeChallenge ? 'SYSTEM_DESIGN_CODE' : isWrapUp ? 'FINAL_SYNTHESIS' : 'TECHNICAL_EVALUATION'}

Candidate's Latest Message:
"${userMessage}"

Provide your direct, in-character response now.
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
        console.warn('[DualPersonaEngine] Gemini API call had an issue, smoothly falling back to intelligent procedural agent:', error?.message || error);
      }
    }

    // Intelligent Procedural Agent Fallback (guarantees 100% reliability for offline/local demos)
    const fallbackReply = this.generateIntelligentFallback({
      persona,
      candidate,
      userMessage,
      rubrics,
      mcpContext,
      isGreeting,
      isCodeChallenge,
      isWrapUp
    });

    return {
      reply: fallbackReply,
      persona: persona,
      usedGemini: false
    };
  }

  /**
   * Procedural Fallback Engine with deep technical nuances matching the hackathon demo requirements.
   */
  private generateIntelligentFallback(params: {
    persona: PersonaType;
    candidate: CandidateProfile;
    userMessage: string;
    rubrics: RubricCriteria[];
    mcpContext?: GithubRepoMockData;
    isGreeting?: boolean;
    isCodeChallenge?: boolean;
    isWrapUp?: boolean;
  }): string {
    const { persona, candidate, userMessage, rubrics, mcpContext, isGreeting, isCodeChallenge, isWrapUp } = params;
    const name = candidate.name || 'Candidate';

    if (isGreeting) {
      return `Welcome, ${name}. I'm Alex Vance, Principal Engineering Manager here. I've reviewed your background in ${candidate.role || 'Software Engineering'}. We have a high technical bar, so today we will test your system architecture intuition, concurrency management, and real-world problem-solving.\n\nLet's start directly with a core scenario: In a high-throughput payment or order processing system experiencing 50,000 requests/sec, how do you prevent race conditions and duplicate debits across multiple microservice instances? Walk me through your design, locking mechanism, and database isolation levels.`;
    }

    if (persona === 'FAANG_EM') {
      if (isCodeChallenge || userMessage.toLowerCase().includes('lock') || userMessage.toLowerCase().includes('redis')) {
        const repoSnippet = mcpContext ? `\n\n[MCP Code Inspection]: I pulled up your repository (${mcpContext.repoName}). I noticed you're using ${mcpContext.primaryLanguage}. Let's make sure you avoid the common pitfalls like '${mcpContext.vulnerabilitiesOrSmells[0]}'.` : '';
        return `Interesting approach. You mentioned distributed locking and atomicity.${repoSnippet}\n\nLet's probe deeper into the failure modes: If the instance holding the Redis distributed lock crashes right after modifying the primary database but before releasing the lock or emitting the confirmation event, how do you prevent a deadlock or data divergence? What exact TTL and fence-token strategy would you enforce?`;
      }

      if (userMessage.toLowerCase().includes('cache') || userMessage.toLowerCase().includes('rate')) {
        return `Good breakdown on caching and rate limiting. However, in an extreme burst traffic event (e.g. flash sale or DDoS spike), how do you prevent the **Thundering Herd / Cache Stampede** problem when an ultra-hot cache key expires simultaneously across all worker nodes? Would you use probabilistic early expiration (XFetch algorithm) or a mutex lock? Walk me through the mathematical or algorithmic trade-off.`;
      }

      return `That's a solid conceptual overview, ${name}. Now let's address the operational telemetry and latency SLAs: When your p99 latency spikes by 400ms under heavy load, what specific bottlenecks in the database connection pool or garbage collection would you inspect first, and how would you implement a circuit breaker to protect downstream services?`;
    }

    // Persona B: ABTalks Career Mentor (Anil Bajpai persona)
    if (isWrapUp || persona === 'ABTALKS_MENTOR') {
      return `Hello ${name}! I'm switching personas now—Anil Bajpai here from ABTalks. First of all, congratulations on tackling that intensive FAANG technical grill session!\n\nWhat really stood out to me was your structured thinking and how clearly you communicated under pressure. You showed genuine technical depth in distributed synchronization, and your willingness to analyze trade-offs is exactly what top-tier engineering teams look for.\n\nI've generated your complete **ABTalks Industry Readiness Scorecard** below. Take a look at your strengths, the targeted growth areas, and the actionable mentorship roadmap we've prepared for you!`;
    }

    return `Great reflection, ${name}. Remember, in the industry, technical competence gets you through the door, but engineering empathy, system ownership, and clear communication are what accelerate you to Staff and Tech Lead levels. Let's look at your finalized evaluation report!`;
  }
}
