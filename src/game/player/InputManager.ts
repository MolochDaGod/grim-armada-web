/**
 * InputManager — centralized keyboard + mouse state.
 * Singleton; call init() once, then read `.keys` / `.mouse` each frame.
 * Ported from Motion Player.tsx input handling.
 */

export interface KeyState {
  forward: boolean;   // W
  backward: boolean;  // S
  left: boolean;      // A (turn)
  right: boolean;     // D (turn)
  strafeL: boolean;   // Q
  strafeR: boolean;   // E
  sprint: boolean;    // Shift
  jump: boolean;      // Space
  crouch: boolean;    // C (toggle)
  interact: boolean;  // E (context)
  reload: boolean;    // R
  cycleWeapon: boolean; // Q (tap, not hold)
  tab: boolean;       // Tab — toggle harvest/combat
  shoulderSwap: boolean; // V
  mount: boolean;     // F — enter/exit vehicle / mount
  // Skill keys
  skill1: boolean;
  skill2: boolean;
  skill3: boolean;
  skill4: boolean;
}

export interface MouseState {
  lmb: boolean;       // left mouse button (fire / attack)
  rmb: boolean;       // right mouse button (aim / block)
  dx: number;         // mouse delta X this frame
  dy: number;         // mouse delta Y this frame
  wheel: number;      // scroll delta
}

// Double-tap detection for dodge
interface TapRecord { key: string; time: number; }

const DOUBLE_TAP_MS = 280;

class InputManager {
  keys: KeyState = {
    forward: false, backward: false, left: false, right: false,
    strafeL: false, strafeR: false, sprint: false, jump: false,
    crouch: false, interact: false, reload: false, cycleWeapon: false,
    tab: false, shoulderSwap: false, mount: false,
    skill1: false, skill2: false, skill3: false, skill4: false,
  };

  mouse: MouseState = { lmb: false, rmb: false, dx: 0, dy: 0, wheel: 0 };

  /** Fires once per double-tap: 'w' | 'a' | 's' | 'd' */
  onDoubleTap: ((dir: string) => void) | null = null;

  private _lastTap: TapRecord = { key: '', time: 0 };
  private _justPressed = new Set<string>();
  private _isLocked = false;
  private _inited = false;

  init() {
    if (this._inited) return;
    this._inited = true;

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('wheel', this._onWheel, { passive: true });
    document.addEventListener('pointerlockchange', this._onLockChange);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('wheel', this._onWheel);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    this._inited = false;
  }

  get isPointerLocked() { return this._isLocked; }

  /** Call once per frame to reset per-frame deltas */
  resetFrame() {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.mouse.wheel = 0;
    this._justPressed.clear();
  }

  /** True only on the first frame a key is pressed */
  justPressed(key: string): boolean { return this._justPressed.has(key); }

  // ── Internal handlers ─────────────────────────────────────────────────────

  private _onLockChange = () => {
    this._isLocked = !!document.pointerLockElement;
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this._justPressed.add(e.code);
    this._mapKey(e.code, true);

    // Double-tap detection
    const now = Date.now();
    const k = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) {
      if (this._lastTap.key === k && now - this._lastTap.time < DOUBLE_TAP_MS) {
        const dir = k === 'KeyW' ? 'w' : k === 'KeyA' ? 'a' : k === 'KeyS' ? 's' : 'd';
        this.onDoubleTap?.(dir);
        this._lastTap = { key: '', time: 0 };
      } else {
        this._lastTap = { key: k, time: now };
      }
    }
  };

  private _onKeyUp = (e: KeyboardEvent) => {
    this._mapKey(e.code, false);
  };

  private _mapKey(code: string, down: boolean) {
    switch (code) {
      case 'KeyW':       this.keys.forward = down; break;
      case 'KeyS':       this.keys.backward = down; break;
      case 'KeyA':       this.keys.left = down; break;
      case 'KeyD':       this.keys.right = down; break;
      case 'KeyQ':       this.keys.strafeL = down; if (down) this.keys.cycleWeapon = true; break;
      case 'KeyE':       this.keys.strafeR = down; this.keys.interact = down; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = down; break;
      case 'Space':      this.keys.jump = down; break;
      case 'KeyC':       if (down) this.keys.crouch = !this.keys.crouch; break;
      case 'KeyR':       this.keys.reload = down; break;
      case 'Tab':        if (down) this.keys.tab = true; break;
      case 'KeyV':       if (down) this.keys.shoulderSwap = true; break;
      case 'KeyF':       if (down) this.keys.mount = true; break;
      case 'Digit1':     this.keys.skill1 = down; break;
      case 'Digit2':     this.keys.skill2 = down; break;
      case 'Digit3':     this.keys.skill3 = down; break;
      case 'Digit4':     this.keys.skill4 = down; break;
    }
  }

  private _onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.mouse.lmb = true;
    if (e.button === 2) this.mouse.rmb = true;
  };

  private _onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouse.lmb = false;
    if (e.button === 2) this.mouse.rmb = false;
  };

  private _onMouseMove = (e: MouseEvent) => {
    if (!this._isLocked) return;
    this.mouse.dx += e.movementX;
    this.mouse.dy += e.movementY;
  };

  private _onWheel = (e: WheelEvent) => {
    this.mouse.wheel += e.deltaY;
  };
}

export const inputManager = new InputManager();
