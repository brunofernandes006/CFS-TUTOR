# Guia do Usuário — CFS Tutor v1.0.0

## Primeiros Passos

1. Execute `INICIAR_CFS_TUTOR.bat` (Windows) ou `.\INICIAR_CFS_TUTOR.ps1` (PowerShell)
2. Aguarde o navegador abrir automaticamente em http://localhost:3000
3. Configure seu nome em **Configurações**

## Navegação

O menu lateral permite acesso a todas as funcionalidades:

- **Base Operacional** (/): Visão geral do progresso
- **Operações** (/missoes): Missões de estudo do dia
- **Edital** (/estudar): Todos os 182 itens do edital
- **Questões** (/questoes): Prática com gabarito
- **Reciclagem** (/revisao): Revisões espaçadas pendentes
- **Simulados** (/simulados): Provas oficiais e adaptativas
- **Caderno** (/caderno): Erros registrados automaticamente
- **Desempenho** (/desempenho): Indicadores de preparação
- **Biblioteca** (/biblioteca): 694 documentos oficiais
- **Tutor IA** (/tutor-ia): Assistente de estudo offline
- **Configurações** (/configuracoes): Preferências
- **Backup** (/backup): Exportar/importar dados

## Fluxo de Estudo Recomendado

1. **Verifique a Base Operacional** — veja sua prontidão e pontos fracos
2. **Inicie uma Missão** — plano personalizado do dia
3. **Responda Questões** — prática contínua
4. **Faça a Reciclagem** — revisões pendentes
5. **Simule** — simulado adaptativo ou oficial
6. **Revise o Caderno** — aprenda com os erros

## Simulados

### Oficial
- 60 questões (20 Português + 20 Matemática + 20 Profissionais)
- 3 horas e 30 minutos
- Pesos: 3 / 2 / 5
- Nota mínima por disciplina: 10 pontos

### Adaptativo
- Escolha a quantidade (10 a 60 questões)
- Prioriza pontos fracos automaticamente
- Sem limite de tempo

## Backup

- **Exportar**: Salva um arquivo JSON com todo seu progresso
- **Importar**: Restaura um backup anterior
- Um backup automático é criado antes de cada restauração

## Tutor IA

1. Escolha um objetivo (explicar tema, flashcards, etc.)
2. Selecione a disciplina
3. Opcionalmente, escolha um tópico específico
4. Clique em "Gerar Prompt"
5. Copie o prompt e use com sua ferramenta de IA favorita

## Importador de Questões

```bash
# Validar (não altera nada)
python scripts/import_questions.py arquivo.json --dry-run

# Importar (grava no banco)
python scripts/import_questions.py arquivo.json --write

# Banco personalizado
python scripts/import_questions.py arquivo.json --write --db ./cfs_catalogo.db
```

Formatos suportados: JSON e CSV.

## Dicas

- Responda questões diariamente para manter a sequência (streak)
- Revise os erros no caderno regularmente
- Use o Tutor IA para criar flashcards e resumos
- Exporte backups regularmente
- Configure a disciplina foco para direcionar as missões
