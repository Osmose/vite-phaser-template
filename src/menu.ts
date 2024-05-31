import Phaser from 'phaser';

import { ControllerButton, Direction } from 'game/util';

interface MenuItem {
  key: string;
  isCancel?: boolean;
  [Direction.Up]?: string;
  [Direction.Down]?: string;
  [Direction.Left]?: string;
  [Direction.Right]?: string;
}

interface Controls {
  up: ControllerButton;
  down: ControllerButton;
  left: ControllerButton;
  right: ControllerButton;
  confirm: ControllerButton;
  cancel: ControllerButton;
}

export class Menu extends Phaser.Events.EventEmitter {
  protected cursor: string | null = null;
  protected inputPaused = false;

  constructor(
    protected scene: Phaser.Scene,
    protected controls: Controls,
    protected menuItems: { [key: string]: MenuItem } = {}
  ) {
    super();

    const menuItemKeys = Object.keys(menuItems);
    if (menuItemKeys.length > 0) {
      this.moveCursorTo(menuItemKeys[0]);
    }
  }

  setMenuItems(menuItems: { [key: string]: MenuItem }, resetCursor = true) {
    this.menuItems = menuItems;

    if (resetCursor) {
      this.moveCursorTo(Object.keys(menuItems)[0]);
    }
  }

  currentItem() {
    return this.cursor ? this.menuItems[this.cursor] : null;
  }

  moveCursorTo(key: string) {
    const oldCursor = this.cursor;
    this.cursor = key;
    this.emit('focus', this.cursor, this.currentItem(), oldCursor, this);
  }

  moveCursorInDirection(direction: Direction) {
    const currentItem = this.currentItem();
    if (currentItem && currentItem[direction] !== undefined) {
      this.moveCursorTo(currentItem[direction] as string);
    }
  }

  pauseInput() {
    this.inputPaused = true;
    return this;
  }

  resumeInput() {
    this.inputPaused = false;
    return this;
  }

  update() {
    if (this.inputPaused) {
      return;
    }

    if (this.controls.confirm.justDown) {
      if (this.currentItem()?.isCancel) {
        this.emit('cancel', this.cursor);
      } else {
        this.emit('select', this.cursor, this.currentItem());
      }
    } else if (this.controls.cancel.justDown) {
      this.emit('cancel', this.cursor);
    } else if (this.controls.up.justDown) {
      this.moveCursorInDirection(Direction.Up);
    } else if (this.controls.down.justDown) {
      this.moveCursorInDirection(Direction.Down);
    } else if (this.controls.left.justDown) {
      this.moveCursorInDirection(Direction.Left);
    } else if (this.controls.right.justDown) {
      this.moveCursorInDirection(Direction.Right);
    }
  }
}

export function verticalMenuItems<T extends MenuItem>(itemList: T[]) {
  return itemList.reduce<{ [key: string]: T }>((acc, menuItem, index) => {
    menuItem[Direction.Up] = index === 0 ? itemList[itemList.length - 1].key : itemList[index - 1].key;
    menuItem[Direction.Down] = index === itemList.length - 1 ? itemList[0].key : itemList[index + 1].key;
    acc[menuItem.key] = menuItem;
    return acc;
  }, {});
}

export function horizontalMenuItems<T extends MenuItem>(itemList: T[]) {
  return itemList.reduce<{ [key: string]: T }>((acc, menuItem, index) => {
    menuItem[Direction.Left] = index === 0 ? itemList[itemList.length - 1].key : itemList[index - 1].key;
    menuItem[Direction.Right] = index === itemList.length - 1 ? itemList[0].key : itemList[index + 1].key;
    acc[menuItem.key] = menuItem;
    return acc;
  }, {});
}

interface TextMenuItem extends MenuItem {
  text: string;
  x: number;
  y: number;
}

export class TextMenu extends Menu {
  protected bitmapTexts: { [key: string]: Phaser.GameObjects.BitmapText } = {};

  constructor(scene: Phaser.Scene, controls: Controls, protected menuItems: { [key: string]: TextMenuItem } = {}) {
    super(scene, controls, menuItems);

    for (const [key, { x, y, text }] of Object.entries(menuItems)) {
      this.bitmapTexts[key] = this.scene.add.bitmapText(x, y, 'text', ` ${text}`);
    }

    this.on('focus', (cursor: string, _menuItem: TextMenuItem, oldCursor: string) => {
      this.setBitmapTextPrefix(cursor, '>');
      this.setBitmapTextPrefix(oldCursor, ' ');
    });
  }

  protected setBitmapTextPrefix(key: string, prefix: string) {
    const bitmapText = this.bitmapTexts[key];
    bitmapText?.setText(`${prefix}${bitmapText.text.slice(1)}`);
  }

  setMenuItems(menuItems: { [key: string]: TextMenuItem }, resetCursor = true) {
    for (const bitmapText of Object.values(this.bitmapTexts)) {
      bitmapText.destroy();
    }

    for (const [key, { x, y, text }] of Object.entries(menuItems)) {
      this.bitmapTexts[key] = this.scene.add.bitmapText(x, y, 'text', ` ${text}`);
    }

    super.setMenuItems(menuItems, resetCursor);
  }

  destroy() {
    for (const bitmapText of Object.values(this.bitmapTexts)) {
      bitmapText.destroy();
    }
  }
}
