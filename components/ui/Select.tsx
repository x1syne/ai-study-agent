/**
 * Select Component
 * Simple select/dropdown component for UI
 */

'use client'

import { ReactNode, useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
}

interface SelectTriggerProps {
  children: ReactNode
  className?: string
}

interface SelectContentProps {
  children: ReactNode
  className?: string
}

interface SelectItemProps {
  value: string
  children: ReactNode
  className?: string
}

interface SelectValueProps {
  placeholder?: string
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={selectRef} className="relative">
      <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
        {children}
      </SelectContext.Provider>
    </div>
  )
}

const SelectContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
} | null>(null)

import React from 'react'

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within Select')
  }
  return context
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  const { isOpen, setIsOpen } = useSelectContext()

  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={`flex items-center justify-between w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors ${className}`}
    >
      {children}
      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext()
  return <span>{value || placeholder}</span>
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  const { isOpen } = useSelectContext()

  if (!isOpen) return null

  return (
    <div className={`absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export function SelectItem({ value, children, className = '' }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setIsOpen } = useSelectContext()
  const isSelected = value === selectedValue

  return (
    <button
      type="button"
      onClick={() => {
        onValueChange(value)
        setIsOpen(false)
      }}
      className={`w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors flex items-center justify-between ${
        isSelected ? 'bg-slate-700 text-white' : 'text-slate-300'
      } ${className}`}
    >
      {children}
      {isSelected && <Check className="w-4 h-4" />}
    </button>
  )
}
