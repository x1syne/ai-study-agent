# Design Document: UI/UX 2026 Modernization (Part 1 - Overview & Architecture)

## Overview

Трансформация AI Study Agent в премиальный продукт уровня 2026 с эстетикой "Apple meets Cyberpunk". Фокус на визуальной глубине, генеративном интерфейсе и микровзаимодействиях.

### Design Principles

1. **Visual Depth Over Flatness** - Glassmorphism, multi-layer shadows, gradients
2. **Fluid Over Fixed** - Плавные переходы, clamp(), container queries
3. **Generative Over Static** - Динамические компоненты, морфинг, streaming
4. **Performance First** - GPU-accelerated, lazy loading, оптимизация
5. **Accessible By Default** - prefers-reduced-motion, keyboard, ARIA

### Technology Stack

- **CSS**: Container Queries, View Transitions, @property, :has()
- **Animations**: CSS Animations + Framer Motion (сложные случаи)
- **Typography**: Fluid Typography с clamp()
- **Colors**: CSS color-mix() для динамических оттенков
- **Performance**: transform, opacity (GPU-accelerated)

## Architecture

### Component Hierarchy

```
App
├── CSS 2026 Core (globals.css)
│   ├── Design Tokens
│   ├── Glassmorphism
│   ├── Animations
│   └── Fluid Typography
│
├── Enhanced UI
│   ├── Card (Glassmorphism 2.0)
│   ├── Button (Micro-interactions)
│   ├── Progress (Animated)
│   └── Input (Focus states)
│
├── Page Components
│   ├── Dashboard (Hero, Stats, Courses)
│   ├── Graph (Neural nodes, SVG glow)
│   ├── Chat (Generative UI, Streaming)
│   └── Review (3D Flip cards)
│
└── Animation System
    ├── View Transitions
    ├── Scroll Animations
    ├── Stagger Utilities
    └── Reduced Motion
```

### Data Flow

```
User Interaction
    ↓
Component State Change
    ↓
CSS Transition/Animation
    ↓
GPU-Accelerated Rendering
    ↓
Visual Feedback
```

### Performance Strategy

- **GPU Acceleration**: Только transform и opacity
- **Will-change**: Для активных анимаций
- **Lazy Loading**: Тяжёлые компоненты
- **Code Splitting**: По страницам
- **Memoization**: React.memo, useMemo

## Data Models

### Design Token System

```typescript
interface DesignTokens {
  colors: {
    background: {
      deep: string      // #0a0a12
      main: string      // #10101a
      surface: string   // #151520
      overlay: string   // #1a1a26
    }
    primary: {
      50: string
      500: string
      600: string
      glow: string
    }
  }
  
  glassmorphism: {
    bg: string
    border: string
    blur: string
    saturate: string
  }
  
  shadows: {
    sm: string
    md: string
    lg: string
    glow: string
  }
  
  animation: {
    duration: {
      fast: string    // 0.15s
      normal: string  // 0.3s
      slow: string    // 0.6s
    }
    easing: {
      smooth: string  // cubic-bezier(0.4, 0, 0.2, 1)
      bounce: string  // cubic-bezier(0.68, -0.55, 0.265, 1.55)
    }
  }
  
  typography: {
    fluid: {
      xs: string   // clamp(0.75rem, ...)
      sm: string
      base: string
      lg: string
      xl: string
      '2xl': string
      '3xl': string
      '4xl': string
    }
  }
}
```

### Component Props Models

```typescript
// Card Component
interface CardProps {
  variant: 'glass-subtle' | 'glass-medium' | 'glass-intense'
  glow: boolean
  animatedBorder: boolean
  hover: boolean
  containerQuery: boolean
}

// Button Component
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger'
  size: 'sm' | 'md' | 'lg'
  isLoading: boolean
  ripple: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

// Progress Component
interface ProgressProps {
  value: number // 0-100
  showLabel: boolean
  animated: boolean
  glow: boolean
  size: 'sm' | 'md' | 'lg'
  color: 'primary' | 'success' | 'warning' | 'danger'
}

// FlashCard3D Component
interface FlashCard3DProps {
  front: string
  back: string
  onFlip?: (isFlipped: boolean) => void
  onRate?: (quality: number) => void
}
```

### Animation State Models

```typescript
interface AnimationState {
  isAnimating: boolean
  progress: number // 0-1
  direction: 'forward' | 'reverse'
  easing: string
}

interface ViewTransitionState {
  isTransitioning: boolean
  from: string // page path
  to: string   // page path
  element?: HTMLElement
}

interface ScrollAnimationState {
  isVisible: boolean
  progress: number // 0-1 (scroll progress)
  hasAnimated: boolean
}
```
