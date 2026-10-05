# Max Forte · Painel de Frota

Dashboard web para gerenciar postos, veículos e alocações, com holograma 3D da Bahia.
Stack: HTML/JS puro (sem build) + funções serverless na **Vercel** + banco/autenticação no **Supabase**.

```
public/                 o site (index, style, bg.js = fundo 3D, holo.js = mapa holográfico, app.js = lógica)
api/                    funções da Vercel: config, users, geocode (endereços), bootstrap (primeiro acesso)
supabase/schema.sql     tabelas, segurança (RLS) e as 36 placas da sua planilha
```

> **Importante:** `api/`, `public/`, `vercel.json` e `package.json` precisam ficar na **raiz** do repositório do GitHub
> (ou você precisa indicar a pasta na Vercel — veja "A página diz que não existe (404)").

---
## PASSO 1 — Supabase (banco de dados)
1. https://supabase.com → **New project** (nome `maxforte`, senha do banco, região **South America (São Paulo)**). Aguarde ~2 min.
2. **SQL Editor → New query** → cole TODO o conteúdo de `supabase/schema.sql` → **Run** (deve dar "Success").
   Pode rodar de novo sem problema (não duplica nada). Isso já cadastra as 36 placas da planilha.
3. **Authentication → Providers → Email**: deixe habilitado e **desligue "Confirm email"**.
4. **Project Settings → API** (ou **API Keys**). Anote:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key**
   - **service_role / secret key** (secreta! nunca divulgue). Serve tanto a chave antiga (`eyJ...`) quanto a nova (`sb_secret_...`).

## PASSO 2 — GitHub
1. Crie um repositório (privado) `maxforte-frota`.
2. Descompacte o zip. **Abra a pasta descompactada, selecione TUDO que está DENTRO dela (Ctrl+A)** e arraste para a página do repositório
   (**Add file → Upload files**). Não arraste a pasta de fora — arraste o conteúdo (as pastas `api`, `public`, `supabase` e os arquivos soltos).
3. Clique **Commit changes**. Ao abrir o repositório, você deve ver `api`, `public`, `supabase`, `vercel.json`… logo na primeira tela.

## PASSO 3 — Vercel
1. https://vercel.com → **Add New → Project** → importe o repositório.
2. **Framework Preset: Other**. Deixe Build Command e Output Directory em branco (o `vercel.json` já configura).
3. **Environment Variables**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (valores do Passo 1).
   Opcional: `SETUP_CODE` (veja o Passo 4).
4. **Deploy**. Se alterar variáveis depois: **Deployments → ⋯ → Redeploy**.

## PASSO 4 — Criar o usuário MASTER (sem terminal!)
1. Abra o endereço do seu site. Se o Supabase estiver configurado e ainda não existir master, aparece a tela **"Primeiro acesso"**.
2. Digite seu nome, escolha a senha (mín. 8 caracteres, **não use uma senha que já tenha mostrado a alguém**) e clique **Criar master**.
3. Você volta ao login: entre com usuário **master** e essa senha. Só funciona uma vez; depois a tela some.

Se a tela de login mostrar um aviso vermelho, ele diz exatamente o que falta (variáveis na Vercel ou o `schema.sql` no Supabase).

---
## A página diz que não existe (404)
Causa mais comum: o repositório ficou com uma pasta dentro (`maxforte/api`, `maxforte/public`…), e a Vercel procura na raiz.
Abra o repositório no GitHub: se a primeira coisa que aparece é uma pasta `maxforte`, escolha **uma** das soluções:

**Solução A (mais rápida, sem mexer no GitHub):** Vercel → seu projeto → **Settings → General → Root Directory** → digite `maxforte` → **Save** →
**Deployments → ⋯ → Redeploy**.

**Solução B (repositório limpo):** apague o repositório (GitHub → Settings → Danger Zone), crie de novo e suba só o **conteúdo** (Passo 2).
Na Vercel, importe o novo repositório.

Outras causas: link digitado errado (copie o endereço em **Domains** do projeto) ou deploy com erro (veja a aba **Deployments**).

## Como ATUALIZAR o projeto arrastando arquivos
1. GitHub → seu repositório. Se estiver usando a Solução A, clique antes na pasta `maxforte` (você deve estar na pasta que contém `api` e `public`).
2. **Add file → Upload files**.
3. Arraste o **conteúdo** da nova versão (as pastas `api`, `public`, `supabase` e os arquivos soltos). Arquivos com o mesmo nome são substituídos.
4. **Commit changes**. A Vercel publica sozinha em ~1 minuto (acompanhe em **Deployments**).
5. Se a atualização incluir mudança no `schema.sql`, rode-o de novo no SQL Editor do Supabase.
Observação: o upload pelo navegador não apaga arquivos antigos; para remover um, abra-o no GitHub → ⋯ → **Delete file**.

---
## Uso
- **Usuários** (só master): crie administradores, troque nome, tratamento (bem-vindo/bem-vinda) e senha.
- **Postos**: numeração + endereço → **Localizar no mapa** → confira a precisão (exata/rua/aproximada). Ao salvar sem localizar, o sistema busca e pede conferência.
  Se o endereço não for achado, informe latitude/longitude manualmente.
- **Veículos**: adicione uma ou várias placas; edite placa/situação; filtre; **⬇ CSV** exporta a lista (abre no Excel).
- **Alocar**: arraste a placa até o posto (no celular, toque na placa e depois na coluna).
- **Mapa**: gire arrastando, zoom com a roda, clique num posto para ver as placas.

## Como funciona a localização de endereços
`api/geocode.js` normaliza o texto (Av.→Avenida, "nº", "s/n", BR/BA-xxx), usa o **CEP** (ViaCEP) quando existe, consulta o OpenStreetMap (Nominatim)
limitado à Bahia com 5 estratégias de fallback e, por fim, o Photon. Mostra sempre a **precisão** e rejeita pontos fora da Bahia.
Melhor resultado: *rua, número, bairro, cidade* (ou CEP).

## Observações
- O contorno da Bahia é simplificado; para fronteiras oficiais, troque o array `BAHIA` em `public/holo.js` por dados do IBGE.
- A voz usa o sintetizador do navegador (pt-BR); a voz feminina varia conforme o sistema. Chrome/Edge funcionam melhor.
- Fuso da saudação: `America/Bahia`.
