import { 
  InterviewSession, 
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

  public async createSession(profile: CandidateProfile): Promise<InterviewSession> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
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
        technical: [],
        architecture: [],
        problemSolving: [],
        communication: [],
        codeCraft: [],
        domain: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

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

  public async processCandidateMessage(sessionId: string, userText: string, codeSnippet?: string): Promise<{
    session: InterviewSession;
    agentMessage: ChatMessage;
    isFinished: boolean;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Interview session '${sessionId}' not found.`);
    }

    const trimmed = userText.trim();
    const lower = trimmed.toLowerCase();

    // 1. Record User Message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
      phase: session.currentPhase,
      codeSnippet: codeSnippet
    };
    session.history.push(userMsg);

    // 2. Strict Technical Depth & Vague Answer Detection
    const isVague = trimmed.length < 25 || lower === 'hi' || lower === 'hello' || lower === 'ok' || lower === 'yes';
    
    if (isVague) {
      // Punish vague answers in scores
      session.scoresAccumulated.technical.push(45);
      session.scoresAccumulated.architecture.push(40);
      session.scoresAccumulated.problemSolving.push(45);
      session.scoresAccumulated.communication.push(50);
      session.scoresAccumulated.domain.push(40);

      // Do NOT advance module, push back strictly!
      const pushback = await this.agentEngine.generateResponse({
        persona: 'FAANG_EM',
        candidate: session.candidate,
        userMessage: userText,
        conversationHistory: session.history.map(h => ({ sender: h.sender, text: h.text })),
        rubrics: session.rubricsRetrieved,
        mcpContext: session.mcpData,
        isPushback: true
      });

      const pushbackMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        sender: 'agent',
        persona: 'FAANG_EM',
        text: pushback.reply,
        timestamp: new Date().toISOString(),
        phase: session.currentPhase
      };
      session.history.push(pushbackMsg);
      session.updatedAt = new Date().toISOString();

      return {
        session,
        agentMessage: pushbackMsg,
        isFinished: false
      };
    }

    // 3. Genuine Technical Scoring for Substance
    const contextText = `${userText} ${codeSnippet || ''}`;
    const dynamicRubrics = RubricKnowledgeBase.retrieveRelevantRubrics(contextText, 2);
    dynamicRubrics.forEach(r => {
      if (!session.rubricsRetrieved.some(existing => existing.id === r.id)) {
        session.rubricsRetrieved.push(r);
      }
    });

    let turnTech = 80;
    let turnArch = 80;
    let turnSolve = 80;

    if (lower.includes('bm25') || lower.includes('dense') || lower.includes('rrf') || lower.includes('chunk')) {
      turnTech += 15;
    }
    if (lower.includes('hnsw') || lower.includes('ivf') || lower.includes('quantization') || lower.includes('pq')) {
      turnArch += 15;
    }
    if (lower.includes('react') || lower.includes('supervisor') || lower.includes('circuit') || lower.includes('mcp')) {
      turnSolve += 15;
    }
    if (lower.includes('vllm') || lower.includes('pagedattention') || lower.includes('ttft') || lower.includes('cache')) {
      turnTech += 12;
    }

    session.scoresAccumulated.technical.push(Math.min(100, turnTech));
    session.scoresAccumulated.architecture.push(Math.min(100, turnArch));
    session.scoresAccumulated.problemSolving.push(Math.min(100, turnSolve));
    session.scoresAccumulated.communication.push(userText.length > 100 ? 90 : 80);
    session.scoresAccumulated.domain.push(90);

    // 4. Cohort State Progression on Valid Technical Answer
    const validTurnCount = session.history.filter(m => m.sender === 'user' && m.text.trim().length >= 25).length;
    let isFinished = false;
    let currentModule = 'RAG_EMBEDDINGS';

    if (validTurnCount === 1) {
      session.currentPhase = 'TECHNICAL_CORE';
      currentModule = 'VECTOR_INDEXING';
      session.activePersona = 'FAANG_EM';
    } else if (validTurnCount === 2) {
      session.currentPhase = 'SYSTEM_DESIGN_CODE';
      currentModule = 'AGENTIC_AI';
      session.activePersona = 'FAANG_EM';
    } else if (validTurnCount === 3) {
      session.currentPhase = 'MCP_CODE_REVIEW';
      currentModule = 'MCP_PROTOCOL';
      session.activePersona = 'FAANG_EM';
    } else if (validTurnCount === 4) {
      session.currentPhase = 'SYSTEM_DESIGN_CODE';
      currentModule = 'PRODUCTION_SERVING';
      session.activePersona = 'FAANG_EM';
    } else if (validTurnCount >= 5) {
      session.currentPhase = 'CAREER_SYNTHESIS';
      session.activePersona = 'ABTALKS_MENTOR';
      isFinished = true;
    }

    // 5. Generate Agent Response
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
