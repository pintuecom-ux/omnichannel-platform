'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInboxStore, useActiveConversation } from '@/stores/useInboxStore'
import { formatMessageDate, getInitials, getAvatarColor } from '@/lib/utils'

interface PostDetails {
  id?: string
  caption?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  media_type?: string
  like_count?: number
  comments_count?: number
}

export default function PostCommenterPanel() {
  const supabase = useMemo(() => createClient(), [])
  const conversation = useActiveConversation()
  const { selectedComment, messages } = useInboxStore()
  const [post, setPost] = useState<PostDetails | null>(null)

  const platform = conversation?.platform ?? 'instagram'
  const isIG = platform === 'instagram'

  useEffect(() => {
    async function loadPost() {
      if (!conversation) return
      const mediaId = conversation.meta?.media_id ?? conversation.meta?.post_id ?? conversation.external_id
      if (!mediaId) {
        setPost({
          caption: conversation.meta?.post_caption || conversation.meta?.caption || conversation.title || '',
          media_url: conversation.meta?.media_url || conversation.meta?.full_picture,
          thumbnail_url: conversation.meta?.thumbnail_url,
          permalink: conversation.meta?.permalink
        })
        return
      }

      const { data } = await supabase
        .from('instagram_media_items')
        .select('*')
        .or(`instagram_media_id.eq.${mediaId},id.eq.${mediaId}`)
        .maybeSingle()

      if (data) {
        setPost({
          id: data.instagram_media_id,
          caption: data.caption,
          media_url: data.media_url,
          thumbnail_url: data.thumbnail_url,
          permalink: data.permalink,
          media_type: data.media_type,
          like_count: data.like_count,
          comments_count: data.comments_count,
        })
      } else {
        setPost({
          id: mediaId,
          caption: conversation.meta?.post_caption || conversation.meta?.caption || conversation.title || '',
          media_url: conversation.meta?.media_url || conversation.meta?.full_picture,
          thumbnail_url: conversation.meta?.thumbnail_url,
          permalink: conversation.meta?.permalink,
          like_count: conversation.meta?.like_count || 0,
          comments_count: conversation.meta?.comments_count || messages.length
        })
      }
    }
    loadPost()
  }, [conversation, supabase, messages.length])

  if (!conversation) return null

  // Format hashtags with stylish highlighting
  function renderCaptionWithHashtags(text: string | undefined) {
    if (!text) return <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No caption provided</span>
    const words = text.split(/(\s+)/)
    return words.map((w, idx) => {
      if (w.startsWith('#')) {
        return (
          <span key={idx} style={{ color: isIG ? '#e1306c' : '#3b82f6', fontWeight: 500, cursor: 'pointer', marginRight: 2 }}>
            {w}
          </span>
        )
      }
      return w
    })
  }

  const commenterName = selectedComment ? (
    selectedComment.direction === 'outbound' || selectedComment.meta?.brand_comment || selectedComment.meta?.brand_reply
      ? 'Official Brand Page'
      : (selectedComment.meta?.from?.name || selectedComment.meta?.commenter_username || selectedComment.meta?.author_name || (selectedComment.sender as any)?.full_name || conversation.contact?.name || 'Customer User')
  ) : null

  const commenterId = selectedComment?.meta?.from?.id || selectedComment?.meta?.commenter_username || selectedComment?.sender_id

  // Find all comments by this specific commenter in this thread
  const filteredHistory = selectedComment && commenterId ? messages.filter(m => {
    const id = m.meta?.from?.id || m.meta?.commenter_username || m.sender_id
    return id === commenterId
  }) : []

  const userHistory = filteredHistory.length > 0 ? filteredHistory : (selectedComment ? [selectedComment] : [])

  // Construct valid post permalink URL
  const targetUrl = post?.permalink || (
    isIG 
      ? `https://instagram.com` 
      : (post?.id ? `https://facebook.com/${post.id}` : `https://facebook.com`)
  )

  const hasMedia = Boolean(post?.media_url || post?.thumbnail_url)

  return (
    <div id="info-panel" style={{ width: '320px', minWidth: '320px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* ── TOP HALF: EXACT POST VIEW (50%) ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted, #9ca3af)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className={isIG ? "fa-brands fa-instagram" : "fa-brands fa-facebook"} style={{ color: isIG ? '#e1306c' : '#1877f2', fontSize: 15 }} />
            {isIG ? 'Instagram Post' : 'Facebook Page Post'}
          </span>
          <a
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              background: isIG ? 'linear-gradient(45deg, #e1306c, #bc1888)' : '#1877f2',
              padding: '4px 10px',
              borderRadius: 6,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'opacity 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            Open <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10 }} />
          </a>
        </div>

        {/* Post native card container */}
        <div style={{ background: '#1e2024', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
          {/* Account DP header */}
          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: isIG ? 'linear-gradient(45deg, #f09433, #e1306c, #bc1888)' : '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
              {isIG ? <i className="fa-brands fa-instagram" /> : <i className="fa-brands fa-facebook-f" />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Your Brand Page</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Published Post</div>
            </div>
          </div>

          {/* Adaptive Media preview — only renders when media exists! */}
          {hasMedia && (
            <div style={{ background: '#000', maxHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img
                src={(post!.thumbnail_url || post!.media_url)!}
                alt="Post Media"
                style={{ width: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          )}

          {/* Metrics bar */}
          <div style={{ padding: '8px 12px', display: 'flex', gap: 16, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#d1d5db', fontSize: 13 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-heart" style={{ color: '#ef4444' }} /> {post?.like_count ?? '-'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-comment" style={{ color: '#3b82f6' }} /> {post?.comments_count ?? messages.length}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <i className="fa-solid fa-share-nodes" style={{ opacity: 0.7 }} />
            </span>
          </div>

          {/* Caption & Hashtags */}
          <div style={{ padding: '12px', fontSize: 13, color: '#e5e7eb', lineHeight: 1.5, maxHeight: 180, overflowY: 'auto', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
            {renderCaptionWithHashtags(post?.caption)}
          </div>
        </div>
      </div>

      {/* ── BOTTOM HALF: COMMENTER INFO & HISTORY (50%) ──────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted, #9ca3af)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-user-tag" style={{ color: 'var(--accent, #3b82f6)' }} />
          Commenter Profile & Details
        </span>

        {!selectedComment ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16, opacity: 0.6, gap: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 20 }}>
              <i className="fa-solid fa-hand-pointer" />
            </div>
            <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>
              Click on any comment in the middle panel to view commenter details, interaction stats, and past comments on this post.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Commenter profile card */}
            <div style={{ background: '#1e2024', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: getAvatarColor(selectedComment.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  {getInitials(commenterName || 'User')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {commenterName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{commenterId ? `@${commenterId}` : 'Public Social Account'}</span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#d1d5db' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10 }}>COMMENTS IN THREAD</span>
                  <strong>{userHistory.length} comment{userHistory.length !== 1 ? 's' : ''}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10 }}>LAST ACTIVE</span>
                  <strong>{formatMessageDate(selectedComment.created_at)}</strong>
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(commenterId || commenterName || '')
                  alert('Commenter info copied to clipboard!')
                }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <i className="fa-regular fa-copy" /> Copy Commenter Handle / ID
              </button>
            </div>

            {/* Commenter history list under this post */}
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                User&apos;s Comments on This Post ({userHistory.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                {userHistory.map((h) => (
                  <div key={h.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: 8, fontSize: 12, color: '#d1d5db' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>
                      {formatMessageDate(h.created_at)} {h.meta?.is_liked ? '• ❤️ Liked' : ''}
                    </div>
                    <div style={{ wordBreak: 'break-word' }}>{h.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
