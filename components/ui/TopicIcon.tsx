'use client'

import { 
  IconBook, IconTarget, IconCode, IconRocket, IconFlame, 
  IconChartBar, IconBulb, IconTrophy, IconCertificate,
  IconSchool, IconMath, IconAtom, IconLanguage, IconPalette,
  IconBriefcase, IconHeart, IconMusic, IconDeviceDesktop,
  IconDatabase, IconBrandReact, IconBrandPython, IconBrandJavascript,
  IconFileCode, IconGitBranch, IconTerminal, IconBrain,
  IconChartLine, IconUsers, IconSettings, IconStar
} from '@tabler/icons-react'

// Маппинг эмодзи на иконки Tabler
const emojiToIcon: Record<string, React.ComponentType<any>> = {
  '📚': IconBook,
  '📖': IconBook,
  '🎯': IconTarget,
  '💻': IconCode,
  '🚀': IconRocket,
  '🔥': IconFlame,
  '📊': IconChartBar,
  '💡': IconBulb,
  '🏆': IconTrophy,
  '🎓': IconCertificate,
  '🏫': IconSchool,
  '📐': IconMath,
  '🔬': IconAtom,
  '🌍': IconLanguage,
  '🎨': IconPalette,
  '💼': IconBriefcase,
  '❤️': IconHeart,
  '🎵': IconMusic,
  '🖥️': IconDeviceDesktop,
  '🗄️': IconDatabase,
  '⚛️': IconBrandReact,
  '🐍': IconBrandPython,
  '📜': IconBrandJavascript,
  '📄': IconFileCode,
  '🌿': IconGitBranch,
  '⌨️': IconTerminal,
  '🧠': IconBrain,
  '📈': IconChartLine,
  '👥': IconUsers,
  '⚙️': IconSettings,
  '⭐': IconStar,
  '✨': IconStar,
}

interface TopicIconProps {
  icon?: string
  size?: number
  className?: string
}

export function TopicIcon({ icon, size = 32, className = '' }: TopicIconProps) {
  console.log('TopicIcon render:', { icon, size, className })
  
  // Если иконка не передана, используем дефолтную
  if (!icon) {
    return <IconBook size={size} className={className} stroke={1.5} />
  }

  // Если это эмодзи, заменяем на иконку Tabler
  const IconComponent = emojiToIcon[icon]
  if (IconComponent) {
    console.log('Using Tabler icon for:', icon)
    return <IconComponent size={size} className={className} stroke={1.5} />
  }

  // Если не нашли маппинг, показываем эмодзи как есть
  console.log('Using emoji as-is:', icon)
  return <span className={className} style={{ fontSize: size }}>{icon}</span>
}
