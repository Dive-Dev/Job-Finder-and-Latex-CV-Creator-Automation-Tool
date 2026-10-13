import React, { useState } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Textarea,
  Input,
  Select,
  VStack,
  HStack,
  Badge,
  Card,
  CardBody,
  useToast,
  Tag,
  CircularProgress,
  CircularProgressLabel,
  FormControl,
  FormLabel,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  Code,
} from '@chakra-ui/react'
import {
  FiZap,
  FiCode,
  FiBriefcase,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiCpu,
  FiAward,
  FiTerminal,
  FiTrendingUp,
} from 'react-icons/fi'
import { api } from '../api'

export default function AiInspectorTab({ jobs = [] }) {
  const toast = useToast()

  // --- ATS INSPECTOR STATE ---
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jdText, setJdText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [matchResult, setMatchResult] = useState(null)

  // --- CODER SKILL STATE ---
  const [coderAction, setCoderAction] = useState('solve_challenge')
  const [challengeInput, setChallengeInput] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('python')
  const [codeSnippet, setCodeSnippet] = useState('')
  const [latexCodeInput, setLatexCodeInput] = useState('')
  const [latexErrorInput, setLatexErrorInput] = useState('')
  const [requiredStackInput, setRequiredStackInput] = useState('React, Node.js, PostgreSQL, Docker, AWS')
  const [techRoleInput, setTechRoleInput] = useState('Senior Backend Engineer')
  const [coderLoading, setCoderLoading] = useState(false)
  const [coderResult, setCoderResult] = useState(null)

  // --- JOB SKILL STATE ---
  const [jobSkillAction, setJobSkillAction] = useState('star_bullets')
  const [rawBulletInput, setRawBulletInput] = useState('Worked on API optimization and reduced latency. Built notification system with Redis and PostgreSQL.')
  const [targetRoleInput, setTargetRoleInput] = useState('Senior Full Stack Engineer')
  const [targetSkillsInput, setTargetSkillsInput] = useState('Python, FastAPI, Redis, PostgreSQL, AWS')
  const [recruiterPitchStyle, setRecruiterPitchStyle] = useState('balanced')
  const [jobSkillLoading, setJobSkillLoading] = useState(false)
  const [jobSkillResult, setJobSkillResult] = useState(null)

  // --- ATS INSPECTOR HANDLERS ---
  const handleSelectJob = (e) => {
    const jid = e.target.value
    setSelectedJobId(jid)
    if (!jid) return
    const j = jobs.find((job) => job.id === jid)
    if (j && j.description) {
      setJdText(j.description)
    }
  }

  const handleAnalyze = async () => {
    if (!jdText.trim() && !selectedJobId) {
      toast({ title: 'Please provide JD text or select a job', status: 'warning' })
      return
    }
    setAnalyzing(true)
    try {
      const res = await api.analyzeJd({
        jd_text: jdText,
        job_id: selectedJobId || undefined,
      })
      if (res.success) {
        setAnalysisResult(res.analysis)
        setMatchResult(res.match)
        toast({ title: 'JD Analysis Complete!', status: 'success', duration: 3000 })
      }
    } catch (err) {
      toast({ title: 'Analysis failed', description: err.message, status: 'error' })
    } finally {
      setAnalyzing(false)
    }
  }

  // --- CODER SKILL HANDLER ---
  const handleRunCoderSkill = async () => {
    setCoderLoading(true)
    setCoderResult(null)
    try {
      let payload = { action: coderAction }

      if (coderAction === 'solve_challenge') {
        if (!challengeInput.trim()) {
          toast({ title: 'Enter a coding challenge or problem prompt', status: 'warning' })
          setCoderLoading(false)
          return
        }
        payload.challenge = challengeInput
        payload.language = codeLanguage
      } else if (coderAction === 'review_code') {
        if (!codeSnippet.trim()) {
          toast({ title: 'Paste code snippet to review', status: 'warning' })
          setCoderLoading(false)
          return
        }
        payload.code = codeSnippet
        payload.language = codeLanguage
      } else if (coderAction === 'fix_latex') {
        if (!latexCodeInput.trim()) {
          toast({ title: 'Paste LaTeX CV code to repair', status: 'warning' })
          setCoderLoading(false)
          return
        }
        payload.latex_code = latexCodeInput
        payload.error_log = latexErrorInput
      } else if (coderAction === 'assess_stack') {
        const stackList = requiredStackInput.split(',').map((s) => s.trim()).filter(Boolean)
        payload.required_stack = stackList
      } else if (coderAction === 'tech_questions') {
        const stackList = requiredStackInput.split(',').map((s) => s.trim()).filter(Boolean)
        payload.role_title = techRoleInput
        payload.tech_stack = stackList
        payload.seniority = 'Mid-Senior'
      }

      const res = await api.runCoderSkill(payload)
      if (res.success) {
        setCoderResult(res.result)
        toast({ title: 'Coder Skill Execution Finished!', status: 'success', duration: 3000 })
      } else {
        toast({ title: 'Execution note', description: res.error || 'Failed to execute coder skill', status: 'error' })
      }
    } catch (err) {
      toast({ title: 'Coder Skill Error', description: err.message, status: 'error' })
    } finally {
      setCoderLoading(false)
    }
  }

  // --- JOB SKILL HANDLER ---
  const handleRunJobSkill = async () => {
    setJobSkillLoading(true)
    setJobSkillResult(null)
    try {
      let payload = { action: jobSkillAction }

      if (jobSkillAction === 'star_bullets') {
        payload.experience = {
          role: targetRoleInput,
          company: 'Current/Previous Role',
          bullets: rawBulletInput.split('\n').filter((b) => b.trim()),
          description: rawBulletInput,
        }
        payload.target_role = targetRoleInput
        payload.key_skills = targetSkillsInput.split(',').map((s) => s.trim()).filter(Boolean)
      } else if (jobSkillAction === 'deep_jd') {
        if (!jdText.trim()) {
          toast({ title: 'Please paste a job description first', status: 'warning' })
          setJobSkillLoading(false)
          return
        }
        payload.jd_text = jdText
      } else if (jobSkillAction === 'recruiter_pitch') {
        payload.pitch_style = recruiterPitchStyle
        payload.job_data = {
          title: targetRoleInput,
          company: 'Target Company',
          description: jdText,
        }
      } else if (jobSkillAction === 'prep_pack') {
        payload.job_data = {
          title: targetRoleInput,
          company: 'Target Company',
          description: jdText,
        }
      } else if (jobSkillAction === 'growth_eval') {
        payload.job_data = {
          title: targetRoleInput,
          company: 'Target Company',
          description: jdText,
        }
      }

      const res = await api.runJobSkill(payload)
      if (res.success) {
        setJobSkillResult(res.result)
        toast({ title: 'Job Skill Execution Finished!', status: 'success', duration: 3000 })
      } else {
        toast({ title: 'Execution error', description: res.error || 'Failed to execute job skill', status: 'error' })
      }
    } catch (err) {
      toast({ title: 'Job Skill Error', description: err.message, status: 'error' })
    } finally {
      setJobSkillLoading(false)
    }
  }

  const score = matchResult?.score || 0

  return (
    <Box maxW="1500px" mx="auto" py={4}>
      {/* Header Banner */}
      <Card bgGradient="linear(to-r, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1), rgba(16, 185, 129, 0.1))" mb={6} borderColor="rgba(99, 102, 241, 0.3)">
        <CardBody p={5}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Box>
              <HStack spacing={2} mb={1}>
                <Heading size="md" color="white" fontWeight="800">
                  🧠 LLM Coder & Job Skill Intelligence Suite
                </Heading>
                <Badge colorScheme="cyan">Multi-Skill LLM</Badge>
              </HStack>
              <Text fontSize="sm" color="gray.300">
                Equipped with specialized <b>Coder Skill</b> (code challenges, reviews, LaTeX fixes, tech stacks) and <b>Job Skill</b> (Google XYZ STAR bullets, recruiter pitches, deep JD analysis).
              </Text>
            </Box>
            <HStack spacing={2}>
              <Badge colorScheme="green" px={3} py={1} borderRadius="full">Coder Skill: Ready</Badge>
              <Badge colorScheme="purple" px={3} py={1} borderRadius="full">Job Skill: Ready</Badge>
            </HStack>
          </Flex>
        </CardBody>
      </Card>

      {/* Main Multi-Skill Tabs */}
      <Tabs variant="soft-rounded" colorScheme="purple" isLazy>
        <TabList mb={5} bg="blackAlpha.300" p={1.5} borderRadius="xl" maxW="fit-content">
          <Tab fontSize="sm" fontWeight="600" _selected={{ color: 'white', bg: 'purple.600' }}>
            <HStack spacing={2}>
              <FiCode />
              <Text>👨‍💻 Coder Skill</Text>
            </HStack>
          </Tab>
          <Tab fontSize="sm" fontWeight="600" _selected={{ color: 'white', bg: 'blue.600' }}>
            <HStack spacing={2}>
              <FiBriefcase />
              <Text>💼 Job Skill</Text>
            </HStack>
          </Tab>
          <Tab fontSize="sm" fontWeight="600" _selected={{ color: 'white', bg: 'emerald.600' }}>
            <HStack spacing={2}>
              <FiZap />
              <Text>🔍 ATS JD Inspector</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          {/* TAB 1: CODER SKILL */}
          <TabPanel px={0}>
            <Grid templateColumns={{ base: '1fr', lg: '1fr 1.2fr' }} gap={6}>
              {/* Form Input */}
              <Card>
                <CardBody p={5}>
                  <Flex align="center" justify="space-between" mb={4}>
                    <Heading size="xs" textTransform="uppercase" color="cyan.300" letterSpacing="wider">
                      ⚡ Coder Skill Workspace
                    </Heading>
                    <Badge colorScheme="cyan">Algorithmic & Systems AI</Badge>
                  </Flex>

                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.300" mb={1}>Select Coder Action</FormLabel>
                      <Select
                        size="sm"
                        value={coderAction}
                        onChange={(e) => setCoderAction(e.target.value)}
                      >
                        <option value="solve_challenge">💡 Solve Coding Challenge / LeetCode Problem</option>
                        <option value="review_code">🔍 Senior Code Review (Security, Perf & Clean Code)</option>
                        <option value="fix_latex">🛠️ Fix LaTeX CV Syntax & Unescaped Errors</option>
                        <option value="assess_stack">📊 Audit Tech Stack Alignment against Profile</option>
                        <option value="tech_questions">🎯 Generate Technical Interview Questions</option>
                      </Select>
                    </FormControl>

                    {/* Dynamic Fields */}
                    {coderAction === 'solve_challenge' && (
                      <>
                        <FormControl>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Target Programming Language</FormLabel>
                          <Select size="sm" value={codeLanguage} onChange={(e) => setCodeLanguage(e.target.value)}>
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript / TypeScript</option>
                            <option value="java">Java</option>
                            <option value="golang">Golang</option>
                            <option value="cpp">C++</option>
                          </Select>
                        </FormControl>

                        <FormControl isRequired>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Challenge Problem Statement</FormLabel>
                          <Textarea
                            size="sm"
                            rows={8}
                            value={challengeInput}
                            onChange={(e) => setChallengeInput(e.target.value)}
                            placeholder="e.g. Design an LRU Cache with O(1) get and put operations..."
                          />
                        </FormControl>
                      </>
                    )}

                    {coderAction === 'review_code' && (
                      <>
                        <FormControl>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Language</FormLabel>
                          <Select size="sm" value={codeLanguage} onChange={(e) => setCodeLanguage(e.target.value)}>
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript / TypeScript</option>
                            <option value="sql">SQL / Postgres</option>
                          </Select>
                        </FormControl>

                        <FormControl isRequired>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Code Snippet</FormLabel>
                          <Textarea
                            size="sm"
                            rows={9}
                            value={codeSnippet}
                            onChange={(e) => setCodeSnippet(e.target.value)}
                            placeholder="Paste your function or implementation code here..."
                          />
                        </FormControl>
                      </>
                    )}

                    {coderAction === 'fix_latex' && (
                      <>
                        <FormControl isRequired>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>LaTeX CV Code</FormLabel>
                          <Textarea
                            size="sm"
                            rows={7}
                            value={latexCodeInput}
                            onChange={(e) => setLatexCodeInput(e.target.value)}
                            placeholder="Paste LaTeX CV snippet containing syntax errors or unescaped characters..."
                          />
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Error Log (Optional)</FormLabel>
                          <Input
                            size="sm"
                            value={latexErrorInput}
                            onChange={(e) => setLatexErrorInput(e.target.value)}
                            placeholder="e.g. Misplaced alignment tab character &"
                          />
                        </FormControl>
                      </>
                    )}

                    {(coderAction === 'assess_stack' || coderAction === 'tech_questions') && (
                      <>
                        <FormControl>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Role Title</FormLabel>
                          <Input
                            size="sm"
                            value={techRoleInput}
                            onChange={(e) => setTechRoleInput(e.target.value)}
                          />
                        </FormControl>

                        <FormControl isRequired>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Required Tech Stack (comma separated)</FormLabel>
                          <Input
                            size="sm"
                            value={requiredStackInput}
                            onChange={(e) => setRequiredStackInput(e.target.value)}
                          />
                        </FormControl>
                      </>
                    )}

                    <Button
                      variant="solid"
                      colorScheme="cyan"
                      size="md"
                      leftIcon={<FiTerminal />}
                      isLoading={coderLoading}
                      onClick={handleRunCoderSkill}
                    >
                      Execute Coder Skill
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              {/* Result Viewer */}
              <Card>
                <CardBody p={5}>
                  <Flex align="center" justify="space-between" mb={3}>
                    <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider">
                      💻 Coder Skill Output
                    </Heading>
                    {coderResult && <Badge colorScheme="green">Success</Badge>}
                  </Flex>

                  {coderResult ? (
                    <Box
                      p={4}
                      bg="blackAlpha.500"
                      borderRadius="lg"
                      border="1px solid rgba(255,255,255,0.08)"
                      maxH="600px"
                      overflowY="auto"
                    >
                      {/* Formatted display based on action */}
                      {coderAction === 'solve_challenge' && (
                        <VStack align="stretch" spacing={3}>
                          <Box>
                            <Text fontSize="xs" color="cyan.300" fontWeight="700">Approach & Design:</Text>
                            <Text fontSize="xs" color="gray.300">{coderResult.approach}</Text>
                          </Box>
                          <HStack spacing={4}>
                            <Badge colorScheme="purple">Time: {coderResult.time_complexity}</Badge>
                            <Badge colorScheme="blue">Space: {coderResult.space_complexity}</Badge>
                          </HStack>
                          <Box>
                            <Text fontSize="xs" color="green.300" fontWeight="700" mb={1}>Optimal Code:</Text>
                            <Box as="pre" p={3} bg="gray.900" borderRadius="md" fontSize="xs" color="green.200" overflowX="auto">
                              {coderResult.solution_code}
                            </Box>
                          </Box>
                        </VStack>
                      )}

                      {coderAction === 'review_code' && (
                        <VStack align="stretch" spacing={3}>
                          <Flex justify="space-between">
                            <Text fontSize="xs" color="gray.400">Quality Score:</Text>
                            <Badge colorScheme="green">{coderResult.quality_score}/100</Badge>
                          </Flex>
                          <Text fontSize="xs" color="gray.200"><b>Summary:</b> {coderResult.summary}</Text>
                          {coderResult.security_issues?.length > 0 && (
                            <Box>
                              <Text fontSize="xs" color="red.300" fontWeight="700">Security Considerations:</Text>
                              {coderResult.security_issues.map((sec, i) => (
                                <Text key={i} fontSize="xs" color="red.200">• {sec}</Text>
                              ))}
                            </Box>
                          )}
                          {coderResult.suggested_refactor && (
                            <Box>
                              <Text fontSize="xs" color="cyan.300" fontWeight="700" mb={1}>Suggested Refactoring:</Text>
                              <Box as="pre" p={3} bg="gray.900" borderRadius="md" fontSize="xs" color="cyan.200" overflowX="auto">
                                {coderResult.suggested_refactor}
                              </Box>
                            </Box>
                          )}
                        </VStack>
                      )}

                      {coderAction === 'fix_latex' && (
                        <VStack align="stretch" spacing={3}>
                          <Text fontSize="xs" color="green.300"><b>Status:</b> Repaired LaTeX Syntax</Text>
                          <Box as="pre" p={3} bg="gray.900" borderRadius="md" fontSize="xs" color="green.200" overflowX="auto">
                            {coderResult.fixed_latex || coderResult.clean_latex}
                          </Box>
                        </VStack>
                      )}

                      {(coderAction === 'assess_stack' || coderAction === 'tech_questions') && (
                        <Box as="pre" fontSize="xs" color="gray.300" whiteSpace="pre-wrap">
                          {JSON.stringify(coderResult, null, 2)}
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Flex minH="380px" align="center" justify="center" direction="column" color="gray.500" textAlign="center">
                      <FiCode size={36} />
                      <Text fontSize="sm" mt={2}>Choose an action and click "Execute Coder Skill".</Text>
                    </Flex>
                  )}
                </CardBody>
              </Card>
            </Grid>
          </TabPanel>

          {/* TAB 2: JOB SKILL */}
          <TabPanel px={0}>
            <Grid templateColumns={{ base: '1fr', lg: '1fr 1.2fr' }} gap={6}>
              {/* Form Input */}
              <Card>
                <CardBody p={5}>
                  <Flex align="center" justify="space-between" mb={4}>
                    <Heading size="xs" textTransform="uppercase" color="blue.300" letterSpacing="wider">
                      💼 Job Skill Workspace
                    </Heading>
                    <Badge colorScheme="blue">Executive Career & ATS</Badge>
                  </Flex>

                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.300" mb={1}>Select Job Action</FormLabel>
                      <Select
                        size="sm"
                        value={jobSkillAction}
                        onChange={(e) => setJobSkillAction(e.target.value)}
                      >
                        <option value="star_bullets">🌟 Google XYZ STAR Bullet Point Tailoring</option>
                        <option value="recruiter_pitch">💌 Craft High-Converting Recruiter Outreach Pitch</option>
                        <option value="deep_jd">📑 Deep JD Analysis & Hidden Keywords Breakdown</option>
                        <option value="prep_pack">🎓 Generate 5-Question Interview Studio Pack</option>
                        <option value="growth_eval">🚀 Evaluate Engineering Growth Trajectory</option>
                      </Select>
                    </FormControl>

                    {jobSkillAction === 'star_bullets' && (
                      <>
                        <FormControl isRequired>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Target Job Role</FormLabel>
                          <Input
                            size="sm"
                            value={targetRoleInput}
                            onChange={(e) => setTargetRoleInput(e.target.value)}
                          />
                        </FormControl>

                        <FormControl isRequired>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Raw Bullet Points / Work Done</FormLabel>
                          <Textarea
                            size="sm"
                            rows={6}
                            value={rawBulletInput}
                            onChange={(e) => setRawBulletInput(e.target.value)}
                            placeholder="e.g. Built microservices, handled database queries..."
                          />
                        </FormControl>
                      </>
                    )}

                    {jobSkillAction === 'recruiter_pitch' && (
                      <>
                        <FormControl>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Pitch Style</FormLabel>
                          <Select size="sm" value={recruiterPitchStyle} onChange={(e) => setRecruiterPitchStyle(e.target.value)}>
                            <option value="balanced">Balanced & Professional</option>
                            <option value="direct">Direct & High Impact (Executive)</option>
                            <option value="friendly">Warm & Networking Friendly</option>
                          </Select>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Target Role</FormLabel>
                          <Input size="sm" value={targetRoleInput} onChange={(e) => setTargetRoleInput(e.target.value)} />
                        </FormControl>
                      </>
                    )}

                    {(jobSkillAction === 'deep_jd' || jobSkillAction === 'prep_pack' || jobSkillAction === 'growth_eval') && (
                      <>
                        <FormControl>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Target Role Title</FormLabel>
                          <Input size="sm" value={targetRoleInput} onChange={(e) => setTargetRoleInput(e.target.value)} />
                        </FormControl>

                        <FormControl isRequired>
                          <FormLabel fontSize="xs" color="gray.300" mb={1}>Job Description Content</FormLabel>
                          <Textarea
                            size="sm"
                            rows={8}
                            value={jdText}
                            onChange={(e) => setJdText(e.target.value)}
                            placeholder="Paste the job posting description here..."
                          />
                        </FormControl>
                      </>
                    )}

                    <Button
                      variant="solid"
                      colorScheme="blue"
                      size="md"
                      leftIcon={<FiBriefcase />}
                      isLoading={jobSkillLoading}
                      onClick={handleRunJobSkill}
                    >
                      Execute Job Skill
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              {/* Job Skill Results */}
              <Card>
                <CardBody p={5}>
                  <Flex align="center" justify="space-between" mb={3}>
                    <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider">
                      📊 Job Skill Output
                    </Heading>
                    {jobSkillResult && <Badge colorScheme="purple">Engineered</Badge>}
                  </Flex>

                  {jobSkillResult ? (
                    <Box
                      p={4}
                      bg="blackAlpha.500"
                      borderRadius="lg"
                      border="1px solid rgba(255,255,255,0.08)"
                      maxH="600px"
                      overflowY="auto"
                    >
                      {jobSkillAction === 'star_bullets' && (
                        <VStack align="stretch" spacing={3}>
                          <Text fontSize="xs" color="green.300" fontWeight="700">
                            Google XYZ Formatted STAR Bullets:
                          </Text>
                          {(Array.isArray(jobSkillResult.tailored_bullets) ? jobSkillResult.tailored_bullets : []).map((b, i) => (
                            <Box key={i} p={2.5} bg="gray.900" borderRadius="md" borderLeft="3px solid #10B981">
                              <Text fontSize="xs" color="gray.200">{b}</Text>
                            </Box>
                          ))}
                        </VStack>
                      )}

                      {jobSkillAction === 'recruiter_pitch' && (
                        <VStack align="stretch" spacing={3}>
                          <Box>
                            <Text fontSize="xs" color="cyan.300" fontWeight="700">Subject Line:</Text>
                            <Text fontSize="xs" color="white" fontWeight="600">{jobSkillResult.subject}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="purple.300" fontWeight="700">Cold InMail / Email Body:</Text>
                            <Text fontSize="xs" color="gray.200" whiteSpace="pre-wrap">{jobSkillResult.body}</Text>
                          </Box>
                        </VStack>
                      )}

                      {(jobSkillAction === 'deep_jd' || jobSkillAction === 'prep_pack' || jobSkillAction === 'growth_eval') && (
                        <Box as="pre" fontSize="xs" color="gray.300" whiteSpace="pre-wrap">
                          {JSON.stringify(jobSkillResult, null, 2)}
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Flex minH="380px" align="center" justify="center" direction="column" color="gray.500" textAlign="center">
                      <FiBriefcase size={36} />
                      <Text fontSize="sm" mt={2}>Choose a job action and click "Execute Job Skill".</Text>
                    </Flex>
                  )}
                </CardBody>
              </Card>
            </Grid>
          </TabPanel>

          {/* TAB 3: ATS JD INSPECTOR */}
          <TabPanel px={0}>
            <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
              {/* Left: Input Form */}
              <Card>
                <CardBody p={5}>
                  <Heading size="xs" textTransform="uppercase" color="gray.400" mb={3} letterSpacing="wider">
                    📄 Job Description Input
                  </Heading>

                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.300" mb={1}>Select from Tracked Opportunities</FormLabel>
                      <Select size="sm" value={selectedJobId} onChange={handleSelectJob}>
                        <option value="">-- Or Paste Custom Job Description Below --</option>
                        {jobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.title} @ {j.company}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel fontSize="xs" color="gray.300" mb={1}>Job Description Text</FormLabel>
                      <Textarea
                        size="sm"
                        rows={14}
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        placeholder="Paste the full job description here..."
                      />
                    </FormControl>

                    <Button variant="solid" colorScheme="purple" size="md" leftIcon={<FiZap />} isLoading={analyzing} onClick={handleAnalyze}>
                      Run Deep ATS Analysis
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              {/* Right: Results */}
              <Card>
                <CardBody p={5}>
                  <Heading size="xs" textTransform="uppercase" color="gray.400" mb={3} letterSpacing="wider">
                    📊 Analysis & Match Results
                  </Heading>

                  {matchResult ? (
                    <VStack spacing={5} align="stretch">
                      {/* Score Header */}
                      <Flex align="center" justify="space-between" p={4} bg="blackAlpha.300" borderRadius="lg" border="1px solid rgba(255,255,255,0.08)">
                        <Box>
                          <Text fontSize="xs" color="gray.400" textTransform="uppercase" fontWeight="700">ATS Match Compatibility</Text>
                          <Heading size="lg" color={score >= 80 ? 'green.400' : score >= 70 ? 'cyan.400' : 'yellow.400'}>
                            {score}% Compatibility
                          </Heading>
                          <Text fontSize="xs" color="gray.300" mt={1}>
                            Role: <b>{analysisResult?.role || 'Software Engineer'}</b> • Level: <b>{analysisResult?.experience_level || 'Mid-Senior'}</b>
                          </Text>
                        </Box>
                        <CircularProgress value={score} size="72px" thickness="10px" color={score >= 80 ? 'green.400' : 'cyan.400'}>
                          <CircularProgressLabel fontWeight="bold" fontSize="sm">{score}%</CircularProgressLabel>
                        </CircularProgress>
                      </Flex>

                      {/* Matched Skills */}
                      <Box>
                        <Text fontSize="xs" fontWeight="700" color="green.300" mb={2}>
                          ✅ Matched Technical Skills ({matchResult.matched_skills?.length || 0}):
                        </Text>
                        <HStack spacing={1.5} wrap="wrap">
                          {matchResult.matched_skills && matchResult.matched_skills.length > 0 ? (
                            matchResult.matched_skills.map((s) => (
                              <Tag key={s} size="sm" colorScheme="green">{s}</Tag>
                            ))
                          ) : (
                            <Text fontSize="xs" color="gray.500">None detected</Text>
                          )}
                        </HStack>
                      </Box>

                      {/* Missing Skills */}
                      <Box>
                        <Text fontSize="xs" fontWeight="700" color="yellow.300" mb={2}>
                          ⚠️ Missing Target Skills ({matchResult.missing_skills?.length || 0}):
                        </Text>
                        <HStack spacing={1.5} wrap="wrap">
                          {matchResult.missing_skills && matchResult.missing_skills.length > 0 ? (
                            matchResult.missing_skills.map((s) => (
                              <Tag key={s} size="sm" colorScheme="yellow">{s}</Tag>
                            ))
                          ) : (
                            <Text fontSize="xs" color="gray.500">All target skills matched!</Text>
                          )}
                        </HStack>
                      </Box>

                      {/* Extracted Requirements */}
                      {analysisResult?.requirements && (
                        <Box>
                          <Text fontSize="xs" fontWeight="700" color="gray.300" mb={1.5}>
                            📋 Key Requirements Extracted:
                          </Text>
                          <VStack align="stretch" spacing={1}>
                            {analysisResult.requirements.slice(0, 5).map((req, i) => (
                              <Text key={i} fontSize="xs" color="gray.400">• {req}</Text>
                            ))}
                          </VStack>
                        </Box>
                      )}
                    </VStack>
                  ) : (
                    <Flex minH="400px" align="center" justify="center" direction="column" color="gray.500" textAlign="center">
                      <Text fontSize="2xl" mb={2}>🔍</Text>
                      <Text fontSize="sm">Paste a job description on the left and click "Run Deep ATS Analysis".</Text>
                    </Flex>
                  )}
                </CardBody>
              </Card>
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
