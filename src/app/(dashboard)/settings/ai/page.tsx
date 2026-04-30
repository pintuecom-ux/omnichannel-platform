'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SettingsShell from '@/components/settings/SettingsShell'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 36, height: 20, borderRadius: 10, background: value ? 'var(--accent)' : 'var(--bg-surface2)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: value ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
  )
}

function Breadcrumb({ leaf }: { leaf: string }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => router.push('/settings/admin')}>Admin Settings</span>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Freddy AI</span>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
      <span style={{ color: 'var(--text-primary)' }}>{leaf}</span>
    </div>
  )
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
      <button className="btn btn-primary" onClick={onSave} disabled={saving}>
        {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</> : 'Save'}
      </button>
      <button className="btn btn-secondary">Cancel</button>
    </div>
  )
}

// ── AI Agent Studio ───────────────────────────────────────────────────────────
function AgentStudioTab() {
  const [agents, setAgents] = useState([
    { id: 1, name: 'Support Bot', displayName: 'Aria', channels: ['Web Chat', 'WhatsApp'], status: 'live' as const, conversations: 342 },
    { id: 2, name: 'Sales Bot', displayName: 'Max', channels: ['Web Chat'], status: 'draft' as const, conversations: 0 },
  ])
  const [showBuilder, setShowBuilder] = useState(false)
  const [builderStep, setBuilderStep] = useState(1)
  const [newBot, setNewBot] = useState({ name: '', displayName: '', channels: [] as string[] })

  if (showBuilder) return (
    <div style={{ maxWidth: 640 }}>
      <button onClick={() => { setShowBuilder(false); setBuilderStep(1) }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 20, fontFamily: 'DM Sans, sans-serif' }}>
        <i className="fa-solid fa-arrow-left" /> Back to AI Agents
      </button>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Create AI Agent</div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, alignItems: 'center' }}>
        {['Basic Info', 'Flows', 'Training', 'Settings', 'Test & Publish'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: builderStep > i + 1 ? 'var(--accent)' : builderStep === i + 1 ? 'var(--accent-glow)' : 'var(--bg-surface2)', border: builderStep >= i + 1 ? '2px solid var(--accent)' : '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: builderStep > i + 1 ? '#000' : builderStep === i + 1 ? 'var(--accent)' : 'var(--text-muted)' }}>
                {builderStep > i + 1 ? <i className="fa-solid fa-check" style={{ fontSize: 9 }} /> : i + 1}
              </div>
              <span style={{ fontSize: 9, color: builderStep === i + 1 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < 4 && <div style={{ width: 20, height: 2, background: builderStep > i + 1 ? 'var(--accent)' : 'var(--border)', marginBottom: 18 }} />}
          </div>
        ))}
      </div>

      {builderStep === 1 && (
        <div className="form-section">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Agent Name (internal)</div>
              <input className="form-input" placeholder="e.g. Support Bot" value={newBot.name} onChange={e => setNewBot(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Display Name (shown to visitors)</div>
              <input className="form-input" placeholder="e.g. Aria" value={newBot.displayName} onChange={e => setNewBot(p => ({ ...p, displayName: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Deploy On Channels</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Web Chat', 'WhatsApp', 'Facebook', 'Instagram', 'SMS'].map(ch => {
                const selected = newBot.channels.includes(ch)
                return (
                  <div key={ch} onClick={() => setNewBot(p => ({ ...p, channels: selected ? p.channels.filter(c => c !== ch) : [...p.channels, ch] }))}
                    style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${selected ? 'var(--border-active)' : 'var(--border)'}`, background: selected ? 'var(--accent-glow)' : 'var(--bg-surface)', color: selected ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 12, fontWeight: selected ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {ch}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setShowBuilder(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setBuilderStep(2)}>Next →</button>
          </div>
        </div>
      )}

      {builderStep >= 2 && builderStep <= 4 && (
        <div className="form-section">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 36, color: 'var(--accent)', display: 'block', marginBottom: 14 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Step {builderStep}: {['', '', 'Conversation Flows', 'Training (Intent & Entity)', 'Settings'][builderStep]}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Full visual builder — configure flows, intents, and bot behaviour</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setBuilderStep(p => p - 1)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setBuilderStep(p => p + 1)}>Next →</button>
            </div>
          </div>
        </div>
      )}

      {builderStep === 5 && (
        <div className="form-section">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Test Your Bot</div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, height: 280, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ background: 'var(--accent)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#000' }}>A</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{newBot.displayName || 'AI Agent'}</span>
              </div>
              <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ alignSelf: 'flex-start', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: '80%' }}>
                  Hi! 👋 I'm {newBot.displayName || 'your AI agent'}. How can I help you today?
                </div>
              </div>
              <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input className="form-input" placeholder="Type a test message..." style={{ flex: 1, padding: '7px 12px', fontSize: 12 }} />
                <button className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}><i className="fa-solid fa-paper-plane" /></button>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setBuilderStep(4)}>← Back</button>
            <button className="btn btn-secondary" onClick={() => { setAgents(p => [...p, { id: Date.now(), name: newBot.name, displayName: newBot.displayName, channels: newBot.channels, status: 'draft', conversations: 0 }]); setShowBuilder(false); setBuilderStep(1) }}>Save Draft</button>
            <button className="btn btn-primary" onClick={() => { setAgents(p => [...p, { id: Date.now(), name: newBot.name, displayName: newBot.displayName, channels: newBot.channels, status: 'live', conversations: 0 }]); setShowBuilder(false); setBuilderStep(1) }}>
              <i className="fa-solid fa-rocket" /> Publish
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: 760 }}>
      <Breadcrumb leaf="AI Agent Studio" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>AI Agent Studio</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Build, train, and deploy AI-powered bot agents to automate customer conversations</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowBuilder(true)}><i className="fa-solid fa-plus" /> Create AI Agent</button>
      </div>

      {agents.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <i className="fa-solid fa-robot" style={{ fontSize: 40, color: 'var(--text-muted)', opacity: 0.35 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>No AI agents yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 340 }}>Create your first AI agent to automate common queries and free up your team.</div>
          <button className="btn btn-primary" onClick={() => setShowBuilder(true)}><i className="fa-solid fa-plus" /> Create AI Agent</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {agents.map(agent => (
            <div key={agent.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                {agent.displayName[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {agent.name}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: agent.status === 'live' ? 'rgba(47,231,116,0.12)' : 'var(--bg-surface2)', color: agent.status === 'live' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700, border: agent.status === 'live' ? '1px solid rgba(47,231,116,0.25)' : '1px solid var(--border)' }}>
                    {agent.status === 'live' ? '● Live' : '○ Draft'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {agent.channels.map(ch => <span key={ch} className="pill blue" style={{ fontSize: 10 }}>{ch}</span>)}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{agent.conversations} conversations (30d)</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => setShowBuilder(true)}><i className="fa-solid fa-pencil" /> Edit</button>
                <button className="icon-btn" title="Duplicate"><i className="fa-solid fa-copy" /></button>
                <button className="icon-btn" title="Delete" onClick={() => setAgents(prev => prev.filter(a => a.id !== agent.id))}><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Freddy AI Assistant ───────────────────────────────────────────────────────
function FreddyTab() {
  const [suggestions, setSuggestions] = useState(true)
  const [autoFill, setAutoFill] = useState(false)
  const [summary, setSummary] = useState(true)
  const [sentiment, setSentiment] = useState(true)
  const [sentimentAlert, setSentimentAlert] = useState(false)
  const [saving, setSaving] = useState(false)

  return (
    <div style={{ maxWidth: 600 }}>
      <Breadcrumb leaf="Freddy AI Assistant" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Freddy AI Assistant</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Configure the AI assistant that helps your agents respond faster and smarter</div>

      {/* AI capabilities banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(47,231,116,0.06), rgba(0,168,232,0.05))', border: '1px solid rgba(47,231,116,0.15)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--accent)', fontSize: 20, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Powered by Claude</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Freddy AI uses advanced language models to provide intelligent reply suggestions, summaries, and sentiment analysis.</div>
        </div>
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Reply Suggestions</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Enable Freddy reply suggestions</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Show AI-generated reply suggestions to agents based on conversation context</div>
          </div>
          <Toggle value={suggestions} onChange={setSuggestions} />
        </div>
        {suggestions && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Auto-fill first suggestion</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Automatically pre-fill the reply box with the top suggestion (agents can edit or clear)</div>
              </div>
              <Toggle value={autoFill} onChange={setAutoFill} />
            </div>
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Suggestion Confidence Threshold</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Low', 'Medium', 'High'].map(level => (
                  <button key={level} style={{ flex: 1, padding: '7px', border: '1px solid var(--border)', borderRadius: 8, background: level === 'Medium' ? 'var(--accent-glow)' : 'var(--bg-surface)', color: level === 'Medium' ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: level === 'Medium' ? 700 : 500, fontFamily: 'DM Sans, sans-serif', borderColor: level === 'Medium' ? 'var(--border-active)' : 'var(--border)' }}>
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Conversation Summary</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Enable AI conversation summary</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Freddy auto-generates a summary when a conversation is resolved</div>
          </div>
          <Toggle value={summary} onChange={setSummary} />
        </div>
        {summary && (
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Summary Placement</div>
            <select className="form-input" style={{ maxWidth: 260 }}>
              <option>Conversation notes</option>
              <option>Contact timeline</option>
              <option>Both</option>
            </select>
          </div>
        )}
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Sentiment Analysis</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Enable sentiment detection</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Automatically tag conversations as Positive / Neutral / Negative</div>
          </div>
          <Toggle value={sentiment} onChange={setSentiment} />
        </div>
        {sentiment && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Alert on negative sentiment</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Notify assigned agent when a conversation turns negative</div>
            </div>
            <Toggle value={sentimentAlert} onChange={setSentimentAlert} />
          </div>
        )}
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Knowledge Base Connection</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Connect your FAQ categories so Freddy can pull accurate answers from your knowledge base</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-input" style={{ flex: 1 }}>
            <option>All FAQ categories</option>
            <option>Product FAQs</option>
            <option>Billing FAQs</option>
          </select>
          <button className="btn btn-secondary" style={{ fontSize: 12, flexShrink: 0 }}><i className="fa-solid fa-rotate" /> Sync now</button>
        </div>
      </div>

      <SaveBar onSave={() => { setSaving(true); setTimeout(() => setSaving(false), 1200) }} saving={saving} />
    </div>
  )
}

// ── FAQs / Knowledge Base ─────────────────────────────────────────────────────
type Article = { id: number; title: string; status: 'published' | 'draft'; views: number; updated: string }
type Category = { id: number; name: string; articles: Article[] }

function FAQsTab() {
  const [categories, setCategories] = useState<Category[]>([
    { id: 1, name: 'Getting Started', articles: [
      { id: 1, title: 'How to create your first campaign', status: 'published', views: 234, updated: 'Apr 20, 2026' },
      { id: 2, title: 'Setting up your WhatsApp number', status: 'published', views: 189, updated: 'Apr 18, 2026' },
    ]},
    { id: 2, name: 'Billing & Payments', articles: [
      { id: 3, title: 'How do I upgrade my plan?', status: 'published', views: 91, updated: 'Apr 10, 2026' },
      { id: 4, title: 'Refund policy', status: 'draft', views: 0, updated: 'Apr 5, 2026' },
    ]},
    { id: 3, name: 'Integrations', articles: [] },
  ])
  const [selectedCat, setSelectedCat] = useState<number>(1)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [articleTitle, setArticleTitle] = useState('')
  const [articleBody, setArticleBody] = useState('')

  const activeCat = categories.find(c => c.id === selectedCat)
  const filteredArticles = (activeCat?.articles ?? []).filter(a => filter === 'all' || a.status === filter)

  if (editingArticle || editingArticle === null && articleTitle) return (
    <div style={{ maxWidth: 720 }}>
      <button onClick={() => { setEditingArticle(null); setArticleTitle(''); setArticleBody('') }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 20, fontFamily: 'DM Sans, sans-serif' }}>
        <i className="fa-solid fa-arrow-left" /> Back to articles
      </button>
      <input value={articleTitle} onChange={e => setArticleTitle(e.target.value)} placeholder="Article title" style={{ width: '100%', fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', marginBottom: 20 }} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select className="form-input" style={{ maxWidth: 200 }}>
          {categories.map(c => <option key={c.id}>{c.name}</option>)}
        </select>
        <select className="form-input" style={{ maxWidth: 140 }}>
          <option>Draft</option>
          <option>Published</option>
        </select>
        <select className="form-input" style={{ maxWidth: 140 }}>
          <option>Public</option>
          <option>Agents only</option>
        </select>
      </div>
      <textarea value={articleBody} onChange={e => setArticleBody(e.target.value)} placeholder="Write your article content here... (Markdown supported)" rows={18} className="form-input" style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7 }} />
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={() => { setEditingArticle(null); setArticleTitle(''); setArticleBody('') }}>Cancel</button>
        <button className="btn btn-secondary">Save Draft</button>
        <button className="btn btn-primary"><i className="fa-solid fa-globe" /> Publish</button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 20, minHeight: 500 }}>
      {/* Category tree */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Categories</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {categories.map(cat => (
            <div key={cat.id} onClick={() => setSelectedCat(cat.id)} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: selectedCat === cat.id ? 'var(--accent-glow)' : 'transparent', color: selectedCat === cat.id ? 'var(--accent)' : 'var(--text-secondary)', transition: 'all 0.15s', borderLeft: selectedCat === cat.id ? '2px solid var(--accent)' : '2px solid transparent' }}
              onMouseEnter={e => { if (selectedCat !== cat.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (selectedCat !== cat.id) e.currentTarget.style.background = 'transparent' }}
            >
              <i className="fa-solid fa-folder" style={{ fontSize: 11 }} />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: selectedCat === cat.id ? 700 : 500 }}>{cat.name}</span>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: selectedCat === cat.id ? 'rgba(47,231,116,0.2)' : 'var(--bg-surface2)', color: selectedCat === cat.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700 }}>{cat.articles.length}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setCategories(prev => [...prev, { id: Date.now(), name: 'New Category', articles: [] }])} style={{ width: '100%', marginTop: 10, padding: '7px', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
          <i className="fa-solid fa-plus" style={{ marginRight: 5 }} />Add category
        </button>
      </div>

      {/* Articles */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
            {(['all', 'published', 'draft'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', background: filter === f ? 'var(--bg-panel)' : 'transparent', color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontWeight: filter === f ? 600 : 400, textTransform: 'capitalize' }}>{f}</button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => { setEditingArticle({ id: -1, title: '', status: 'draft', views: 0, updated: '' }); setArticleTitle(''); setArticleBody('') }}>
            <i className="fa-solid fa-plus" /> New article
          </button>
        </div>

        {filteredArticles.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <i className="fa-solid fa-book-open" style={{ fontSize: 32, color: 'var(--text-muted)', opacity: 0.35, display: 'block', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Your knowledge base is empty</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Create articles to help customers self-serve and reduce repetitive support queries.</div>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => { setEditingArticle({ id: -1, title: '', status: 'draft', views: 0, updated: '' }); setArticleTitle(''); setArticleBody('') }}>
              <i className="fa-solid fa-plus" /> Write your first article
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredArticles.map(article => (
              <div key={article.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(47,231,116,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <i className="fa-solid fa-file-lines" style={{ color: 'var(--text-muted)', fontSize: 13, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{article.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated {article.updated} · {article.views} views</div>
                </div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: article.status === 'published' ? 'rgba(47,231,116,0.12)' : 'var(--bg-surface2)', color: article.status === 'published' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700, border: article.status === 'published' ? '1px solid rgba(47,231,116,0.25)' : '1px solid var(--border)' }}>
                  {article.status}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="icon-btn" onClick={() => { setEditingArticle(article); setArticleTitle(article.title); setArticleBody('') }}><i className="fa-solid fa-pencil" /></button>
                  <button className="icon-btn" onClick={() => setCategories(prev => prev.map(c => c.id === selectedCat ? { ...c, articles: c.articles.filter(a => a.id !== article.id) } : c))}><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SUB_NAV = [
  { id: 'agent-studio', label: 'AI Agent Studio',      icon: 'fa-solid fa-wand-magic-sparkles', group: 'AI' },
  { id: 'freddy',       label: 'Freddy AI Assistant',  icon: 'fa-solid fa-robot',               group: 'AI' },
  { id: 'faqs',         label: 'FAQs / Knowledge Base', icon: 'fa-solid fa-book-open',          group: 'Self-service' },
]

export default function AIPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams?.get('tab') ?? 'agent-studio'
  const setTab = (t: string) => router.push(`/settings/ai?tab=${t}`)

  return (
    <SettingsShell>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 220, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, padding: '12px 0' }}>
          {[...new Set(SUB_NAV.map(s => s.group))].map(group => (
            <div key={group}>
              <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{group}</div>
              {SUB_NAV.filter(s => s.group === group).map(item => {
                const isActive = tab === item.id
                return (
                  <div key={item.id} onClick={() => setTab(item.id)} style={{ padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: isActive ? 'var(--accent-glow)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400, fontSize: 12.5, transition: 'all 0.15s', borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent' }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <i className={item.icon} style={{ fontSize: 12, width: 14 }} />
                    {item.label}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {tab === 'agent-studio' && <AgentStudioTab />}
          {tab === 'freddy'       && <FreddyTab />}
          {tab === 'faqs'         && <FAQsTab />}
        </div>
      </div>
    </SettingsShell>
  )
}
