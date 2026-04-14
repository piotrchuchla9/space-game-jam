export type SlotType = 'nose' | 'body' | 'engine' | 'module';

export interface PartDef {
    id: string;
    name: string;
    slot: SlotType;
    weight: number;
    budgetCost: number;
    unlockCost: number | null; // null = available from start
    // Slot-specific stats
    drag?: number;           // nose
    hp?: number;             // body
    thrust?: number;         // engine
    control?: number;        // engine
    fuelBurn?: number;       // engine
    rotationDamping?: number; // module
    bonusFuel?: number;      // module
    shieldHP?: number;       // module
}

export const PARTS: Record<string, PartDef> = {
    standardCone: {
        id: 'standardCone',
        name: 'Standard Cone',
        slot: 'nose',
        weight: 1,
        budgetCost: 10,
        unlockCost: null,
        drag: 1.0,
    },
    heavyNose: {
        id: 'heavyNose',
        name: 'Heavy Nose',
        slot: 'nose',
        weight: 3,
        budgetCost: 25,
        unlockCost: 30,
        drag: 0.6,
    },
    lightFrame: {
        id: 'lightFrame',
        name: 'Light Frame',
        slot: 'body',
        weight: 2,
        budgetCost: 15,
        unlockCost: null,
        hp: 1,
    },
    armoredFrame: {
        id: 'armoredFrame',
        name: 'Armored Frame',
        slot: 'body',
        weight: 5,
        budgetCost: 35,
        unlockCost: 60,
        hp: 3,
    },
    basicEngine: {
        id: 'basicEngine',
        name: 'Basic Engine',
        slot: 'engine',
        weight: 2,
        budgetCost: 20,
        unlockCost: null,
        thrust: 5,
        control: 0.8,
        fuelBurn: 1.0,
    },
    boostEngine: {
        id: 'boostEngine',
        name: 'Boost Engine',
        slot: 'engine',
        weight: 3,
        budgetCost: 40,
        unlockCost: 50,
        thrust: 9,
        control: 0.3,
        fuelBurn: 2.0,
    },
    fins: {
        id: 'fins',
        name: 'Fins',
        slot: 'module',
        weight: 1,
        budgetCost: 10,
        unlockCost: null,
        rotationDamping: 0.7,
    },
    fuelTank: {
        id: 'fuelTank',
        name: 'Fuel Tank',
        slot: 'module',
        weight: 2,
        budgetCost: 20,
        unlockCost: 40,
        bonusFuel: 50,
    },
    shield: {
        id: 'shield',
        name: 'Shield',
        slot: 'module',
        weight: 2,
        budgetCost: 25,
        unlockCost: 50,
        shieldHP: 1,
    },
};

export function getPartsForSlot(slot: SlotType): PartDef[] {
    return Object.values(PARTS).filter(p => p.slot === slot);
}

export const BUILD_BUDGET = 100;
export const BASE_FUEL = 20;
