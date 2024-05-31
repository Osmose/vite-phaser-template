import BaseScene from 'game/scenes/base';
import { asyncLoad } from 'game/util';

export default class LoadingScene extends Phaser.Scene {
  text!: Phaser.GameObjects.Text;

  constructor() {
    super({
      key: 'loading',
    });
  }

  preload() {
    // Load resources necessary for loading screen only
  }

  create() {
    this.text = this.add.text(10, 10, 'Loading...');

    asyncLoad(this, () => {
      for (const scene of this.game.scene.scenes) {
        (scene as BaseScene).loadResources?.(this);
      }
    }).then(async () => {
      this.scene.start('board');
    });
  }

  update() {}
}
