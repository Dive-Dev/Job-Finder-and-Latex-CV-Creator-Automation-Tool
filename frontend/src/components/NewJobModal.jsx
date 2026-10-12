import React, { useState } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  useToast,
} from '@chakra-ui/react'
import { api } from '../api'

export default function NewJobModal({ isOpen, onClose, onJobAdded }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('Bengaluru, Karnataka, India')
  const [jobUrl, setJobUrl] = useState('')
  const [status, setStatus] = useState('Wishlist')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !company.trim()) return
    setLoading(true)
    try {
      const res = await api.addJob({
        title,
        company,
        location,
        job_url: jobUrl,
        status,
        notes,
      })
      if (res.success) {
        toast({ title: 'Opportunity added to pipeline!', status: 'success', duration: 2500 })
        onJobAdded()
        onClose()
        setTitle('')
        setCompany('')
        setJobUrl('')
        setNotes('')
      }
    } catch (err) {
      toast({ title: 'Failed adding job', description: err.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay backdropFilter="blur(8px)" bg="blackAlpha.700" />
      <ModalContent bg="#111726" border="1px solid rgba(255,255,255,0.1)" borderRadius="xl">
        <ModalHeader color="white" borderBottom="1px solid rgba(255,255,255,0.08)" fontSize="md">
          ➕ Track New Job Opportunity
        </ModalHeader>
        <ModalCloseButton />

        <form onSubmit={handleSubmit}>
          <ModalBody py={4}>
            <VStack spacing={3} align="stretch">
              <HStack spacing={3}>
                <FormControl isRequired>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Role Title</FormLabel>
                  <Input size="sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Company</FormLabel>
                  <Input size="sm" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Sandisk" />
                </FormControl>
              </HStack>

              <HStack spacing={3}>
                <FormControl flex={2}>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Location</FormLabel>
                  <Input size="sm" value={location} onChange={(e) => setLocation(e.target.value)} />
                </FormControl>
                <FormControl flex={1.2}>
                  <FormLabel fontSize="xs" color="gray.300" mb={1}>Initial Status</FormLabel>
                  <Select size="sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Wishlist">Wishlist</option>
                    <option value="Applied">Applied</option>
                    <option value="Interviewing">Interviewing</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel fontSize="xs" color="gray.300" mb={1}>Job Posting URL</FormLabel>
                <Input size="sm" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://..." />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" color="gray.300" mb={1}>Private Notes</FormLabel>
                <Textarea size="sm" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referral details, deadlines, salary range..." />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter borderTop="1px solid rgba(255,255,255,0.08)">
            <Button size="sm" variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" size="sm" isLoading={loading}>
              Save Opportunity
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
