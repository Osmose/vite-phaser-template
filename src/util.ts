export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

export const DIRECTIONS = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

export function oppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.Left:
      return Direction.Right;
    case Direction.Right:
      return Direction.Left;
    case Direction.Up:
      return Direction.Down;
    case Direction.Down:
      return Direction.Up;
  }
}

interface MovableObject {
  x: number;
  y: number;
}

export function directionalVelocity(velocity: number, direction: Direction) {
  switch (direction) {
    case Direction.Left:
    case Direction.Up:
      return -1 * velocity;
    case Direction.Right:
    case Direction.Down:
      return velocity;
  }
}

export function relativeMove(object: MovableObject, direction: Direction, distance: number) {
  switch (direction) {
    case Direction.Left:
      object.x -= distance;
      return;
    case Direction.Right:
      object.x += distance;
      return;
    case Direction.Up:
      object.y -= distance;
      return;
    case Direction.Down:
      object.y += distance;
      return;
  }
}

export function gridMove(x: number, y: number, direction: Direction): [number, number] {
  switch (direction) {
    case Direction.Left:
      return [x - 1, y];
    case Direction.Right:
      return [x + 1, y];
    case Direction.Up:
      return [x, y - 1];
    case Direction.Down:
      return [x, y + 1];
  }
}

/**
 * Returns the number of pixels to move something at a rate of pixelsPerSecond
 * over a period of delta milliseconds.
 */
export function pixelDiff(pixelsPerSecond: number, deltaMs: number): number {
  return pixelsPerSecond * (deltaMs / 1000);
}

/** Choose a single value from the given list randomly and return it. */
export function randomChoice<T>(list: T[]): T {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

export function randomRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

export class StateMachine<T extends State> {
  initialState: string;
  possibleStates: { [key: string]: T };
  stateArgs: any[];
  state: string | null;
  stateStack: string[] = [];

  /**
   * Acts as a lock to prevent running updates when a transition is pending.
   * This can happen when transitioning to a state with an async `handleEntered`
   * because the game loop may call `update` while `transition` is awaiting the
   * `handleExited` handler of the previous state.
   */
  private pendingTransition = false;

  constructor(initialState: string, possibleStates: { [key: string]: T }, stateArgs: any[] = []) {
    this.initialState = initialState;
    this.possibleStates = possibleStates;
    this.stateArgs = stateArgs;
    this.state = null;

    // State instances get access to the state machine via this.stateMachine.
    // This is annoyingly implicit, but the alternative is fucking up a bunch
    // of method signatures that won't otherwise use this.
    // Useful for triggering a transition outside of `execute`.
    for (const state of Object.values(this.possibleStates)) {
      state.stateMachine = this;
      state.init(...this.stateArgs);
    }
  }

  update(...updateArgs: any[]) {
    if (this.state === null) {
      this.state = this.initialState;
      this.possibleStates[this.state].handleEntered(...this.stateArgs);
    }

    if (this.pendingTransition) {
      return;
    }

    // State function returns the state to transition to.
    // Transitions happen instantly rather than next-frame, so we need
    // to loop through until we don't transition.
    while (true) {
      // eslint-disable-line no-constant-condition
      const newState = this.possibleStates[this.state].update(...this.stateArgs, ...updateArgs);
      if (newState && typeof newState === 'string') {
        this.transition(newState);
      } else {
        break;
      }
    }
  }

  getStateObject() {
    if (this.state === null) {
      return null;
    }

    return this.possibleStates[this.state];
  }

  async transition(newState: string, ...enterArgs: any[]) {
    if (!(newState in this.possibleStates)) {
      throw Error(`Invalid state ${newState}`);
    }

    this.pendingTransition = true;

    if (this.state) {
      await this.possibleStates[this.state].handleExited(...this.stateArgs);
    }
    this.state = newState;
    await this.possibleStates[this.state].handleEntered(...this.stateArgs, ...enterArgs);

    this.pendingTransition = false;
  }

  async pushState(newState: string, ...enterArgs: any[]) {
    if (this.state) {
      this.stateStack.push(this.state);
    }

    return this.transition(newState, ...enterArgs);
  }

  async popState(...enterArgs: any[]) {
    const newState = this.stateStack.pop();
    if (!newState) {
      throw new Error('Cannot pop state; state stack is empty.');
    }

    return this.transition(newState, ...enterArgs);
  }
}

export class State {
  stateMachine!: StateMachine<any>;

  init(..._args: any[]) {}

  handleEntered(..._args: any[]): void | Promise<any> {}

  handleExited(..._args: any[]): void | Promise<any> {}

  update(..._args: any[]): unknown {
    return null;
  }

  async transition(newState: string, ...args: any[]) {
    return this.stateMachine.transition(newState, ...args);
  }

  async pushState(newState: string, ...enterArgs: any[]) {
    return this.stateMachine.pushState(newState, ...enterArgs);
  }

  async popState(...enterArgs: any[]) {
    return this.stateMachine.popState(...enterArgs);
  }
}

interface JustDownKey {
  _repeatCounter?: number;
}

type PadName = 'pad1' | 'pad2' | 'pad3' | 'pad4';
type ButtonName =
  | 'A'
  | 'B'
  | 'X'
  | 'Y'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'L1'
  | 'L2'
  | 'R1'
  | 'R2'
  | 'start'
  | 'select'
  | 'L3'
  | 'R3';

const BUTTON_INDEXES = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  L1: 4,
  R1: 5,
  L2: 6,
  R2: 7,
  select: 8,
  start: 9,
  L3: 10,
  R3: 11,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
};

interface DOMButtonOptions {
  usePointerEnter?: boolean;
}

class DOMButton {
  isDown = false;

  constructor(public readonly element: HTMLElement, { usePointerEnter = false }: DOMButtonOptions = {}) {
    if (usePointerEnter) {
      element.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        element.releasePointerCapture(event.pointerId);
      });
    }

    element.addEventListener(usePointerEnter ? 'pointerover' : 'pointerdown', (event) => {
      event.preventDefault();
      this.isDown = true;
      element.classList.add('is-down');
    });
    element.addEventListener(usePointerEnter ? 'pointerout' : 'pointerup', (event) => {
      console.log('out');
      event.preventDefault();
      this.isDown = false;
      element.classList.remove('is-down');
    });
    element.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }
}

interface ControllerButtonOptions {
  buttons?: ControllerButton[];
  keys?: string[];
  dom?: (HTMLElement | string)[];
  pad1?: ButtonName[];
  pad2?: ButtonName[];
  pad3?: ButtonName[];
  pad4?: ButtonName[];
  usePointerEnter?: boolean;
}

export class ControllerButton {
  buttons: ControllerButton[];
  keys: Phaser.Input.Keyboard.Key[];
  dom: DOMButton[];
  pads: {
    pad1?: Phaser.Input.Gamepad.Button[];
    pad2?: Phaser.Input.Gamepad.Button[];
    pad3?: Phaser.Input.Gamepad.Button[];
    pad4?: Phaser.Input.Gamepad.Button[];
  };

  public enabled = true;

  private _isDown = false;
  private _downLastFrame = false;

  constructor(
    scene: Phaser.Scene,
    { buttons = [], keys = [], dom = [], usePointerEnter = false, ...pads }: ControllerButtonOptions = {}
  ) {
    this.buttons = buttons;

    this.keys = keys
      .map((keyString) => scene.input.keyboard?.addKey(keyString))
      .filter((key): key is Phaser.Input.Keyboard.Key => !!key);

    this.pads = {};
    for (const [padName, buttonNames] of Object.entries(pads)) {
      this.pads[padName as PadName] = buttonNames
        .map((buttonName) => scene.input.gamepad![padName as PadName]?.buttons[BUTTON_INDEXES[buttonName]])
        .filter((button): button is Phaser.Input.Gamepad.Button => !!button);
    }

    this.dom = dom.map((element) => {
      if (typeof element === 'string') {
        const domElement = document.querySelector<HTMLElement>(element);
        if (!domElement) {
          throw new Error(`Couldn't find a dom element matching selector "${element}".`);
        }
        return new DOMButton(domElement, { usePointerEnter });
      }

      return new DOMButton(element, { usePointerEnter });
    });

    scene.events.on('preupdate', () => {
      this.update();
    });

    // Detect newly-added gamepads and hook up their buttons
    scene.input.gamepad!.once('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      let padName: PadName | null = null;

      if (scene.input.gamepad?.pad1?.id === pad.id) {
        padName = 'pad1';
      } else if (scene.input.gamepad?.pad2?.id === pad.id) {
        padName = 'pad2';
      } else if (scene.input.gamepad?.pad2?.id === pad.id) {
        padName = 'pad3';
      } else if (scene.input.gamepad?.pad2?.id === pad.id) {
        padName = 'pad4';
      }

      if (padName) {
        const buttonNames = pads[padName];
        if (buttonNames) {
          this.pads[padName] = buttonNames
            .map((buttonName) => scene.input.gamepad![padName]?.buttons[BUTTON_INDEXES[buttonName]])
            .filter((button): button is Phaser.Input.Gamepad.Button => !!button);
        }
      }
    });
  }

  get isDown() {
    return this._isDown;
  }

  get justDown() {
    return this._isDown && !this._downLastFrame;
  }

  update() {
    this._downLastFrame = this._isDown;
    this._isDown =
      this.enabled &&
      (this.buttons.some((button) => button.isDown) ||
        this.keys.some((key) => key.isDown) ||
        this.dom.some((domButton) => domButton.isDown) ||
        Object.values(this.pads).some((buttons) => buttons.some((button) => button.pressed)));
  }
}

export function justDown(key: Phaser.Input.Keyboard.Key & JustDownKey, repeatDelay?: number, repeatRate: number = 100) {
  const justDown = Phaser.Input.Keyboard.JustDown(key);
  if (repeatDelay === undefined) {
    return justDown;
  }

  if (key._repeatCounter === undefined) {
    key._repeatCounter = 0;
  }

  if (!key.isDown) {
    return false;
  }

  const duration = key.getDuration();
  if (justDown || duration < repeatDelay) {
    key._repeatCounter = 0;
    return justDown;
  }

  if (duration > repeatDelay + repeatRate * key._repeatCounter) {
    key._repeatCounter++;
    return true;
  }

  return false;
}

/** Wait for duration milliseconds and resolve the returned Promise. */
export function wait(scene: Phaser.Scene, duration: number) {
  return new Promise((resolve) => {
    scene.time.delayedCall(duration, resolve);
  });
}

interface TimedPatternOptions {
  /** If set, the pattern will loop back to the start once it is completed. */
  loop?: boolean;
}

export class TimedPattern {
  timerEvent: Phaser.Time.TimerEvent;
  private currentEventIndex = 0;
  loop: boolean;

  constructor(
    public scene: Phaser.Scene,
    public configs: Phaser.Types.Time.TimerEventConfig[],
    options: TimedPatternOptions = {}
  ) {
    this.loop = options.loop ?? false;

    this.timerEvent = scene.time.addEvent({
      ...configs[0],
      paused: true,
      callback: this.makePatternCallback(configs[0]),
    });
  }

  private queueNext(index: number | null = null) {
    this.currentEventIndex = index ?? this.currentEventIndex + 1;

    if (this.configs.length <= this.currentEventIndex) {
      if (this.loop) {
        this.currentEventIndex = 0;
      } else {
        return;
      }
    }

    const nextConfig = this.configs[this.currentEventIndex];
    this.timerEvent = this.scene.time.addEvent({
      ...nextConfig,
      callback: this.makePatternCallback(nextConfig),
    });
  }

  private makePatternCallback(config: Phaser.Types.Time.TimerEventConfig) {
    return () => {
      const result = config.callback?.apply(config.callbackScope, config.args);
      if (result?.type === 'loop') {
        this.queueNext(this.currentEventIndex);
      } else if (result?.type === 'goto') {
        this.queueNext(result.index);
      } else {
        this.queueNext();
      }
    };
  }

  get paused() {
    return this.timerEvent.paused;
  }

  set paused(value: boolean) {
    this.timerEvent.paused = value;
  }

  get timeScale() {
    return this.timerEvent.timeScale;
  }

  set timeScale(value: number) {
    this.timerEvent.timeScale = value;
  }

  reset() {
    this.currentEventIndex = 0;
    this.timerEvent = this.scene.time.addEvent({
      ...this.configs[0],
      paused: true,
      callback: this.makePatternCallback(this.configs[0]),
    });
  }

  static LOOP() {
    return { type: 'loop' };
  }

  static GOTO(index: number) {
    return { type: 'goto', index };
  }
}

/** Play an animation and resolve the returned promise once it completes. */
export function asyncAnimation(
  sprite: Phaser.GameObjects.Sprite,
  keyOrConfig: string | Phaser.Types.Animations.PlayAnimationConfig
): Promise<void> {
  return new Promise((resolve) => {
    sprite.once('animationcomplete', resolve);
    sprite.play(keyOrConfig);
  });
}

interface TweenPromise extends Promise<void> {
  tween: Phaser.Tweens.Tween;
}

/** Execute a tween and resolve the returned promise once it completes */
export function asyncTween(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  let tween: Phaser.Tweens.Tween | null = null;
  const promise: TweenPromise = new Promise<void>((resolve) => {
    tween = scene.add.tween({
      ...config,
      onComplete(...args) {
        if (config.onComplete) {
          config.onComplete(...args);
        }
        resolve();
      },
    });
  }) as TweenPromise;
  promise.tween = tween!;
  return promise;
}

/** Execute a counter tween and resolve the returned promise once it completes */
export function asyncCounter(scene: Phaser.Scene, config: Phaser.Types.Tweens.NumberTweenBuilderConfig) {
  let tween: Phaser.Tweens.Tween | null = null;
  const promise: TweenPromise = new Promise<void>((resolve) => {
    tween = scene.tweens.addCounter({
      ...config,
      onComplete(...args) {
        if (config.onComplete) {
          config.onComplete(...args);
        }
        resolve();
      },
    });
  }) as TweenPromise;
  promise.tween = tween!;
  return promise;
}

export async function forEachTween<T>(
  scene: Phaser.Scene,
  values: T[],
  frameDuration: number,
  callback: (value: T) => void
) {
  return asyncCounter(scene, {
    from: 0,
    to: values.length - 1,
    duration: frameDuration * values.length,
    ease(v: number) {
      return Phaser.Math.Easing.Stepped(v, values.length - 1);
    },
    onUpdate(tween) {
      callback(values[Math.floor(tween.getValue())]);
    },
  });
}

interface RelativePosition {
  x?: number;
  y?: number;
}

export async function relativePositionTween(
  scene: Phaser.Scene,
  targets: Phaser.GameObjects.Components.Transform[],
  positions: RelativePosition[],
  frameDuration: number
) {
  const originalPositions = targets.map((target) => ({ x: target.x, y: target.y }));
  await forEachTween(scene, positions, frameDuration, (position) => {
    for (let k = 0; k < targets.length; k++) {
      const target = targets[k];
      target.x = originalPositions[k].x + (position.x ?? 0);
      target.y = originalPositions[k].y + (position.y ?? 0);
    }
  });
}

export enum ShakeAxis {
  X = 'x',
  Y = 'y',
}

export async function shake(
  scene: Phaser.Scene,
  targets: Phaser.GameObjects.Components.Transform[],
  axis: ShakeAxis,
  amounts: number[],
  frameDuration: number
) {
  return relativePositionTween(
    scene,
    targets,
    amounts.map((amount) => ({ [axis]: amount })),
    frameDuration
  );
}

export async function flash(
  scene: Phaser.Scene,
  targets: Phaser.GameObjects.Components.Visible[],
  times: number,
  duration: number
) {
  return asyncCounter(scene, {
    from: 0,
    to: times * 2 - 1,
    duration: duration,
    onUpdate(tween) {
      const visible = Math.floor(tween.getValue()) % 2 !== 0;
      for (const target of targets) {
        target.setVisible(visible);
      }
    },
    onComplete() {
      for (const target of targets) {
        target.setVisible(true);
      }
    },
  });
}

export function asyncLoad(scene: Phaser.Scene, loadFunc: (scene: Phaser.Scene) => unknown) {
  return new Promise((resolve) => {
    loadFunc(scene);
    scene.load.once('complete', resolve);
    scene.load.start();
  });
}

export function steppedCubicEase(duration: number, frameRate = 10) {
  const frameDuration = 1000 / frameRate;
  const steps = duration / frameDuration;
  return (v: number) => {
    return Phaser.Math.Easing.Cubic.Out(Phaser.Math.Easing.Stepped(v, steps));
  };
}

interface PointerEventHandlers {
  hover?: () => unknown;
  activate?: () => unknown;
  deactivate?: () => unknown;
  click?: () => unknown;
}

export function onPointer(gameObject: Phaser.GameObjects.GameObject, handlers: PointerEventHandlers) {
  let clicking = false;
  gameObject.on('pointerdown', () => {
    handlers.activate?.();
    clicking = true;
  });
  gameObject.on('pointerout', () => {
    if (clicking) {
      handlers.deactivate?.();
    }
    clicking = false;
  });
  gameObject.on('pointerup', () => {
    if (clicking) {
      clicking = false;
      handlers.deactivate?.();
      handlers.click?.();
    }
  });
  gameObject.on('pointerover', () => {
    handlers.hover?.();
  });
}

export function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function centerOf(
  object: Phaser.Cameras.Scene2D.BaseCamera | Phaser.GameObjects.Components.GetBounds
): [number, number] {
  if (object instanceof Phaser.Cameras.Scene2D.BaseCamera) {
    return [object.centerX, object.centerY];
  }

  const center = object.getCenter<Phaser.Math.Vector2>();
  return [center.x, center.y];
}

export function fillArray<T>(length: number, makeValue: (index: number) => T): T[] {
  const array = [];
  for (let k = 0; k < length; k++) {
    array.push(makeValue(k));
  }
  return array;
}

export function fillMatrix<T>(width: number, height: number, makeValue: (x: number, y: number) => T): T[][] {
  const matrix = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push(makeValue(x, y));
    }
    matrix.push(row);
  }
  return matrix;
}

export function defaultHitProcess(
  _: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  other: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
) {
  if (other instanceof Phaser.Tilemaps.Tile) {
    return other.getCollisionGroup() !== null;
  }
  return true;
}

export function wouldHit(
  scene: Phaser.Scene,
  gameObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  collider2: Phaser.Types.Physics.Arcade.ArcadeColliderType,
  dx = 0,
  dy = 0,
  collideCallback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
  processCallback: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = defaultHitProcess
) {
  gameObject.body.position.x += dx;
  gameObject.body.position.y += dy;
  const hit = scene.physics.overlap(gameObject, collider2, collideCallback, processCallback);
  gameObject.body.position.x -= dx;
  gameObject.body.position.y -= dy;
  return hit;
}

export function getTiledProperty<T>(
  object: Phaser.Types.Tilemaps.TiledObject | Phaser.Tilemaps.LayerData,
  name: string
): T {
  return object.properties?.find?.((property: { name: string }) => property.name === name)?.value;
}

export function asyncPlaySound(sound: Phaser.Sound.BaseSound) {
  return new Promise((resolve) => {
    sound.once('complete', resolve).play();
  });
}
