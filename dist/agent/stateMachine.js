"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewStateMachine = void 0;
const dualPersonaEngine_1 = require("./dualPersonaEngine");
const githubMock_1 = require("../mcp/githubMock");
const rubricStore_1 = require("../rag/rubricStore");
const evaluator_1 = require("../scoring/evaluator");
class InterviewStateMachine {
    sessions = new Map();
    agentEngine;
    constructor() {
        this.agentEngine = new dualPersonaEngine_1.DualPersonaEngine();
    }
    async createSession(profile) {
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const mcpData = await githubMock_1.MockGithubMcpService.inspectRepository(profile.githubUsername || profile.name.toLowerCase().replace(/\s+/g, '-'), profile.role);
        const initialRubrics = rubricStore_1.RubricKnowledgeBase.retrieveRelevantRubrics('rag hybrid vector agent mcp', 4);
        const session = {
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
        const greetingMsg = {
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
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    async processCandidateMessage(sessionId, userText, codeSnippet) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Interview session '${sessionId}' not found.`);
        }
        const trimmed = userText.trim();
        const lower = trimmed.toLowerCase();
        // 1. Record User Message
        const userMsg = {
            id: `msg_${Date.now()}_u`,
            sender: 'user',
            text: userText,
            timestamp: new Date().toISOString(),
            phase: session.currentPhase,
            codeSnippet: codeSnippet
        };
        session.history.push(userMsg);
        // 2. Technical Depth & Vague Answer Detection
        const isBrief = trimmed.length < 15 || lower === 'hi' || lower === 'hello' || lower === 'ok' || lower === 'yes';
        if (isBrief) {
            // Brief/one-word greeting or answer: Assign 45-50 score (< 59: Not Ready Yet) and push back for technical depth
            session.scoresAccumulated.technical.push(45);
            session.scoresAccumulated.architecture.push(45);
            session.scoresAccumulated.problemSolving.push(48);
            session.scoresAccumulated.communication.push(55);
            session.scoresAccumulated.codeCraft.push(45);
            session.scoresAccumulated.domain.push(45);
            if (session.currentPhase === 'GREETING')
                session.currentPhase = 'TECHNICAL_CORE';
        }
        else if (trimmed.length < 30 || lower.includes('idk') || lower.includes('no idea')) {
            // Moderate penalty
            session.scoresAccumulated.technical.push(55);
            session.scoresAccumulated.architecture.push(55);
            session.scoresAccumulated.problemSolving.push(58);
            session.scoresAccumulated.communication.push(65);
            session.scoresAccumulated.codeCraft.push(55);
            session.scoresAccumulated.domain.push(55);
            // Do NOT advance module, push back strictly!
            const pushback = await this.agentEngine.generateResponse({
                persona: 'FAANG_EM',
                candidate: session.candidate,
                userMessage: userText,
                conversationHistory: session.history.map(h => ({ sender: h.sender, text: h.text })),
                rubrics: session.rubricsRetrieved,
                mcpContext: session.mcpData,
                isPushback: true,
                currentModule: session.currentPhase
            });
            const pushbackMsg = {
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
        const dynamicRubrics = rubricStore_1.RubricKnowledgeBase.retrieveRelevantRubrics(contextText, 2);
        dynamicRubrics.forEach(r => {
            if (!session.rubricsRetrieved.some(existing => existing.id === r.id)) {
                session.rubricsRetrieved.push(r);
            }
        });
        let kwMatchCount = 0;
        if (lower.includes('bm25') || lower.includes('dense') || lower.includes('rrf') || lower.includes('chunk') || lower.includes('embedding'))
            kwMatchCount += 1;
        if (lower.includes('hnsw') || lower.includes('ivf') || lower.includes('quantization') || lower.includes('pq') || lower.includes('index'))
            kwMatchCount += 1;
        if (lower.includes('react') || lower.includes('supervisor') || lower.includes('circuit') || lower.includes('mcp') || lower.includes('tool'))
            kwMatchCount += 1;
        if (lower.includes('vllm') || lower.includes('pagedattention') || lower.includes('ttft') || lower.includes('cache') || lower.includes('redis'))
            kwMatchCount += 1;
        if (lower.includes('latency') || lower.includes('tradeoff') || lower.includes('concurrency') || lower.includes('isolation') || lower.includes('p99'))
            kwMatchCount += 1;
        let turnTech = 55;
        let turnArch = 55;
        let turnSolve = 58;
        let turnComm = 60;
        let turnDomain = 55;
        if (kwMatchCount >= 3) {
            turnTech = 95;
            turnArch = 93;
            turnSolve = 96;
            turnComm = userText.length > 100 ? 92 : 82;
            turnDomain = 94;
        }
        else if (kwMatchCount >= 1) {
            turnTech = 78;
            turnArch = 76;
            turnSolve = 80;
            turnComm = userText.length > 80 ? 84 : 75;
            turnDomain = 78;
        }
        else {
            turnTech = 58;
            turnArch = 56;
            turnSolve = 60;
            turnComm = userText.length > 80 ? 70 : 55;
            turnDomain = 58;
        }
        session.scoresAccumulated.technical.push(turnTech);
        session.scoresAccumulated.architecture.push(turnArch);
        session.scoresAccumulated.problemSolving.push(turnSolve);
        session.scoresAccumulated.communication.push(turnComm);
        session.scoresAccumulated.codeCraft.push(codeSnippet ? 92 : 65);
        session.scoresAccumulated.domain.push(turnDomain);
        // 4. Cohort State Progression on Valid Technical Answer
        const validTurnCount = session.history.filter(m => m.sender === 'user' && m.text.trim().length >= 25).length;
        let isFinished = false;
        let currentModule = 'RAG_EMBEDDINGS';
        if (validTurnCount === 1) {
            session.currentPhase = 'TECHNICAL_CORE';
            currentModule = 'VECTOR_INDEXING';
            session.activePersona = 'FAANG_EM';
        }
        else if (validTurnCount === 2) {
            session.currentPhase = 'SYSTEM_DESIGN_CODE';
            currentModule = 'AGENTIC_AI';
            session.activePersona = 'FAANG_EM';
        }
        else if (validTurnCount === 3) {
            session.currentPhase = 'MCP_CODE_REVIEW';
            currentModule = 'MCP_PROTOCOL';
            session.activePersona = 'FAANG_EM';
        }
        else if (validTurnCount === 4) {
            session.currentPhase = 'SYSTEM_DESIGN_CODE';
            currentModule = 'PRODUCTION_SERVING';
            session.activePersona = 'FAANG_EM';
        }
        else if (validTurnCount >= 5) {
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
        const agentMsg = {
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
            session.finalReport = evaluator_1.InterviewEvaluator.generateStructuredReport(session);
            session.currentPhase = 'COMPLETED';
        }
        session.updatedAt = new Date().toISOString();
        return {
            session,
            agentMessage: agentMsg,
            isFinished: session.currentPhase === 'COMPLETED'
        };
    }
    finalizeInterview(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Interview session '${sessionId}' not found.`);
        }
        session.currentPhase = 'COMPLETED';
        session.finalReport = evaluator_1.InterviewEvaluator.generateStructuredReport(session);
        session.updatedAt = new Date().toISOString();
        return session.finalReport;
    }
}
exports.InterviewStateMachine = InterviewStateMachine;
