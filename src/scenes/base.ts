import { ControllerButton } from 'game/util';

export default class BaseScene extends Phaser.Scene {
  controller!: {
    up: ControllerButton;
    down: ControllerButton;
    left: ControllerButton;
    right: ControllerButton;
    button1: ControllerButton;
    button2: ControllerButton;
    start: ControllerButton;
  };
  fadeRect!: Phaser.GameObjects.Rectangle;

  loadResources(_scene: Phaser.Scene) {}

  create(_data?: object) {
    this.controller = {
      up: new ControllerButton(this, { keys: ['UP'], pad1: ['up'] }),
      down: new ControllerButton(this, { keys: ['DOWN'], pad1: ['down'] }),
      left: new ControllerButton(this, { keys: ['LEFT'], pad1: ['left'] }),
      right: new ControllerButton(this, {
        keys: ['RIGHT'],
        pad1: ['right'],
      }),
      button1: new ControllerButton(this, { keys: ['SPACE', 'Z', 'D'], pad1: ['A', 'Y'] }),
      button2: new ControllerButton(this, { keys: ['SHIFT', 'X', 'F'], pad1: ['B', 'X'] }),
      start: new ControllerButton(this, { keys: ['ENTER'], pad1: ['start'] }),
    };
  }
}
