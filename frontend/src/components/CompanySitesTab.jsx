import React, { useState } from 'react'
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
  FiBriefcase,
  FiSearch,
  FiExternalLink,
  FiUsers,
  FiFileText,
  FiMail,
} from 'react-icons/fi'
import { api } from '../api'

export default function CompanySitesTab({ refreshJobs, onSelectJobForCv, onSelectJobForCoverLetter, onFindHrForCompany }) {
  const toast = useToast()

  const [companyNames, setCompanyNames] = useState('Sandisk, Amazon, Swiggy')
  const [roleKeywords, setRoleKeywords] = useState('')
  const [location, setLocation] = useState('Bengaluru, Karnataka, India')
  const [loading, setLoading] = useState(false)
  const [scrapedJobs, setScrapedJobs] = useState([])

  const handleScrapeCompanies = async (companiesToScrape) => {
    const targetComp = companiesToScrape || companyNames
    if (!targetComp.trim()) return
    setLoading(true)
    try {
      const res = await api.scrapeCompany({
        company: targetComp,
        role: roleKeywords,
        location: location,
        max_results: 15,
        auto_save: true,
      })
      if (res.success && res.jobs) {
        setScrapedJobs(res.jobs)
        toast({ title: `Scraped ${res.jobs.length} live openings!`, status: 'success', duration: 3000 })
        refreshJobs()
      } else {
        toast({ title: 'No Openings Found', description: res.error, status: 'warning' })
      }
    } catch (err) {
      toast({ title: 'Scrape Error', description: err.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const topHubs = [
    { name: 'Sandisk / Western Digital', tag: 'Direct Careers Portal', location: 'Bengaluru (Kadubeesanahalli / Outer Ring Rd)', url: 'https://careers.westerndigital.com/' },
    { name: 'Amazon', tag: 'Amazon.jobs Portal', location: 'Bengaluru (Bagmane Constellation Business Park)', url: 'https://amazon.jobs/en/locations/bengaluru-india' },
    { name: 'Google India', tag: 'Google Careers', location: 'Bengaluru (RMZ Infinity / Old Madras Rd)', url: 'https://careers.google.com/jobs/results/?location=Bengaluru' },
    { name: 'Flipkart', tag: 'E-Commerce Unicorn', location: 'Bengaluru (Bellandur / Cessna Tech Park)', url: 'https://www.flipkartcareers.com/' },
    { name: 'Swiggy', tag: 'Workday Portal', location: 'Bengaluru (Koramangala / Bellandur)', url: 'https://careers.swiggy.com/' },
    { name: 'Razorpay', tag: 'Greenhouse ATS', location: 'Bengaluru (Koramangala 3rd Block)', url: 'https://razorpay.com/jobs/' },
    { name: 'CRED', tag: 'Direct Careers', location: 'Bengaluru (Indiranagar 100ft Road)', url: 'https://careers.cred.club/' },
    { name: 'Zepto', tag: 'Greenhouse ATS', location: 'Bengaluru (HSR Layout Sector 2)', url: 'https://www.zeptonow.com/careers' },
    { name: 'Nvidia', tag: 'Workday Careers', location: 'Bengaluru (Bagmane Tech Park)', url: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite' },
    { name: 'Microsoft', tag: 'Microsoft Careers', location: 'Bengaluru (Bellandur / Outer Ring Rd)', url: 'https://careers.microsoft.com/' },
  ]

  const quickChips = [
    'Sandisk', 'Amazon', 'Google', 'Swiggy', 'Flipkart', 'Zepto', 'Razorpay', 'CRED', 'Qualcomm', 'Nvidia'
  ]

  return (
    <Box maxW="1500px" mx="auto" py={4}>
      {/* Search Bar Card */}
      <Card mb={6}>
        <CardBody p={5}>
          <Heading size="xs" textTransform="uppercase" color="gray.400" mb={1} letterSpacing="wider">
            🏢 Company Career Sites & Live Vacancy Scraper
          </Heading>
          <Text fontSize="xs" color="gray.400" mb={4}>
            Scrapes actual live openings, verified apply links, and portal domains for any company.
          </Text>

          <form onSubmit={(e) => { e.preventDefault(); handleScrapeCompanies() }}>
            <Grid templateColumns={{ base: '1fr', md: '2fr 1.5fr 1.5fr 1fr' }} gap={3} align="end">
              <FormControl isRequired>
                <FormLabel fontSize="xs" color="gray.300" mb={1}>Company Name(s)</FormLabel>
                <Input
                  size="sm"
                  value={companyNames}
                  onChange={(e) => setCompanyNames(e.target.value)}
                  placeholder="e.g. Sandisk, Amazon, Swiggy, Flipkart, Google"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" color="gray.300" mb={1}>Role Keywords (Optional)</FormLabel>
                <Input
                  size="sm"
                  value={roleKeywords}
                  onChange={(e) => setRoleKeywords(e.target.value)}
                  placeholder="e.g. Engineer, Python, Firmware"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" color="gray.300" mb={1}>Location</FormLabel>
                <Input
                  size="sm"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Bengaluru, Karnataka, India"
                />
              </FormControl>

              <Button
                type="submit"
                variant="gradient"
                size="sm"
                isLoading={loading}
                leftIcon={<FiSearch />}
              >
                Scrape Openings
              </Button>
            </Grid>
          </form>

          {/* Quick Lookup Chips */}
          <Box mt={4} pt={3} borderTop="1px solid rgba(255,255,255,0.06)">
            <Text fontSize="2xs" color="gray.400" textTransform="uppercase" fontWeight="700" mb={2}>
              ⚡ Quick Company Lookups (Click to Scrape Real Openings & Portals):
            </Text>
            <HStack spacing={2} wrap="wrap">
              {quickChips.map((c) => (
                <Tag
                  key={c}
                  size="sm"
                  variant="outline"
                  cursor="pointer"
                  _hover={{ borderColor: 'brand.400', color: 'white' }}
                  onClick={() => {
                    setCompanyNames(c)
                    handleScrapeCompanies(c)
                  }}
                >
                  🏢 {c}
                </Tag>
              ))}
            </HStack>
          </Box>
        </CardBody>
      </Card>

      {/* Scraped Results Table */}
      {scrapedJobs.length > 0 && (
        <Card mb={6}>
          <CardBody p={5}>
            <Heading size="xs" textTransform="uppercase" color="gray.400" mb={4} letterSpacing="wider">
              📊 Scraped Openings ({scrapedJobs.length} Live Openings)
            </Heading>
            <Box overflowX="auto" border="1px solid rgba(255,255,255,0.08)" borderRadius="lg">
              <Table variant="simple" size="sm">
                <Thead bg="blackAlpha.400">
                  <Tr>
                    <Th color="gray.400" width="95px">Match</Th>
                    <Th color="gray.400">Opportunity</Th>
                    <Th color="gray.400">Company</Th>
                    <Th color="gray.400">Location</Th>
                    <Th color="gray.400" textAlign="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {scrapedJobs.map((j) => (
                    <Tr key={j.id} _hover={{ bg: 'whiteAlpha.50' }}>
                      <Td>
                        <Badge colorScheme="green" fontSize="xs" fontWeight="800">
                          {j.match_score || 75}%
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
                  ))}
                </Tbody>
              </Table>
            </Box>
          </CardBody>
        </Card>
      )}

      {/* Curated Top Bengaluru Tech Hubs */}
      <Box mb={4}>
        <Flex align="center" gap={2} mb={3}>
          <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider">
            🇮🇳 Top Bengaluru Tech Hubs & Unicorn Portals
          </Heading>
          <Badge colorScheme="purple">Direct Career Sites</Badge>
        </Flex>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
          {topHubs.map((hub) => (
            <Card key={hub.name} bg="#111726" borderColor="rgba(255,255,255,0.08)">
              <CardBody p={4}>
                <Flex justify="space-between" align="start">
                  <Box>
                    <Text fontWeight="700" color="white" fontSize="sm">{hub.name}</Text>
                    <Text fontSize="2xs" color="gray.400" mt={0.5}>{hub.location}</Text>
                  </Box>
                  <Badge colorScheme="cyan">{hub.tag}</Badge>
                </Flex>
                <HStack spacing={2} mt={3} justify="space-between">
                  <Button as="a" href={hub.url} target="_blank" size="xs" variant="outline" rightIcon={<FiExternalLink />}>
                    Careers Portal
                  </Button>
                  <Button size="xs" variant="gradient" leftIcon={<FiUsers />} onClick={() => onFindHrForCompany(hub.name.split(' ')[0])}>
                    Find HR / Referrals
                  </Button>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}
