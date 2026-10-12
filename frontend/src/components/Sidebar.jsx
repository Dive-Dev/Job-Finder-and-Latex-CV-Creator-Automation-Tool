import React from 'react'
import {
  Box,
  Flex,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
} from '@chakra-ui/react'
import {
  FiCpu,
  FiList,
  FiCompass,
  FiBriefcase,
  FiGlobe,
  FiFileText,
  FiMail,
  FiAward,
  FiZap,
  FiUsers,
  FiSliders,
  FiMenu,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw
} from 'react-icons/fi'

export const navWorkspaces = [
  {
    group: 'Operations',
    items: [
      { id: 'agent', label: 'Autonomous Agent', icon: FiCpu, isSpecial: true },
      { id: 'pipeline', label: 'Pipeline Tracker', icon: FiList },
    ]
  },
  {
    group: 'Market Recon',
    items: [
      { id: 'discovery', label: 'Discovery', icon: FiCompass },
      { id: 'companies', label: 'Company Sites', icon: FiBriefcase },
      { id: 'intel', label: 'Company Intel', icon: FiGlobe, isNew: true },
    ]
  },
  {
    group: 'Studio',
    items: [
      { id: 'latex', label: 'LaTeX CV Studio', icon: FiFileText },
      { id: 'coverletter', label: 'Cover Letter', icon: FiMail },
      { id: 'prep', label: 'Interview Prep', icon: FiAward, isNew: true },
      { id: 'ai', label: 'AI JD Inspector', icon: FiZap },
    ]
  },
  {
    group: 'Network & System',
    items: [
      { id: 'contacts', label: 'People & Referrals', icon: FiUsers },
      { id: 'settings', label: 'System Settings', icon: FiSliders },
    ]
  }
]

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  onMobileClose,
}) {
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  // Sidebar content markup shared between desktop sidebar & mobile drawer
  const renderNavContent = (collapsed = false) => (
    <VStack spacing={5} align="stretch" py={3}>
      {navWorkspaces.map((workspace, wIdx) => (
        <Box key={wIdx}>
          {!collapsed && (
            <Text
              fontSize="3xs"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="0.08em"
              color="gray.500"
              mb={2}
              px={3}
            >
              {workspace.group}
            </Text>
          )}

          <VStack spacing={1} align="stretch">
            {workspace.items.map((item) => {
              const isActive = activeTab === item.id
              const IconComponent = item.icon

              const buttonElement = (
                <Flex
                  key={item.id}
                  align="center"
                  justify={collapsed ? 'center' : 'space-between'}
                  px={collapsed ? 2 : 3}
                  py={2.5}
                  borderRadius="lg"
                  bg={
                    isActive
                      ? item.isSpecial
                        ? 'linear-gradient(135deg, rgba(82, 95, 225, 0.28) 0%, rgba(248, 111, 3, 0.22) 100%)'
                        : 'rgba(82, 95, 225, 0.18)'
                      : 'transparent'
                  }
                  border="1px solid"
                  borderColor={
                    isActive
                      ? item.isSpecial
                        ? '#F86F03'
                        : '#525FE1'
                      : 'transparent'
                  }
                  color={isActive ? '#FFF6F4' : 'gray.400'}
                  cursor="pointer"
                  transition="all 0.15s ease"
                  _hover={{
                    bg: isActive ? undefined : 'rgba(255, 246, 244, 0.05)',
                    color: '#FFF6F4',
                  }}
                  onClick={() => {
                    setActiveTab(item.id)
                    if (onMobileClose) onMobileClose()
                  }}
                >
                  <HStack spacing={collapsed ? 0 : 3} justify={collapsed ? 'center' : 'flex-start'} w="full">
                    <Box
                      fontSize={collapsed ? 'lg' : 'md'}
                      color={
                        isActive
                          ? item.isSpecial
                            ? '#FFA41B'
                            : '#525FE1'
                          : 'inherit'
                      }
                    >
                      <IconComponent />
                    </Box>
                    {!collapsed && (
                      <Text fontSize="xs" fontWeight={isActive ? '700' : '500'} isTruncated>
                        {item.label}
                      </Text>
                    )}
                  </HStack>

                  {!collapsed && (
                    <HStack spacing={1}>
                      {item.isNew && (
                        <Badge
                          bg="rgba(248, 111, 3, 0.18)"
                          color="#F86F03"
                          border="1px solid rgba(248, 111, 3, 0.4)"
                          fontSize="3xs"
                          px={1.5}
                          borderRadius="xs"
                        >
                          NEW
                        </Badge>
                      )}
                      {item.isSpecial && (
                        <Badge
                          bg="rgba(82, 95, 225, 0.22)"
                          color="#8f98f3"
                          border="1px solid rgba(82, 95, 225, 0.4)"
                          fontSize="3xs"
                          px={1.5}
                          borderRadius="xs"
                        >
                          AI
                        </Badge>
                      )}
                    </HStack>
                  )}
                </Flex>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.id} label={item.label} placement="right" hasArrow>
                    {buttonElement}
                  </Tooltip>
                )
              }

              return buttonElement
            })}
          </VStack>
        </Box>
      ))}
    </VStack>
  )

  return (
    <>
      {/* --- DESKTOP LEFT TOOLBAR --- */}
      <Box
        as="aside"
        display={{ base: 'none', md: 'flex' }}
        flexDirection="column"
        w={isCollapsed ? '68px' : '250px'}
        minH="100vh"
        bg="rgba(10, 13, 20, 0.98)"
        borderRight="1px solid rgba(255, 255, 255, 0.07)"
        transition="width 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
        position="sticky"
        top="0"
        zIndex="100"
      >
        {/* Sidebar Header with Burger Toggle */}
        <Flex
          h="56px"
          align="center"
          justify={isCollapsed ? 'center' : 'space-between'}
          px={isCollapsed ? 2 : 4}
          borderBottom="1px solid rgba(255, 255, 255, 0.06)"
        >
          {!isCollapsed && (
            <Flex align="center" gap={2.5} cursor="pointer" onClick={() => setActiveTab('agent')}>
              <Flex
                w="30px"
                h="30px"
                align="center"
                justify="center"
                borderRadius="lg"
                bgGradient="linear(to-br, #525FE1 0%, #F86F03 100%)"
                boxShadow="0 2px 10px rgba(82, 95, 225, 0.45)"
                color="#FFF6F4"
                fontSize="sm"
                fontWeight="bold"
              >
                ⚡
              </Flex>
              <Box>
                <Heading size="xs" color="#FFF6F4" fontWeight="800">
                  JobPulse AI
                </Heading>
              </Box>
            </Flex>
          )}

          {/* Desktop Collapse Toggle Button */}
          <IconButton
            size="xs"
            variant="ghost"
            color="gray.400"
            _hover={{ color: '#FFF6F4', bg: 'whiteAlpha.100' }}
            icon={isCollapsed ? <FiMenu /> : <FiChevronLeft />}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            onClick={toggleCollapse}
          />
        </Flex>

        {/* Navigation Items (Scrollable) */}
        <Box flex="1" overflowY="auto" px={isCollapsed ? 2 : 3}>
          {renderNavContent(isCollapsed)}
        </Box>

        {/* Sidebar Footer */}
        <Box p={3} borderTop="1px solid rgba(255, 246, 244, 0.06)">
          {!isCollapsed ? (
            <Flex align="center" justify="space-between" fontSize="3xs" color="gray.500">
              <Text>v2.5 Pro Studio</Text>
              <Badge bg="rgba(255, 164, 27, 0.15)" color="#FFA41B" border="1px solid rgba(255, 164, 27, 0.35)" fontSize="3xs">
                Retro-Happy
              </Badge>
            </Flex>
          ) : (
            <Flex justify="center">
              <Box w="6px" h="6px" borderRadius="full" bg="#F86F03" boxShadow="0 0 6px #F86F03" />
            </Flex>
          )}
        </Box>
      </Box>

      {/* --- MOBILE DRAWER (For Phones <768px) --- */}
      <Drawer isOpen={isMobileOpen} placement="left" onClose={onMobileClose}>
        <DrawerOverlay backdropFilter="blur(12px)" bg="blackAlpha.700" />
        <DrawerContent bg="#0f131d" borderRight="1px solid rgba(255, 246, 244, 0.08)" color="#FFF6F4">
          <DrawerCloseButton color="gray.400" />
          <DrawerHeader pt={6} pb={3} borderBottom="1px solid rgba(255, 246, 244, 0.06)">
            <HStack spacing={2.5}>
              <Flex
                w="32px"
                h="32px"
                align="center"
                justify="center"
                borderRadius="lg"
                bgGradient="linear(to-br, #525FE1 0%, #F86F03 100%)"
                boxShadow="0 2px 10px rgba(82, 95, 225, 0.45)"
                color="#FFF6F4"
                fontSize="sm"
                fontWeight="bold"
              >
                ⚡
              </Flex>
              <Box>
                <Heading size="xs" color="#FFF6F4" fontWeight="800">JobPulse AI</Heading>
                <Text fontSize="3xs" color="gray.400">Navigation Workspace</Text>
              </Box>
            </HStack>
          </DrawerHeader>

          <DrawerBody py={3} px={4}>
            {renderNavContent(false)}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}
