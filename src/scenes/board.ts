import BaseScene from 'game/scenes/base';

export default class TitleScene extends BaseScene {
  text!: Phaser.GameObjects.Text;

  constructor() {
    super({
      key: 'board',
    });
  }

  create() {
    super.create();

    this.text = this.add.text(10, 10, 'Game running');
  }

  update() {}
}
