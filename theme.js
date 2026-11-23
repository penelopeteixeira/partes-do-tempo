(() => {
  const pagina = document.documentElement;
  const botaoTema = document.getElementById('alternar-tema');

  // O painel, o botão e o fundo seguem o mesmo tema da página.
  botaoTema.addEventListener('click', () => {
    const temaClaro = pagina.dataset.theme !== 'light';
    pagina.dataset.theme = temaClaro ? 'light' : 'dark';
    botaoTema.setAttribute('aria-label', temaClaro ? 'Ativar tema escuro' : 'Ativar tema claro');

    if (animacaoFundo?.motion.matches) animacaoFundo.redraw();
  });

  const animacaoFundo = iniciarFundo();

  function iniciarFundo() {
    const background = document.getElementById('tc-background');
    if (!background) return;

    const rainCanvas = background.querySelector('[data-rain]');
    const meshCanvas = background.querySelector('[data-mesh]');
    const rain = rainCanvas?.getContext('2d');
    const mesh = meshCanvas?.getContext('2d');
    if (!rain || !mesh) return;

    // Configuração da demonstração, com os mesmos valores em todas as telas.
    const settings = { speed: 80, intensity: 240, size: 2.4, density: 150, trail: 4 };
    const darkColors = {
      point: [161, 181, 217],
      accent: [123, 228, 234],
      opacity: 0.22,
      glow: [67, 136, 182],
      stroke: [139, 187, 216],
      rain: [135, 175, 234],
      rainAccent: [157, 147, 238],
    };
    const lightColors = {
      point: [70, 87, 118],
      accent: [34, 91, 112],
      opacity: 0.27,
      glow: [106, 122, 173],
      stroke: [73, 104, 142],
      rain: [58, 90, 140],
      rainAccent: [90, 74, 140],
    };
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, active: false };
    const baseRadius = 0.82;
    const maxDisplacement = 5;
    let bounds;
    let width;
    let height;
    let radius;
    let columns;
    let points = [];
    const drops = [];
    let dropCount = 0;
    let frame = null;
    let previousTime = null;
    let themeMix = -1;
    let colors;

    const random = (min, max) => min + Math.random() * (max - min);

    function blendColors(from, to, amount) {
      return from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount));
    }

    // A chuva e a malha mudam de cor junto com o degradê do CSS.
    function updateThemeColors() {
      const amount = Number(getComputedStyle(background, '::after').opacity);
      if (amount === themeMix) return false;

      themeMix = amount;
      colors = {
        point: blendColors(darkColors.point, lightColors.point, amount),
        accent: blendColors(darkColors.accent, lightColors.accent, amount),
        opacity: darkColors.opacity + (lightColors.opacity - darkColors.opacity) * amount,
        glow: blendColors(darkColors.glow, lightColors.glow, amount),
        stroke: blendColors(darkColors.stroke, lightColors.stroke, amount),
        rain: blendColors(darkColors.rain, lightColors.rain, amount),
        rainAccent: blendColors(darkColors.rainAccent, lightColors.rainAccent, amount),
      };
      return true;
    }

    // Mantém os canvas alinhados à tela e limita o custo em telas de alta densidade.
    function resize() {
      bounds = background.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const scale = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (width * height)));
      for (const [canvas, context] of [[rainCanvas, rain], [meshCanvas, mesh]]) {
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      }

      radius = Math.min(150, Math.max(96, Math.min(width, height) * 0.17));
      const spacing = Math.max(22, Math.ceil(Math.sqrt(width * height / 4800)));
      columns = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      points = [];
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          points.push({ x: (column - 0.5) * spacing, y: (row - 0.5) * spacing });
        }
      }

      layoutDrops();
      updateThemeColors();
      drawMesh();
      if (!motion.matches) drawRain(0);
    }

    function layoutDrops() {
      const step = Math.max(width < 600 ? 2 : 1, Math.ceil(columns / 68));
      const baseCount = Math.ceil((columns - 1) / step);
      dropCount = Math.max(1, Math.min(176, Math.round(baseCount * settings.density / 100)));
      for (let index = 0; index < dropCount; index++) {
        const drop = drops[index] ?? {
          depth: random(0, 1),
          speedRatio: random(24 / 44, 64 / 44),
          sizeRatio: random(0.72, 1.31),
          gap: random(7, 12),
          opacity: random(0.22, 0.52),
          drift: random(-2, 2),
        };
        drop.x = (index + 0.5) * width / dropCount + drop.drift;
        drops[index] = drop;
      }
    }

    // Cada pingo é formado por quadrados que perdem intensidade ao longo do rastro.
    function drawRain(elapsed) {
      rain.clearRect(0, 0, width, height);
      const travel = height + 130;
      const intensity = settings.intensity / 100;
      for (let index = 0; index < dropCount; index++) {
        const drop = drops[index];
        drop.depth = (drop.depth + settings.speed * drop.speedRatio * elapsed / (1000 * travel)) % 1;
        const head = drop.depth * travel - 72;
        const centralDimming = 0.68 + 0.32 * Math.min(1, Math.abs(drop.x / width - 0.5) * 2);
        const distance = Math.hypot(drop.x - pointer.x, head - pointer.y);
        const highlight = 1 + 0.28 * pointer.strength * Math.max(0, 1 - distance / radius);
        const color = index % 4 === 0 ? colors.rainAccent : colors.rain;
        rain.fillStyle = `rgb(${color.join(' ')})`;

        for (let tail = 0; tail <= settings.trail; tail++) {
          const y = head - tail * drop.gap;
          if (y < 0 || y >= height) continue;
          const edgeFade = Math.min(1, y / 55, (height - y) / 70);
          const size = Math.max(0.75, settings.size * drop.sizeRatio - 0.25 * tail);
          rain.globalAlpha = Math.min(1, intensity * drop.opacity * centralDimming * edgeFade * highlight * 0.65 ** tail);
          rain.fillRect(drop.x - size / 2, y - size / 2, size, size);
        }
      }
      rain.globalAlpha = 1;
    }

    function project(point) {
      point.drawX = point.x;
      point.drawY = point.y;
      point.power = 0;
      if (!pointer.strength) return;

      const dx = point.x - pointer.x;
      const dy = point.y - pointer.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared >= radius * radius) return;

      const distance = Math.sqrt(distanceSquared);
      const proximity = distance / radius;
      point.power = (1 - proximity ** 2) ** 2 * pointer.strength;
      if (distance === 0) return;

      // O deslocamento zera nas duas pontas para evitar abrir um vão no centro.
      const offset = maxDisplacement * Math.sin(Math.PI * proximity) ** 2 * pointer.strength;
      point.drawX += dx / distance * offset;
      point.drawY += dy / distance * offset;
    }

    function drawLink(point, neighbor) {
      const power = Math.min(point.power, neighbor.power);
      if (power < 0.09) return;

      mesh.globalAlpha = power * 0.13;
      mesh.beginPath();
      mesh.moveTo(point.drawX, point.drawY);
      mesh.lineTo(neighbor.drawX, neighbor.drawY);
      mesh.stroke();
    }

    // A malha destaca e liga os pontos próximos ao cursor.
    function drawMesh() {
      mesh.clearRect(0, 0, width, height);
      mesh.fillStyle = `rgb(${colors.point.join(' ')})`;
      mesh.globalAlpha = colors.opacity;
      mesh.beginPath();
      for (const point of points) {
        project(point);
        if (point.power > 0) continue;
        mesh.moveTo(point.x + baseRadius, point.y);
        mesh.arc(point.x, point.y, baseRadius, 0, Math.PI * 2);
      }
      mesh.fill();
      if (!pointer.strength) return;

      const glow = mesh.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius * 1.5);
      const glowColor = colors.glow.join(' ');
      glow.addColorStop(0, `rgb(${glowColor})`);
      glow.addColorStop(1, `rgb(${glowColor} / 0)`);
      mesh.fillStyle = glow;
      mesh.globalAlpha = 0.13 * pointer.strength;
      mesh.fillRect(pointer.x - radius * 1.5, pointer.y - radius * 1.5, radius * 3, radius * 3);

      mesh.strokeStyle = `rgb(${colors.stroke.join(' ')})`;
      mesh.lineWidth = 0.65;
      for (let index = 0; index < points.length; index++) {
        const point = points[index];
        if (point.power < 0.09) continue;
        if ((index + 1) % columns !== 0) drawLink(point, points[index + 1]);
        if (index + columns < points.length) drawLink(point, points[index + columns]);
      }

      for (const point of points) {
        const { power } = point;
        if (power === 0) continue;
        const color = blendColors(colors.point, colors.accent, power);
        mesh.fillStyle = `rgb(${color.join(' ')})`;
        mesh.globalAlpha = colors.opacity + 0.48 * power;
        mesh.beginPath();
        mesh.arc(point.drawX, point.drawY, baseRadius + 0.5 * power, 0, Math.PI * 2);
        mesh.fill();
      }
    }

    function updateHover(elapsed) {
      const targetStrength = pointer.active ? 1 : 0;
      if (pointer.strength === targetStrength &&
          (!pointer.active || (pointer.x === pointer.targetX && pointer.y === pointer.targetY))) return false;

      const blend = 1 - Math.exp(-elapsed / 55);
      pointer.x += (pointer.targetX - pointer.x) * blend;
      pointer.y += (pointer.targetY - pointer.y) * blend;
      pointer.strength += (targetStrength - pointer.strength) * blend;
      if (Math.hypot(pointer.targetX - pointer.x, pointer.targetY - pointer.y) < 0.1) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
      }
      if (Math.abs(targetStrength - pointer.strength) < 0.002) pointer.strength = targetStrength;
      return true;
    }

    function tick(time) {
      const elapsed = previousTime === null ? 0 : Math.min(50, time - previousTime);
      previousTime = time;
      const themeChanged = updateThemeColors();
      const meshMoved = updateHover(elapsed);
      if (themeChanged || meshMoved) drawMesh();
      drawRain(elapsed);
      frame = requestAnimationFrame(tick);
    }

    // Pausa em segundo plano e deixa apenas a malha quando há preferência por menos movimento.
    function syncAnimation() {
      if (document.hidden || motion.matches) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        previousTime = null;
        pointer.active = false;
        pointer.strength = 0;
        updateThemeColors();
        drawMesh();
        if (motion.matches) rain.clearRect(0, 0, width, height);
        return;
      }
      if (frame === null) frame = requestAnimationFrame(tick);
    }

    function followPointer(event) {
      if (!event.isPrimary || event.pointerType === 'touch' || motion.matches) return;
      pointer.targetX = event.clientX - bounds.left;
      pointer.targetY = event.clientY - bounds.top;
      if (pointer.strength === 0) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
      }
      pointer.active = true;
    }

    function leave() {
      pointer.active = false;
    }

    window.addEventListener('pointermove', followPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', syncAnimation);
    motion.addEventListener('change', syncAnimation);
    resize();
    syncAnimation();

    return {
      motion,
      redraw() {
        updateThemeColors();
        drawMesh();
      },
    };
  }
})();
