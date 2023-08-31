declare const __APP_AUTHOR_URL__: string;
declare const __APP_URL__: string;
declare const __APP_VERSION__: string;

interface Document {
  webkitCurrentFullScreenElement: HTMLElement | null;
}

interface HTMLElement {
  mozRequestFullScreen: Function;
  webkitRequestFullScreen: Function;
}
