import React, { useState } from 'react'
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Checkbox,
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
  Grid,
  SimpleGrid,
  useDisclosure,
  Tooltip,
} from '@chakra-ui/react'
import {
  FiGrid,
  FiList,
  FiTrash2,
  FiCheckCircle,
  FiExternalLink,
  FiMail,
  FiFileText,
  FiSearch,
  FiEye,
  FiAward,
} from 'react-icons/fi'
import { api } from '../api'
import JobDetailDrawer from './JobDetailDrawer'

export default function PipelineTab({
  jobs = [],
  refreshJobs,
  onSelectJobForCv,
  onSelectJobForCoverLetter,
  onSelectJobForPrep,
  onFindHrForCompany,
}) {
  const toast = useToast()
  const [viewMode, setViewMode] = useState('sheets') // 'sheets' | 'kanban'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Job Detail Drawer State
  const [activeJobForDrawer, setActiveJobForDrawer] = useState(null)
  const {
    isOpen: isDrawerOpen,
    onOpen: onOpenDrawer,
    onClose: onCloseDrawer,
  } = useDisclosure()

  // Safely parse jobs array
  const safeJobs = Array.isArray(jobs) ? jobs : []

  // Metrics computation
  const metrics = {
    total: safeJobs.length,
    wishlist: safeJobs.filter((j) => (j.status || 'Wishlist') === 'Wishlist').length,
    applied: safeJobs.filter((j) => j.status === 'Applied').length,
    interviewing: safeJobs.filter((j) => j.status === 'Interviewing').length,
    offer: safeJobs.filter((j) => j.status === 'Offer').length,
    rejected: safeJobs.filter((j) => j.status === 'Rejected').length,
  }

  const filteredJobs = safeJobs.filter((j) => {
    const status = j.status || 'Wishlist'
    const matchesStatus = statusFilter === 'All' || status === statusFilter
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      (j.title || '').toLowerCase().includes(q) ||
      (j.company || '').toLowerCase().includes(q) ||
      (j.location || '').toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredJobs.length && filteredJobs.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredJobs.map((j) => j.id)))
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateJobStatus(id, newStatus)
      toast({ title: `Status updated to ${newStatus}`, status: 'success', duration: 2000 })
      if (refreshJobs) refreshJobs()
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, status: 'error' })
    }
  }

  const handleDeleteJob = async (id, e) => {
    if (e) e.stopPropagation()
    try {
      await api.deleteJob(id)
      toast({ title: 'Application removed', status: 'info', duration: 2000 })
      if (refreshJobs) refreshJobs()
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, status: 'error' })
    }
  }

  const handleDeleteBatch = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Delete ${selectedIds.size} selected applications?`)) return
    try {
      await api.deleteJobsBatch(Array.from(selectedIds))
      toast({ title: `Deleted ${selectedIds.size} applications`, status: 'success', duration: 2500 })
      setSelectedIds(new Set())
      if (refreshJobs) refreshJobs()
    } catch (err) {
      toast({ title: 'Batch delete failed', description: err.message, status: 'error' })
    }
  }

  const handleMarkBatchApplied = async () => {
    if (selectedIds.size === 0) return
    try {
      for (const id of Array.from(selectedIds)) {
        await api.updateJobStatus(id, 'Applied')
      }
      toast({ title: `Marked ${selectedIds.size} as Applied!`, status: 'success', duration: 2500 })
      setSelectedIds(new Set())
      if (refreshJobs) refreshJobs()
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, status: 'error' })
    }
  }

  const openDrawerForJob = (job) => {
    setActiveJobForDrawer(job)
    onOpenDrawer()
  }

  const kanbanColumns = ['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected']

  return (
    <Box>
      {/* 1. Clean Pipeline Metrics Ribbon (Clean visual hierarchy, not crowded) */}
      <SimpleGrid columns={{ base: 2, sm: 3, md: 6 }} spacing={3} mb={5}>
        <Box p={3} bg="dark.card" borderRadius="lg" border="1px solid rgba(255, 246, 244, 0.08)">
          <Text fontSize="3xs" color="gray.400" fontWeight="700" textTransform="uppercase">Total Tracked</Text>
          <Text fontSize="lg" fontWeight="800" color="#FFF6F4">{metrics.total}</Text>
        </Box>
        <Box p={3} bg="dark.card" borderRadius="lg" border="1px solid rgba(255, 246, 244, 0.08)">
          <Text fontSize="3xs" color="#FFA41B" fontWeight="700" textTransform="uppercase">Wishlist</Text>
          <Text fontSize="lg" fontWeight="800" color="#FFA41B">{metrics.wishlist}</Text>
        </Box>
        <Box p={3} bg="dark.card" borderRadius="lg" border="1px solid rgba(255, 246, 244, 0.08)">
          <Text fontSize="3xs" color="#8f98f3" fontWeight="700" textTransform="uppercase">Applied</Text>
          <Text fontSize="lg" fontWeight="800" color="#525FE1">{metrics.applied}</Text>
        </Box>
        <Box p={3} bg="dark.card" borderRadius="lg" border="1px solid rgba(255, 246, 244, 0.08)">
          <Text fontSize="3xs" color="#F86F03" fontWeight="700" textTransform="uppercase">Interviewing</Text>
          <Text fontSize="lg" fontWeight="800" color="#F86F03">{metrics.interviewing}</Text>
        </Box>
        <Box p={3} bg="dark.card" borderRadius="lg" border="1px solid rgba(255, 246, 244, 0.08)">
          <Text fontSize="3xs" color="green.400" fontWeight="700" textTransform="uppercase">Offers</Text>
          <Text fontSize="lg" fontWeight="800" color="green.300">{metrics.offer}</Text>
        </Box>
        <Box p={3} bg="dark.card" borderRadius="lg" border="1px solid rgba(255, 246, 244, 0.08)">
          <Text fontSize="3xs" color="gray.500" fontWeight="700" textTransform="uppercase">Archived</Text>
          <Text fontSize="lg" fontWeight="800" color="gray.500">{metrics.rejected}</Text>
        </Box>
      </SimpleGrid>

      {/* 2. Top Filter & Search Controls (Generous whitespace & clear layout) */}
      <Card bg="dark.card" borderColor="rgba(255, 246, 244, 0.08)" borderWidth="1px" mb={5}>
        <CardBody p={4}>
          <Flex justify="space-between" align="center" direction={{ base: 'column', md: 'row' }} gap={3}>
            {/* Search Input & Status Dropdown */}
            <Flex flex={1} w={{ base: 'full', md: 'auto' }} gap={3} direction={{ base: 'column', sm: 'row' }}>
              <Box position="relative" flex={1}>
                <Input
                  size="sm"
                  placeholder="🔍 Search role, company, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Box>

              <Select
                size="sm"
                maxW={{ base: 'full', sm: '180px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses ({safeJobs.length})</option>
                <option value="Wishlist">Wishlist ({metrics.wishlist})</option>
                <option value="Applied">Applied ({metrics.applied})</option>
                <option value="Interviewing">Interviewing ({metrics.interviewing})</option>
                <option value="Offer">Offers ({metrics.offer})</option>
                <option value="Rejected">Rejected ({metrics.rejected})</option>
              </Select>
            </Flex>

            {/* View Switcher: Sheets Grid vs Kanban */}
            <HStack spacing={2} w={{ base: 'full', md: 'auto' }} justify={{ base: 'space-between', md: 'flex-end' }}>
              <Button
                size="sm"
                variant={viewMode === 'sheets' ? 'solid' : 'outline'}
                leftIcon={<FiList />}
                onClick={() => setViewMode('sheets')}
              >
                Sheets Table
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'kanban' ? 'solid' : 'outline'}
                leftIcon={<FiGrid />}
                onClick={() => setViewMode('kanban')}
              >
                Kanban Board
              </Button>
            </HStack>
          </Flex>

          {/* Sticky Batch Actions Bar */}
          {selectedIds.size > 0 && (
            <Flex
              mt={3}
              p={2.5}
              bg="rgba(82, 95, 225, 0.14)"
              border="1px solid rgba(82, 95, 225, 0.35)"
              borderRadius="lg"
              justify="space-between"
              align="center"
              wrap="wrap"
              gap={2}
            >
              <HStack spacing={2}>
                <Badge bg="rgba(248, 111, 3, 0.2)" color="#F86F03" border="1px solid rgba(248, 111, 3, 0.4)" fontSize="xs" px={2} py={0.5}>
                  {selectedIds.size} Selected
                </Badge>
                <Text fontSize="xs" color="#FFF6F4">Quick batch actions:</Text>
              </HStack>
              <HStack spacing={2}>
                <Button size="xs" colorScheme="red" leftIcon={<FiTrash2 />} onClick={handleDeleteBatch}>
                  Delete Selected
                </Button>
                <Button size="xs" variant="retroOrange" leftIcon={<FiCheckCircle />} onClick={handleMarkBatchApplied}>
                  Mark Applied
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Deselect
                </Button>
              </HStack>
            </Flex>
          )}
        </CardBody>
      </Card>

      {/* 3. Sheets Table View (Clean, readable, uncluttered) */}
      {viewMode === 'sheets' && (
        <Card bg="dark.card" borderColor="rgba(255,255,255,0.08)" borderWidth="1px">
          <CardBody p={0}>
            <Box overflowX="auto" overflowY="auto" maxH="72vh" className="custom-scroll">
              <Table variant="simple" size="sm">
                <Thead bg="rgba(255,255,255,0.02)">
                  <Tr>
                    <Th width="40px" textAlign="center">
                      <Checkbox
                        size="sm"
                        colorScheme="purple"
                        isChecked={selectedIds.size === filteredJobs.length && filteredJobs.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </Th>
                    <Th color="gray.400" width="85px" fontSize="3xs">ATS Match</Th>
                    <Th color="gray.400" fontSize="3xs">Position & Role</Th>
                    <Th color="gray.400" fontSize="3xs">Company</Th>
                    <Th color="gray.400" fontSize="3xs" display={{ base: 'none', md: 'table-cell' }}>Location</Th>
                    <Th color="gray.400" width="135px" fontSize="3xs">Status</Th>
                    <Th color="gray.400" textAlign="right" fontSize="3xs">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredJobs.length > 0 ? (
                    filteredJobs.map((j) => {
                      const score = j.match_score || 75
                      const isSel = selectedIds.has(j.id)
                      const status = j.status || 'Wishlist'

                      return (
                        <Tr
                          key={j.id}
                          bg={isSel ? 'rgba(82, 95, 225, 0.12)' : undefined}
                          _hover={{ bg: 'rgba(255, 246, 244, 0.04)', cursor: 'pointer' }}
                          onClick={() => openDrawerForJob(j)}
                        >
                          {/* Checkbox */}
                          <Td textAlign="center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              size="sm"
                              colorScheme="blue"
                              isChecked={isSel}
                              onChange={(e) => toggleSelect(j.id, e)}
                            />
                          </Td>

                          {/* Match Score Badge */}
                          <Td>
                            <Badge
                              bg={score >= 80 ? 'rgba(16, 185, 129, 0.2)' : score >= 70 ? 'rgba(82, 95, 225, 0.2)' : 'rgba(255, 164, 27, 0.2)'}
                              color={score >= 80 ? '#10b981' : score >= 70 ? '#8f98f3' : '#FFA41B'}
                              border="1px solid"
                              borderColor={score >= 80 ? 'rgba(16, 185, 129, 0.4)' : score >= 70 ? 'rgba(82, 95, 225, 0.4)' : 'rgba(255, 164, 27, 0.4)'}
                              fontSize="xs"
                              fontWeight="800"
                            >
                              {score}%
                            </Badge>
                          </Td>

                          {/* Title & Type */}
                          <Td py={3}>
                            <VStack align="start" spacing={0.5}>
                              <Text fontWeight="700" color="#FFF6F4" fontSize="xs">
                                {j.title}
                              </Text>
                              <Text fontSize="3xs" color="gray.500">
                                {j.role_type || 'Full-time'}
                              </Text>
                            </VStack>
                          </Td>

                          {/* Company */}
                          <Td py={3}>
                            <Text color="#FFA41B" fontWeight="700" fontSize="xs">
                              {j.company}
                            </Text>
                          </Td>

                          {/* Location */}
                          <Td py={3} display={{ base: 'none', md: 'table-cell' }}>
                            <Text color="gray.400" fontSize="xs" isTruncated maxW="160px">
                              {j.location || 'Bengaluru, India'}
                            </Text>
                          </Td>

                          {/* Status Select */}
                          <Td py={3} onClick={(e) => e.stopPropagation()}>
                            <Select
                              size="xs"
                              value={status}
                              onChange={(e) => handleStatusChange(j.id, e.target.value)}
                              borderRadius="md"
                              bg="blackAlpha.400"
                              borderColor="rgba(255, 246, 244, 0.1)"
                              fontWeight="600"
                              color={
                                status === 'Applied' ? '#525FE1' :
                                status === 'Interviewing' ? '#F86F03' :
                                status === 'Offer' ? '#10b981' : '#FFF6F4'
                              }
                            >
                              <option value="Wishlist">Wishlist</option>
                              <option value="Applied">Applied</option>
                              <option value="Interviewing">Interviewing</option>
                              <option value="Offer">Offer</option>
                              <option value="Rejected">Rejected</option>
                            </Select>
                          </Td>

                          {/* Clean Actions (View Details, Apply, Delete) */}
                          <Td py={3} textAlign="right" onClick={(e) => e.stopPropagation()}>
                            <HStack spacing={1.5} justify="flex-end">
                              <Button
                                size="xs"
                                variant="outline"
                                leftIcon={<FiEye />}
                                onClick={() => openDrawerForJob(j)}
                                title="View Full Description & Tailor Actions"
                              >
                                Details
                              </Button>

                              {j.job_url && (
                                <Button
                                  as="a"
                                  href={j.job_url}
                                  target="_blank"
                                  size="xs"
                                  variant="gradient"
                                  title="Open Official Job Application Link"
                                  onClick={() => {
                                    if (status === 'Wishlist') handleStatusChange(j.id, 'Applied')
                                  }}
                                >
                                  Apply ↗
                                </Button>
                              )}

                              <Button
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                onClick={(e) => handleDeleteJob(j.id, e)}
                                title="Remove Opportunity"
                              >
                                ✕
                              </Button>
                            </HStack>
                          </Td>
                        </Tr>
                      )
                    })
                  ) : (
                    <Tr>
                      <Td colSpan={7} textAlign="center" py={12} color="gray.500">
                        <Box fontSize="3xl" mb={2}>🔍</Box>
                        <Text fontSize="sm" color="gray.400" fontWeight="600">No applications match your filter.</Text>
                        <Text fontSize="xs" color="gray.600" mt={1}>Try changing the status filter or search keywords.</Text>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </Box>
          </CardBody>
        </Card>
      )}

      {/* 4. Kanban Board View (Spacious, modern card columns) */}
      {viewMode === 'kanban' && (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }} gap={4} alignItems="start">
          {kanbanColumns.map((colName) => {
            const colJobs = filteredJobs.filter((j) => (j.status || 'Wishlist') === colName)
            return (
              <Box
                key={colName}
                bg="#111726"
                p={3.5}
                borderRadius="xl"
                border="1px solid rgba(255,255,255,0.08)"
                minH="350px"
              >
                <Flex justify="space-between" align="center" mb={3} pb={2} borderBottom="1px solid rgba(255,255,255,0.06)">
                  <Heading size="xs" color="white" fontWeight="700">
                    {colName}
                  </Heading>
                  <Badge colorScheme="purple" fontSize="xs" borderRadius="full" px={2}>
                    {colJobs.length}
                  </Badge>
                </Flex>

                <VStack spacing={3} align="stretch">
                  {colJobs.length === 0 ? (
                    <Box py={8} textAlign="center" color="gray.600" fontSize="2xs">
                      No jobs in {colName}
                    </Box>
                  ) : (
                    colJobs.map((j) => (
                      <Card
                        key={j.id}
                        bg="rgba(0,0,0,0.3)"
                        borderColor="rgba(255,255,255,0.06)"
                        borderWidth="1px"
                        cursor="pointer"
                        _hover={{ borderColor: 'brand.500', transform: 'translateY(-2px)' }}
                        transition="all 0.2s"
                        onClick={() => openDrawerForJob(j)}
                      >
                        <CardBody p={3.5}>
                          <Flex justify="space-between" align="start" mb={1.5}>
                            <Text fontWeight="700" color="white" fontSize="xs" isTruncated maxW="160px">
                              {j.title}
                            </Text>
                            <Badge colorScheme="green" fontSize="2xs">{j.match_score || 75}%</Badge>
                          </Flex>
                          <Text fontSize="xs" color="cyan.300" fontWeight="600">{j.company}</Text>
                          <Text fontSize="3xs" color="gray.500" mt={1}>{j.location || 'Bengaluru, India'}</Text>

                          <Flex justify="space-between" align="center" mt={3} pt={2} borderTop="1px solid rgba(255,255,255,0.04)">
                            <Text fontSize="3xs" color="gray.400">Click to view details</Text>
                            {j.job_url && (
                              <Button
                                as="a"
                                href={j.job_url}
                                target="_blank"
                                size="3xs"
                                variant="gradient"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Apply ↗
                              </Button>
                            )}
                          </Flex>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </VStack>
              </Box>
            )
          })}
        </Grid>
      )}

      {/* 5. Job Detail Slide-over Drawer */}
      <JobDetailDrawer
        isOpen={isDrawerOpen}
        onClose={onCloseDrawer}
        job={activeJobForDrawer}
        onStatusChange={(id, newStatus) => {
          handleStatusChange(id, newStatus)
          if (activeJobForDrawer && activeJobForDrawer.id === id) {
            setActiveJobForDrawer({ ...activeJobForDrawer, status: newStatus })
          }
        }}
        onSelectCv={onSelectJobForCv}
        onSelectCoverLetter={onSelectJobForCoverLetter}
        onSelectPrep={onSelectJobForPrep}
        onFindHr={onFindHrForCompany}
      />
    </Box>
  )
}
