import React from 'react'
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Badge,
  useToast,
  IconButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  useDisclosure,
  Divider,
} from '@chakra-ui/react'
import {
  FiZap,
  FiCompass,
  FiBriefcase,
  FiCpu,
  FiList,
  FiFileText,
  FiMail,
  FiUsers,
  FiSliders,
  FiPlus,
  FiRefreshCw,
  FiGlobe,
  FiAward,
  FiMenu,
  FiChevronRight
} from 'react-icons/fi'
import { api } from '../api'

export default function Navbar({ activeTab, setActiveTab, onOpenAddJob }) {
  const toast = useToast()
  const [syncing, setSyncing] = React.useState(false)
  const { isOpen: isMobileNavOpen, onOpen: onOpenMobileNav, onClose: onCloseMobileNav } = useDisclosure()

  const handleSyncSheets = async () => {
    setSyncing(true)
    try {
      const res = await api.syncSheets()
      if (res.success) {
        toast({
          title: 'Google Sheets Synced!',
          description: res.message || 'All applications synchronized.',
          status: 'success',
          duration: 3500,
          isClosable: true,
        })
      } else {
        toast({
          title: 'Sync Note',
          description: res.message || 'Check Google Sheet configuration.',
          status: 'info',
          duration: 4000,
          isClosable: true,
        })
      }
    } catch (err) {
      toast({
        title: 'Sync Error',
        description: err.message,
        status: 'error',
        duration: 4000,
      })
    } finally {
      setSyncing(false)
    }
  }

  // Workspaces grouping for clear cognitive hierarchy & uncluttered navigation
  const navWorkspaces = [
    {
      group: 'Core Pipeline',
      items: [
        { id: 'agent', label: 'Autonomous Agent', icon: FiCpu, isSpecial: true },
        { id: 'pipeline', label: 'Pipeline Tracker', icon: FiList },
      ]
    },
    {
      group: 'Market Intelligence',
      items: [
        { id: 'discovery', label: 'Discovery', icon: FiCompass },
        { id: 'companies', label: 'Company Sites', icon: FiBriefcase },
        { id: 'intel', label: 'Company Intel & Crawler', icon: FiGlobe, isNew: true },
      ]
    },
    {
      group: 'Application Studio',
      items: [
        { id: 'latex', label: 'LaTeX CV Studio', icon: FiFileText },
        { id: 'coverletter', label: 'Cover Letter', icon: FiMail },
        { id: 'prep', label: 'Interview Prep', icon: FiAward, isNew: true },
        { id: 'ai', label: 'AI JD Inspector', icon: FiZap },
      ]
    },
    {
      group: 'Outreach & Settings',
      items: [
        { id: 'contacts', label: 'People & Referrals', icon: FiUsers },
        { id: 'settings', label: 'Settings & Mailer', icon: FiSliders },
      ]
    }
  ]

  // Flattened for desktop fast access
  const allNavItems = navWorkspaces.flatMap(w => w.items)

  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex="1000"
      bg="rgba(10, 13, 20, 0.92)"
      backdropFilter="blur(24px)"
      borderBottom="1px solid"
      borderColor="rgba(255, 255, 255, 0.08)"
      px={{ base: 4, md: 6, lg: 8 }}
      py={3}
    >
      <Flex justify="space-between" align="center" gap={3}>
        {/* Brand Logo & Name */}
        <Flex align="center" gap={3} cursor="pointer" onClick={() => setActiveTab('agent')}>
          <Flex
            w="38px"
            h="38px"
            align="center"
            justify="center"
            borderRadius="xl"
            bgGradient="linear(to-br, brand.500, accent.violet)"
            color="white"
            boxShadow="0 0 18px rgba(99, 102, 241, 0.45)"
            fontSize="lg"
            fontWeight="bold"
          >
            ⚡
          </Flex>
          <Box>
            <Flex align="center" gap={2}>
              <Heading size="sm" fontWeight="800" letterSpacing="-0.03em" color="white">
                JobPulse AI
              </Heading>
              <Badge colorScheme="purple" variant="solid" fontSize="3xs" px={1.5} py={0.5} borderRadius="sm">
                STUDIO PRO
              </Badge>
            </Flex>
            <Text fontSize="3xs" color="gray.400" fontWeight="500">
              Executive Career Automation Suite
            </Text>
          </Box>
        </Flex>

        {/* Header Right Actions */}
        <HStack spacing={2.5}>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<FiRefreshCw className={syncing ? 'spin' : ''} />}
            isLoading={syncing}
            onClick={handleSyncSheets}
            display={{ base: 'none', sm: 'inline-flex' }}
            fontSize="xs"
            title="Sync all tracked jobs to Google Sheets"
          >
            Sync Sheets
          </Button>

          <Button
            size="sm"
            variant="gradient"
            leftIcon={<FiPlus />}
            onClick={onOpenAddJob}
            fontSize="xs"
          >
            Add Job
          </Button>

          {/* Mobile Hamburger Menu Button */}
          <IconButton
            display={{ base: 'inline-flex', lg: 'none' }}
            aria-label="Open Navigation Menu"
            icon={<FiMenu />}
            size="sm"
            variant="outline"
            onClick={onOpenMobileNav}
          />
        </HStack>
      </Flex>

      {/* Desktop Horizontal Navigation (Scrollable & Clean, No visual noise) */}
      <Box mt={3} pt={2} borderTop="1px solid rgba(255,255,255,0.04)" display={{ base: 'none', lg: 'block' }}>
        <Flex justify="space-between" align="center">
          <HStack spacing={1} overflowX="auto" py={0.5} maxW="100%">
            {allNavItems.map((item) => {
              const isActive = activeTab === item.id
              const IconComponent = item.icon
              return (
                <Button
                  key={item.id}
                  size="xs"
                  variant={isActive ? 'solid' : 'ghost'}
                  bg={
                    isActive
                      ? item.isSpecial
                        ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                        : 'brand.500'
                      : item.isSpecial
                      ? 'rgba(99, 102, 241, 0.12)'
                      : 'transparent'
                  }
                  color={
                    isActive
                      ? 'white'
                      : item.isSpecial
                      ? 'brand.300'
                      : 'gray.400'
                  }
                  leftIcon={<IconComponent />}
                  onClick={() => setActiveTab(item.id)}
                  fontWeight={isActive ? '700' : '600'}
                  fontSize="xs"
                  px={3}
                  py={1.5}
                  borderRadius="md"
                  _hover={{
                    bg: isActive ? undefined : 'rgba(255, 255, 255, 0.06)',
                    color: 'white',
                  }}
                >
                  {item.label}
                  {item.isNew && (
                    <Badge ml={1.5} colorScheme="green" fontSize="3xs" px={1} py={0} borderRadius="xs">
                      NEW
                    </Badge>
                  )}
                  {item.isSpecial && !isActive && (
                    <Badge ml={1.5} colorScheme="purple" fontSize="3xs" px={1} py={0} borderRadius="xs">
                      AGENT
                    </Badge>
                  )}
                </Button>
              )
            })}
          </HStack>
        </Flex>
      </Box>

      {/* Mobile Glassmorphic Navigation Drawer */}
      <Drawer isOpen={isMobileNavOpen} placement="left" onClose={onCloseMobileNav}>
        <DrawerOverlay backdropFilter="blur(12px)" bg="blackAlpha.700" />
        <DrawerContent bg="#0f131d" borderRight="1px solid rgba(255,255,255,0.08)" color="gray.100">
          <DrawerCloseButton color="gray.400" />
          <DrawerHeader pt={6} pb={3} borderBottom="1px solid rgba(255,255,255,0.06)">
            <HStack spacing={2.5}>
              <Flex
                w="32px"
                h="32px"
                align="center"
                justify="center"
                borderRadius="lg"
                bgGradient="linear(to-br, brand.500, accent.violet)"
                color="white"
                fontSize="sm"
                fontWeight="bold"
              >
                ⚡
              </Flex>
              <Box>
                <Heading size="xs" color="white" fontWeight="800">JobPulse AI</Heading>
                <Text fontSize="3xs" color="gray.400">Navigation Menu</Text>
              </Box>
            </HStack>
          </DrawerHeader>

          <DrawerBody py={4} px={4}>
            <VStack spacing={5} align="stretch">
              {navWorkspaces.map((workspace, wIdx) => (
                <Box key={wIdx}>
                  <Text fontSize="3xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" color="gray.500" mb={2} px={2}>
                    {workspace.group}
                  </Text>
                  <VStack spacing={1} align="stretch">
                    {workspace.items.map((item) => {
                      const isActive = activeTab === item.id
                      const IconComponent = item.icon
                      return (
                        <Flex
                          key={item.id}
                          align="center"
                          justify="space-between"
                          p={2.5}
                          borderRadius="lg"
                          bg={isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent'}
                          border="1px solid"
                          borderColor={isActive ? 'brand.500' : 'transparent'}
                          color={isActive ? 'white' : 'gray.300'}
                          cursor="pointer"
                          onClick={() => {
                            setActiveTab(item.id)
                            onCloseMobileNav()
                          }}
                          _hover={{ bg: 'rgba(255, 255, 255, 0.05)', color: 'white' }}
                        >
                          <HStack spacing={2.5}>
                            <IconComponent color={isActive ? '#818cf8' : '#9ca3af'} />
                            <Text fontSize="xs" fontWeight={isActive ? '700' : '500'}>
                              {item.label}
                            </Text>
                            {item.isNew && (
                              <Badge colorScheme="green" fontSize="3xs" px={1} borderRadius="xs">
                                NEW
                              </Badge>
                            )}
                          </HStack>
                          <FiChevronRight fontSize="12px" color="rgba(255,255,255,0.2)" />
                        </Flex>
                      )
                    })}
                  </VStack>
                </Box>
              ))}

              <Divider borderColor="rgba(255,255,255,0.06)" />

              <Button
                size="sm"
                variant="outline"
                leftIcon={<FiRefreshCw className={syncing ? 'spin' : ''} />}
                isLoading={syncing}
                onClick={handleSyncSheets}
                w="full"
              >
                Sync with Google Sheets
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  )
}
