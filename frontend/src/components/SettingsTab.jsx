import React, { useState, useEffect } from 'react'
import {
  Box,
  Heading,
  Text,
  Button,
  Input,
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
  Switch,
  Spinner,
} from '@chakra-ui/react'
import { FiSave, FiMail, FiCpu, FiCheckCircle, FiRefreshCw, FiSliders } from 'react-icons/fi'
import { api } from '../api'

export default function SettingsTab() {
  const toast = useToast()

  // General Settings
  const [sheetName, setSheetName] = useState('Job Tracker')
  const [geminiKey, setGeminiKey] = useState('')
  const [saving, setSaving] = useState(false)

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpFromName, setSmtpFromName] = useState('JobPulse Candidate')
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [smtpStatus, setSmtpStatus] = useState(null)

  // Auto-Training State
  const [trainingProfile, setTrainingProfile] = useState(null)
  const [trainingActive, setTrainingActive] = useState(false)

  useEffect(() => {
    loadSettings()
    loadTrainStatus()
  }, [])

  const loadSettings = async () => {
    try {
      const cfg = await api.getSmtpConfig()
      if (cfg && cfg.config) {
        setSmtpHost(cfg.config.host || 'smtp.gmail.com')
        setSmtpPort(String(cfg.config.port || 587))
        setSmtpUser(cfg.config.user || '')
        setSmtpFromName(cfg.config.from_name || 'JobPulse Candidate')
      }
    } catch (e) {
      console.warn(e)
    }
  }

  const loadTrainStatus = async () => {
    try {
      const res = await api.getAgentTrainStatus()
      if (res && res.training_profile) {
        setTrainingProfile(res.training_profile)
      }
    } catch (e) {
      console.warn(e)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.saveSettings({
        google_sheet_name: sheetName,
        gemini_api_key: geminiKey,
      })
      if (res.success) {
        toast({ title: 'Settings Updated!', status: 'success', duration: 2500 })
      }
    } catch (err) {
      toast({ title: 'Failed saving settings', description: err.message, status: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestSmtp = async () => {
    setTestingSmtp(true)
    setSmtpStatus(null)
    try {
      const res = await api.testSmtp({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        user: smtpUser,
        password: smtpPassword,
        use_tls: true
      })
      setSmtpStatus(res)
      toast({
        title: res.success ? 'SMTP Connected!' : 'SMTP Warning',
        description: res.message,
        status: res.success ? 'success' : 'warning',
        duration: 4000,
      })
    } catch (err) {
      toast({
        title: 'Connection Error',
        description: err.message,
        status: 'error',
      })
    } finally {
      setTestingSmtp(false)
    }
  }

  const handleTriggerTraining = async () => {
    setTrainingActive(true)
    try {
      const res = await api.trainAgent()
      if (res.success) {
        toast({
          title: 'Training Cycle Finished!',
          description: `Pre & Post-processing optimized. Epoch ${res.epochs_completed} recorded.`,
          status: 'success',
          duration: 3500,
        })
        loadTrainStatus()
      }
    } catch (err) {
      toast({
        title: 'Training Failed',
        description: err.message,
        status: 'error',
      })
    } finally {
      setTrainingActive(false)
    }
  }

  return (
    <Box maxW="960px" mx="auto" py={4}>
      {/* Header Banner */}
      <Card bgGradient="linear(to-r, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))" mb={6} borderColor="rgba(99, 102, 241, 0.3)">
        <CardBody p={5}>
          <Heading size="md" color="white" fontWeight="800">
            ⚙️ System Settings, SMTP Mailer & Agent Auto-Training
          </Heading>
          <Text fontSize="sm" color="gray.300" mt={1}>
            Configure automated referral email dispatch, Google Sheets sync, and continuous agent self-training.
          </Text>
        </CardBody>
      </Card>

      <VStack spacing={6} align="stretch">
        {/* Section 1: Referral Email SMTP Configuration */}
        <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
          <CardBody p={6}>
            <Flex justify="space-between" align="center" mb={4}>
              <HStack spacing={2}>
                <FiMail color="#818cf8" />
                <Heading size="sm" fontWeight="700">Referral Email Dispatch (SMTP)</Heading>
              </HStack>
              <Badge colorScheme="purple">DIRECT OUTREACH</Badge>
            </Flex>

            <Text fontSize="xs" color="gray.400" mb={4}>
              Enables 1-click automated delivery of personalized referral emails and cold pitches with optional attached PDF resumes.
            </Text>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.300">SMTP Host</FormLabel>
                <Input size="sm" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" color="gray.300">SMTP Port</FormLabel>
                <Input size="sm" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" color="gray.300">Sender Email (Username)</FormLabel>
                <Input size="sm" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="your.email@gmail.com" />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" color="gray.300">App Password</FormLabel>
                <Input size="sm" type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder="16-character App Password" />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" color="gray.300">Sender Display Name</FormLabel>
                <Input size="sm" value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} placeholder="John Doe" />
              </FormControl>
            </SimpleGrid>

            <HStack spacing={3}>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<FiCheckCircle />}
                isLoading={testingSmtp}
                onClick={handleTestSmtp}
              >
                Test SMTP Connection
              </Button>
              {smtpStatus && (
                <Text fontSize="xs" color={smtpStatus.success ? 'green.300' : 'yellow.300'}>
                  {smtpStatus.message}
                </Text>
              )}
            </HStack>
          </CardBody>
        </Card>

        {/* Section 2: Agent Auto-Training & Continuous Learning */}
        <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
          <CardBody p={6}>
            <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap={2} mb={3}>
              <HStack spacing={2}>
                <FiCpu color="#06b6d4" />
                <Heading size="sm" fontWeight="700">Agent Continuous Learning & Auto-Training</Heading>
              </HStack>
              <Badge colorScheme="cyan">
                EPOCH #{trainingProfile?.training_epochs_completed || 0}
              </Badge>
            </Flex>

            <Text fontSize="xs" color="gray.400" mb={4}>
              Auto-trains pre-processing (noise filtering, stop-word elimination, skill token clustering) and post-processing (STAR bullet optimization and few-shot memory logging) from your application results.
            </Text>

            {trainingProfile && (
              <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3} mb={4}>
                <Box p={3} bg="rgba(255,255,255,0.02)" borderRadius="md">
                  <Text fontSize="3xs" color="gray.500" textTransform="uppercase">Last Trained</Text>
                  <Text fontSize="xs" fontWeight="700" color="white">{trainingProfile.last_trained_at || 'Never'}</Text>
                </Box>
                <Box p={3} bg="rgba(255,255,255,0.02)" borderRadius="md">
                  <Text fontSize="3xs" color="gray.500" textTransform="uppercase">Pre-Processing Efficiency</Text>
                  <Text fontSize="xs" fontWeight="700" color="cyan.300">
                    {Math.round((trainingProfile.preprocessing_metrics?.clean_text_efficiency || 0.95) * 100)}% Clean
                  </Text>
                </Box>
                <Box p={3} bg="rgba(255,255,255,0.02)" borderRadius="md">
                  <Text fontSize="3xs" color="gray.500" textTransform="uppercase">STAR Optimization</Text>
                  <Text fontSize="xs" fontWeight="700" color="green.300">
                    {Math.round((trainingProfile.postprocessing_metrics?.star_bullet_optimization_score || 0.9) * 100)}% Fidelity
                  </Text>
                </Box>
              </SimpleGrid>
            )}

            <Button
              size="sm"
              variant="gradient"
              leftIcon={<FiRefreshCw className={trainingActive ? 'spin' : ''} />}
              isLoading={trainingActive}
              loadingText="Auto-Training Agent..."
              onClick={handleTriggerTraining}
            >
              Run Auto-Training Cycle Now
            </Button>
          </CardBody>
        </Card>

        {/* Section 3: Integrations (Google Sheets & Cloud Keys) */}
        <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
          <CardBody p={6}>
            <Heading size="sm" fontWeight="700" mb={4}>
              Cloud Integrations & Sheets
            </Heading>
            <form onSubmit={handleSave}>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.300">Google Sheet Name</FormLabel>
                  <Input size="sm" value={sheetName} onChange={(e) => setSheetName(e.target.value)} placeholder="Job Tracker" />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.300">Google Gemini API Key (Optional Fallback)</FormLabel>
                  <Input size="sm" type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIzaSy..." />
                </FormControl>

                <Button type="submit" variant="outline" size="sm" leftIcon={<FiSave />} isLoading={saving} alignSelf="flex-start">
                  Save Integrations
                </Button>
              </VStack>
            </form>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  )
}
