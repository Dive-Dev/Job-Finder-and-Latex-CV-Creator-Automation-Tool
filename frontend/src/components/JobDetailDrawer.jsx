import React from 'react'
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton,
  Button,
  Heading,
  Text,
  Badge,
  HStack,
  VStack,
  Box,
  Divider,
  Tag,
  Flex,
  Select,
} from '@chakra-ui/react'
import {
  FiExternalLink,
  FiFileText,
  FiMail,
  FiAward,
  FiUsers,
  FiCheckCircle,
} from 'react-icons/fi'

export default function JobDetailDrawer({
  isOpen,
  onClose,
  job,
  onStatusChange,
  onSelectCv,
  onSelectCoverLetter,
  onSelectPrep,
  onFindHr,
}) {
  if (!job) return null

  const score = job.match_score || 75
  const skills = Array.isArray(job.skills)
    ? job.skills
    : typeof job.skills === 'string'
    ? job.skills.startsWith('[')
      ? JSON.parse(job.skills || '[]')
      : job.skills.split(',').map((s) => s.trim())
    : []

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size={{ base: 'full', md: 'md', lg: 'lg' }}>
      <DrawerOverlay backdropFilter="blur(8px)" bg="blackAlpha.700" />
      <DrawerContent bg="#0f1322" borderLeft="1px solid rgba(255, 246, 244, 0.08)" color="#FFF6F4">
        <DrawerCloseButton color="gray.400" />
        
        {/* Header */}
        <DrawerHeader pt={6} pb={3} borderBottom="1px solid rgba(255, 246, 244, 0.06)">
          <Flex justify="space-between" align="start" gap={3} pr={6}>
            <Box>
              <Heading size="md" color="#FFF6F4" fontWeight="800">
                {job.title}
              </Heading>
              <Text fontSize="sm" color="#FFA41B" fontWeight="600" mt={0.5}>
                {job.company}
              </Text>
            </Box>
            <Badge
              bg={score >= 80 ? 'rgba(16, 185, 129, 0.2)' : score >= 70 ? 'rgba(82, 95, 225, 0.2)' : 'rgba(255, 164, 27, 0.2)'}
              color={score >= 80 ? '#10b981' : score >= 70 ? '#8f98f3' : '#FFA41B'}
              border="1px solid"
              borderColor={score >= 80 ? 'rgba(16, 185, 129, 0.4)' : score >= 70 ? 'rgba(82, 95, 225, 0.4)' : 'rgba(255, 164, 27, 0.4)'}
              fontSize="sm"
              px={2.5}
              py={1}
              borderRadius="md"
              fontWeight="800"
            >
              {score}% ATS MATCH
            </Badge>
          </Flex>

          <HStack spacing={2} mt={3} wrap="wrap">
            <Badge bg="rgba(82, 95, 225, 0.16)" color="#8f98f3" border="1px solid rgba(82, 95, 225, 0.3)" fontSize="2xs">
              {job.role_type || 'Full-time'}
            </Badge>
            <Badge bg="rgba(255, 246, 244, 0.06)" color="#FFF6F4" fontSize="2xs">
              📍 {job.location || 'Bengaluru, India'}
            </Badge>
            {job.experience_level && (
              <Badge bg="rgba(248, 111, 3, 0.16)" color="#F86F03" border="1px solid rgba(248, 111, 3, 0.3)" fontSize="2xs">
                {job.experience_level}
              </Badge>
            )}
            <Badge colorScheme="emerald" variant="outline" fontSize="2xs">
              Status: {job.status || 'Wishlist'}
            </Badge>
          </HStack>
        </DrawerHeader>

        {/* Body Content - Supports Both Horizontal and Vertical Scrollbars Whenever Needed */}
        <DrawerBody py={5} overflowY="auto" overflowX="auto" className="custom-scroll">
          <VStack spacing={5} align="stretch">
            {/* Quick Status Tuner */}
            <Box p={3.5} bg="rgba(255, 246, 244, 0.03)" borderRadius="lg" border="1px solid rgba(255, 246, 244, 0.06)">
              <Flex justify="space-between" align="center">
                <Text fontSize="xs" fontWeight="700" color="#FFF6F4">
                  Application Pipeline Status:
                </Text>
                <Select
                  size="xs"
                  maxW="160px"
                  value={job.status || 'Wishlist'}
                  onChange={(e) => onStatusChange && onStatusChange(job.id, e.target.value)}
                  borderRadius="md"
                  bg="blackAlpha.400"
                  borderColor="rgba(255, 246, 244, 0.1)"
                  color="#FFF6F4"
                >
                  <option value="Wishlist">Wishlist</option>
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </Select>
              </Flex>
            </Box>

            {/* Required Skills */}
            {skills.length > 0 && (
              <Box>
                <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.05em" color="gray.400" mb={2}>
                  Core Skills & Keywords
                </Text>
                <Flex wrap="wrap" gap={1.5}>
                  {skills.map((s, idx) => (
                    <Tag
                      key={idx}
                      size="sm"
                      bg="rgba(82, 95, 225, 0.15)"
                      color="#8f98f3"
                      border="1px solid rgba(82, 95, 225, 0.35)"
                    >
                      {s}
                    </Tag>
                  ))}
                </Flex>
              </Box>
            )}

            {/* Description - Both Horizontal & Vertical Scrollbars whenever needed */}
            <Box>
              <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.05em" color="gray.400" mb={2}>
                Job Description & Scope
              </Text>
              <Box
                p={4}
                bg="rgba(0, 0, 0, 0.35)"
                borderRadius="lg"
                border="1px solid rgba(255, 246, 244, 0.06)"
                maxH="380px"
                overflowY="auto"
                overflowX="auto"
                className="custom-scroll"
                fontSize="xs"
                color="gray.300"
                lineHeight="tall"
                whiteSpace="pre-wrap"
              >
                {job.description || 'No detailed description available. Click Apply to view on company portal.'}
              </Box>
            </Box>

            {/* Studio Shortcuts */}
            <Box pt={1}>
              <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.05em" color="gray.400" mb={2}>
                Preparation & Tailoring Studio
              </Text>
              <VStack spacing={2} align="stretch">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<FiFileText />}
                  justifyContent="flex-start"
                  onClick={() => {
                    onClose()
                    onSelectCv && onSelectCv(job.id)
                  }}
                >
                  Tailor Resume in LaTeX CV Studio
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<FiMail />}
                  justifyContent="flex-start"
                  onClick={() => {
                    onClose()
                    onSelectCoverLetter && onSelectCoverLetter(job)
                  }}
                >
                  Generate 4-Paragraph Cover Letter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<FiAward />}
                  justifyContent="flex-start"
                  onClick={() => {
                    onClose()
                    onSelectPrep && onSelectPrep(job)
                  }}
                >
                  Start Role Interview Preparation Pack
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<FiUsers />}
                  justifyContent="flex-start"
                  onClick={() => {
                    onClose()
                    onFindHr && onFindHr(job.company)
                  }}
                >
                  Scout Recruiters & Referrals for {job.company}
                </Button>
              </VStack>
            </Box>
          </VStack>
        </DrawerBody>

        {/* Footer */}
        <DrawerFooter borderTop="1px solid rgba(255,255,255,0.06)">
          <Flex justify="space-between" w="full" align="center">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
            {job.job_url ? (
              <Button
                as="a"
                href={job.job_url}
                target="_blank"
                size="sm"
                variant="gradient"
                rightIcon={<FiExternalLink />}
                onClick={() => {
                  if (job.status === 'Wishlist' && onStatusChange) {
                    onStatusChange(job.id, 'Applied')
                  }
                }}
              >
                Apply on Official Portal
              </Button>
            ) : (
              <Button size="sm" variant="gradient" isDisabled>
                No URL Provided
              </Button>
            )}
          </Flex>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
