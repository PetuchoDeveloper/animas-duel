/**
 * Renders the 3 Mexican Hat (Sombrero) arenas with increasing damage states:
 * Level 1: Pristine Velvet & Gold Charro Sombrero
 * Level 2: Battle-Cracked & Torn Sombrero with Spirit Embers
 * Level 3: Shattered Mictlán Hat fragmented into floating obsidian islands
 */

export interface SombreroStageRenderer {
  renderBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    stageIdx: number
  ): void;
  renderHatPlatform(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    stageIdx: number
  ): void;
  renderForeground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    stageIdx: number
  ): void;
}

export class SombreroStageSystem implements SombreroStageRenderer {
  // Parallax star / particle positions
  private stars: { x: number; y: number; s: number; alpha: number }[] = [];
  private petals: { x: number; y: number; vx: number; vy: number; rot: number; vRot: number; size: number }[] = [];

  constructor() {
    // Initialize ambient stars
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        s: Math.random() * 2 + 1,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    // Initialize floating cempasúchil (marigold) petals
    for (let i = 0; i < 45; i++) {
      this.petals.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.05 + 0.02,
        vy: Math.random() * 0.04 + 0.02,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 2,
        size: Math.random() * 6 + 4,
      });
    }
  }

  update(dt: number) {
    for (const p of this.petals) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vRot * dt;
      if (p.y > 1.05) {
        p.y = -0.05;
        p.x = Math.random();
      }
      if (p.x > 1.05) p.x = -0.05;
      if (p.x < -0.05) p.x = 1.05;
    }
  }

  renderBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    stageIdx: number
  ) {
    // 1. Sky Gradients based on stage
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (stageIdx === 0) {
      // Stage 1: Festive Midnight Blue & Warm Amber Plaza glow
      skyGrad.addColorStop(0, '#0f172a'); // deep navy
      skyGrad.addColorStop(0.55, '#1e1b4b'); // twilight indigo
      skyGrad.addColorStop(1, '#451a03'); // warm candlelight glow
    } else if (stageIdx === 1) {
      // Stage 2: Stormy Twilight Purple & Sunset Orange
      skyGrad.addColorStop(0, '#180e29'); // dark violet
      skyGrad.addColorStop(0.5, '#4c1d95'); // royal purple
      skyGrad.addColorStop(1, '#7c2d12'); // stormy ember red
    } else {
      // Stage 3: Mythic Mictlán Abyss with Soul Fire
      skyGrad.addColorStop(0, '#05010d'); // obsidian black
      skyGrad.addColorStop(0.4, '#2e1065'); // deep nether violet
      skyGrad.addColorStop(0.85, '#581c87'); // spectral magenta
      skyGrad.addColorStop(1, '#831843'); // blood underworld red
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Stars / Spirits
    ctx.save();
    for (const s of this.stars) {
      const pulse = Math.sin(time * 2 + s.x * 20) * 0.3 + 0.7;
      ctx.fillStyle = stageIdx === 2 ? '#c084fc' : '#fef08a';
      ctx.globalAlpha = s.alpha * pulse;
      ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
    }
    ctx.restore();

    // 3. Distant City / Mountains / Skull Monuments
    if (stageIdx === 0) {
      this.drawLevel1PlazaBackground(ctx, w, h, time);
    } else if (stageIdx === 1) {
      this.drawLevel2StormMountains(ctx, w, h, time);
    } else {
      this.drawLevel3MictlanMonuments(ctx, w, h, time);
    }
  }

  private drawLevel1PlazaBackground(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Distant Mexican colonial church silhouette and bell towers with warm windows
    ctx.fillStyle = '#0b0f19';
    const baseY = h * 0.7;
    // Church dome
    ctx.beginPath();
    ctx.arc(w * 0.5, baseY - 50, 70, Math.PI, 0, false);
    ctx.rect(w * 0.42, baseY - 50, w * 0.16, 50);
    // Left tower
    ctx.rect(w * 0.28, baseY - 120, 45, 120);
    // Right tower
    ctx.rect(w * 0.67, baseY - 120, 45, 120);
    ctx.fill();

    // Tower crosses
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.3 + 12, baseY - 135);
    ctx.lineTo(w * 0.3 + 12, baseY - 118);
    ctx.moveTo(w * 0.3 + 4, baseY - 128);
    ctx.lineTo(w * 0.3 + 20, baseY - 128);
    ctx.moveTo(w * 0.69 + 12, baseY - 135);
    ctx.lineTo(w * 0.69 + 12, baseY - 118);
    ctx.moveTo(w * 0.69 + 4, baseY - 128);
    ctx.lineTo(w * 0.69 + 20, baseY - 128);
    ctx.stroke();

    // Festive Papel Picado Strings across the sky
    this.drawPapelPicado(ctx, w, h * 0.18, time, false);
    this.drawPapelPicado(ctx, w, h * 0.28, time * 1.2, true);
  }

  private drawLevel2StormMountains(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Jagged volcanic mountain peaks with stormy lightning flash
    const baseY = h * 0.72;
    ctx.fillStyle = '#1c1328';
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(w * 0.18, baseY - 90);
    ctx.lineTo(w * 0.35, baseY - 50);
    ctx.lineTo(w * 0.52, baseY - 130);
    ctx.lineTo(w * 0.7, baseY - 70);
    ctx.lineTo(w * 0.88, baseY - 110);
    ctx.lineTo(w, baseY - 40);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Lightning flash periodically
    const flash = Math.sin(time * 1.5) > 0.96 ? 0.35 : 0;
    if (flash > 0) {
      ctx.fillStyle = `rgba(192, 132, 252, ${flash})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Torn windblown Papel Picado with shredded edges
    this.drawTornPapelPicado(ctx, w, h * 0.22, time);
  }

  private drawLevel3MictlanMonuments(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Giant ancient Aztec skull monuments and temple steps of Mictlán
    const baseY = h * 0.75;
    ctx.fillStyle = '#120422';
    // Colossal skull silhouette in the center
    ctx.beginPath();
    ctx.arc(w * 0.5, baseY - 100, 85, 0, Math.PI * 2);
    ctx.rect(w * 0.44, baseY - 40, w * 0.12, 40);
    ctx.fill();

    // Glowing spectral eyes in the giant monument skull
    const eyeGlow = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(168, 85, 247, ${eyeGlow})`;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(w * 0.47, baseY - 110, 14, 0, Math.PI * 2);
    ctx.arc(w * 0.53, baseY - 110, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Floating spectral soul orbs rising from the underworld
    for (let i = 0; i < 12; i++) {
      const orbX = ((i * 123 + time * 40) % (w * 1.1)) - w * 0.05;
      const orbY = baseY - ((time * 30 + i * 45) % (h * 0.6));
      ctx.fillStyle = 'rgba(216, 180, 254, 0.6)';
      ctx.beginPath();
      ctx.arc(orbX, orbY, 4 + Math.sin(time * 4 + i) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPapelPicado(ctx: CanvasRenderingContext2D, w: number, y: number, time: number, offset: boolean) {
    const bannerColors = ['#f43f5e', '#eab308', '#06b6d4', '#10b981', '#a855f7', '#f97316'];
    const count = 12;
    const spacing = w / count;

    // Hanging string with catenary sag
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(w * 0.5, y + 25, w, y);
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      const bx = i * spacing + 10;
      const sag = Math.sin((i / count) * Math.PI) * 25;
      const by = y + sag;
      const sway = Math.sin(time * 2 + i * 0.8 + (offset ? 1 : 0)) * 4;

      ctx.save();
      ctx.translate(bx + spacing * 0.4, by);
      ctx.rotate((sway * Math.PI) / 180);

      ctx.fillStyle = bannerColors[(i + (offset ? 3 : 0)) % bannerColors.length];
      ctx.fillRect(-18, 0, 36, 42);

      // Cute Calavera cutout pattern inside banner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.beginPath();
      ctx.arc(0, 16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-3, 15, 2, 0, Math.PI * 2);
      ctx.arc(3, 15, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Scalloped bottom edge
      ctx.fillStyle = bannerColors[(i + (offset ? 3 : 0)) % bannerColors.length];
      for (let s = -18; s <= 12; s += 6) {
        ctx.beginPath();
        ctx.arc(s + 3, 42, 3, 0, Math.PI);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawTornPapelPicado(ctx: CanvasRenderingContext2D, w: number, y: number, time: number) {
    const bannerColors = ['#e11d48', '#ca8a04', '#7c3aed', '#ea580c'];
    const count = 10;
    const spacing = w / count;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(w * 0.5, y + 28, w, y);
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      if (i % 3 === 1) continue; // torn / missing banners
      const bx = i * spacing + 12;
      const sag = Math.sin((i / count) * Math.PI) * 28;
      const by = y + sag;
      const violentSway = Math.sin(time * 4 + i) * 12;

      ctx.save();
      ctx.translate(bx + 15, by);
      ctx.rotate((violentSway * Math.PI) / 180);

      ctx.fillStyle = bannerColors[i % bannerColors.length];
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.lineTo(12, 38);
      ctx.lineTo(0, 26); // torn middle
      ctx.lineTo(-14, 34);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Main Hat Arena Platform: The battle takes place directly atop the giant Mexican Sombrero!
   * - Level 1: Pristine, glorious black velvet & shimmering gold trim
   * - Level 2: Cracked felt, frayed trim, glowing fissures
   * - Level 3: Shattered into floating obsidian chunks bound by purple soul chains
   */
  renderHatPlatform(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    stageIdx: number
  ) {
    const stageY = h * 0.72; // Hat brim battle line
    const centerX = w * 0.5;

    ctx.save();

    if (stageIdx === 0) {
      // LEVEL 1: Pristine "El Gran Sombrero Dorado"
      this.drawPristineSombrero(ctx, centerX, stageY, w, h, time);
    } else if (stageIdx === 1) {
      // LEVEL 2: Battle-Cracked "El Sombrero Agrietado"
      this.drawCrackedSombrero(ctx, centerX, stageY, w, h, time);
    } else {
      // LEVEL 3: Heavily Shattered "El Sombrero de Mictlán"
      this.drawShatteredSombrero(ctx, centerX, stageY, w, h, time);
    }

    ctx.restore();
  }

  private drawPristineSombrero(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    w: number,
    h: number,
    time: number
  ) {
    const brimW = w * 0.94;
    const brimH = 110;
    const crownW = w * 0.38;
    const crownH = 180;

    // 1. Hat Crown (Center raised cone of the Sombrero)
    const crownTopY = by - crownH;
    const crownGrad = ctx.createLinearGradient(cx - crownW * 0.5, crownTopY, cx + crownW * 0.5, by);
    crownGrad.addColorStop(0, '#1e293b'); // midnight velvet
    crownGrad.addColorStop(0.5, '#0f172a');
    crownGrad.addColorStop(1, '#020617');

    ctx.fillStyle = crownGrad;
    ctx.beginPath();
    ctx.moveTo(cx - crownW * 0.32, crownTopY);
    ctx.quadraticCurveTo(cx, crownTopY - 18, cx + crownW * 0.32, crownTopY);
    ctx.lineTo(cx + crownW * 0.5, by);
    ctx.lineTo(cx - crownW * 0.5, by);
    ctx.closePath();
    ctx.fill();

    // Ornate Golden Embroidery on the Crown
    ctx.strokeStyle = '#eab308'; // Radiant Aztec Gold
    ctx.lineWidth = 4;
    ctx.stroke();

    // Intricate Floral Charro Filigree on Crown
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Central calavera floral crest
    ctx.arc(cx, crownTopY + 70, 24, 0, Math.PI * 2);
    ctx.stroke();
    // Decorative spiral arabesques
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const sx = cx + i * 36;
      ctx.beginPath();
      ctx.arc(sx, crownTopY + 110, 16, 0, Math.PI);
      ctx.stroke();
    }

    // Velvet Crown Hat Band with Silver Charro Conchas
    ctx.fillStyle = '#dc2626'; // Festive crimson silk ribbon
    ctx.fillRect(cx - crownW * 0.49, by - 24, crownW * 0.98, 20);
    ctx.fillStyle = '#e2e8f0'; // Silver concha medallions
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx + i * (crownW * 0.1), by - 14, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Giant Sombrero Brim (The main fighting arena surface)
    // Brim shadow beneath
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, by + 45, brimW * 0.52, brimH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brim Body
    const brimGrad = ctx.createLinearGradient(0, by, 0, by + brimH);
    brimGrad.addColorStop(0, '#1e293b');
    brimGrad.addColorStop(0.3, '#0f172a');
    brimGrad.addColorStop(1, '#020617');

    ctx.fillStyle = brimGrad;
    ctx.beginPath();
    ctx.ellipse(cx, by + 15, brimW * 0.5, brimH * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gleaming Gold Outer Brim Embroidery Edge
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(cx, by + 15, brimW * 0.5, brimH * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner gold braided rope line
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, by + 15, brimW * 0.485, brimH * 0.43, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Dangling Silver Charro Coins / Bells along the brim fringe
    const coinCount = 28;
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    for (let i = 0; i < coinCount; i++) {
      const angle = (i / (coinCount - 1)) * Math.PI; // front arc
      const coinX = cx + Math.cos(angle) * (brimW * 0.495);
      const coinY = by + 15 + Math.sin(angle) * (brimH * 0.44);
      const bob = Math.sin(time * 3 + i) * 2;

      // Small string
      ctx.beginPath();
      ctx.moveTo(coinX, coinY);
      ctx.lineTo(coinX, coinY + 12 + bob);
      ctx.stroke();

      // Shiny coin / bell
      ctx.beginPath();
      ctx.arc(coinX, coinY + 14 + bob, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCrackedSombrero(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    w: number,
    h: number,
    time: number
  ) {
    const brimW = w * 0.94;
    const brimH = 110;
    const crownW = w * 0.38;
    const crownH = 180;

    // 1. Crown with Jagged Spirit Fissures
    const crownTopY = by - crownH;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx - crownW * 0.32, crownTopY);
    ctx.quadraticCurveTo(cx, crownTopY - 18, cx + crownW * 0.32, crownTopY);
    ctx.lineTo(cx + crownW * 0.5, by);
    ctx.lineTo(cx - crownW * 0.5, by);
    ctx.closePath();
    ctx.fill();

    // Glowing Orange/Purple Spirit Crack splitting the crown
    const glowPulse = Math.sin(time * 4) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(249, 115, 22, ${glowPulse})`;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 15, crownTopY + 10);
    ctx.lineTo(cx + 10, crownTopY + 55);
    ctx.lineTo(cx - 20, crownTopY + 110);
    ctx.lineTo(cx + 25, by);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Frayed crimson ribbon
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(cx - crownW * 0.49, by - 24, crownW * 0.98, 20);
    // Missing conchas, damaged stitches
    ctx.fillStyle = '#cbd5e1';
    for (let i = -4; i <= 4; i++) {
      if (i === 1 || i === -2) continue; // knocked off in battle!
      ctx.beginPath();
      ctx.arc(cx + i * (crownW * 0.1), by - 14, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Brim with battle cuts and torn gold lace
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, by + 45, brimW * 0.52, brimH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0b0f19';
    ctx.beginPath();
    ctx.ellipse(cx, by + 15, brimW * 0.5, brimH * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torn gold border with gap tears
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(cx, by + 15, brimW * 0.5, brimH * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Deep battle claw cuts in the brim
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - brimW * 0.28, by - 5);
    ctx.lineTo(cx - brimW * 0.22, by + 28);
    ctx.moveTo(cx + brimW * 0.25, by + 10);
    ctx.lineTo(cx + brimW * 0.32, by + 35);
    ctx.stroke();

    // Few surviving coins dangling, swinging wildly
    const coinCount = 20;
    ctx.fillStyle = '#cbd5e1';
    for (let i = 0; i < coinCount; i++) {
      if (i % 4 === 0) continue; // broken coins
      const angle = (i / (coinCount - 1)) * Math.PI;
      const coinX = cx + Math.cos(angle) * (brimW * 0.495);
      const coinY = by + 15 + Math.sin(angle) * (brimH * 0.44);
      const bob = Math.sin(time * 5 + i * 2) * 4;

      ctx.beginPath();
      ctx.arc(coinX, coinY + 12 + bob, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawShatteredSombrero(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    w: number,
    h: number,
    time: number
  ) {
    const brimW = w * 0.94;
    const crownW = w * 0.38;
    const crownH = 180;

    // LEVEL 3: Completely Shattered Mictlán Sombrero
    // Broken into 3 floating obsidian and charred velvet island fragments linked by purple soul chains!
    const floatL = Math.sin(time * 2) * 6;
    const floatC = Math.sin(time * 2 + 1.2) * 5;
    const floatR = Math.sin(time * 2 + 2.4) * 6;

    // Ethereal Underworld Soul Chains binding the floating hat pieces
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    // Chain from left island to center
    ctx.moveTo(cx - brimW * 0.22, by + 15 + floatL);
    ctx.quadraticCurveTo(cx - brimW * 0.12, by + 40 + floatC, cx - 10, by + 15 + floatC);
    // Chain from center to right island
    ctx.moveTo(cx + 10, by + 15 + floatC);
    ctx.quadraticCurveTo(cx + brimW * 0.12, by + 40 + floatC, cx + brimW * 0.22, by + 15 + floatR);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center Shattered Crown Fragment (severely cleaved in two)
    const crownTopY = by - crownH + floatC;
    ctx.fillStyle = '#090114';
    ctx.beginPath();
    ctx.moveTo(cx - crownW * 0.3, crownTopY + 20);
    ctx.lineTo(cx - 15, crownTopY);
    ctx.lineTo(cx - 30, by + floatC);
    ctx.lineTo(cx - crownW * 0.45, by + floatC);
    ctx.closePath();
    ctx.fill();

    // Right half of shattered crown
    ctx.beginPath();
    ctx.moveTo(cx + 10, crownTopY + 40);
    ctx.lineTo(cx + crownW * 0.28, crownTopY + 25);
    ctx.lineTo(cx + crownW * 0.45, by + floatC);
    ctx.lineTo(cx + 5, by + floatC);
    ctx.closePath();
    ctx.fill();

    // Erupting Purple Hellfire from the center abyss crack
    const fireGrad = ctx.createLinearGradient(cx, by + floatC + 30, cx, crownTopY);
    fireGrad.addColorStop(0, 'rgba(168, 85, 247, 0.9)');
    fireGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.7)');
    fireGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 28, by + floatC + 20);
    ctx.lineTo(cx + Math.sin(time * 10) * 15, crownTopY - 30);
    ctx.lineTo(cx + 28, by + floatC + 20);
    ctx.closePath();
    ctx.fill();

    // 3 Shattered Brim Platform Islands (playable ground)
    // Left Brim Island
    ctx.fillStyle = '#05010a';
    ctx.beginPath();
    ctx.moveTo(cx - brimW * 0.5, by + 10 + floatL);
    ctx.lineTo(cx - brimW * 0.18, by + floatL);
    ctx.lineTo(cx - brimW * 0.14, by + 45 + floatL);
    ctx.lineTo(cx - brimW * 0.46, by + 60 + floatL);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center Brim Island
    ctx.fillStyle = '#0a0216';
    ctx.beginPath();
    ctx.moveTo(cx - brimW * 0.12, by + floatC);
    ctx.lineTo(cx + brimW * 0.12, by + floatC);
    ctx.lineTo(cx + brimW * 0.1, by + 50 + floatC);
    ctx.lineTo(cx - brimW * 0.1, by + 50 + floatC);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.stroke();

    // Right Brim Island
    ctx.fillStyle = '#05010a';
    ctx.beginPath();
    ctx.moveTo(cx + brimW * 0.18, by + floatR);
    ctx.lineTo(cx + brimW * 0.5, by + 10 + floatR);
    ctx.lineTo(cx + brimW * 0.46, by + 60 + floatR);
    ctx.lineTo(cx + brimW * 0.14, by + 45 + floatR);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9333ea';
    ctx.stroke();
  }

  renderForeground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    stageIdx: number
  ) {
    // 1. Swirling Cempasúchil (Golden Marigold) Petals
    ctx.save();
    for (const p of this.petals) {
      ctx.save();
      ctx.translate(p.x * w, p.y * h);
      ctx.rotate(p.rot);
      // Petal color: bright gold/orange, or purple in Mictlán
      ctx.fillStyle = stageIdx === 2 ? '#c084fc' : '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 2. Foreground candle glow & vignette on bottom perimeter
    const vigGrad = ctx.createLinearGradient(0, h * 0.85, 0, h);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, h * 0.85, w, h * 0.15);

    // Glowing Day of the Dead candles in stage 1 and 2
    if (stageIdx <= 1) {
      this.drawCandles(ctx, w, h, time);
    }
  }

  private drawCandles(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    const candlePositions = [
      { x: w * 0.05, h: 32 },
      { x: w * 0.08, h: 42 },
      { x: w * 0.12, h: 26 },
      { x: w * 0.88, h: 30 },
      { x: w * 0.92, h: 45 },
      { x: w * 0.95, h: 25 },
    ];

    ctx.save();
    for (const c of candlePositions) {
      // Candle stick (white wax with drips)
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(c.x - 4, h - c.h, 8, c.h);

      // Flickering flame
      const flicker = Math.sin(time * 12 + c.x) * 2;
      const flameGrad = ctx.createRadialGradient(
        c.x,
        h - c.h - 6,
        1,
        c.x,
        h - c.h - 6,
        12
      );
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.3, '#fde047');
      flameGrad.addColorStop(0.8, '#ea580c');
      flameGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.ellipse(c.x + flicker * 0.3, h - c.h - 7, 5 + flicker * 0.3, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
