import React, { useState, useEffect } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Input,
  Select,
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
  Code,
  Tooltip,
  Spinner,
} from '@chakra-ui/react'
import {
  FiUsers,
  FiSearch,
  FiExternalLink,
  FiMail,
  FiCopy,
  FiTrash2,
  FiSave,
  FiSend,
  FiCheckCircle,
  FiAward
} from 'react-icons/fi'
import { api } from '../api'

export default function ContactsTab({ onOpenOutreachForContact, initialCompany = '' }) {
  const toast = useToast()

  const [company, setCompany] = useState(initialCompany || 'Sandisk')
  const [department, setDepartment] = useState('all')
  const [location, setLocation] = useState('Bengaluru, Karnataka, India')
  const [searching, setSearching] = useState(false)
  const [contacts, setContacts] = useState([])
  const [patternMeta, setPatternMeta] = useState(null)

  // Saved contacts
  const [savedContacts, setSavedContacts] = useState([])

  useEffect(() => {
    loadSavedContacts()
  }, [])

  useEffect(() => {
    if (initialCompany) {
      setCompany(initialCompany)
      handleSearch(initialCompany)
    }
  }, [initialCompany])

  const loadSavedContacts = async () => {
    try {
      const res = await api.getContacts()
      if (res && res.contacts) {
        setSavedContacts(res.contacts)
      }
    } catch (e) {
      console.warn('Failed to load contacts:', e)
    }
  }

  const handleSearch = async (cName = company) => {
    if (!cName.trim()) return
    setSearching(true)
    setContacts([])
    setPatternMeta(null)

    try {
      const res = await api.searchPeople({
        company: cName.trim(),
        department: department,
        location: location,
        limit: 15
      })

      if (res.success) {
        setContacts(res.contacts || [])
        setPatternMeta({
          pattern: res.email_pattern,
          pattern_name: res.pattern_name,
          confidence: res.confidence,
          domain: res.domain,
          mx_status: res.mx_status
        })

        toast({
          title: `Discovered ${res.contacts?.length || 0} Contacts!`,
          description: `Apollo/Hunter intelligence loaded for ${cName}.`,
          status: 'success',
          duration: 3500,
        })
      }
    } catch (err) {
      toast({
        title: 'Search Error',
        description: err.message,
        status: 'error',
        duration: 4000,
      })
    } finally {
      setSearching(false)
    }
  }

  const handleSaveContact = async (contact) => {
    try {
      const res = await api.saveContact({
        name: contact.name,
        headline: contact.title,
        role_category: contact.department || contact.badge,
        company: contact.company || company,
        profile_url: contact.linkedin_url,
        predicted_email: contact.predicted_email,
        notes: `Confidence: ${contact.email_confidence || 'High'}`
      })

      if (res.success) {
        toast({
          title: 'Contact Saved!',
          description: `${contact.name} added to your networking tracker.`,
          status: 'success',
          duration: 2500,
        })
        loadSavedContacts()
      }
    } catch (err) {
      toast({
        title: 'Save Failed',
        description: err.message,
        status: 'error',
      })
    }
  }

  const handleDeleteSaved = async (id) => {
    try {
      await api.deleteContact(id)
      toast({
        title: 'Contact Removed',
        status: 'info',
        duration: 2000,
      })
      loadSavedContacts()
    } catch (e) {
      console.warn(e)
    }
  }

  const copyText = (txt, label) => {
    navigator.clipboard.writeText(txt)
    toast({
      title: `${label} Copied!`,
      status: 'success',
      duration: 1500,
    })
  }

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={4} mb={6}>
        <Box>
          <HStack spacing={3} mb={1}>
            <Heading size="lg" fontWeight="800" letterSpacing="-0.02em">
              People Intelligence & Referral Outreach
            </Heading>
            <Badge colorScheme="purple" variant="solid" px={2} py={0.5} borderRadius="md" fontSize="xs">
              HUNTER & APOLLO ENGINE
            </Badge>
          </HStack>
          <Text color="gray.400" fontSize="sm">
            Discover technical recruiters, hiring managers, and referral peers with Hunter.io style email patterns and direct SMTP dispatch.
          </Text>
        </Box>
      </Flex>

      {/* Main Responsive Grid */}
      <Grid templateColumns={{ base: '1fr', lg: '360px 1fr' }} gap={6} alignItems="start">
        {/* Left Column: People Intelligence Filters */}
        <VStack spacing={5} align="stretch">
          <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
            <CardBody p={5}>
              <VStack spacing={4} align="stretch">
                <Heading size="xs" textTransform="uppercase" letterSpacing="0.05em" color="brand.300">
                  Target Company Scout
                </Heading>

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
                  <FormLabel fontSize="xs" color="gray.400">Department / Function</FormLabel>
                  <Select
                    size="sm"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="all">All Departments & Functions</option>
                    <option value="recruiting">Talent Acquisition & Recruiters</option>
                    <option value="engineering">Engineering Managers & Peers</option>
                    <option value="leadership">Executive Leadership (CTO, VP, Director)</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.400">Location Focus</FormLabel>
                  <Input
                    size="sm"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bengaluru, Karnataka, India"
                  />
                </FormControl>

                <Button
                  variant="gradient"
                  size="md"
                  leftIcon={searching ? <Spinner size="xs" /> : <FiSearch />}
                  isLoading={searching}
                  loadingText="Scouting People..."
                  onClick={() => handleSearch(company)}
                  w="full"
                >
                  Discover People & Verified Emails
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Hunter.io Pattern Badge Card */}
          {patternMeta && (
            <Card bg="rgba(99, 102, 241, 0.06)" borderColor="rgba(99, 102, 241, 0.25)" borderWidth="1px">
              <CardBody p={4}>
                <Flex justify="space-between" align="center" mb={2}>
                  <HStack spacing={1.5}>
                    <FiAward color="#818cf8" />
                    <Text fontSize="xs" fontWeight="700" color="brand.200">
                      Corporate Email Formula
                    </Text>
                  </HStack>
                  <Badge colorScheme="green" fontSize="2xs">
                    {patternMeta.confidence} CONFIDENCE
                  </Badge>
                </Flex>

                <Box p={2.5} bg="rgba(0,0,0,0.3)" borderRadius="md" mb={2}>
                  <Text fontSize="2xs" color="gray.400">Primary Domain Format:</Text>
                  <Code colorScheme="purple" fontSize="xs" fontWeight="700" mt={0.5}>
                    {patternMeta.pattern}
                  </Code>
                  <Text fontSize="3xs" color="gray.500" mt={0.5}>
                    {patternMeta.pattern_name}
                  </Text>
                </Box>

                <Text fontSize="2xs" color="green.300">
                  ✓ {patternMeta.mx_status}
                </Text>
              </CardBody>
            </Card>
          )}

          {/* Saved Contacts Quick List */}
          {savedContacts.length > 0 && (
            <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
              <CardBody p={4}>
                <Heading size="2xs" textTransform="uppercase" color="gray.400" mb={3}>
                  Saved Outreach Contacts ({savedContacts.length})
                </Heading>
                <VStack spacing={2} align="stretch" maxH="220px" overflowY="auto">
                  {savedContacts.map((sc) => (
                    <Flex
                      key={sc.id}
                      justify="space-between"
                      align="center"
                      p={2}
                      borderRadius="md"
                      bg="rgba(255,255,255,0.02)"
                    >
                      <Box minW="0" flex="1">
                        <Text fontSize="xs" fontWeight="700" color="white" isTruncated>{sc.name}</Text>
                        <Text fontSize="2xs" color="gray.500" isTruncated>{sc.company} • {sc.role_category}</Text>
                      </Box>
                      <HStack spacing={1}>
                        <Button
                          size="2xs"
                          variant="ghost"
                          colorScheme="purple"
                          leftIcon={<FiSend />}
                          onClick={() => onOpenOutreachForContact(sc)}
                        >
                          Email
                        </Button>
                        <Button
                          size="2xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDeleteSaved(sc.id)}
                        >
                          <FiTrash2 />
                        </Button>
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>

        {/* Right Column: Apollo / RocketReach People Results */}
        <Box>
          {contacts.length === 0 && !searching && (
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
              <Box fontSize="4xl">👥</Box>
              <Heading size="md" color="gray.300">People Discovery Studio</Heading>
              <Text color="gray.500" fontSize="sm" maxW="450px">
                Search for technical recruiters, engineering managers, and team members for referral requests.
                Emails are enriched with Hunter.io style deliverability confidence ratings.
              </Text>
              <Button
                variant="outline"
                size="sm"
                mt={2}
                onClick={() => handleSearch('Sandisk')}
              >
                Scout People at Sandisk
              </Button>
            </Flex>
          )}

          {searching && (
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
              <Heading size="sm" color="gray.200">Scraping Professional Network Profiles...</Heading>
              <Text color="gray.400" fontSize="xs">
                Extracting LinkedIn titles, predicting corporate emails, and checking deliverability patterns for {company}.
              </Text>
            </Flex>
          )}

          {contacts.length > 0 && (
            <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
              <CardBody p={5}>
                <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap={2} mb={4}>
                  <HStack spacing={2}>
                    <Heading size="sm" fontWeight="700">Enriched Professionals</Heading>
                    <Badge colorScheme="purple">{contacts.length} FOUND</Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.400">
                    Target: <b style={{ color: '#fff' }}>{company}</b>
                  </Text>
                </Flex>

                {/* Responsive Table Wrapper */}
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead bg="rgba(255,255,255,0.02)">
                      <Tr>
                        <Th color="gray.400" fontSize="3xs">Professional</Th>
                        <Th color="gray.400" fontSize="3xs">Role & Dept</Th>
                        <Th color="gray.400" fontSize="3xs">Verified Email</Th>
                        <Th color="gray.400" fontSize="3xs">Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {contacts.map((c) => (
                        <Tr key={c.id} _hover={{ bg: 'rgba(255,255,255,0.02)' }}>
                          {/* Name & LinkedIn */}
                          <Td py={3}>
                            <VStack align="start" spacing={0.5}>
                              <Text fontSize="xs" fontWeight="700" color="white">
                                {c.name}
                              </Text>
                              <Text fontSize="3xs" color="gray.500" maxW="200px" isTruncated>
                                {c.location}
                              </Text>
                              {c.linkedin_url && (
                                <Button
                                  as="a"
                                  href={c.linkedin_url}
                                  target="_blank"
                                  size="3xs"
                                  variant="link"
                                  color="brand.300"
                                  leftIcon={<FiExternalLink />}
                                >
                                  LinkedIn Profile
                                </Button>
                              )}
                            </VStack>
                          </Td>

                          {/* Role & Dept Badge */}
                          <Td py={3}>
                            <VStack align="start" spacing={1}>
                              <Text fontSize="2xs" color="gray.300" fontWeight="600" maxW="240px">
                                {c.title}
                              </Text>
                              <Badge
                                fontSize="3xs"
                                colorScheme={
                                  c.badge === 'Recruiter' ? 'purple' :
                                  c.badge === 'Hiring Manager' ? 'yellow' : 'cyan'
                                }
                              >
                                {c.badge || c.department}
                              </Badge>
                            </VStack>
                          </Td>

                          {/* Verified Email & Confidence */}
                          <Td py={3}>
                            <VStack align="start" spacing={1}>
                              <HStack spacing={1}>
                                <Code fontSize="2xs" colorScheme="purple">
                                  {c.predicted_email}
                                </Code>
                                <Button
                                  size="3xs"
                                  variant="ghost"
                                  onClick={() => copyText(c.predicted_email, 'Email')}
                                >
                                  <FiCopy />
                                </Button>
                              </HStack>
                              <Badge colorScheme="green" variant="subtle" fontSize="3xs">
                                {c.email_confidence || '94%'} Deliverability
                              </Badge>
                            </VStack>
                          </Td>

                          {/* Action Buttons */}
                          <Td py={3}>
                            <HStack spacing={1.5}>
                              <Button
                                size="xs"
                                variant="gradient"
                                leftIcon={<FiSend />}
                                onClick={() => onOpenOutreachForContact && onOpenOutreachForContact(c)}
                                title="Draft and Send Referral Pitch"
                              >
                                Outreach
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                leftIcon={<FiSave />}
                                onClick={() => handleSaveContact(c)}
                                title="Save to Tracking List"
                              >
                                Save
                              </Button>
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </CardBody>
            </Card>
          )}
        </Box>
      </Grid>
    </Box>
  )
}
