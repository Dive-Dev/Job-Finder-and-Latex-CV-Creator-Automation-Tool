import React, { useState, useEffect } from 'react'
import {
  Box,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  VStack,
  HStack,
  Card,
  CardBody,
  useToast,
  FormControl,
  FormLabel,
  Divider,
  Badge,
  Flex,
  SimpleGrid,
  Tag,
  TagLabel,
  TagCloseButton,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tooltip,
  Select,
} from '@chakra-ui/react'
import {
  FiSave,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiLinkedin,
  FiGithub,
  FiGlobe,
  FiBriefcase,
  FiPlus,
  FiTrash2,
  FiZap,
  FiTrendingUp,
  FiCpu,
  FiFileText,
  FiCheckCircle,
  FiRefreshCw,
  FiTarget,
} from 'react-icons/fi'
import { api } from '../api'

export default function ProfileTab({ onProfileUpdated, onNavigateDiscovery }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [resumeText, setResumeText] = useState('')

  // Candidate Profile State
  const [profile, setProfile] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
    summary: '',
    target_roles: [],
    target_locations: 'Bengaluru, India; Remote; San Francisco, CA',
    target_seniority: 'Senior / Staff',
    education: [],
    experience: [],
    projects: [],
    skills: {
      Languages: [],
      'Frameworks & Libraries': [],
      'Cloud & DevOps': [],
      'Databases & Tools': [],
    },
    certifications: [],
  })

  // New Skill input states per category
  const [newSkillInput, setNewSkillInput] = useState({
    Languages: '',
    'Frameworks & Libraries': '',
    'Cloud & DevOps': '',
    'Databases & Tools': '',
  })

  // Load Profile on mount
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await api.getProfile()
      if (res && res.profile) {
        setProfile((prev) => ({
          ...prev,
          ...res.profile,
          skills: res.profile.skills || prev.skills,
        }))
      }
    } catch (err) {
      console.warn('Could not load profile:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await api.saveProfile(profile)
      if (res.success) {
        toast({
          title: 'Candidate Profile Saved!',
          description: 'AI Persona & pipeline growth match scores updated.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
        if (res.profile) setProfile(res.profile)
        if (onProfileUpdated) onProfileUpdated(res.profile || profile)
      } else {
        toast({ title: 'Save Note', description: res.error || 'Failed saving', status: 'error' })
      }
    } catch (err) {
      toast({ title: 'Error Saving Profile', description: err.message, status: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleParseResume = async () => {
    if (!resumeText.trim()) {
      toast({ title: 'Please paste resume text first', status: 'warning' })
      return
    }
    setParsing(true)
    try {
      const res = await api.parseResume(resumeText)
      if (res.success && res.parsed_profile) {
        const p = res.parsed_profile
        setProfile((prev) => ({
          ...prev,
          name: p.name || prev.name,
          title: p.title || prev.title,
          email: p.email || prev.email,
          phone: p.phone || prev.phone,
          location: p.location || prev.location,
          linkedin: p.linkedin || prev.linkedin,
          github: p.github || prev.github,
          summary: p.summary || prev.summary,
          skills: {
            Languages: Array.from(new Set([...(prev.skills.Languages || []), ...(p.skills?.Languages || [])])),
            'Frameworks & Libraries': Array.from(new Set([...(prev.skills['Frameworks & Libraries'] || []), ...(p.skills?.['Frameworks & Libraries'] || [])])),
            'Cloud & DevOps': Array.from(new Set([...(prev.skills['Cloud & DevOps'] || []), ...(p.skills?.['Cloud & DevOps'] || [])])),
            'Databases & Tools': Array.from(new Set([...(prev.skills['Databases & Tools'] || []), ...(p.skills?.['Databases & Tools'] || [])])),
          },
        }))
        toast({
          title: 'Resume Analyzed Successfully!',
          description: `Extracted profile details and ${Object.values(p.skills || {}).flat().length} key technical skills.`,
          status: 'success',
          duration: 3500,
        })
      }
    } catch (err) {
      toast({ title: 'Parser Error', description: err.message, status: 'error' })
    } finally {
      setParsing(false)
    }
  }

  // Skills tag helpers
  const handleAddSkill = (category) => {
    const val = (newSkillInput[category] || '').trim()
    if (!val) return
    const current = profile.skills?.[category] || []
    if (!current.includes(val)) {
      setProfile({
        ...profile,
        skills: {
          ...profile.skills,
          [category]: [...current, val],
        },
      })
    }
    setNewSkillInput({ ...newSkillInput, [category]: '' })
  }

  const handleRemoveSkill = (category, skillToRemove) => {
    const current = profile.skills?.[category] || []
    setProfile({
      ...profile,
      skills: {
        ...profile.skills,
        [category]: current.filter((s) => s !== skillToRemove),
      },
    })
  }

  // Experience helpers
  const handleAddExperience = () => {
    const newExp = {
      company: 'New Company Inc.',
      role: 'Senior Engineer',
      location: 'Remote',
      dates: '2023 - Present',
      bullets: ['Spearheaded engineering initiatives improving system throughput by 30%.'],
    }
    setProfile({
      ...profile,
      experience: [newExp, ...(profile.experience || [])],
    })
  }

  const handleUpdateExperience = (idx, field, value) => {
    const updated = [...(profile.experience || [])]
    updated[idx] = { ...updated[idx], [field]: value }
    setProfile({ ...profile, experience: updated })
  }

  const handleRemoveExperience = (idx) => {
    const updated = (profile.experience || []).filter((_, i) => i !== idx)
    setProfile({ ...profile, experience: updated })
  }

  const persona = profile.persona || {}

  return (
    <Box maxW="1500px" mx="auto" pb={12}>
      {/* Header Banner */}
      <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap={4} mb={6}>
        <Box>
          <HStack spacing={3} align="center" mb={1}>
            <Heading size="md" color="#FFF6F4" fontWeight="800" letterSpacing="-0.02em">
              Candidate Profile & AI Persona
            </Heading>
            <Badge bg="rgba(82, 95, 225, 0.22)" color="#8f98f3" border="1px solid rgba(82, 95, 225, 0.4)" fontSize="3xs" px={2} py={0.5} borderRadius="sm">
              EXECUTIVE BLUEPRINT
            </Badge>
          </HStack>
          <Text fontSize="xs" color="gray.400">
            Define your skills, career trajectory, and target roles. The autonomous agents personalize discovery, CV tailoring, and ATS scoring based on this profile.
          </Text>
        </Box>

        <HStack spacing={3}>
          <Button
            size="sm"
            variant="outline"
            borderColor="rgba(255, 246, 244, 0.15)"
            color="#FFF6F4"
            _hover={{ borderColor: '#525FE1', bg: 'rgba(82, 95, 225, 0.12)' }}
            leftIcon={<FiRefreshCw className={loading ? 'spin' : ''} />}
            onClick={loadProfile}
            isLoading={loading}
            fontSize="xs"
          >
            Reload
          </Button>

          <Button
            size="sm"
            bgGradient="linear(to-r, #525FE1 0%, #F86F03 100%)"
            color="#FFF6F4"
            _hover={{
              bgGradient: 'linear(to-r, #424cb8 0%, #FFA41B 100%)',
              boxShadow: '0 4px 18px rgba(248, 111, 3, 0.45)',
            }}
            leftIcon={<FiSave />}
            onClick={handleSaveProfile}
            isLoading={saving}
            fontSize="xs"
            px={5}
          >
            Save & Sync Profile
          </Button>
        </HStack>
      </Flex>

      {/* AI Persona Executive Summary Card */}
      {persona.seniority_bracket && (
        <Card bg="rgba(15, 19, 29, 0.75)" backdropFilter="blur(16px)" border="1px solid rgba(82, 95, 225, 0.3)" borderRadius="xl" mb={6} boxShadow="0 8px 32px rgba(0, 0, 0, 0.37)">
          <CardBody p={5}>
            <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} align="center">
              <Box borderRight={{ md: '1px solid rgba(255, 255, 255, 0.08)' }} pr={{ md: 4 }}>
                <Text fontSize="3xs" color="gray.400" textTransform="uppercase" fontWeight="700" letterSpacing="0.08em" mb={1}>
                  Candidate Seniority
                </Text>
                <Heading size="xs" color="#FFA41B" fontWeight="800">
                  {persona.seniority_bracket}
                </Heading>
                <Text fontSize="3xs" color="gray.500" mt={0.5}>
                  ~{persona.total_experience_years || 5}+ Years Commercial Experience
                </Text>
              </Box>

              <Box borderRight={{ md: '1px solid rgba(255, 255, 255, 0.08)' }} pr={{ md: 4 }}>
                <Text fontSize="3xs" color="gray.400" textTransform="uppercase" fontWeight="700" letterSpacing="0.08em" mb={1}>
                  Target Growth Leap
                </Text>
                <Heading size="xs" color="#525FE1" fontWeight="800" isTruncated>
                  {persona.target_growth_step}
                </Heading>
                <Text fontSize="3xs" color="green.400" mt={0.5}>
                  Growth Readiness: {persona.growth_readiness_score || 92}%
                </Text>
              </Box>

              <Box borderRight={{ md: '1px solid rgba(255, 255, 255, 0.08)' }} pr={{ md: 4 }}>
                <Text fontSize="3xs" color="gray.400" textTransform="uppercase" fontWeight="700" letterSpacing="0.08em" mb={1}>
                  Primary Tech Pillars
                </Text>
                <HStack spacing={1.5} wrap="wrap">
                  {(persona.core_tech_stack || []).slice(0, 4).map((tech, i) => (
                    <Badge key={i} bg="rgba(248, 111, 3, 0.15)" color="#F86F03" border="1px solid rgba(248, 111, 3, 0.3)" fontSize="3xs">
                      {tech}
                    </Badge>
                  ))}
                </HStack>
              </Box>

              <Box>
                <Text fontSize="3xs" color="gray.400" textTransform="uppercase" fontWeight="700" letterSpacing="0.08em" mb={1}>
                  One-Click Job Hunt
                </Text>
                <Button
                  size="xs"
                  variant="outline"
                  borderColor="rgba(255, 164, 27, 0.4)"
                  color="#FFA41B"
                  _hover={{ bg: 'rgba(255, 164, 27, 0.12)' }}
                  leftIcon={<FiTarget />}
                  w="full"
                  onClick={() => onNavigateDiscovery && onNavigateDiscovery(persona.suggested_queries?.[0])}
                >
                  Hunt Recommended Roles
                </Button>
              </Box>
            </SimpleGrid>

            {persona.persona_summary && (
              <Box mt={3} pt={3} borderTop="1px solid rgba(255, 255, 255, 0.05)">
                <Text fontSize="xs" color="gray.300" fontStyle="italic">
                  ⚡ AI Intelligence Assessment: {persona.persona_summary}
                </Text>
              </Box>
            )}
          </CardBody>
        </Card>
      )}

      {/* Accordion: Quick Resume / LinkedIn Text Import */}
      <Accordion allowToggle mb={6}>
        <AccordionItem bg="rgba(15, 19, 29, 0.6)" border="1px solid rgba(255, 255, 255, 0.08)" borderRadius="xl">
          <h2>
            <AccordionButton py={3} px={5} _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}>
              <Box as="span" flex="1" textAlign="left">
                <HStack spacing={2.5}>
                  <FiFileText color="#525FE1" />
                  <Text fontSize="xs" fontWeight="700" color="#FFF6F4">
                    Quick Resume / LinkedIn Text Importer
                  </Text>
                  <Badge bg="rgba(82, 95, 225, 0.18)" color="#8f98f3" fontSize="3xs">
                    INSTANT PARSE
                  </Badge>
                </HStack>
              </Box>
              <AccordionIcon color="gray.400" />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4} px={5}>
            <Text fontSize="2xs" color="gray.400" mb={2}>
              Paste your raw resume or LinkedIn summary here. The system will extract your identity, contact links, headline, and categorized skill tags automatically.
            </Text>
            <Textarea
              placeholder="Paste raw resume text, education, skills, and past accomplishments here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={4}
              fontSize="xs"
              bg="rgba(10, 13, 20, 0.8)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              mb={3}
            />
            <Button
              size="sm"
              bg="#525FE1"
              color="white"
              _hover={{ bg: '#424cb8' }}
              leftIcon={<FiZap />}
              onClick={handleParseResume}
              isLoading={parsing}
              fontSize="xs"
            >
              Parse & Auto-Fill Profile
            </Button>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      {/* Main Tabs for Profile Sections */}
      <Tabs variant="enclosed" colorScheme="purple">
        <TabList borderColor="rgba(255, 255, 255, 0.08)" mb={4}>
          <Tab _selected={{ color: '#FFF6F4', bg: 'rgba(82, 95, 225, 0.25)', borderColor: 'rgba(82, 95, 225, 0.4)' }} color="gray.400" fontSize="xs" fontWeight="600">
            👤 Identity & Career Goals
          </Tab>
          <Tab _selected={{ color: '#FFF6F4', bg: 'rgba(82, 95, 225, 0.25)', borderColor: 'rgba(82, 95, 225, 0.4)' }} color="gray.400" fontSize="xs" fontWeight="600">
            ⚡ Categorized Skills Matrix
          </Tab>
          <Tab _selected={{ color: '#FFF6F4', bg: 'rgba(82, 95, 225, 0.25)', borderColor: 'rgba(82, 95, 225, 0.4)' }} color="gray.400" fontSize="xs" fontWeight="600">
            💼 Work Experience & Projects
          </Tab>
        </TabList>

        <TabPanels>
          {/* TAB 1: Identity & Career Goals */}
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Card bg="rgba(15, 19, 29, 0.7)" border="1px solid rgba(255, 255, 255, 0.08)" borderRadius="xl">
                <CardBody p={5}>
                  <Heading size="xs" color="#FFF6F4" mb={4} fontWeight="700">
                    Candidate Identity & Contact
                  </Heading>
                  <VStack spacing={3.5} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="2xs" color="gray.400" mb={1}>Full Name</FormLabel>
                      <Input
                        size="sm"
                        value={profile.name || ''}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        bg="rgba(10, 13, 20, 0.8)"
                        borderColor="rgba(255, 255, 255, 0.1)"
                        color="white"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="2xs" color="gray.400" mb={1}>Professional Headline / Current Title</FormLabel>
                      <Input
                        size="sm"
                        value={profile.title || ''}
                        onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                        bg="rgba(10, 13, 20, 0.8)"
                        borderColor="rgba(255, 255, 255, 0.1)"
                        color="white"
                      />
                    </FormControl>

                    <SimpleGrid columns={2} spacing={3}>
                      <FormControl>
                        <FormLabel fontSize="2xs" color="gray.400" mb={1}>Email Address</FormLabel>
                        <Input
                          size="sm"
                          value={profile.email || ''}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          bg="rgba(10, 13, 20, 0.8)"
                          borderColor="rgba(255, 255, 255, 0.1)"
                          color="white"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="2xs" color="gray.400" mb={1}>Phone Number</FormLabel>
                        <Input
                          size="sm"
                          value={profile.phone || ''}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          bg="rgba(10, 13, 20, 0.8)"
                          borderColor="rgba(255, 255, 255, 0.1)"
                          color="white"
                        />
                      </FormControl>
                    </SimpleGrid>

                    <FormControl>
                      <FormLabel fontSize="2xs" color="gray.400" mb={1}>Location (City, Country)</FormLabel>
                      <Input
                        size="sm"
                        value={profile.location || ''}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        bg="rgba(10, 13, 20, 0.8)"
                        borderColor="rgba(255, 255, 255, 0.1)"
                        color="white"
                      />
                    </FormControl>

                    <SimpleGrid columns={3} spacing={3}>
                      <FormControl>
                        <FormLabel fontSize="2xs" color="gray.400" mb={1}>LinkedIn</FormLabel>
                        <Input
                          size="sm"
                          value={profile.linkedin || ''}
                          onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                          bg="rgba(10, 13, 20, 0.8)"
                          borderColor="rgba(255, 255, 255, 0.1)"
                          color="white"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="2xs" color="gray.400" mb={1}>GitHub</FormLabel>
                        <Input
                          size="sm"
                          value={profile.github || ''}
                          onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                          bg="rgba(10, 13, 20, 0.8)"
                          borderColor="rgba(255, 255, 255, 0.1)"
                          color="white"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="2xs" color="gray.400" mb={1}>Portfolio</FormLabel>
                        <Input
                          size="sm"
                          value={profile.portfolio || ''}
                          onChange={(e) => setProfile({ ...profile, portfolio: e.target.value })}
                          bg="rgba(10, 13, 20, 0.8)"
                          borderColor="rgba(255, 255, 255, 0.1)"
                          color="white"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </CardBody>
              </Card>

              {/* Career Goals & Executive Summary */}
              <Card bg="rgba(15, 19, 29, 0.7)" border="1px solid rgba(255, 255, 255, 0.08)" borderRadius="xl">
                <CardBody p={5}>
                  <Heading size="xs" color="#FFF6F4" mb={4} fontWeight="700">
                    Target Roles & Career Velocity
                  </Heading>
                  <VStack spacing={3.5} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="2xs" color="gray.400" mb={1}>Target Job Titles (comma-separated)</FormLabel>
                      <Input
                        size="sm"
                        value={Array.isArray(profile.target_roles) ? profile.target_roles.join(', ') : profile.target_roles || ''}
                        onChange={(e) => setProfile({ ...profile, target_roles: e.target.value.split(',').map((s) => s.trim()) })}
                        bg="rgba(10, 13, 20, 0.8)"
                        borderColor="rgba(255, 255, 255, 0.1)"
                        color="white"
                        placeholder="e.g. Senior Software Engineer, Staff Systems Architect, Lead Full Stack Developer"
                      />
                    </FormControl>

                    <SimpleGrid columns={2} spacing={3}>
                      <FormControl>
                        <FormLabel fontSize="2xs" color="gray.400" mb={1}>Preferred Locations</FormLabel>
                        <Input
                          size="sm"
                          value={profile.target_locations || ''}
                          onChange={(e) => setProfile({ ...profile, target_locations: e.target.value })}
                          bg="rgba(10, 13, 20, 0.8)"
                          borderColor="rgba(255, 255, 255, 0.1)"
                          color="white"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="2xs" color="gray.400" mb={1}>Target Seniority Level</FormLabel>
                        <Select
                          size="sm"
                          value={profile.target_seniority || 'Senior / Staff'}
                          onChange={(e) => setProfile({ ...profile, target_seniority: e.target.value })}
                          bg="rgba(10, 13, 20, 0.8)"
                          borderColor="rgba(255, 255, 255, 0.1)"
                          color="white"
                        >
                          <option value="Associate / Junior">Associate / Junior (0-2 YOE)</option>
                          <option value="Mid-Level">Mid-Level (2-5 YOE)</option>
                          <option value="Senior / Staff">Senior / Staff (5-10 YOE)</option>
                          <option value="Principal / Architect">Principal / Architect (10+ YOE)</option>
                          <option value="Engineering Management">Engineering Management</option>
                        </Select>
                      </FormControl>
                    </SimpleGrid>

                    <FormControl>
                      <FormLabel fontSize="2xs" color="gray.400" mb={1}>Executive Summary / Professional Bio</FormLabel>
                      <Textarea
                        rows={4}
                        fontSize="xs"
                        value={profile.summary || ''}
                        onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                        bg="rgba(10, 13, 20, 0.8)"
                        borderColor="rgba(255, 255, 255, 0.1)"
                        color="white"
                        placeholder="High-impact summary highlighting core systems, business accomplishments, and technical leadership."
                      />
                    </FormControl>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>

          {/* TAB 2: Categorized Skills Matrix */}
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {['Languages', 'Frameworks & Libraries', 'Cloud & DevOps', 'Databases & Tools'].map((category) => {
                const skillsList = profile.skills?.[category] || []
                return (
                  <Card key={category} bg="rgba(15, 19, 29, 0.7)" border="1px solid rgba(255, 255, 255, 0.08)" borderRadius="xl">
                    <CardBody p={5}>
                      <Flex justify="space-between" align="center" mb={3}>
                        <Heading size="xs" color="#FFF6F4" fontWeight="700">
                          {category}
                        </Heading>
                        <Badge bg="rgba(82, 95, 225, 0.16)" color="#8f98f3" fontSize="3xs" px={2}>
                          {skillsList.length} skills
                        </Badge>
                      </Flex>

                      {/* Add new skill inline */}
                      <HStack mb={3}>
                        <Input
                          size="xs"
                          placeholder={`Add ${category}...`}
                          value={newSkillInput[category] || ''}
                          onChange={(e) => setNewSkillInput({ ...newSkillInput, [category]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddSkill(category)
                            }
                          }}
                          bg="rgba(10, 13, 20, 0.8)"
                          borderColor="rgba(255, 255, 255, 0.1)"
                          color="white"
                        />
                        <Button
                          size="xs"
                          bg="#525FE1"
                          color="white"
                          _hover={{ bg: '#424cb8' }}
                          onClick={() => handleAddSkill(category)}
                          px={3}
                        >
                          Add
                        </Button>
                      </HStack>

                      {/* Skill tags */}
                      <Flex wrap="wrap" gap={2}>
                        {skillsList.map((skill, sIdx) => (
                          <Tag
                            key={sIdx}
                            size="sm"
                            borderRadius="full"
                            variant="solid"
                            bg="rgba(255, 246, 244, 0.08)"
                            border="1px solid rgba(255, 246, 244, 0.15)"
                            color="#FFF6F4"
                          >
                            <TagLabel fontSize="2xs">{skill}</TagLabel>
                            <TagCloseButton onClick={() => handleRemoveSkill(category, skill)} />
                          </Tag>
                        ))}
                        {skillsList.length === 0 && (
                          <Text fontSize="2xs" color="gray.500" fontStyle="italic">
                            No skills added yet in this category.
                          </Text>
                        )}
                      </Flex>
                    </CardBody>
                  </Card>
                )
              })}
            </SimpleGrid>
          </TabPanel>

          {/* TAB 3: Work Experience & Projects */}
          <TabPanel px={0}>
            <Box mb={4} textAlign="right">
              <Button
                size="xs"
                bg="rgba(82, 95, 225, 0.2)"
                border="1px solid #525FE1"
                color="#FFF6F4"
                _hover={{ bg: '#525FE1' }}
                leftIcon={<FiPlus />}
                onClick={handleAddExperience}
              >
                Add Experience Entry
              </Button>
            </Box>

            <VStack spacing={4} align="stretch">
              {(profile.experience || []).map((exp, expIdx) => (
                <Card key={expIdx} bg="rgba(15, 19, 29, 0.7)" border="1px solid rgba(255, 255, 255, 0.08)" borderRadius="xl">
                  <CardBody p={4}>
                    <Flex justify="space-between" align="center" mb={3}>
                      <HStack spacing={2}>
                        <FiBriefcase color="#FFA41B" />
                        <Heading size="xs" color="#FFF6F4" fontWeight="700">
                          {exp.role || 'Role'} @ {exp.company || 'Company'}
                        </Heading>
                      </HStack>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        icon={<FiTrash2 />}
                        onClick={() => handleRemoveExperience(expIdx)}
                        aria-label="Remove role"
                      />
                    </Flex>

                    <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3} mb={3}>
                      <FormControl>
                        <FormLabel fontSize="3xs" color="gray.400" mb={1}>Company</FormLabel>
                        <Input
                          size="xs"
                          value={exp.company || ''}
                          onChange={(e) => handleUpdateExperience(expIdx, 'company', e.target.value)}
                          bg="rgba(10, 13, 20, 0.8)"
                          color="white"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="3xs" color="gray.400" mb={1}>Job Title</FormLabel>
                        <Input
                          size="xs"
                          value={exp.role || ''}
                          onChange={(e) => handleUpdateExperience(expIdx, 'role', e.target.value)}
                          bg="rgba(10, 13, 20, 0.8)"
                          color="white"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="3xs" color="gray.400" mb={1}>Dates (e.g. 2022 - Present)</FormLabel>
                        <Input
                          size="xs"
                          value={exp.dates || ''}
                          onChange={(e) => handleUpdateExperience(expIdx, 'dates', e.target.value)}
                          bg="rgba(10, 13, 20, 0.8)"
                          color="white"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="3xs" color="gray.400" mb={1}>Location</FormLabel>
                        <Input
                          size="xs"
                          value={exp.location || ''}
                          onChange={(e) => handleUpdateExperience(expIdx, 'location', e.target.value)}
                          bg="rgba(10, 13, 20, 0.8)"
                          color="white"
                        />
                      </FormControl>
                    </SimpleGrid>

                    <FormControl>
                      <FormLabel fontSize="3xs" color="gray.400" mb={1}>Achievement Bullets (one per line, STAR formula)</FormLabel>
                      <Textarea
                        size="xs"
                        rows={3}
                        value={(exp.bullets || []).join('\n')}
                        onChange={(e) => handleUpdateExperience(expIdx, 'bullets', e.target.value.split('\n'))}
                        bg="rgba(10, 13, 20, 0.8)"
                        color="white"
                      />
                    </FormControl>
                  </CardBody>
                </Card>
              ))}

              {(profile.experience || []).length === 0 && (
                <Card bg="rgba(15, 19, 29, 0.4)" border="1px dashed rgba(255, 255, 255, 0.1)" borderRadius="xl">
                  <CardBody textAlign="center" py={8}>
                    <Text fontSize="xs" color="gray.400">No work experience listed yet.</Text>
                    <Button size="xs" mt={2} onClick={handleAddExperience}>Add your first role</Button>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
