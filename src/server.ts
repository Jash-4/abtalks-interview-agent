import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { InterviewStateMachine } from './agent/stateMachine';
import { RubricKnowledgeBase } from './rag/rubricStore';
import { MockGithubMcpService } from './mcp/githubMock';
import { CandidateProfile } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Disable Caching for Vercel Serverless
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Initialize State Machine
const stateMachine = new InterviewStateMachine();

// Health Check for Render deployment
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'ABTalks AI Interview Agent API (God Mode Dual-Persona)',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here')
  });
});

/**
 * 1. Start Interview Session
 * POST /api/interview/start
 */
app.post('/api/interview/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, role, experienceYears, targetCompanyLevel, githubUsername, techStack } = req.body;

    const profile: CandidateProfile = {
      name: name || 'Candidate',
      role: role || 'Full Stack / Backend Engineer',
      experienceYears: Number(experienceYears) || 3,
      targetCompanyLevel: targetCompanyLevel || 'L4/L5 Senior SWE',
      githubUsername: githubUsername || 'candidate-dev',
      techStack: Array.isArray(techStack) ? techStack : ['Node.js', 'TypeScript', 'Redis', 'PostgreSQL']
    };

    const session = await stateMachine.createSession(profile);

    res.status(201).json({
      success: true,
      message: 'Interview session created successfully.',
      sessionId: session.sessionId,
      activePersona: session.activePersona,
      currentPhase: session.currentPhase,
      greeting: session.history[0]?.text || '',
      mcpGithubContext: session.mcpData,
      rubricsLoaded: session.rubricsRetrieved.length
    });
  } catch (error: any) {
    console.error('Error starting interview:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to start interview.' });
  }
});

/**
 * 2. Send Candidate Message / Code
 * POST /api/interview/chat
 */
app.post('/api/interview/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, message, codeSnippet } = req.body;

    if (!sessionId || !message) {
      res.status(400).json({ success: false, error: 'sessionId and message are required.' });
      return;
    }

    const result = await stateMachine.processCandidateMessage(sessionId, message, codeSnippet);

    res.status(200).json({
      success: true,
      sessionId: result.session.sessionId,
      agentReply: result.agentMessage.text,
      activePersona: result.session.activePersona,
      currentPhase: result.session.currentPhase,
      isFinished: result.isFinished,
      finalReport: result.session.finalReport || null
    });
  } catch (error: any) {
    console.error('Error processing interview message:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process message.' });
  }
});

/**
 * 3. Finalize & Get Structured JSON Report
 * POST /api/interview/finish
 */
app.post('/api/interview/finish', (req: Request, res: Response): void => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ success: false, error: 'sessionId is required.' });
      return;
    }

    const report = stateMachine.finalizeInterview(sessionId);
    res.status(200).json({
      success: true,
      report
    });
  } catch (error: any) {
    console.error('Error finalizing interview:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to finalize report.' });
  }
});

/**
 * 4. Fetch Session Snapshot
 * GET /api/interview/:id
 */
app.get('/api/interview/:id', (req: Request, res: Response): void => {
  const session = stateMachine.getSession(req.params.id);
  if (!session) {
    res.status(404).json({ success: false, error: 'Session not found.' });
    return;
  }
  res.status(200).json({ success: true, session });
});

/**
 * 5. Mock MCP Endpoint (Direct query for judges/testing)
 * GET /api/mcp/github-inspect?username=...
 */
app.get('/api/mcp/github-inspect', async (req: Request, res: Response): Promise<void> => {
  try {
    const username = (req.query.username as string) || 'candidate-dev';
    const role = (req.query.role as string) || 'backend';
    const mcpData = await MockGithubMcpService.inspectRepository(username, role);
    res.status(200).json({
      success: true,
      protocol: 'Model Context Protocol (MCP v1.0.0-mock)',
      tool: 'mcp__inspect_github_repo',
      data: mcpData
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6. Query RAG Rubrics
 * GET /api/rubrics
 */
app.get('/api/rubrics', (req: Request, res: Response): void => {
  const query = (req.query.q as string) || '';
  const rubrics = query 
    ? RubricKnowledgeBase.retrieveRelevantRubrics(query, 5)
    : RubricKnowledgeBase.getAllRubrics();
  res.status(200).json({ success: true, count: rubrics.length, rubrics });
});

// Fallback to Index for SPA
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 ABTalks AI Interview Agent API running on port ${PORT}`);
    console.log(`🌐 Candidate Portal: http://localhost:${PORT}`);
    console.log(`📡 Health Endpoint: http://localhost:${PORT}/health`);
    console.log(`🤖 Dual Personas: FAANG Engineering Manager + ABTalks Career Mentor`);
    console.log(`=======================================================`);
  });
}

export default app;
export { app };
