function getRequiredElement<T extends Element>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing required element: ${selector}`);
  return el as T;
}

type PaperSide = "front" | "back";

function isNoisyExtensionEthereumError(message: string | undefined, stack?: string) {
  if (!message) return false;
  if (!message.includes("Cannot redefine property: ethereum")) return false;
  if (stack && stack.includes("chrome-extension://")) return true;
  return true;
}

function installDevNoiseFilters() {
  // Some browser extensions (MetaMask and friends) inject scripts that can throw
  // noisy errors during HMR/dev. Filter ONLY the known message + extension stack.
  window.addEventListener(
    "error",
    (e) => {
      const stack =
        typeof e.error?.stack === "string" ? (e.error.stack as string) : undefined;
      const fromExtension =
        (typeof e.filename === "string" && e.filename.startsWith("chrome-extension://")) ||
        (stack?.includes("chrome-extension://") ?? false);

      if (fromExtension && isNoisyExtensionEthereumError(e.message, stack)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    { capture: true },
  );

  window.addEventListener(
    "unhandledrejection",
    (e) => {
      const reason = e.reason as unknown;
      const message =
        typeof reason === "string"
          ? reason
          : typeof (reason as { message?: unknown } | null)?.message === "string"
            ? ((reason as { message: string }).message as string)
            : undefined;
      const stack =
        typeof (reason as { stack?: unknown } | null)?.stack === "string"
          ? ((reason as { stack: string }).stack as string)
          : undefined;

      if (stack?.includes("chrome-extension://") && isNoisyExtensionEthereumError(message, stack)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
}

function setFlipped(paper: HTMLElement, isFlipped: boolean) {
  paper.classList.toggle("is-flipped", isFlipped);
  paper.dataset.flipped = String(isFlipped);
}

function getSideFromFlipped(isFlipped: boolean): PaperSide {
  return isFlipped ? "back" : "front";
}

function setButtonState(button: HTMLButtonElement, side: PaperSide) {
  const isBack = side === "back";
  button.setAttribute("aria-pressed", String(isBack));

  const label = isBack ? "Nazad" : "O meni";
  const text = document.getElementById("flipButtonText");
  if (text) text.textContent = label;
}

function main() {
  installDevNoiseFilters();

  const paper = getRequiredElement<HTMLElement>("#paper");
  const flipButton = getRequiredElement<HTMLButtonElement>("#flipButton");

  // Restore last side (nice for returning visitors)
  const saved = localStorage.getItem("norine:side");
  const initialSide: PaperSide =
    saved === "back" || saved === "front" ? saved : "front";
  const initialFlipped = initialSide === "back";

  setFlipped(paper, initialFlipped);
  setButtonState(flipButton, getSideFromFlipped(initialFlipped));

  flipButton.addEventListener("click", () => {
    const isCurrentlyFlipped = paper.classList.contains("is-flipped");
    const next = !isCurrentlyFlipped;
    setFlipped(paper, next);

    const side = getSideFromFlipped(next);
    setButtonState(flipButton, side);
    localStorage.setItem("norine:side", side);
  });

  // Keyboard shortcuts: "f" flips, "Escape" goes back to front.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setFlipped(paper, false);
      setButtonState(flipButton, "front");
      localStorage.setItem("norine:side", "front");
    }

    if (e.key.toLowerCase() === "f") {
      e.preventDefault();
      flipButton.click();
    }
  });
}

main();


