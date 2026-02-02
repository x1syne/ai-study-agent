# Design Document: UI/UX 2026 Modernization

## Overview

Этот документ описывает архитектуру и дизайн системы UI/UX модернизации для AI Study Agent. Цель - трансформировать приложение из функциональной панели управления в премиальный продукт уровня 2026 года с эстетикой "Apple meets Cyberpunk".

### Design Principles

1. **Visual Depth Over Flatness** - Многоуровневая система с glassmorphism, shadows, gradients
2. **Fluid Over Fixed** - Плавные переходы, адаптивность, отсутствие резких скачков
3. **Generative Over Static** - Динамические компоненты, морфинг, streaming UI
4. **Performance First** - GPU-accelerated анимации, lazy loading, оптимизация
5. **Accessible By Default** - Поддержка prefers-reduced-motion, keyboard navigation, ARIA

### Technology Stack

- **CSS**: Modern CSS (Container Queries, View Transitions, @property, :has())
- **Animations**: CSS Animations + Framer Motion для сложных случаев
- **Typography**: Fluid Typography с clamp()
- **Colors**: CSS color-mix() для динамических оттенков
- **Performance**: GPU-accelerated properties (transform, opacity)

---

## Architecture

### Component Hierarchy

```
App
├── CSS 2026 Core System (globals.css)
│   ├── Design Tokens
│   ├── Glassmorphism Utilities
│   ├── Animation Primitives
│   └── Fluid Typography
│
├── Enhanced UI Components
│   ├── Card (Glassmorphism 2.0)
│   ├── Button (Micro-interactions)
│   ├── Progress (Animated)
│   └── Input (Focus states)
│
├── Page-Specific Components
│   ├── Dashboard
│   │   ├── HeroCard (Animated gradient border)
│   │   ├── StatsGrid (Count-up animation)
│   │   └── CourseCard (Stagger animation)
│   │
│   ├── Graph
│   │   ├── NeuralNode (SVG glow filters)
│   │   └── AnimatedEdge (Particle trails)
│   │
│   ├── Chat
│   │   ├── GenerativeUI Components
│   │   ├── StreamingMessage (Stagger)
│   │   └── QuickPrompts (Hover effects)
│   │
│   └── Review
│       └── FlashCard3D (Preserve-3d flip)
│
└── Animation System
    ├── View Transitions
    ├── Scroll Animations
    ├── Stagger Utilities
    └── Reduced Motion Handler
```

---

## Components and Interfaces

### 1. CSS 2026 Core System

Базовая система стилей, которая будет добавлена в `globals.css`.

#### Design Tokens


```css
:root {
  /* === Multi-layer Background System === */
  --bg-deep: #0a0a12;           /* Deepest layer */
  --bg-background: #10101a;      /* Main background */
  --bg-surface: #151520;         /* Elevated surface */
  --bg-overlay: #1a1a26;         /* Top overlay */
  
  /* === Glassmorphism === */
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: 16px;
  --glass-saturate: 180%;
  
  /* === Primary Colors with Variants === */
  --primary-50: #ecfeff;
  --primary-500: #06b6d4;
  --primary-600: #0891b2;
  --primary-glow: rgba(6, 182, 212, 0.5);
  
  /* === Shadows & Elevation === */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
  --shadow-glow: 0 0 20px var(--primary-glow);
  
  /* === Animation Timings === */
  --duration-fast: 0.15s;
  --duration-normal: 0.3s;
  --duration-slow: 0.6s;
  --easing-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  
  /* === Fluid Typography === */
  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
  --text-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1.3rem + 1vw, 2rem);
  --text-3xl: clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem);
  --text-4xl: clamp(2.25rem, 1.8rem + 2.25vw, 3rem);
}
```

#### Glassmorphism 2.0 Utilities

```css
/* === Base Glassmorphism === */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
}

.glass-subtle {
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-blur: 12px;
}

.glass-medium {
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-blur: 16px;
}

.glass-intense {
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-blur: 20px;
}

/* === Glassmorphism with Glow === */
.glass-glow {
  box-shadow: 
    0 0 20px var(--primary-glow),
    inset 0 0 20px rgba(255, 255, 255, 0.05);
}

.glass-glow-hover:hover {
  box-shadow: 
    0 0 30px var(--primary-glow),
    0 0 60px rgba(6, 182, 212, 0.3),
    inset 0 0 30px rgba(255, 255, 255, 0.08);
}
```

#### Animated Gradient Borders

```css
/* === CSS @property for smooth gradient animation === */
@property --gradient-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.animated-border {
  position: relative;
  border-radius: 1.5rem;
  overflow: hidden;
}

.animated-border::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  padding: 2px;
  background: linear-gradient(
    var(--gradient-angle),
    var(--primary-500),
    var(--primary-600),
    var(--primary-500)
  );
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: rotate-gradient 3s linear infinite;
}

@keyframes rotate-gradient {
  to {
    --gradient-angle: 360deg;
  }
}
```

#### Fluid Typography System

```css
/* === Fluid Headings === */
.text-fluid-xs { font-size: var(--text-xs); }
.text-fluid-sm { font-size: var(--text-sm); }
.text-fluid-base { font-size: var(--text-base); }
.text-fluid-lg { font-size: var(--text-lg); }
.text-fluid-xl { font-size: var(--text-xl); }
.text-fluid-2xl { font-size: var(--text-2xl); }
.text-fluid-3xl { font-size: var(--text-3xl); }
.text-fluid-4xl { font-size: var(--text-4xl); }

/* === Container-Relative Typography === */
@container (min-width: 400px) {
  .text-container-lg {
    font-size: clamp(1rem, 3cqw, 1.5rem);
  }
}
```

#### Animation Primitives

```css
/* === Stagger Animation === */
.stagger-children > * {
  opacity: 0;
  animation: fade-in-up var(--duration-normal) var(--easing-smooth) forwards;
}

.stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
.stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
.stagger-children > *:nth-child(4) { animation-delay: 0.2s; }
.stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
.stagger-children > *:nth-child(6) { animation-delay: 0.3s; }

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* === Scale Bounce === */
@keyframes scale-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* === Shimmer Loading === */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

/* === Pulse Glow === */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px var(--primary-glow);
  }
  50% {
    box-shadow: 0 0 40px var(--primary-glow), 0 0 60px rgba(6, 182, 212, 0.3);
  }
}

/* === Count Up (for numbers) === */
@keyframes count-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

#### Reduced Motion Support

```css
/* === Disable animations for users with motion sensitivity === */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01s !important;
  }
  
  /* Keep functional transitions */
  *:focus-visible {
    transition-duration: 0.15s !important;
  }
}
```

---

### 2. Enhanced Card Component

Модернизированный компонент Card с Glassmorphism 2.0.

#### Interface

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass-subtle' | 'glass-medium' | 'glass-intense'
  glow?: boolean
  animatedBorder?: boolean
  hover?: boolean
  containerQuery?: boolean
}
```

#### Implementation

```tsx
// components/ui/Card.tsx
'use client'

import { cn } from '@/lib/utils'

export function Card({ 
  className, 
  variant = 'glass-medium',
  glow = false,
  animatedBorder = false,
  hover = true,
  containerQuery = true,
  children,
  ...props 
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl p-6 transition-all duration-300',
        'glass',
        variant,
        glow && 'glass-glow',
        hover && 'glass-glow-hover cursor-pointer',
        animatedBorder && 'animated-border',
        containerQuery && 'container',
        className
      )}
      style={{
        containerType: containerQuery ? 'inline-size' : undefined
      }}
      {...props}
    >
      {children}
    </div>
  )
}
```

#### Usage Examples

```tsx
// Subtle glass card
<Card variant="glass-subtle">
  <CardContent>Basic content</CardContent>
</Card>

// Primary action card with animated border
<Card 
  variant="glass-intense" 
  glow 
  animatedBorder
>
  <CardContent>Next Task</CardContent>
</Card>

// Hover-enabled course card
<Card hover containerQuery>
  <CourseCardContent />
</Card>
```

---

### 3. Enhanced Button Component

Кнопка с микроанимациями и ripple эффектом.

#### Interface

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  ripple?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}
```

#### Implementation

```tsx
// components/ui/Button.tsx
'use client'

import { forwardRef, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading, 
    ripple = true,
    leftIcon,
    rightIcon,
    children, 
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])
    const buttonRef = useRef<HTMLButtonElement>(null)

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const id = Date.now()
        
        setRipples(prev => [...prev, { x, y, id }])
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id))
        }, 600)
      }
      
      onClick?.(e)
    }

    const variants = {
      primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700',
      secondary: 'glass glass-medium text-white hover:glass-intense',
      ghost: 'text-slate-300 hover:text-white hover:bg-white/5',
      danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    }

    return (
      <button
        ref={buttonRef}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 font-medium rounded-xl',
          'transition-all duration-300 overflow-hidden',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
          'active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple effect */}
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute w-4 h-4 bg-white/30 rounded-full animate-ping"
            style={{
              left: ripple.x - 8,
              top: ripple.y - 8,
            }}
          />
        ))}
        
        {/* Content */}
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
```

---

### 4. Animated Progress Component

Прогресс-бар с count-up анимацией и glow эффектом.

#### Interface

```typescript
interface ProgressProps {
  value: number // 0-100
  showLabel?: boolean
  animated?: boolean
  glow?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning' | 'danger'
}
```

#### Implementation

```tsx
// components/ui/Progress.tsx
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function Progress({
  value,
  showLabel = true,
  animated = true,
  glow = true,
  size = 'md',
  color = 'primary'
}: ProgressProps) {
  const [displayValue, setDisplayValue] = useState(0)
  
  // Count-up animation
  useEffect(() => {
    if (!animated) {
      setDisplayValue(value)
      return
    }
    
    const duration = 1000
    const steps = 60
    const increment = value / steps
    let current = 0
    
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)
    
    return () => clearInterval(timer)
  }, [value, animated])
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }
  
  const colors = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-green-500 to-emerald-600',
    warning: 'from-orange-500 to-amber-600',
    danger: 'from-red-500 to-rose-600'
  }
  
  const glowColors = {
    primary: 'var(--primary-glow)',
    success: 'rgba(34, 197, 94, 0.5)',
    warning: 'rgba(249, 115, 22, 0.5)',
    danger: 'rgba(239, 68, 68, 0.5)'
  }
  
  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Progress</span>
          <span 
            className="font-semibold text-white animate-count-up"
            key={displayValue}
          >
            {displayValue}%
          </span>
        </div>
      )}
      
      <div className={cn(
        'w-full rounded-full overflow-hidden bg-slate-800/50',
        sizes[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000 ease-out',
            'bg-gradient-to-r',
            colors[color]
          )}
          style={{
            width: `${displayValue}%`,
            boxShadow: glow ? `0 0 20px ${glowColors[color]}` : undefined
          }}
        />
      </div>
      
      {/* Success animation at 100% */}
      {displayValue === 100 && (
        <div className="text-center">
          <span className="inline-block animate-bounce text-2xl">🎉</span>
        </div>
      )}
    </div>
  )
}
```

---

### 5. 3D Flip FlashCard Component

Карточка для повторения с 3D эффектом переворота.

#### Interface

```typescript
interface FlashCard3DProps {
  front: string
  back: string
  onFlip?: (isFlipped: boolean) => void
  onRate?: (quality: number) => void
}
```

#### Implementation

```tsx
// components/review/FlashCard3D.tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'

export function FlashCard3D({ front, back, onFlip, onRate }: FlashCard3DProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  
  const handleFlip = () => {
    setIsFlipped(!isFlipped)
    onFlip?.(!isFlipped)
  }
  
  const handleRate = (quality: number) => {
    if (quality < 3) {
      // Shake animation for poor rating
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
    onRate?.(quality)
  }
  
  return (
    <div className="perspective-1000 w-full max-w-2xl mx-auto">
      <div
        className={cn(
          'relative w-full h-96 transition-transform duration-600 preserve-3d cursor-pointer',
          isFlipped && 'rotate-y-180',
          isShaking && 'animate-shake'
        )}
        onClick={handleFlip}
      >
        {/* Front */}
        <div className={cn(
          'absolute inset-0 backface-hidden',
          'glass glass-medium rounded-3xl p-8',
          'flex items-center justify-center text-center'
        )}>
          <div>
            <p className="text-sm text-slate-400 mb-4">Question</p>
            <p className="text-2xl text-white">{front}</p>
          </div>
        </div>
        
        {/* Back */}
        <div className={cn(
          'absolute inset-0 backface-hidden rotate-y-180',
          'glass glass-medium rounded-3xl p-8',
          'flex flex-col items-center justify-center text-center'
        )}>
          <div className="flex-1 flex items-center">
            <div>
              <p className="text-sm text-slate-400 mb-4">Answer</p>
              <p className="text-xl text-white">{back}</p>
            </div>
          </div>
          
          {/* Rating buttons */}
          <div className="flex gap-2 mt-6">
            {[1, 2, 3, 4, 5].map(quality => (
              <Button
                key={quality}
                size="sm"
                variant={quality < 3 ? 'danger' : quality === 3 ? 'secondary' : 'primary'}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRate(quality)
                }}
              >
                {quality}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Add to globals.css
/*
.perspective-1000 {
  perspective: 1000px;
}

.preserve-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}

.animate-shake {
  animation: shake 0.5s;
}
*/
```
