# Block World - Sobrevivência Voxel 3D

Um jogo 3D de sobrevivência voxel para navegador inspirado em Minecraft, construído **exclusivamente com HTML, CSS, JavaScript modular e Three.js**.

---

## 🎮 Como Jogar

O servidor local já pode ser iniciado via:

```bash
npm start
# ou: python -m http.server 8080
```

Em seguida, acesse no navegador:
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 🕹️ Controles

| Ação | Tecla / Controle |
| :--- | :--- |
| **Mover** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| **Pular** | <kbd>Espaço</kbd> |
| **Modo de Voo (Ativar / Desativar)** | **Duplo toque rápido em <kbd>Espaço</kbd>** |
| **Subir (em Voo)** | <kbd>Espaço</kbd> |
| **Descer (em Voo)** | <kbd>Shift</kbd> |
| **Correr (no Chão)** | Segurar <kbd>Shift</kbd> |
| **Nadar na Água** | Pressionar <kbd>Espaço</kbd> dentro d'água |
| **Abrir / Fechar Inventário** | Tecla <kbd>E</kbd> |
| **Olhar ao Redor** | Mover o Mouse |
| **Quebrar Bloco** | Clique Esquerdo do Mouse |
| **Colocar Bloco** | Clique Direito do Mouse |
| **Selecionar Slot da Hotbar** | Teclas <kbd>1</kbd> até <kbd>9</kbd> ou **Roda do Mouse (Scroll)** |
| **Pausar / Menu de Pausa** | Tecla <kbd>ESC</kbd> |

---

## 🌟 Principais Recursos Desta Versão

### 1. Mundo Expandido (128 x 128 Blocos) & Sistema de Chunks
- Mundo de **128 x 32 x 128 blocos** dividido em **64 Chunks** de 16x32x16.
- Renderização via `BufferGeometry` com **Face Culling completo**: apenas faces voltadas para ar, líquidos ou blocos transparentes são geradas.
- Performance de 60 FPS com reconstrução cirúrgica de chunks apenas quando blocos são modificados.

### 2. Geração Procedural Baseada em Seed & Biomas
- Gerador determinístico baseado em **Mulberry32 e 2D Perlin Noise com oitavas**.
- **Biomas Dinâmicos**:
  - **Planície**: Terreno suave, grama, flores e árvores ocasionais.
  - **Floresta**: Terreno ondulado com alta densidade de árvores de carvalho.
  - **Deserto**: Dunas suaves com blocos de areia.
  - **Montanhas**: Picos elevados de rochas expostas.
  - **Lagos e Praias**: Água transparente no nível do mar (Y=10) com faixas de areia.
- **Árvores Procedurais**: Troncos de madeira com copas de folhas.
- **Mineração Subterrânea**: Camadas de pedra com veios de minério de carvão e minério de ferro.

### 3. Menu de Mundos e Gerenciamento
- **Menu Principal**: Botões *Jogar*, *Mundos* e *Configurações*.
- **Meus Mundos**: Lista de mundos salvos com nome, seed, data da última partida, botões *Entrar* e *Excluir*.
- **Criar Novo Mundo**: Permite definir nome, digitar uma seed customizada ou clicar em **🎲 ALEATÓRIA**.
- Transição fluida entre menu e mundo 3D.

### 4. Sistema de Salvamento no `localStorage`
- Persistência automática do progresso ao sair para o menu e a cada 20 segundos.
- **Salvamento Compacto por Deltas**: Armazena apenas blocos alterados (`modifiedBlocks`), posição e rotação do jogador, modo de voo, e o estado completo dos 36 slots do inventário.
- Não estoura a cota do `localStorage` e permite múltiplos mundos.

### 5. Inventário Completo (36 Slots) & Hotbar (9 Slots)
- Ao pressionar <kbd>E</kbd>, abre o inventário no centro da tela.
- **Mochila com 27 slots (3x9) + Hotbar com 9 slots (1x9)**.
- **Interação Intuitiva com o Mouse**:
  - Clique esquerdo: pegar item, soltar stack, trocar de slot ou empilhar (máximo 64 por stack).
  - Clique direito: dividir stack pela metade ou soltar 1 unidade por vez.
- Destruição de blocos coleta os recursos para o inventário.
- Construção consome blocos do slot selecionado na Hotbar.

### 6. Sistema de Voo com Duplo Pulo
- Ativado com dois toques rápidos no <kbd>Espaço</kbd>.
- Gravidade desativada, movimentação livre no espaço com <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, subir com <kbd>Espaço</kbd> e descer com <kbd>Shift</kbd>.
- **Colisões preservadas**: o jogador não atravessa paredes sólidas nem mesmo durante o voo.
- Indicador animado **✈ MODO VOO** no HUD superior.

### 7. Novos Blocos com Texturas Procedurais
1. **Grama** (`BLOCK_GRASS`)
2. **Terra** (`BLOCK_DIRT`)
3. **Pedra** (`BLOCK_STONE`)
4. **Tronco de Madeira** (`BLOCK_WOOD`)
5. **Folhas** (`BLOCK_LEAVES`)
6. **Areia** (`BLOCK_SAND`)
7. **Minério de Carvão** (`BLOCK_COAL_ORE`)
8. **Minério de Ferro** (`BLOCK_IRON_ORE`)
9. **Vidro** (`BLOCK_GLASS`) - Translúcido
10. **Tábuas de Madeira** (`BLOCK_PLANKS`)
11. **Tijolos** (`BLOCK_BRICKS`)
12. **Água** (`BLOCK_WATER`) - Líquido translúcido com física de nado

---

## 🏗️ Arquitetura Modular dos Arquivos

```
Minecraft2/
├── index.html          # Layout dos menus, HUD, inventário e canvas 3D
├── style.css           # Estilização dark glassmorphism, inventário e HUD
├── package.json        # Scripts de execução
├── README.md           # Documentação completa do projeto
└── js/
    ├── libs/
    │   └── three.min.js# Three.js local para execução offline
    ├── blocks.js       # Definições, propriedades e Texture Atlas 16x16
    ├── terrain.js      # Gerador procedural de relevo, ruído Perlin e biomas
    ├── chunk.js        # Gerenciador de chunks 16x32x16 e malha BufferGeometry
    ├── world.js        # Mundo 128x32x128, raycasting DDA e árvores
    ├── physics.js      # Colisão AABB, gravidade, água e física de voo
    ├── inventory.js    # 36 slots, regras de empilhamento e manipulação de stacks
    ├── saveSystem.js   # Persistência em localStorage (deltas e metadados)
    ├── worldManager.js # Orquestração do ciclo de vida dos mundos
    ├── player.js       # Câmera, duplo pulo, quebra e colocação de blocos
    ├── ui.js           # Menus, lista de mundos, inventário visual e HUD
    ├── input.js        # Teclado, mouse, pointer lock e detecção de duplo pulo
    └── main.js         # Loop principal, Three.js e máquina de estados
```