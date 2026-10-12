import React, { useState, useEffect } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Card,
  CardBody,
  Divider,
  Tag,
  FormControl,
  FormLabel,
} from '@chakra-ui/react'
import {
  FiMail,
  FiZap,
  FiDownload,
  FiExternalLink,
  FiCopy,
  FiCheck,
  FiEdit3,
  FiFileText
} from 'react-icons/fi'
import { api } from '../api'

export default function CoverLetterStudio({ jobs = [], profile = {} }) {
  const toast = useToast()
  
  // Selection & Inputs
  const [selectedJobId, setSelectedJobId] = useState('')
  const [company, setCompany] = useState('Sandisk')
  const [role, setRole] = useState('Senior Firmware Engineer')
  const [location, setLocation] = useState('Bengaluru, Karnataka, India')
  const [recipientName, setRecipientName] = useState('Engineering Hiring Team')
  const [recipientTitle, setRecipientTitle] = useState('Technical Talent Acquisition & Engineering Leadership')
  const [jobDescription, setJobDescription] = useState('')

  // Paragraphs
  const [opening, setOpening] = useState('')
  const [coreExperience, setCoreExperience] = useState('')
  const [valuesAndImpact, setValuesAndImpact] = useState('')
  const [closing, setClosing] = useState('')

  // Outputs
  const [latexCode, setLatexCode] = useState('')
  const [lastTexFilename, setLastTexFilename] = useState('CoverLetter_Tailored.tex')
  const [lastPdfFilename, setLastPdfFilename] = useState(null)
  const [overleafUrl, setOverleafUrl] = useState('')
  const [plainText, setPlainText] = useState('')

  // State
  const [generating, setGenerating] = useState(false)
  const [tailoringAi, setTailoringAi] = useState(false)

  // Populate when job selector changes
  const handleJobSelect = (e) => {
    const jid = e.target.value
    setSelectedJobId(jid)
    if (!jid) return
    const j = jobs.find((job) => job.id === jid)
    if (j) {
      setCompany(j.company || '')
      setRole(j.title || '')
      setLocation(j.location || 'Bengaluru, Karnataka, India')
      setJobDescription(j.description || '')
    }
  }

  // Generate / Tailor with AI
  const handleGenerateCoverLetter = async () => {
    setGenerating(true)
    try {
      const payload = {
        job_data: {
          company,
          title: role,
          location,
          description: jobDescription,
        },
        recipient_info: {
          name: recipientName,
          title: recipientTitle,
        },
        paragraphs: opening ? {
          opening,
          core_experience: coreExperience,
          values_and_impact: valuesAndImpact,
          closing,
        } : null,
      }

      const res = await api.generateCoverLetter(payload)
      if (res.success && res.result) {
        const r = res.result
        setLatexCode(r.latex_code || '')
        setLastTexFilename(r.tex_filename || 'CoverLetter_Tailored.tex')
        setLastPdfFilename(r.pdf_compiled ? r.tex_filename.replace('.tex', '.pdf') : null)
        setOverleafUrl(r.overleaf_url || '')
        setPlainText(r.plain_text || '')

        if (r.paragraphs) {
          setOpening(r.paragraphs.opening || '')
          setCoreExperience(r.paragraphs.core_experience || '')
          setValuesAndImpact(r.paragraphs.values_and_impact || '')
          setClosing(r.paragraphs.closing || '')
        }

        toast({
          title: 'Cover Letter Generated!',
          description: `Ready in LaTeX format (${r.tex_filename}).`,
          status: 'success',
          duration: 3500,
          isClosable: true,
        })
      } else {
        toast({
          title: 'Generation Failed',
          description: res.error || 'Failed to generate cover letter.',
          status: 'error',
          duration: 4000,
        })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 4000,
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyText = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast({
      title: `${label} Copied!`,
      status: 'success',
      duration: 2000,
    })
  }

  return (
    <Box maxW="1500px" mx="auto" py={4}>
      {/* Header Banner */}
      <Card bgGradient="linear(to-r, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))" mb={6} borderColor="rgba(99, 102, 241, 0.3)">
        <CardBody p={5}>
          <Flex justify="space-between" align={{ base: 'start', md: 'center' }} wrap="wrap" gap={4}>
            <Box>
              <Flex align="center" gap={2}>
                <Heading size="md" color="white" fontWeight="800">
                  ✉️ Executive Cover Letter Studio
                </Heading>
                <Tag colorScheme="purple" size="sm" fontWeight="700">
                  ATS LaTeX & Local LLM
                </Tag>
              </Flex>
              <Text fontSize="sm" color="gray.300" mt={1}>
                Generate highly tailored, non-cliché technical cover letters with STAR achievements matching the company's culture and engineering requirements.
              </Text>
            </Box>

            <HStack spacing={3}>
              <Button
                variant="gradient"
                size="md"
                leftIcon={<FiZap />}
                isLoading={generating}
                loadingText="Tailoring with Local Model..."
                onClick={handleGenerateCoverLetter}
              >
                Generate / AI Tailor
              </Button>
            </HStack>
          </Flex>
        </CardBody>
      </Card>

      {/* 2 Column Studio Layout */}
      <Grid templateColumns={{ base: '1fr', lg: '450px 1fr' }} gap={6}>
        {/* Left: Configuration & Paragraph Tuning */}
        <VStack spacing={5} align="stretch">
          {/* Target Opportunity */}
          <Card>
            <CardBody p={5}>
              <Heading size="xs" textTransform="uppercase" color="gray.400" mb={3} letterSpacing="wider">
                🎯 Target Opportunity
              </Heading>
              
              <VStack spacing={3} align="stretch">
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Select Tracked Job (Auto-Fill)</FormLabel>
                  <Select size="sm" value={selectedJobId} onChange={handleJobSelect}>
                    <option value="">-- Choose from Tracked Pipeline --</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} @ {j.company} ({j.match_score || 75}%)
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <HStack spacing={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Company Name</FormLabel>
                    <Input size="sm" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Sandisk, Amazon" />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Job Role Title</FormLabel>
                    <Input size="sm" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Firmware Engineer" />
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Location</FormLabel>
                  <Input size="sm" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bengaluru, Karnataka, India" />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Job Description Snippet (Optional Context)</FormLabel>
                  <Textarea
                    size="sm"
                    rows={3}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste key responsibilities or tech stack to align letter..."
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Addressee Info */}
          <Card>
            <CardBody p={5}>
              <Heading size="xs" textTransform="uppercase" color="gray.400" mb={3} letterSpacing="wider">
                👤 Addressee & Hiring Team
              </Heading>
              
              <VStack spacing={3} align="stretch">
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Recipient Name / Salutation</FormLabel>
                  <Input size="sm" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Technical Hiring Team, Sarah Jenkins" />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Recipient Title / Dept</FormLabel>
                  <Input size="sm" value={recipientTitle} onChange={(e) => setRecipientTitle(e.target.value)} placeholder="e.g. Talent Acquisition & Engineering Leadership" />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Paragraph Tune Accordion */}
          <Card>
            <CardBody p={5}>
              <Heading size="xs" textTransform="uppercase" color="gray.400" mb={3} letterSpacing="wider">
                ✍️ Tailored Paragraphs
              </Heading>

              <VStack spacing={3} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="700" color="brand.300" mb={1}>1. Opening Hook & Motivation</Text>
                  <Textarea size="xs" rows={3} value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="Click Generate to auto-draft with Local Model..." />
                </Box>
                <Box>
                  <Text fontSize="xs" fontWeight="700" color="brand.300" mb={1}>2. Technical Accomplishments</Text>
                  <Textarea size="xs" rows={3} value={coreExperience} onChange={(e) => setCoreExperience(e.target.value)} placeholder="Key accomplishments and tech skills..." />
                </Box>
                <Box>
                  <Text fontSize="xs" fontWeight="700" color="brand.300" mb={1}>3. Cultural Fit & Problem Solving</Text>
                  <Textarea size="xs" rows={3} value={valuesAndImpact} onChange={(e) => setValuesAndImpact(e.target.value)} placeholder="Why you align with company mission..." />
                </Box>
                <Box>
                  <Text fontSize="xs" fontWeight="700" color="brand.300" mb={1}>4. Closing & Interview Call to Action</Text>
                  <Textarea size="xs" rows={2} value={closing} onChange={(e) => setClosing(e.target.value)} placeholder="Call to action requesting discussion..." />
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </VStack>

        {/* Right: Live Preview & LaTeX Studio Tabs */}
        <Box>
          <Card minH="700px">
            <CardBody p={0}>
              <Tabs variant="enclosed" colorScheme="purple">
                <Flex justify="space-between" align="center" px={4} pt={3} borderBottom="1px solid rgba(255,255,255,0.08)" wrap="wrap" gap={2}>
                  <TabList borderBottom="none">
                    <Tab fontWeight="600" fontSize="xs">📄 Formatted Preview</Tab>
                    <Tab fontWeight="600" fontSize="xs">⚡ LaTeX Code (.tex)</Tab>
                    <Tab fontWeight="600" fontSize="xs">📋 Plain Text</Tab>
                  </TabList>

                  <HStack spacing={2} pb={2}>
                    <Button
                      size="xs"
                      variant="outline"
                      leftIcon={<FiCopy />}
                      onClick={() => handleCopyText(latexCode || plainText, 'Content')}
                    >
                      Copy
                    </Button>
                    <Button
                      as="a"
                      href={`/api/cover-letter/download/${encodeURIComponent(lastTexFilename)}`}
                      download
                      size="xs"
                      colorScheme="green"
                      leftIcon={<FiDownload />}
                      isDisabled={!latexCode}
                    >
                      Download .tex
                    </Button>
                    {lastPdfFilename && (
                      <Button
                        as="a"
                        href={`/api/cover-letter/download/${encodeURIComponent(lastPdfFilename)}`}
                        download
                        size="xs"
                        colorScheme="cyan"
                        leftIcon={<FiDownload />}
                      >
                        Download PDF
                      </Button>
                    )}
                    {overleafUrl && (
                      <Button
                        as="a"
                        href={overleafUrl}
                        target="_blank"
                        size="xs"
                        variant="gradient"
                        leftIcon={<FiExternalLink />}
                      >
                        Open Overleaf ↗
                      </Button>
                    )}
                  </HStack>
                </Flex>

                <TabPanels>
                  {/* Formatted Letter Preview */}
                  <TabPanel p={6}>
                    <Box
                      bg="white"
                      color="#1a202c"
                      p={{ base: 6, md: 10 }}
                      borderRadius="lg"
                      boxShadow="2xl"
                      fontFamily="'Times New Roman', Times, serif"
                      fontSize="14.5px"
                      lineHeight="1.6"
                      minH="600px"
                    >
                      {/* Letterhead Header */}
                      <Box textAlign="center" borderBottom="1px solid #cbd5e1" pb={4} mb={5}>
                        <Heading size="lg" color="#0f172a" fontFamily="'Times New Roman', serif" fontWeight="700">
                          {profile?.name || 'Alex Morgan'}
                        </Heading>
                        <Text fontSize="12.5px" color="#64748b" mt={1}>
                          {profile?.phone || '+1 (555) 234-5678'} • {profile?.email || 'alex.morgan@email.com'} • {profile?.location || 'Bengaluru, India'}
                        </Text>
                        <Text fontSize="12px" color="#6366f1" mt={0.5}>
                          {profile?.linkedin && `linkedin.com/in/${profile.linkedin}`} • {profile?.github && `github.com/${profile.github}`}
                        </Text>
                      </Box>

                      {/* Recipient & Date */}
                      <Box mb={5} fontSize="13px" color="#334155">
                        <Text fontWeight="600">Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                        <Text fontWeight="700" mt={2}>To: {recipientName || 'Hiring Team'}</Text>
                        <Text>{recipientTitle || 'Technical Talent Acquisition & Engineering Leadership'}</Text>
                        <Text fontWeight="700">{company}</Text>
                        <Text>{location}</Text>
                      </Box>

                      {/* Salutation */}
                      <Text fontWeight="700" mb={3}>
                        Dear {recipientName || `Hiring Team at ${company}`},
                      </Text>

                      {/* Body */}
                      <VStack spacing={4} align="stretch" textAlign="justify">
                        <Text>
                          {opening || (
                            <Text as="span" color="gray.400" fontStyle="italic">
                              [Opening hook will appear here. Click 'Generate / AI Tailor' above to draft tailored content using your Local Model.]
                            </Text>
                          )}
                        </Text>
                        <Text>
                          {coreExperience || (
                            <Text as="span" color="gray.400" fontStyle="italic">
                              [Core technical achievements and project metrics matching {company}'s tech stack...]
                            </Text>
                          )}
                        </Text>
                        <Text>
                          {valuesAndImpact || (
                            <Text as="span" color="gray.400" fontStyle="italic">
                              [Culture, collaborative engineering problem solving, and enthusiasm for {company}...]
                            </Text>
                          )}
                        </Text>
                        <Text>
                          {closing || (
                            <Text as="span" color="gray.400" fontStyle="italic">
                              [Professional closing call-to-action requesting an interview...]
                            </Text>
                          )}
                        </Text>
                      </VStack>

                      {/* Sign-off */}
                      <Box mt={6}>
                        <Text>Sincerely,</Text>
                        <Text fontWeight="700" mt={3}>{profile?.name || 'Alex Morgan'}</Text>
                        <Text fontSize="12.5px" color="#64748b">{profile?.title || 'Senior Full-Stack & Systems Engineer'}</Text>
                      </Box>
                    </Box>
                  </TabPanel>

                  {/* LaTeX Source Tab */}
                  <TabPanel p={4}>
                    <Textarea
                      value={latexCode || '% Click "Generate / AI Tailor" above to create ATS LaTeX code for this cover letter.'}
                      onChange={(e) => setLatexCode(e.target.value)}
                      fontFamily="mono"
                      fontSize="xs"
                      minH="580px"
                      bg="blackAlpha.600"
                      color="green.300"
                      borderColor="rgba(255,255,255,0.1)"
                    />
                  </TabPanel>

                  {/* Plain Text Tab */}
                  <TabPanel p={4}>
                    <Textarea
                      value={plainText || 'Plain text draft will appear here.'}
                      onChange={(e) => setPlainText(e.target.value)}
                      fontSize="sm"
                      minH="580px"
                      bg="blackAlpha.600"
                      color="gray.200"
                    />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>
        </Box>
      </Grid>
    </Box>
  )
}
