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
} from '@chakra-ui/react'
import {
  FiCompass,
  FiSearch,
  FiExternalLink,
  FiTrash2,
  FiCheckCircle,
  FiMail,
  FiFileText,
} from 'react-icons/fi'
import { api } from '../api'

export default function DiscoveryTab({ userProfile, refreshJobs, onSelectJobForCv, onSelectJobForCoverLetter, onFindHrForCompany }) {
  const toast = useToast()

  // LinkedIn Search state
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [linkedinMax, setLinkedinMax] = useState('15')
  const [loadingLinkedin, setLoadingLinkedin] = useState(false)

  // Auto-personalize from User Profile
  const defaultRoles = userProfile?.target_roles?.length
    ? (Array.isArray(userProfile.target_roles) ? userProfile.target_roles.join(', ') : userProfile.target_roles)
    : (userProfile?.title || 'Full Stack Developer, Python Developer, Software Engineer')
  const defaultLoc = userProfile?.location || 'Bengaluru, Karnataka, India'

  // Google Search state
  const [googleRole, setGoogleRole] = useState(defaultRoles)
  const [googleLocation, setGoogleLocation] = useState(defaultLoc)
  const [googleMax, setGoogleMax] = useState('15')
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  // Synchronize when user switches profile
  React.useEffect(() => {
    if (userProfile?.title) {
      const roles = userProfile.target_roles?.length
        ? (Array.isArray(userProfile.target_roles) ? userProfile.target_roles.join(', ') : userProfile.target_roles)
        : userProfile.title
      setGoogleRole(roles)
    }
    if (userProfile?.location) {
      setGoogleLocation(userProfile.location)
    }
  }, [userProfile])

  // Streamed Results
  const [discoveredJobs, setDiscoveredJobs] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())

  const handleScrapeLinkedin = async (e) => {
    e.preventDefault()
    if (!linkedinUrl.trim()) return
    setLoadingLinkedin(true)
    try {
      const res = await api.scrapeLinkedIn({
        url: linkedinUrl,
        max_results: parseInt(linkedinMax),
        auto_save: true,
      })
      if (res.success && res.jobs) {
        setDiscoveredJobs(res.jobs)
        toast({ title: `Discovered ${res.jobs.length} jobs via LinkedIn!`, status: 'success', duration: 3000 })
        refreshJobs()
      } else {
        toast({ title: 'Search Note', description: res.error || 'No jobs returned.', status: 'warning' })
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' })
    } finally {
      setLoadingLinkedin(false)
    }
  }

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
        toast({ title: `Found ${res.jobs.length} high-signal tech jobs!`, status: 'success', duration: 3000 })
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
      setSelectedIds(new Set(discoveredJobs.map((j) => j.id)))
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
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6} mb={6}>
        {/* Method 1: LinkedIn Authenticated / Direct URL */}
        <Card>
          <CardBody p={5}>
            <Flex align="center" gap={2} mb={2}>
              <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider">
                🔗 Method 1: LinkedIn Job Search Scraper
              </Heading>
              <Badge colorScheme="blue">Direct ATS</Badge>
            </Flex>
            <Text fontSize="xs" color="gray.400" mb={4}>
              Paste any LinkedIn job search URL (authenticated session or public).
            </Text>

            <form onSubmit={handleScrapeLinkedin}>
              <VStack spacing={3} align="stretch">
                <FormControl isRequired>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>LinkedIn Search URL</FormLabel>
                  <Input
                    size="sm"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/jobs/search/?keywords=Developer&location=Bengaluru"
                  />
                </FormControl>

                <HStack spacing={3}>
                  <FormControl maxW="150px">
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Max Results</FormLabel>
                    <Select size="sm" value={linkedinMax} onChange={(e) => setLinkedinMax(e.target.value)}>
                      <option value="10">10 Jobs</option>
                      <option value="15">15 Jobs</option>
                      <option value="25">25 Jobs</option>
                    </Select>
                  </FormControl>

                  <Button
                    type="submit"
                    variant="solid"
                    size="sm"
                    colorScheme="blue"
                    flex={1}
                    alignSelf="flex-end"
                    isLoading={loadingLinkedin}
                    leftIcon={<FiSearch />}
                  >
                    Scrape LinkedIn Jobs
                  </Button>
                </HStack>
              </VStack>
            </form>
          </CardBody>
        </Card>

        {/* Method 2: Google Search & Location */}
        <Card>
          <CardBody p={5}>
            <Flex align="center" gap={2} mb={2}>
              <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider">
                🎯 Method 2: Google Roles & Location Search
              </Heading>
              <Badge colorScheme="purple">Multi-Role</Badge>
            </Flex>
            <Text fontSize="xs" color="gray.400" mb={4}>
              Sources verified direct career sites and tech ecosystem postings.
            </Text>

            <form onSubmit={handleScrapeGoogle}>
              <VStack spacing={3} align="stretch">
                <FormControl isRequired>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Target Roles</FormLabel>
                  <Input
                    size="sm"
                    value={googleRole}
                    onChange={(e) => setGoogleRole(e.target.value)}
                    placeholder="e.g. Full Stack Developer, Python Developer"
                  />
                </FormControl>

                <HStack spacing={3}>
                  <FormControl flex={2}>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Location</FormLabel>
                    <Input
                      size="sm"
                      value={googleLocation}
                      onChange={(e) => setGoogleLocation(e.target.value)}
                      placeholder="e.g. Bengaluru, Karnataka, India"
                    />
                  </FormControl>

                  <Button
                    type="submit"
                    variant="gradient"
                    size="sm"
                    flex={1}
                    alignSelf="flex-end"
                    isLoading={loadingGoogle}
                    leftIcon={<FiSearch />}
                  >
                    Discover Jobs
                  </Button>
                </HStack>
              </VStack>
            </form>
          </CardBody>
        </Card>
      </Grid>

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
                  Opportunities auto-synced to your application tracker.
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
                    <Th color="gray.400" width="95px">Match</Th>
                    <Th color="gray.400">Role Title</Th>
                    <Th color="gray.400">Company</Th>
                    <Th color="gray.400">Location</Th>
                    <Th color="gray.400" textAlign="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {discoveredJobs.map((j) => {
                    const score = j.match_score || 75
                    return (
                      <Tr key={j.id} _hover={{ bg: 'whiteAlpha.50' }}>
                        <Td textAlign="center">
                          <Checkbox
                            size="sm"
                            colorScheme="purple"
                            isChecked={selectedIds.has(j.id)}
                            onChange={() => toggleSelect(j.id)}
                          />
                        </Td>
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
                          <Text fontWeight="600" color="white">{j.title}</Text>
                        </Td>
                        <Td>
                          <Text color="cyan.300" fontWeight="600">{j.company}</Text>
                        </Td>
                        <Td color="gray.300" fontSize="xs">
                          {j.location || 'Bengaluru, India'}
                        </Td>
                        <Td textAlign="right">
                          <HStack spacing={1.5} justify="flex-end">
                            <Button size="xs" variant="outline" leftIcon={<FiFileText />} onClick={() => onSelectJobForCv(j.id)}>
                              CV
                            </Button>
                            <Button size="xs" variant="outline" leftIcon={<FiMail />} onClick={() => onSelectJobForCoverLetter(j)}>
                              Letter
                            </Button>
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
    </Box>
  )
}
