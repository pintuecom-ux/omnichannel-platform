import { create } from 'zustand'
import type { Conversation, Message } from '@/types'

interface InboxState {
  // Conversations
  conversations: Conversation[]
  activeConversationId: string | null
  
  // Messages for active conversation
  messages: Message[]
  
  // UI state
  isLoading: boolean
  platformFilter: 'all' | 'whatsapp' | 'instagram' | 'facebook'
  tabFilter: 'all' | 'unread' | 'pinned' | 'groups'
  searchQuery: string
  isBulkMode: boolean
  selectedIds: Set<string>
  
  // Actions
  setConversations: (convs: Conversation[]) => void
  addConversation: (conv: Conversation) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (msgs: Message[]) => void
  addMessage: (msg: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  setPlatformFilter: (p: InboxState['platformFilter']) => void
  setTabFilter: (t: InboxState['tabFilter']) => void
  setSearchQuery: (q: string) => void
  toggleBulkMode: () => void
  toggleSelectConv: (id: string) => void
  clearSelection: () => void
}

export const useInboxStore = create<InboxState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,
  platformFilter: 'all',
  tabFilter: 'all',
  searchQuery: '',
  isBulkMode: false,
  selectedIds: new Set(),

  setConversations: (conversations) => set({ conversations }),
  
  addConversation: (conv) => set(state => ({
    conversations: [conv, ...state.conversations]
  })),
  
  updateConversation: (id, updates) => set(state => ({
    conversations: state.conversations.map(c => 
      c.id === id ? { ...c, ...updates } : c
    )
  })),
  
  setActiveConversation: (id) => set({ activeConversationId: id, messages: [] }),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (msg) => set(state => ({
    messages: [...state.messages, msg]
  })),
  
  updateMessage: (id, updates) => set(state => ({
    messages: state.messages.map(m => m.id === id ? { ...m, ...updates } : m)
  })),
  
  setPlatformFilter: (platformFilter) => set({ platformFilter }),
  setTabFilter: (tabFilter) => set({ tabFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  
  toggleBulkMode: () => set(state => ({
    isBulkMode: !state.isBulkMode,
    selectedIds: new Set()
  })),
  
  toggleSelectConv: (id) => set(state => {
    const next = new Set(state.selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return { selectedIds: next }
  }),
  
  clearSelection: () => set({ selectedIds: new Set() }),
}))

// Selector: filtered conversations
export const useFilteredConversations = () => {
  return useInboxStore(state => {
    let list = state.conversations
    
    if (state.platformFilter !== 'all')
      list = list.filter(c => c.platform === state.platformFilter)
    
    if (state.tabFilter === 'unread')
      list = list.filter(c => c.unread_count > 0)
    else if (state.tabFilter === 'pinned')
      list = list.filter(c => c.is_pinned)
    
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase()
      list = list.filter(c =>
        c.contact?.name?.toLowerCase().includes(q) ||
        c.last_message?.toLowerCase().includes(q) ||
        c.contact?.phone?.includes(q)
      )
    }
    
    return list
  })
}