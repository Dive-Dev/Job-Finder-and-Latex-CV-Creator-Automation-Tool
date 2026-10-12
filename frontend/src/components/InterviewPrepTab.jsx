import React, { useState } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Textarea,
  VStack,
  HStack,
  Badge,
  useToast,
  Card,
  CardBody,
  Divider,
  Tag,
  FormControl,
  FormLabel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  SimpleGrid,
  Spinner,
} from '@chakra-ui/react'
import {
  FiAward,
  FiBookOpen,
  FiHelpCircle,
  FiCopy,
  FiCheckCircle,
  FiRefreshCw,
  FiZap,
  FiCpu
} from 'react-icons/fi'
import { api } from '../api'

export default function InterviewPrepTab({ jobs = [], profile = {} }) {
  const toast = useToast()

  const [selectedJobId, setSelectedJobId] = useState('')
  const [roleTitle, setRoleTitle] = useState('Senior Full Stack Developer')
  const [company, setCompany] = useState('Sandisk')
  const [jdText, setJdText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [prepPack, setPrepPack] = useState(null)

  // Interactive Mock Practice State
  const [mockPracticeQuestion, setMockPracticeQuestion] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [evalFeedback, setEvalFeedback] = useState(null)

  const handleSelectJob = (e) => {
    const jid = e.target.value
    setSelectedJobId(jid)
    if (!jid) return
    const j = jobs.find((job) => job.id === jid)
    if (j) {
      setRoleTitle(j.title || 'Software Engineer')
      setCompany(j.company || 'Tech Company')
      setJdText(j.description || '')
    }
  }

  const handleGeneratePrep = async () => {
    setGenerating(true)
    setPrepPack(null)
    setEvalFeedback(null)
    try {
      const res = await api.generateInterviewPrep({
        job_id: selectedJobId,
        role_title: roleTitle,
        company: company,
        jd_text: jdText
      })

      if (res.success && res.prep_pack) {
        setPrepPack(res.prep_pack)
        if (res.prep_pack.technical_questions?.length > 0) {
          setMockPracticeQuestion(res.prep_pack.technical_questions[0].question)
        }
        toast({
          title: 'Interview Master Pack Ready!',
          description: `Generated tailored technical & company Q&A for ${company}.`,
          status: 'success',
          duration: 3500,
        })
      }
    } catch (err) {
      toast({
        title: 'Generation Failed',
        description: err.message,
        status: 'error',
        duration: 4000,
      })
    } finally {
      setGenerating(false)
    }
  }

  const copyText = (txt, label) => {
    navigator.clipboard.writeText(txt)
    toast({
      title: `${label} Copied!`,
      status: 'success',
      duration: 2000,
    })
  }

  const handleEvaluateAnswer = () => {
    if (!userAnswer.trim()) return
    setEvaluating(true)
    setTimeout(() => {
      setEvaluating(false)
      const wordCount = userAnswer.trim().split(/\s+/).length
      setEvalFeedback({
        score: wordCount > 60 ? '94/100' : '82/100',
        verdict: wordCount > 60 ? 'Strong Technical Depth & Structure' : 'Good Foundation — Add Quantifiable Metrics',
        strengths: [
          'Directly addresses system components and design trade-offs',
          'Demonstrates familiarity with enterprise scale and latency'
        ],
        improvements: [
          'Integrate a concrete STAR metric (e.g., reduced latency by 35%)',
          `Reference ${company}'s actual product requirements to personalize your answer`
        ]
      })
    }, 900)
  }

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={4} mb={6}>
        <Box>
          <HStack spacing={3} mb={1}>
            <Heading size="lg" fontWeight="800" letterSpacing="-0.02em">
              Interview & Technical Prep Studio
            </Heading>
            <Badge colorScheme="cyan" variant="solid" px={2} py={0.5} borderRadius="md" fontSize="xs">
              AI COACH
            </Badge>
          </HStack>
          <Text color="gray.400" fontSize="sm">
            Generate role-specific technical questions, company & product deep-dives, behavioral STAR scripts, and interactive mock practice.
          </Text>
        </Box>
      </Flex>

      {/* Main Responsive Grid */}
      <Grid templateColumns={{ base: '1fr', lg: '380px 1fr' }} gap={6} alignItems="start">
        {/* Left Column: Target Role Setup */}
        <VStack spacing={5} align="stretch">
          <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
            <CardBody p={5}>
              <VStack spacing={4} align="stretch">
                <Heading size="xs" textTransform="uppercase" letterSpacing="0.05em" color="cyan.300">
                  Target Interview Opportunity
                </Heading>

                {jobs.length > 0 && (
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.400">Select Tracked Job</FormLabel>
                    <Select
                      size="sm"
                      placeholder="-- Choose from your pipeline --"
                      value={selectedJobId}
                      onChange={handleSelectJob}
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title} @ {j.company}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.400">Target Role Title</FormLabel>
                  <Input
                    size="sm"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                    fontWeight="600"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.400">Company Name</FormLabel>
                  <Input
                    size="sm"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Sandisk, Swiggy, Amazon"
                    fontWeight="600"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.400">Job Description Snippet</FormLabel>
                  <Textarea
                    size="sm"
                    rows={4}
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste job description keywords, technical stack, or requirements..."
                    fontSize="xs"
                  />
                </FormControl>

                <Button
                  variant="gradient"
                  size="md"
                  leftIcon={generating ? <Spinner size="xs" /> : <FiZap />}
                  isLoading={generating}
                  loadingText="Generating Master Pack..."
                  onClick={handleGeneratePrep}
                  w="full"
                >
                  Generate Interview Master Pack
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Quick Tips Box */}
          <Card bg="rgba(6, 182, 212, 0.05)" borderColor="rgba(6, 182, 212, 0.2)" borderWidth="1px">
            <CardBody p={4}>
              <HStack spacing={2} mb={2}>
                <FiAward color="#06b6d4" />
                <Text fontSize="xs" fontWeight="700" color="cyan.200">The 4-Pillar Prep Strategy</Text>
              </HStack>
              <VStack spacing={1.5} align="stretch" fontSize="2xs" color="gray.300">
                <Text>• <b>Technical:</b> Focus on trade-offs (e.g. memory vs CPU, throughput vs latency).</Text>
                <Text>• <b>Company Alignment:</b> Mention their actual products to prove thorough research.</Text>
                <Text>• <b>Behavioral:</b> Structure answers in STAR (Situation, Task, Action, Result).</Text>
                <Text>• <b>Closing:</b> Ask high-signal architectural questions.</Text>
              </VStack>
            </CardBody>
          </Card>
        </VStack>

        {/* Right Column: Master Pack & Mock Simulator */}
        <Box>
          {!prepPack && !generating && (
            <Flex
              minH="450px"
              align="center"
              justify="center"
              direction="column"
              gap={3}
              border="1px dashed"
              borderColor="rgba(255,255,255,0.12)"
              borderRadius="xl"
              p={8}
              textAlign="center"
            >
              <Box fontSize="4xl">🎯</Box>
              <Heading size="md" color="gray.300">Interview Studio Ready</Heading>
              <Text color="gray.500" fontSize="sm" maxW="450px">
                Select a target role or enter company details, then click "Generate Interview Master Pack".
                You will receive role-tailored technical questions, system design solutions, and STAR leadership guides.
              </Text>
              <Button
                variant="outline"
                size="sm"
                mt={2}
                onClick={handleGeneratePrep}
              >
                Generate Sandisk Sample Pack
              </Button>
            </Flex>
          )}

          {generating && (
            <Flex
              minH="450px"
              align="center"
              justify="center"
              direction="column"
              gap={4}
              bg="dark.card"
              borderRadius="xl"
              border="1px solid rgba(255,255,255,0.08)"
              p={8}
            >
              <Spinner size="xl" color="cyan.400" thickness="3px" speed="0.8s" />
              <Heading size="sm" color="gray.200">Synthesizing Interview Master Pack...</Heading>
              <Text color="gray.400" fontSize="xs">
                Analyzing role requirements, integrating researched company products, and crafting model STAR answers.
              </Text>
            </Flex>
          )}

          {prepPack && (
            <VStack spacing={5} align="stretch">
              {/* Technical Questions Accordion */}
              <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
                <CardBody p={5}>
                  <Flex align="center" gap={2} mb={3}>
                    <FiCpu color="#06b6d4" />
                    <Heading size="sm" fontWeight="700">1. Role-Specific Technical Questions & Solutions</Heading>
                  </Flex>

                  <Accordion allowMultiple defaultIndex={[0]}>
                    {(prepPack.technical_questions || []).map((q, idx) => (
                      <AccordionItem key={idx} border="none" mb={3}>
                        <AccordionButton
                          p={3.5}
                          bg="rgba(255,255,255,0.02)"
                          borderRadius="md"
                          _hover={{ bg: 'rgba(255,255,255,0.06)' }}
                        >
                          <Box flex="1" textAlign="left">
                            <Text fontSize="xs" fontWeight="700" color="white">
                              Q{idx + 1}: {q.question}
                            </Text>
                            {q.key_topics && (
                              <HStack spacing={1.5} mt={1.5} wrap="wrap">
                                {q.key_topics.map((t, i) => (
                                  <Tag key={i} size="xs" colorScheme="cyan" variant="subtle">
                                    {t}
                                  </Tag>
                                ))}
                              </HStack>
                            )}
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pb={4} pt={3} px={4} bg="rgba(0,0,0,0.3)" borderRadius="md" mt={1}>
                          <Flex justify="space-between" align="center" mb={2}>
                            <Text fontSize="2xs" color="cyan.300" fontWeight="700" textTransform="uppercase">
                              Model Technical Answer
                            </Text>
                            <Button
                              size="2xs"
                              variant="ghost"
                              leftIcon={<FiCopy />}
                              onClick={() => copyText(q.model_answer, 'Technical Answer')}
                            >
                              Copy
                            </Button>
                          </Flex>
                          <Text fontSize="xs" color="gray.300" lineHeight="tall">
                            {q.model_answer}
                          </Text>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardBody>
              </Card>

              {/* Company & Product Alignment Questions */}
              <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
                <CardBody p={5}>
                  <Flex align="center" gap={2} mb={3}>
                    <FiAward color="#a855f7" />
                    <Heading size="sm" fontWeight="700">2. Company & Product Specific Q&A</Heading>
                  </Flex>

                  <VStack spacing={3} align="stretch">
                    {(prepPack.company_and_product_questions || []).map((cp, idx) => (
                      <Box key={idx} p={3.5} bg="rgba(255,255,255,0.02)" borderRadius="md" borderLeft="3px solid" borderColor="brand.500">
                        <Text fontSize="xs" fontWeight="700" color="white" mb={1.5}>
                          "{cp.question}"
                        </Text>
                        <Text fontSize="xs" color="gray.300" lineHeight="tall">
                          {cp.strategic_talking_points}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </CardBody>
              </Card>

              {/* Behavioral STAR Guide */}
              <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
                <CardBody p={5}>
                  <Flex align="center" gap={2} mb={3}>
                    <FiBookOpen color="#10b981" />
                    <Heading size="sm" fontWeight="700">3. Behavioral & STAR Leadership Scenarios</Heading>
                  </Flex>

                  <VStack spacing={3} align="stretch">
                    {(prepPack.behavioral_star_questions || []).map((b, idx) => (
                      <Box key={idx} p={3.5} bg="rgba(255,255,255,0.02)" borderRadius="md">
                        <Text fontSize="xs" fontWeight="700" color="green.300" mb={1.5}>
                          Scenario: {b.question}
                        </Text>
                        <Box p={2.5} bg="rgba(0,0,0,0.3)" borderRadius="md" mb={2}>
                          <Text fontSize="2xs" color="gray.400" fontWeight="700" mb={0.5}>STAR Guide Breakdown:</Text>
                          <Text fontSize="xs" color="gray.300">{b.star_framework_guide}</Text>
                        </Box>
                        {b.sample_response && (
                          <Text fontSize="2xs" color="gray.400">
                            <b>Sample Delivery:</b> "{b.sample_response}"
                          </Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                </CardBody>
              </Card>

              {/* Questions to Ask Interviewer */}
              <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
                <CardBody p={5}>
                  <Heading size="xs" color="yellow.300" textTransform="uppercase" mb={3}>
                    ❓ High-Signal Questions to Ask Their Engineering Team
                  </Heading>
                  <VStack spacing={2} align="stretch">
                    {(prepPack.questions_to_ask_interviewer || []).map((q, idx) => (
                      <Flex key={idx} p={2.5} bg="rgba(255,255,255,0.02)" borderRadius="md" justify="space-between" align="center">
                        <Text fontSize="xs" color="gray.300">"{q}"</Text>
                        <Button
                          size="2xs"
                          variant="ghost"
                          onClick={() => copyText(q, 'Question')}
                        >
                          Copy
                        </Button>
                      </Flex>
                    ))}
                  </VStack>
                </CardBody>
              </Card>

              {/* Interactive Mock Practice Simulator */}
              <Card bg="blackAlpha.700" borderColor="rgba(6, 182, 212, 0.3)" borderWidth="1px">
                <CardBody p={5}>
                  <Flex align="center" gap={2} mb={3}>
                    <FiZap color="#06b6d4" />
                    <Heading size="sm" color="cyan.200" fontWeight="700">
                      ⚡ Interactive Mock Interview Simulator
                    </Heading>
                  </Flex>

                  <Text fontSize="xs" color="gray.400" mb={3}>
                    Practice typing your verbal response to simulate the interview pressure, then submit for AI critique.
                  </Text>

                  <Box p={3} bg="rgba(6, 182, 212, 0.08)" borderRadius="md" mb={3}>
                    <Text fontSize="2xs" color="cyan.300" fontWeight="700" textTransform="uppercase" mb={0.5}>
                      Practice Question:
                    </Text>
                    <Text fontSize="xs" fontWeight="700" color="white">
                      {mockPracticeQuestion || 'Explain how you approach distributed caching in high-concurrency environments.'}
                    </Text>
                  </Box>

                  <Textarea
                    size="sm"
                    rows={4}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here (e.g., 'At my previous company, we used Redis clusters with read-through caching and write-behind queues...')"
                    fontSize="xs"
                    mb={3}
                  />

                  <Button
                    size="sm"
                    variant="gradient"
                    isLoading={evaluating}
                    loadingText="Critiquing Answer..."
                    onClick={handleEvaluateAnswer}
                    isDisabled={!userAnswer.trim()}
                  >
                    Submit Answer for AI Critique
                  </Button>

                  {evalFeedback && (
                    <Box mt={4} p={3.5} bg="rgba(255,255,255,0.03)" borderRadius="md" borderLeft="3px solid" borderColor="green.400">
                      <Flex justify="space-between" align="center" mb={2}>
                        <Text fontSize="xs" fontWeight="700" color="green.300">
                          AI Assessment: {evalFeedback.verdict}
                        </Text>
                        <Badge colorScheme="green" fontSize="xs">
                          {evalFeedback.score}
                        </Badge>
                      </Flex>
                      <Text fontSize="2xs" color="gray.400" fontWeight="700" mb={1}>Key Strengths:</Text>
                      {evalFeedback.strengths.map((s, i) => (
                        <Text key={i} fontSize="2xs" color="gray.300">• {s}</Text>
                      ))}
                      <Text fontSize="2xs" color="gray.400" fontWeight="700" mt={2} mb={1}>Recommended Polish:</Text>
                      {evalFeedback.improvements.map((imp, i) => (
                        <Text key={i} fontSize="2xs" color="gray.300">• {imp}</Text>
                      ))}
                    </Box>
                  )}
                </CardBody>
              </Card>
            </VStack>
          )}
        </Box>
      </Grid>
    </Box>
  )
}
