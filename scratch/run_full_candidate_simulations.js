const http = require('http');

function postJSON(path, payload) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body, statusCode: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

async function simulateCandidate(candidateData, turns) {
  console.log(`\n================================================================================`);
  console.log(`👤 CANDIDATE INTERVIEW SIMULATION: ${candidateData.name.toUpperCase()} (${candidateData.role})`);
  console.log(`================================================================================`);

  // Start Session
  const sessionRes = await postJSON('/api/interview/session', candidateData);
  const sid = sessionRes.sessionId;
  console.log(`🟢 [Session Started] ID: ${sid}`);
  console.log(`🤖 Agent Persona: ${sessionRes.activePersona} | Phase: ${sessionRes.currentPhase}`);

  for (let i = 0; i < turns.length; i++) {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`💬 Turn ${i + 1} Candidate Input: "${turns[i].message.substring(0, 90)}..."`);
    const turnRes = await postJSON('/api/interview/chat', {
      sessionId: sid,
      message: turns[i].message,
      codeSnippet: turns[i].codeSnippet || ""
    });
    console.log(`🤖 Agent Reply (${turnRes.activePersona} - ${turnRes.currentPhase}):`);
    console.log(`   "${turnRes.agentReply.substring(0, 140)}..."`);
  }

  // Finalize
  console.log(`\n--------------------------------------------------------------------------------`);
  const finalRes = await postJSON('/api/interview/finish', { sessionId: sid });
  const report = finalRes.report;
  const b = report.breakdown;
  console.log(`🏆 [ABTalks Report Finalized] Candidate: ${report.candidate} (${report.role})`);
  console.log(`📊 Industry Readiness Index: ${report.industryReadinessScore} / 100`);
  console.log(`🏷️ Verdict Tag: 🟢 ${report.overallVerdict}`);
  console.log(`📈 6D Radar Spokes Breakdown:`);
  console.log(`   ├─ Technical Proficiency: ${b.technicalProficiency} / 100`);
  console.log(`   ├─ System Architecture:   ${b.systemArchitecture} / 100`);
  console.log(`   ├─ Problem Solving:       ${b.problemSolving} / 100`);
  console.log(`   ├─ Communication Clarity: ${b.communicationClarity} / 100`);
  console.log(`   ├─ Code Craftsmanship:    ${b.codeCraftsmanship} / 100`);
  console.log(`   └─ Domain Expertise:      ${b.domainExpertise} / 100`);
  console.log(`💡 ABTalks Mentorship Plan: "${report.careerMentorshipRoadmap[0]}"`);
}

async function main() {
  // 1. Aarav Sharma
  await simulateCandidate({
    name: "Aarav Sharma",
    role: "Senior Backend Engineer",
    experienceYears: 4,
    githubUsername: "aarav-sharma-dev"
  }, [
    { message: "We prevent race conditions using Redis Redlock distributed locking with fencing tokens and PostgreSQL Repeatable Read isolation levels paired with PgBouncer connection pool tuning to eliminate deadlocks. We stream Debezium CDC into Kafka with BM25 and HNSW vector quantization.", codeSnippet: "const lock = await redis.lock('resource_key', { ttl: 5000 });" },
    { message: "We configure PostgreSQL logical replication using pgoutput plugin connected to Debezium connector on Kafka Connect. To stream mutation events without acquiring heavy table locks, Debezium reads WAL asynchronously. For schema evolution, we enforce Avro schema registry compatibility." },
    { message: "We implement a Token Bucket rate limiter middleware in Go using Redis sorted sets (ZSET) to maintain sliding log timestamps per IP. When tokens refill at rate r, atomic Lua scripts check ZREMRANGEBYSCORE and ZCARD to enforce max request bursts under 2ms overhead." }
  ]);

  // 2. Priya Sharma
  await simulateCandidate({
    name: "Priya Sharma",
    role: "AI / RAG Platform Engineer",
    experienceYears: 3,
    githubUsername: "priya-sharma-rag-dev"
  }, [
    { message: "Our enterprise RAG hybrid retrieval pipeline fuses keyword BM25 score ranks for exact acronyms with Dense Cosine semantic embeddings using Reciprocal Rank Fusion (RRF with k=60). For vector database indexing, we utilize HNSW graph indexing with M=16 and efConstruction=200 to achieve sub-10ms query latencies at 98% recall.", codeSnippet: "function computeRRF(bm25Rank, denseRank, k=60) { return (1/(k+bm25Rank)) + (1/(k+denseRank)); }" },
    { message: "To prevent KV-cache memory fragmentation during high burst traffic, vLLM partitions key-value memory into non-contiguous physical block tables allocated dynamically via PagedAttention. Combined with continuous iteration-level batching and Redis semantic prompt caching, we reduce Time-To-First-Token (TTFT) by 65%." }
  ]);

  // 3. Rohan Patel
  await simulateCandidate({
    name: "Rohan Patel",
    role: "Staff Systems Architect",
    experienceYears: 6,
    githubUsername: "rohan-patel-systems-architect"
  }, [
    { message: "To scale our real-time streaming infrastructure to 500k concurrent WebSocket connections, we deploy an Envoy service mesh edge gateway backed by a Redis Pub/Sub cluster. We enforce strict p99 latency SLAs (< 150ms) using circuit breakers with fallback degradation buffers.", codeSnippet: "apiVersion: keda.sh/v1alpha1\nkind: ScaledObject" },
    { message: "We configure Kubernetes Event-driven Autoscaling (KEDA) with custom Prometheus metrics monitoring queue depth and socket connection counts. In failure scenarios where a Redis Pub/Sub node drops, Envoy circuit breakers trip to divert live traffic to fallback replica nodes with exponential backoff." }
  ]);
}

main().catch(console.error);
