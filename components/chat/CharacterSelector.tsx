'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { AI_CHARACTERS, type AICharacter } from '@/lib/ai/characters'

interface CharacterSelectorProps {
  selectedId: string
  onSelect: (character: AICharacter) => void
}

export function CharacterSelector({ selectedId, onSelect }: CharacterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = AI_CHARACTERS.find(c => c.id === selectedId) || AI_CHARACTERS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl border border-slate-700/50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selected.color} flex items-center justify-center text-xl`}>
          {selected.icon}
        </div>
        <div className="text-left">
          <p className="font-medium text-white text-sm">{selected.name}</p>
          <p className="text-xs text-slate-400">{selected.style}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="p-3 border-b border-slate-700">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Выбери стиль обучения</p>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {AI_CHARACTERS.map((character) => (
                <button
                  key={character.id}
                  onClick={() => {
                    onSelect(character)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    character.id === selectedId 
                      ? 'bg-primary-500/20 border border-primary-500/30' 
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${character.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {character.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{character.name}</p>
                      {character.id === selectedId && (
                        <Check className="w-4 h-4 text-primary-400" />
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{character.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{character.style}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

