import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const skillTemplates = [
  {
    slug: 'python-basics',
    name: 'Python: Основы',
    description: 'Изучение основ программирования на Python',
    icon: '🐍',
    category: 'programming',
    topicsTemplate: [
      { slug: 'intro', name: 'Введение в Python', icon: '👋', difficulty: 'EASY', estimatedMinutes: 20, prerequisites: [], order: 1 },
      { slug: 'variables', name: 'Переменные и типы данных', icon: '📦', difficulty: 'EASY', estimatedMinutes: 30, prerequisites: ['intro'], order: 2 },
      { slug: 'operators', name: 'Операторы', icon: '➕', difficulty: 'EASY', estimatedMinutes: 25, prerequisites: ['variables'], order: 3 },
      { slug: 'strings', name: 'Строки', icon: '📝', difficulty: 'EASY', estimatedMinutes: 35, prerequisites: ['variables'], order: 4 },
      { slug: 'conditions', name: 'Условные операторы', icon: '🔀', difficulty: 'EASY', estimatedMinutes: 30, prerequisites: ['operators'], order: 5 },
      { slug: 'loops', name: 'Циклы', icon: '🔄', difficulty: 'MEDIUM', estimatedMinutes: 40, prerequisites: ['conditions'], order: 6 },
      { slug: 'lists', name: 'Списки', icon: '📋', difficulty: 'MEDIUM', estimatedMinutes: 45, prerequisites: ['loops'], order: 7 },
      { slug: 'dicts', name: 'Словари', icon: '🗂️', difficulty: 'MEDIUM', estimatedMinutes: 40, prerequisites: ['lists'], order: 8 },
      { slug: 'functions', name: 'Функции', icon: '⚙️', difficulty: 'MEDIUM', estimatedMinutes: 50, prerequisites: ['loops'], order: 9 },
      { slug: 'modules', name: 'Модули', icon: '📦', difficulty: 'MEDIUM', estimatedMinutes: 30, prerequisites: ['functions'], order: 10 },
      { slug: 'files', name: 'Работа с файлами', icon: '📁', difficulty: 'MEDIUM', estimatedMinutes: 35, prerequisites: ['functions'], order: 11 },
      { slug: 'exceptions', name: 'Исключения', icon: '⚠️', difficulty: 'MEDIUM', estimatedMinutes: 30, prerequisites: ['functions'], order: 12 },
    ],
    diagnosisQuestions: [
      { question: 'Что выведет print(type(42))?', options: ['<class \'int\'>', '<class \'str\'>', 'int', '42'], correctAnswer: 0, topicSlug: 'variables', difficulty: 'EASY' },
      { question: 'Как создать пустой список?', options: ['list()', '[]', 'Оба варианта верны', 'None'], correctAnswer: 2, topicSlug: 'lists', difficulty: 'EASY' },
      { question: 'Что делает оператор %?', options: ['Деление', 'Остаток от деления', 'Процент', 'Умножение'], correctAnswer: 1, topicSlug: 'operators', difficulty: 'EASY' },
    ],
  },
  {
    slug: 'javascript-basics',
    name: 'JavaScript: Основы',
    description: 'Изучение основ JavaScript для веб-разработки',
    icon: '⚡',
    category: 'programming',
    topicsTemplate: [
      { slug: 'intro', name: 'Введение в JavaScript', icon: '👋', difficulty: 'EASY', estimatedMinutes: 20, prerequisites: [], order: 1 },
      { slug: 'variables', name: 'Переменные (let, const, var)', icon: '📦', difficulty: 'EASY', estimatedMinutes: 30, prerequisites: ['intro'], order: 2 },
      { slug: 'types', name: 'Типы данных', icon: '🏷️', difficulty: 'EASY', estimatedMinutes: 35, prerequisites: ['variables'], order: 3 },
      { slug: 'operators', name: 'Операторы', icon: '➕', difficulty: 'EASY', estimatedMinutes: 25, prerequisites: ['types'], order: 4 },
      { slug: 'conditions', name: 'Условия (if, switch)', icon: '🔀', difficulty: 'EASY', estimatedMinutes: 30, prerequisites: ['operators'], order: 5 },
      { slug: 'loops', name: 'Циклы', icon: '🔄', difficulty: 'MEDIUM', estimatedMinutes: 35, prerequisites: ['conditions'], order: 6 },
      { slug: 'functions', name: 'Функции', icon: '⚙️', difficulty: 'MEDIUM', estimatedMinutes: 45, prerequisites: ['loops'], order: 7 },
      { slug: 'arrays', name: 'Массивы', icon: '📋', difficulty: 'MEDIUM', estimatedMinutes: 50, prerequisites: ['loops'], order: 8 },
      { slug: 'objects', name: 'Объекты', icon: '🗂️', difficulty: 'MEDIUM', estimatedMinutes: 45, prerequisites: ['arrays'], order: 9 },
      { slug: 'dom', name: 'DOM', icon: '🌐', difficulty: 'MEDIUM', estimatedMinutes: 60, prerequisites: ['objects'], order: 10 },
      { slug: 'events', name: 'События', icon: '🖱️', difficulty: 'MEDIUM', estimatedMinutes: 40, prerequisites: ['dom'], order: 11 },
      { slug: 'async', name: 'Асинхронность', icon: '⏳', difficulty: 'HARD', estimatedMinutes: 60, prerequisites: ['functions'], order: 12 },
    ],
    diagnosisQuestions: [
      { question: 'Чем отличается let от var?', options: ['Ничем', 'Область видимости', 'Скорость', 'Тип данных'], correctAnswer: 1, topicSlug: 'variables', difficulty: 'EASY' },
      { question: 'Что вернёт typeof null?', options: ['null', 'undefined', 'object', 'error'], correctAnswer: 2, topicSlug: 'types', difficulty: 'MEDIUM' },
    ],
  },
  {
    slug: 'react-basics',
    name: 'React: Основы',
    description: 'Изучение библиотеки React для создания UI',
    icon: '⚛️',
    category: 'frontend',
    topicsTemplate: [
      { slug: 'intro', name: 'Введение в React', icon: '👋', difficulty: 'EASY', estimatedMinutes: 25, prerequisites: [], order: 1 },
      { slug: 'jsx', name: 'JSX', icon: '📝', difficulty: 'EASY', estimatedMinutes: 30, prerequisites: ['intro'], order: 2 },
      { slug: 'components', name: 'Компоненты', icon: '🧩', difficulty: 'EASY', estimatedMinutes: 40, prerequisites: ['jsx'], order: 3 },
      { slug: 'props', name: 'Props', icon: '📦', difficulty: 'EASY', estimatedMinutes: 35, prerequisites: ['components'], order: 4 },
      { slug: 'state', name: 'State (useState)', icon: '🔄', difficulty: 'MEDIUM', estimatedMinutes: 45, prerequisites: ['props'], order: 5 },
      { slug: 'events', name: 'Обработка событий', icon: '🖱️', difficulty: 'MEDIUM', estimatedMinutes: 30, prerequisites: ['state'], order: 6 },
      { slug: 'lists', name: 'Списки и ключи', icon: '📋', difficulty: 'MEDIUM', estimatedMinutes: 35, prerequisites: ['events'], order: 7 },
      { slug: 'forms', name: 'Формы', icon: '📄', difficulty: 'MEDIUM', estimatedMinutes: 40, prerequisites: ['events'], order: 8 },
      { slug: 'useEffect', name: 'useEffect', icon: '⚡', difficulty: 'MEDIUM', estimatedMinutes: 50, prerequisites: ['state'], order: 9 },
      { slug: 'context', name: 'Context API', icon: '🌐', difficulty: 'HARD', estimatedMinutes: 45, prerequisites: ['useEffect'], order: 10 },
      { slug: 'hooks', name: 'Кастомные хуки', icon: '🪝', difficulty: 'HARD', estimatedMinutes: 50, prerequisites: ['useEffect'], order: 11 },
    ],
    diagnosisQuestions: [
      { question: 'Что такое JSX?', options: ['Язык программирования', 'Расширение синтаксиса JS', 'Фреймворк', 'База данных'], correctAnswer: 1, topicSlug: 'jsx', difficulty: 'EASY' },
      { question: 'Для чего нужен useState?', options: ['Роутинг', 'Управление состоянием', 'Стилизация', 'API запросы'], correctAnswer: 1, topicSlug: 'state', difficulty: 'EASY' },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding database...')

  for (const template of skillTemplates) {
    await prisma.skillTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        icon: template.icon,
        category: template.category,
        topicsTemplate: template.topicsTemplate,
        diagnosisQuestions: template.diagnosisQuestions,
      },
      create: {
        slug: template.slug,
        name: template.name,
        description: template.description,
        icon: template.icon,
        category: template.category,
        topicsTemplate: template.topicsTemplate,
        diagnosisQuestions: template.diagnosisQuestions,
      },
    })
    console.log(`  ✅ ${template.name}`)
  }

  console.log('✨ Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
