# 🚍 SEMOB - Finais de Linha e Itinerários (React / Next.js 15)

Este é o novo portal full-stack de consulta de rotas, finais de linha e horários de ônibus da **Secretaria de Mobilidade Urbana de Feira de Santana (SEMOB)**.

Desenvolvido com as tecnologias mais modernas do ecossistema web, o projeto possui uma interface premium, responsiva, com mapas interativos customizados, suporte a desenho de itinerários em tempo real e carregamento ultra-rápido otimizado para o uso dos fiscais de trânsito em smartphones.

---

## 🛠️ Tecnologias e Funcionalidades

* **Framework Core**: React 19 & Next.js 15 (com App Router) para alto desempenho e renderização híbrida.
* **Banco de Dados**: PostgreSQL (Neon DB) conectado via driver nativo seguro.
* **Armazenamento de Imagens**: Cloudflare R2 Storage (S3-compatible) para referências de mapas estáticos dos itinerários.
* **Mapas Interativos**: Leaflet.js & OpenStreetMap (tiles Voyager da CartoDB - leves, rápidos e sem limites de consumo de API).
* **Estilização Premium**: Vanilla CSS (CSS Modules) - Com suporte nativo a **Dark Mode**, *glassmorphism*, variáveis de cor baseadas em HSL e micro-animações interativas.
* **Ícones**: Lucide React.

---

## ✨ Funcionalidades em Destaque no Projeto Final

### 📱 Experiência Mobile-First Otimizada
* **Layout Inteligente**: No mobile, o fluxo exibe prioritariamente a lista de linhas para navegação rápida.
* **Exibição do Mapa sob Demanda**: Ao selecionar uma linha, o mapa interativo assume a tela cheia.
* **Botão de Retorno Fluido**: Um botão flutuante estilizado (`☰ Linhas`) é posicionado estrategicamente no canto inferior esquerdo para permitir o retorno à lista, evitando sobreposição com os controles de zoom do mapa.

### 🎨 Visual Moderno e Limpo
* **Cabeçalho Premium**: O topo da aplicação apresenta o logo oficial transparente de Feira de Santana (`logofeira.ico`) sem textos redundantes, gerando uma experiência de visual limpo e profissional.
* **Favicon Customizado**: Favicon oficial integrado à estrutura de rotas do Next.js.
* **Toggles Estilo iOS**: Filtros para exibir sentidos (PC1 e PC2) estilizados como toggles animados (iOS-like) para fácil manipulação no celular.

### ✍️ Painel de Desenho de Rotas Administrativo
* **Interface Split-Screen**: Permite colar a URL de uma imagem de referência antiga no painel esquerdo (com zoom digital ajustável) e desenhar interativamente a rota clicando no mapa no painel direito.
* **Ajuste Dinâmico**: Arraste pontos existentes para reposicioná-los, clique para remover, ou utilize o botão de desfazer com total segurança.
