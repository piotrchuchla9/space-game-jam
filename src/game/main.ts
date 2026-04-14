import { AUTO, Game, Scale, Types } from "phaser";
import { MenuScene } from "./scenes/MenuScene";
import { BuildScene } from "./scenes/BuildScene";
import { FlightScene } from "./scenes/FlightScene";
import { HUDScene } from "./scenes/HUDScene";
import { CrashScene } from "./scenes/CrashScene";
import { AchievementsScene } from "./scenes/AchievementsScene";
import { GameState } from "./GameState";

const config: Types.Core.GameConfig = {
  type: AUTO,
  width: 720,
  height: 1280,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  input: {
    keyboard: true,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: 0.3 },
      debug: false,
    },
  },
  scene: [MenuScene, BuildScene, FlightScene, HUDScene, CrashScene, AchievementsScene],
};

const StartGame = (parent: string) => {
  if (typeof WavedashJS !== "undefined") {
    WavedashJS.init({ debug: true, deferEvents: true });
    WavedashJS.addEventListener(WavedashJS.Events.BACKEND_CONNECTED, () => {
      console.log("Wavedash backend connected");
      GameState.wavedashReady = true;
    });
    WavedashJS.readyForEvents();
  }
  return new Game({ ...config, parent });
};

export default StartGame;
