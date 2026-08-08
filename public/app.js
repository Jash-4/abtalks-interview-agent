// State
let currentSessionId = null;
let activePersona = 'FAANG_EM';

// DOM Elements
const startForm = document.getElementById('startForm');
const startBtn = document.getElementById('startBtn');
const chatViewport = document.getElementById('chatViewport');
const emptyState = document.getElementById('emptyState');
const inputContainer = document.getElementById('inputContainer');
const messageForm = document.getElementById('messageForm');
const userInput = document.getElementById('userInput');
const toggleCodeBtn = document.getElementById('toggleCodeBtn');
const codeBox = document.getElementById('codeBox');
const codeSnippetInput = document.getElementById('codeSnippet');
const finishEarlyBtn = document.getElementById('finishEarlyBtn');

// Badges & Drawer
const personaBadge = document.getElementById('personaBadge');
const mcpCard = document.getElementById('mcpCard');
const mcpRepo = document.getElementById('mcpRepo');
const mcpGrade = document.getElementById('mcpGrade');
const mcpArch = document.getElementById('mcpArch');
const mcpHighlights = document.getElementById('mcpHighlights');
const mcpSmells = document.getElementById('mcpSmells');

// Stages
const stageGreeting = document.getElementById('stageGreeting');
const stageTech = document.getElementById('stageTech');
const stageDesign = document.getElementById('stageDesign');
const stageMCP = document.getElementById('stageMCP');
const stageReport = document.getElementById('stageReport');

// Report View Elements
const reportView = document.getElementById('reportView');
const repCandidateName = document.getElementById('repCandidateName');
const repVerdict = document.getElementById('repVerdict');
const repReadinessScore = document.getElementById('repReadinessScore');
const valTech = document.getElementById('valTech');
const barTech = document.getElementById('barTech');
const valArch = document.getElementById('valArch');
const barArch = document.getElementById('barArch');
const valSolve = document.getElementById('valSolve');
const barSolve = document.getElementById('barSolve');
const valComm = document.getElementById('valComm');
const barComm = document.getElementById('barComm');
const repStrengthsList = document.getElementById('repStrengthsList');
const repImprovementsList = document.getElementById('repImprovementsList');
const repRoadmapList = document.getElementById('repRoadmapList');
const jsonCodeBlock = document.getElementById('jsonCodeBlock');
const copyJsonBtn = document.getElementById('copyJsonBtn');
const restartBtn = document.getElementById('restartBtn');

// 1. Handle Start Interview
startForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  startBtn.disabled = true;
  startBtn.innerText = 'Initializing Agent & MCP...';

  const payload = {
    name: document.getElementById('candidateName').value,
    role: document.getElementById('candidateRole').value,
    experienceYears: document.getElementById('experienceYears').value,
    targetCompanyLevel: document.getElementById('targetLevel').value,
    githubUsername: document.getElementById('githubUsername').value
  };

  try {
    const res = await fetch('/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to start');

    currentSessionId = data.sessionId;
    activePersona = data.activePersona;

    // Update UI
    if (emptyState) emptyState.remove();
    inputContainer.classList.remove('hidden');
    
    // Render MCP Data
    if (data.mcpGithubContext) {
      mcpCard.classList.remove('hidden');
      mcpRepo.innerText = data.mcpGithubContext.repoName;
      mcpGrade.innerText = `Grade ${data.mcpGithubContext.codeQualityRating}`;
      mcpArch.innerText = data.mcpGithubContext.architectureType;
      
      mcpHighlights.innerHTML = data.mcpGithubContext.highlights.map(h => `<li>✨ ${h}</li>`).join('');
      mcpSmells.innerHTML = data.mcpGithubContext.vulnerabilitiesOrSmells.map(s => `<li>⚠️ ${s}</li>`).join('');
    }

    // Add Greeting Bubble
    appendMessage('agent', data.greeting, activePersona);
    updateStages('GREETING');

  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    startBtn.disabled = false;
    startBtn.innerText = '🚀 Restart New Session';
  }
});

// 2. Handle Sending Candidate Message
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  const code = codeSnippetInput.value.trim();

  if (!text || !currentSessionId) return;

  // Append user bubble
  appendMessage('user', text, null, code || undefined);
  userInput.value = '';
  codeSnippetInput.value = '';
  codeBox.classList.add('hidden');

  // Show typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'chat-bubble agent';
  typingIndicator.id = 'typingIndicator';
  typingIndicator.innerText = activePersona === 'FAANG_EM' ? 'Alex Vance is analyzing system trade-offs...' : 'Anil Bajpai is evaluating Industry Readiness...';
  chatViewport.appendChild(typingIndicator);
  chatViewport.scrollTop = chatViewport.scrollHeight;

  try {
    const res = await fetch('/api/interview/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSessionId,
        message: text,
        codeSnippet: code || undefined
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to chat');

    const ind = document.getElementById('typingIndicator');
    if (ind) ind.remove();

    activePersona = data.activePersona;
    updatePersonaBadge(activePersona);
    updateStages(data.currentPhase);

    // Append agent reply
    appendMessage('agent', data.agentReply, activePersona);

    // Check if interview completed
    if (data.isFinished && data.finalReport) {
      setTimeout(() => {
        renderFinalReport(data.finalReport);
      }, 1200);
    }

  } catch (err) {
    const ind = document.getElementById('typingIndicator');
    if (ind) ind.remove();
    alert('Communication error: ' + err.message);
  }
});

// 3. Early Finish Trigger
finishEarlyBtn.addEventListener('click', async () => {
  if (!currentSessionId) return;
  if (!confirm('Are you ready to conclude the technical grill and generate your ABTalks Industry Readiness Scorecard?')) return;

  try {
    const res = await fetch('/api/interview/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId })
    });
    const data = await res.json();
    if (data.success && data.report) {
      renderFinalReport(data.report);
    }
  } catch (err) {
    alert('Error finalizing: ' + err.message);
  }
});

// Helper: Append Chat Bubble
function appendMessage(sender, text, persona, codeSnippet) {
  const bubble = document.createElement('div');
  const isMentor = persona === 'ABTALKS_MENTOR';
  bubble.className = `chat-bubble ${sender} ${isMentor ? 'mentor' : ''}`;

  const meta = document.createElement('div');
  meta.className = 'bubble-meta';
  
  if (sender === 'agent') {
    meta.innerHTML = isMentor 
      ? `<span>🎙️ Anil Bajpai (ABTalks Career Mentor)</span><span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`
      : `<span>⚡ Alex Vance (FAANG Principal EM)</span><span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
  } else {
    meta.innerHTML = `<span>👤 Candidate</span><span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
  }

  const content = document.createElement('div');
  content.innerText = text;

  bubble.appendChild(meta);
  bubble.appendChild(content);

  if (codeSnippet) {
    const codeEl = document.createElement('div');
    codeEl.className = 'chat-code-snippet';
    codeEl.innerText = codeSnippet;
    bubble.appendChild(codeEl);
  }

  chatViewport.appendChild(bubble);
  chatViewport.scrollTop = chatViewport.scrollHeight;
}

// Helper: Stage Updates
function updateStages(phase) {
  const stages = [stageGreeting, stageTech, stageDesign, stageMCP, stageReport];
  stages.forEach(s => s.classList.remove('active'));

  if (phase === 'GREETING') stageGreeting.classList.add('active');
  else if (phase === 'TECHNICAL_CORE') stageTech.classList.add('active');
  else if (phase === 'SYSTEM_DESIGN_CODE') stageDesign.classList.add('active');
  else if (phase === 'MCP_CODE_REVIEW') stageMCP.classList.add('active');
  else if (phase === 'CAREER_SYNTHESIS' || phase === 'COMPLETED') stageReport.classList.add('active');
}

// Stage Navigation Click Handlers
stageGreeting.addEventListener('click', () => {
  if (!currentSessionId) startForm.dispatchEvent(new Event('submit'));
  userInput.focus();
});

stageTech.addEventListener('click', () => {
  if (currentSessionId) {
    userInput.value = "In high-throughput systems, I implement Redis distributed locks with Redlock and PostgreSQL serializable isolation to guarantee zero race conditions.";
    userInput.focus();
  }
});

stageDesign.addEventListener('click', () => {
  codeBox.classList.remove('hidden');
  codeSnippetInput.value = "// System Design: Caching Layer\nconst cache = new RedisCluster({\n  ttl: 3600,\n  eviction: 'volatile-lru'\n});";
  codeSnippetInput.focus();
});

stageMCP.addEventListener('click', () => {
  mcpCard.classList.remove('hidden');
  mcpCard.scrollIntoView({ behavior: 'smooth' });
});

stageReport.addEventListener('click', () => {
  if (currentSessionId) {
    finishEarlyBtn.click();
  } else {
    alert('Please click "Launch Interview Agent" first to begin your session!');
  }
});

function updatePersonaBadge(persona) {
  if (persona === 'ABTALKS_MENTOR') {
    personaBadge.innerText = '🎙️ Persona: ABTalks Mentor';
    personaBadge.style.background = 'rgba(245, 158, 11, 0.2)';
    personaBadge.style.color = '#fbbf24';
  } else {
    personaBadge.innerText = '🎭 Persona: FAANG EM';
    personaBadge.style.background = 'rgba(168, 85, 247, 0.15)';
    personaBadge.style.color = '#c084fc';
  }
}

// Toggle code editor
toggleCodeBtn.addEventListener('click', () => {
  codeBox.classList.toggle('hidden');
});

// Render Final Report
function renderFinalReport(report) {
  chatViewport.classList.add('hidden');
  inputContainer.classList.add('hidden');
  reportView.classList.remove('hidden');

  repCandidateName.innerText = `${report.candidate} — ${report.role}`;
  repVerdict.innerText = report.overallVerdict;
  repReadinessScore.innerText = report.industryReadinessScore;

  const b = report.breakdown;
  valTech.innerText = `${b.technicalProficiency}%`;
  barTech.style.width = `${b.technicalProficiency}%`;

  valArch.innerText = `${b.systemArchitecture}%`;
  barArch.style.width = `${b.systemArchitecture}%`;

  valSolve.innerText = `${b.problemSolving}%`;
  barSolve.style.width = `${b.problemSolving}%`;

  valComm.innerText = `${b.communicationClarity}%`;
  barComm.style.width = `${b.communicationClarity}%`;

  repStrengthsList.innerHTML = report.strengths.map(s => `<li>${s}</li>`).join('');
  repImprovementsList.innerHTML = report.areasForImprovement.map(i => `<li>${i}</li>`).join('');
  repRoadmapList.innerHTML = report.careerMentorshipRoadmap.map(r => `<li>🚀 ${r}</li>`).join('');

  jsonCodeBlock.innerText = JSON.stringify(report, null, 2);
}

// Copy JSON
copyJsonBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(jsonCodeBlock.innerText);
  copyJsonBtn.innerText = '✅ Copied!';
  setTimeout(() => copyJsonBtn.innerText = '📋 Copy JSON', 2000);
});

// Restart Interview
restartBtn.addEventListener('click', () => {
  reportView.classList.add('hidden');
  chatViewport.classList.remove('hidden');
  inputContainer.classList.remove('hidden');
  chatViewport.innerHTML = '';
  currentSessionId = null;
  startForm.dispatchEvent(new Event('submit'));
});

// Enter key submit in textarea
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    messageForm.dispatchEvent(new Event('submit'));
  }
});
