// Minimal T-Rex runner (canvas, bez assetů)
const cvs = document.getElementById("game");
const ctx = cvs.getContext("2d");

// Rozměry světa
const W = cvs.width, H = cvs.height;
const GROUND_Y = H - 28;

// Herní stav
let running = false;
let gameOver = false;
let t = 0;              // čas v sekundách
let score = 0;
let hi = 0;

// Dino
const dino = {
  x: 40, y: GROUND_Y - 34, w: 36, h: 34,
  vy: 0, onGround: true, duck: false
};

// Překážky (kaktusy) a mraky
const cacti = [];
const clouds = [];

function rand(a,b){ return Math.random()*(b-a)+a; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function reset(){
  running = true; gameOver = false; t = 0; score = 0;
  dino.y = GROUND_Y - dino.h; dino.vy = 0; dino.onGround = true; dino.duck = false;
  cacti.length = 0; clouds.length = 0;
  // předvytvoř pár mraků
  for(let i=0;i<3;i++){
    clouds.push({x: rand(0,W), y: rand(20,80), v: rand(12,22)});
  }
}

function spawnCactus(){
  const h = Math.random()<0.5 ? 26 : 40; // malé/velké
  const w = h < 30 ? 12 : 18;
  cacti.push({x: W + rand(0,80), y: GROUND_Y - h, w, h, passed:false});
}

function spawnCloud(){
  clouds.push({x: W + rand(0,120), y: rand(18,72), v: rand(12,22)});
}

function jump(){
  if(!running || gameOver) return;
  if(dino.onGround){
    dino.vy = -420; // px/s
    dino.onGround = false;
  }
}
function duck(d){ dino.duck = d && dino.onGround; }

// Ovládání
window.addEventListener("keydown", e=>{
  if(e.code==="Space" || e.code==="ArrowUp"){ e.preventDefault(); if(!running) reset(); else jump(); }
  if(e.code==="ArrowDown"){ duck(true); }
  if(e.code==="KeyR"){ reset(); }
});
window.addEventListener("keyup", e=>{
  if(e.code==="ArrowDown"){ duck(false); }
});
cvs.addEventListener("pointerdown", ()=>{ if(!running) reset(); else jump(); });

// Herní smyčka – fixed timestep
let last = performance.now();
function loop(now){
  const dt = Math.min(0.032, (now - last)/1000); // do 32 ms
  last = now;
  if(running && !gameOver) update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt){
  t += dt;
  // rychlost světa lehce roste s časem
  const speed = 180 + Math.min(280, t*18); // px/s

  // gravitace
  dino.vy += 1500*dt;
  dino.y += dino.vy*dt;
  const targetH = dino.duck ? 22 : 34;
  dino.h += (targetH - dino.h)*0.25;

  // zem
  if(dino.y + dino.h >= GROUND_Y){
    dino.y = GROUND_Y - dino.h; dino.vy = 0; dino.onGround = true;
  }

  // spawn kaktusů
  if(cacti.length===0 || (W - cacti[cacti.length-1].x) > rand(160, 320)){
    spawnCactus();
  }

  // posun překážek
  for(const c of cacti){
    c.x -= speed*dt;
    // kolize AABB
    if(collide(dino, c)) die();
    if(!c.passed && c.x + c.w < dino.x){
      c.passed = true; score += 5;
      if(score>hi) hi=score;
    }
  }
  // odstranění mimo scénu
  while(cacti.length && cacti[0].x + cacti[0].w < -10) cacti.shift();

  // mraky
  if(Math.random()<0.02) spawnCloud();
  for(const cl of clouds){ cl.x -= cl.v*dt; }
  while(clouds.length && clouds[0].x < -60) clouds.shift();

  // skóre po čase
  score += Math.floor(dt*10);
}

function collide(a,b){
  // jednoduché AABB s malým „odsazením“ pro férovost
  const pad = 3;
  return !(a.x + a.w - pad < b.x ||
           a.x + pad > b.x + b.w ||
           a.y + a.h - pad < b.y ||
           a.y + pad > b.y + b.h);
}

function die(){
  gameOver = true; running = false;
}

function draw(){
  // pozadí
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,W,H);

  // zem – linka
  ctx.strokeStyle = "#9aa0a6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y+1);
  ctx.lineTo(W, GROUND_Y+1);
  ctx.stroke();

  // mraky
  for(const cl of clouds){
    ctx.fillStyle = "#e0e0e0";
    blob(cl.x, cl.y, 36, 10);
  }

  // kaktusy
  for(const c of cacti){
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(c.x, c.y, c.w, c.h);
    // malé „ručky“
    ctx.fillRect(c.x-3, c.y+8, 3, 10);
    ctx.fillRect(c.x+c.w, c.y+12, 3, 10);
  }

  // dino (obdélník + nožky)
  ctx.fillStyle = "#333333";
  ctx.fillRect(dino.x, dino.y, dino.w, dino.h);
  // hlava
  ctx.fillRect(dino.x + dino.w - 6, dino.y + 4, 10, 10);
  // oko
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(dino.x + dino.w + 1, dino.y + 6, 2, 2);

  // HUD (skóre už kreslí HTML, ale pro Game Over napíšeme zprávu)
  const sc = document.getElementById("score");
  const hiEl = document.getElementById("hi");
  sc.textContent = String(score).padStart(5,"0");
  hiEl.textContent = "HI " + String(hi).padStart(5,"0");

  if(!running && !gameOver){
    banner("Stiskni mezerník / tap pro start");
  } else if(gameOver){
    banner("GAME OVER — R = restart");
  }
}

function banner(text){
  ctx.fillStyle = "rgba(0,0,0,.6)";
  ctx.fillRect(W*0.18, H*0.28, W*0.64, 60);
  ctx.strokeStyle = "#ffd54f"; ctx.lineWidth = 2; ctx.strokeRect(W*0.18, H*0.28, W*0.64, 60);
  ctx.fillStyle = "#fff";
  ctx.font = "16px ui-monospace, Menlo, monospace";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(text, W/2, H*0.28+30);
}

function blob(x,y,w,h){
  ctx.beginPath();
  ctx.ellipse(x, y, w/2, h/2, 0, 0, Math.PI*2);
  ctx.fill();
}

// Start
reset();
requestAnimationFrame(loop);
