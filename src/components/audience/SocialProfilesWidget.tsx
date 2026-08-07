'use client'
import React, { useState } from 'react'
import { Link2, Edit2, Check, X, Share2, Globe, Users } from 'lucide-react'
import { Contact } from '@/types'

export function SocialProfilesWidget({ contact, onUpdate }: { contact: Contact, onUpdate: (data: any) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [profiles, setProfiles] = useState({
    linkedin: (contact as any).social_profiles?.linkedin || '',
    twitter: (contact as any).social_profiles?.twitter || '',
    facebook: (contact as any).social_profiles?.facebook || ''
  })

  const handleSave = () => {
    onUpdate({
      linkedin: profiles.linkedin,
      twitter: profiles.twitter,
      facebook: profiles.facebook
    })
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-border">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-white tracking-wide">SOCIAL PROFILES</h3>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="text-primary-400 text-xs font-medium hover:text-primary-300 transition-colors">Edit</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} className="text-green-400 text-xs font-medium"><Check className="w-4 h-4"/></button>
            <button onClick={() => setIsEditing(false)} className="text-text-muted text-xs font-medium"><X className="w-4 h-4"/></button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-surface p-2 rounded border border-border">
            <Users className="w-4 h-4 text-blue-500 shrink-0" />
            <input type="url" value={profiles.linkedin} onChange={e => setProfiles({...profiles, linkedin: e.target.value})} placeholder="LinkedIn URL" className="bg-transparent border-none text-xs text-white w-full focus:outline-none" />
          </div>
          <div className="flex items-center gap-2 bg-surface p-2 rounded border border-border">
            <Share2 className="w-4 h-4 text-sky-400 shrink-0" />
            <input type="url" value={profiles.twitter} onChange={e => setProfiles({...profiles, twitter: e.target.value})} placeholder="Twitter URL" className="bg-transparent border-none text-xs text-white w-full focus:outline-none" />
          </div>
          <div className="flex items-center gap-2 bg-surface p-2 rounded border border-border">
            <Globe className="w-4 h-4 text-blue-600 shrink-0" />
            <input type="url" value={profiles.facebook} onChange={e => setProfiles({...profiles, facebook: e.target.value})} placeholder="Facebook URL" className="bg-transparent border-none text-xs text-white w-full focus:outline-none" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {profiles.linkedin ? (
            <a href={profiles.linkedin} target="_blank" rel="noreferrer" className="p-2 bg-surface rounded-full hover:bg-white/10 transition-colors" title="LinkedIn">
              <Users className="w-5 h-5 text-blue-500" />
            </a>
          ) : (
            <div className="p-2 bg-surface rounded-full opacity-30" title="No LinkedIn"><Users className="w-5 h-5" /></div>
          )}
          
          {profiles.twitter ? (
            <a href={profiles.twitter} target="_blank" rel="noreferrer" className="p-2 bg-surface rounded-full hover:bg-white/10 transition-colors" title="Twitter">
              <Share2 className="w-5 h-5 text-sky-400" />
            </a>
          ) : (
            <div className="p-2 bg-surface rounded-full opacity-30" title="No Twitter"><Share2 className="w-5 h-5" /></div>
          )}

          {profiles.facebook ? (
            <a href={profiles.facebook} target="_blank" rel="noreferrer" className="p-2 bg-surface rounded-full hover:bg-white/10 transition-colors" title="Facebook">
              <Globe className="w-5 h-5 text-blue-600" />
            </a>
          ) : (
            <div className="p-2 bg-surface rounded-full opacity-30" title="No Facebook"><Globe className="w-5 h-5" /></div>
          )}
        </div>
      )}
    </div>
  )
}
