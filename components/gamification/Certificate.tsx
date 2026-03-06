'use client'

import { Download, Award } from 'lucide-react'
import { Button } from '@/components/ui'

interface CertificateProps {
  userName: string
  courseName: string
  completionDate: string
  totalHours: number
  onDownload?: () => void
}

export function Certificate({ userName, courseName, completionDate, totalHours, onDownload }: CertificateProps) {
  const handleDownload = () => {
    // Generate certificate as image/PDF
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 800
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 1200, 800)
    gradient.addColorStop(0, '#1e293b')
    gradient.addColorStop(1, '#0f172a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1200, 800)

    // Border
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 4
    ctx.strokeRect(40, 40, 1120, 720)

    // Inner border
    ctx.strokeStyle = '#fbbf2440'
    ctx.lineWidth = 2
    ctx.strokeRect(60, 60, 1080, 680)

    // Title
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('СЕРТИФИКАТ', 600, 150)

    // Subtitle
    ctx.fillStyle = '#94a3b8'
    ctx.font = '24px Arial'
    ctx.fillText('об успешном завершении курса', 600, 200)

    // User name
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 42px Arial'
    ctx.fillText(userName, 600, 320)

    // Course name
    ctx.fillStyle = '#fbbf24'
    ctx.font = '32px Arial'
    ctx.fillText(`"${courseName}"`, 600, 400)

    // Details
    ctx.fillStyle = '#94a3b8'
    ctx.font = '20px Arial'
    ctx.fillText(`Дата завершения: ${completionDate}`, 600, 500)
    ctx.fillText(`Общее время обучения: ${totalHours} часов`, 600, 540)

    // Award icon (simple star)
    ctx.fillStyle = '#fbbf24'
    ctx.font = '80px Arial'
    ctx.fillText('🏆', 560, 680)

    // Platform name
    ctx.fillStyle = '#64748b'
    ctx.font = '16px Arial'
    ctx.fillText('AI Study Agent - Персональный AI-репетитор', 600, 740)

    // Download
    const link = document.createElement('a')
    link.download = `certificate-${courseName.replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    onDownload?.()
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border-2 border-yellow-500/30">
      <div className="text-center">
        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-10 h-10 text-yellow-400" />
        </div>
        <h3 className="text-2xl font-bold text-yellow-400 mb-2">Сертификат готов!</h3>
        <p className="text-slate-400 mb-6">
          Поздравляем с завершением курса "{courseName}"
        </p>

        {/* Preview */}
        <div className="bg-slate-900/50 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="text-sm text-slate-500 mb-2">Предпросмотр</div>
          <div className="text-xl font-bold text-white mb-1">{userName}</div>
          <div className="text-yellow-400">{courseName}</div>
          <div className="text-sm text-slate-400 mt-2">
            {completionDate} • {totalHours} часов
          </div>
        </div>

        <Button onClick={handleDownload} leftIcon={<Download className="w-5 h-5" />}>
          Скачать сертификат
        </Button>
      </div>
    </div>
  )
}

// Mini certificate badge for profile
export function CertificateBadge({ courseName, date }: { courseName: string; date: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-yellow-500/20">
      <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
        <Award className="w-5 h-5 text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{courseName}</div>
        <div className="text-xs text-slate-400">{date}</div>
      </div>
    </div>
  )
}

