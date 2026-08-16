# MODELO — Banco de Questões CFS Tutor

## Visão Geral

O CFS Tutor aceita importação de questões through o arquivo `question_bank_schema.json`.

## Formatos Suportados

### JSON (recomendado)

```json
{
  "version": 1,
  "questions": [
    {
      "question_uid": "PORT-001",
      "origin": "INEDITA",
      "discipline": "Língua Portuguesa",
      "syllabus_uid": "SP-PT-001",
      "theme": "Interpretação de Texto",
      "subtheme": "Texto Dissertativo-Argumentativo",
      "difficulty": 3,
      "statement": "Analise o trecho a seguir...",
      "options": [
        { "option_text": "Alternativa A" },
        { "option_text": "Alternativa B" },
        { "option_text": "Alternativa C" },
        { "option_text": "Alternativa D" }
      ],
      "correct_option": 0,
      "explanation": "A alternativa A está correta porque..."
    }
  ]
}
```

### CSV

Colunas obrigatórias (separadas por vírgula):

| Coluna | Obrigatório | Descrição |
|--------|-------------|-----------|
| question_uid | ✅ | ID único da questão |
| origin | ✅ | OFICIAL / INEDITA / DIDATICA |
| discipline | ✅ | Disciplina completa |
| syllabus_uid | ✅ | UID do item do edital |
| statement | ✅ | Enunciado (mín. 10 caracteres) |
| options | ✅ | Alternativas separadas por `\|` |
| correct_option | ✅ | Índice da correta (0-based) |
| explanation | Não | Explicação |
| theme | Não | Tema |
| subtheme | Não | Subtema |
| difficulty | Não | 1-5 (padrão: 3) |
| year | Não | Ano da prova |
| exam | Não | Nome do exame |
| number | Não | Número na prova |
| source | Não | Fonte/referência |
| verified | Não | true/false |

## Regras de Validação

### Regra OFICIAL

Uma questão só pode ter `origin: "OFICIAL"` se **TODOS** os campos forem preenchidos:

- `verified: true`
- `year` (ex: 2024)
- `exam` (ex: "CFS PMESP")
- `number` (ex: 42)
- `source` (ex: "Prova Oficial CFS 2024")

Caso contrário, a questão é **rejeitada** e NÃO importada como OFICIAL.

### Validações Adicionais

- `syllabus_uid` deve existir no catálogo de 182 itens
- 4 ou 5 alternativas por questão
- Gabarito dentro do range válido
- Sem duplicidade por `question_uid`
- Disciplina deve ser uma das 3 válidas
- Enunciado mínimo de 10 caracteres

## Execução

```bash
# Validação sem alterar nada (padrão seguro)
python scripts/import_questions.py arquivo.json --dry-run --verbose

# Importação REAL — requer --write explicitamente
python scripts/import_questions.py arquivo.json --write

# Banco personalizado
python scripts/import_questions.py arquivo.json --write --db ./cfs_catalogo.db

# CSV
python scripts/import_questions.py arquivo.csv --dry-run --verbose
python scripts/import_questions.py arquivo.csv --write
```

> ⚠️ **Sem `--write`, NENHUMA alteração é feita ao banco.** O script sempre começa em modo dry-run.

## Relatório de Saída

```
============================================================
RELATÓRIO DE IMPORTAÇÃO — CFS Tutor
Data: 2026-08-16 14:30:00
Modo: DRY RUN (nenhuma alteração no banco)
============================================================
  VALIDADAS:     50
  IMPORTADAS:    0
  REJEITADAS:    2
  DUPLICADAS:    3
  INVÁLIDAS:     0
------------------------------------------------------------
DETALHES:
  - REJEITADA [OFICIAL-003]: OFICIAL sem campos obrigatórios: year, exam
  - DUPLICADA [PORT-012]: question_uid já existe
============================================================
```

## Estrutura de Arquivos

```
CFS_TUTOR_APP/
├── question_bank_schema.json    # Schema de validação
├── scripts/
│   └── import_questions.py      # Importador Python
├── MODELO_BANCO_QUESTOES.md     # Este arquivo
└── import/                      # Pasta para arquivos de importação (não versionada)
    └── (seus arquivos .json/.csv aqui)
```
