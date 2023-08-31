export async function checkWebpLosslessSupport() {
  const image = new Image();
  return new Promise(resolve => {
    image.addEventListener("load", () =>
      resolve(image.width > 0 && image.height > 0)
    );
    image.addEventListener("error", () => resolve(false));
    image.src =
      "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
  });
}

export function isIterable(object: any) {
  return typeof object?.[Symbol.iterator] === "function";
}

export const log = {
  error: async (message: string) => {
    console.error(
      "Sis World Error: %c" + message,
      "background-color: initial; color: initial"
    );
  },
};
