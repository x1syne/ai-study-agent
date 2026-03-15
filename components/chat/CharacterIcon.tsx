'use client'

import { useState } from 'react'
import {
  IconRobot, IconBuildingBank, IconSchool, IconYinYang,
  IconPalette, IconBolt, IconSearch, IconUser
} from '@tabler/icons-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/Dialog'
import { AI_CHARACTERS } from '@/lib/ai/characters'

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
  const [isBioOpen, setIsBioOpen] = useState(false)
  const character = AI_CHARACTERS.find(c => c.id === characterId)

  const renderIcon = () => {
    if (characterId === 'ostroukh') {
      return (
        <img
          src="/avatars/ostroukh.jpg"
          alt="Проф. Остроух"
          width={size}
          height={size}
          className={`rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity ${className}`}
          style={{ width: size, height: size }}
          onClick={() => setIsBioOpen(true)}
        />
      )
    }

    const IconComponent = characterIcons[characterId] || IconRobot
    return (
      <div
        className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        onClick={() => setIsBioOpen(true)}
      >
        <IconComponent size={size} stroke={1.5} />
      </div>
    )
  }

  return (
    <>
      {renderIcon()}

      <Dialog open={isBioOpen} onOpenChange={setIsBioOpen}>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsBioOpen(false)}
          />
          <DialogContent className="max-w-md relative z-50">
            <DialogClose onClose={() => setIsBioOpen(false)} />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {characterId === 'ostroukh' ? (
                  <img
                    src="/avatars/ostroukh.jpg"
                    alt={character?.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${character?.color || 'from-slate-500 to-slate-700'}`}>
                    {characterIcons[characterId] ? (() => {
                      const Icon = characterIcons[characterId]
                      return <Icon size={24} className="text-white" stroke={1.5} />
                    })() : <IconRobot size={24} className="text-white" />}
                  </div>
                )}
                <div>
                  <div>{character?.name || 'AI Assistant'}</div>
                  <div className="text-sm font-normal text-slate-400">
                    {character?.personality?.era || 'AI'}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-2 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-1">Стиль обучения</h4>
                <p className="text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  {character?.style || 'Стандартный'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-1">Описание</h4>
                <p className="text-slate-400 text-sm italic">
                  "{character?.description || 'Помощник по учебе'}"
                </p>
              </div>

              {character?.personality?.coreMethod && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-1">Ключевой метод</h4>
                  <p className="text-slate-300 text-sm">
                    {character.personality.coreMethod}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </div>
      </Dialog>
    </>
  )
}
