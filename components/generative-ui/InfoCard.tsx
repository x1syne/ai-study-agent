'use client'

import { Info, AlertTriangle, CheckCircle, Lightbulb, BookOpen } from 'lucide-react'
import type { InfoData } from './types'

interface InfoCardProps {
  data: InfoData
}

export function InfoCard({ data }: InfoCardProps) {
  const getIconAndStyle = () => {
    switch (data.icon) {
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          iconColor: 'text-yellow-400',
          titleColor: 'text-yellow-300',
        }
      case 'success':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          iconColor: 'text-green-400',
          titleColor: 'text-green-300',
        }
      case 'tip':
        return {
          icon: <Lightbulb className="w-5 h-5" />,
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/30',
          iconColor: 'text-purple-400',
          titleColor: 'text-purple-300',
        }
      case 'example':
        return {
          icon: <BookOpen className="w-5 h-5" />,
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/30',
          iconColor: 'text-cyan-400',
          titleColor: 'text-cyan-300',
        }
      default:
        return {
          icon: <Info className="w-5 h-5" />,
          bg: 'bg-primary-500/10',
          border: 'border-primary-500/30',
          iconColor: 'text-primary-400',
          titleColor: 'text-primary-300',
        }
    }
  }

  const style = getIconAndStyle()

  return (
    <div className={`rounded-xl p-4 border ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${style.iconColor}`}>
          {style.icon}
        </div>
        <div>
          <h4 className={`font-medium mb-1 ${style.titleColor}`}>{data.title}</h4>
          <p className="text-sm text-slate-300">{data.content}</p>
        </div>
      </div>
    </div>
  )
}

