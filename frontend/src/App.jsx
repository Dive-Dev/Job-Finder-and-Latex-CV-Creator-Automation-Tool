import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Container,
  Flex,
  Text,
  Badge,
  HStack,
  useDisclosure,
  useToast,
  Spinner,
} from '@chakra-ui/react'
import { api } from './api'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import AgentTab from './components/AgentTab'
import DiscoveryTab from './components/DiscoveryTab'
import CompanySitesTab from './components/CompanySitesTab'
import PipelineTab from './components/PipelineTab'
import LatexStudioTab from './components/LatexStudioTab'
import CoverLetterStudio from './components/CoverLetterStudio'
import CompanyIntelTab from './components/CompanyIntelTab'
import InterviewPrepTab from './components/InterviewPrepTab'
import ContactsTab from './components/ContactsTab'
import AiInspectorTab from './components/AiInspectorTab'
import SettingsTab from './components/SettingsTab'
import ProfileTab from './components/ProfileTab'
import NewJobModal from './components/NewJobModal'
import OutreachModal from './components/OutreachModal'
import LoginModal from './components/LoginModal'

export default function App() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('agent')
  const [loading, setLoading] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Mobile Drawer Disclosure for Sidebar
  const {
    isOpen: isMobileNavOpen,
    onOpen: onOpenMobileNav,
    onClose: onCloseMobileNav,
  } = useDisclosure()

  // Global Data
  const [stats, setStats] = useState({
    total: 0,
    wishlist: 0,
    applied: 0,
    interviewing: 0,
    offer: 0,
    rejected: 0,
  })
  const [jobs, setJobs] = useState([])
  const [profile, setProfile] = useState({})

  // Cross-tab interaction states
  const [selectedCvJobId, setSelectedCvJobId] = useState('')
  const [selectedCvFilename, setSelectedCvFilename] = useState('')
  const [selectedCoverLetterJob, setSelectedCoverLetterJob] = useState(null)
  const [outreachContact, setOutreachContact] = useState(null)
  const [contactsInitialCompany, setContactsInitialCompany] = useState('')

  // Modals
  const {
    isOpen: isAddJobOpen,
    onOpen: onOpenAddJob,
    onClose: onCloseAddJob,
  } = useDisclosure()

  const {
    isOpen: isOutreachOpen,
    onOpen: onOpenOutreach,
    onClose: onCloseOutreach,
  } = useDisclosure()

  const {
    isOpen: isLoginOpen,
    onOpen: onOpenLogin,
    onClose: onCloseLogin,
  } = useDisclosure()

  // Load Initial Data
  const loadStats = useCallback(async () => {
    try {
      const data = await api.getStats()
      if (data?.stats) {
        setStats(data.stats)
      } else if (data && !data.error) {
        setStats(data)
      }
    } catch (err) {
      console.warn('Failed to fetch stats:', err.message)
    }
  }, [])

  const loadJobs = useCallback(async () => {
    try {
      const data = await api.getJobs()
      if (data?.jobs && Array.isArray(data.jobs)) {
        setJobs(data.jobs)
      } else if (Array.isArray(data)) {
        setJobs(data)
      }
    } catch (err) {
      console.warn('Failed to fetch jobs:', err.message)
    }
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      const data = await api.getProfile()
      if (data?.profile) {
        setProfile(data.profile)
      } else if (data && !data.error) {
        setProfile(data)
      }
    } catch (err) {
      console.warn('Failed to fetch profile:', err.message)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadStats(), loadJobs(), loadProfile()])
  }, [loadStats, loadJobs, loadProfile])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await refreshAll()
      setLoading(false)
    }
    init()
  }, [refreshAll])

  // Navigation & Handlers
  const handleSelectJobForCv = (jobId, filename) => {
    setSelectedCvJobId(jobId || '')
    setSelectedCvFilename(filename || '')
    setActiveTab('latex')
  }

  const handleSelectJobForCoverLetter = (job) => {
    setSelectedCoverLetterJob(job)
    setActiveTab('coverletter')
  }

  const handleOpenOutreachForContact = (contact) => {
    setOutreachContact(contact)
    onOpenOutreach()
  }

  const handleFindHrForCompany = (companyName) => {
    setContactsInitialCompany(companyName)
    setActiveTab('contacts')
  }

  const handleJobAdded = async () => {
    await refreshAll()
    toast({
      title: 'Job Added',
      description: 'New opportunity added to your pipeline.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
  }

  return (
    <Flex minH="100vh" bg="dark.bg" color="gray.100" position="relative">
      {/* Left Toolbar / Collapsible Sidebar with Burger Menu */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileNavOpen}
        onMobileClose={onCloseMobileNav}
      />

      {/* Main Column: Top Bar + Content + Footer */}
      <Flex flex="1" direction="column" minW="0">
        {/* Minimal Important Top Bar */}
        <TopBar
          activeTab={activeTab}
          onOpenAddJob={onOpenAddJob}
          currentUser={profile}
          onOpenLogin={onOpenLogin}
        />

        {/* Main Content Area - Supports Both Horizontal and Vertical Scrollbars Whenever Needed */}
        <Box as="main" flex="1" py={6} px={{ base: 4, md: 6, lg: 8 }} overflowX="auto" overflowY="auto" className="custom-scroll">
          <Container maxW="1680px" px={0}>
          {loading ? (
            <Flex justify="center" align="center" minH="50vh" direction="column" gap={4}>
              <Spinner size="xl" color="brand.500" thickness="3px" speed="0.8s" />
              <Text color="gray.400" fontSize="sm">
                Initializing JobPulse AI Studio...
              </Text>
            </Flex>
          ) : (
            <>
              {activeTab === 'agent' && (
                <AgentTab
                  onNavigateTab={setActiveTab}
                  onSelectJobForCv={handleSelectJobForCv}
                  onSelectJobForCoverLetter={handleSelectJobForCoverLetter}
                  onOpenOutreachForContact={handleOpenOutreachForContact}
                />
              )}

              {activeTab === 'discovery' && (
                <DiscoveryTab
                  userProfile={profile}
                  refreshJobs={refreshAll}
                  onSelectJobForCv={handleSelectJobForCv}
                  onSelectJobForCoverLetter={handleSelectJobForCoverLetter}
                  onFindHrForCompany={handleFindHrForCompany}
                />
              )}

              {activeTab === 'companies' && (
                <CompanySitesTab
                  refreshJobs={refreshAll}
                  onSelectJobForCv={handleSelectJobForCv}
                  onSelectJobForCoverLetter={handleSelectJobForCoverLetter}
                  onFindHrForCompany={handleFindHrForCompany}
                />
              )}

              {activeTab === 'intel' && (
                <CompanyIntelTab
                  onNavigateToCoverLetter={(target) => {
                    setSelectedCoverLetterJob(target)
                    setActiveTab('coverletter')
                  }}
                  onFindHrForCompany={handleFindHrForCompany}
                />
              )}

              {activeTab === 'pipeline' && (
                <PipelineTab
                  jobs={jobs}
                  refreshJobs={refreshAll}
                  onSelectJobForCv={handleSelectJobForCv}
                  onSelectJobForCoverLetter={handleSelectJobForCoverLetter}
                  onSelectJobForPrep={() => setActiveTab('prep')}
                  onFindHrForCompany={handleFindHrForCompany}
                />
              )}

              {activeTab === 'latex' && (
                <LatexStudioTab
                  jobs={jobs}
                  profile={profile}
                  refreshProfile={loadProfile}
                  selectedCvJobId={selectedCvJobId}
                  selectedCvFilename={selectedCvFilename}
                />
              )}

              {activeTab === 'coverletter' && (
                <CoverLetterStudio
                  jobs={jobs}
                  profile={profile}
                />
              )}

              {activeTab === 'prep' && (
                <InterviewPrepTab
                  jobs={jobs}
                  profile={profile}
                />
              )}

              {activeTab === 'contacts' && (
                <ContactsTab
                  onOpenOutreachForContact={handleOpenOutreachForContact}
                  initialCompany={contactsInitialCompany}
                />
              )}

              {activeTab === 'ai' && (
                <AiInspectorTab jobs={jobs} />
              )}

              {activeTab === 'profile' && (
                <ProfileTab
                  onProfileUpdated={(updated) => {
                    setProfile(updated)
                    refreshAll()
                  }}
                  onNavigateDiscovery={(query) => {
                    setActiveTab('discovery')
                  }}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsTab />
              )}
            </>
          )}
        </Container>
      </Box>

      {/* Modern Status Footer */}
      <Box
        as="footer"
        borderTop="1px solid"
        borderColor="rgba(255, 246, 244, 0.07)"
        bg="rgba(10, 13, 22, 0.96)"
        py={3}
        px={{ base: 4, md: 6 }}
        fontSize="xs"
        color="gray.400"
      >
        <Flex
          maxW="1680px"
          mx="auto"
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={3}
        >
          <HStack spacing={3}>
            <Flex align="center" gap={1.5}>
              <Box w="7px" h="7px" borderRadius="full" bg="#F86F03" boxShadow="0 0 8px #F86F03" />
              <Text color="#FFF6F4" fontWeight="600">Local Engine Active</Text>
            </Flex>
            <Text color="gray.600">•</Text>
            <Text>LaTeX Compiler Engine: Online</Text>
            <Text color="gray.600">•</Text>
            <Text>Ollama / LM Studio Bridge: Ready</Text>
          </HStack>

          <HStack spacing={3}>
            <Badge
              bg="rgba(82, 95, 225, 0.18)"
              color="#8f98f3"
              border="1px solid rgba(82, 95, 225, 0.35)"
              fontSize="2xs"
            >
              Chakra UI v2 + React 18
            </Badge>
            <Badge
              bg="rgba(255, 164, 27, 0.15)"
              color="#FFA41B"
              border="1px solid rgba(255, 164, 27, 0.35)"
              fontSize="2xs"
            >
              ATS-Optimized LaTeX
            </Badge>
            <Text color="#FFF6F4" opacity={0.7}>JobPulse AI Automation</Text>
          </HStack>
        </Flex>
      </Box>
    </Flex>

    {/* Global Modals */}
    <NewJobModal
      isOpen={isAddJobOpen}
      onClose={onCloseAddJob}
      onJobAdded={handleJobAdded}
    />

    <OutreachModal
      isOpen={isOutreachOpen}
      onClose={onCloseOutreach}
      contact={outreachContact}
      profile={profile}
    />

    <LoginModal
      isOpen={isLoginOpen}
      onClose={onCloseLogin}
      currentUser={profile}
      onLoginSuccess={(newProfile) => {
        setProfile(newProfile)
        refreshAll()
      }}
    />
  </Flex>
)
}
