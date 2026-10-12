import React, { useState, useEffect } from 'react'
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
  Text,
  Badge,
  useToast,
  FormControl,
  FormLabel,
  Box,
  Flex,
  Divider,
} from '@chakra-ui/react'
import { FiCopy, FiRefreshCw, FiExternalLink, FiSend, FiMail, FiCheck } from 'react-icons/fi'
import { api } from '../api'

export default function OutreachModal({ isOpen, onClose, contact, profile = {} }) {
  const toast = useToast()
  const [strategy, setStrategy] = useState('referral')
  const [targetRole, setTargetRole] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [connectionNote, setConnectionNote] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [deliveryStatus, setDeliveryStatus] = useState(null)

  useEffect(() => {
    if (contact) {
      if ((contact.role_category || contact.department || '').includes('Recruiter')) setStrategy('recruiter')
      else if ((contact.role_category || contact.department || '').includes('Manager')) setStrategy('manager')
      else setStrategy('referral')

      setTargetRole(profile?.title || 'Software Engineer')
      setRecipientEmail(contact.predicted_email || '')
      setDeliveryStatus(null)

      if (contact.connection_note) {
        setConnectionNote(contact.connection_note)
        setEmailSubject(contact.email_subject || `Referral / Application Inquiry - ${contact.company}`)
        setEmailBody(contact.email_pitch || '')
      } else {
        handleGenerateOutreach()
      }
    }
  }, [contact])

  const handleGenerateOutreach = async () => {
    if (!contact) return
    setLoading(true)
    try {
      const res = await api.generateContactOutreach({
        contact_name: contact.name,
        contact_role: contact.headline || contact.title || contact.role_category,
        company: contact.company,
        target_role: targetRole || 'Software Engineer',
        outreach_type: strategy,
        job_link: contact.job_url || '',
      })
      if (res.success && res.outreach) {
        const o = res.outreach
        setConnectionNote(o.connection_note || '')
        setEmailSubject(o.email_subject || `Application Inquiry - ${contact.company}`)
        setEmailBody(o.full_message || '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendViaSmtp = async () => {
    if (!recipientEmail || !emailBody) {
      toast({
        title: 'Missing Fields',
        description: 'Recipient email and message body are required.',
        status: 'warning',
        duration: 3000,
      })
      return
    }

    setSendingEmail(true)
    setDeliveryStatus(null)

    try {
      const res = await api.sendReferralEmail({
        recipient_email: recipientEmail,
        subject: emailSubject,
        body: emailBody,
      })

      if (res.delivered) {
        setDeliveryStatus({ success: true, message: `Dispatched to ${recipientEmail} via SMTP!` })
        toast({
          title: 'Referral Email Sent!',
          description: `Delivered to ${recipientEmail}.`,
          status: 'success',
          duration: 4000,
        })
      } else {
        setDeliveryStatus({ success: false, message: res.message || 'SMTP delivery failed.' })
        toast({
          title: 'SMTP Dispatch Notice',
          description: res.message || 'Check SMTP configuration in Settings.',
          status: 'info',
          duration: 4500,
        })
        // If mailto URL provided, offer manual open
        if (res.mailto_url) {
          window.open(res.mailto_url, '_blank')
        }
      }
    } catch (err) {
      toast({
        title: 'Send Error',
        description: err.message,
        status: 'error',
        duration: 4000,
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const handleOpenMailClient = () => {
    const params = new URLSearchParams({
      subject: emailSubject,
      body: emailBody,
    })
    window.location.href = `mailto:${recipientEmail}?${params.toString()}`
  }

  const handleCopy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copied!`, status: 'success', duration: 1500 })
  }

  const noteLength = connectionNote.length
  const isOverLimit = noteLength > 300

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'xl' }}>
      <ModalOverlay backdropFilter="blur(8px)" bg="blackAlpha.700" />
      <ModalContent bg="#111726" border="1px solid rgba(255,255,255,0.1)" borderRadius="xl" maxW={{ base: '100%', md: '780px' }}>
        <ModalHeader color="white" borderBottom="1px solid rgba(255,255,255,0.08)" fontSize="md">
          ✉️ Referral Email & Outreach Studio
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody py={4}>
          <Text fontSize="xs" color="cyan.300" fontWeight="600" mb={3}>
            Target: {contact?.name} ({contact?.role_category || contact?.department || 'Team'}) @ {contact?.company}
          </Text>

          <Flex gap={3} wrap={{ base: 'wrap', sm: 'nowrap' }} mb={4}>
            <FormControl flex={1}>
              <FormLabel fontSize="2xs" color="gray.400" mb={1}>Outreach Strategy</FormLabel>
              <Select size="xs" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                <option value="recruiter">Recruiter / Talent Acquisition Hook</option>
                <option value="manager">Engineering Manager / Team Alignment</option>
                <option value="referral">Peer Engineer / Referral Request</option>
              </Select>
            </FormControl>

            <FormControl flex={1}>
              <FormLabel fontSize="2xs" color="gray.400" mb={1}>Target Position</FormLabel>
              <Input size="xs" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            </FormControl>

            <Button
              size="xs"
              variant="outline"
              mt={{ base: 2, sm: 5 }}
              leftIcon={<FiRefreshCw className={loading ? 'spin' : ''} />}
              isLoading={loading}
              onClick={handleGenerateOutreach}
            >
              Regenerate
            </Button>
          </Flex>

          {/* Recipient Email Address Bar */}
          <Box mb={4} p={3} bg="blackAlpha.400" borderRadius="lg" border="1px solid rgba(255,255,255,0.06)">
            <FormControl>
              <Flex justify="space-between" align="center" mb={1}>
                <FormLabel fontSize="2xs" color="gray.400" mb={0}>Verified Recipient Email</FormLabel>
                {contact?.email_confidence && (
                  <Badge colorScheme="green" fontSize="3xs">
                    {contact.email_confidence} Deliverability
                  </Badge>
                )}
              </Flex>
              <Input
                size="sm"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. john.doe@company.com"
                fontWeight="600"
                color="brand.200"
              />
            </FormControl>
          </Box>

          {/* LinkedIn Connection Note */}
          <Box mb={4} p={3} bg="blackAlpha.400" borderRadius="lg" border="1px solid rgba(255,255,255,0.06)">
            <Flex justify="space-between" align="center" mb={1.5}>
              <Text fontSize="xs" fontWeight="700" color="white">
                🔗 LinkedIn Connection Note (Max 300 chars)
              </Text>
              <HStack spacing={2}>
                <Badge colorScheme={isOverLimit ? 'red' : 'green'} fontSize="2xs">
                  {noteLength} / 300
                </Badge>
                <Button size="2xs" variant="ghost" leftIcon={<FiCopy />} onClick={() => handleCopy(connectionNote, 'LinkedIn Note')}>
                  Copy
                </Button>
              </HStack>
            </Flex>
            <Textarea
              size="xs"
              rows={3}
              value={connectionNote}
              onChange={(e) => setConnectionNote(e.target.value)}
              borderColor={isOverLimit ? 'red.400' : 'rgba(255,255,255,0.1)'}
            />
          </Box>

          {/* Full Cold Email / Referral Pitch */}
          <Box p={3} bg="blackAlpha.400" borderRadius="lg" border="1px solid rgba(255,255,255,0.06)">
            <Flex justify="space-between" align="center" mb={1.5}>
              <Text fontSize="xs" fontWeight="700" color="white">
                📧 Referral Email / InMail Draft
              </Text>
              <HStack spacing={2}>
                <Button size="2xs" variant="ghost" leftIcon={<FiCopy />} onClick={() => handleCopy(`Subject: ${emailSubject}\n\n${emailBody}`, 'Email draft')}>
                  Copy Text
                </Button>
                <Button size="2xs" variant="outline" leftIcon={<FiExternalLink />} onClick={handleOpenMailClient}>
                  Open in Mail App
                </Button>
              </HStack>
            </Flex>
            <Input
              size="xs"
              mb={2}
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Subject line..."
              fontWeight="600"
            />
            <Textarea
              size="xs"
              rows={6}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Full email message..."
            />

            {/* Direct Send Action */}
            <Flex justify="space-between" align="center" mt={3} pt={2} borderTop="1px solid rgba(255,255,255,0.06)" wrap="wrap" gap={2}>
              <Box>
                {deliveryStatus && (
                  <Text fontSize="2xs" color={deliveryStatus.success ? 'green.300' : 'yellow.300'}>
                    {deliveryStatus.success ? '✓ ' : 'ℹ️ '}{deliveryStatus.message}
                  </Text>
                )}
              </Box>
              <Button
                size="sm"
                variant="gradient"
                leftIcon={<FiSend />}
                isLoading={sendingEmail}
                loadingText="Dispatching Email..."
                onClick={handleSendViaSmtp}
              >
                Send Email via SMTP
              </Button>
            </Flex>
          </Box>
        </ModalBody>

        <ModalFooter borderTop="1px solid rgba(255,255,255,0.08)">
          <HStack spacing={2}>
            {contact?.profile_url && (
              <Button as="a" href={contact.profile_url} target="_blank" size="sm" variant="outline" rightIcon={<FiExternalLink />}>
                Open LinkedIn
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
