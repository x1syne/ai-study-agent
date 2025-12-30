'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Target, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button, Progress, Badge } from '@/components/ui'
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph'
import { TopicDetails } from '@/components/graph/TopicDetails'
import { Certificate } from '@/components/gamification'
import { useAppStore } from '@/lib/store'
import { formatDate, formatMinutes, calculateProgress } from '@/lib/utils'
import type { Goal, Topic } from '@/types'

export default function GoalPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAppStore()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [showCertificate, setShowCertificate] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchGoal()
  }, [params.id])

  const fetchGoal = async () => {
    try {
      const res = await fetch(`/api/goals/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setGoal(data)
      } else {
        router.push('/goals')
      }
    } catch (error) {
      console.error('Error fetching goal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTopicClick = useCallback((topicId: string) => {
    if (!goal) return
    const topic = goal.topics.find(t => t.id === topicId)
    if (topic) {
      setSelectedTopic(topic)
    }
  }, [goal])

  const handleStartLesson = () => {
    if (selectedTopic) {
      router.push(`/learn/${selectedTopic.id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!goal) {
    return null
  }

  const completedTopics = goal.topics.filter(t => {
    const progress = Array.isArray(t.progress) ? t.progress[0] : t.progress
    return progress?.status === 'COMPLETED' || progress?.status === 'MASTERED'
  }).length
  const progress = calculateProgress(completedTopics, goal.topics.length)
  const totalTime = goal.topics.reduce((sum, t) => sum + t.estimatedMinutes, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/goals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{goal.title}</h1>
            <p className="text-slate-400 mt-1">{goal.skill}</p>
          </div>
        </div>
        <Badge variant={goal.status === 'ACTIVE' ? 'info' : 'success'}>
          {goal.status === 'ACTIVE' ? 'Активна' : 'Завершена'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{progress}%</div>
              <div className="text-sm text-slate-400">Прогресс</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {completedTopics}/{goal.topics.length}
              </div>
              <div className="text-sm text-slate-400">Тем</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{formatMinutes(totalTime)}</div>
              <div className="text-sm text-slate-400">Всего</div>
            </div>
          </CardContent>
        </Card>

        {goal.targetDate && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">
                  {formatDate(goal.targetDate)}
                </div>
                <div className="text-sm text-slate-400">Дедлайн</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Общий прогресс</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          <Progress value={progress} size="lg" />
          {progress === 100 && (
            <Button
              className="w-full mt-4"
              onClick={() => setShowCertificate(true)}
              leftIcon={<Award className="w-5 h-5" />}
            >
              🎉 Получить сертификат
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Certificate Modal */}
      {showCertificate && progress === 100 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            <Certificate
              userName={user?.name || 'Студент'}
              courseName={goal.title}
              completionDate={new Date().toLocaleDateString('ru-RU')}
              totalHours={Math.round(totalTime / 60)}
              onDownload={() => setShowCertificate(false)}
            />
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setShowCertificate(false)}
            >
              Закрыть
            </Button>
          </div>
        </div>
      )}

      {/* Knowledge Graph */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Граф знаний</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <KnowledgeGraph
                topics={goal.topics}
                onTopicClick={handleTopicClick}
                selectedTopicId={selectedTopic?.id}
              />
            </CardContent>
          </Card>
        </div>

        <div>
          {selectedTopic ? (
            <TopicDetails
              topic={selectedTopic}
              onClose={() => setSelectedTopic(null)}
              onStartLesson={handleStartLesson}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">
                  Кликни на тему в графе, чтобы увидеть детали
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Topics list */}
      <Card>
        <CardHeader>
          <CardTitle>Все темы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {goal.topics.map((topic) => {
              const progress = Array.isArray(topic.progress) ? topic.progress[0] : topic.progress
              const status = progress?.status || 'LOCKED'
              const mastery = progress?.masteryLevel || 0

              return (
                <div
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedTopic?.id === topic.id
                      ? 'bg-primary-500/20 border border-primary-500/30'
                      : 'bg-slate-800/50 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-2xl">{topic.icon || '📚'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{topic.name}</div>
                    <div className="text-sm text-slate-400">
                      {formatMinutes(topic.estimatedMinutes)} • {topic.difficulty}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <Progress value={mastery} size="sm" />
                    </div>
                    <Badge
                      variant={
                        status === 'COMPLETED' || status === 'MASTERED'
                          ? 'success'
                          : status === 'IN_PROGRESS'
                          ? 'warning'
                          : status === 'AVAILABLE'
                          ? 'info'
                          : 'default'
                      }
                      size="sm"
                    >
                      {mastery}%
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
