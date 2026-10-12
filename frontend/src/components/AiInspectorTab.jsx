import React, { useState } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Textarea,
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
} from '@chakra-ui/react'
import { FiZap, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { api } from '../api'

export default function AiInspectorTab({ jobs = [] }) {
  const toast = useToast()
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jdText, setJdText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [matchResult, setMatchResult] = useState(null)

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

  const score = matchResult?.score || 0

  return (
    <Box maxW="1500px" mx="auto" py={4}>
      <Card bgGradient="linear(to-r, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))" mb={6} borderColor="rgba(99, 102, 241, 0.3)">
        <CardBody p={5}>
          <Heading size="md" color="white" fontWeight="800">
            🔍 AI Job Description Inspector & ATS Matcher
          </Heading>
          <Text fontSize="sm" color="gray.300" mt={1}>
            Deeply analyze any job description against your profile. Identifies matched technical skills, experience requirements, and keyword gaps.
          </Text>
        </CardBody>
      </Card>

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

              <Button variant="gradient" size="md" leftIcon={<FiZap />} isLoading={analyzing} onClick={handleAnalyze}>
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
    </Box>
  )
}
