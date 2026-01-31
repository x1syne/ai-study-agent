# Chrome DevTools MCP Server

MCP сервер для работы с Chrome DevTools из Kiro AI.

## Что это даёт?

- Инспектирование элементов страницы
- Выполнение JavaScript в консоли браузера
- Анализ сетевых запросов
- Отладка CSS и DOM
- Профилирование производительности

## Установка

### Автоматическая (уже настроено)

Конфигурация уже добавлена в `.kiro/settings/mcp.json`

### Ручная настройка

1. Откройте командную палитру: `Ctrl+Shift+P`
2. Найдите: **"MCP: Reconnect Servers"**
3. Сервер автоматически установится при первом использовании

## Использование

### 1. Запустите Chrome с удалённой отладкой

**Windows:**
```powershell
# Закройте все окна Chrome
# Запустите с флагом remote-debugging
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**Или создайте ярлык:**
1. Правой кнопкой на ярлык Chrome → **Свойства**
2. В поле **"Объект"** добавьте в конец: `--remote-debugging-port=9222`
3. Пример: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222`

### 2. Используйте в Kiro

Теперь в чате с Kiro можете попросить:

```
Проинспектируй элемент с классом .btn-primary на странице localhost:3000
```

```
Выполни в консоли браузера: console.log(document.title)
```

```
Покажи все сетевые запросы на странице
```

## Доступные команды

MCP сервер предоставляет инструменты для:

- `inspect_element` - инспектирование DOM элементов
- `execute_script` - выполнение JavaScript
- `get_network_logs` - получение сетевых логов
- `get_console_logs` - получение логов консоли
- `take_screenshot` - создание скриншота
- `get_performance_metrics` - метрики производительности

## Примеры использования

### Отладка вашего проекта ai-study-agent

1. Запустите проект: `npm run dev`
2. Откройте в Chrome с remote debugging: `http://localhost:3000`
3. В Kiro попросите:

```
Проверь, какие ошибки в консоли на странице /learn/[topicId]
```

```
Покажи все API запросы к /api/topics/
```

```
Найди элемент с классом .theory-content и покажи его стили
```

## Отключение

Если не нужен, отключите в `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "disabled": true
    }
  }
}
```

## Troubleshooting

### Chrome не подключается

1. Убедитесь что Chrome запущен с флагом `--remote-debugging-port=9222`
2. Проверьте что порт 9222 не занят: `netstat -ano | findstr :9222`
3. Откройте в браузере: `http://localhost:9222/json` - должен показать список вкладок

### MCP сервер не запускается

1. Проверьте что Node.js установлен: `node --version`
2. Переподключите сервер: `Ctrl+Shift+P` → **"MCP: Reconnect Servers"**
3. Посмотрите логи в панели MCP в Kiro

## Полезные ссылки

- [GitHub репозиторий](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Документация MCP](https://modelcontextprotocol.io/)
