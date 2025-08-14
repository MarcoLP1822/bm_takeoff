"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { DateClickArg, DropArg } from '@fullcalendar/interaction'
import { EventClickArg, EventDropArg } from '@fullcalendar/core'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Calendar,
  Plus,
  Clock,
  Star,
  Edit,
  Trash2,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { type ScheduledPost } from "@/lib/publishing-service"
import { toast } from "sonner"

interface CalendarEvent {
  id: string
  title: string
  date: string
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  extendedProps: {
    platform: string
    contentId: string
    status: 'scheduled' | 'published' | 'failed'
    engagementPotential?: number
    content: string
  }
}

interface ScheduledEvent {
  id: string
  title?: string
  content?: string
  date: string
  platform: string
  contentId: string
  status: string
  engagementPotential?: number
}

interface VariationResponse {
  id: string
  posts: Array<{
    id: string
    content: string
    platform: string
    engagementPotential?: number
  }>
  theme: string
  bookTitle: string
}

interface DraftPost {
  id: string
  content: string
  platform: string
  engagementPotential: number
  theme: string
  bookTitle: string
}

interface ContentCalendarProps {
  className?: string
}

const PLATFORM_CONFIGS = {
  twitter: {
    name: "Twitter/X",
    icon: Twitter,
    color: "#1DA1F2",
    darkColor: "#0F7DC7"
  },
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "#E4405F",
    darkColor: "#C1205A"
  },
  linkedin: {
    name: "LinkedIn",
    icon: Linkedin,
    color: "#0077B5",
    darkColor: "#005885"
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    darkColor: "#1559C7"
  }
} as const

export default function ContentCalendar({ className }: ContentCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [drafts, setDrafts] = useState<DraftPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<DraftPost | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [isScheduling, setIsScheduling] = useState(false)
  const [socialAccounts, setSocialAccounts] = useState<Array<{
    id: string
    platform: string
    accountName: string
    accountHandle?: string
    isActive: boolean
  }>>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const calendarRef = useRef<FullCalendar>(null)

  useEffect(() => {
    loadCalendarData()
    loadSocialAccounts()
  }, [])

  // Initialize external events for drag and drop
  useEffect(() => {
    const initializeExternalEvents = () => {
      // Make draft cards draggable as external events
      const draftCards = document.querySelectorAll('.draft-card')
      draftCards.forEach(card => {
        if (card instanceof HTMLElement) {
          card.draggable = true
          // FullCalendar will automatically detect these as external events
          // because they have the fc-event class
        }
      })
    }

    // Initialize after a short delay to ensure DOM is ready
    const timer = setTimeout(initializeExternalEvents, 100)
    return () => clearTimeout(timer)
  }, [drafts]) // Re-run when drafts change

  const loadCalendarData = async () => {
    try {
      setLoading(true)
      
      // Carica eventi programmati reali
      const eventsResponse = await fetch('/api/social/schedule')
      const eventsData = await eventsResponse.json()
      
      // Carica bozze (contenuti con status draft) reali
      const draftsResponse = await fetch('/api/content/variations?status=draft')
      const draftsData = await draftsResponse.json()
      
      // Trasforma eventi programmati nel formato del calendario
      const calendarEvents: CalendarEvent[] = eventsData.success ? eventsData.scheduledPosts.map((post: ScheduledPost) => ({
        id: post.id,
        title: `${post.platform}: ${post.content.substring(0, 30)}...`,
        date: post.scheduledAt.toString().split('T')[0], // Converti Date a string YYYY-MM-DD
        backgroundColor: PLATFORM_CONFIGS[post.platform as keyof typeof PLATFORM_CONFIGS]?.color || '#3b82f6',
        borderColor: PLATFORM_CONFIGS[post.platform as keyof typeof PLATFORM_CONFIGS]?.darkColor || '#1d4ed8',
        extendedProps: {
          platform: post.platform,
          contentId: post.contentId,
          status: post.status,
          engagementPotential: 3, // Default value since ScheduledPost doesn't have this
          content: post.content
        }
      })) : []
      
      // Trasforma bozze nel formato richiesto
      const draftPosts: DraftPost[] = draftsData.success ? 
        draftsData.data.variations.flatMap((variation: VariationResponse) => 
          variation.posts.map((post: VariationResponse['posts'][0]) => ({
            id: post.id,
            content: post.content,
            platform: post.platform,
            engagementPotential: post.engagementPotential || 3,
            theme: variation.theme,
            bookTitle: variation.bookTitle
          }))
        ) : []
      
      setEvents(calendarEvents)
      setDrafts(draftPosts)
    } catch (error) {
      console.error('Error loading calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSocialAccounts = async () => {
    try {
      const response = await fetch('/api/social/accounts')
      const data = await response.json()
      
      if (data.accounts) {
        setSocialAccounts(data.accounts.filter((account: {
          id: string
          platform: string
          accountName: string
          accountHandle?: string
          isActive: boolean
        }) => account.isActive))
      }
    } catch (error) {
      console.error('Error loading social accounts:', error)
    }
  }

  const handleDateClick = (arg: DateClickArg) => {
    setSelectedDate(arg.dateStr)
    console.log('Date selected:', arg.dateStr)
  }

  const handleEventClick = (arg: EventClickArg) => {
    const event = events.find(e => e.id === arg.event.id)
    if (event) {
      setSelectedEvent(event)
    }
  }

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    try {
      const eventId = dropInfo.event.id
      const newDate = dropInfo.event.start?.toISOString().split('T')[0]
      
      console.log(`Moving event ${eventId} to ${newDate}`)
      
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, date: newDate || event.date }
          : event
      ))
      
    } catch (error) {
      console.error('Error updating schedule:', error)
      dropInfo.revert()
    }
  }

  const handleScheduleDraft = (draft: DraftPost) => {
    setSelectedDraft(draft)
    setScheduleDate(new Date().toISOString().split('T')[0]) // Default to today
    setSelectedAccounts([]) // Reset account selection
    setShowScheduleDialog(true)
  }

  const handleDrop = async (dropInfo: DropArg) => {
    try {
      console.log('Drop event triggered:', dropInfo)
      
      // Get the dropped draft data from multiple sources
      let draftData = null
      
      // Try to get from draggedEl data attribute
      const draftElement = dropInfo.draggedEl
      if (draftElement) {
        const draftDataString = draftElement.getAttribute('data-draft')
        if (draftDataString) {
          draftData = JSON.parse(draftDataString)
        }
      }
      
      // If not found, try from dataTransfer (fallback)
      if (!draftData && dropInfo.draggedEl) {
        const allDrafts = document.querySelectorAll('.draft-card')
        for (const element of allDrafts) {
          if (element === dropInfo.draggedEl) {
            const dataString = element.getAttribute('data-draft')
            if (dataString) {
              draftData = JSON.parse(dataString)
              break
            }
          }
        }
      }

      if (!draftData || !draftData.id) {
        console.error('No draft data found in drop event')
        toast.error("Errore nel recupero dei dati della bozza")
        return
      }

      console.log('Draft data found:', draftData)

      const dropDate = dropInfo.date.toISOString().split('T')[0]
      
      // For now, schedule at 10:00 AM by default when dropping
      const scheduledAt = new Date(`${dropDate}T10:00:00`)
      
      // Check if we have active social accounts
      if (socialAccounts.length === 0) {
        // For now, just show visual feedback without actual scheduling
        toast.error("Nessun account social connesso, ma testiamo il drag and drop...")
        
        // Add to calendar visually for testing
        const newEvent: CalendarEvent = {
          id: draftData.id,
          title: `${draftData.platform}: ${draftData.content.substring(0, 30)}...`,
          date: dropDate,
          backgroundColor: PLATFORM_CONFIGS[draftData.platform as keyof typeof PLATFORM_CONFIGS]?.color || '#3b82f6',
          borderColor: PLATFORM_CONFIGS[draftData.platform as keyof typeof PLATFORM_CONFIGS]?.darkColor || '#1d4ed8',
          extendedProps: {
            platform: draftData.platform,
            contentId: draftData.id,
            status: 'scheduled',
            engagementPotential: draftData.engagementPotential,
            content: draftData.content
          }
        }
        
        setEvents(prev => [...prev, newEvent])
        setDrafts(prev => prev.filter(d => d.id !== draftData.id))
        toast.success(`Drop riuscito! Post aggiunto al ${dropDate} (test mode)`)
        return
      }

      // Use the first active account by default for drag and drop
      const defaultAccount = socialAccounts[0]
      
      console.log('Scheduling post:', {
        contentId: draftData.id,
        date: dropDate,
        time: '10:00',
        accountId: defaultAccount.id
      })
      
      const response = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: draftData.id,
          accountIds: [defaultAccount.id],
          scheduledAt: scheduledAt.toISOString()
        })
      })

      if (response.ok) {
        // Add to calendar
        const newEvent: CalendarEvent = {
          id: draftData.id,
          title: `${draftData.platform}: ${draftData.content.substring(0, 30)}...`,
          date: dropDate,
          backgroundColor: PLATFORM_CONFIGS[draftData.platform as keyof typeof PLATFORM_CONFIGS]?.color || '#3b82f6',
          borderColor: PLATFORM_CONFIGS[draftData.platform as keyof typeof PLATFORM_CONFIGS]?.darkColor || '#1d4ed8',
          extendedProps: {
            platform: draftData.platform,
            contentId: draftData.id,
            status: 'scheduled',
            engagementPotential: draftData.engagementPotential,
            content: draftData.content
          }
        }
        
        setEvents(prev => [...prev, newEvent])
        
        // Remove from drafts
        setDrafts(prev => prev.filter(d => d.id !== draftData.id))
        
        toast.success(`Post programmato per ${dropDate} alle 10:00!`)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Errore nella programmazione")
        console.error('Scheduling failed:', errorData)
      }
    } catch (error) {
      console.error('Error in drag and drop:', error)
      toast.error("Errore durante il drag and drop")
    }
  }

  // Custom drop handler for direct day drops
  const handleCustomDrop = async (draftData: DraftPost, dropDate: string) => {
    try {
      console.log('Custom drop triggered:', { draftData, dropDate })
      
      // For now, schedule at 10:00 AM by default when dropping
      const scheduledAt = new Date(`${dropDate}T10:00:00`)
      
      // Check if we have active social accounts
      if (socialAccounts.length === 0) {
        // For now, just show visual feedback without actual scheduling
        toast.success("Drop riuscito! (modalità test - nessun account social)")
        
        // Add to calendar visually for testing
        const newEvent: CalendarEvent = {
          id: draftData.id,
          title: `${draftData.platform}: ${draftData.content.substring(0, 30)}...`,
          date: dropDate,
          backgroundColor: PLATFORM_CONFIGS[draftData.platform as keyof typeof PLATFORM_CONFIGS]?.color || '#3b82f6',
          borderColor: PLATFORM_CONFIGS[draftData.platform as keyof typeof PLATFORM_CONFIGS]?.darkColor || '#1d4ed8',
          extendedProps: {
            platform: draftData.platform,
            contentId: draftData.id,
            status: 'scheduled',
            engagementPotential: draftData.engagementPotential,
            content: draftData.content
          }
        }
        
        setEvents(prev => [...prev, newEvent])
        setDrafts(prev => prev.filter(d => d.id !== draftData.id))
        return
      }

      // Use the first active account by default for drag and drop
      const defaultAccount = socialAccounts[0]
      
      console.log('Scheduling post:', {
        contentId: draftData.id,
        date: dropDate,
        time: '10:00',
        accountId: defaultAccount.id
      })
      
      const response = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: draftData.id,
          accountIds: [defaultAccount.id],
          scheduledAt: scheduledAt.toISOString()
        })
      })

      if (response.ok) {
        // Add to calendar
        const newEvent: CalendarEvent = {
          id: draftData.id,
          title: `${draftData.platform}: ${draftData.content.substring(0, 30)}...`,
          date: dropDate,
          backgroundColor: PLATFORM_CONFIGS[draftData.platform as keyof typeof PLATFORM_CONFIGS]?.color || '#3b82f6',
          borderColor: PLATFORM_CONFIGS[draftData.platform as keyof typeof PLATFORM_CONFIGS]?.darkColor || '#1d4ed8',
          extendedProps: {
            platform: draftData.platform,
            contentId: draftData.id,
            status: 'scheduled',
            engagementPotential: draftData.engagementPotential,
            content: draftData.content
          }
        }
        
        setEvents(prev => [...prev, newEvent])
        
        // Remove from drafts
        setDrafts(prev => prev.filter(d => d.id !== draftData.id))
        
        toast.success(`Post programmato per ${dropDate} alle 10:00!`)
      } else {
        const errorData = await response.json()
        if (errorData.error === 'Scheduled time must be in the future') {
          toast.error("⚠️ Impossibile programmare nel passato", {
            description: "Seleziona una data futura per programmare il post",
            duration: 8000
          })
        } else {
          toast.error(errorData.error || "Errore nella programmazione", {
            duration: 6000
          })
        }
        console.error('Scheduling failed:', errorData)
      }
    } catch (error) {
      console.error('Error in custom drop:', error)
      toast.error("Errore durante il drag and drop")
    }
  }

  const handleScheduleSubmit = async () => {
    if (!selectedDraft || !scheduleDate || !scheduleTime || selectedAccounts.length === 0) {
      toast.error("Seleziona almeno un account social")
      return
    }

    setIsScheduling(true)
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`)
      
      const response = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: selectedDraft.id,
          accountIds: selectedAccounts, // Use selected account IDs
          scheduledAt: scheduledAt.toISOString()
        })
      })

      if (response.ok) {
        // Add to calendar
        const newEvent: CalendarEvent = {
          id: selectedDraft.id,
          title: `${selectedDraft.platform}: ${selectedDraft.content.substring(0, 30)}...`,
          date: scheduleDate,
          backgroundColor: PLATFORM_CONFIGS[selectedDraft.platform as keyof typeof PLATFORM_CONFIGS]?.color || '#3b82f6',
          borderColor: PLATFORM_CONFIGS[selectedDraft.platform as keyof typeof PLATFORM_CONFIGS]?.darkColor || '#1d4ed8',
          extendedProps: {
            platform: selectedDraft.platform,
            contentId: selectedDraft.id,
            status: 'scheduled',
            engagementPotential: selectedDraft.engagementPotential,
            content: selectedDraft.content
          }
        }
        
        setEvents(prev => [...prev, newEvent])
        
        // Remove from drafts
        setDrafts(prev => prev.filter(d => d.id !== selectedDraft.id))
        
        toast.success("Post programmato con successo!")
        setShowScheduleDialog(false)
        setSelectedDraft(null)
      } else {
        const errorData = await response.json()
        toast.error(`Errore nella programmazione: ${errorData.error || 'Errore sconosciuto'}`)
        console.error('Failed to schedule post')
      }
    } catch (error) {
      console.error('Error scheduling post:', error)
      toast.error("Errore di connessione durante la programmazione")
    } finally {
      setIsScheduling(false)
    }
  }

  const renderEngagementStars = (score: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= score
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  const getPlatformIcon = (platform: string) => {
    const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS]
    if (!config) return null
    
    const IconComponent = config.icon
    return <IconComponent className="h-4 w-4" />
  }

  const filteredDrafts = drafts.filter(draft =>
    searchQuery === "" ||
    draft.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    draft.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
    draft.bookTitle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento calendario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("content-calendar-container grid grid-cols-1 lg:grid-cols-4 gap-6 min-w-0 w-full overflow-hidden", className)}>
      {/* Calendario principale */}
      <div className="lg:col-span-3 min-w-0 overflow-hidden">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario Editoriale
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={events}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              editable={true}
              eventDrop={handleEventDrop}
              height="auto"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth'
              }}
              eventDisplay="block"
              eventTextColor="white"
              // Add custom drop handling
              viewDidMount={(info) => {
                // Add drop zone listeners to calendar days
                const calendarEl = info.el
                const dayElements = calendarEl.querySelectorAll('.fc-day')
                
                dayElements.forEach((dayEl) => {
                  if (dayEl instanceof HTMLElement) {
                    dayEl.addEventListener('dragover', (e: DragEvent) => {
                      e.preventDefault()
                      if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'copy'
                      }
                      dayEl.classList.add('drag-over')
                    })
                    
                    dayEl.addEventListener('dragleave', () => {
                      dayEl.classList.remove('drag-over')
                    })
                    
                    dayEl.addEventListener('drop', (e: DragEvent) => {
                      e.preventDefault()
                      dayEl.classList.remove('drag-over')
                      
                      try {
                        const draftData = e.dataTransfer?.getData('application/json')
                        if (draftData) {
                          const draft = JSON.parse(draftData)
                          
                          // Get date from the day element's aria-label or data attributes
                          let dateStr = dayEl.getAttribute('data-date')
                          if (!dateStr) {
                            // Try to get from aria-label or other attributes
                            const ariaLabel = dayEl.getAttribute('aria-label')
                            if (ariaLabel) {
                              // Parse date from aria-label if available
                              const dateMatch = ariaLabel.match(/(\d{4}-\d{2}-\d{2})/)
                              if (dateMatch) {
                                dateStr = dateMatch[1]
                              }
                            }
                          }
                          
                          // Fallback: get from the text content and current view
                          if (!dateStr) {
                            const dayText = dayEl.textContent?.trim()
                            if (dayText && /^\d{1,2}$/.test(dayText)) {
                              const calendar = info.view.calendar
                              const currentDate = calendar.getDate()
                              const year = currentDate.getFullYear()
                              const month = currentDate.getMonth()
                              const day = parseInt(dayText)
                              
                              // Create date for this day
                              const dropDate = new Date(year, month, day)
                              dateStr = dropDate.toISOString().split('T')[0]
                            }
                          }
                          
                          if (dateStr) {
                            handleCustomDrop(draft, dateStr)
                          } else {
                            toast.error("Impossibile determinare la data del drop")
                          }
                        }
                      } catch (error) {
                        console.error('Error handling drop:', error)
                        toast.error("Errore durante il drop")
                      }
                    })
                  }
                })
              }}
              eventContent={(arg) => {
                const { event } = arg
                const platform = event.extendedProps.platform
                const potential = event.extendedProps.engagementPotential
                const status = event.extendedProps.status
                
                return (
                  <div className="p-1 text-xs">
                    <div className="flex items-center gap-1 mb-1">
                      {getPlatformIcon(platform)}
                      {potential && renderEngagementStars(potential)}
                      {status === 'published' && <CheckCircle className="h-3 w-3" />}
                      {status === 'failed' && <AlertCircle className="h-3 w-3" />}
                    </div>
                    <div className="font-medium truncate">
                      {event.title}
                    </div>
                  </div>
                )
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar con bozze e controlli */}
      <div className="space-y-6 min-w-0">
        <Card className="h-fit overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 min-w-0">
              <Edit className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Bozze Pronte</span>
              {filteredDrafts.length > 0 && (
                <Badge variant="secondary" className="ml-auto flex-shrink-0">
                  {filteredDrafts.length}
                </Badge>
              )}
            </CardTitle>
            <Input
              placeholder="Cerca bozze..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {filteredDrafts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <Edit className="h-8 w-8 mx-auto" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? "Nessuna bozza trovata" : "Nessuna bozza disponibile"}
                </p>
                {!searchQuery && (
                  <Button size="sm" className="mt-3" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Genera Contenuti
                  </Button>
                )}
              </div>
            ) : (
              filteredDrafts.map((draft) => (
              <div 
                key={draft.id} 
                className="draft-card fc-event border rounded-lg p-3 space-y-2 min-w-0 overflow-hidden cursor-move hover:shadow-md transition-all duration-200"
                draggable={true}
                data-draft={JSON.stringify(draft)}
                data-event={JSON.stringify({
                  id: draft.id,
                  title: `${draft.platform}: ${draft.content.substring(0, 30)}...`,
                  backgroundColor: PLATFORM_CONFIGS[draft.platform as keyof typeof PLATFORM_CONFIGS]?.color || '#3b82f6',
                  borderColor: PLATFORM_CONFIGS[draft.platform as keyof typeof PLATFORM_CONFIGS]?.darkColor || '#1d4ed8'
                })}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify(draft))
                  e.dataTransfer.effectAllowed = 'copy'
                  e.currentTarget.classList.add('dragging')
                  
                  // Add visual feedback to calendar
                  const calendarEl = document.querySelector('.fc')
                  if (calendarEl) {
                    calendarEl.classList.add('receiving-drag')
                  }
                }}
                onDragEnd={(e) => {
                  e.currentTarget.classList.remove('dragging')
                  
                  // Remove visual feedback from calendar
                  const calendarEl = document.querySelector('.fc')
                  if (calendarEl) {
                    calendarEl.classList.remove('receiving-drag')
                  }
                }}
              >
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    {getPlatformIcon(draft.platform)}
                    <span className="text-sm font-medium truncate">
                      {PLATFORM_CONFIGS[draft.platform as keyof typeof PLATFORM_CONFIGS]?.name}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    {renderEngagementStars(draft.engagementPotential)}
                  </div>
                </div>
                
                <p className="draft-content text-sm text-muted-foreground line-clamp-2">
                  {draft.content}
                </p>
                
                <div className="draft-actions flex items-center justify-between flex-wrap gap-2 min-w-0">
                  <Badge variant="secondary" className="text-xs flex-shrink-0 truncate max-w-[100px]">
                    {draft.theme}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleScheduleDraft(draft)}
                    className="flex-shrink-0 min-w-fit"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <span className="whitespace-nowrap">Programma</span>
                  </Button>
                </div>
              </div>
            ))
            )}
          </CardContent>
        </Card>

        {/* Statistiche rapide */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Panoramica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Post programmati</span>
              <Badge variant="outline">{events.filter(e => e.extendedProps.status === 'scheduled').length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bozze pronte</span>
              <Badge variant="outline">{drafts.length}</Badge>
            </div>
            
            <Separator className="my-3" />
            
            <div className="space-y-2">
              <span className="text-sm font-medium">Azioni rapide</span>
              <div className="space-y-1">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Auto-programma settimana
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Star className="h-4 w-4 mr-2" />
                  Programma solo 4+ stelle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal per dettagli evento */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Dettagli Post</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {getPlatformIcon(selectedEvent.extendedProps.platform)}
                <span className="font-medium">
                  {PLATFORM_CONFIGS[selectedEvent.extendedProps.platform as keyof typeof PLATFORM_CONFIGS]?.name}
                </span>
                {selectedEvent.extendedProps.engagementPotential && 
                  renderEngagementStars(selectedEvent.extendedProps.engagementPotential)
                }
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Contenuto:</p>
                <p className="text-sm">{selectedEvent.extendedProps.content}</p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog per programmazione */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Programma Post</DialogTitle>
            <DialogDescription>
              Scegli data e ora per pubblicare questo contenuto.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDraft && (
            <div className="space-y-4">
              {/* Preview del post */}
              <div className="border rounded-lg p-3 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  {getPlatformIcon(selectedDraft.platform)}
                  <span className="text-sm font-medium">
                    {PLATFORM_CONFIGS[selectedDraft.platform as keyof typeof PLATFORM_CONFIGS]?.name}
                  </span>
                  {renderEngagementStars(selectedDraft.engagementPotential)}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedDraft.content}
                </p>
              </div>

              {/* Data e ora */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-date">Data</Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-time">Ora</Label>
                  <Input
                    id="schedule-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Selezione account social */}
              <div className="space-y-2">
                <Label>Account Social</Label>
                {socialAccounts.length === 0 ? (
                  <div className="p-3 border rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nessun account social connesso. 
                      <Link href="/dashboard/settings/social" className="text-primary hover:underline ml-1">
                        Connetti account
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {socialAccounts.map((account) => (
                      <div key={account.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={account.id}
                          checked={selectedAccounts.includes(account.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAccounts(prev => [...prev, account.id])
                            } else {
                              setSelectedAccounts(prev => prev.filter(id => id !== account.id))
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={account.id} className="flex items-center gap-2 cursor-pointer">
                          {getPlatformIcon(account.platform)}
                          <span className="text-sm">
                            {account.accountName}
                            {account.accountHandle && (
                              <span className="text-muted-foreground ml-1">
                                @{account.accountHandle}
                              </span>
                            )}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleScheduleSubmit}
              disabled={isScheduling || !scheduleDate || !scheduleTime || selectedAccounts.length === 0}
            >
              {isScheduling ? "Programmando..." : "Programma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
