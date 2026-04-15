import type { Platform } from '@/types'

interface Props {
  platform: Platform
  size?: 'sm' | 'md'
}

const CONFIG: Record<Platform, { bg: string; icon: string }> = {
  whatsapp:  { bg: '#25d366', icon: 'fa-brands fa-whatsapp' },
  instagram: { bg: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', icon: 'fa-brands fa-instagram' },
  facebook:  { bg: '#1877f2', icon: 'fa-brands fa-facebook' },
}

export default function PlatformBadge({ platform, size = 'sm' }: Props) {
  const { bg, icon } = CONFIG[platform]
  const dim = size === 'sm' ? 16 : 20
  const iconSize = size === 'sm' ? 8 : 10

  return (
    <div
      style={{
        width: dim, height: dim, borderRadius: '50%',
        background: bg, border: '2px solid var(--bg-panel)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <i className={icon} style={{ fontSize: iconSize, color: '#fff' }} />
    </div>
  )
}

export function PlatformPill({ platform }: { platform: Platform }) {
  const cls = { whatsapp: 'pp-wa', instagram: 'pp-ig', facebook: 'pp-fb' }[platform]
  const icon = { whatsapp: 'fa-brands fa-whatsapp', instagram: 'fa-brands fa-instagram', facebook: 'fa-brands fa-facebook' }[platform]
  const label = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook' }[platform]
  return (
    <span className={`platform-pill-sm ${cls}`}>
      <i className={icon} /> {label}
    </span>
  )
}