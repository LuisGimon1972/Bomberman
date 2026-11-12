<template>
  <q-page
    class="flex flex-center arcade-bg text-white q-pa-sm column justify-start"
    style="min-height: 100vh; overflow-y: auto"
    @click="focusGame"
  >
    <div
      ref="wrapperRef"
      class="column items-center justify-center q-gutter-sm bomberman-main-wrapper q-my-md"
      tabindex="0"
    >
      <h5 class="game-title q-my-sm">Bomberman Evolution</h5>

      <!-- HUD de Informações -->
      <q-card flat class="glass-hud q-px-sm q-py-none full-width shadow-6">
        <div
          class="row justify-between items-center text-weight-bold"
          style="font-size: 13px; line-height: 1.2"
        >
          <div>
            🏆 Pontos: <span class="text-green-4">{{ score }}</span>
          </div>
          <div>
            📈 Nível: <span class="text-amber-4">{{ level }}</span>
          </div>
          <div>
            ❤️ Vidas: <span class="text-red-4">{{ lives }}</span>
          </div>
        </div>
      </q-card>

      <!-- Contentor do Jogo / Canvas -->
      <div class="bomberman-container relative-position shadow-20">
        <canvas ref="canvasRef" width="600" height="520" class="bomberman-canvas"></canvas>

        <!-- Overlay de Fim de Jogo / Vitória -->
        <div
          v-if="isGameOver || isVictory"
          class="absolute-full flex flex-center overlay-bg column q-gutter-md rounded-borders q-pa-md"
        >
          <div
            class="text-h5 text-weight-bold text-center"
            :class="isVictory ? 'text-green-4' : 'text-red-5'"
          >
            {{ isVictory ? '🎉 VITÓRIA ÉPICA! 🎉' : '⚠️ GAME OVER ⚠️' }}
          </div>
          <q-btn
            class="action-btn"
            color="amber-6"
            text-color="dark"
            icon="replay"
            label="Jogar de Novo"
            @click="restartGame"
          />
        </div>
      </div>

      <!-- Barra de Controlos Táteis e de Ação para Telemóveis e Tablets -->
      <div class="row items-center justify-between full-width q-px-sm q-mt-xs">
        <!-- D-Pad Direcional -->
        <div class="row q-gutter-xs">
          <q-btn
            color="amber-8"
            text-color="dark"
            icon="arrow_back"
            dense
            unelevated
            class="arcade-key"
            @touchstart.prevent="setTouchMove(-1, 0)"
            @touchend.prevent="setTouchMove(0, 0)"
            @mousedown.prevent="setTouchMove(-1, 0)"
            @mouseup.prevent="setTouchMove(0, 0)"
            @mouseleave.prevent="setTouchMove(0, 0)"
          />
          <q-btn
            color="amber-8"
            text-color="dark"
            icon="arrow_forward"
            dense
            unelevated
            class="arcade-key"
            @touchstart.prevent="setTouchMove(1, 0)"
            @touchend.prevent="setTouchMove(0, 0)"
            @mousedown.prevent="setTouchMove(1, 0)"
            @mouseup.prevent="setTouchMove(0, 0)"
            @mouseleave.prevent="setTouchMove(0, 0)"
          />
          <q-btn
            color="amber-8"
            text-color="dark"
            icon="arrow_upward"
            dense
            unelevated
            class="arcade-key"
            @touchstart.prevent="setTouchMove(0, -1)"
            @touchend.prevent="setTouchMove(0, 0)"
            @mousedown.prevent="setTouchMove(0, -1)"
            @mouseup.prevent="setTouchMove(0, 0)"
            @mouseleave.prevent="setTouchMove(0, 0)"
          />
          <q-btn
            color="amber-8"
            text-color="dark"
            icon="arrow_downward"
            dense
            unelevated
            class="arcade-key"
            @touchstart.prevent="setTouchMove(0, 1)"
            @touchend.prevent="setTouchMove(0, 0)"
            @mousedown.prevent="setTouchMove(0, 1)"
            @mouseup.prevent="setTouchMove(0, 0)"
            @mouseleave.prevent="setTouchMove(0, 0)"
          />
        </div>

        <!-- Botão de Colocar Bomba -->
        <q-btn
          color="red-8"
          text-color="white"
          icon="radio_button_checked"
          label="Bomba"
          dense
          unelevated
          class="action-btn q-px-sm"
          @click="triggerBomb"
        />

        <!-- Botão Sair -->
        <q-btn
          color="deep-orange-9"
          text-color="white"
          icon="exit_to_app"
          label="Sair"
          dense
          unelevated
          class="action-btn q-px-sm"
          @click="exitGame"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { BombermanEngine } from '../game/BombermanEngine';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);

let engine: BombermanEngine | null = null;
let animationFrameId: number | null = null;

const score = ref(0);
const lives = ref(3);
const level = ref(1);
const isGameOver = ref(false);
const isVictory = ref(false);

const activeKeys = { left: false, right: false, up: false, down: false };

const updateEngineDirection = () => {
  if (!engine) return;
  let x = 0;
  let y = 0;
  if (activeKeys.left) x = -1;
  if (activeKeys.right) x = 1;
  if (activeKeys.up) y = -1;
  if (activeKeys.down) y = 1;
  engine.moveDir = { x, y };
};

const focusGame = () => {
  if (wrapperRef.value) {
    wrapperRef.value.focus({ preventScroll: true });
  }
};

const setTouchMove = (x: number, y: number) => {
  if (x === -1) {
    activeKeys.left = true;
    activeKeys.right = false;
  } else if (x === 1) {
    activeKeys.right = true;
    activeKeys.left = false;
  } else if (x === 0) {
    activeKeys.left = false;
    activeKeys.right = false;
  }

  if (y === -1) {
    activeKeys.up = true;
    activeKeys.down = false;
  } else if (y === 1) {
    activeKeys.down = true;
    activeKeys.up = false;
  } else if (y === 0) {
    activeKeys.up = false;
    activeKeys.down = false;
  }

  updateEngineDirection();
  focusGame();
};

const triggerBomb = () => {
  if (engine) {
    engine.placeBomb();
  }
  focusGame();
};

const exitGame = () => {
  if (window.history.length > 1) window.history.back();
  else isGameOver.value = true;
};

const restartGame = () => {
  if (engine) {
    engine.score = 0;
    engine.lives = 3;
    engine.level = 1;
    engine.isGameOver = false;
    engine.isVictory = false;
    engine.initLevel();
  }
  focusGame();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (e.key === 'ArrowLeft') activeKeys.left = true;
  if (e.key === 'ArrowRight') activeKeys.right = true;
  if (e.key === 'ArrowUp') activeKeys.up = true;
  if (e.key === 'ArrowDown') activeKeys.down = true;
  updateEngineDirection();

  if (e.key === ' ' && engine) {
    engine.placeBomb();
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (e.key === 'ArrowLeft') activeKeys.left = false;
  if (e.key === 'ArrowRight') activeKeys.right = false;
  if (e.key === 'ArrowUp') activeKeys.up = false;
  if (e.key === 'ArrowDown') activeKeys.down = false;
  updateEngineDirection();
};

const gameLoop = () => {
  if (engine && canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d');
    if (ctx) {
      engine.update();
      engine.render(ctx);

      score.value = engine.score;
      lives.value = engine.lives;
      level.value = engine.level;
      isGameOver.value = engine.isGameOver;
      isVictory.value = engine.isVictory;
    }
  }
  animationFrameId = requestAnimationFrame(gameLoop);
};

onMounted(() => {
  window.scrollTo(0, 0);

  if (canvasRef.value) {
    engine = new BombermanEngine();
    gameLoop();
  }

  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
  window.addEventListener('click', focusGame);

  setTimeout(() => {
    window.scrollTo(0, 0);
    focusGame();
    if (wrapperRef.value) {
      wrapperRef.value.focus();
    }
  }, 100);
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  window.removeEventListener('keydown', handleKeyDown, true);
  window.removeEventListener('keyup', handleKeyUp, true);
  window.removeEventListener('click', focusGame);
});
</script>

<style scoped>
.arcade-bg {
  width: 100%;
  min-height: 100vh;
  background-color: #030712;
  background-image: radial-gradient(
    circle at 50% 20%,
    rgba(30, 41, 59, 0.8) 0%,
    rgba(3, 7, 18, 1) 100%
  );
  overflow-y: auto;
}

.bomberman-main-wrapper {
  max-width: 620px;
  width: 100%;
  margin: 0 auto;
  outline: none;
}

.game-title {
  font-size: 1.15rem;
  font-weight: bold;
  text-align: center;
}

.glass-hud {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px !important;
}

.bomberman-container {
  background-color: #0b0f19;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  overflow: hidden;
  width: 100%;
  max-width: 600px;
  aspect-ratio: 600 / 520;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bomberman-canvas {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.arcade-key {
  width: 44px;
  height: 40px;
}

.action-btn {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
}

.overlay-bg {
  background-color: rgba(3, 7, 18, 0.95);
  backdrop-filter: blur(8px);
  z-index: 10;
}

/* Responsividade para Phones e Tablets */
@media (max-width: 600px) {
  .arcade-key {
    width: 38px;
    height: 36px;
  }
  .action-btn {
    font-size: 11px;
    padding: 4px 8px;
  }
}
</style>
