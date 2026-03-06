# 🚀 Деплой Supabase Edge Function для Groq API

Эта функция позволит работать с Groq API из России без VPN.

## Вариант 1: Через Scoop (рекомендуется для Windows)

### Шаг 1: Установите Scoop
Откройте PowerShell и выполните:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### Шаг 2: Установите Supabase CLI
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Шаг 3: Войдите в Supabase
```bash
supabase login
```

### Шаг 4: Свяжите проект
```bash
supabase link --project-ref jhwgewkxhkzpsbonuiex
```

### Шаг 5: Добавьте секрет
```bash
supabase secrets set GROQ_API_KEY=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
```

### Шаг 6: Задеплойте функции
```bash
supabase functions deploy ai-proxy
supabase functions deploy ai-proxy-stream
```

## Вариант 2: Через npx (без установки)

### Шаг 1: Войдите в Supabase
```bash
npx supabase login
```

### Шаг 2: Свяжите проект
```bash
npx supabase link --project-ref jhwgewkxhkzpsbonuiex
```

### Шаг 3: Добавьте секрет
```bash
npx supabase secrets set GROQ_API_KEY=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
```

### Шаг 4: Задеплойте функции
```bash
npx supabase functions deploy ai-proxy
npx supabase functions deploy ai-proxy-stream
```

## Шаг 6: Уберите USE_DIRECT_GROQ из .env

Закомментируйте или удалите строку:
```
# USE_DIRECT_GROQ=true
```

## Шаг 7: Перезапустите сервер

```bash
npm run dev
```

## Готово! 🎉

Теперь Groq API будет работать через Supabase сервер в Европе без VPN!

---

## Проверка работы

После деплоя проверьте в логах сервера:
```
[Groq] Trying proxy...
[Groq] Proxy success: XXX chars
```

Если видите эти логи - всё работает!
