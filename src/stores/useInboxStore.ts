import { create } from 'zustand'
import { useMemo } from 'react'
import type { Conversation, Message } from '@/types'

interface InboxState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Message[]
  isLoading: boolean
  platformFilter: 'all' | 'whatsapp' | 'instagram' | 'facebook'
  // 'chats' = DMs (WA + IG DMs + FB DMs); 'comments' = IG comment threads
  viewFilter: 'chats' | 'comments'
  tabFilter: 'all' | 'unread' | 'pinned' | 'groups'
  searchQuery: string
  isBulkMode: boolean
  selectedIds: Set<string>
  replyToMessage: Message | null

  setConversations: (convs: Conversation[]) => void
  addConversation: (conv: Conversation) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (msgs: Message[]) => void
  addMessage: (msg: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  setPlatformFilter: (p: InboxState['platformFilter']) => void
  setViewFilter: (v: InboxState['viewFilter']) => void
  setTabFilter: (t: InboxState['tabFilter']) => void
  setSearchQuery: (q: string) => void
  toggleBulkMode: () => void
  toggleSelectConv: (id: string) => void
  clearSelection: () => void
  setLoading: (v: boolean) => void
  setReplyTo: (msg: Message | null) => void
}

export const useInboxStore = create<InboxState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,
  platformFilter: 'all',
  viewFilter: 'chats',
  tabFilter: 'all',
  searchQuery: '',
  isBulkMode: false,
  selectedIds: new Set(),
  replyToMessage: null,

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conv) => set(state => ({
    conversations: [conv, ...state.conversations.filter(c => c.id !== conv.id)],
  })),

  updateConversation: (id, updates) => set(state => ({
    conversations: state.conversations.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ),
  })),

  setActiveConversation: (id) => set({ activeConversationId: id, messages: [], replyToMessage: null }),
  setMessages: (messages) => set({ messages }),

  addMessage: (msg) => set(state => ({
    messages: state.messages.some(m => m.id === msg.id || (msg.external_id && m.external_id === msg.external_id))
      ? state.messages
      : [...state.messages, msg],
  })),

  updateMessage: (id, updates) => set(state => ({
    messages: state.messages.map(m => m.id === id ? { ...m, ...updates } : m),
  })),

  setPlatformFilter: (platformFilter) => set({ platformFilter }),
  setViewFilter: (viewFilter) => set({ viewFilter, activeConversationId: null }),
  setTabFilter: (tabFilter) => set({ tabFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  toggleBulkMode: () => set(state => ({
    isBulkMode: !state.isBulkMode,
    selectedIds: new Set(),
  })),

  toggleSelectConv: (id) => set(state => {
    const next = new Set(state.selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    return { selectedIds: next }
  }),

  clearSelection: () => set({ selectedIds: new Set() }),
  setLoading: (isLoading) => set({ isLoading }),
  setReplyTo: (replyToMessage) => set({ replyToMessage }),
}))

// ── SAFE SELECTORS (no infinite loops) ──────────────────────────────────────
// Each selector reads primitive slices, never creates new arrays inside the
// selector function. Derived arrays are computed in useMemo in the component.

export function useFilteredConversations() {
  const conversations = useInboxStore(state => state.conversations)
  const platformFilter = useInboxStore(state => state.platformFilter)
  const viewFilter = useInboxStore(state => state.viewFilter)
  const tabFilter = useInboxStore(state => state.tabFilter)
  const searchQuery = useInboxStore(state => state.searchQuery)

  return useMemo(() => {
    let list = conversations

    // ── Chats vs Comments panel tabs ─────────────────────────────────────────
    // Comments tab: only IG comment threads (meta.thread_type === 'instagram_comment')
    // Chats tab:    everything else — WA, IG DMs, FB DMs
    if (viewFilter === 'comments') {
      list = list.filter(c => (c.meta?.thread_type ?? 'dm') === 'instagram_comment')
    } else {
      // 'chats' — exclude comment threads
      list = list.filter(c => (c.meta?.thread_type ?? 'dm') !== 'instagram_comment')
    }

    // ── Platform filter ───────────────────────────────────────────────────────
    if (platformFilter !== 'all') {
      list = list.filter(c => c.platform === platformFilter)
    }

    // ── Sub-tabs: unread / pinned ─────────────────────────────────────────────
    if (tabFilter === 'unread') {
      list = list.filter(c => c.unread_count > 0)
    } else if (tabFilter === 'pinned') {
      list = list.filter(c => c.is_pinned)
    }

    // ── Search ────────────────────────────────────────────────────────────────
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c =>
        c.contact?.name?.toLowerCase().includes(q) ||
        c.last_message?.toLowerCase().includes(q) ||
        c.contact?.phone?.includes(q) ||
        c.title?.toLowerCase().includes(q)
      )
    }

    return [...list].sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )
  }, [conversations, platformFilter, viewFilter, tabFilter, searchQuery])
}

export function useActiveConversation() {
  const conversations = useInboxStore(state => state.conversations)
  const activeConversationId = useInboxStore(state => state.activeConversationId)

  return useMemo(
    () => conversations.find(c => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  )
}
