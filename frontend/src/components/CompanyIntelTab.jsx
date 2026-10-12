import React, { useState, useEffect } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Input,
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
  Switch,
  Spinner,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tooltip,
  SimpleGrid,
} from '@chakra-ui/react'
import {
  FiCompass,
  FiSearch,
  FiRefreshCw,
  FiCopy,
  FiExternalLink,
  FiUsers,
  FiMail,
  FiCheckCircle,
  FiTerminal,
  FiCpu,
  FiLayers,
  FiAward
} from 'react-icons/fi'
import { api } from '../api'

export default function CompanyIntelTab({ onNavigateToCoverLetter, onFindHrForCompany }) {
  const toast = useToast()

  const [companyName, setCompanyName] = useState('Sandisk')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [humanPacing, setHumanPacing] = useState(true)
  const [crawling, setCrawling] = useState(false)
  const [dossier, setDossier] = useState(null)
  const [crawlLogs, setCrawlLogs] = useState([])
  const [recentCompanies, setRecentCompanies] = useState([])

  const sampleCompanies = ['Sandisk', 'Swiggy', 'Amazon', 'Zepto', 'Razorpay', 'Google', 'Flipkart']

  useEffect(() => {
    loadRecentResearched()
  }, [])

  const loadRecentResearched = async () => {
    try {
      const res = await api.listCompanyResearch()
      if (res.success && Array.isArray(res.companies)) {
        setRecentCompanies(res.companies)
      }
    } catch (e) {
      console.warn('Failed to load recent research:', e)
    }
  }

  const handleCrawl = async (targetCompany = companyName) => {
    if (!targetCompany.trim()) return
    setCrawling(true)
    setCrawlLogs([
      `[Init] 👤 Human-like Web Crawler initialized for '${targetCompany}'...`,
      `[Init] 🛡️ Persona: Desktop Chrome 128 / macOS with human jitter pacing (${humanPacing ? 'Enabled 1.5s' : 'Fast Mode'})...`
    ])
    setDossier(null)

    try {
      const res = await api.researchCompany({
        company: targetCompany.trim(),
        website: websiteUrl.trim(),
        human_pacing: humanPacing,
        force_refresh: true
      })

      if (res.success && res.dossier) {
        setDossier(res.dossier)
        setCrawlLogs(res.crawl_logs || [])
        toast({
          title: 'Intelligence Dossier Compiled!',
          description: `Extracted products, clients, and talking points for ${targetCompany}.`,
          status: 'success',
          duration: 3500,
          isClosable: true,
        })
        loadRecentResearched()
      } else {
        toast({
          title: 'Research Note',
          description: res.message || 'Could not complete full crawl.',
          status: 'warning',
          duration: 4000,
        })
      }
    } catch (err) {
      toast({
        title: 'Crawl Error',
        description: err.message,
        status: 'error',
        duration: 4000,
      })
    } finally {
      setCrawling(false)
    }
  }

  const handleSelectRecent = async (cName) => {
    setCompanyName(cName)
    try {
      const res = await api.getCompanyResearch(cName)
      if (res.success && res.dossier) {
        setDossier(res.dossier)
        setCrawlLogs([`Loaded cached intelligence dossier for ${cName}.`])
      }
    } catch (err) {
      console.warn(err)
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

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={4} mb={6}>
        <Box>
          <HStack spacing={3} mb={1}>
            <Heading size="lg" fontWeight="800" letterSpacing="-0.02em">
              Company Deep Intel & Human Crawler
            </Heading>
            <Badge colorScheme="purple" variant="solid" px={2} py={0.5} borderRadius="md" fontSize="xs">
              HUMAN BOT v2.5
            </Badge>
          </HStack>
          <Text color="gray.400" fontSize="sm">
            Agent navigates company websites with human browsing patterns to extract products, clients, tech stack, and interview talking points.
          </Text>
        </Box>
      </Flex>

      {/* Main Responsive Grid */}
      <Grid templateColumns={{ base: '1fr', lg: '380px 1fr' }} gap={6} alignItems="start">
        {/* Left Column: Crawler Controls & Realtime Telemetry */}
        <VStack spacing={5} align="stretch">
          {/* Search Controls Card */}
          <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
            <CardBody p={5}>
              <VStack spacing={4} align="stretch">
                <Heading size="xs" textTransform="uppercase" letterSpacing="0.05em" color="brand.300">
                  Target Company Website
                </Heading>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.400">Company Name</FormLabel>
                  <Input
                    size="sm"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Sandisk, Swiggy, Razorpay"
                    fontWeight="600"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.400">Official URL (Optional)</FormLabel>
                  <Input
                    size="sm"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="e.g. https://www.westerndigital.com"
                  />
                </FormControl>

                <Flex justify="space-between" align="center" pt={1}>
                  <Box>
                    <Text fontSize="xs" fontWeight="600" color="gray.300">Human-Pacing Delays</Text>
                    <Text fontSize="2xs" color="gray.500">Randomized 1.2s - 2.5s jittered eye-reading</Text>
                  </Box>
                  <Switch
                    isChecked={humanPacing}
                    onChange={(e) => setHumanPacing(e.target.checked)}
                    colorScheme="purple"
                    size="sm"
                  />
                </Flex>

                <Button
                  variant="gradient"
                  size="md"
                  leftIcon={crawling ? <Spinner size="xs" /> : <FiSearch />}
                  isLoading={crawling}
                  loadingText="Crawling Like a Human..."
                  onClick={() => handleCrawl(companyName)}
                  w="full"
                >
                  Start Human Web Investigation
                </Button>

                {/* Popular Presets */}
                <Box pt={2}>
                  <Text fontSize="2xs" color="gray.500" mb={2} textTransform="uppercase" fontWeight="700">
                    Quick Targets:
                  </Text>
                  <Flex wrap="wrap" gap={1.5}>
                    {sampleCompanies.map((c) => (
                      <Tag
                        key={c}
                        size="sm"
                        cursor="pointer"
                        variant={companyName.toLowerCase() === c.toLowerCase() ? 'solid' : 'subtle'}
                        colorScheme={companyName.toLowerCase() === c.toLowerCase() ? 'purple' : 'gray'}
                        onClick={() => {
                          setCompanyName(c)
                          handleCrawl(c)
                        }}
                        _hover={{ opacity: 0.8 }}
                      >
                        {c}
                      </Tag>
                    ))}
                  </Flex>
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Realtime Crawler Terminal Stream */}
          <Card bg="blackAlpha.700" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
            <CardBody p={4}>
              <Flex justify="space-between" align="center" mb={2}>
                <HStack spacing={2}>
                  <FiTerminal color="#a855f7" />
                  <Text fontSize="xs" fontWeight="700" color="gray.300">Live Crawler Telemetry</Text>
                </HStack>
                {crawling && <Badge colorScheme="green" fontSize="2xs">ACTIVE</Badge>}
              </Flex>
              <Box
                bg="#05070a"
                p={3}
                borderRadius="md"
                border="1px solid rgba(255,255,255,0.05)"
                minH="200px"
                maxH="300px"
                overflowY="auto"
                fontFamily="mono"
                fontSize="2xs"
                color="green.300"
              >
                {crawlLogs.length === 0 ? (
                  <Text color="gray.600">Crawler idle. Launch an investigation to see live human navigation telemetry...</Text>
                ) : (
                  crawlLogs.map((log, idx) => (
                    <Box key={idx} mb={1} whiteSpace="pre-wrap" wordBreak="break-word">
                      {log}
                    </Box>
                  ))
                )}
              </Box>
            </CardBody>
          </Card>

          {/* Researched Registry History */}
          {recentCompanies.length > 0 && (
            <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
              <CardBody p={4}>
                <Heading size="2xs" textTransform="uppercase" color="gray.400" mb={3}>
                  Researched Dossiers ({recentCompanies.length})
                </Heading>
                <VStack spacing={2} align="stretch" maxH="180px" overflowY="auto">
                  {recentCompanies.map((item, i) => (
                    <Flex
                      key={i}
                      justify="space-between"
                      align="center"
                      p={2}
                      borderRadius="md"
                      bg="rgba(255,255,255,0.02)"
                      _hover={{ bg: 'rgba(255,255,255,0.06)' }}
                      cursor="pointer"
                      onClick={() => handleSelectRecent(item.company_name)}
                    >
                      <Box>
                        <Text fontSize="xs" fontWeight="700" color="gray.200">{item.company_name}</Text>
                        <Text fontSize="2xs" color="gray.500">{item.industry || 'Technology'}</Text>
                      </Box>
                      <Badge colorScheme="purple" fontSize="2xs">
                        {item.products_count || 1} Products
                      </Badge>
                    </Flex>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>

        {/* Right Column: Dossier Display */}
        <Box>
          {!dossier && !crawling && (
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
              <Box fontSize="4xl">🏢</Box>
              <Heading size="md" color="gray.300">No Company Researched Yet</Heading>
              <Text color="gray.500" fontSize="sm" maxW="450px">
                Enter a target company name and click "Start Human Web Investigation". The crawler will scan their home, about, product, and client pages to generate a full executive intelligence report.
              </Text>
              <Button
                variant="outline"
                size="sm"
                mt={2}
                onClick={() => handleCrawl('Sandisk')}
              >
                Inspect Sample Target: Sandisk
              </Button>
            </Flex>
          )}

          {crawling && !dossier && (
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
              <Spinner size="xl" color="brand.500" thickness="3px" speed="0.8s" />
              <Heading size="sm" color="gray.200">Human-Like Exploration in Progress...</Heading>
              <Text color="gray.400" fontSize="xs" maxW="400px" textAlign="center">
                Scanning homepage, following internal navigation to products, case studies, and reading customer partner logos with randomized human delays.
              </Text>
            </Flex>
          )}

          {dossier && (
            <VStack spacing={5} align="stretch">
              {/* Executive Summary Card */}
              <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
                <CardBody p={5}>
                  <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap={2} mb={2}>
                    <HStack spacing={2.5}>
                      <Heading size="md" fontWeight="800" color="white">
                        {dossier.company_name}
                      </Heading>
                      {dossier.official_url && (
                        <Tooltip label="Visit Official Site">
                          <Button
                            as="a"
                            href={dossier.official_url}
                            target="_blank"
                            size="xs"
                            variant="ghost"
                            colorScheme="purple"
                            leftIcon={<FiExternalLink />}
                          >
                            Website
                          </Button>
                        </Tooltip>
                      )}
                    </HStack>
                    <HStack spacing={2}>
                      <Badge colorScheme="cyan" variant="subtle" fontSize="2xs">
                        {dossier.industry || 'Technology'}
                      </Badge>
                      <Badge colorScheme="purple" variant="solid" fontSize="2xs">
                        {dossier.source || 'AI Intelligence'}
                      </Badge>
                    </HStack>
                  </Flex>

                  {dossier.tagline && (
                    <Text fontSize="sm" color="brand.300" fontWeight="600" mb={3}>
                      "{dossier.tagline}"
                    </Text>
                  )}

                  <Text fontSize="sm" color="gray.300" lineHeight="tall" mb={4}>
                    {dossier.overview}
                  </Text>

                  {dossier.mission_and_values && (
                    <Box p={3} bg="rgba(255,255,255,0.02)" borderRadius="md" borderLeft="3px solid" borderColor="brand.500" mb={4}>
                      <Text fontSize="2xs" color="gray.400" fontWeight="700" textTransform="uppercase" mb={0.5}>
                        Mission & Values
                      </Text>
                      <Text fontSize="xs" color="gray.300">
                        {dossier.mission_and_values}
                      </Text>
                    </Box>
                  )}

                  {/* Action Buttons */}
                  <Flex wrap="wrap" gap={2} pt={2}>
                    <Button
                      size="sm"
                      variant="gradient"
                      leftIcon={<FiMail />}
                      onClick={() => onNavigateToCoverLetter && onNavigateToCoverLetter({ company: dossier.company_name })}
                    >
                      Use in Cover Letter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<FiUsers />}
                      onClick={() => onFindHrForCompany && onFindHrForCompany(dossier.company_name)}
                    >
                      Find Recruiters
                    </Button>
                  </Flex>
                </CardBody>
              </Card>

              {/* Products & Offerings Grid */}
              <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
                <CardBody p={5}>
                  <Flex align="center" gap={2} mb={4}>
                    <FiLayers color="#6366f1" />
                    <Heading size="sm" fontWeight="700">Flagship Products & Offerings</Heading>
                    <Badge ml={1} colorScheme="purple" fontSize="2xs">
                      {(dossier.products || []).length} IDENTIFIED
                    </Badge>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    {(dossier.products || []).map((prod, idx) => (
                      <Box
                        key={idx}
                        p={3.5}
                        bg="rgba(255,255,255,0.02)"
                        borderRadius="lg"
                        border="1px solid rgba(255,255,255,0.05)"
                        _hover={{ borderColor: 'brand.500', bg: 'rgba(99, 102, 241, 0.04)' }}
                      >
                        <Text fontSize="xs" fontWeight="700" color="white" mb={1}>
                          📦 {prod.name}
                        </Text>
                        <Text fontSize="2xs" color="gray.400" lineHeight="base" mb={2}>
                          {prod.description}
                        </Text>
                        {prod.target_users && (
                          <Badge fontSize="3xs" colorScheme="gray" variant="outline">
                            Audience: {prod.target_users}
                          </Badge>
                        )}
                      </Box>
                    ))}
                  </SimpleGrid>
                </CardBody>
              </Card>

              {/* Key Clients & Customer Logos */}
              <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
                <CardBody p={5}>
                  <Flex align="center" gap={2} mb={4}>
                    <FiAward color="#10b981" />
                    <Heading size="sm" fontWeight="700">Key Clients, Customers & Case Studies</Heading>
                    <Badge ml={1} colorScheme="green" fontSize="2xs">
                      {(dossier.clients_and_customers || []).length} DETECTED
                    </Badge>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    {(dossier.clients_and_customers || []).map((client, idx) => (
                      <Box
                        key={idx}
                        p={3}
                        bg="rgba(255,255,255,0.02)"
                        borderRadius="md"
                        border="1px solid rgba(255,255,255,0.05)"
                      >
                        <Flex justify="space-between" align="center" mb={1}>
                          <Text fontSize="xs" fontWeight="700" color="green.300">
                            🤝 {client.name}
                          </Text>
                          {client.segment && (
                            <Badge colorScheme="green" variant="subtle" fontSize="3xs">
                              {client.segment}
                            </Badge>
                          )}
                        </Flex>
                        {client.context && (
                          <Text fontSize="2xs" color="gray.400">
                            {client.context}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </SimpleGrid>
                </CardBody>
              </Card>

              {/* Inferred Tech Stack & Culture */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
                  <CardBody p={4}>
                    <Heading size="xs" color="brand.300" textTransform="uppercase" mb={3}>
                      💻 Inferred Tech Stack
                    </Heading>
                    <Flex wrap="wrap" gap={1.5}>
                      {(dossier.tech_stack_inferred || []).map((tech, i) => (
                        <Tag key={i} size="sm" colorScheme="purple" variant="subtle">
                          {tech}
                        </Tag>
                      ))}
                    </Flex>
                  </CardBody>
                </Card>

                <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
                  <CardBody p={4}>
                    <Heading size="xs" color="cyan.300" textTransform="uppercase" mb={3}>
                      ⚡ Engineering Culture & Pace
                    </Heading>
                    <Text fontSize="xs" color="gray.300" lineHeight="tall">
                      {dossier.engineering_culture || 'Engineering-first, customer-driven, high-throughput microservices architecture.'}
                    </Text>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Interview & Outreach Cheat Sheet */}
              {dossier.interview_cheat_sheet && (
                <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
                  <CardBody p={5}>
                    <Heading size="sm" fontWeight="700" color="yellow.300" mb={4}>
                      🎯 High-Conversion Interview & Outreach Cheat Sheet
                    </Heading>

                    <VStack spacing={4} align="stretch">
                      {/* Why Us Hook */}
                      {dossier.interview_cheat_sheet.why_work_here_hook && (
                        <Box p={3.5} bg="rgba(0,0,0,0.3)" borderRadius="md" borderLeft="3px solid" borderColor="yellow.400">
                          <Flex justify="space-between" align="center" mb={1}>
                            <Text fontSize="2xs" fontWeight="700" color="yellow.200" textTransform="uppercase">
                              "Why Do You Want to Work Here?" Model Hook
                            </Text>
                            <Button
                              size="xs"
                              variant="ghost"
                              leftIcon={<FiCopy />}
                              onClick={() => copyText(dossier.interview_cheat_sheet.why_work_here_hook, 'Why Us Hook')}
                            >
                              Copy
                            </Button>
                          </Flex>
                          <Text fontSize="xs" color="gray.300">
                            {dossier.interview_cheat_sheet.why_work_here_hook}
                          </Text>
                        </Box>
                      )}

                      {/* Cover Letter Alignment Snippet */}
                      {dossier.interview_cheat_sheet.cover_letter_alignment_snippet && (
                        <Box p={3.5} bg="rgba(0,0,0,0.3)" borderRadius="md" borderLeft="3px solid" borderColor="brand.400">
                          <Flex justify="space-between" align="center" mb={1}>
                            <Text fontSize="2xs" fontWeight="700" color="brand.200" textTransform="uppercase">
                              Cover Letter Alignment Angle
                            </Text>
                            <Button
                              size="xs"
                              variant="ghost"
                              leftIcon={<FiCopy />}
                              onClick={() => copyText(dossier.interview_cheat_sheet.cover_letter_alignment_snippet, 'Cover Letter Hook')}
                            >
                              Copy
                            </Button>
                          </Flex>
                          <Text fontSize="xs" color="gray.300">
                            {dossier.interview_cheat_sheet.cover_letter_alignment_snippet}
                          </Text>
                        </Box>
                      )}

                      {/* Smart Questions to Ask */}
                      {dossier.interview_cheat_sheet.smart_questions_to_ask && (
                        <Box>
                          <Text fontSize="2xs" fontWeight="700" color="gray.400" textTransform="uppercase" mb={2}>
                            High-Signal Questions to Ask Their Hiring Manager:
                          </Text>
                          <VStack spacing={2} align="stretch">
                            {dossier.interview_cheat_sheet.smart_questions_to_ask.map((q, i) => (
                              <Flex key={i} p={2.5} bg="rgba(255,255,255,0.02)" borderRadius="md" justify="space-between" align="center">
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
                        </Box>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </VStack>
          )}
        </Box>
      </Grid>
    </Box>
  )
}
