// THE CONTROLS: arrow keys or A and D on a keyboard; drag or tap on a phone (a mouse works too).
// game.js reads `input` on every frame to move the basket.
export const input = {
  left: false, // is a "move left" key held down?
  right: false,
  pointerX: null, // where the finger or mouse last touched, or null for none
};

const LEFT_KEYS = ["ArrowLeft", "a", "A"];
const RIGHT_KEYS = ["ArrowRight", "d", "D"];
const PAUSE_KEYS = ["p", "P", "Escape"];

export function listenForInput(canvas, { onPauseKey }) {
  window.addEventListener("keydown", (event) => {
    if (isTyping(event)) return; // typing a name shouldn't move the basket
    if (LEFT_KEYS.includes(event.key)) {
      input.left = true;
      input.pointerX = null;
      event.preventDefault(); // stops the arrow keys from scrolling the page
    } else if (RIGHT_KEYS.includes(event.key)) {
      input.right = true;
      input.pointerX = null;
      event.preventDefault();
    } else if (PAUSE_KEYS.includes(event.key)) {
      onPauseKey();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (LEFT_KEYS.includes(event.key)) input.left = false;
    if (RIGHT_KEYS.includes(event.key)) input.right = false;
  });

  // If the window loses focus while a key is held down, the browser never sends "keyup".
  window.addEventListener("blur", () => {
    input.left = false;
    input.right = false;
  });

  // Pointer events cover mouse, touch and pen in one go.
  const follow = (event) => {
    input.pointerX = event.clientX - canvas.getBoundingClientRect().left;
  };
  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId); // keep following, even if the finger slides off the canvas
    follow(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (event.buttons > 0) follow(event); // only while the finger or mouse button is down
  });
}

function isTyping(event) {
  return event.target instanceof Element && event.target.closest("input, textarea, select") !== null;
}
