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
  Checkbox,
  VStack,
  HStack,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Card,
  CardBody,
  useToast,
  Tag,
  FormControl,
  FormLabel,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Textarea,
} from '@chakra-ui/react'
import {
  FiCompass,
  FiSearch,
  FiExternalLink,
  FiTrash2,
  FiCheckCircle,
  FiMail,
  FiFileText,
  FiZap,
  FiShield,
  FiCpu,
  FiInfo,
  FiCode,
} from 'react-icons/fi'
import { api } from '../api'

export default function DiscoveryTab({ userProfile, refreshJobs, onSelectJobForCv, onSelectJobForCoverLetter, onFindHrForCompany }) {
  const toast = useToast()

  // Free MCP Search state
  const defaultRoles = userProfile?.target_roles?.length
    ? (Array.isArray(userProfile.target_roles) ? userProfile.target_roles.join(', ') : userProfile.target_roles)
    : (userProfile?.title || 'Software Engineer, Python Developer')
  const defaultLoc = userProfile?.location || 'Bengaluru, India'

  const [mcpRole, setMcpRole] = useState(defaultRoles)
  const [mcpLocation, setMcpLocation] = useState('')
  const [mcpCompany, setMcpCompany] = useState('')
  const [mcpMax, setMcpMax] = useState('15')
  const [loadingMcp, setLoadingMcp] = useState(false)

  // Direct MCP URL Scraper state
  const [mcpUrl, setMcpUrl] = useState('')
  const [loadingMcpUrl, setLoadingMcpUrl] = useState(false)
  const [mcpUrlResult, setMcpUrlResult] = useState(null)
  const { isOpen: isUrlModalOpen, onOpen: onOpenUrlModal, onClose: onCloseUrlModal } = useDisclosure()

  // Google Search state
  const [googleRole, setGoogleRole] = useState(defaultRoles)
  const [googleLocation, setGoogleLocation] = useState(defaultLoc)
  const [googleMax, setGoogleMax] = useState('15')
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  // Streamed Results
  const [discoveredJobs, setDiscoveredJobs] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastMetrics, setLastMetrics] = useState(null)

  // Synchronize when user switches profile
  React.useEffect(() => {
    if (userProfile?.title) {
      const roles = userProfile.target_roles?.length
        ? (Array.isArray(userProfile.target_roles) ? userProfile.target_roles.join(', ') : userProfile.target_roles)
        : userProfile.title
      setMcpRole(roles)
      setGoogleRole(roles)
    }
  }, [userProfile])

  // --- FREE MCP SCRAPER HANDLER ---
  const handleScrapeMcp = async (e) => {
    e.preventDefault()
    setLoadingMcp(true)
    try {
      const res = await api.scrapeMcp({
        role: mcpRole,
        location: mcpLocation,
        company: mcpCompany.trim() || undefined,
        max_results: parseInt(mcpMax),
        auto_save: true,
      })

      if (res.success && res.jobs) {
        setDiscoveredJobs(res.jobs)
        setLastMetrics({
          total: res.count,
          newCount: res.new_count,
          duplicatesSkipped: res.duplicates_skipped,
          engine: res.engine || 'Free MCP Official ATS Engine',
        })

        toast({
          title: `Free MCP: ${res.count} Live Jobs Retrieved`,
          description: `Added ${res.new_count} new jobs. Skipped ${res.duplicates_skipped} duplicates (already present).`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        })
        refreshJobs()
      } else {
        toast({ title: 'MCP Search', description: res.error || 'No jobs found.', status: 'warning' })
      }
    } catch (err) {
      toast({ title: 'MCP Scraping Error', description: err.message, status: 'error' })
    } finally {
      setLoadingMcp(false)
    }
  }

  // --- FREE MCP URL SCRAPER HANDLER ---
  const handleScrapeUrlMcp = async (e) => {
    e.preventDefault()
    if (!mcpUrl.trim()) return
    setLoadingMcpUrl(true)
    try {
      const res = await api.scrapeMcpUrl({ url: mcpUrl.trim() })
      if (res.success) {
        setMcpUrlResult(res)
        onOpenUrlModal()
        toast({ title: 'Page Scraped via MCP!', status: 'success', duration: 2500 })
      } else {
        toast({ title: 'MCP URL Error', description: res.error || 'Failed to scrape URL', status: 'error' })
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' })
    } finally {
      setLoadingMcpUrl(false)
    }
  }

  // --- GOOGLE SEARCH HANDLER ---
  const handleScrapeGoogle = async (e) => {
    e.preventDefault()
    setLoadingGoogle(true)
    try {
      const res = await api.scrapeGoogle({
        role: googleRole,
        location: googleLocation,
        max_results: parseInt(googleMax),
        auto_save: true,
      })
      if (res.success && res.jobs) {
        setDiscoveredJobs(res.jobs)
        setLastMetrics({
          total: res.count,
          newCount: res.new_count ?? res.jobs.length,
          duplicatesSkipped: res.duplicates_skipped ?? 0,
          engine: 'Target Career Engines',
        })
        toast({
          title: `Found ${res.jobs.length} jobs!`,
          description: `Added ${res.new_count ?? res.jobs.length} new. Skipped ${res.duplicates_skipped ?? 0} duplicates.`,
          status: 'success',
          duration: 3500,
        })
        refreshJobs()
      } else {
        toast({ title: 'Search Note', description: res.error || 'No jobs found.', status: 'warning' })
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' })
    } finally {
      setLoadingGoogle(false)
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === discoveredJobs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(discoveredJobs.map((j) => j.id || j.canonical_key)))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    try {
      await api.deleteJobsBatch(Array.from(selectedIds))
      setDiscoveredJobs((prev) => prev.filter((j) => !selectedIds.has(j.id)))
      setSelectedIds(new Set())
      toast({ title: 'Deleted selected jobs', status: 'info', duration: 2000 })
      refreshJobs()
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, status: 'error' })
    }
  }

  return (
    <Box maxW="1500px" mx="auto" py={4}>
      {/* Top Banner: Free MCP Server & Duplicate Protection Status */}
      <Card
        mb={6}
        bgGradient="linear(to-r, rgba(16, 185, 129, 0.12), rgba(99, 102, 241, 0.12))"
        borderColor="rgba(16, 185, 129, 0.3)"
      >
        <CardBody p={4}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <HStack spacing={3}>
              <Box p={2} bg="emerald.500" bgAlpha="0.2" borderRadius="lg" color="green.400">
                <FiZap size={22} />
              </Box>
              <Box>
                <HStack spacing={2}>
                  <Heading size="xs" color="white" textTransform="uppercase" letterSpacing="wider">
                    Model Context Protocol (MCP) Scraper Engine
                  </Heading>
                  <Badge colorScheme="green" variant="solid" fontSize="10px">100% Free</Badge>
                  <Badge colorScheme="purple" variant="outline" fontSize="10px">Zero Bot Blocks</Badge>
                </HStack>
                <Text fontSize="xs" color="gray.300" mt={0.5}>
                  Scrapes official public ATS feeds (Greenhouse, Lever) directly. <b>Strict Duplicate Protection active</b>: existing jobs are never re-added to jobs.db.
                </Text>
              </Box>
            </HStack>

            <HStack spacing={3}>
              <Badge colorScheme="green" px={3} py={1} borderRadius="full" fontSize="xs">
                ● MCP Server Active: jobpulse-mcp-scraper
              </Badge>
            </HStack>
          </Flex>
        </CardBody>
      </Card>

      {/* Discovery Workspaces Grid */}
      <Grid templateColumns={{ base: '1fr', lg: '2fr 1.2fr' }} gap={6} mb={6}>
        {/* Method 1: Free MCP Live ATS Scraper */}
        <Card border="1px solid rgba(16, 185, 129, 0.3)">
          <CardBody p={5}>
            <Flex align="center" justify="space-between" mb={2}>
              <HStack spacing={2}>
                <Heading size="xs" textTransform="uppercase" color="green.300" letterSpacing="wider">
                  ⚡ Method 1: Free MCP Live ATS Feed Scraper
                </Heading>
                <Badge colorScheme="green">Primary Free</Badge>
              </HStack>
              <Badge colorScheme="cyan" variant="subtle" fontSize="10px">Greenhouse • Lever • Official Portals</Badge>
            </Flex>
            <Text fontSize="xs" color="gray.400" mb={4}>
              Directly queries high-signal, live job feeds from verified tech company portals. Never blocked by Cloudflare or rate limits.
            </Text>

            <form onSubmit={handleScrapeMcp}>
              <VStack spacing={3} align="stretch">
                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Target Role / Keywords</FormLabel>
                    <Input
                      size="sm"
                      value={mcpRole}
                      onChange={(e) => setMcpRole(e.target.value)}
                      placeholder="e.g. Software Engineer, Full Stack, Python"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Target Company (Optional)</FormLabel>
                    <Input
                      size="sm"
                      value={mcpCompany}
                      onChange={(e) => setMcpCompany(e.target.value)}
                      placeholder="e.g. GitHub, Stripe, Datadog, Figma, or leave blank"
                    />
                  </FormControl>
                </Grid>

                <HStack spacing={3}>
                  <FormControl flex={2}>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Location (Optional)</FormLabel>
                    <Input
                      size="sm"
                      value={mcpLocation}
                      onChange={(e) => setMcpLocation(e.target.value)}
                      placeholder="e.g. Remote, Bengaluru, San Francisco, or blank"
                    />
                  </FormControl>

                  <FormControl maxW="120px">
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Max Count</FormLabel>
                    <Select size="sm" value={mcpMax} onChange={(e) => setMcpMax(e.target.value)}>
                      <option value="10">10 Jobs</option>
                      <option value="15">15 Jobs</option>
                      <option value="25">25 Jobs</option>
                      <option value="40">40 Jobs</option>
                    </Select>
                  </FormControl>

                  <Button
                    type="submit"
                    variant="solid"
                    size="sm"
                    colorScheme="green"
                    flex={1}
                    alignSelf="flex-end"
                    isLoading={loadingMcp}
                    leftIcon={<FiZap />}
                  >
                    Scrape via Free MCP
                  </Button>
                </HStack>

                {/* 15 Shortlisted Priority Target Companies Quick Selector */}
                <Box pt={2} borderTop="1px solid rgba(255,255,255,0.06)">
                  <Text fontSize="11px" color="gray.400" mb={1.5} fontWeight="600">
                    🎯 Shortlisted Target Companies (₹9 LPA+ Bengaluru/Hyderabad):
                  </Text>
                  <HStack spacing={1.5} wrap="wrap">
                    {['Amazon', 'Walmart Global Tech', 'Visa', 'American Express', 'Oracle', 'Salesforce', 'Intuit', 'ServiceNow', 'PhonePe', 'Razorpay', 'Flipkart', 'Swiggy', 'Meesho', 'Freshworks', 'JPMorganChase'].map((comp) => (
                      <Tag
                        key={comp}
                        size="xs"
                        variant="subtle"
                        colorScheme={mcpCompany.toLowerCase() === comp.toLowerCase() ? "green" : "purple"}
                        cursor="pointer"
                        _hover={{ bg: "purple.600", color: "white" }}
                        onClick={() => {
                          setMcpCompany(comp)
                          if (!mcpLocation) setMcpLocation('Bengaluru')
                        }}
                      >
                        {comp}
                      </Tag>
                    ))}
                  </HStack>
                </Box>
              </VStack>
            </form>
          </CardBody>
        </Card>

        {/* Method 2: Inspect Any URL via Free MCP */}
        <Card>
          <CardBody p={5}>
            <Flex align="center" justify="space-between" mb={2}>
              <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider">
                🔍 Method 2: Inspect Job URL via Free MCP
              </Heading>
              <Badge colorScheme="purple">URL Parser</Badge>
            </Flex>
            <Text fontSize="xs" color="gray.400" mb={3}>
              Extracts clean JD text and tech skills from any posting URL using MCP.
            </Text>

            <form onSubmit={handleScrapeUrlMcp}>
              <VStack spacing={3} align="stretch">
                <FormControl isRequired>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Job Posting URL</FormLabel>
                  <Input
                    size="sm"
                    value={mcpUrl}
                    onChange={(e) => setMcpUrl(e.target.value)}
                    placeholder="https://boards.greenhouse.io/... or https://jobs.lever.co/..."
                  />
                </FormControl>

                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  colorScheme="purple"
                  isLoading={loadingMcpUrl}
                  leftIcon={<FiSearch />}
                >
                  Extract via MCP Tool
                </Button>
              </VStack>
            </form>

            <Box mt={4} pt={3} borderTop="1px solid rgba(255,255,255,0.08)">
              <Text fontSize="11px" color="gray.400">
                🛡️ <b>Duplicate Protection Rule:</b> Every job checked by canonical key, clean normalized URL, and normalized company + title. Existing jobs are protected and skipped.
              </Text>
            </Box>
          </CardBody>
        </Card>
      </Grid>

      {/* Metrics Banner */}
      {lastMetrics && (
        <Card mb={5} bg="blackAlpha.400" borderColor="rgba(255,255,255,0.1)">
          <CardBody p={3}>
            <HStack spacing={6} justify="space-around" wrap="wrap">
              <HStack>
                <Text fontSize="xs" color="gray.400">Total Scraped:</Text>
                <Badge colorScheme="blue" fontSize="sm">{lastMetrics.total}</Badge>
              </HStack>
              <HStack>
                <Text fontSize="xs" color="gray.400">New Added to jobs.db:</Text>
                <Badge colorScheme="green" fontSize="sm">+{lastMetrics.newCount}</Badge>
              </HStack>
              <HStack>
                <Text fontSize="xs" color="gray.400">Duplicates Skipped (Zero Re-add):</Text>
                <Badge colorScheme="yellow" fontSize="sm">🛡️ {lastMetrics.duplicatesSkipped} Protected</Badge>
              </HStack>
              <HStack>
                <Text fontSize="xs" color="gray.400">Engine:</Text>
                <Text fontSize="xs" color="gray.200" fontWeight="600">{lastMetrics.engine}</Text>
              </HStack>
            </HStack>
          </CardBody>
        </Card>
      )}

      {/* Discovered Opportunities Grid */}
      {discoveredJobs.length > 0 && (
        <Card>
          <CardBody p={5}>
            <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
              <Box>
                <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider">
                  📊 Discovered Stream ({discoveredJobs.length} Opportunities)
                </Heading>
                <Text fontSize="xs" color="gray.400">
                  Opportunities auto-synced to your application tracker with duplicate protection.
                </Text>
              </Box>

              {selectedIds.size > 0 && (
                <HStack spacing={2}>
                  <Badge colorScheme="purple">{selectedIds.size} Selected</Badge>
                  <Button size="xs" colorScheme="red" leftIcon={<FiTrash2 />} onClick={handleBatchDelete}>
                    Delete Selected
                  </Button>
                </HStack>
              )}
            </Flex>

            <Box overflowX="auto" border="1px solid rgba(255,255,255,0.08)" borderRadius="lg">
              <Table variant="simple" size="sm">
                <Thead bg="blackAlpha.400">
                  <Tr>
                    <Th width="40px" textAlign="center">
                      <Checkbox
                        size="sm"
                        colorScheme="purple"
                        isChecked={selectedIds.size === discoveredJobs.length && discoveredJobs.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </Th>
                    <Th color="gray.400" width="105px">Status</Th>
                    <Th color="gray.400" width="85px">Match</Th>
                    <Th color="gray.400">Role Title</Th>
                    <Th color="gray.400">Company</Th>
                    <Th color="gray.400">Skills / Stack</Th>
                    <Th color="gray.400">Location</Th>
                    <Th color="gray.400" textAlign="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {discoveredJobs.map((j, idx) => {
                    const score = j.match_score || 75
                    const isDup = j.is_duplicate
                    const key = j.id || j.canonical_key || idx
                    return (
                      <Tr key={key} _hover={{ bg: 'whiteAlpha.50' }}>
                        <Td textAlign="center">
                          <Checkbox
                            size="sm"
                            colorScheme="purple"
                            isChecked={selectedIds.has(j.id || key)}
                            onChange={() => toggleSelect(j.id || key)}
                          />
                        </Td>
                        <Td>
                          {isDup ? (
                            <Badge colorScheme="yellow" fontSize="10px">
                              🛡️ Duplicate (Skipped)
                            </Badge>
                          ) : (
                            <Badge colorScheme="green" fontSize="10px">
                              ✨ New Job Added
                            </Badge>
                          )}
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={score >= 80 ? 'green' : score >= 70 ? 'cyan' : 'yellow'}
                            fontSize="xs"
                            fontWeight="800"
                          >
                            {score}%
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontWeight="600" color="white">{j.title}</Text>
                        </Td>
                        <Td>
                          <Text color="cyan.300" fontWeight="600">{j.company}</Text>
                        </Td>
                        <Td maxW="200px">
                          <HStack spacing={1} wrap="wrap">
                            {(Array.isArray(j.skills) ? j.skills : []).slice(0, 3).map((sk) => (
                              <Tag key={sk} size="xs" colorScheme="purple">{sk}</Tag>
                            ))}
                          </HStack>
                        </Td>
                        <Td color="gray.300" fontSize="xs">
                          {j.location || 'Remote / Worldwide'}
                        </Td>
                        <Td textAlign="right">
                          <HStack spacing={1.5} justify="flex-end">
                            {j.id && (
                              <>
                                <Button size="xs" variant="outline" leftIcon={<FiFileText />} onClick={() => onSelectJobForCv(j.id)}>
                                  CV
                                </Button>
                                <Button size="xs" variant="outline" leftIcon={<FiMail />} onClick={() => onSelectJobForCoverLetter(j)}>
                                  Letter
                                </Button>
                              </>
                            )}
                            {j.job_url && (
                              <Button as="a" href={j.job_url} target="_blank" size="xs" variant="gradient">
                                Apply ↗
                              </Button>
                            )}
                            <Button size="xs" variant="outline" onClick={() => onFindHrForCompany(j.company)}>
                              👥 HR
                            </Button>
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

      {/* Modal: MCP URL Scraping Details */}
      <Modal isOpen={isUrlModalOpen} onClose={onCloseUrlModal} size="xl">
        <ModalOverlay />
        <ModalContent bg="dark.surface" borderColor="rgba(255,255,255,0.1)">
          <ModalHeader color="white">
            <HStack spacing={2}>
              <FiZap color="#10B981" />
              <Text>Scraped via Free MCP Tool</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {mcpUrlResult && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase">URL</Text>
                  <Text fontSize="xs" color="cyan.300" wordBreak="break-all">{mcpUrlResult.url}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase">Extracted Title</Text>
                  <Heading size="sm" color="white">{mcpUrlResult.title || 'Job Posting'}</Heading>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase" mb={1}>Extracted Tech Skills</Text>
                  <HStack spacing={1.5} wrap="wrap">
                    {mcpUrlResult.skills?.length > 0 ? (
                      mcpUrlResult.skills.map((s) => <Tag key={s} size="sm" colorScheme="green">{s}</Tag>)
                    ) : (
                      <Text fontSize="xs" color="gray.400">None detected</Text>
                    )}
                  </HStack>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase" mb={1}>Clean Description Preview</Text>
                  <Textarea
                    size="xs"
                    rows={10}
                    isReadOnly
                    value={mcpUrlResult.description}
                  />
                </Box>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}
