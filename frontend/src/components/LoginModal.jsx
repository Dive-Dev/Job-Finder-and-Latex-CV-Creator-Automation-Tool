import React, { useState } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Input,
  VStack,
  HStack,
  Text,
  Badge,
  FormControl,
  FormLabel,
  useToast,
  Box,
  Divider,
} from '@chakra-ui/react'
import { FiUser, FiLogIn, FiCheck, FiCpu } from 'react-icons/fi'
import { api } from '../api'

export default function LoginModal({ isOpen, onClose, currentUser, onLoginSuccess }) {
  const toast = useToast()
  const [name, setName] = useState(currentUser?.name || 'Alex Morgan')
  const [email, setEmail] = useState(currentUser?.email || 'alex.morgan@email.com')
  const [title, setTitle] = useState(currentUser?.title || 'Senior Full-Stack & Systems Engineer')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({ title: 'Please provide your name', status: 'warning' })
      return
    }
    setLoading(true)
    try {
      const res = await api.loginUser({ name, email, title })
      if (res.success && res.profile) {
        localStorage.setItem('jobpulse_user_id', res.user_id || 'default')
        localStorage.setItem('jobpulse_user_name', name)
        toast({
          title: `Welcome back, ${name}!`,
          description: `Logged in as ${title}. Candidate AI Persona activated.`,
          status: 'success',
          duration: 3000,
        })
        if (onLoginSuccess) onLoginSuccess(res.profile)
        onClose()
      } else {
        toast({ title: 'Login Note', description: res.error || 'Failed logging in', status: 'error' })
      }
    } catch (err) {
      toast({ title: 'Login Error', description: err.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemo = (demoName, demoTitle, demoEmail) => {
    setName(demoName)
    setTitle(demoTitle)
    setEmail(demoEmail)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(14px)" bg="blackAlpha.800" />
      <ModalContent bg="#0f131d" border="1px solid rgba(82, 95, 225, 0.35)" color="#FFF6F4" borderRadius="xl">
        <form onSubmit={handleLogin}>
          <ModalHeader pt={6} pb={3} borderBottom="1px solid rgba(255, 255, 255, 0.08)">
            <HStack spacing={2.5}>
              <Box p={2} borderRadius="lg" bg="rgba(82, 95, 225, 0.2)" color="#525FE1" fontSize="lg">
                <FiUser />
              </Box>
              <Box>
                <HStack spacing={2}>
                  <Text fontSize="sm" fontWeight="800">
                    Candidate Simple Login
                  </Text>
                  <Badge bg="rgba(248, 111, 3, 0.2)" color="#F86F03" fontSize="3xs" px={1.5}>
                    ONE-STEP
                  </Badge>
                </HStack>
                <Text fontSize="3xs" color="gray.400">
                  Switch identity or log in to personalize your job finding studio.
                </Text>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="gray.400" />

          <ModalBody py={5}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="2xs" color="gray.400" mb={1}>Your Name</FormLabel>
                <Input
                  size="sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  bg="rgba(10, 13, 20, 0.8)"
                  borderColor="rgba(255, 255, 255, 0.12)"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="2xs" color="gray.400" mb={1}>Email Address</FormLabel>
                <Input
                  size="sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alex@example.com"
                  bg="rgba(10, 13, 20, 0.8)"
                  borderColor="rgba(255, 255, 255, 0.12)"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="2xs" color="gray.400" mb={1}>Current or Target Title</FormLabel>
                <Input
                  size="sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Full-Stack & Systems Engineer"
                  bg="rgba(10, 13, 20, 0.8)"
                  borderColor="rgba(255, 255, 255, 0.12)"
                />
              </FormControl>

              <Divider borderColor="rgba(255, 255, 255, 0.08)" />

              {/* Quick Select demo personas */}
              <Box>
                <Text fontSize="3xs" color="gray.500" fontWeight="700" textTransform="uppercase" mb={2}>
                  Quick Switch Demo Personas
                </Text>
                <HStack spacing={2}>
                  <Button
                    size="xs"
                    variant="outline"
                    fontSize="3xs"
                    onClick={() => handleQuickDemo('Alex Morgan', 'Senior Full-Stack & Systems Engineer', 'alex.morgan@email.com')}
                  >
                    Alex Morgan (Sr Systems)
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    fontSize="3xs"
                    onClick={() => handleQuickDemo('Priya Sharma', 'Staff AI/ML Platform Engineer', 'priya.sharma@tech.io')}
                  >
                    Priya Sharma (Staff ML)
                  </Button>
                </HStack>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter borderTop="1px solid rgba(255, 255, 255, 0.08)" py={3}>
            <HStack spacing={3} w="full" justify="flex-end">
              <Button size="sm" variant="ghost" onClick={onClose} fontSize="xs">
                Cancel
              </Button>
              <Button
                size="sm"
                bgGradient="linear(to-r, #525FE1 0%, #F86F03 100%)"
                color="white"
                _hover={{ bgGradient: 'linear(to-r, #424cb8 0%, #FFA41B 100%)' }}
                leftIcon={<FiLogIn />}
                isLoading={loading}
                type="submit"
                fontSize="xs"
              >
                Log In & Activate Persona
              </Button>
            </HStack>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
