<template>
  <q-page
    class="flex flex-center arcade-bg text-white q-pa-xs column justify-start"
    style="min-height: 100vh; overflow-y: auto"
    @click="focusGame"
  >
    <div
      ref="wrapperRef"
      class="column items-center justify-center q-gutter-xs bomberman-main-wrapper q-my-xs"
      tabindex="0"
    >
      <h6 style="margin-top: -25px">Bomberman Evolution Game</h6>

      <q-card style="margin-top: -20px" flat class="glass-hud q-px-sm q-py-xs full-width shadow-6">
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

      <div class="bomberman-container relative-position shadow-20">
        <canvas ref="canvasRef" width="525" height="455" class="bomberman-canvas"></canvas>

        <!-- Efeito de Confetes / Partículas de Vitória Épica -->
        <div v-if="isVictory" class="victory-confetti-container absolute-full pointer-events-none">
          <span
            v-for="n in 35"
            :key="n"
            class="confetti-piece"
            :style="getRandomConfettiStyle(n)"
          ></span>
        </div>

        <div
          v-if="isGameOver || isVictory"
          class="absolute-full flex flex-center overlay-bg column q-gutter-md rounded-borders q-pa-md"
        >
          <div
            class="text-h5 text-weight-bold text-center"
            :class="isVictory ? 'victory-title text-green-4 glow-effect' : 'text-red-5'"
          >
            {{ isVictory ? '🎉 VITÓRIA ÉPICA! 🎉' : '⚠️ GAME OVER ⚠️' }}
          </div>
          <div v-if="isVictory" class="text-subtitle2 text-amber-3 text-center q-mt-none">
            Parabéns! Salvaste a Galáxia com Sucesso! 🚀✨
          </div>
          <q-btn
            class="action-btn q-px-lg q-py-sm text-weight-bold animate-pulse"
            color="amber-6"
            text-color="dark"
            icon="replay"
            label="Jogar de Novo"
            @click="restartGame"
          />
        </div>
      </div>

      <div class="row items-center justify-between full-width q-px-xs q-mt-xs control-bar">
        <div class="row q-gutter-2x">
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

        <div class="row q-gutter-xs items-center">
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

          <q-btn
            color="green-8"
            text-color="white"
            icon="restart_alt"
            dense
            unelevated
            class="action-btn q-px-sm"
            @click="restartGame"
          />

          <q-btn
            color="deep-orange-9"
            text-color="white"
            icon="exit_to_app"
            dense
            unelevated
            class="action-btn q-px-sm"
            @click="exitGame"
          />
        </div>
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

// Gerador aleatório elegante para partículas de confete na vitória
const getRandomConfettiStyle = (n: number) => {
  const colors = ['#facc15', '#38bdf8', '#ef4444', '#4ade80', '#c084fc', '#fb923c'];
  const left = (n * 3.1) % 100;
  const animDuration = 2 + (n % 3);
  const animDelay = (n * 0.15) % 2;
  const size = 6 + (n % 6);
  return {
    left: `${left}%`,
    backgroundColor: colors[n % colors.length]!,
    width: `${size}px`,
    height: `${size * 1.4}px`,
    animationDuration: `${animDuration}s`,
    animationDelay: `${animDelay}s`,
  };
};

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
    engine.requestBomb();
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
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.code)) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (e.code === 'ArrowLeft') activeKeys.left = true;
  if (e.code === 'ArrowRight') activeKeys.right = true;
  if (e.code === 'ArrowUp') activeKeys.up = true;
  if (e.code === 'ArrowDown') activeKeys.down = true;
  updateEngineDirection();

  if (e.code === 'Space' && engine && !e.repeat) {
    engine.requestBomb();
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.code)) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (e.code === 'ArrowLeft') activeKeys.left = false;
  if (e.code === 'ArrowRight') activeKeys.right = false;
  if (e.code === 'ArrowUp') activeKeys.up = false;
  if (e.code === 'ArrowDown') activeKeys.down = false;
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

  window.addEventListener('keydown', handleKeyDown, { capture: true });
  window.addEventListener('keyup', handleKeyUp, { capture: true });
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
  overflow-x: hidden;
}

.bomberman-main-wrapper {
  max-width: 540px;
  width: 100%;
  margin: 0 auto;
  outline: none;
}

.glass-hud {
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.bomberman-container {
  background-color: #0b0f19;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  overflow: hidden;
  width: 100%;
  max-width: 525px;
  aspect-ratio: 525 / 455;
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
  width: 42px;
  height: 40px;
  font-size: 18px;
}

.action-btn {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: bold;
}

.overlay-bg {
  background-color: rgba(3, 7, 18, 0.92);
  backdrop-filter: blur(8px);
  z-index: 10;
}

/* Animações e Efeitos Visuais para a Vitória Épica */
.victory-confetti-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 5;
  pointer-events: none;
}

.confetti-piece {
  position: absolute;
  top: -20px;
  border-radius: 2px;
  animation: confettiFall linear infinite;
}

@keyframes confettiFall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(480px) rotate(720deg);
    opacity: 0.2;
  }
}

.glow-effect {
  text-shadow:
    0 0 20px rgba(74, 222, 128, 0.8),
    0 z 40px rgba(56, 189, 248, 0.6);
  animation: victoryPulse 1.5s ease-in-out infinite alternate;
}

@keyframes victoryPulse {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.06);
  }
}

/* Responsividade Adaptativa para Tablets e Smartphones */
@media (max-width: 560px) {
  .bomberman-main-wrapper {
    padding: 0 4px;
  }
  .arcade-key {
    width: 38px;
    height: 36px;
  }
  .action-btn {
    font-size: 10px;
    padding: 5px 8px;
  }
}

@media (max-height: 700px) {
  .arcade-bg {
    padding-top: 2px !important;
  }
  .bomberman-main-wrapper {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
  h6 {
    display: none;
  }
}
</style>
