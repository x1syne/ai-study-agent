import { 
  SiPython, 
  SiJavascript, 
  SiReact, 
  SiMysql, 
  SiGit, 
  SiTypescript,
  SiNodedotjs,
  SiDjango,
  SiFlask,
  SiPostgresql,
  SiMongodb,
  SiDocker,
  SiKubernetes,
  SiAmazonaws,
  SiGooglecloud,
  SiMicrosoftazure,
  SiLinux,
  SiUbuntu,
  SiWindows,
  SiApple,
  SiAndroid,
  SiSwift,
  SiKotlin,
  SiJava,
  SiCplusplus,
  SiC,
  SiCsharp,
  SiPhp,
  SiRuby,
  SiGo,
  SiRust,
  SiHtml5,
  SiCss3,
  SiSass,
  SiTailwindcss,
  SiBootstrap,
  SiVuedotjs,
  SiAngular,
  SiNextdotjs,
  SiNuxtdotjs,
  SiRedux,
  SiGraphql,
  SiFirebase,
  SiSupabase,
  SiVercel,
  SiNetlify,
  SiGithub,
  SiGitlab,
  SiJenkins,
  SiWebpack,
  SiVite,
  SiEslint,
  SiPrettier,
  SiJest,
  SiCypress,
  SiPlaywright,
  SiStorybook,
  SiFigma,
  SiAdobephotoshop,
  SiAdobeillustrator,
  SiSketch,
  SiNotion,
  SiSlack,
  SiDiscord,
  SiTrello,
  SiJira,
  SiConfluence,
} from 'react-icons/si'
import { IconType } from 'react-icons'

// Маппинг названий технологий на иконки
const techIconMap: Record<string, IconType> = {
  // Языки программирования
  'python': SiPython,
  'javascript': SiJavascript,
  'typescript': SiTypescript,
  'java': SiJava,
  'c++': SiCplusplus,
  'cpp': SiCplusplus,
  'c': SiC,
  'c#': SiCsharp,
  'csharp': SiCsharp,
  'php': SiPhp,
  'ruby': SiRuby,
  'go': SiGo,
  'golang': SiGo,
  'rust': SiRust,
  'swift': SiSwift,
  'kotlin': SiKotlin,
  
  // Frontend
  'react': SiReact,
  'vue': SiVuedotjs,
  'angular': SiAngular,
  'next': SiNextdotjs,
  'nextjs': SiNextdotjs,
  'nuxt': SiNuxtdotjs,
  'html': SiHtml5,
  'html5': SiHtml5,
  'css': SiCss3,
  'css3': SiCss3,
  'sass': SiSass,
  'scss': SiSass,
  'tailwind': SiTailwindcss,
  'tailwindcss': SiTailwindcss,
  'bootstrap': SiBootstrap,
  'redux': SiRedux,
  
  // Backend
  'node': SiNodedotjs,
  'nodejs': SiNodedotjs,
  'django': SiDjango,
  'flask': SiFlask,
  'graphql': SiGraphql,
  
  // Базы данных
  'sql': SiMysql,
  'mysql': SiMysql,
  'postgresql': SiPostgresql,
  'postgres': SiPostgresql,
  'mongodb': SiMongodb,
  'mongo': SiMongodb,
  
  // DevOps
  'git': SiGit,
  'github': SiGithub,
  'gitlab': SiGitlab,
  'docker': SiDocker,
  'kubernetes': SiKubernetes,
  'k8s': SiKubernetes,
  'jenkins': SiJenkins,
  
  // Cloud
  'aws': SiAmazonaws,
  'gcp': SiGooglecloud,
  'azure': SiMicrosoftazure,
  'firebase': SiFirebase,
  'supabase': SiSupabase,
  'vercel': SiVercel,
  'netlify': SiNetlify,
  
  // OS
  'linux': SiLinux,
  'ubuntu': SiUbuntu,
  'windows': SiWindows,
  'macos': SiApple,
  'ios': SiApple,
  'android': SiAndroid,
  
  // Tools
  'webpack': SiWebpack,
  'vite': SiVite,
  'eslint': SiEslint,
  'prettier': SiPrettier,
  'jest': SiJest,
  'cypress': SiCypress,
  'playwright': SiPlaywright,
  'storybook': SiStorybook,
  
  // Design
  'figma': SiFigma,
  'photoshop': SiAdobephotoshop,
  'illustrator': SiAdobeillustrator,
  'sketch': SiSketch,
  
  // Collaboration
  'notion': SiNotion,
  'slack': SiSlack,
  'discord': SiDiscord,
  'trello': SiTrello,
  'jira': SiJira,
  'confluence': SiConfluence,
}

interface TechIconProps {
  name: string
  size?: number
  className?: string
  fallback?: React.ReactNode
}

/**
 * Компонент для отображения иконок технологий
 * Автоматически определяет иконку по названию технологии
 */
export function TechIcon({ name, size = 24, className = '', fallback }: TechIconProps) {
  // Нормализуем название (lowercase, убираем пробелы)
  const normalizedName = name.toLowerCase().trim().replace(/\s+/g, '')
  
  // Ищем иконку
  const IconComponent = techIconMap[normalizedName]
  
  // Если иконка найдена - показываем её
  if (IconComponent) {
    return <IconComponent size={size} className={className} />
  }
  
  // Если не найдена - показываем fallback или эмодзи
  if (fallback) {
    return <>{fallback}</>
  }
  
  // Дефолтный fallback - эмодзи книги
  return <span className={className}>📚</span>
}

/**
 * Проверяет, есть ли иконка для данной технологии
 */
export function hasTechIcon(name: string): boolean {
  const normalizedName = name.toLowerCase().trim().replace(/\s+/g, '')
  return normalizedName in techIconMap
}

/**
 * Получает список всех доступных технологий
 */
export function getAvailableTechs(): string[] {
  return Object.keys(techIconMap)
}
