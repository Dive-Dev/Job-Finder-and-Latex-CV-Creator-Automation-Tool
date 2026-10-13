import axios from 'axios'

const API_BASE = '/api'

export const api = {
  // Stats & Pipeline
  getStats: () => axios.get(`${API_BASE}/stats`).then(res => res.data),
  getJobs: (params = {}) => axios.get(`${API_BASE}/jobs`, { params }).then(res => res.data),
  deduplicateJobs: () => axios.post(`${API_BASE}/jobs/deduplicate`).then(res => res.data),
  addJob: (job) => axios.post(`${API_BASE}/jobs`, job).then(res => res.data),
  updateJobStatus: (id, status) => axios.patch(`${API_BASE}/jobs/${id}/status`, { status }).then(res => res.data),
  updateJobDetails: (id, details) => axios.patch(`${API_BASE}/jobs/${id}`, details).then(res => res.data),
  deleteJob: (id) => axios.delete(`${API_BASE}/jobs/${id}`).then(res => res.data),
  deleteJobsBatch: (job_ids) => axios.post(`${API_BASE}/jobs/batch-delete`, { job_ids }).then(res => res.data),

  // Scrapers
  scrapeLinkedIn: (payload) => axios.post(`${API_BASE}/scrape/linkedin`, payload).then(res => res.data),
  scrapeGoogle: (payload) => axios.post(`${API_BASE}/scrape/google`, payload).then(res => res.data),
  scrapeCompany: (payload) => axios.post(`${API_BASE}/scrape/company`, payload).then(res => res.data),

  // Contacts & Outreach
  getContacts: (company) => axios.get(`${API_BASE}/contacts`, { params: { company } }).then(res => res.data),
  searchContacts: (payload) => axios.post(`${API_BASE}/contacts/search`, payload).then(res => res.data),
  saveContact: (contact) => axios.post(`${API_BASE}/contacts`, contact).then(res => res.data),
  updateContactStatus: (id, status) => axios.patch(`${API_BASE}/contacts/${id}/status`, { status }).then(res => res.data),
  deleteContact: (id) => axios.delete(`${API_BASE}/contacts/${id}`).then(res => res.data),
  generateContactOutreach: (payload) => axios.post(`${API_BASE}/contacts/outreach`, payload).then(res => res.data),

  // Candidate Profile & Simple Login
  getProfile: (user_id) => axios.get(`${API_BASE}/profile`, { params: { user_id } }).then(res => res.data),
  saveProfile: (profile) => axios.post(`${API_BASE}/profile`, profile).then(res => res.data),
  parseResume: (resume_text) => axios.post(`${API_BASE}/profile/parse-resume`, { resume_text }).then(res => res.data),
  loginUser: (credentials) => axios.post(`${API_BASE}/profile/login`, credentials).then(res => res.data),

  // LaTeX CV & Studio
  generateLatexCV: (payload) => axios.post(`${API_BASE}/latex/generate`, payload).then(res => res.data),
  viewLatexFile: (filename) => axios.get(`${API_BASE}/latex/view/${encodeURIComponent(filename)}`).then(res => res.data),

  // Cover Letter Studio
  generateCoverLetter: (payload) => axios.post(`${API_BASE}/cover-letter/generate`, payload).then(res => res.data),
  viewCoverLetter: (filename) => axios.get(`${API_BASE}/cover-letter/view/${encodeURIComponent(filename)}`).then(res => res.data),

  // AI & ATS Analyzer
  analyzeJd: (payload) => axios.post(`${API_BASE}/ai/analyze-jd`, payload).then(res => res.data),
  tailorCv: (payload) => axios.post(`${API_BASE}/ai/tailor-cv`, payload).then(res => res.data),

  // Autonomous Agent & Local Model
  getAgentConfig: () => axios.get(`${API_BASE}/agent/config`).then(res => res.data),
  saveAgentConfig: (cfg) => axios.post(`${API_BASE}/agent/config`, cfg).then(res => res.data),
  testLocalModel: (payload) => axios.post(`${API_BASE}/agent/test-local-model`, payload).then(res => res.data),
  runAgent: (payload) => axios.post(`${API_BASE}/agent/run`, payload).then(res => res.data),
  getAgentStatus: () => axios.get(`${API_BASE}/agent/status`).then(res => res.data),
  stopAgent: () => axios.post(`${API_BASE}/agent/stop`).then(res => res.data),

  // Integrations & Settings
  syncSheets: () => axios.post(`${API_BASE}/sheets/sync`).then(res => res.data),
  saveSettings: (payload) => axios.post(`${API_BASE}/settings`, payload).then(res => res.data),

  // Company Deep Intelligence (Human Crawler)
  researchCompany: (payload) => axios.post(`${API_BASE}/company/research`, payload).then(res => res.data),
  listCompanyResearch: () => axios.get(`${API_BASE}/company/research`).then(res => res.data),
  getCompanyResearch: (company) => axios.get(`${API_BASE}/company/research/${encodeURIComponent(company)}`).then(res => res.data),
  deleteCompanyResearch: (company) => axios.delete(`${API_BASE}/company/research/${encodeURIComponent(company)}`).then(res => res.data),

  // People Intelligence (Apollo / Hunter / RocketReach style)
  searchPeople: (payload) => axios.post(`${API_BASE}/people/search`, payload).then(res => res.data),
  getDomainPattern: (company, domain) => axios.get(`${API_BASE}/people/domain-pattern`, { params: { company, domain } }).then(res => res.data),

  // Referral Email Sender Engine
  sendReferralEmail: (payload) => axios.post(`${API_BASE}/email/send`, payload).then(res => res.data),
  testSmtp: (payload) => axios.post(`${API_BASE}/email/test-smtp`, payload).then(res => res.data),
  getSmtpConfig: () => axios.get(`${API_BASE}/email/config`).then(res => res.data),

  // Interview & Preparation Studio
  generateInterviewPrep: (payload) => axios.post(`${API_BASE}/interview/prep`, payload).then(res => res.data),

  // Agent Auto-Training & Continuous Learning
  trainAgent: () => axios.post(`${API_BASE}/agent/train`).then(res => res.data),
  getAgentTrainStatus: () => axios.get(`${API_BASE}/agent/train-status`).then(res => res.data),
}
