# Arquitetura da reimplementação

O cliente clássico e seus arquivos originais são a especificação canônica. O WYD M é uma adaptação mobile reduzida: seus dados podem ajudar a localizar nomes e conceitos, mas não substituem formatos, conteúdo ou comportamento do clássico.

## Limites

- `core`: relógio, eventos, matemática e leitura binária; não conhece Three.js.
- `formats`: decoders puros e testados para `.trn`, `.msh`, `.wys` e tabelas.
- `world`: coordenadas WYD, streaming, terreno, colisão e pathfinding.
- `render`: adaptação do estado do jogo para Three.js.
- `game`: regras, entidades, combate e inventário; não acessa DOM.
- `ui`: HUD e telas.
- `app`: composição e ciclo de vida.

O navegador nunca lê a instalação original diretamente. As ferramentas de importação produzem dados web em `public/game-data`, e o pacote mínimo necessário em `public/game-data/classic` é versionado para permitir build e deploy reproduzíveis. A base legada completa (`BASE759`) permanece versionada como corpus de referência de engenharia reversa e comparação. Ela não é dependência do runtime nem do build.

## Primeiro vertical slice

1. Decodificar e validar `Field*.trn` do cliente clássico.
2. Importar texturas mínimas de terreno.
3. Compor e fazer streaming dos blocos ao redor de Armia.
4. Reproduzir câmera, picking e movimento com colisão.
5. Só então adicionar objetos estáticos e personagem animado.


## Regras de dependência

- `core`, `formats`, `game` e `world` não acessam DOM diretamente.
- Canvas, sprites de status e demais apresentação pertencem a `render`/`ui`.
- Listeners globais devem possuir caminho explícito de descarte.
- Bun é o único gerenciador de pacotes; não manter lockfiles de npm/yarn/pnpm.
- Segredos e credenciais nunca entram no Git. Arquivos `.env` reais são ignorados.


## Corpus de referência BASE759

`BASE759` é fonte de verdade comparativa para reproduzir o comportamento
clássico no navegador. Mudanças no WEBWYD podem consultar essa base para validar
estruturas binárias, animações, modelos, mapas, regras, protocolos e fluxos do
cliente/servidor original.

Regra importante: preservar fidelidade de comportamento, mas não preservar
segredos operacionais. Senhas e credenciais hardcoded podem ser substituídas por
placeholders sem alterar a lógica de referência.
