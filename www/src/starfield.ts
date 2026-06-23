import "./starfield.css";

/** Twinkling stars, scaled to viewport area. */
export function initStarfield(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const stars: Array<{
    x: number;
    y: number;
    opacity: number;
    size: number;
    speed: number;
  }> = [];

  function starCountForSize(w: number, h: number) {
    const refArea = 1000 * 50;
    const n = Math.round((25 * (w * h)) / refArea);
    return Math.min(150, Math.max(25, n));
  }

  let targetCount = 25;

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < targetCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        opacity: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.003 + 0.002,
      });
    }
  }

  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    targetCount = starCountForSize(canvas.width, canvas.height);
    initStars();
  }

  resizeCanvas();

  const ro = new ResizeObserver(resizeCanvas);
  ro.observe(container);

  window.addEventListener("resize", resizeCanvas);

  let raf = 0;
  function animate() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const star of stars) {
      star.opacity += star.speed;
      if (star.opacity > 1) {
        star.opacity = 1;
        star.speed = -star.speed;
      } else if (star.opacity < 0) {
        star.opacity = 0;
        star.speed = -star.speed;
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(animate);
  }

  animate();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resizeCanvas);
    ro.disconnect();
    canvas.remove();
  };
}
