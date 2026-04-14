import { Scene, GameObjects } from 'phaser';
import { GameState } from '../GameState';
import { PARTS, getPartsForSlot, BUILD_BUDGET, SlotType, PartDef } from '../parts';

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
    { key: 'nose', label: 'NOSE', slotType: 'nose', x: 360, y: 300, w: 80, h: 60 },
    { key: 'body', label: 'BODY', slotType: 'body', x: 360, y: 420, w: 100, h: 100 },
    { key: 'leftModule', label: 'LEFT', slotType: 'module', x: 240, y: 420, w: 70, h: 70 },
    { key: 'rightModule', label: 'RIGHT', slotType: 'module', x: 480, y: 420, w: 70, h: 70 },
    { key: 'engine', label: 'ENGINE', slotType: 'engine', x: 360, y: 560, w: 100, h: 80 },
];

export class BuildScene extends Scene {
    private budgetText!: GameObjects.Text;
    private gearsText!: GameObjects.Text;
    private slotLabels: Map<string, GameObjects.Text> = new Map();
    private partPanel: GameObjects.Container | null = null;
    private launchBtn!: GameObjects.Text;
    private soundtrack!: Phaser.Sound.BaseSound;

    constructor() {
        super('BuildScene');
    }

    preload() {
        this.load.audio('soundtrack', 'assets/soundtrack.mp3');
        this.load.audio('click', 'assets/click.mp3');
        this.load.audio('buy', 'assets/buy.mp3');
        this.load.audio('error', 'assets/error.mp3');
        this.load.audio('build', 'assets/build.mp3');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        this.soundtrack = this.sound.add('soundtrack', {
            loop: true,
            volume: GameState.getMusicVolume(),
        });
        this.soundtrack.play();

        this.events.on('shutdown', () => {
            this.soundtrack.stop();
        });
        // Header
        this.budgetText = this.add.text(20, 30, '', {
            fontSize: '24px', color: '#ffffff', fontFamily: 'monospace'
        });

        this.gearsText = this.add.text(700, 30, '', {
            fontSize: '24px', color: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(1, 0);

        this.add.text(360, 120, 'BUILD YOUR ROCKET', {
            fontSize: '36px', color: '#ff6b35', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Draw slots
        for (const slot of SLOTS) {
            const rect = this.add.rectangle(slot.x, slot.y, slot.w, slot.h)
                .setStrokeStyle(2, 0x4a9eff)
                .setInteractive({ useHandCursor: true });

            const label = this.add.text(slot.x, slot.y, slot.label, {
                fontSize: '16px', color: '#4a9eff', fontFamily: 'monospace'
            }).setOrigin(0.5);

            this.slotLabels.set(slot.key, label);

            rect.on('pointerdown', () => {
                this.playClick();
                this.openPartPanel(slot);
            });
            rect.on('pointerover', () => rect.setStrokeStyle(3, 0xffffff));
            rect.on('pointerout', () => rect.setStrokeStyle(2, 0x4a9eff));
        }

        // Launch button
        this.launchBtn = this.add.text(360, 750, '[ LAUNCH ]', {
            fontSize: '48px', color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.launchBtn.on('pointerover', () => this.launchBtn.setColor('#ff8888'));
        this.launchBtn.on('pointerout', () => this.launchBtn.setColor('#ff4444'));
        this.launchBtn.on('pointerdown', () => {
            this.playClick();
            this.launch();
        });

        // Back button
        const backBtn = this.add.text(60, 1230, '< MENU', {
            fontSize: '24px', color: '#888888', fontFamily: 'monospace'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => {
            this.playClick();
            this.scene.start('MenuScene');
        });

        this.refreshUI();
    }

    private refreshUI() {
        const used = GameState.getBudgetUsed();
        this.budgetText.setText(`BUDGET: ${used}/${BUILD_BUDGET}`);
        this.budgetText.setColor(used > BUILD_BUDGET ? '#ff4444' : '#ffffff');
        this.gearsText.setText(`${GameState.currency}G`);

        for (const slot of SLOTS) {
            const partId = GameState.rocketConfig[slot.key];
            const label = this.slotLabels.get(slot.key)!;
            if (partId) {
                const part = PARTS[partId];
                label.setText(part.name);
                label.setColor('#ffffff');
            } else {
                label.setText(slot.label);
                label.setColor('#4a9eff');
            }
        }

        const hasEngine = !!GameState.rocketConfig.engine;
        const overBudget = GameState.getBudgetUsed() > BUILD_BUDGET;
        this.launchBtn.setAlpha(hasEngine && !overBudget ? 1 : 0.3);
    }

    private openPartPanel(slot: SlotUI) {
        this.closePartPanel();

        const parts = getPartsForSlot(slot.slotType);
        const panelX = 360;
        const panelY = 900;
        const container = this.add.container(panelX, panelY);

        // Background
        const bg = this.add.rectangle(0, 0, 600, parts.length * 70 + 80, 0x2a2a3e, 0.95)
            .setOrigin(0.5, 0);
        container.add(bg);

        // Title
        const title = this.add.text(0, 15, `SELECT ${slot.label}`, {
            fontSize: '24px', color: '#ff6b35', fontFamily: 'monospace'
        }).setOrigin(0.5, 0);
        container.add(title);

        // "Empty" option for optional slots
        if (slot.slotType === 'module') {
            const emptyBtn = this.add.text(0, 60, '[ EMPTY ]', {
                fontSize: '20px', color: '#888888', fontFamily: 'monospace'
            }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
            emptyBtn.on('pointerdown', () => {
                this.playClick();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (GameState.rocketConfig as any)[slot.key] = null;
                this.closePartPanel();
                this.refreshUI();
            });
            container.add(emptyBtn);
        }

        const startY = slot.slotType === 'module' ? 100 : 60;

        parts.forEach((part, i) => {
            const y = startY + i * 70;
            const unlocked = GameState.isUnlocked(part.id);
            const equipped = GameState.rocketConfig[slot.key] === part.id;

            const color = equipped ? '#00ff88' : unlocked ? '#ffffff' : '#666666';
            const statsStr = this.getPartStats(part);

            const nameText = this.add.text(-250, y, part.name, {
                fontSize: '22px', color, fontFamily: 'monospace'
            });
            container.add(nameText);

            const statsText = this.add.text(-250, y + 24, statsStr, {
                fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace'
            });
            container.add(statsText);

            const costText = this.add.text(250, y, `$${part.budgetCost}`, {
                fontSize: '20px', color: '#ffcc00', fontFamily: 'monospace'
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
                nameText.on('pointerover', () => nameText.setColor('#4a9eff'));
                nameText.on('pointerout', () => nameText.setColor(equipped ? '#00ff88' : '#ffffff'));
            } else {
                const unlockBtn = this.add.text(250, y + 24, `UNLOCK: ${part.unlockCost}G`, {
                    fontSize: '14px',
                    color: GameState.currency >= (part.unlockCost ?? 0) ? '#ffcc00' : '#ff4444',
                    fontFamily: 'monospace'
                }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
                unlockBtn.on('pointerdown', () => {
                    if (GameState.unlockPart(part.id)) {
                        this.sound.play('buy', { volume: GameState.getSfxVolume() });
                        this.closePartPanel();
                        this.openPartPanel(slot);
                    } else {
                        this.sound.play('error', { volume: GameState.getSfxVolume() });
                    }
                });
                container.add(unlockBtn);
            }
        });

        this.partPanel = container;
    }

    private getPartStats(part: PartDef): string {
        const stats: string[] = [`wt:${part.weight}`];
        if (part.drag !== undefined) stats.push(`drag:${part.drag}`);
        if (part.hp !== undefined) stats.push(`hp:${part.hp}`);
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
        }
    }

    private launch() {
        const hasEngine = !!GameState.rocketConfig.engine;
        const overBudget = GameState.getBudgetUsed() > BUILD_BUDGET;
        if (!hasEngine || overBudget) return;

        this.scene.start('FlightScene');
    }
}
