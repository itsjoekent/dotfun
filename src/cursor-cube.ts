import "./cursor-cube.css";

type CursorMode = "default" | "pointer" | "text";

function cursorModeAt(x: number, y: number, cursorRoot: HTMLElement): CursorMode {
  const el = document.elementFromPoint(x, y);
  if (!el || cursorRoot.contains(el)) return "default";

  if (
    el.closest(
      "a[href], button, [role='button'], [role='link'], .social-link, summary, label[for], .project-card:not(.project-card--placeholder)",
    )
  ) {
    return "pointer";
  }

  if (
    el.closest(
      "textarea, [contenteditable='true'], .bio, .handle, input:not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']):not([type='hidden'])",
    )
  ) {
    return "text";
  }

  return "default";
}

function applyMode(root: HTMLElement, mode: CursorMode) {
  root.classList.remove("cursor-cube--default", "cursor-cube--pointer", "cursor-cube--text");
  root.classList.add(`cursor-cube--${mode}`);
}

export function initCursorCube(root: HTMLElement) {
  const mqFine = window.matchMedia("(pointer: fine)");
  const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const active = () => mqFine.matches && !mqMotion.matches;

  const setCursorClass = (on: boolean) => {
    document.documentElement.classList.toggle("use-custom-cursor", on);
  };

  let lastX = 0;
  let lastY = 0;
  let hasMove = false;

  const move = (clientX: number, clientY: number) => {
    root.style.transform = `translate(${clientX}px, ${clientY}px)`;
    applyMode(root, cursorModeAt(clientX, clientY, root));
  };

  const onMove = (e: MouseEvent) => {
    hasMove = true;
    lastX = e.clientX;
    lastY = e.clientY;
    move(lastX, lastY);
  };

  /** OS cursor often reappears after blur; force `cursor: none` to apply again. */
  const refreshCursorAfterReturn = () => {
    if (!active() || !hasMove || document.visibilityState !== "visible") return;
    setCursorClass(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!active()) return;
        setCursorClass(true);
        move(lastX, lastY);
      });
    });
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") refreshCursorAfterReturn();
  };

  let listening = false;

  const sync = () => {
    if (active()) {
      if (!listening) {
        window.addEventListener("mousemove", onMove, { passive: true });
        window.addEventListener("focus", refreshCursorAfterReturn);
        document.addEventListener("visibilitychange", onVisibilityChange);
        listening = true;
      }
      setCursorClass(true);
      move(-100, -100);
    } else {
      if (listening) {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("focus", refreshCursorAfterReturn);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        listening = false;
      }
      setCursorClass(false);
      applyMode(root, "default");
    }
  };

  sync();
  mqFine.addEventListener("change", sync);
  mqMotion.addEventListener("change", sync);

  return () => {
    if (listening) {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("focus", refreshCursorAfterReturn);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
    mqFine.removeEventListener("change", sync);
    mqMotion.removeEventListener("change", sync);
    setCursorClass(false);
  };
}
