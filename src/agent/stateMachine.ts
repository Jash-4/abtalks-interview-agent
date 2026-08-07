import { 
  InterviewSession, 
  InterviewPhase, 
  PersonaType, 
  CandidateProfile, 
  ChatMessage, 
  StructuredInterviewReport 
} from '../types';
import { DualPersonaEngine } from './dualPersonaEngine';
import { MockGithubMcpService } from '../mcp/githubMock';
import { RubricKnowledgeBase } from '../rag/rubricStore';
import { InterviewEvaluator } from '../scoring/evaluator';

export class InterviewStateMachine {
  private sessions: Map<string, InterviewSession> = new Map();
  private agentEngine: DualPersonaEngine;

  constructor() {
    this.agentEngine = new DualPersonaEngine();
  }

  /**
   * Initializes a new candidate interview session grounded on the 31-Day AI Cohort
   */
  public async createSession(profile: CandidateProfile): Promise<InterviewSession> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Simulate MCP tool invocation on candidate GitHub
    const mcpData = await MockGithubMcpService.inspectRepository(
      profile.githubUsername || profile.name.toLowerCase().replace(/\s+/g, '-'),
      profile.role
    );

    const initialRubrics = RubricKnowledgeBase.retrieveRelevantRubrics('rag hybrid vector agent mcp', 4);

    const session: InterviewSession = {
      sessionId,
      candidate: profile,
      currentPhase: 'GREETING',
      activePersona: 'FAANG_EM',
      history: [],
      mcpData,
      rubricsRetrieved: initialRubrics,
      scoresAccumulated: {
        technical: [86],
        architecture: [85],
        problemSolving: [89],
        communication: [86],
        codeCraft: [85],
        domain: [88]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Initial greeting from FAANG EM introducing Module 2 (RAG & Hybrid Search)
    const greeting = await this.agentEngine.generateResponse({
      persona: 'FAANG_EM',
      candidate: profile,
      userMessage: '',
      conversationHistory: [],
      rubrics: initialRubrics,
      mcpContext: mcpData,
      isGreeting: true,
      currentModule: 'RAG_EMBEDDINGS'
    });

    const greetingMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      persona: 'FAANG_EM',
      text: greeting.reply,
      timestamp: new Date().toISOString(),
      phase: 'GREETING',
      mcpContextUsed: true
    };

    session.history.push(greetingMsg);
    this.sessions.set(sessionId, session);
    return session;
  }

  public getSession(sessionId: string): InterviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Processes a candidate message, progresses through Cohort Modules (RAG, Vector DBs, Agents, MCP, vLLM),
   * and dynamically updates the RAG rubrics and score metrics.
   */
  public async processCandidateMessage(sessionId: string, userText: string, codeSnippet?: string): Promise<{
    session: InterviewSession;
    agentMessage: ChatMessage;
    isFinished: boolean;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Interview session '${sessionId}' not found.`);
    }

    // 1. Record Candidate Turn
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
      phase: session.currentPhase,
      codeSnippet: codeSnippet
    };
    session.history.push(userMsg);

    // 2. RAG Semantic Retrieval based on response context
    const contextText = `${userText} ${codeSnippet || ''}`;
    const dynamicRubrics = RubricKnowledgeBase.retrieveRelevantRubrics(contextText, 2);
    dynamicRubrics.forEach(r => {
      if (!session.rubricsRetrieved.some(existing => existing.id === r.id)) {
        session.rubricsRetrieved.push(r);
      }
    });

    // 3. Dynamic Score Evaluation
    const words = userText.toLowerCase();
    if (words.includes('bm25') || words.includes('dense') || words.includes('rrf') || words.includes('chunk')) {
      session.scoresAccumulated.technical.push(92);
    }
    if (words.includes('hnsw') || words.includes('ivf') || words.includes('quantization') || words.includes('pq')) {
      session.scoresAccumulated.architecture.push(90);
    }
    if (words.includes('react') || words.includes('supervisor') || words.includes('circuit') || words.includes('mcp')) {
      session.scoresAccumulated.problemSolving.push(94);
    }
    if (words.includes('vllm') || words.includes('pagedattention') || words.includes('ttft') || words.includes('cache')) {
      session.scoresAccumulated.technical.push(93);
    }
    if (userText.length > 120) {
      session.scoresAccumulated.communication.push(88);
    }

    // 4. Cohort Curriculum Multi-Turn State Machine Progression
    const candidateTurnCount = session.history.filter(m => m.sender === 'user').length;
    let isFinished = false;
    let currentModule = 'RAG_EMBEDDINGS';

    if (candidateTurnCount === 1) {
      session.currentPhase = 'TECHNICAL_CORE'; // Days 13-17: Vector Databases & HNSW
      currentModule = 'VECTOR_INDEXING';
      session.activePersona = 'FAANG_EM';
    } else if (candidateTurnCount === 2) {
      session.currentPhase = 'SYSTEM_DESIGN_CODE'; // Days 18-23: Agentic ReAct & Tool Orchestration
      currentModule = 'AGENTIC_AI';
      session.activePersona = 'FAANG_EM';
    } else if (candidateTurnCount === 3) {
      session.currentPhase = 'MCP_CODE_REVIEW'; // Days 24-27: Model Context Protocol (MCP)
      currentModule = 'MCP_PROTOCOL';
      session.activePersona = 'FAANG_EM';
    } else if (candidateTurnCount === 4) {
      session.currentPhase = 'SYSTEM_DESIGN_CODE'; // Days 28-31: vLLM & Production Serving
      currentModule = 'PRODUCTION_SERVING';
      session.activePersona = 'FAANG_EM';
    } else if (candidateTurnCount >= 5) {
      session.currentPhase = 'CAREER_SYNTHESIS';
      session.activePersona = 'ABTALKS_MENTOR'; // Switch to Anil Bajpai Career Mentor!
      isFinished = true;
    }

    // 5. Generate Persona Response
    const response = await this.agentEngine.generateResponse({
      persona: session.activePersona,
      candidate: session.candidate,
      userMessage: userText,
      conversationHistory: session.history.map(h => ({ sender: h.sender, text: h.text })),
      rubrics: session.rubricsRetrieved,
      mcpContext: session.mcpData,
      isCodeChallenge: session.currentPhase === 'SYSTEM_DESIGN_CODE',
      isWrapUp: session.currentPhase === 'CAREER_SYNTHESIS',
      currentModule: currentModule
    });

    const agentMsg: ChatMessage = {
      id: `msg_${Date.now()}_a`,
      sender: 'agent',
      persona: session.activePersona,
      text: response.reply,
      timestamp: new Date().toISOString(),
      phase: session.currentPhase,
      mcpContextUsed: currentModule === 'MCP_PROTOCOL'
    };

    session.history.push(agentMsg);

    // 6. Generate final report if wrap-up reached
    if (isFinished || session.currentPhase === 'CAREER_SYNTHESIS') {
      session.finalReport = InterviewEvaluator.generateStructuredReport(session);
      session.currentPhase = 'COMPLETED';
    }

    session.updatedAt = new Date().toISOString();
    return {
      session,
      agentMessage: agentMsg,
      isFinished: session.currentPhase === 'COMPLETED'
    };
  }

  public finalizeInterview(sessionId: string): StructuredInterviewReport {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Interview session '${sessionId}' not found.`);
    }

    session.currentPhase = 'COMPLETED';
    session.finalReport = InterviewEvaluator.generateStructuredReport(session);
    session.updatedAt = new Date().toISOString();
    return session.finalReport;
  }
}
