"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const stateMachine_1 = require("./agent/stateMachine");
const rubricStore_1 = require("./rag/rubricStore");
const githubMock_1 = require("./mcp/githubMock");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 3000;
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Disable Caching for Vercel Serverless
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});
const publicDir = path_1.default.resolve(process.cwd(), 'public');
app.use(express_1.default.static(publicDir));
// Initialize State Machine
const stateMachine = new stateMachine_1.InterviewStateMachine();
// Health Check for Render deployment
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'ABTalks AI Interview Agent API (God Mode Dual-Persona)',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here')
    });
});
const apiRouter = express_1.default.Router();
/**
 * 1. Initialize Interview Session
 * POST /api/interview/session
 */
apiRouter.post(['/interview/start', '/interview/session'], async (req, res) => {
    try {
        const { name, role, experienceYears, targetCompanyLevel, githubUsername, techStack } = req.body;
        const profile = {
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
    }
    catch (error) {
        console.error('Error starting interview:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to start interview.' });
    }
});
/**
 * 2. Send Candidate Message / Code
 * POST /api/interview/chat
 */
apiRouter.post('/interview/chat', async (req, res) => {
    try {
        const { sessionId, message, userText, codeSnippet } = req.body;
        const textToProcess = message || userText;
        if (!sessionId || !textToProcess) {
            res.status(400).json({ success: false, error: 'sessionId and message (or userText) are required.' });
            return;
        }
        const result = await stateMachine.processCandidateMessage(sessionId, textToProcess, codeSnippet);
        res.status(200).json({
            success: true,
            sessionId: result.session.sessionId,
            agentReply: result.agentMessage.text,
            activePersona: result.session.activePersona,
            currentPhase: result.session.currentPhase,
            isFinished: result.isFinished,
            finalReport: result.session.finalReport || null
        });
    }
    catch (error) {
        console.error('Error processing interview message:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to process message.' });
    }
});
/**
 * 3. Finalize & Get Structured JSON Report
 * POST /api/interview/finish
 */
apiRouter.post('/interview/finish', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(400).json({ success: false, error: 'sessionId is required.' });
            return;
        }
        const report = await stateMachine.finalizeInterview(sessionId);
        res.status(200).json({
            success: true,
            report
        });
    }
    catch (error) {
        console.error('Error finalizing interview:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to finalize report.' });
    }
});
/**
 * 4. Fetch Session Snapshot
 * GET /api/interview/:id
 */
apiRouter.get('/interview/:id', (req, res) => {
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
apiRouter.get('/mcp/github-inspect', async (req, res) => {
    try {
        const username = req.query.username || 'candidate-dev';
        const role = req.query.role || 'backend';
        const mcpData = await githubMock_1.MockGithubMcpService.inspectRepository(username, role);
        res.status(200).json({
            success: true,
            protocol: 'Model Context Protocol (MCP v1.0.0-mock)',
            tool: 'mcp__inspect_github_repo',
            data: mcpData
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * 6. Query RAG Rubrics
 * GET /api/rubrics
 */
apiRouter.get('/rubrics', (req, res) => {
    const query = req.query.q || '';
    const rubrics = query
        ? rubricStore_1.RubricKnowledgeBase.retrieveRelevantRubrics(query, 5)
        : rubricStore_1.RubricKnowledgeBase.getAllRubrics();
    res.status(200).json({ success: true, count: rubrics.length, rubrics });
});
// Mount router on both /api and root / for Vercel Serverless Function compatibility
app.use('/api', apiRouter);
app.use('/', apiRouter);
// Fallback to Index for SPA
app.get('*', (req, res) => {
    res.sendFile(path_1.default.resolve(process.cwd(), 'public/index.html'));
});
// Start Server
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(`🚀 ABTalks AI Interview Agent API running on port ${PORT}`);
        console.log(`🌐 Candidate Portal: http://localhost:${PORT}`);
        console.log(`📡 Health Endpoint: http://localhost:${PORT}/health`);
        console.log(`🤖 Dual Personas: FAANG Engineering Manager + ABTalks Career Mentor`);
        console.log(`=======================================================`);
    });
}
exports.default = app;
