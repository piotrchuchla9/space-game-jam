import { Scene, GameObjects } from 'phaser';
import { GameState } from '../GameState';
import { PARTS, getPartsForSlot, BASE_FUEL, SlotType, PartDef } from '../parts';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { warpIn, warpOut, rocketLiftoff } from '../ui/SceneTransition';
import { title, panel } from '../ui/typography';
import { burst } from '../ui/Confetti';
import { HEX } from '../ui/colors';

interface SlotUI {
    key: 'nose' | 'body' | 'engine' | 'sides';
    label: string;
    slotType: SlotType;
    x: number;
    y: number;
    w: number;
    h: number;
}

const SLOTS: SlotUI[] = [
    { key: 'nose',   label: 'NOSE',   slotType: 'nose',   x: 360, y: 545, w: 104, h: 80  },
    { key: 'body',   label: 'BODY',   slotType: 'body',   x: 360, y: 690, w: 110, h: 100 },
    { key: 'sides',  label: 'SIDES',  slotType: 'sides',  x: 248, y: 680, w: 80,  h: 140 },
    { key: 'engine', label: 'ENGINE', slotType: 'engine', x: 360, y: 840, w: 110, h: 70  },
];

export class BuildScene extends Scene {
    private gearsText!: GameObjects.Text;
    private rocketContainer!: GameObjects.Container;
    private partPanel: GameObjects.Container | null = null;
    private summaryText!: GameObjects.Text;
    private launchBtn!: CartoonButton;
    private soundtrack!: Phaser.Sound.BaseSound;
    private starfield!: StarfieldBackground;
    private partImages: Map<string, GameObjects.Image> = new Map();
    private bodySegmentImgs: GameObjects.Image[] = [];
    private sidesImgRight!: GameObjects.Image;
    private hitRects: Map<string, GameObjects.Rectangle> = new Map();
    private rightSideHitRect!: GameObjects.Rectangle;

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

        const layout = this.computePreviewLayout();

        // Individual part preview images (dim until a part is selected)
        const noseImg    = this.add.image(layout.nose.x, layout.nose.y, 'rp_001').setScale(1.5).setAlpha(0.2);
        const bodyImg1   = this.add.image(layout.body1.x, layout.body1.y, 'rp_009').setScale(1.5).setAlpha(0.2);
        const bodyImg2   = this.add.image(layout.body2.x, layout.body2.y, 'rp_009').setScale(1.5).setAlpha(0.2);
        const bodyImg3   = this.add.image(layout.body3.x, layout.body3.y, 'rp_009').setScale(1.5).setAlpha(0.2);
        const engineImg  = this.add.image(layout.engine.x, layout.engine.y, 'rp_003').setScale(1.5).setAlpha(0.2);
        const sidesImgL  = this.add.image(layout.sidesL.x, layout.sidesL.y, 'rp_024').setScale(1.0).setAlpha(0.2).setFlipX(true);
        const sidesImgR  = this.add.image(layout.sidesR.x, layout.sidesR.y, 'rp_024').setScale(1.0).setAlpha(0.2);

        this.partImages.set('nose', noseImg);
        this.partImages.set('body', bodyImg1);
        this.partImages.set('engine', engineImg);
        this.partImages.set('sides', sidesImgL);
        this.bodySegmentImgs = [bodyImg1, bodyImg2, bodyImg3];
        this.sidesImgRight = sidesImgR;

        this.rocketContainer.add([noseImg, bodyImg1, bodyImg2, bodyImg3, engineImg, sidesImgL, sidesImgR]);

        // Extra hit area for right side (mirrors the left sides slot)
        const rightSideHit = this.add.rectangle(layout.sidesR.x, layout.sidesR.y, 80, 140, 0, 0)
            .setInteractive({ useHandCursor: true });
        rightSideHit.on('pointerdown', () => {
            this.playClick();
            this.openPartPanel(SLOTS.find(s => s.key === 'sides')!);
        });
        this.rightSideHitRect = rightSideHit;
        this.rocketContainer.add(rightSideHit);

        for (const slot of SLOTS) {
            let hx: number, hy: number, hw: number, hh: number;
            if (slot.key === 'nose')        { hx = layout.nose.x;   hy = layout.nose.y;          hw = slot.w; hh = slot.h; }
            else if (slot.key === 'body')   { hx = layout.body1.x;  hy = layout.bodySectionMidY; hw = slot.w; hh = layout.totalBodyH; }
            else if (slot.key === 'engine') { hx = layout.engine.x; hy = layout.engine.y;        hw = slot.w; hh = slot.h; }
            else                            { hx = layout.sidesL.x; hy = layout.sidesL.y;        hw = slot.w; hh = slot.h; }

            const hit = this.add.rectangle(hx, hy, hw, hh, 0, 0)
                .setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => {
                this.playClick();
                this.openPartPanel(slot);
            });
            this.hitRects.set(slot.key, hit);
            this.rocketContainer.add(hit);
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
        this.gearsText.setText(`${GameState.currency}G`);

        const hasEngine = !!GameState.rocketConfig.engine;
        this.launchBtn.setEnabled(hasEngine);
        this.summaryText.setText(this.buildSummary());
        this.updatePartImages();
    }

    private updatePartImages() {
        const cfg = GameState.rocketConfig;

        for (const [slotKey, img] of this.partImages) {
            const partId = (cfg as Record<string, string | null>)[slotKey];
            if (partId && PARTS[partId]?.asset) {
                img.setTexture(PARTS[partId].asset!);
                img.setAlpha(1.0);
            } else {
                img.setAlpha(0.2);
            }
        }

        // Sync extra body segments (2 and 3) to match the first
        const bodyPart = cfg.body ? PARTS[cfg.body] : null;
        for (const seg of this.bodySegmentImgs.slice(1)) {
            if (bodyPart?.asset) {
                seg.setTexture(bodyPart.asset);
                seg.setAlpha(1.0);
            } else {
                seg.setAlpha(0.2);
            }
        }

        // Sync right sides image
        const sidesPart = cfg.sides ? PARTS[cfg.sides] : null;
        if (sidesPart?.asset) {
            this.sidesImgRight.setTexture(sidesPart.asset);
            this.sidesImgRight.setAlpha(1.0);
        } else {
            this.sidesImgRight.setAlpha(0.2);
        }

        // Recompute positions based on current textures (parts may have different sizes)
        const layout = this.computePreviewLayout();
        this.partImages.get('nose')?.setPosition(layout.nose.x, layout.nose.y);
        this.partImages.get('engine')?.setPosition(layout.engine.x, layout.engine.y);
        this.partImages.get('sides')?.setPosition(layout.sidesL.x, layout.sidesL.y);
        const [b1, b2, b3] = this.bodySegmentImgs;
        b1?.setPosition(layout.body1.x, layout.body1.y);
        b2?.setPosition(layout.body2.x, layout.body2.y);
        b3?.setPosition(layout.body3.x, layout.body3.y);
        this.sidesImgRight.setPosition(layout.sidesR.x, layout.sidesR.y);
        this.hitRects.get('nose')?.setPosition(layout.nose.x, layout.nose.y);
        this.hitRects.get('body')?.setPosition(layout.body1.x, layout.bodySectionMidY);
        this.hitRects.get('engine')?.setPosition(layout.engine.x, layout.engine.y);
        this.hitRects.get('sides')?.setPosition(layout.sidesL.x, layout.sidesL.y);
        this.rightSideHitRect?.setPosition(layout.sidesR.x, layout.sidesR.y);
    }

    private computePreviewLayout() {
        const SCALE = 1.5;
        const SIDES_SCALE = 1.0;
        const cx = 360;
        const cy = 690;

        const frameH = (key: string) => this.textures.get(key).source[0]?.height ?? 64;
        const frameW = (key: string) => this.textures.get(key).source[0]?.width ?? 68;

        const cfg = GameState.rocketConfig;
        const noseAsset  = cfg.nose   && PARTS[cfg.nose]?.asset   ? PARTS[cfg.nose].asset!   : 'rp_001';
        const bodyAsset  = cfg.body   && PARTS[cfg.body]?.asset   ? PARTS[cfg.body].asset!   : 'rp_009';
        const engAsset   = cfg.engine && PARTS[cfg.engine]?.asset ? PARTS[cfg.engine].asset! : 'rp_003';
        const sidesAsset = cfg.sides  && PARTS[cfg.sides]?.asset  ? PARTS[cfg.sides].asset!  : 'rp_024';

        const noseH  = frameH(noseAsset)  * SCALE;
        const bodyH  = frameH(bodyAsset)  * SCALE;
        const engH   = frameH(engAsset)   * SCALE;
        const totalBodyH = bodyH * 3;
        const topY   = cy - (noseH + totalBodyH + engH) / 2;

        const body1Y = topY + noseH + bodyH / 2;
        const body2Y = topY + noseH + bodyH * 1.5;
        const body3Y = topY + noseH + bodyH * 2.5;
        const bodySectionMidY = topY + noseH + totalBodyH / 2;
        const bodyW = frameW(bodyAsset)  * SCALE;
        const sideW = frameW(sidesAsset) * SIDES_SCALE;
        const sideX = bodyW / 2 + sideW / 2;

        return {
            nose:   { x: cx,           y: topY + noseH / 2 },
            body1:  { x: cx,           y: body1Y },
            body2:  { x: cx,           y: body2Y },
            body3:  { x: cx,           y: body3Y },
            bodySectionMidY,
            totalBodyH,
            engine: { x: cx,           y: topY + noseH + totalBodyH + engH / 2 },
            sidesL: { x: cx - sideX,   y: bodySectionMidY },
            sidesR: { x: cx + sideX,   y: bodySectionMidY },
        };
    }

    private buildSummary(): string {
        const cfg = GameState.rocketConfig;
        if (!cfg.engine || !cfg.nose || !cfg.body) return '— select parts to see stats —';

        const engine = PARTS[cfg.engine];
        const nose = PARTS[cfg.nose];
        const sidesMod = cfg.sides ? PARTS[cfg.sides] : null;

        const body = PARTS[cfg.body];

        const thrust = engine.thrust ?? 5;
        const burn = engine.fuelBurn ?? 1;
        const ctrl = engine.control ?? 0;
        const drag = nose.drag ?? 1;
        const bonusFuel = sidesMod?.bonusFuel ?? 0;
        const fuel = BASE_FUEL + bonusFuel;
        const shield = body.shield ?? 0;
        const weight = engine.weight + nose.weight + body.weight + (sidesMod?.weight ?? 0);

        const parts: string[] = [
            `THRUST ${thrust}  FUEL ${fuel}  BURN ${burn}/s`,
            `DRAG ${drag}  CTRL ${ctrl}  WEIGHT ${weight}${shield > 0 ? `  SHIELD ${shield}` : ''}`,
        ];
        return parts.join('\n');
    }

    private openPartPanel(slot: SlotUI) {
        this.closePartPanel();

        const parts = getPartsForSlot(slot.slotType);
        const extraRow = slot.slotType === 'sides' ? 1 : 0;
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

        if (slot.slotType === 'sides') {
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

            if (!unlocked && part.unlockCost !== null) {
                const canAfford = GameState.currency >= part.unlockCost;
                const costText = this.add.text(150, y, `${part.unlockCost}G`, {
                    fontFamily: 'KenneyFuture, sans-serif',
                    fontSize: '18px',
                    color: canAfford ? HEX.accentWarm : HEX.accentPink,
                    stroke: HEX.ink,
                    strokeThickness: 2,
                }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
                costText.on('pointerdown', () => {
                    if (GameState.unlockPart(part.id)) {
                        this.sound.play('buy', { volume: GameState.getSfxVolume() });
                        burst(this, panelX, panelY + y);
                        this.closePartPanel();
                        this.openPartPanel(slot);
                    } else {
                        this.sound.play('error', { volume: GameState.getSfxVolume() });
                    }
                });
                container.add(costText);
            }

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
            }
        });

        this.tweens.add({ targets: container, x: panelX, duration: 300, ease: 'Back.easeOut' });
        this.tweens.add({ targets: this.rocketContainer, x: 190, duration: 300, ease: 'Back.easeOut' });
        this.partPanel = container;
        this.highlightSlot(slot.key);
    }

    private getPartStats(part: PartDef): string {
        const stats: string[] = [`wt:${part.weight}`];
        if (part.drag !== undefined) stats.push(`drag:${part.drag}`);
        if (part.thrust !== undefined) stats.push(`thrust:${part.thrust}`);
        if (part.control !== undefined) stats.push(`ctrl:${part.control}`);
        if (part.fuelBurn !== undefined) stats.push(`burn:${part.fuelBurn}`);
        if (part.rotationDamping !== undefined) stats.push(`stab:${part.rotationDamping}`);
        if (part.bonusFuel !== undefined) stats.push(`+fuel:${part.bonusFuel}`);
        if (part.shield !== undefined) stats.push(`shield:${part.shield}`);
        return stats.join(' | ');
    }

    private highlightSlot(key: string | null) {
        for (const img of this.partImages.values()) {
            img.clearTint();
        }
        for (const seg of this.bodySegmentImgs) seg.clearTint();
        this.sidesImgRight.clearTint();

        if (!key) return;

        const img = this.partImages.get(key);
        if (img) img.setTint(0x88eeff);
        if (key === 'body') {
            for (const seg of this.bodySegmentImgs) seg.setTint(0x88eeff);
        }
        if (key === 'sides') this.sidesImgRight.setTint(0x88eeff);
    }

    private closePartPanel() {
        if (this.partPanel) {
            this.partPanel.destroy();
            this.partPanel = null;
            this.tweens.add({ targets: this.rocketContainer, x: 0, duration: 250, ease: 'Sine.easeOut' });
            this.highlightSlot(null);
        }
    }

    private launch() {
        const hasEngine = !!GameState.rocketConfig.engine;
        if (!hasEngine) return;

        this.scene.start('FlightScene');
    }
}
