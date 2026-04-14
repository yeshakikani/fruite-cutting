import { useState, useEffect, useRef, useCallback } from "react";

const FRUITS = [
  { e: "🍉", c: "#2a8a2a", i: "#e84040", r: 32 },
  { e: "🍊", c: "#f07010", i: "#ffd070", r: 26 },
  { e: "🍎", c: "#cc2020", i: "#ffb0b0", r: 26 },
  { e: "🍋", c: "#d4bc10", i: "#ffffa0", r: 24 },
  { e: "🍇", c: "#7030b0", i: "#e0b0f0", r: 22 },
  { e: "🍑", c: "#f07848", i: "#ffe0c0", r: 24 },
  { e: "🍓", c: "#dd2030", i: "#ffb0b0", r: 22 },
  { e: "🥝", c: "#508020", i: "#c8e870", r: 24 },
  { e: "🍍", c: "#c8a010", i: "#fff090", r: 30 },
  { e: "🥭", c: "#e07020", i: "#ffe090", r: 28 },
];

const FLOAT_FRUITS = [
  { e: "🍉", l: "5%", d: "12s", delay: "0s" },
  { e: "🍊", l: "18%", d: "9s", delay: "2s" },
  { e: "🍋", l: "33%", d: "15s", delay: "4s", big: true },
  { e: "🍎", l: "52%", d: "10s", delay: "1s" },
  { e: "🍇", l: "68%", d: "13s", delay: "3s" },
  { e: "🍓", l: "82%", d: "8s", delay: "5s" },
  { e: "🍑", l: "93%", d: "11s", delay: "1.5s" },
];

export default function FruitNinja() {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const stateRef = useRef({
    gameState: "start",
    score: 0,
    lives: 3,
    highScore: 0,
    combo: 0,
    comboTimer: 0,
    spawnTimer: 0,
    spawnInterval: 1500,
    freezeActive: false,
    freezeTimer: 0,
    doubleActive: false,
    doubleTimer: 0,
    animId: null,
    lastTime: 0,
    fruits: [],
    bombs: [],
    particles: [],
    bladeTrail: [],
    mouseDown: false,
    prevX: -1,
    prevY: -1,
    W: 0,
    H: 0,
    stars: [],
    bgImg: null,
    bladeAngle: -Math.PI / 4,
  });

  const [uiState, setUiState] = useState({
    screen: "start",
    score: 0,
    lives: 3,
    highScore: 0,
    comboText: "",
    showCombo: false,
    freezeActive: false,
    doubleActive: false,
  });

  const updateUI = useCallback((updates) => {
    setUiState((prev) => ({ ...prev, ...updates }));
  }, []);



  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const W = (canvas.width = wrapper.clientWidth);
    const H = (canvas.height = wrapper.clientHeight);
    const s = stateRef.current;
    s.W = W;
    s.H = H;
  }, []);

  const sc = useCallback(() => {
    const { W, H } = stateRef.current;
    return Math.min(W, H) / 650;
  }, []);

  const emitP = useCallback((x, y, c1, c2) => {
    const s = stateRef.current;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 8;
      s.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2,
        r: 3 + Math.random() * 6,
        color: Math.random() < 0.5 ? c1 : c2,
        alpha: 1,
        life: 0.6 + Math.random() * 0.5,
      });
    }
  }, []);

  const emitBomb = useCallback((x, y) => {
    const s = stateRef.current;
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 10;
      s.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 3 + Math.random() * 8,
        color: Math.random() < 0.5 ? "#ff5500" : "#ffdd00",
        alpha: 1,
        life: 1 + Math.random() * 0.5,
      });
    }
  }, []);

  const endGame = useCallback(() => {
    const s = stateRef.current;
    s.gameState = "over";
    if (s.animId) cancelAnimationFrame(s.animId);
    const newHigh = Math.max(s.score, s.highScore);
    s.highScore = newHigh;
    updateUI({ screen: "over", highScore: newHigh });
  }, [updateUI]);

  const loseLife = useCallback(() => {
    const s = stateRef.current;
    s.lives--;
    updateUI({ lives: s.lives });
    if (s.lives <= 0) {
      // Small delay so they can see the final bomb explosion
      setTimeout(() => {
        if (stateRef.current.gameState === "playing") endGame();
      }, 1000);
    }
  }, [endGame, updateUI]);

  const showComboFn = useCallback((n) => {
    updateUI({ comboText: `${n}x COMBO!`, showCombo: true });
    setTimeout(() => updateUI({ showCombo: false }), 900);
  }, [updateUI]);

  const checkSlice = useCallback((mx, my, px, py) => {
    const s = stateRef.current;
    if (!s.mouseDown || px < 0) return;
    if (Math.sqrt((mx - px) ** 2 + (my - py) ** 2) < 2) return;

    for (let i = 0; i < s.fruits.length; i++) {
      const f = s.fruits[i];
      if (!f.alive || f.sliced) continue;
      const dx = f.x - mx, dy = f.y - my;
      if (Math.sqrt(dx * dx + dy * dy) < f.r * 1.25) {
        f.sliced = true;
        f.alive = false;
        emitP(f.x, f.y, f.c, f.i);
        s.score += s.doubleActive ? 2 : 1;
        s.combo++;
        s.comboTimer = 140;
        if (s.combo >= 3) showComboFn(s.combo);
        updateUI({ score: s.score });
      }
    }
    for (let j = 0; j < s.bombs.length; j++) {
      const b = s.bombs[j];
      if (!b.alive) continue;
      const bx = b.x - mx, by = b.y - my;
      if (Math.sqrt(bx * bx + by * by) < b.r * 1.2) {
        b.alive = false;
        emitBomb(b.x, b.y);
        loseLife();
        return;
      }
    }
  }, [emitP, emitBomb, loseLife, showComboFn, updateUI]);

  const drawBG = useCallback((ctx) => {
    const { W, H, bgImg } = stateRef.current;
    if (bgImg && bgImg.complete) {
      ctx.drawImage(bgImg, 0, 0, W, H);
    } else {
      ctx.fillStyle = "#2b1a0a";
      ctx.fillRect(0, 0, W, H);
    }
  }, []);

  const drawFruit = useCallback((ctx, f) => {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.beginPath();
    ctx.arc(0, 0, f.r, 0, Math.PI * 2);
    ctx.fillStyle = f.c;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-f.r * 0.12, -f.r * 0.12, f.r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = f.i;
    ctx.globalAlpha = 0.42;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(0, 0, f.r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = `${f.r * 1.25}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(f.e, 0, f.r * 0.05);
    ctx.restore();
  }, []);

  const drawBomb = useCallback((ctx, b) => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fillStyle = "#181818";
    ctx.fill();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -b.r);
    ctx.lineTo(5, -b.r - 13);
    ctx.strokeStyle = "#ffaa00";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.font = `${b.r * 1.5}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💣", 0, 2);
    ctx.restore();
  }, []);

  const drawTrail = useCallback((ctx) => {
    const { bladeTrail } = stateRef.current;
    if (bladeTrail.length < 2) return;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Draw multiple layers for a "super sharp" energy blade look
    for (let i = 1; i < bladeTrail.length; i++) {
      const p1 = bladeTrail[i - 1];
      const p2 = bladeTrail[i];
      const alpha = p2.a;
      const size = i / bladeTrail.length;

      // Outer energy glow (Cyan/Blue)
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(0, 190, 255, ${alpha * 0.4})`;
      ctx.lineWidth = 14 * size * alpha;
      ctx.stroke();

      // Sharp white core
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx.lineWidth = 4 * size * alpha;
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const drawKnife = useCallback((ctx) => {
    const s = stateRef.current;
    if (!s.mouseDown || s.prevX < 0) return;

    ctx.save();
    ctx.translate(s.prevX, s.prevY);

    const trail = s.bladeTrail;
    let targetAngle = s.bladeAngle;

    // Calculate target angle using points further apart for stability
    if (trail.length > 5) {
      const pStart = trail[trail.length - 5];
      const pEnd = trail[trail.length - 1];
      const dist = Math.sqrt((pEnd.x - pStart.x) ** 2 + (pEnd.y - pStart.y) ** 2);

      if (dist > 5) { // Only update if there is significant movement
        targetAngle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x) - Math.PI / 2;
      }
    }

    // Smooth intersection/easing to prevent "hilna" (wobbling)
    let diff = targetAngle - s.bladeAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    s.bladeAngle += diff * 0.2; // Smoothness factor

    ctx.rotate(s.bladeAngle);

    // --- LEGENDARY KATANA ---

    // Shadow / Outer Glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(0, 150, 255, 0.5)";

    // Hilt / Handle (Tsuka)
    ctx.fillStyle = "#111"; // Deep black
    ctx.beginPath();
    ctx.roundRect(-4, -5, 8, 25, 3);
    ctx.fill();

    // Handle Wrap (Tsuka-ito)
    ctx.strokeStyle = "#800"; // Dark Crimson
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 18; i += 6) {
      ctx.beginPath();
      ctx.moveTo(-4, i);
      ctx.lineTo(4, i + 3);
      ctx.stroke();
    }

    // Guard (Tsuba) - Gold Octagon
    ctx.fillStyle = "#FFD700";
    ctx.strokeStyle = "#B8860B";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 10;
      ctx.lineTo(Math.cos(a) * r, 20 + Math.sin(a) * r * 0.4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // The Blade (Nagasa) - Improved curved look
    ctx.beginPath();
    ctx.moveTo(-2.5, 23);
    ctx.lineTo(2.5, 23);
    ctx.quadraticCurveTo(4, 70, 0, 110); // Subtle curve to the tip
    ctx.quadraticCurveTo(-4, 70, -2.5, 23);
    ctx.closePath();

    const bladeGrad = ctx.createLinearGradient(-3, 23, 3, 23);
    bladeGrad.addColorStop(0, "#444");   // Back edge
    bladeGrad.addColorStop(0.2, "#888");
    bladeGrad.addColorStop(0.5, "#eee"); // Middle shine
    bladeGrad.addColorStop(0.8, "#fff"); // Cutting edge (Hamon)
    bladeGrad.addColorStop(1, "#aaa");
    ctx.fillStyle = bladeGrad;
    ctx.fill();

    // Blade Polish / Edge Highlight
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Blood Grooves or Design
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(0, 90);
    ctx.stroke();

    ctx.restore();
  }, []);

  const spawnFruit = useCallback(() => {
    const s = stateRef.current;
    const fd = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const r = fd.r * sc();
    const x = r * 2 + Math.random() * (s.W - r * 4);
    s.fruits.push({
      e: fd.e, c: fd.c, i: fd.i, r,
      x, y: s.H + r,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.sqrt(s.H * 0.40) * (0.85 + Math.random() * 0.15),
      rot: 0,
      rv: (Math.random() - 0.5) * 0.15,
      alive: true,
      sliced: false,
    });
  }, [sc]);

  const spawnBomb = useCallback(() => {
    const s = stateRef.current;
    const r = 24 * sc();
    const x = r * 2 + Math.random() * (s.W - r * 4);
    s.bombs.push({
      x, y: s.H + r,
      r,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.sqrt(s.H * 0.36) * (0.85 + Math.random() * 0.15),
      rot: 0,
      rv: (Math.random() - 0.5) * 0.12,
      alive: true,
    });
  }, [sc]);

  const gameLoop = useCallback((ts) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = stateRef.current;
    if (s.gameState !== "playing") return;

    s.animId = requestAnimationFrame(gameLoop);
    const dt = Math.min((ts - s.lastTime) / 16.67, 3);
    s.lastTime = ts;

    const grav = s.freezeActive ? 0.04 : 0.18;
    const speed = s.freezeActive ? 0.14 : 0.8;

    s.spawnTimer += dt;
    if (s.spawnTimer > s.spawnInterval / 16.67) {
      s.spawnTimer = 0;
      s.spawnInterval = Math.max(550, s.spawnInterval - 4);
      spawnFruit();
      if (Math.random() < 0.22) spawnFruit();
      if (Math.random() < (s.score > 30 ? 0.27 : 0.13)) spawnBomb();
    }

    for (const f of s.fruits) {
      if (!f.alive) continue;
      f.vy += grav;
      f.x += f.vx * speed;
      f.y += f.vy * speed;
      f.rot += f.rv * speed;
      if (f.y > s.H + 90) {
        f.alive = false;
      }
    }
    for (const b of s.bombs) {
      if (!b.alive) continue;
      b.vy += grav;
      b.x += b.vx * speed;
      b.y += b.vy * speed;
      b.rot += b.rv * speed;
      if (b.y > s.H + 70) b.alive = false;
    }
    for (const p of s.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18;
      p.alpha -= 0.025 / p.life;
    }

    if (s.comboTimer > 0) { s.comboTimer -= dt; if (s.comboTimer <= 0) s.combo = 0; }
    if (s.freezeTimer > 0) {
      s.freezeTimer -= dt;
      if (s.freezeTimer <= 0) { s.freezeActive = false; updateUI({ freezeActive: false }); }
    }
    if (s.doubleTimer > 0) {
      s.doubleTimer -= dt;
      if (s.doubleTimer <= 0) { s.doubleActive = false; updateUI({ doubleActive: false }); }
    }
    if (Math.random() < 0.0009) { s.freezeActive = true; s.freezeTimer = 270; updateUI({ freezeActive: true }); }
    if (Math.random() < 0.0007) { s.doubleActive = true; s.doubleTimer = 330; updateUI({ doubleActive: true }); }

    s.bladeTrail = s.bladeTrail
      .filter((p) => p.a > 0.03)
      .map((p) => ({ x: p.x, y: p.y, a: p.a * 0.78 }));
    s.fruits = s.fruits.filter((f) => f.alive);
    s.bombs = s.bombs.filter((b) => b.alive);
    s.particles = s.particles.filter((p) => p.alpha > 0);

    drawBG(ctx);
    drawTrail(ctx);
    for (const f of s.fruits) drawFruit(ctx, f);
    for (const b of s.bombs) drawBomb(ctx, b);
    for (const pt of s.particles) {
      if (pt.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(0.5, pt.r), 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
      ctx.restore();
    }
    drawKnife(ctx);
  }, [drawBG, drawTrail, drawFruit, drawBomb, spawnFruit, spawnBomb, loseLife, updateUI, drawKnife]);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.score = 0;
    s.lives = 3;
    s.combo = 0;
    s.comboTimer = 0;
    s.spawnTimer = 0;
    s.spawnInterval = 1500;
    s.freezeActive = false;
    s.doubleActive = false;
    s.freezeTimer = 0;
    s.doubleTimer = 0;
    s.fruits = [];
    s.bombs = [];
    s.particles = [];
    s.bladeTrail = [];
    s.mouseDown = false;
    s.prevX = -1;
    s.prevY = -1;
    s.gameState = "playing";
    s.lastTime = performance.now();
    if (s.animId) cancelAnimationFrame(s.animId);
    updateUI({ screen: "playing", score: 0, lives: 3, showCombo: false, freezeActive: false, doubleActive: false });
    s.animId = requestAnimationFrame(gameLoop);
  }, [gameLoop, updateUI]);

  const getXY = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = "/wood.png";
    img.onload = () => {
      stateRef.current.bgImg = img;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("fullscreenchange", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("fullscreenchange", resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e) => {
      const s = stateRef.current;
      s.mouseDown = true;
      const p = getXY(e);
      s.prevX = p.x;
      s.prevY = p.y;
    };
    const onMouseUp = () => {
      const s = stateRef.current;
      s.mouseDown = false;
      s.prevX = -1;
      s.prevY = -1;
    };
    const onMouseMove = (e) => {
      const s = stateRef.current;
      const p = getXY(e);
      if (s.mouseDown && s.gameState === "playing") {
        s.bladeTrail.push({ x: p.x, y: p.y, a: 1 });
        checkSlice(p.x, p.y, s.prevX, s.prevY);
      }
      s.prevX = p.x;
      s.prevY = p.y;
    };
    const onTouchStart = (e) => {
      e.preventDefault();
      const s = stateRef.current;
      s.mouseDown = true;
      const p = getXY(e);
      s.prevX = p.x;
      s.prevY = p.y;
    };
    const onTouchEnd = (e) => {
      e.preventDefault();
      const s = stateRef.current;
      s.mouseDown = false;
      s.prevX = -1;
      s.prevY = -1;
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      const s = stateRef.current;
      const p = getXY(e);
      if (s.gameState === "playing") {
        s.bladeTrail.push({ x: p.x, y: p.y, a: 1 });
        checkSlice(p.x, p.y, s.prevX, s.prevY);
      }
      s.prevX = p.x;
      s.prevY = p.y;
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, [getXY, checkSlice]);

  const handleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  };

  const { screen, score, lives, highScore, comboText, showCombo, freezeActive, doubleActive } = uiState;

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100vw", height: "100vh", position: "relative",
        overflow: "hidden", fontFamily: "Arial, sans-serif",
        background: "#000", userSelect: "none",
      }}
    >
      <style>{`
        @keyframes rise {
          from { transform: translateY(110vh) rotate(0deg); }
          to   { transform: translateY(-20vh) rotate(360deg); }
        }
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .float-fruit {
          position: absolute; font-size: 52px; opacity: 0.12;
          pointer-events: none; animation: rise linear infinite;
        }
        .heart {
          width: 24px; height: 24px; background: #ff3333;
          border-radius: 50%; border: 2px solid #ff8888;
          box-shadow: 0 0 6px rgba(255,0,0,0.5);
        }
        .heart.dead { background: #333; border-color: #555; box-shadow: none; }
        .badge {
          background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px; padding: 4px 12px; font-size: 12px;
          color: rgba(255,255,255,0.4); opacity: 0; transition: opacity 0.3s;
        }
        .badge.active { opacity: 1; color: #FFD700; border-color: gold; }
        .portrait-overlay {
          display: none; box-sizing: border-box;
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: #000; z-index: 9999; color: white;
          align-items: center; justify-content: center; flex-direction: column;
          text-align: center; padding: 20px;
        }
        .portrait-overlay p {
          max-width: 90vw; word-wrap: break-word; font-size: 1.2rem; line-height: 1.5; margin: 0;
        }
        @media screen and (orientation: portrait) and (max-width: 900px) {
          .portrait-overlay { display: flex; }
        }
      `}</style>

      {/* Portrait Overlay */}
      <div className="portrait-overlay">
        <div style={{ fontSize: "64px", margin: "20px", transform: "rotate(90deg)" }}>📱</div>
        <p>Please rotate your device to <b>landscape mode</b> to play.</p>
      </div>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "100%",
          display: "block", cursor: uiState.screen === "playing" ? "none" : "crosshair", zIndex: 1,
        }}
      />

      {/* HUD */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%",
        padding: "16px 24px", display: "flex",
        justifyContent: "space-between", alignItems: "flex-start",
        pointerEvents: "none", zIndex: 5, boxSizing: "border-box",
      }}>
        <div style={{ color: "#fff", fontSize: 28, fontWeight: "bold", textShadow: "1px 1px 4px #000" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2 }}>SCORE</div>
          <span>{score}</span>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 4 }} role="status" aria-label={`${lives} lives remaining`}>
          <div className={`heart${lives < 1 ? " dead" : ""}`} aria-hidden="true" />
          <div className={`heart${lives < 2 ? " dead" : ""}`} aria-hidden="true" />
          <div className={`heart${lives < 3 ? " dead" : ""}`} aria-hidden="true" />
        </div>
      </div>

      {/* Combo Text */}
      <div style={{
        position: "absolute", top: 65, left: "50%",
        transform: "translateX(-50%)", fontSize: 22, fontWeight: "bold",
        color: "#FFD700", textShadow: "0 0 12px gold",
        pointerEvents: "none", opacity: showCombo ? 1 : 0,
        transition: "opacity 0.3s", zIndex: 5, whiteSpace: "nowrap",
      }}>
        {comboText}
      </div>

      {/* Power-ups */}
      <div style={{
        position: "absolute", bottom: 16, left: "50%",
        transform: "translateX(-50%)", display: "flex",
        gap: 8, pointerEvents: "none", zIndex: 5,
      }}>
        <div className={`badge${freezeActive ? " active" : ""}`}>❄ FREEZE</div>
        <div className={`badge${doubleActive ? " active" : ""}`}>✦ DOUBLE</div>
      </div>

      {/* Fullscreen Button */}
      <button
        onClick={handleFullscreen}
        style={{
          position: "absolute", bottom: 16, right: 20,
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 8, padding: "6px 14px",
          fontSize: 12, color: "rgba(255,255,255,0.6)",
          cursor: "pointer", zIndex: 20,
        }}
      >
        ⛶ Fullscreen
      </button>

      {/* Visually hidden text for SEO */}
      <h1 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        Fruit Cutting - Ultimate Slicing Game
      </h1>
      <div style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        <p>Slice fruits like watermelon, orange, apple, lemon, grape, and more. Avoid bombs to survive. Game features freeze and double score power-ups.</p>
      </div>

      {/* Start Screen */}
      {screen === "start" && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          background: "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4)), url('/wood.png') no-repeat center center / cover",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          {FLOAT_FRUITS.map((f, i) => (
            <span key={i} className="float-fruit" style={{
              left: f.l,
              animationDuration: f.d,
              animationDelay: f.delay,
              fontSize: f.big ? 64 : 52,
            }}>{f.e}</span>
          ))}

          <div style={{
            fontSize: "clamp(32px, 14vh, 78px)", fontWeight: 900,
            background: "linear-gradient(135deg,#ff6b35,#FFD700,#ff6b35)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text", marginBottom: "1vh", letterSpacing: 3,
            margin: 0,
          }}>Fruit Ninja</div>

          <div style={{ fontSize: "clamp(10px, 3.5vh, 14px)", color: "rgba(255,255,255,0.35)", letterSpacing: 5, marginBottom: "5vh" }}>
            SLICE · DODGE · SURVIVE
          </div>

          <div style={{ display: "flex", gap: "max(1vw, 8px)", marginBottom: "6vh" }}>
            {[
              { icon: "🍉", text: "SLICE FRUITS" },
              { icon: "💣", text: "3 BOMBS = END" },
              { icon: "❤️", text: "3 LIVES" },
              { icon: "❄️", text: "POWER-UPS" },
            ].map((rule, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.3)",
                backdropFilter: "blur(8px)",
                borderRadius: "clamp(8px, 2vh, 16px)", padding: "clamp(8px, 2vh, 18px) clamp(10px, 2vw, 24px)",
                textAlign: "center", minWidth: "clamp(75px, 15vw, 105px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}>
                <span role="img" aria-label={rule.text} style={{ fontSize: "clamp(24px, 7vh, 38px)", display: "block", marginBottom: "1vh" }}>{rule.icon}</span>
                <span style={{ fontSize: "clamp(8px, 2vh, 11px)", color: "#222", letterSpacing: 1, fontWeight: "bold" }}>{rule.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={startGame}
            style={{
              background: "linear-gradient(135deg,#ff6b35,#cc2200)",
              color: "#fff", border: "none", borderRadius: "clamp(8px, 2vh, 16px)",
              padding: "clamp(12px, 3vh, 18px) clamp(40px, 10vw, 72px)", fontSize: "clamp(16px, 4vh, 22px)", fontWeight: "bold",
              cursor: "pointer", letterSpacing: 1,
              boxShadow: "0 6px 30px rgba(255,100,50,0.5)",
              position: "relative", zIndex: 60,
            }}
          >
            ▶  Play Now
          </button>

          <div style={{ fontSize: "clamp(10px, 2.5vh, 13px)", color: "rgba(255,255,255,0.25)", marginTop: "2vh", letterSpacing: 1 }}>
            Best Score: {highScore}
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {screen === "over" && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "linear-gradient(145deg, rgba(30,10,20,0.95), rgba(15,5,10,0.95))",
            border: "1px solid rgba(255, 50, 50, 0.3)",
            borderRadius: "min(32px, 5vh)",
            padding: "clamp(15px, 4vh, 60px) clamp(20px, 6vw, 80px)",
            display: "flex", flexDirection: "column", alignItems: "center",
            boxShadow: "0 20px 60px rgba(255,0,0,0.2), inset 0 0 40px rgba(255,50,50,0.05)",
            animation: "popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
            boxSizing: "border-box", maxHeight: "95vh", overflowY: "auto", maxWidth: "95vw"
          }}>
            <div role="img" aria-label="Explosion" style={{ fontSize: "clamp(24px, 8vh, 72px)", marginBottom: "0.5vh", lineHeight: 1 }}>💥</div>
            <div style={{ fontSize: "clamp(20px, 6vh, 46px)", fontWeight: 900, color: "#ff4444", marginBottom: "0", letterSpacing: 3, textTransform: "uppercase" }}>
              Game Over
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: "1.5vh", marginBottom: "0" }}>
              <div style={{ fontSize: "clamp(40px, 12vh, 90px)", fontWeight: 900, color: "#FFD700", textShadow: "0 0 30px rgba(255, 215, 0, 0.6)", lineHeight: 1 }}>
                {score}
              </div>
            </div>

            <div style={{ fontSize: "clamp(10px, 2vh, 14px)", color: "rgba(255,255,255,0.4)", letterSpacing: 4, marginBottom: "3vh", textTransform: "uppercase" }}>
              Final Score
            </div>

            <button
              onClick={startGame}
              style={{
                background: "linear-gradient(135deg, #ff4444, #cc0000)",
                color: "#fff", border: "none", borderRadius: "clamp(8px, 2vh, 24px)",
                padding: "clamp(10px, 2vh, 20px) clamp(30px, 8vw, 90px)", fontSize: "clamp(14px, 3vh, 24px)", fontWeight: "bold",
                cursor: "pointer", letterSpacing: 2, textTransform: "uppercase",
                boxShadow: "0 10px 30px rgba(255,50,50,0.4)",
                transition: "transform 0.2s, box-shadow 0.2s",
                position: "relative", zIndex: 60, flexShrink: 0
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(255,50,50,0.6)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(255,50,50,0.4)'; }}
            >
              Play Again
            </button>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: "2vh" }}>
              <div role="img" aria-label="Crown" style={{ fontSize: "clamp(16px, 3.5vh, 20px)" }}>👑</div>
              <div style={{ fontSize: "clamp(13px, 3.5vh, 16px)", color: "rgba(255,255,255,0.6)", letterSpacing: 1, fontWeight: "bold" }}>
                Best: <span style={{ color: "#FFD700" }}>{highScore}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
