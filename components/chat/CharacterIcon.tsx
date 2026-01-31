'use client'

import { 
  IconRobot, IconBuildingBank, IconSchool, IconYinYang,
  IconPalette, IconBolt, IconSearch, IconUser
} from '@tabler/icons-react'

// Маппинг ID персонажа на иконку Tabler
const characterIcons: Record<string, React.ComponentType<any>> = {
  'default': IconRobot,
  'socrates': IconBuildingBank,
  'feynman': IconSchool,
  'yoda': IconYinYang,
  'dali': IconPalette,
  'newton': IconBolt,
  'sherlock': IconSearch,
  'ostroukh': IconUser,
}

interface CharacterIconProps {
  characterId: string
  size?: number
  className?: string
}

export function CharacterIcon({ characterId, size = 24, className = '' }: CharacterIconProps) {
  const IconComponent = characterIcons[characterId] || IconRobot
  
  return <IconComponent size={size} className={className} stroke={1.5} />
}
