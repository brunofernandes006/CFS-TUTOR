# Design System — CFS Tutor

## Visão Geral

O CFS Tutor utiliza uma estética militar/tática premium, inspirada em dashboards de comando e operações, com integração da identidade visual da PMESP.

---

## 1. Paleta de Cores

### Cores Primárias

| Nome | Hex | RGB | Uso |
|------|-----|-----|-----|
| navy-950 | #0a1628 | 10, 22, 40 | Fundo principal, elementos sólidos |
| navy-900 | #0f1f33 | 15, 31, 51 | Fundo secundário, superfícies |
| navy-800 | #1a2c47 | 26, 44, 71 | Terciário, destaques leves |
| graphite | #2a3a4a | 42, 58, 74 | Bordas, dividers, sombras |
| steel | #4a5a6a | 74, 90, 106 | Fundo de inputs, secundário |
| silver | #8a9aaa | 138, 154, 170 | Texto muted, labels |

### Cores de Destaque

| Nome | Hex | RGB | Uso |
|------|-----|-----|-----|
| electric-blue | #00b4ff | 0, 180, 255 | Interação, links, focus |
| cyan-glow | #00e5ff | 0, 229, 255 | Elemento mais importante, energia |
| gold-institution | #c9a84c | 201, 168, 76 | Institucional PMESP, pontos altos |
| alert-red | #ff4757 | 255, 71, 87 | Erros, avisos críticos |
| success-green | #2ed573 | 46, 213, 115 | Sucesso, objetivo atingido |
| warning-gold | #ffa502 | 255, 165, 2 | Aviso, atenção |

### Cores de Texto

| Nome | Hex | Uso |
|------|-----|-----|
| text-primary | #e8ecf1 | Texto normal, principal |
| text-secondary | #a0aab3 | Labels, helper text |
| text-muted | #6a7a8a | Desabilitado, secundário |

### Cores de Status

| Nome | Hex | Uso |
|------|-----|-----|
| success | #2ed573 | Concluído, OK |
| warning | #ffa502 | Atenção, pendente |
| error | #ff4757 | Crítico, erro |
| info | #00b4ff | Informação |

---

## 2. Tipografia

### Famílias

```css
--font-sans: 'Inter', 'Segoe UI', system-ui, sans-serif;
--font-mono: 'Fira Code', 'JetBrains Mono', monospace;
```

### Escalas

| Uso | Tamanho | Peso | Line Height | Letter Spacing |
|-----|--------|------|-------------|----------------|
| Título Principal (H1) | 32px | 900 (black) | 1.2 | -0.02em |
| Título Painel (H2) | 20px | 700 (bold) | 1.3 | -0.01em |
| Título Card (H3) | 16px | 700 (bold) | 1.4 | normal |
| Label Técnico | 11px | 600 (semibold) | 1.4 | 0.1em |
| Texto Normal | 14px | 400 (normal) | 1.6 | normal |
| Texto Pequeno | 12px | 400 (normal) | 1.5 | normal |
| Número/Métrica | 24px | 700 (bold) | 1.2 | -0.01em |
| Badge | 11px | 600 (semibold) | 1.3 | 0.05em |

### Hierarquia

1. **Título Principal**: Nome da página, "BASE OPERACIONAL", em uppercase, black (900), cyan-glow
2. **Títulos de Painel**: Nomes de seções, em H2, gold-institution
3. **Títulos de Card**: Informações de subitens, em H3, text-primary
4. **Labels Técnicos**: Identificadores, uppercase, text-secondary
5. **Texto Normal**: Conteúdo, text-primary
6. **Números**: Alto contraste, gold-institution ou electric-blue

---

## 3. Componentes

### TacticalCard
Componente de painel base.

**Props:**
- `title?: string` — Título do card
- `subtitle?: string` — Subtítulo
- `children` — Conteúdo
- `bordered?: boolean` — Bordas técnicas (default: true)
- `compact?: boolean` — Reduz padding
- `alert?: 'error' | 'warning' | 'success' | 'info'` — Cor de borda

**Estilos:**
```
background: navy-900
border: 1px solid graphite
border-left: 4px [alert-color]
border-radius: 4px
padding: 20px (normal) | 12px (compact)
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)
```

**Título:**
```
font-size: 16px
font-weight: 700
color: gold-institution
text-transform: uppercase
letter-spacing: 0.1em
margin-bottom: 12px
```

---

### TacticalPanel
Painel mais estruturado com header e footer opcionais.

**Props:**
- `title` — Título
- `icon?: ReactNode` — Ícone opcional
- `badge?: string` — Badge ao lado do título
- `children` — Conteúdo
- `footer?: ReactNode` — Rodapé opcional
- `full?: boolean` — Expande 100%

**Estrutura:**
```
┌─────────────────────────────────┐
│ [icon] TÍTULO          [badge]  │ ← header
├─────────────────────────────────┤
│                                 │
│ Conteúdo                        │
│                                 │
├─────────────────────────────────┤
│ Rodapé                          │ ← footer (opcional)
└─────────────────────────────────┘
```

---

### HudBorder
Decoração técnica/tática. Borda com efeito HUD.

**Props:**
- `variant?: 'primary' | 'alert' | 'success' | 'warning'`
- `position?: 'top' | 'bottom' | 'left' | 'right' | 'all'`
- `glow?: boolean` — Efeito brilho (default: true)

**Efeito:**
```
border com gradient sutil
efeito de glow (box-shadow)
cantos técnicos opcionais
cor conforme variant
```

---

### MetricCard
Card para mostrar uma métrica.

**Props:**
- `label` — Descrição (uppercase, small)
- `value` — Valor (número grande)
- `unit?: string` — Unidade (ex: "%", "h")
- `status?: 'good' | 'warning' | 'alert'`
- `trend?: 'up' | 'down' | 'stable'`
- `onChange?: number` — Variação
- `compact?: boolean`

**Estilos:**
```
background: navy-800
border: 1px solid graphite
border-left: 4px [status-color]
padding: 16px
text-align: center

label: 11px, text-secondary, uppercase
value: 28px, bold, text-primary
unit: 12px, text-muted
trend: ↑↓ icon, success/alert color
```

---

### CircularGauge
Gauge circular para % de domínio/prontidão.

**Props:**
- `value` — 0-100
- `label` — Texto
- `size?: 'small' | 'medium' | 'large'` (default: medium)
- `color?: 'primary' | 'warning' | 'alert'`

**Renderização:**
```
SVG circular
background: navy-800
progress: electric-blue ou gold-institution
label interno: grande, bold
% externo
```

---

### ProgressBar
Barra de progresso tática.

**Props:**
- `value` — 0-100
- `label?: string`
- `color?: 'primary' | 'warning' | 'alert' | 'success'`
- `striped?: boolean` — Padrão diagonal (default: false)
- `animated?: boolean` — Animação sutil
- `detailed?: boolean` — Mostra X/Y

**Estilos:**
```
height: 8px
background: steel
border-radius: 2px
overflow: hidden
progress: electric-blue (ou color)
box-shadow: inset 0 1px 3px rgba(0,0,0,0.5)
```

---

### StatusBadge
Badge de status.

**Props:**
- `status` — 'pendente' | 'em-progresso' | 'concluído' | 'erro'
- `text` — Rótulo

**Cores:**
- pendente: warning-gold
- em-progresso: electric-blue
- concluído: success-green
- erro: alert-red

**Estilos:**
```
display: inline-flex
align-items: center
gap: 6px
padding: 4px 10px
border-radius: 12px
font-size: 11px
font-weight: 600
text-transform: uppercase
background: rgba(cor, 0.1)
border: 1px solid rgba(cor, 0.5)
color: cor
```

---

### DisciplineBadge
Badge para disciplina.

**Props:**
- `discipline` — Nome
- `size?: 'small' | 'medium'`

**Cores (fixas):**
- Português: electric-blue
- Matemática: success-green
- Profissionais: gold-institution

---

### SourceBadge
Badge para origem/tipo de questão.

**Props:**
- `type` — 'OFICIAL' | 'INÉDITA' | 'DIDÁTICA'

**Cores:**
- OFICIAL: gold-institution
- INÉDITA: electric-blue
- DIDÁTICA: success-green

**Restrição:**
nunca rotular como OFICIAL sem: ano, prova, número, fonte, verified=true

---

### MissionCard
Card de missão.

**Props:**
- `mission` — Objeto missão
- `onClick` — Callback

**Layout:**
```
┌─────────────────────┐
│ [icon] MISSÃO DO DIA│
├─────────────────────┤
│ Etapa 1/4: Reciclagem
│ Português | 45min
│ Tema: Coesão Textual
│ Mastery: 65% | Alto
├─────────────────────┤
│ [Continuar] [Pular] │
└─────────────────────┘
```

---

### SimulationCard
Card de operação.

**Props:**
- `type` — 'OFICIAL' | 'ADAPTATIVO'
- `available` — boolean
- `nextAvailableAt` — Data/hora
- `lastScore` — Última nota
- `onClick`

---

### StatBlock
Bloco de estatísticas múltiplas.

**Props:**
- `stats: Array<{label, value, icon?, status?}>`
- `columns?: number` (default: 4)

**Renderização:**
```
grid
cada célula: label small + value grande + ícone opcional
responsivo
```

---

### SectionHeader
Cabeçalho de seção/página.

**Props:**
- `title` — Título uppercase
- `subtitle?: string` — Descrição
- `icon?: ReactNode`
- `action?: ReactNode` — Botão/link à direita

**Estilos:**
```
display: flex
align-items: baseline
justify-content: space-between
margin-bottom: 24px

title: 32px, black (900), cyan-glow
subtitle: 14px, text-secondary
```

---

### AlertPanel
Painel de alerta/informação.

**Props:**
- `type` — 'error' | 'warning' | 'info' | 'success'
- `title` — Título
- `message` — Mensagem
- `action?: {label, onClick}`
- `closeable?: boolean`

**Layout:**
```
┌─ [icon] TÍTULO ─────────────┐
│                             │
│ Mensagem descritiva.        │
│                             │
│         [Ação] [Fechar]     │
└─────────────────────────────┘
```

---

### EmptyState
Tela vazia.

**Props:**
- `icon` — Ícone SVG
- `title` — Título
- `message` — Mensagem
- `action?: {label, onClick}`

---

### LoadingState
Estado de carregamento.

**Props:**
- `message?: string`

**Renderização:**
```
spinner circular
cor: electric-blue
label: "Carregando..."
```

---

### TacticalButton
Botão base.

**Props:**
- `variant` — 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
- `size` — 'small' | 'medium' | 'large' (default: medium)
- `disabled?: boolean`
- `icon?: ReactNode`
- `children`

**Variantes:**

**primary:**
```
background: electric-blue
color: navy-950
border: none
font-weight: 700
padding: 12px 24px
border-radius: 4px
cursor: pointer

:hover background: cyan-glow
:active transform: scale(0.98)
:disabled opacity: 0.6
```

**secondary:**
```
background: navy-800
color: electric-blue
border: 1px solid graphite
font-weight: 600
padding: 10px 20px
```

**danger:**
```
background: alert-red
color: white
border: none
```

**success:**
```
background: success-green
color: navy-950
border: none
```

**ghost:**
```
background: transparent
color: electric-blue
border: 1px solid electric-blue
```

---

### Modal
Modal tático.

**Props:**
- `open` — boolean
- `onClose` — callback
- `title` — Título
- `children`
- `actions?: Array<{label, onClick, variant}>`

---

### DataTable
Tabela de dados.

**Props:**
- `columns: Array<{key, label, render?, sortable?, width?}>`
- `data: Array<T>`
- `onRowClick?: (row) => void`
- `pagination?: {pageSize, onPageChange}`

---

### SearchBar
Barra de busca.

**Props:**
- `placeholder`
- `value`
- `onChange`
- `onSearch`
- `suggestions?: string[]`

---

### FilterBar
Barra de filtros.

**Props:**
- `filters: Array<{name, options, multiple?}>`
- `onFilter: (filters) => void`
- `onReset`

---

## 4. Responsividade

### Breakpoints

```css
--breakpoint-xs: 320px
--breakpoint-sm: 640px
--breakpoint-md: 1024px
--breakpoint-lg: 1366px
--breakpoint-xl: 1920px
```

### Mobile (< 640px)

- Single column
- Bottom navigation
- Reduced padding/margin
- Stacked cards
- Modal-friendly

### Tablet (640px - 1024px)

- 2 columns
- Adjusted spacing
- Side menu collapsed option

### Desktop (1024px+)

- Full layout
- Side menu + content
- 2-4 column grids
- Expanded views

---

## 5. Animações

### Transições

```css
--transition-fast: 150ms ease-in-out
--transition-normal: 300ms ease-in-out
--transition-slow: 500ms ease-in-out
```

**Uso:**
```css
background-color: var(--transition-normal)
transform: var(--transition-normal)
opacity: var(--transition-fast)
```

### Efeitos Especiais

1. **Glow**: `box-shadow: 0 0 20px rgba(0, 229, 255, 0.3)`
2. **Border Pulse**: keyframe subtle
3. **Slide**: transform translateX
4. **Fade**: opacity
5. **Scale**: transform scale (botões on hover)

### Evitar

- Excesso de animações
- Animações em scroll
- Transições muito lentas
- Efeitos que prejudicam legibilidade

---

## 6. Sombras

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.2)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.3)
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.4)
--shadow-inset: inset 0 2px 4px rgba(0, 0, 0, 0.2)
```

---

## 7. Espaçamento

```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
```

---

## 8. Bordas

```css
--border-thin: 1px solid var(--graphite)
--border-radius-sm: 2px
--border-radius-md: 4px
--border-radius-lg: 8px
--border-radius-full: 50%
```

---

## 9. Estados

### Hover
- Brightness +10%
- Scale 1.02 (botões)
- Borda mais clara

### Active
- Scale 0.98
- Brightness -10%

### Focus
- Outline: 2px solid electric-blue
- Offset: 2px

### Disabled
- Opacity: 0.6
- Cursor: not-allowed
- Sem hover effects

### Visited (Links)
- Color: muted variant
- Sem glow

---

## 10. Ícones

**Biblioteca recomendada:** Heroicons (outline, 20px, 24px)

**Cores:**
- Padrão: text-secondary
- Ativo: electric-blue
- Sucesso: success-green
- Alerta: alert-red

**Tamanho:**
- Small: 16px
- Medium: 20px
- Large: 24px
- XLarge: 32px

---

## 11. Implementação

### CSS-in-JS recomendado

Use TailwindCSS com extensões customizadas no `tailwind.config.ts`:

```typescript
export default {
  theme: {
    colors: {
      'navy': {
        '950': '#0a1628',
        '900': '#0f1f33',
        '800': '#1a2c47',
      },
      'graphite': '#2a3a4a',
      'steel': '#4a5a6a',
      'silver': '#8a9aaa',
      'electric-blue': '#00b4ff',
      'cyan-glow': '#00e5ff',
      'gold': '#c9a84c',
      'alert-red': '#ff4757',
      'success-green': '#2ed573',
      'warning-gold': '#ffa502',
    },
    extend: {
      boxShadow: {
        'glow-blue': '0 0 20px rgba(0, 229, 255, 0.3)',
        'glow-gold': '0 0 20px rgba(201, 168, 76, 0.3)',
      },
    },
  },
}
```

### Estrutura de Componentes

```
components/
├── ui/
│   ├── TacticalCard.tsx
│   ├── TacticalPanel.tsx
│   ├── HudBorder.tsx
│   ├── MetricCard.tsx
│   ├── CircularGauge.tsx
│   ├── ProgressBar.tsx
│   ├── StatusBadge.tsx
│   ├── DisciplineBadge.tsx
│   ├── SourceBadge.tsx
│   ├── TacticalButton.tsx
│   ├── Modal.tsx
│   ├── DataTable.tsx
│   ├── SearchBar.tsx
│   └── FilterBar.tsx
├── layout/
│   ├── AppShell.tsx
│   ├── SectionHeader.tsx
│   └── EmptyState.tsx
├── cards/
│   ├── MissionCard.tsx
│   ├── SimulationCard.tsx
│   └── StatBlock.tsx
└── features/
    └── (específicos de cada feature)
```

---

## 12. Acessibilidade

- Contraste mínimo 4.5:1 para texto
- Todos os ícones devem ter `aria-label`
- Botões devem ser focáveis via teclado
- Usar `role` apropriado para elementos
- Evitar `color` como única forma de comunicação

---

## 13. Performance

- Lazy load de imagens
- Code splitting por rota
- Memoização de componentes pesados
- CSS critical inline
- Sem queries N+1

---

## Referência Visual

O design segue a linguagem de dashboards táticos/militares, inspirada na imagem de referência fornecida.

Objetivos:
- Premium
- Tecnológico
- Inteligente
- Profissional
- Tático
- Não genérico
- Não infantil

---

**Versão:** 1.0  
**Data:** 2026-08-12  
**Status:** Aprovado para implementação
