import React, { useState } from 'react'
import {
  Box,
  Flex,
  HStack,
  Heading,
  Text,
  Button,
  Badge,
  useToast,
} from '@chakra-ui/react'
import {
  FiPlus,
  FiRefreshCw,
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
} from 'react-icons/fi'
import { api } from '../api'

const TAB_META = {
  agent: { title: 'Autonomous Agent', icon: FiCpu, badge: 'AUTO PILOT' },
  pipeline: { title: 'Pipeline Tracker', icon: FiList, badge: 'TRACKING' },
  discovery: { title: 'Job Discovery', icon: FiCompass, badge: 'SCRAPERS' },
  companies: { title: 'Company Sites', icon: FiBriefcase, badge: 'PORTALS' },
  intel: { title: 'Company Deep Intel', icon: FiGlobe, badge: 'HUMAN CRAWLER' },
  latex: { title: 'LaTeX CV Studio', icon: FiFileText, badge: 'ATS READY' },
  coverletter: { title: 'Cover Letter Studio', icon: FiMail, badge: 'AI TAILOR' },
  prep: { title: 'Interview & Tech Prep', icon: FiAward, badge: 'AI COACH' },
  contacts: { title: 'People & Referrals', icon: FiUsers, badge: 'HUNTER / APOLLO' },
  ai: { title: 'AI JD Inspector', icon: FiZap, badge: 'ANALYSIS' },
  settings: { title: 'System Settings', icon: FiSliders, badge: 'CONFIG' },
}

export default function TopBar({
  activeTab,
  onOpenAddJob,
}) {
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)

  const meta = TAB_META[activeTab] || { title: 'JobPulse Studio', icon: FiCpu }
  const ActiveIcon = meta.icon

  const handleSyncSheets = async () => {
    setSyncing(true)
    try {
      const res = await api.syncSheets()
      if (res.success) {
        toast({
          title: 'Google Sheets Synced!',
          description: res.message || 'All applications synchronized.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
      } else {
        toast({
          title: 'Sync Note',
          description: res.message || 'Check Google Sheet configuration.',
          status: 'info',
          duration: 4000,
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

  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex="90"
      h="56px"
      bg="rgba(10, 13, 20, 0.88)"
      backdropFilter="blur(20px)"
      borderBottom="1px solid rgba(255, 246, 244, 0.08)"
      px={{ base: 3, md: 6 }}
    >
      <Flex h="full" justify="space-between" align="center">
        {/* Left: Active Page Breadcrumb */}
        <HStack spacing={2.5}>
          <Box color="#525FE1" fontSize="md">
            <ActiveIcon />
          </Box>
          <Heading size="xs" color="#FFF6F4" fontWeight="700" letterSpacing="-0.01em">
            {meta.title}
          </Heading>
          {meta.badge && (
            <Badge
              bg="rgba(248, 111, 3, 0.16)"
              color="#F86F03"
              border="1px solid rgba(248, 111, 3, 0.35)"
              fontSize="3xs"
              px={1.5}
              py={0.5}
              borderRadius="sm"
              display={{ base: 'none', sm: 'inline-block' }}
            >
              {meta.badge}
            </Badge>
          )}
        </HStack>

        {/* Right: Minimal Important Actions Only */}
        <HStack spacing={3}>
          {/* Engine Status Dot */}
          <HStack
            spacing={1.5}
            display={{ base: 'none', md: 'flex' }}
            px={2.5}
            py={1}
            bg="rgba(255, 246, 244, 0.03)"
            borderRadius="md"
            border="1px solid rgba(255, 246, 244, 0.07)"
          >
            <Box w="6px" h="6px" borderRadius="full" bg="#FFA41B" boxShadow="0 0 6px #FFA41B" />
            <Text fontSize="3xs" color="#FFF6F4" opacity={0.8} fontWeight="600">Local LLM Online</Text>
          </HStack>

          {/* Sync Sheets Button */}
          <Button
            size="xs"
            variant="outline"
            borderColor="rgba(255, 246, 244, 0.15)"
            color="#FFF6F4"
            _hover={{ borderColor: '#525FE1', bg: 'rgba(82, 95, 225, 0.12)' }}
            leftIcon={<FiRefreshCw className={syncing ? 'spin' : ''} />}
            isLoading={syncing}
            onClick={handleSyncSheets}
            display={{ base: 'none', sm: 'inline-flex' }}
            fontSize="3xs"
          >
            Sync Sheets
          </Button>

          {/* Primary Action Button */}
          <Button
            size="xs"
            bgGradient="linear(to-r, #525FE1 0%, #F86F03 100%)"
            color="#FFF6F4"
            _hover={{
              bgGradient: 'linear(to-r, #424cb8 0%, #FFA41B 100%)',
              boxShadow: '0 4px 18px rgba(248, 111, 3, 0.45)',
            }}
            leftIcon={<FiPlus />}
            onClick={onOpenAddJob}
            fontSize="2xs"
            px={3.5}
            py={1.5}
            borderRadius="md"
          >
            Add Job
          </Button>
        </HStack>
      </Flex>
    </Box>
  )
}
