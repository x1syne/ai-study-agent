/**
 * Объединённый скрипт для обработки ВСЕХ PDF статей
 * Создаёт чистый файл без undefined элементов
 */

const fs = require('fs')
const path = require('path')
const PDFParser = require('pdf2json')

const PDF_FOLDER = path.join(process.cwd(), 'остроух')

const PDF_FILES = [
  'analiz-vozmozhnostey-mivarnogo-podhoda-dlya-sistem-iskusstvennogo-intellekta-i-sovremennoy-robototehniki.pdf',
  'information-and-educational-system-of-students-training-and-staff-development-at-chemical-and-petrochemical-enterprises.pdf',
  'issledovanie-kompleksnyh-podhodov-k-tsifrovizatsii-transportnyh-sistem-s-primeneniem-metodov-iskusstvennogo-intellekta.pdf',
  'kremnievye-fotoelektronnye-umnozhiteli-kak-osnova-dlya-sozdaniya-kombinirovannyh-datchikov.pdf',
  'nauchnyy-podhod-k-razrabotke-avtomatizirovannoy-navigatsionnoy-sistemy-dispetcherskogo-kontrolya-i-ucheta-raboty-transporta-neftedobyvayuschih-i-neftepererabatyvayuschih-predpriyatiy.pdf',
  'printsipy-organizatsii-dinamicheskih-interfeysov-dostupa-k-dannym-s-ispolzovaniem-slovarey-spravochnikov-dannyh.pdf',
  'problemy-i-perspektivy-vnedreniya-komponentov-cals-tehnologii-na-promyshlennyh-predpriyatiyah.pdf',
  'razrabotka-elektronnyh-obrazovatelnyh-resursov-novogo-pokoleniya-po-distsipline-materialovedenie.pdf',
  'virtualnye-trenazhernye-kompleksy-dlya-obucheniya-i-treninga-personala-himicheskih-i-mashinostroitelnyh-proizvodstv.pdf'
]

const ARTICLE_METADATA = {
  'analiz-vozmozhnostey-mivarnogo-podhoda-dlya-sistem-iskusstvennogo-intellekta-i-sovremennoy-robototehniki.pdf': {
    title: 'Анализ возможностей миварного подхода для систем искусственного интеллекта и современной робототехники',
    keywords: ['миварный подход', 'искусственный интеллект', 'робототехника', 'интеллектуальные системы'],
    topics: ['ИИ', 'робототехника', 'миварные системы']
  },
  'information-and-educational-system-of-students-training-and-staff-development-at-chemical-and-petrochemical-enterprises.pdf': {
    title: 'Information and Educational System of Students Training and Staff Development at Chemical and Petrochemical Enterprises',
    keywords: ['educational system', 'training', 'chemical enterprises', 'petrochemical', 'staff development'],
    topics: ['образование', 'обучение', 'химическая промышленность']
  },
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
  'nauchnyy-podhod-k-razrabotke-avtomatizirovannoy-navigatsionnoy-sistemy-dispetcherskogo-kontrolya-i-ucheta-raboty-transporta-neftedobyvayuschih-i-neftepererabatyvayuschih-predpriyatiy.pdf': {
    title: 'Научный подход к разработке автоматизированной навигационной системы диспетчерского контроля и учета работы транспорта нефтедобывающих и нефтеперерабатывающих предприятий',
    keywords: ['навигационная система', 'диспетчерский контроль', 'транспорт', 'нефтедобыча', 'автоматизация'],
    topics: ['транспорт', 'нефтегаз', 'АСУ', 'навигация']
  },
  'printsipy-organizatsii-dinamicheskih-interfeysov-dostupa-k-dannym-s-ispolzovaniem-slovarey-spravochnikov-dannyh.pdf': {
    title: 'Принципы организации динамических интерфейсов доступа к данным с использованием словарей-справочников данных',
    keywords: ['интерфейсы', 'доступ к данным', 'словари данных', 'справочники', 'базы данных'],
    topics: ['базы данных', 'интерфейсы', 'информационные системы']
  },
  'problemy-i-perspektivy-vnedreniya-komponentov-cals-tehnologii-na-promyshlennyh-predpriyatiyah.pdf': {
    title: 'Проблемы и перспективы внедрения компонентов CALS-технологий на промышленных предприятиях',
    keywords: ['CALS-технологии', 'промышленные предприятия', 'автоматизация', 'информационные технологии'],
    topics: ['CALS', 'промышленность', 'автоматизация']
  },
  'razrabotka-elektronnyh-obrazovatelnyh-resursov-novogo-pokoleniya-po-distsipline-materialovedenie.pdf': {
    title: 'Разработка электронных образовательных ресурсов нового поколения по дисциплине материаловедение',
    keywords: ['электронные образовательные ресурсы', 'материаловедение', 'обучение', 'e-learning'],
    topics: ['образование', 'e-learning', 'материаловедение']
  },
  'virtualnye-trenazhernye-kompleksy-dlya-obucheniya-i-treninga-personala-himicheskih-i-mashinostroitelnyh-proizvodstv.pdf': {
    title: 'Виртуальные тренажерные комплексы для обучения и тренинга персонала химических и машиностроительных производств',
    keywords: ['виртуальные тренажеры', 'обучение персонала', 'химическое производство', 'машиностроение', 'симуляторы'],
    topics: ['обучение', 'виртуальные тренажеры', 'промышленность']
  }
}

function safeDecode(text) {
  try {
    return decodeURIComponent(text)
  } catch (e) {
    try {
      const cleaned = text.replace(/%(?![0-9A-Fa-f]{2})/g, ' ')
      return decodeURIComponent(cleaned)
    } catch (e2) {
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

async function processAllPDFs() {
  const results = []
  
  for (const filename of PDF_FILES) {
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

function generateTypeScriptFile(articles) {
  let output = `/**
 * PDF статьи профессора Остроуха - извлечённый текст
 * Автоматически сгенерировано из PDF файлов
 */

import { ScientificArticle } from './scientific-articles-rag'

export const PDF_ARTICLES: ScientificArticle[] = [\n`

  articles.forEach((article, index) => {
    const cleanText = article.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/`/g, "'")
      .replace(/\$/g, '\\$')
      .replace(/\\/g, '\\\\')
      .trim()
    
    const abstract = cleanText.slice(0, 500).replace(/\n/g, ' ').trim() + '...'
    
    output += `  {
    id: 'pdf-article-${index + 1}',
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
    
    if (index < articles.length - 1) {
      output += ',\n'
    } else {
      output += '\n'
    }
  })

  output += ']\n'
  return output
}

async function main() {
  console.log('🔍 Обработка ВСЕХ PDF статей профессора Остроуха...\n')
  
  if (!fs.existsSync(PDF_FOLDER)) {
    console.error(`❌ Папка не найдена: ${PDF_FOLDER}`)
    process.exit(1)
  }
  
  console.log(`📁 Папка с PDF: ${PDF_FOLDER}`)
  console.log(`📄 Файлов для обработки: ${PDF_FILES.length}`)
  
  const extractedArticles = await processAllPDFs()
  
  console.log(`\n✅ Успешно обработано: ${extractedArticles.length} из ${PDF_FILES.length} файлов`)
  
  if (extractedArticles.length === 0) {
    console.log('❌ Не удалось извлечь текст ни из одного файла')
    process.exit(1)
  }
  
  const outputPath = path.join(process.cwd(), 'lib', 'ai', 'pdf-articles-rag.ts')
  const tsContent = generateTypeScriptFile(extractedArticles)
  
  fs.writeFileSync(outputPath, tsContent, 'utf-8')
  
  console.log(`\n📝 Создан файл: ${outputPath}`)
  console.log(`\n🎉 Готово!`)
  
  const totalChars = extractedArticles.reduce((sum, a) => sum + a.text.length, 0)
  const totalPages = extractedArticles.reduce((sum, a) => sum + a.pages, 0)
  
  console.log(`\n📊 Итоговая статистика:`)
  console.log(`   Статей: ${extractedArticles.length}`)
  console.log(`   Символов: ${totalChars.toLocaleString()}`)
  console.log(`   Страниц: ${totalPages}`)
  console.log(`   Средний размер: ${Math.round(totalChars / extractedArticles.length).toLocaleString()} символов`)
}

main().catch(console.error)
