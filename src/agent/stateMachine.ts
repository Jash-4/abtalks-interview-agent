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
   * Initializes a new candidate interview session
   */
  public async createSession(profile: CandidateProfile): Promise<InterviewSession> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Simulate MCP GitHub inspection right at session start
    const mcpData = await MockGithubMcpService.inspectRepository(
      profile.githubUsername || profile.name.toLowerCase().replace(/\s+/g, '-'),
      profile.role
    );

    const initialRubrics = RubricKnowledgeBase.retrieveRelevantRubrics(profile.role, 3);

    const session: InterviewSession = {
      sessionId,
      candidate: profile,
      currentPhase: 'GREETING',
      activePersona: 'FAANG_EM',
      history: [],
      mcpData,
      rubricsRetrieved: initialRubrics,
      scoresAccumulated: {
        technical: [85],
        architecture: [82],
        problemSolving: [88],
        communication: [85],
        codeCraft: [84],
        domain: [83]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Generate initial greeting message from FAANG EM
    const greeting = await this.agentEngine.generateResponse({
      persona: 'FAANG_EM',
      candidate: profile,
      userMessage: '',
      conversationHistory: [],
      rubrics: initialRubrics,
      mcpContext: mcpData,
      isGreeting: true
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
   * Processes a candidate reply, dynamically updates phases, retrieves RAG rubrics, and triggers appropriate persona
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

    // 2. RAG Semantic Retrieval: Find relevant rubrics based on user's answer
    const contextText = `${userText} ${codeSnippet || ''}`;
    const dynamicRubrics = RubricKnowledgeBase.retrieveRelevantRubrics(contextText, 2);
    dynamicRubrics.forEach(r => {
      if (!session.rubricsRetrieved.some(existing => existing.id === r.id)) {
        session.rubricsRetrieved.push(r);
      }
    });

    // 3. Dynamic Score Update based on keyword richness and depth
    const words = userText.toLowerCase();
    if (words.includes('lock') || words.includes('mutex') || words.includes('atomic') || words.includes('isolate')) {
      session.scoresAccumulated.technical.push(92);
    }
    if (words.includes('cache') || words.includes('redis') || words.includes('rate limit') || words.includes('sliding')) {
      session.scoresAccumulated.architecture.push(90);
    }
    if (words.includes('tradeoff') || words.includes('latency') || words.includes('scale') || words.includes('degrade')) {
      session.scoresAccumulated.problemSolving.push(94);
    }
    if (userText.length > 150) {
      session.scoresAccumulated.communication.push(88);
    }

    // 4. State Machine Phase Progression
    const candidateTurnCount = session.history.filter(m => m.sender === 'user').length;
    let isFinished = false;

    if (candidateTurnCount === 1) {
      session.currentPhase = 'TECHNICAL_CORE';
      session.activePersona = 'FAANG_EM';
    } else if (candidateTurnCount === 2) {
      session.currentPhase = 'SYSTEM_DESIGN_CODE';
      session.activePersona = 'FAANG_EM';
    } else if (candidateTurnCount === 3) {
      session.currentPhase = 'MCP_CODE_REVIEW';
      session.activePersona = 'FAANG_EM';
    } else if (candidateTurnCount >= 4) {
      session.currentPhase = 'CAREER_SYNTHESIS';
      session.activePersona = 'ABTALKS_MENTOR'; // Switch to ABTalks Anil Bajpai persona!
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
      isWrapUp: session.currentPhase === 'CAREER_SYNTHESIS'
    });

    const agentMsg: ChatMessage = {
      id: `msg_${Date.now()}_a`,
      sender: 'agent',
      persona: session.activePersona,
      text: response.reply,
      timestamp: new Date().toISOString(),
      phase: session.currentPhase,
      mcpContextUsed: session.currentPhase === 'MCP_CODE_REVIEW'
    };

    session.history.push(agentMsg);

    // 6. Generate final report if complete
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

  /**
   * Triggers explicit completion and returns the final JSON scorecard
   */
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
