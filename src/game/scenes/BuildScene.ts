import { Scene, GameObjects, Math as PhaserMath } from 'phaser';
import { GameState } from '../GameState';
import { PARTS, getPartsForSlot, BUILD_BUDGET, BASE_FUEL, SlotType, PartDef } from '../parts';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { warpIn, warpOut, rocketLiftoff } from '../ui/SceneTransition';
import { title, panel } from '../ui/typography';
import { burst } from '../ui/Confetti';
import { HEX } from '../ui/colors';

interface SlotUI {
    key: 'nose' | 'body' | 'engine' | 'leftModule' | 'rightModule';
    label: string;
    slotType: SlotType;
    x: number;
    y: number;
    w: number;
    h: number;
}

const SLOTS: SlotUI[] = [
    { key: 'nose', label: 'NOSE', slotType: 'nose', x: 360, y: 550, w: 96, h: 72 },
    { key: 'body', label: 'BODY', slotType: 'body', x: 360, y: 680, w: 120, h: 120 },
    { key: 'leftModule', label: 'LEFT', slotType: 'module', x: 220, y: 680, w: 84, h: 84 },
    { key: 'rightModule', label: 'RIGHT', slotType: 'module', x: 500, y: 680, w: 84, h: 84 },
    { key: 'engine', label: 'ENGINE', slotType: 'engine', x: 360, y: 840, w: 120, h: 96 },
];

export class BuildScene extends Scene {
    private budgetText!: GameObjects.Text;
    private gearsText!: GameObjects.Text;
    private slotLabels: Map<string, GameObjects.Text> = new Map();
    private rocketContainer!: GameObjects.Container;
    private partPanel: GameObjects.Container | null = null;
    private summaryText!: GameObjects.Text;
    private launchBtn!: CartoonButton;
    private soundtrack!: Phaser.Sound.BaseSound;
    private starfield!: StarfieldBackground;

    constructor() {
        super('BuildScene');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        this.soundtrack = this.sound.add('soundtrack', { loop: true, volume: GameState.getMusicVolume() });
        this.soundtrack.play();
        this.events.on('shutdown', () => this.soundtrack.stop());

        this.starfield = new StarfieldBackground(this, { density: 0.4 });

        panel(this, 110, 50, 200, 48);
        this.budgetText = this.add.text(110, 50, '', {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '20px',
            color: HEX.ink,
            stroke: HEX.accentCyan,
            strokeThickness: 3,
        }).setOrigin(0.5);

        panel(this, 610, 50, 180, 48);
        const gearIcon = this.add.image(555, 50, 'gear').setScale(0.35);
        this.tweens.add({ targets: gearIcon, rotation: Math.PI * 2, duration: 6000, repeat: -1 });
        this.gearsText = this.add.text(630, 50, '', {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '20px',
            color: HEX.ink,
            stroke: HEX.accentWarm,
            strokeThickness: 3,
        }).setOrigin(0.5);

        title(this, 360, 140, 'BUILD YOUR ROCKET', 36, { color: HEX.accentPink, strokeThickness: 5, rotation: -0.017 });

        this.rocketContainer = this.add.container(0, 0);
        this.rocketContainer.add(this.add.image(360, 695, 'rocket').setScale(1.5).setAlpha(0.9));

        for (const slot of SLOTS) {
            const lbl = this.add.text(slot.x, slot.y, slot.label, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '18px',
                color: HEX.accentCyan,
                stroke: HEX.ink,
                strokeThickness: 3,
            }).setOrigin(0.5);
            this.slotLabels.set(slot.key, lbl);
            this.rocketContainer.add(lbl);

            const hit = this.add.rectangle(slot.x, slot.y, slot.w, slot.h, 0, 0)
                .setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => {
                this.playClick();
                this.openPartPanel(slot);
            });
            this.rocketContainer.add(hit);

            this.tweens.add({
                targets: lbl,
                angle: PhaserMath.Between(-1, 1),
                duration: 4000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.inOut',
            });
        }

        panel(this, 360, 1095, 520, 80);
        this.summaryText = this.add.text(360, 1095, '', {
            fontFamily: '"Trebuchet MS", sans-serif',
            fontSize: '18px',
            color: HEX.ink,
            align: 'center',
            lineSpacing: 6,
        }).setOrigin(0.5);

        this.launchBtn = new CartoonButton(this, 360, 1180, '▲ LAUNCH', {
            variant: 'secondary', width: 340, height: 96, fontSize: 36, wobble: true,
            onClick: () => { this.playClick(); this.launch(); },
        });

        new CartoonButton(this, 90, 1230, '< MENU', {
            variant: 'ghost', width: 120, height: 40, fontSize: 15,
            onClick: () => { this.playClick(); warpOut(this, () => this.scene.start('MenuScene')); },
        });

        this.refreshUI();
        warpIn(this);
    }

    private refreshUI() {
        const used = GameState.getBudgetUsed();
        this.budgetText.setText(`BUDGET ${used}/${BUILD_BUDGET}`);
        this.budgetText.setColor(used > BUILD_BUDGET ? HEX.accentPink : HEX.ink);
        this.gearsText.setText(`${GameState.currency}G`);

        for (const slot of SLOTS) {
            const partId = GameState.rocketConfig[slot.key];
            const lbl = this.slotLabels.get(slot.key)!;
            if (partId) {
                const part = PARTS[partId];
                lbl.setText(part.name);
                lbl.setColor(HEX.paper);
            } else {
                lbl.setText(slot.label);
                lbl.setColor(HEX.accentCyan);
            }
        }

        const hasEngine = !!GameState.rocketConfig.engine;
        const overBudget = GameState.getBudgetUsed() > BUILD_BUDGET;
        this.launchBtn.setEnabled(hasEngine && !overBudget);
        this.summaryText.setText(this.buildSummary());
    }

    private buildSummary(): string {
        const cfg = GameState.rocketConfig;
        if (!cfg.engine || !cfg.nose || !cfg.body) return '— select parts to see stats —';

        const engine = PARTS[cfg.engine];
        const nose = PARTS[cfg.nose];
        const body = PARTS[cfg.body];
        const leftMod = cfg.leftModule ? PARTS[cfg.leftModule] : null;
        const rightMod = cfg.rightModule ? PARTS[cfg.rightModule] : null;

        const thrust = engine.thrust ?? 5;
        const burn = engine.fuelBurn ?? 1;
        const ctrl = engine.control ?? 0;
        const drag = nose.drag ?? 1;
        const bonusFuel = (leftMod?.bonusFuel ?? 0) + (rightMod?.bonusFuel ?? 0);
        const fuel = BASE_FUEL + bonusFuel;
        const shield = (leftMod?.shieldHP ?? 0) + (rightMod?.shieldHP ?? 0);

        const parts: string[] = [
            `THRUST ${thrust}  FUEL ${fuel}  BURN ${burn}/s`,
            `DRAG ${drag}  CTRL ${ctrl}${shield > 0 ? `  SHIELD ${shield}` : ''}`,
        ];
        return parts.join('\n');
    }

    private openPartPanel(slot: SlotUI) {
        this.closePartPanel();

        const parts = getPartsForSlot(slot.slotType);
        const extraRow = slot.slotType === 'module' ? 1 : 0;
        const rows = parts.length + extraRow;
        const panelW = 340;
        const panelH = rows * 76 + 80;
        const panelX = panelW / 2;
        const panelY = 640;
        const container = this.add.container(-panelX, panelY);

        const bg = this.add.nineslice(0, 0, 'ui_panel', 0, panelW, panelH, 16, 16, 16, 16);
        container.add(bg);

        const closeBtn = this.add.text(panelW / 2 - 16, -panelH / 2 + 16, '✕', {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '22px',
            color: HEX.accentPink,
            stroke: HEX.ink,
            strokeThickness: 3,
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => { this.playClick(); this.closePartPanel(); });
        closeBtn.on('pointerover', () => closeBtn.setAlpha(0.7));
        closeBtn.on('pointerout', () => closeBtn.setAlpha(1));
        container.add(closeBtn);

        const t = this.add.text(0, -panelH / 2 + 28, `SELECT ${slot.label}`, {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '24px',
            color: HEX.accentPink,
            stroke: HEX.ink,
            strokeThickness: 3,
        }).setOrigin(0.5, 0.5);
        container.add(t);

        let cursorY = -panelH / 2 + 70;

        if (slot.slotType === 'module') {
            const emptyBtn = this.add.text(0, cursorY + 28, '[ EMPTY ]', {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '20px',
                color: HEX.accentLilac,
                stroke: HEX.ink,
                strokeThickness: 3,
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            emptyBtn.on('pointerdown', () => {
                this.playClick();
                (GameState.rocketConfig as unknown as Record<string, string | null>)[slot.key] = null;
                this.closePartPanel();
                this.refreshUI();
            });
            container.add(emptyBtn);
            cursorY += 76;
        }

        parts.forEach((part) => {
            const y = cursorY + 28;
            cursorY += 76;

            const unlocked = GameState.isUnlocked(part.id);
            const equipped = GameState.rocketConfig[slot.key] === part.id;
            const color = equipped ? '#007744' : unlocked ? HEX.ink : '#555';

            const nameText = this.add.text(-150, y - 10, part.name, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '20px',
                color,
                stroke: equipped ? '#00ff88' : HEX.accentCyan,
                strokeThickness: 2,
            });
            container.add(nameText);

            const statsText = this.add.text(-150, y + 18, this.getPartStats(part), {
                fontFamily: '"Trebuchet MS", sans-serif',
                fontSize: '12px',
                color: '#4a3a7a',
            });
            container.add(statsText);

            const costText = this.add.text(150, y - 10, `$${part.budgetCost}`, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '18px',
                color: HEX.ink,
                stroke: HEX.accentWarm,
                strokeThickness: 2,
            }).setOrigin(1, 0);
            container.add(costText);

            if (unlocked) {
                nameText.setInteractive({ useHandCursor: true });
                nameText.on('pointerdown', () => {
                    GameState.rocketConfig[slot.key] = part.id;
                    this.sound.play('build', { volume: GameState.getSfxVolume() });
                    this.closePartPanel();
                    this.refreshUI();
                });
                nameText.on('pointerover', () => nameText.setColor(HEX.accentCyan));
                nameText.on('pointerout', () => nameText.setColor(equipped ? '#007744' : HEX.ink));
            } else {
                const unlockBtn = this.add.text(150, y + 18, `UNLOCK: ${part.unlockCost}G`, {
                    fontFamily: '"Trebuchet MS", sans-serif',
                    fontSize: '13px',
                    color: GameState.currency >= (part.unlockCost ?? 0) ? '#7a5500' : '#aa0033',
                }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
                unlockBtn.on('pointerdown', () => {
                    if (GameState.unlockPart(part.id)) {
                        this.sound.play('buy', { volume: GameState.getSfxVolume() });
                        burst(this, panelX, panelY + y);
                        this.closePartPanel();
                        this.openPartPanel(slot);
                    } else {
                        this.sound.play('error', { volume: GameState.getSfxVolume() });
                    }
                });
                container.add(unlockBtn);
            }
        });

        this.tweens.add({ targets: container, x: panelX, duration: 300, ease: 'Back.easeOut' });
        this.tweens.add({ targets: this.rocketContainer, x: 190, duration: 300, ease: 'Back.easeOut' });
        this.partPanel = container;
    }

    private getPartStats(part: PartDef): string {
        const stats: string[] = [`wt:${part.weight}`];
        if (part.drag !== undefined) stats.push(`drag:${part.drag}`);
        if (part.thrust !== undefined) stats.push(`thrust:${part.thrust}`);
        if (part.control !== undefined) stats.push(`ctrl:${part.control}`);
        if (part.fuelBurn !== undefined) stats.push(`burn:${part.fuelBurn}`);
        if (part.rotationDamping !== undefined) stats.push(`stab:${part.rotationDamping}`);
        if (part.bonusFuel !== undefined) stats.push(`+fuel:${part.bonusFuel}`);
        if (part.shieldHP !== undefined) stats.push(`shield:${part.shieldHP}`);
        return stats.join(' | ');
    }

    private closePartPanel() {
        if (this.partPanel) {
            this.partPanel.destroy();
            this.partPanel = null;
            this.tweens.add({ targets: this.rocketContainer, x: 0, duration: 250, ease: 'Sine.easeOut' });
        }
    }

    private launch() {
        const hasEngine = !!GameState.rocketConfig.engine;
        const overBudget = GameState.getBudgetUsed() > BUILD_BUDGET;
        if (!hasEngine || overBudget) return;

        this.scene.start('FlightScene');
    }
}
