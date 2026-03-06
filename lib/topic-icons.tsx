// Маппинг категорий тем на Phosphor иконки
// AI выбирает категорию, мы показываем красивую иконку

import {
  Book,
  Code,
  Database,
  Globe,
  Atom,
  Brain,
  Calculator,
  ChartLine,
  Flask,
  Gear,
  Laptop,
  Palette,
  PencilSimple,
  Plugs,
  PuzzlePiece,
  Robot,
  Rocket,
  Shield,
  Sparkle,
  Stack,
  Tree,
  Wrench,
  type Icon,
} from '@phosphor-icons/react'

// Категории для тем
export type TopicCategory =
  | 'intro'
  | 'basics'
  | 'theory'
  | 'practice'
  | 'advanced'
  | 'code'
  | 'database'
  | 'web'
  | 'mobile'
  | 'ai'
  | 'ml'
  | 'math'
  | 'algorithms'
  | 'data-structures'
  | 'security'
  | 'design'
  | 'testing'
  | 'devops'
  | 'api'
  | 'architecture'
  | 'history'
  | 'language'
  | 'science'
  | 'art'
  | 'business'
  | 'default'

// Маппинг категорий на иконки
export const TOPIC_ICONS: Record<TopicCategory, Icon> = {
  // Общие
  intro: Book,
  basics: Sparkle,
  theory: Brain,
  practice: Wrench,
  advanced: Rocket,

  // Программирование
  code: Code,
  database: Database,
  web: Globe,
  mobile: Laptop,
  ai: Robot,
  ml: Brain,

  // Технические
  math: Calculator,
  algorithms: Code,
  'data-structures': Tree,
  security: Shield,

  // Разработка
  design: Palette,
  testing: Flask,
  devops: Gear,
  api: Plugs,
  architecture: Stack,

  // Гуманитарные
  history: Book,
  language: PencilSimple,
  science: Atom,
  art: Palette,
  business: ChartLine,

  // Дефолт
  default: PuzzlePiece,
}

// Определяем категорию по названию темы
export function getCategoryFromName(name: string): TopicCategory {
  const lowerName = name.toLowerCase()

  // Программирование
  if (
    /python|javascript|java|c\+\+|typescript|код|программ|синтаксис|переменн|функци|класс|ооп/i.test(
      lowerName
    )
  )
    return 'code'
  if (/sql|база данн|database|mongodb|postgres|mysql/i.test(lowerName)) return 'database'
  if (/html|css|react|vue|angular|web|сайт|фронтенд|frontend/i.test(lowerName)) return 'web'
  if (/android|ios|mobile|мобильн|flutter|react native/i.test(lowerName)) return 'mobile'
  if (/нейрон|ai|искусственн|gpt|llm|chatgpt/i.test(lowerName)) return 'ai'
  if (/машинн|ml|обучен|tensorflow|pytorch|модел/i.test(lowerName)) return 'ml'

  // Технические
  if (/математ|алгебр|геометр|статистик|вероятност/i.test(lowerName)) return 'math'
  if (/алгоритм|сортировк|поиск|рекурси|сложност/i.test(lowerName)) return 'algorithms'
  if (/структур|массив|список|дерев|граф|хеш|стек|очеред/i.test(lowerName))
    return 'data-structures'
  if (/безопасн|security|шифрован|криптограф|защит/i.test(lowerName)) return 'security'

  // Разработка
  if (/дизайн|ui|ux|интерфейс|figma/i.test(lowerName)) return 'design'
  if (/тест|test|qa|качеств/i.test(lowerName)) return 'testing'
  if (/devops|docker|kubernetes|ci|cd|deploy/i.test(lowerName)) return 'devops'
  if (/api|rest|graphql|endpoint/i.test(lowerName)) return 'api'
  if (/архитектур|паттерн|solid|clean/i.test(lowerName)) return 'architecture'

  // Гуманитарные
  if (/истори|история|древн|средневеков/i.test(lowerName)) return 'history'
  if (/язык|грамматик|лексик|english|английск/i.test(lowerName)) return 'language'
  if (/физик|химия|биолог|наук/i.test(lowerName)) return 'science'
  if (/искусств|музык|литератур|живопис/i.test(lowerName)) return 'art'
  if (/бизнес|маркетинг|менеджмент|экономик|финанс/i.test(lowerName)) return 'business'

  // Общие
  if (/введен|intro|начал|основ|знакомств/i.test(lowerName)) return 'intro'
  if (/базов|basic|простой|элементарн/i.test(lowerName)) return 'basics'
  if (/теори|концепц|принцип/i.test(lowerName)) return 'theory'
  if (/практик|упражнен|задач|проект/i.test(lowerName)) return 'practice'
  if (/продвинут|advanced|сложн|глубок/i.test(lowerName)) return 'advanced'

  return 'default'
}

// Получить иконку для темы
export function getTopicIcon(name: string): Icon {
  const category = getCategoryFromName(name)
  return TOPIC_ICONS[category]
}

// Экспорт для использования в компонентах
export { type Icon }
