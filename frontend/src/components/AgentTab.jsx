import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Checkbox,
  VStack,
  HStack,
  Badge,
  Progress,
  useToast,
  Card,
  CardBody,
  Divider,
  Tag,
  FormControl,
  FormLabel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Code,
  Link,
  Tooltip,
} from '@chakra-ui/react'
import {
  FiCpu,
  FiPlay,
  FiSquare,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertTriangle,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiMail,
  FiUsers,
  FiTerminal,
  FiTrash2,
} from 'react-icons/fi'
import { api } from '../api'

export default function AgentTab({ onNavigateTab, onSelectJobForCv, onSelectJobForCoverLetter, onOpenOutreachForContact }) {
  const toast = useToast()
  const terminalBottomRef = useRef(null)

  // Mission Config
  const [targetRoles, setTargetRoles] = useState('Full Stack Developer, Python Developer, Software Engineer')
  const [targetCompanies, setTargetCompanies] = useState('Sandisk, Amazon, Swiggy, Zepto, Google, Razorpay')
  const [targetLocation, setTargetLocation] = useState('Bengaluru, Karnataka, India')
  const [minThreshold, setMinThreshold] = useState('75')
  const [autoTailor, setAutoTailor] = useState(true)
  const [autoHr, setAutoHr] = useState(true)
  const [autoPipeline, setAutoPipeline] = useState(true)

  // LLM Config
  const [llmProvider, setLlmProvider] = useState('ollama')
  const [llmUrl, setLlmUrl] = useState('http://localhost:11434')
  const [llmModel, setLlmModel] = useState('llama3.2')
  const [testingModel, setTestingModel] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [modelStatus, setModelStatus] = useState(null)
  const [detectedModels, setDetectedModels] = useState([])

  // Agent State & Polling
  const [agentStatus, setAgentStatus] = useState({
    state: 'idle',
    progress_pct: 0,
    phase_num: 1,
    current_phase: 'Phase 1/6',
    current_step: 'Ready for mission',
    logs: [],
    deliverables: [],
    hr_leads: [],
    stats: { vacancies_crawled: 0, evaluated_count: 0, high_match_count: 0, tailored_count: 0 },
  })

  // Load Initial Status and Config
  useEffect(() => {
    loadInitialConfig()
    loadInitialStatus()
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentStatus?.logs?.length])

  // Polling loop when running
  useEffect(() => {
    let interval = null
    if (agentStatus.state === 'running') {
      interval = setInterval(async () => {
        try {
          const res = await api.getAgentStatus()
          if (res.success && (res.status || res.agent)) {
            const s = res.status || res.agent
            setAgentStatus(s)
            if (s.state !== 'running') {
              if (s.state === 'completed') {
                toast({ title: 'Agent Mission Complete!', status: 'success', duration: 4000 })
              }
            }
          }
        } catch (err) {
          console.error(err)
        }
      }, 1200)
    }
    return () => clearInterval(interval)
  }, [agentStatus.state])

  const loadInitialConfig = async () => {
    try {
      const res = await api.getAgentConfig()
      if (res.success && res.config) {
        setLlmProvider(res.config.provider || 'ollama')
        setLlmUrl(res.config.base_url || 'http://localhost:11434')
        setLlmModel(res.config.model_name || 'llama3.2')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadInitialStatus = async () => {
    try {
      const res = await api.getAgentStatus()
      if (res.success && (res.status || res.agent)) {
        setAgentStatus(res.status || res.agent)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleTestLocalModel = async () => {
    setTestingModel(true)
    try {
      const res = await api.testLocalModel({
        provider: llmProvider,
        base_url: llmUrl,
        model_name: llmModel,
      })
      if (res.success && res.connected) {
        setModelStatus({ connected: true, msg: `Connected to ${llmUrl}` })
        setDetectedModels(res.available_models || [])
        toast({ title: 'Local Model Online & Responsive!', status: 'success', duration: 3000 })
      } else {
        setModelStatus({ connected: false, msg: `Server unreachable at ${llmUrl}` })
        toast({
          title: 'Local Server Offline',
          description: 'Agent will use built-in heuristic ATS intelligence until started.',
          status: 'warning',
          duration: 4000,
        })
      }
    } catch (err) {
      setModelStatus({ connected: false, msg: err.message })
    } finally {
      setTestingModel(false)
    }
  }

  const handleSaveLlmConfig = async () => {
    setSavingConfig(true)
    try {
      await api.saveAgentConfig({
        provider: llmProvider,
        base_url: llmUrl,
        model_name: llmModel,
      })
      toast({ title: 'LLM Configuration Saved!', status: 'success', duration: 2500 })
    } catch (err) {
      toast({ title: 'Failed saving config', description: err.message, status: 'error' })
    } finally {
      setSavingConfig(false)
    }
  }

  const handleLaunchMission = async () => {
    try {
      const res = await api.runAgent({
        target_roles: targetRoles,
        target_companies: targetCompanies,
        target_location: targetLocation,
        min_match_threshold: parseFloat(minThreshold),
        auto_tailor_cv: autoTailor,
        auto_discover_hr: autoHr,
        auto_apply_pipeline: autoPipeline,
      })
      if (res.success) {
        setAgentStatus(prev => ({ ...prev, state: 'running', progress_pct: 5, current_step: 'Initializing Mission...' }))
        toast({ title: 'Autonomous Agent Launched!', description: 'Running multi-phase pipeline in background.', status: 'success', duration: 3500 })
      } else {
        toast({ title: 'Launch Failed', description: res.error, status: 'error' })
      }
    } catch (err) {
      toast({ title: 'Error launching agent', description: err.message, status: 'error' })
    }
  }

  const handleStopMission = async () => {
    try {
      await api.stopAgent()
      toast({ title: 'Abort Signal Sent', status: 'info', duration: 3000 })
    } catch (err) {
      toast({ title: 'Failed to stop agent', description: err.message, status: 'error' })
    }
  }

  const applyPreset = (preset) => {
    if (preset === 'full_hunt') {
      setTargetRoles('Full Stack Developer, Python Developer, Software Engineer')
      setTargetCompanies('Sandisk, Amazon, Swiggy, Zepto, Google, Razorpay, Flipkart, CRED')
      setMinThreshold('75')
      setAutoTailor(true)
      setAutoHr(true)
      setAutoPipeline(true)
    } else if (preset === 'target_companies') {
      setTargetRoles('Software Engineer, Backend Developer, SDE')
      setTargetCompanies('Sandisk, Swiggy, Zepto, Razorpay')
      setMinThreshold('70')
      setAutoTailor(true)
      setAutoHr(true)
      setAutoPipeline(true)
    } else if (preset === 'fast_tailor') {
      setTargetRoles('Software Engineer')
      setTargetCompanies('Sandisk, Amazon')
      setMinThreshold('65')
      setAutoTailor(true)
      setAutoHr(false)
      setAutoPipeline(true)
    }
    toast({ title: 'Preset Applied', status: 'info', duration: 2000 })
  }

  const phaseNames = [
    '1. Init & Local LLM',
    '2. Portal Crawl',
    '3. Local Model Eval',
    '4. LaTeX CV Tailor',
    '5. HR & Referral Scout',
    '6. Pipeline Sync'
  ]

  const isRunning = agentStatus.state === 'running'

  return (
    <Box maxW="1500px" mx="auto" py={4}>
      {/* Hero Agent Banner */}
      <Card bgGradient="linear(to-r, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.12), rgba(6, 182, 212, 0.1))" mb={6} borderColor="rgba(99, 102, 241, 0.35)">
        <CardBody p={5}>
          <Flex justify="space-between" align={{ base: 'start', md: 'center' }} wrap="wrap" gap={4}>
            <Box>
              <Flex align="center" gap={3}>
                <Heading size="md" color="white" fontWeight="800">
                  🤖 JobPulse Autonomous Agent
                </Heading>
                <Badge
                  colorScheme={isRunning ? 'purple' : agentStatus.state === 'completed' ? 'green' : 'gray'}
                  variant="solid"
                  px={2.5}
                  py={1}
                >
                  {isRunning ? '⚡ Running' : agentStatus.state === 'completed' ? '✅ Complete' : '🟢 Ready'}
                </Badge>
              </Flex>
              <Text fontSize="sm" color="gray.300" mt={1} maxW="800px">
                Autonomous end-to-end mission: Crawls target portals, executes deep evaluation with your <b>Local Model</b> (Ollama / LM Studio), auto-tailors ATS LaTeX resumes & cover letters, and scouts verified recruiter leads into your pipeline.
              </Text>
            </Box>

            <HStack spacing={3}>
              <Badge colorScheme="cyan" variant="outline" p={2} borderRadius="lg" fontSize="xs">
                ⚡ Local Engine: {llmProvider.toUpperCase()} ({llmModel})
              </Badge>
            </HStack>
          </Flex>
        </CardBody>
      </Card>

      {/* Grid: Directives (Left) & Local Model Settings (Right) */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6} mb={6}>
        {/* Left: Mission Directives */}
        <Card>
          <CardBody p={5}>
            <Heading size="xs" textTransform="uppercase" color="gray.400" mb={3} letterSpacing="wider">
              🎯 Mission Directives & Targets
            </Heading>

            {/* Presets */}
            <HStack spacing={2} mb={4} wrap="wrap">
              <Text fontSize="xs" color="gray.400" fontWeight="600">Presets:</Text>
              <Button size="xs" variant="outline" onClick={() => applyPreset('full_hunt')}>🚀 Full Auto-Pilot</Button>
              <Button size="xs" variant="outline" onClick={() => applyPreset('target_companies')}>🏢 Bengaluru Tech Deep</Button>
              <Button size="xs" variant="outline" onClick={() => applyPreset('fast_tailor')}>⚡ Fast Tailor</Button>
            </HStack>

            <VStack spacing={3} align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="xs" color="gray.300" mb={1}>Target Roles (Multi-Role Supported)</FormLabel>
                <Input size="sm" value={targetRoles} onChange={(e) => setTargetRoles(e.target.value)} isDisabled={isRunning} />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" color="gray.300" mb={1}>Target Companies (Multi-Company Supported)</FormLabel>
                <Input size="sm" value={targetCompanies} onChange={(e) => setTargetCompanies(e.target.value)} isDisabled={isRunning} />
              </FormControl>

              <HStack spacing={3}>
                <FormControl flex={2}>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Location</FormLabel>
                  <Input size="sm" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} isDisabled={isRunning} />
                </FormControl>
                <FormControl flex={1.2}>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Min ATS Match</FormLabel>
                  <Select size="sm" value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)} isDisabled={isRunning}>
                    <option value="60">60% (Broad)</option>
                    <option value="70">70% (Standard)</option>
                    <option value="75">75% (Recommended)</option>
                    <option value="85">85% (Strict)</option>
                  </Select>
                </FormControl>
              </HStack>

              <Box bg="blackAlpha.300" p={3} borderRadius="lg" border="1px solid rgba(255,255,255,0.06)">
                <Text fontSize="xs" fontWeight="700" color="white" mb={2}>Auto-Pilot Capabilities:</Text>
                <VStack align="start" spacing={1.5}>
                  <Checkbox size="sm" colorScheme="purple" isChecked={autoTailor} onChange={(e) => setAutoTailor(e.target.checked)}>
                    Auto-tailor ATS LaTeX Resumes for top jobs (STAR formula)
                  </Checkbox>
                  <Checkbox size="sm" colorScheme="purple" isChecked={autoHr} onChange={(e) => setAutoHr(e.target.checked)}>
                    Auto-discover HR recruiters & draft connection pitches
                  </Checkbox>
                  <Checkbox size="sm" colorScheme="purple" isChecked={autoPipeline} onChange={(e) => setAutoPipeline(e.target.checked)}>
                    Auto-queue opportunities into spreadsheet application tracker
                  </Checkbox>
                </VStack>
              </Box>

              <HStack spacing={3} pt={2}>
                {!isRunning ? (
                  <Button variant="gradient" size="md" flex={1} leftIcon={<FiPlay />} onClick={handleLaunchMission}>
                    Launch Autonomous Mission
                  </Button>
                ) : (
                  <Button colorScheme="red" size="md" flex={1} leftIcon={<FiSquare />} onClick={handleStopMission}>
                    Abort Mission
                  </Button>
                )}
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Right: Local Model Configuration */}
        <Card>
          <CardBody p={5}>
            <Heading size="xs" textTransform="uppercase" color="gray.400" mb={3} letterSpacing="wider">
              🖥️ Local Model Engine Configuration
            </Heading>
            <Text fontSize="xs" color="gray.400" mb={3}>
              Run 100% private, free AI evaluations via Ollama or LM Studio.
            </Text>

            <VStack spacing={3} align="stretch">
              <FormControl>
                <FormLabel fontSize="xs" color="gray.300" mb={1}>Provider</FormLabel>
                <Select size="sm" value={llmProvider} onChange={(e) => {
                  setLlmProvider(e.target.value)
                  if (e.target.value === 'ollama') {
                    setLlmUrl('http://localhost:11434')
                    setLlmModel('llama3.2')
                  } else if (e.target.value === 'local_openai') {
                    setLlmUrl('http://localhost:1234/v1')
                    setLlmModel('local-model')
                  }
                }}>
                  <option value="ollama">Ollama (Native Local - Default: localhost:11434)</option>
                  <option value="local_openai">LM Studio / Local OpenAI (Default: localhost:1234/v1)</option>
                  <option value="gemini">Google Gemini 1.5 Flash (Cloud Fallback)</option>
                </Select>
              </FormControl>

              <HStack spacing={3}>
                <FormControl flex={2}>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Base URL</FormLabel>
                  <Input size="sm" value={llmUrl} onChange={(e) => setLlmUrl(e.target.value)} />
                </FormControl>
                <FormControl flex={1.5}>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Model Name</FormLabel>
                  <Input size="sm" value={llmModel} onChange={(e) => setLlmModel(e.target.value)} />
                </FormControl>
              </HStack>

              <HStack spacing={2} pt={1}>
                <Button size="sm" variant="outline" leftIcon={<FiRefreshCw className={testingModel ? 'spin' : ''} />} isLoading={testingModel} onClick={handleTestLocalModel}>
                  Test Connection & Detect Models
                </Button>
                <Button size="sm" variant="outline" isLoading={savingConfig} onClick={handleSaveLlmConfig}>
                  Save Config
                </Button>
              </HStack>

              {/* Status Message Card */}
              <Box bg="blackAlpha.400" p={3} borderRadius="lg" border="1px solid rgba(255,255,255,0.08)">
                <Flex align="center" gap={2} mb={1}>
                  {modelStatus?.connected ? (
                    <Text fontSize="xs" fontWeight="700" color="green.300">✅ Online & Responsive</Text>
                  ) : (
                    <Text fontSize="xs" fontWeight="700" color="yellow.300">🔍 Local Model Server</Text>
                  )}
                </Flex>
                <Text fontSize="xs" color="gray.300">
                  {modelStatus?.msg || 'Click "Test Connection" above to probe your running local LLM server.'}
                </Text>
                {detectedModels.length > 0 && (
                  <Box mt={2}>
                    <Text fontSize="2xs" color="gray.400" mb={1}>Detected Models (Click to use):</Text>
                    <HStack spacing={1.5} wrap="wrap">
                      {detectedModels.map((m) => (
                        <Tag key={m} size="sm" colorScheme="purple" cursor="pointer" onClick={() => setLlmModel(m)}>
                          {m}
                        </Tag>
                      ))}
                    </HStack>
                  </Box>
                )}
              </Box>

              <Box bg="rgba(99, 102, 241, 0.08)" p={2.5} borderRadius="md" borderLeft="3px solid #6366f1" fontSize="2xs" color="gray.300">
                💡 <b>To start Ollama locally:</b> Open terminal and run <code>ollama run llama3.2</code> or <code>ollama run deepseek-r1</code>.
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </Grid>

      {/* Live Mission Telemetry & Terminal */}
      <Card mb={6}>
        <CardBody p={5}>
          <Flex justify="space-between" align="center" mb={3} wrap="wrap" gap={2}>
            <Box>
              <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider">
                📡 Live Mission Progress & Telemetry
              </Heading>
              <Text fontSize="sm" color="white" fontWeight="600" mt={0.5}>
                {agentStatus.current_phase || 'Phase 1/6'}: <Text as="span" color="cyan.300" fontWeight="400">{agentStatus.current_step}</Text>
              </Text>
            </Box>
            <Badge colorScheme="cyan" fontSize="sm" px={3} py={1}>
              {agentStatus.progress_pct || 0}% Complete
            </Badge>
          </Flex>

          <Progress value={agentStatus.progress_pct || 0} size="sm" colorScheme="purple" borderRadius="full" mb={4} hasStripe={isRunning} isAnimated={isRunning} />

          {/* Phase Pills */}
          <HStack spacing={2} mb={4} wrap="wrap">
            {phaseNames.map((name, idx) => {
              const num = idx + 1
              const currentNum = agentStatus.phase_num || 1
              const isPast = num < currentNum
              const isCurrent = num === currentNum
              return (
                <Tag
                  key={name}
                  size="sm"
                  colorScheme={isCurrent ? 'purple' : isPast ? 'green' : 'gray'}
                  variant={isCurrent ? 'solid' : isPast ? 'subtle' : 'outline'}
                  fontWeight={isCurrent ? '700' : '500'}
                  fontSize="2xs"
                >
                  {name}
                </Tag>
              )
            })}
          </HStack>

          {/* Hacker Terminal */}
          <Box
            bg="#07090e"
            border="1px solid rgba(255, 255, 255, 0.12)"
            borderRadius="lg"
            p={3.5}
            fontFamily="mono"
            fontSize="xs"
            maxH="240px"
            overflowY="auto"
          >
            <Flex justify="space-between" align="center" pb={2} mb={2} borderBottom="1px solid rgba(255,255,255,0.06)">
              <HStack spacing={1.5}>
                <Box w="9px" h="9px" borderRadius="full" bg="#f43f5e" />
                <Box w="9px" h="9px" borderRadius="full" bg="#fbbf24" />
                <Box w="9px" h="9px" borderRadius="full" bg="#10b981" />
                <Text fontSize="2xs" color="gray.500" pl={2}>jobpulse-agent@local:~$ telemetry</Text>
              </HStack>
              <Button size="2xs" variant="ghost" onClick={() => setAgentStatus(prev => ({ ...prev, logs: [] }))}>Clear</Button>
            </Flex>

            <VStack align="stretch" spacing={1}>
              {agentStatus.logs && agentStatus.logs.length > 0 ? (
                agentStatus.logs.map((log, i) => (
                  <Flex key={i} gap={2} fontSize="11.5px">
                    <Text color="gray.600">[{log.timestamp || '00:00:00'}]</Text>
                    <Text
                      fontWeight="700"
                      color={
                        log.level === 'success'
                          ? 'green.400'
                          : log.level === 'warning'
                          ? 'yellow.400'
                          : log.level === 'error'
                          ? 'red.400'
                          : 'cyan.400'
                      }
                    >
                      [{(log.level || 'INFO').toUpperCase()}]
                    </Text>
                    <Text color="gray.200">{log.message}</Text>
                  </Flex>
                ))
              ) : (
                <Text color="gray.500">[SYS] Ready. Click Launch to begin execution.</Text>
              )}
              <div ref={terminalBottomRef} />
            </VStack>
          </Box>
        </CardBody>
      </Card>

      {/* Deliverables Section */}
      {agentStatus.deliverables && agentStatus.deliverables.length > 0 && (
        <Card mb={6}>
          <CardBody p={5}>
            <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
              <Box>
                <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider">
                  🏆 Mission Deliverables ({agentStatus.deliverables.length} Qualified Opportunities)
                </Heading>
                <Text fontSize="xs" color="gray.400">
                  Resumes tailored with STAR formula bullet points ready for application.
                </Text>
              </Box>

              <HStack spacing={2}>
                <Button size="sm" variant="outline" onClick={() => onNavigateTab('pipeline')}>
                  Open Pipeline Spreadsheet 📋
                </Button>
              </HStack>
            </Flex>

            <Box overflowX="auto" border="1px solid rgba(255,255,255,0.08)" borderRadius="lg">
              <Table variant="simple" size="sm">
                <Thead bg="blackAlpha.400">
                  <Tr>
                    <Th color="gray.400" width="110px">Match</Th>
                    <Th color="gray.400">Opportunity</Th>
                    <Th color="gray.400">Company</Th>
                    <Th color="gray.400">Location</Th>
                    <Th color="gray.400">Tailored Resume</Th>
                    <Th color="gray.400" textAlign="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {agentStatus.deliverables.map((job) => {
                    const score = job.match_score || 75
                    return (
                      <Tr key={job.id || job.title} _hover={{ bg: 'whiteAlpha.50' }}>
                        <Td>
                          <Badge
                            colorScheme={score >= 80 ? 'green' : score >= 70 ? 'cyan' : 'yellow'}
                            fontSize="xs"
                            fontWeight="800"
                          >
                            {score}% Match
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontWeight="600" color="white">{job.title}</Text>
                          {job.missing_keywords && job.missing_keywords.length > 0 && (
                            <Text fontSize="2xs" color="gray.400">
                              Keywords: {job.missing_keywords.slice(0, 3).join(', ')}
                            </Text>
                          )}
                        </Td>
                        <Td>
                          <Text color="cyan.300" fontWeight="600">{job.company}</Text>
                        </Td>
                        <Td color="gray.300" fontSize="xs">
                          {job.location || 'Bengaluru, India'}
                        </Td>
                        <Td>
                          {job.tailored_tex ? (
                            <HStack spacing={1.5}>
                              <Button
                                size="xs"
                                variant="outline"
                                leftIcon={<FiFileText />}
                                onClick={() => onSelectJobForCv(job.id, job.tailored_tex)}
                              >
                                Studio
                              </Button>
                              <Button
                                as="a"
                                href={`/api/latex/download/${encodeURIComponent(job.tailored_tex)}`}
                                download
                                size="xs"
                                colorScheme="green"
                              >
                                .tex
                              </Button>
                              {job.pdf_filename && (
                                <Button
                                  as="a"
                                  href={`/api/latex/download/${encodeURIComponent(job.pdf_filename)}`}
                                  download
                                  size="xs"
                                  colorScheme="cyan"
                                >
                                  PDF
                                </Button>
                              )}
                            </HStack>
                          ) : (
                            <Text fontSize="2xs" color="gray.500">Standard CV</Text>
                          )}
                        </Td>
                        <Td textAlign="right">
                          <HStack spacing={1.5} justify="flex-end">
                            <Button
                              size="xs"
                              variant="outline"
                              leftIcon={<FiMail />}
                              onClick={() => onSelectJobForCoverLetter(job)}
                            >
                              Cover Letter
                            </Button>
                            {job.apply_url && (
                              <Button
                                as="a"
                                href={job.apply_url}
                                target="_blank"
                                size="xs"
                                variant="gradient"
                                rightIcon={<FiExternalLink />}
                              >
                                Apply
                              </Button>
                            )}
                          </HStack>
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </Box>
          </CardBody>
        </Card>
      )}

      {/* Discovered HR Leads */}
      {agentStatus.hr_leads && agentStatus.hr_leads.length > 0 && (
        <Card>
          <CardBody p={5}>
            <Heading size="xs" textTransform="uppercase" color="gray.400" mb={3} letterSpacing="wider">
              👥 Discovered Recruiter Leads & Drafted Outreach
            </Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
              {agentStatus.hr_leads.map((lead) => (
                <Card key={lead.id || lead.name} bg="blackAlpha.300" borderColor="rgba(99, 102, 241, 0.25)">
                  <CardBody p={4}>
                    <Flex justify="space-between" align="start">
                      <Box>
                        <Text fontWeight="700" color="white" fontSize="sm">{lead.name}</Text>
                        <Text fontSize="xs" color="cyan.300" fontWeight="600">
                          {lead.role_category || 'Recruiter'} @ {lead.company}
                        </Text>
                        <Text fontSize="xs" color="gray.400" mt={1}>
                          {lead.headline}
                        </Text>
                        {lead.predicted_email && (
                          <Text fontSize="2xs" color="gray.400" mt={1}>
                            📧 <code>{lead.predicted_email}</code>
                          </Text>
                        )}
                      </Box>
                      <Badge colorScheme="purple">Verified Lead</Badge>
                    </Flex>
                    <HStack spacing={2} mt={3}>
                      {lead.profile_url && (
                        <Button as="a" href={lead.profile_url} target="_blank" size="xs" variant="outline" leftIcon={<FiExternalLink />}>
                          LinkedIn
                        </Button>
                      )}
                      <Button size="xs" variant="gradient" leftIcon={<FiMail />} onClick={() => onOpenOutreachForContact(lead)}>
                        View Referral Pitch
                      </Button>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </Grid>
          </CardBody>
        </Card>
      )}
    </Box>
  )
}
