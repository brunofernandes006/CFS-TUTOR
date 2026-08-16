# GUIA — Tutor IA Offline (CFS Tutor)

## Visão Geral

O Tutor IA do CFS Tutor funciona em **modo offline**, gerando prompts estruturados para uso com qualquer ferramenta de IA (ChatGPT, Claude, Gemini, etc.).

**Não requer API paga ou conexão externa.**

## Funcionalidades

| Objetivo | Descrição |
|----------|-----------|
| Explicar um Tema | Explicação didática completa de um tópico do edital |
| Resumir Conteúdo | Resumo conciso para revisão rápida |
| Montar Plano de Revisão | Plano de revisão espaçada (1d, 3d, 7d, 15d, 30d) |
| Explicar um Erro | Análise de erro comum e como evitá-lo |
| Criar Flashcards | 8 flashcards de alta qualidade |
| Gerar Questões Inéditas | 3 questões de múltipla escolha (INÉDITA/DIDÁTICA) |
| Comparar Temas | Comparação entre temas relacionados |
| Preparar Sessão de Estudo | Sessão estruturada completa |

## Fluxo de Uso

1. **Selecionar objetivo** → Clique no tipo de ajuda desejada
2. **Selecionar disciplina** → Português, Matemática ou Profissionais
3. **Selecionar tópico** (opcional) → Escolha um item específico do edital
4. **Nível de profundidade** → Básico, Intermediário ou Avançado
5. **Observação** (opcional) → Instruções adicionais
6. **Gerar Prompt** → O sistema monta o prompt estruturado
7. **Copiar** → Use o prompt em qualquer ferramenta de IA

## Arquitetura

```
┌──────────────────────────────┐
│      Tutor IA Page           │
│  (app/tutor-ia/page.tsx)     │
├──────────────────────────────┤
│  API: /api/tutor-ia/generate │
├──────────────────────────────┤
│  Service:                    │
│  tutorIAPromptService.ts     │
│  - generateTutorPrompt()     │
│  - buildPrompt()             │
│  - getRelatedDocs()          │
│  - getRelatedTopics()        │
├──────────────────────────────┤
│  Database: syllabus_items    │
│            documents         │
└──────────────────────────────┘
```

### Adapter Pattern

O serviço está implementado com adapter pattern:

```typescript
// Interface atual (offline)
export function generateTutorPrompt(req: TutorRequest): TutorResult { ... }

// Futura integração com API de IA:
// export async function generateWithAPI(req: TutorRequest): Promise<TutorResult> {
//   const response = await fetch('https://api.example.com/generate', { ... });
//   return response.json();
// }
```

Para migrar para API paga no futuro:
1. Criar nova função no mesmo service
2. Trocar a chamada no API route
3. Manter o fallback offline

## Segurança

- **NUNCA** rotula conteúdo gerado como OFICIAL
- Questões geradas são sempre INÉDITAS ou DIDÁTICAS
- Alerta claro antes de gerar questões
- Documentos relacionados mostram apenas metadados (não conteúdo)

## Documentos Relacionados

O Tutor IA busca automaticamente documentos do catálogo que mencionam a disciplina selecionada. São exibidos como referência para estudo aprofundado.

## Limitações

- Gera prompts, não respostas diretas
- Não mantém histórico de conversas
- Não avalia respostas do aluno
- Documentos relacionados são por metadados (título/tipo), não por conteúdo semântico
