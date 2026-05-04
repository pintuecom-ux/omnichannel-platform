import React from 'react'

export const EMOJI_GROUPS: Record<string, string[]> = {
  '😀': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤔','🤐','😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','😵','🤯','😎','🤓','😕','😟','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','😤','😡','😠','🤬','😈','👿'],
  '👋': ['👋','🤚','🖐','✋','🖖','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','👏','🙌','🤝','🙏','💪','🫀','👀','👅','👄','🧠','💅','🤳'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','⭐','🌟','💫','✨','🎯','🏆','🥇','💯','🎉','🎊','🎁','🎈'],
  '🍕': ['🍕','🍔','🌮','🌯','🥙','🍜','🍝','🍛','🍲','🍱','🍣','🥟','🦞','🦀','🍗','🍖','🌭','🥪','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🧋','🍺','🍻','🥂','🍷','🥃','🍸','🍹'],
  '🚗': ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🛻','🚚','🚛','🏍','🛵','🚲','✈️','🚀','🛸','🚂','🚄','🚆'],
  '💡': ['💡','📱','💻','⌨️','🖥','📷','📸','📹','🎥','📺','📻','🎙','🔋','🔌','💊','🩺','🔬','🔭','🧬','🧪','🔑','🗝','🔐','🔒','🔓','🔨','🛡','💰','💳','💎','📡'],
  '✅': ['✅','❌','✔️','💯','⭐','🎯','🏆','🥇','🎖','🎗','🎫','🎟','🎲','🎮','🕹','🎰','🧩','🪀','🎳','🎱','🎲','🎯','🔥','💥','🌈','☀️','🌙','⚡','🌊','🌺','🌸','🍀','🌿'],
}

export function InputEmojiPicker({
  emojiGroup,
  setEmojiGroup,
  onEmojiSelect,
}: {
  emojiGroup: string
  setEmojiGroup: (v: string) => void
  onEmojiSelect: (emoji: string) => void
}) {
  return (
    <div id="emoji-picker"
      style={{ position: 'absolute', bottom: '100%', left: 0, width: 300, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', zIndex: 200 }}>
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', padding: '4px 6px', gap: 2 }}>
        {Object.keys(EMOJI_GROUPS).map(g => (
          <button key={g} onClick={() => setEmojiGroup(g)}
            style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 16, background: emojiGroup === g ? 'var(--bg-active)' : 'none', fontFamily: 'inherit' }}>
            {g}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '8px', maxHeight: 200, overflowY: 'auto' }}>
        {EMOJI_GROUPS[emojiGroup]?.map(emoji => (
          <button key={emoji} onClick={() => onEmojiSelect(emoji)}
            style={{ fontSize: 22, padding: '3px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none', lineHeight: 1, fontFamily: 'inherit' }}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
