/**
 * Скрипт для обработки оставшихся PDF статей с ошибками декодирования
 * Использует более мягкую обработку ошибок URI
 */

const fs = require('fs')
const path = require('path')
const PDFParser = require('pdf2json')

const PDF_FOLDER = path.join(process.cwd(), 'остроух')

// Файлы, которые не удалось обработать в первый раз
const REMAINING_FILES = [
  'issledovanie-kompleksnyh-podhodov-k-tsifrovizatsii-transportnyh-sistem-s-primeneniem-metodov-iskusstvennogo-intellekta.pdf',
  'kremnievye-fotoelektronnye-umnozhiteli-kak-osnova-dlya-sozdaniya-kombinirovannyh-datchikov.pdf',
  'problemy-i-perspektivy-vnedreniya-komponentov-cals-tehnologii-na-promyshlennyh-predpriyatiyah.pdf'
]

const ARTICLE_METADATA = {
  'issledovanie-kompleksnyh-podhodov-k-tsifrovizatsii-transportnyh-sistem-s-primeneniem-metodov-iskusstvennogo-intellekta.pdf': {
    title: 'Исследование комплексных подходов к цифровизации транспортных систем с применением методов искусственного интеллекта',
    keywords: ['цифровизация', 'транспортные системы', 'искусственный интеллект', 'автоматизация транспорта'],
    topics: ['транспорт', 'цифровизация', 'ИИ']
  },
  'kremnievye-fotoelektronnye-umnozhiteli-kak-osnova-dlya-sozdaniya-kombinirovannyh-datchikov.pdf': {
    title: 'Кремниевые фотоэлектронные умножители как основа для создания комбинированных датчиков',
    keywords: ['фотоэлектронные умножители', 'датчики', 'сенсоры', 'измерительные системы'],
    topics: ['датчики', 'измерительные системы', 'электроника']
  },
  'problemy-i-perspektivy-vnedreniya-komponentov-cals-tehnologii-na-promyshlennyh-predpriyatiyah.pdf': {
    title: 'Проблемы и перспективы внедрения компонентов CALS-технологий на промышленных предприятиях',
    keywords: ['CALS-технологии', 'промышленные предприятия', 'автоматизация', 'информационные технологии'],
    topics: ['CALS', 'промышленность', 'автоматизация']
  }
}

// Безопасное декодирование с обработкой ошибок
function safeDecode(text) {
  try {
    return decodeURIComponent(text)
  } catch (e) {
    // Если не удалось декодировать, пробуем заменить проблемные символы
    try {
      // Заменяем % на пробел если это не валидный URI-encoded символ
      const cleaned = text.replace(/%(?![0-9A-Fa-f]{2})/g, ' ')
      return decodeURIComponent(cleaned)
    } catch (e2) {
      // Если всё равно не получилось, возвращаем как есть
      return text.replace(/%/g, ' ')
    }
  }
}

function extractTextFromPDF(pdfPath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()
    
    pdfParser.on('pdfParser_dataError', errData => {
      reject(new Error(errData.parserError))
    })
    
    pdfParser.on('pdfParser_dataReady', pdfData => {
      try {
        let text = ''
        let pages = 0
        
        if (pdfData.Pages) {
          pages = pdfData.Pages.length
          
          pdfData.Pages.forEach(page => {
            if (page.Texts) {
              page.Texts.forEach(textItem => {
                if (textItem.R) {
                  textItem.R.forEach(run => {
                    if (run.T) {
                      // Используем безопасное декодирование
                      text += safeDecode(run.T) + ' '
                    }
                  })
                }
              })
              text += '\n'
            }
          })
        }
        
        resolve({ text: text.trim(), pages })
      } catch (error) {
        reject(error)
      }
    })
    
    pdfParser.loadPDF(pdfPath)
  })
}

async function processRemainingPDFs() {
  const results = []
  
  for (const filename of REMAINING_FILES) {
    const pdfPath = path.join(PDF_FOLDER, filename)
    
    if (!fs.existsSync(pdfPath)) {
      console.log(`⚠️  Файл не найден: ${filename}`)
      continue
    }
    
    const metadata = ARTICLE_METADATA[filename]
    if (!metadata) {
      console.log(`⚠️  Нет метаданных для: ${filename}`)
      continue
    }
    
    console.log(`\n📄 Обрабатываю: ${metadata.title.slice(0, 80)}...`)
    
    try {
      const { text, pages } = await extractTextFromPDF(pdfPath)
      
      if (text.length < 100) {
        console.log(`   ⚠️  Извлечено слишком мало текста (${text.length} символов)`)
        continue
      }
      
      console.log(`   ✅ Извлечено ${text.length.toLocaleString()} символов, ${pages} страниц`)
      
      results.push({
        filename,
        title: metadata.title,
        keywords: metadata.keywords,
        topics: metadata.topics,
        text,
        pages
      })
    } catch (error) {
      console.error(`   ❌ Ошибка: ${error.message}`)
    }
  }
  
  return results
}

function appendToTypeScriptFile(articles, existingFilePath) {
  // Читаем существующий файл
  let content = fs.readFileSync(existingFilePath, 'utf-8')
  
  // Находим последнюю закрывающую скобку массива
  const lastBracketIndex = content.lastIndexOf(']')
  
  if (lastBracketIndex === -1) {
    console.error('❌ Не удалось найти массив в файле')
    return
  }
  
  // Генерируем новые статьи
  let newArticles = ''
  const startId = 7 // Начинаем с 7, так как уже есть 6 статей
  
  articles.forEach((article, index) => {
    const cleanText = article.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/`/g, "'")
      .replace(/\$/g, '\\$')
      .replace(/\\/g, '\\\\')
      .trim()
    
    const abstract = cleanText.slice(0, 500).replace(/\n/g, ' ').trim() + '...'
    
    newArticles += `,
  {
    id: 'pdf-article-${startId + index}',
    title: \`${article.title}\`,
    authors: ['Остроух А.В.'],
    year: 2015,
    journal: 'Научные труды',
    keywords: ${JSON.stringify(article.keywords)},
    topics: ${JSON.stringify(article.topics)},
    abstract: \`${abstract}\`,
    fullText: \`${cleanText}\`,
    source: 'pdf',
    url: ''
  }`
  })
  
  // Вставляем новые статьи перед закрывающей скобкой
  const updatedContent = content.slice(0, lastBracketIndex) + newArticles + '\n' + content.slice(lastBracketIndex)
  
  // Сохраняем обновлённый файл
  fs.writeFileSync(existingFilePath, updatedContent, 'utf-8')
}

async function main() {
  console.log('🔍 Обработка оставшихся PDF статей профессора Остроуха...\n')
  
  if (!fs.existsSync(PDF_FOLDER)) {
    console.error(`❌ Папка не найдена: ${PDF_FOLDER}`)
    process.exit(1)
  }
  
  console.log(`📁 Папка с PDF: ${PDF_FOLDER}`)
  console.log(`📄 Оставшихся файлов для обработки: ${REMAINING_FILES.length}`)
  
  const extractedArticles = await processRemainingPDFs()
  
  console.log(`\n✅ Успешно обработано: ${extractedArticles.length} из ${REMAINING_FILES.length} файлов`)
  
  if (extractedArticles.length === 0) {
    console.log('❌ Не удалось извлечь текст ни из одного файла')
    process.exit(1)
  }
  
  const outputPath = path.join(process.cwd(), 'lib', 'ai', 'pdf-articles-rag.ts')
  
  if (!fs.existsSync(outputPath)) {
    console.error(`❌ Файл не найден: ${outputPath}`)
    process.exit(1)
  }
  
  appendToTypeScriptFile(extractedArticles, outputPath)
  
  console.log(`\n📝 Обновлён файл: ${outputPath}`)
  console.log(`\n🎉 Готово! Добавлено ${extractedArticles.length} новых статей`)
  
  const totalChars = extractedArticles.reduce((sum, a) => sum + a.text.length, 0)
  const totalPages = extractedArticles.reduce((sum, a) => sum + a.pages, 0)
  
  console.log(`\n📊 Статистика новых статей:`)
  console.log(`   Статей: ${extractedArticles.length}`)
  console.log(`   Символов: ${totalChars.toLocaleString()}`)
  console.log(`   Страниц: ${totalPages}`)
  console.log(`   Средний размер: ${Math.round(totalChars / extractedArticles.length).toLocaleString()} символов`)
  
  console.log(`\n📚 Теперь в системе всего: 6 + ${extractedArticles.length} = ${6 + extractedArticles.length} PDF статей`)
}

main().catch(console.error)
