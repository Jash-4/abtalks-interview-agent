export type InterviewPhase = 
  | 'INITIALIZING'
  | 'GREETING'
  | 'TECHNICAL_CORE'
  | 'SYSTEM_DESIGN_CODE'
  | 'MCP_CODE_REVIEW'
  | 'CAREER_SYNTHESIS'
  | 'COMPLETED';

export type PersonaType = 'FAANG_EM' | 'ABTALKS_MENTOR';

export interface CandidateProfile {
  name: string;
  role: string;
  experienceYears: number;
  targetCompanyLevel?: string; // e.g., "L4 / L5 / Senior SWE"
  githubUsername?: string;
  techStack?: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  persona?: PersonaType;
  text: string;
  timestamp: string;
  phase: InterviewPhase;
  codeSnippet?: string;
  mcpContextUsed?: boolean;
}

export interface RubricCriteria {
  id: string;
  category: 'data_structures' | 'system_architecture' | 'concurrency' | 'problem_solving' | 'communication' | 'industry_readiness' | 'domain_knowledge';
  topic: string;
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Staff';
  expectedKeywords: string[];
  evaluationGuide: string;
  weight: number;
}

export interface GithubRepoMockData {
  repoName: string;
  primaryLanguage: string;
  codeQualityRating: 'A' | 'B' | 'C' | 'D';
  architectureType: string;
  highlights: string[];
  vulnerabilitiesOrSmells: string[];
  recentCommitSummary: string;
}

export interface ScorecardBreakdown {
  technicalProficiency: number; // 0 - 100
  systemArchitecture: number;   // 0 - 100
  problemSolving: number;        // 0 - 100
  communicationClarity: number;  // 0 - 100
  codeCraftsmanship: number;     // 0 - 100
  domainExpertise: number;       // 0 - 100
}

export interface StructuredInterviewReport {
  sessionId: string;
  candidate: string;
  role: string;
  timestamp: string;
  industryReadinessScore: number; // 0 - 100 (ABTalks Index)
  overallVerdict: 'Immediate Strong Hire' | 'Hire (L4/Mid-Level)' | 'Needs Mentorship & Refinement' | 'Not Ready Yet';
  breakdown: ScorecardBreakdown;
  strengths: string[];
  areasForImprovement: string[];
  faangEmObservations: string[];
  careerMentorshipRoadmap: string[];
  mcpGithubInsights?: GithubRepoMockData;
  questionByQuestionAnalysis: {
    question: string;
    candidateResponseSummary: string;
    score: number;
    feedback: string;
  }[];
}

export interface InterviewSession {
  sessionId: string;
  candidate: CandidateProfile;
  currentPhase: InterviewPhase;
  activePersona: PersonaType;
  history: ChatMessage[];
  mcpData?: GithubRepoMockData;
  rubricsRetrieved: RubricCriteria[];
  scoresAccumulated: {
    technical: number[];
    architecture: number[];
    problemSolving: number[];
    communication: number[];
    codeCraft: number[];
    domain: number[];
  };
  finalReport?: StructuredInterviewReport;
  createdAt: string;
  updatedAt: string;
}
