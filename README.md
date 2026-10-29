# Bey Contas

App (PWA) para controlar compras, vendas e a coleção Beyblade X. Funciona em iPhone, iPad, Android e PC, offline, com os dados guardados só no próprio dispositivo.

## Instalar
- **iPhone / iPad (Safari):** abrir o link → Partilhar → *Adicionar ao ecrã principal*.
- **Android (Chrome):** abrir o link → menu ⋮ → *Instalar app*.
- **PC (Chrome / Edge):** ícone de instalar na barra de endereço.

## Passar dados entre dispositivos
Mais → Dados → **Partilhar cópia** (AirDrop, WhatsApp, Drive…) e, no outro dispositivo, **Importar cópia**. A importação junta os dados: fica a versão mais recente de cada artigo e nada é duplicado.

## Publicar uma nova versão
1. Alterar os ficheiros.
2. Aumentar `VERSION` em `sw.js` (ex.: `v2`).
3. `git commit` + `git push` — o GitHub Pages atualiza e as apps instaladas recebem a versão nova ao abrir.

Os dados pessoais (ficheiros `.json` de cópia) nunca são enviados para o repositório.
Catálogo e fotos das peças: BBPT Hub.
