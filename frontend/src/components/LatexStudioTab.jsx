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
  useToast,
  Card,
  CardBody,
  Divider,
  Tag,
  FormControl,
  FormLabel,
} from '@chakra-ui/react'
import {
  FiFileText,
  FiZap,
  FiDownload,
  FiExternalLink,
  FiCopy,
  FiSave,
} from 'react-icons/fi'
import { api } from '../api'

export default function LatexStudioTab({ jobs = [], profile = {}, refreshProfile, selectedCvJobId, selectedCvFilename }) {
  const toast = useToast()

  // Profile Form state
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [github, setGithub] = useState('')
  const [location, setLocation] = useState('')
  const [summary, setSummary] = useState('')
  const [skillsRaw, setSkillsRaw] = useState('')

  // Job tailoring
  const [selectedJobId, setSelectedJobId] = useState(selectedCvJobId || '')
  const [latexCode, setLatexCode] = useState('')
  const [lastTexFilename, setLastTexFilename] = useState(selectedCvFilename || 'Resume_CV.tex')
  const [lastPdfFilename, setLastPdfFilename] = useState(null)
  const [overleafUrl, setOverleafUrl] = useState('')

  const [generating, setGenerating] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setTitle(profile.title || '')
      setEmail(profile.email || '')
      setPhone(profile.phone || '')
      setLinkedin(profile.linkedin || '')
      setGithub(profile.github || '')
      setLocation(profile.location || '')
      setSummary(profile.summary || '')

      if (profile.skills && typeof profile.skills === 'object') {
        const lines = Object.entries(profile.skills)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('\n')
        setSkillsRaw(lines)
      }
    }
  }, [profile])

  // Load specific file if provided via navigation
  useEffect(() => {
    if (selectedCvFilename) {
      loadTexFile(selectedCvFilename)
    }
  }, [selectedCvFilename])

  const loadTexFile = async (fname) => {
    try {
      const res = await api.viewLatexFile(fname)
      if (res.success && res.content) {
        setLatexCode(res.content)
        setLastTexFilename(fname)
        toast({ title: `Loaded ${fname}`, status: 'info', duration: 2000 })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const skillsObj = {}
      skillsRaw.split('\n').forEach((line) => {
        if (line.includes(':')) {
          const [k, v] = line.split(':')
          skillsObj[k.trim()] = v.split(',').map((s) => s.trim()).filter(Boolean)
        }
      })

      const updated = {
        ...profile,
        name,
        title,
        email,
        phone,
        linkedin,
        github,
        location,
        summary,
        skills: Object.keys(skillsObj).length > 0 ? skillsObj : profile.skills,
      }

      await api.saveProfile(updated)
      toast({ title: 'Candidate Profile Saved!', status: 'success', duration: 2500 })
      refreshProfile()
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, status: 'error' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleGenerateCv = async () => {
    setGenerating(true)
    try {
      const targetJob = jobs.find((j) => j.id === selectedJobId)
      const res = await api.generateLatexCV({
        profile: {
          ...profile,
          name,
          title,
          email,
          phone,
          linkedin,
          github,
          location,
          summary,
        },
        job_data: targetJob || null,
      })
      if (res.success && res.result) {
        const r = res.result
        setLatexCode(r.latex_code || '')
        setLastTexFilename(r.tex_filename || 'Resume_CV.tex')
        setLastPdfFilename(r.pdf_compiled ? r.tex_filename.replace('.tex', '.pdf') : null)
        setOverleafUrl(r.overleaf_url || '')
        toast({ title: 'LaTeX Resume Generated!', description: `Saved as ${r.tex_filename}`, status: 'success', duration: 3000 })
      }
    } catch (err) {
      toast({ title: 'Generation failed', description: err.message, status: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyCode = () => {
    if (!latexCode) return
    navigator.clipboard.writeText(latexCode)
    toast({ title: 'LaTeX code copied to clipboard!', status: 'success', duration: 2000 })
  }

  return (
    <Box maxW="1500px" mx="auto" py={4}>
      <Card bgGradient="linear(to-r, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))" mb={6} borderColor="rgba(99, 102, 241, 0.3)">
        <CardBody p={5}>
          <Flex justify="space-between" align={{ base: 'start', md: 'center' }} wrap="wrap" gap={4}>
            <Box>
              <Heading size="md" color="white" fontWeight="800">
                📄 Professional LaTeX CV Studio
              </Heading>
              <Text fontSize="sm" color="gray.300" mt={1}>
                Generate and edit ATS-optimized single-page LaTeX resumes. Ready for local compilation or instant 1-click Overleaf cloud export.
              </Text>
            </Box>

            <HStack spacing={3}>
              <Button size="sm" variant="outline" leftIcon={<FiSave />} isLoading={savingProfile} onClick={handleSaveProfile}>
                Save Profile
              </Button>
              <Button size="sm" variant="gradient" leftIcon={<FiZap />} isLoading={generating} onClick={handleGenerateCv}>
                Generate LaTeX CV
              </Button>
            </HStack>
          </Flex>
        </CardBody>
      </Card>

      <Grid templateColumns={{ base: '1fr', lg: '450px 1fr' }} gap={6}>
        {/* Left: Candidate Profile Form */}
        <VStack spacing={4} align="stretch">
          <Card>
            <CardBody p={5}>
              <Heading size="xs" textTransform="uppercase" color="gray.400" mb={3} letterSpacing="wider">
                🎯 Job Tailoring Target
              </Heading>
              <FormControl mb={3}>
                <FormLabel fontSize="xs" color="gray.300" mb={1}>Tailor for Opportunity</FormLabel>
                <Select size="sm" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                  <option value="">-- Master Profile (Standard CV) --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} @ {j.company} ({j.match_score || 75}%)
                    </option>
                  ))}
                </Select>
              </FormControl>
            </CardBody>
          </Card>

          <Card>
            <CardBody p={5}>
              <Heading size="xs" textTransform="uppercase" color="gray.400" mb={3} letterSpacing="wider">
                👤 Candidate Master Profile
              </Heading>

              <VStack spacing={3} align="stretch">
                <HStack spacing={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Full Name</FormLabel>
                    <Input size="sm" value={name} onChange={(e) => setName(e.target.value)} />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Title</FormLabel>
                    <Input size="sm" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </FormControl>
                </HStack>

                <HStack spacing={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Email</FormLabel>
                    <Input size="sm" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>Phone</FormLabel>
                    <Input size="sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </FormControl>
                </HStack>

                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>LinkedIn</FormLabel>
                    <Input size="sm" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.300" mb={1}>GitHub</FormLabel>
                    <Input size="sm" value={github} onChange={(e) => setGithub(e.target.value)} />
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Location</FormLabel>
                  <Input size="sm" value={location} onChange={(e) => setLocation(e.target.value)} />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Executive Summary</FormLabel>
                  <Textarea size="sm" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Skills (Category: Skill1, Skill2)</FormLabel>
                  <Textarea size="sm" rows={4} value={skillsRaw} onChange={(e) => setSkillsRaw(e.target.value)} />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>
        </VStack>

        {/* Right: LaTeX Code & Action Bar */}
        <Card minH="700px">
          <CardBody p={4}>
            <Flex justify="space-between" align="center" mb={3} pb={2} borderBottom="1px solid rgba(255,255,255,0.08)" wrap="wrap" gap={2}>
              <Box>
                <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider">
                  ⚡ LaTeX Code Editor ({lastTexFilename})
                </Heading>
              </Box>

              <HStack spacing={2}>
                <Button size="xs" variant="outline" leftIcon={<FiCopy />} onClick={handleCopyCode}>
                  Copy Code
                </Button>
                <Button
                  as="a"
                  href={`/api/latex/download/${encodeURIComponent(lastTexFilename)}`}
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
                    href={`/api/latex/download/${encodeURIComponent(lastPdfFilename)}`}
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

            <Textarea
              value={latexCode || '% Click "Generate LaTeX CV" above to generate your customized resume code.'}
              onChange={(e) => setLatexCode(e.target.value)}
              fontFamily="mono"
              fontSize="xs"
              minH="620px"
              bg="blackAlpha.600"
              color="green.300"
              borderColor="rgba(255,255,255,0.1)"
            />
          </CardBody>
        </Card>
      </Grid>
    </Box>
  )
}
