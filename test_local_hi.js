const { InterviewStateMachine } = require('./dist/agent/stateMachine');

async function runLocalTest() {
  const sm = new InterviewStateMachine();
  const session = await sm.createSession({ name: 'Alex Rivera', role: 'Backend Engineer' });
  console.log('Greeting from SM:\n', session.history[0].text);
  
  console.log('\n--- CANDIDATE TYPES "hi" ---');
  const result = await sm.processCandidateMessage(session.sessionId, 'hi');
  console.log('AGENT REPLY:\n', result.agentMessage.text);
  console.log('SCORES ACCUMULATED:\n', result.session.scoresAccumulated);
}

runLocalTest();
