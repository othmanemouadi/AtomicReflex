const ELEMENTS = [
  {name:"Hydrogen", symbol:"H",  Z:1,  A:1.008},
  {name:"Helium",   symbol:"He", Z:2,  A:4.0026},
  {name:"Carbon",   symbol:"C",  Z:6,  A:12.011},
  {name:"Nitrogen", symbol:"N",  Z:7,  A:14.007},
  {name:"Oxygen",   symbol:"O",  Z:8,  A:15.999},
  {name:"Sodium",   symbol:"Na", Z:11, A:22.990},
  {name:"Magnesium",symbol:"Mg", Z:12, A:24.305},
  {name:"Aluminum", symbol:"Al", Z:13, A:26.982},
  {name:"Silicon",  symbol:"Si", Z:14, A:28.085},
  {name:"Phosphorus",symbol:"P", Z:15, A:30.974},
  {name:"Sulfur",   symbol:"S",  Z:16, A:32.06},
  {name:"Chlorine", symbol:"Cl", Z:17, A:35.45},
  {name:"Potassium",symbol:"K",  Z:19, A:39.098},
  {name:"Calcium",  symbol:"Ca", Z:20, A:40.078},
  {name:"Iron",     symbol:"Fe", Z:26, A:55.845},
  {name:"Copper",   symbol:"Cu", Z:29, A:63.546},
  {name:"Zinc",     symbol:"Zn", Z:30, A:65.38},
  {name:"Silver",   symbol:"Ag", Z:47, A:107.868},
  {name:"Gold",     symbol:"Au", Z:79, A:196.967},
];

const $ = (id) => document.getElementById(id);
const canvas = $("c");
const ctx = canvas.getContext("2d");

function resize(){
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize", resize);

let state = {
  running:false,
  paused:false,
  sound:true,
  score:0,
  combo:0,
  lives:3,
  level:1,
  speedMul:1.0,
  spawnEvery:1200,
  lastSpawn:0,
  target: ELEMENTS[4],
  circles: [],
  particles: [],
  clicks:0,
  hits:0,
  highScore: Number(localStorage.getItem("atomfall_high") || 0),

  // penalties (tweak these easily)
  wrongClickPenaltyScore: 20,   // subtract score on wrong click
  wrongClickBreaksCombo: true,  // break combo on wrong click
};

$("highScore").textContent = state.highScore;

function pickTarget(){
  state.target = ELEMENTS[Math.floor(Math.random()*ELEMENTS.length)];
  $("targetName").textContent = state.target.name;
  $("targetMeta").textContent = `Z=${state.target.Z} • A≈${state.target.A}`;
  $("atomSymbolText").textContent = state.target.symbol;
  $("hudTarget").textContent = `Target: ${state.target.symbol}`;
}

function setMsg(text, kind="neutral"){
  const box = $("msgBox");
  box.classList.remove("good","bad","warn");
  if (kind==="good") box.classList.add("good");
  if (kind==="bad") box.classList.add("bad");
  if (kind==="warn") box.classList.add("warn");
  box.innerHTML = text;
}

function setLives(){
  $("lives").textContent = "❤".repeat(state.lives) + "♡".repeat(Math.max(0, 3-state.lives));
}

function setHUD(){
  $("score").textContent = state.score;
  $("combo").textContent = "x" + state.combo;
  $("difficultyPill").textContent = "Level " + state.level;
  $("hudSpeed").textContent = `Speed: ${state.speedMul.toFixed(1)}x`;
  $("hudSpawn").textContent = `Spawn: ${(state.spawnEvery/1000).toFixed(2)}s`;
  const acc = state.clicks === 0 ? 0 : Math.round((state.hits/state.clicks)*100);
  $("hudAcc").textContent = `Accuracy: ${acc}%`;
}

function bumpDifficulty(){
  const newLevel = 1 + Math.floor(state.score / 250);
  if (newLevel !== state.level){
    state.level = newLevel;
    state.speedMul = 1 + (state.level-1) * 0.12;
    state.spawnEvery = Math.max(420, 1200 - (state.level-1) * 70);
    setMsg(`⚡ Level up to <strong>${state.level}</strong>!`, "good");
  }
}

function rng(min,max){ return Math.random()*(max-min)+min; }

function makeCircle(){
  const w = canvas.getBoundingClientRect().width;
  const r = rng(22, 36);
  const x = rng(50, Math.max(80, w-50));
  const y = -r - rng(10, 120);

  // More correct circles over time so it stays playable
  const correctChance = Math.min(0.35 + state.level*0.02, 0.60);

  let el;
  if (Math.random() < correctChance){
    el = state.target;
  } else {
    do { el = ELEMENTS[Math.floor(Math.random()*ELEMENTS.length)]; }
    while (el.symbol === state.target.symbol);
  }

  const vy = rng(75, 135) * state.speedMul;

  return {
    x,y,r, vy,
    symbol: el.symbol,
    name: el.name,
    isCorrect: (el.symbol === state.target.symbol),
    wob: rng(0.8, 1.4),
    phase: rng(0, Math.PI*2),
    alive:true,
  };
}

function addParticles(x,y, good){
  const count = good ? 22 : 14;
  for (let i=0;i<count;i++){
    state.particles.push({
      x,y,
      vx: rng(-180,180),
      vy: rng(-260,-80),
      life: rng(0.35, 0.75),
      t:0,
      good
    });
  }
}

function playBeep(type){
  if (!state.sound) return;
  try{
    const ac = playBeep._ac || (playBeep._ac = new (window.AudioContext || window.webkitAudioContext)());
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    const now = ac.currentTime;
    o.type = "sine";

    if (type==="hit"){
      o.frequency.setValueAtTime(650, now);
      o.frequency.exponentialRampToValueAtTime(980, now + 0.06);
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      o.start(now); o.stop(now + 0.13);
    } else if (type==="miss"){
      o.frequency.setValueAtTime(220, now);
      o.frequency.exponentialRampToValueAtTime(140, now + 0.10);
      g.gain.setValueAtTime(0.09, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      o.start(now); o.stop(now + 0.17);
    } else {
      o.frequency.setValueAtTime(420, now);
      g.gain.setValueAtTime(0.06, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
      o.start(now); o.stop(now + 0.11);
    }
  }catch(e){}
}

function resetGame(){
  state.running=false;
  state.paused=false;
  state.score=0;
  state.combo=0;
  state.lives=3;
  state.level=1;
  state.speedMul=1.0;
  state.spawnEvery=1200;
  state.lastSpawn=0;
  state.circles=[];
  state.particles=[];
  state.clicks=0;
  state.hits=0;
  pickTarget();
  setLives();
  setHUD();
  setMsg("Rule: Only missing the correct symbol costs a life.");
  showOverlay(true);
}

function showOverlay(show){
  $("overlay").classList.toggle("show", !!show);
}

function start(){
  if (state.running) return;
  state.running=true;
  state.paused=false;
  showOverlay(false);
  setMsg("🎯 Only click the correct symbol. Ignore the rest.", "neutral");
  requestAnimationFrame(loop);
}

function pauseToggle(){
  if (!state.running) return;
  state.paused = !state.paused;
  setMsg(state.paused ? "⏸ Paused." : "▶ Back in motion.", state.paused ? "warn" : "neutral");
}

$("btnStart").addEventListener("click", start);
$("btnPlayNow").addEventListener("click", start);
$("btnPause").addEventListener("click", pauseToggle);
$("btnReset").addEventListener("click", () => { playBeep("tap"); resetGame(); });
$("btnSound").addEventListener("click", () => {
  state.sound = !state.sound;
  $("btnSound").textContent = state.sound ? "🔊 Sound: On" : "🔇 Sound: Off";
  setMsg(state.sound ? "Sound enabled." : "Sound muted.", "neutral");
  if (state.sound) playBeep("tap");
});

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "p") pauseToggle();
  if (k === "r") { playBeep("tap"); resetGame(); }
});

function clickAt(px, py){
  if (!state.running || state.paused) return;
  state.clicks++;

  for (let i = state.circles.length - 1; i >= 0; i--){
    const c = state.circles[i];
    if (!c.alive) continue;
    const dx = px - c.x;
    const dy = py - c.y;
    if (dx*dx + dy*dy <= c.r*c.r){
      if (c.isCorrect){
        state.hits++;
        state.combo++;
        const bonus = 30 + Math.min(12*state.combo, 220);
        state.score += bonus;
        addParticles(c.x, c.y, true);
        playBeep("hit");
        setMsg(`✅ Correct! <strong>+${bonus}</strong> (Combo x${state.combo})`, "good");

        // change target every 2 correct clicks (feels fast)
        if (state.combo % 2 === 0){
          pickTarget();
        }
      } else {
        // WRONG CLICK: no life loss, and no penalty for falling wrong ones
        if (state.wrongClickBreaksCombo) state.combo = 0;
        state.score = Math.max(0, state.score - state.wrongClickPenaltyScore);
        addParticles(c.x, c.y, false);
        playBeep("tap");
        setMsg(`😬 Wrong click. No life lost. (-${state.wrongClickPenaltyScore} score)`, "warn");
      }
      c.alive = false;
      bumpDifficulty();
      setHUD();
      return;
    }
  }

  // clicked empty: no life loss, just combo reset
  state.combo = 0;
  setMsg("💨 Miss-click (empty). No life lost.", "neutral");
  setHUD();
}

canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  clickAt(e.clientX - rect.left, e.clientY - rect.top);
});

function gameOver(){
  state.running=false;
  playBeep("miss");

  if (state.score > state.highScore){
    state.highScore = state.score;
    localStorage.setItem("atomfall_high", String(state.highScore));
    $("highScore").textContent = state.highScore;
    setMsg(`🏆 New High Score: <strong>${state.score}</strong>!`, "good");
  } else {
    setMsg(`💀 Game Over. Score: <strong>${state.score}</strong>.`, "bad");
  }
  showOverlay(true);
}

let lastT = 0;
function loop(t){
  if (!state.running) return;
  if (state.paused){ requestAnimationFrame(loop); return; }

  const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
  lastT = t;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt){
  state.lastSpawn += dt * 1000;
  while (state.lastSpawn >= state.spawnEvery){
    state.lastSpawn -= state.spawnEvery;
    state.circles.push(makeCircle());
    if (state.circles.length > 90) state.circles.splice(0, state.circles.length - 90);
  }

  const h = canvas.getBoundingClientRect().height;

  for (const c of state.circles){
    if (!c.alive) continue;
    c.phase += dt * 2.2;
    c.x += Math.sin(c.phase) * c.wob * 12 * dt;
    c.y += c.vy * dt;

    // FLOOR RULES:
    // - Correct circle hits floor -> lose life
    // - Wrong circle hits floor -> NO penalty
    if (c.y - c.r > h - 10){
      c.alive = false;

      if (c.isCorrect){
        state.combo = 0;
        state.lives--;
        playBeep("miss");
        addParticles(c.x, h-12, false);
        setLives();
        setMsg(`⛔ You missed the correct one! Lives left: <strong>${state.lives}</strong>`, "bad");
        if (state.lives <= 0){ gameOver(); return; }
      } else {
        // wrong circles just disappear silently
      }
      setHUD();
    }
  }

  state.particles = state.particles.filter(p => {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 520 * dt;
    return p.t < p.life;
  });
}

function draw(){
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  ctx.clearRect(0,0,w,h);

  // subtle grid
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  const step = 48;
  for (let x=0; x<w; x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y=0; y<h; y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  ctx.restore();

  // floor
  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = "rgba(255,255,255,0.20)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h-10);
  ctx.lineTo(w, h-10);
  ctx.stroke();
  ctx.restore();

  for (const c of state.circles){
    if (!c.alive) continue;

    const grad = ctx.createRadialGradient(c.x - c.r*0.35, c.y - c.r*0.35, c.r*0.1, c.x, c.y, c.r*1.2);

    // Make correct circles visually special (green-ish glow)
    if (c.isCorrect){
      grad.addColorStop(0, "rgba(34,197,94,0.98)");
      grad.addColorStop(0.55, "rgba(124,58,237,0.70)");
      grad.addColorStop(1, "rgba(255,255,255,0.10)");
    } else {
      grad.addColorStop(0, "rgba(255,255,255,0.22)");
      grad.addColorStop(0.55, "rgba(124,58,237,0.45)");
      grad.addColorStop(1, "rgba(255,255,255,0.06)");
    }

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(230,237,243,0.92)";
    ctx.font = `900 ${Math.floor(c.r*0.95)}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.symbol, c.x, c.y+1);
    ctx.restore();
  }

  for (const p of state.particles){
    const alpha = 1 - (p.t / p.life);
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = p.good ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

// boot
resize();
resetGame();
setHUD();
