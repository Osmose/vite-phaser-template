import Phaser from 'phaser';
import registerTiledJSONExternalLoader from 'phaser-tiled-json-external-loader';

import BoardScene from 'game/scenes/board';
import LoadingScene from 'game/scenes/loading';

declare global {
  interface Window {
    game: Phaser.Game;
  }
}

registerTiledJSONExternalLoader(Phaser);

window.addEventListener('load', () => {
  window.game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 256,
    height: 240,
    scale: {
      fullscreenTarget: document.body,
      mode: Phaser.Scale.FIT,
    },
    backgroundColor: '#000',
    render: {
      pixelArt: true,
    },
    input: {
      keyboard: true,
      gamepad: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 1000 },
      },
    },
    scene: [new LoadingScene(), new BoardScene()],
  });
});
