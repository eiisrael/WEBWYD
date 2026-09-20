# Política de segurança

## Segredos

Este repositório não deve conter senhas, tokens, chaves privadas, credenciais de
banco de dados ou arquivos de ambiente reais. O `.gitignore` bloqueia arquivos `.env`. A `BASE759` permanece versionada como corpus de referência, mas credenciais operacionais dentro dela devem ser sanitizadas.

Configurações futuras de servidor devem ler credenciais do ambiente ou de um
gerenciador de segredos. Nunca use constantes hardcoded para usuário/senha de
banco.

## Histórico legado

O upload inicial continha uma base de referência antiga com uma credencial
MariaDB hardcoded. A linha principal foi recriada a partir de um snapshot sanitizado. A `BASE759` pode ser reintroduzida como referência desde que credenciais operacionais sejam substituídas por placeholders.

Qualquer credencial que tenha sido reutilizada fora desse material de referência
deve ser rotacionada mesmo após a limpeza do Git. Clones antigos e cópias locais
anteriores à higienização devem ser descartados ou recriados a partir de
`main`.

## Relato

Ao encontrar uma possível vulnerabilidade, evite publicar credenciais ou dados
sensíveis em issues públicas. Descreva o componente afetado e os passos de
reprodução sem incluir segredos.


## Validação automática

O workflow `.github/workflows/quality.yml` executa lint estrutural, testes e
build em alterações da linha principal. Ele também bloqueia a reintrodução de
`BASE759`, lockfiles concorrentes e acesso direto ao DOM nas camadas
`game`/`formats`.
