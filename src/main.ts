import { Game } from "./game.js";
import { game as config } from "./config.js";

async function requestFullscreen(target: HTMLElement) {
  if (
    document.fullscreenElement === null ||
    document.webkitCurrentFullScreenElement === null
  ) {
    await (
      target.requestFullscreen ??
      target.mozRequestFullScreen ??
      target.webkitRequestFullScreen
    ).call(target);
  }
}

function registerFullscreenTrigger(target: HTMLElement) {
  if (document.fullscreenEnabled) {
    const element = document.querySelector<HTMLElement>(".request-fullscreen")!;
    element.style.removeProperty("display");
    element.querySelector("span")?.addEventListener("click", () => {
      requestFullscreen(target);
    });
  }
}

function fitElementToScreen(container: HTMLElement, bottomPadding: number) {
  const ratio = config.screen.width / config.screen.height;
  const height = window.innerHeight - bottomPadding;
  let width = window.innerWidth;
  if (width > height * ratio) {
    width = height * ratio;
  }
  container.style.setProperty("width", width + "px");
}

function run() {
  const query = (name: string) => document.querySelector<HTMLElement>(name)!;
  const container = query(".game-container");
  const gameElement = query(".game");
  const fullscreenElement = query(".request-fullscreen");
  registerFullscreenTrigger(gameElement);
  window.addEventListener("resize", () => {
    fitElementToScreen(container, fullscreenElement.offsetHeight);
  });
  window.dispatchEvent(new Event("resize"));
  gameElement.replaceChildren();
  new Game(gameElement);
}

run();
