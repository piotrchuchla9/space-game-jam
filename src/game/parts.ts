export type SlotType = 'nose' | 'body' | 'engine' | 'sides';

export interface PartDef {
    id: string;
    name: string;
    slot: SlotType;
    weight: number;
    budgetCost: number;
    unlockCost: number | null; // null = available from start
    asset?: string;            // Phaser texture key
    // Slot-specific stats
    drag?: number;             // nose
    thrust?: number;           // engine
    control?: number;          // engine
    fuelBurn?: number;         // engine
    rotationDamping?: number;  // sides
    bonusFuel?: number;        // sides
    shieldHP?: number;         // sides
}

export const PARTS: Record<string, PartDef> = {
    // --- NOSE ---
    nose_1: {
        id: 'nose_1', name: 'Standard Cone', slot: 'nose',
        weight: 1, budgetCost: 10, unlockCost: null,
        asset: 'rp_001', drag: 1.0,
    },
    nose_2: {
        id: 'nose_2', name: 'Round Nose', slot: 'nose',
        weight: 1, budgetCost: 15, unlockCost: 20,
        asset: 'rp_002', drag: 0.85,
    },
    nose_4: {
        id: 'nose_4', name: 'Sharp Nose', slot: 'nose',
        weight: 2, budgetCost: 20, unlockCost: 30,
        asset: 'rp_004', drag: 0.7,
    },
    nose_6: {
        id: 'nose_6', name: 'Blunt Cap', slot: 'nose',
        weight: 1, budgetCost: 10, unlockCost: null,
        asset: 'rp_006', drag: 1.2,
    },
    nose_7: {
        id: 'nose_7', name: 'Long Cone', slot: 'nose',
        weight: 2, budgetCost: 25, unlockCost: 40,
        asset: 'rp_007', drag: 0.6,
    },
    nose_29: {
        id: 'nose_29', name: 'Spike', slot: 'nose',
        weight: 3, budgetCost: 35, unlockCost: 60,
        asset: 'rp_029', drag: 0.5,
    },
    nose_30: {
        id: 'nose_30', name: 'Wide Cap', slot: 'nose',
        weight: 2, budgetCost: 15, unlockCost: 25,
        asset: 'rp_030', drag: 1.3,
    },

    // --- BODY ---
    body_9: {
        id: 'body_9', name: 'Standard Frame', slot: 'body',
        weight: 2, budgetCost: 15, unlockCost: null,
        asset: 'rp_009',
    },
    body_10: {
        id: 'body_10', name: 'Armored Frame', slot: 'body',
        weight: 4, budgetCost: 25, unlockCost: 40,
        asset: 'rp_010',
    },
    body_12: {
        id: 'body_12', name: 'Window Pod', slot: 'body',
        weight: 1, budgetCost: 15, unlockCost: 20,
        asset: 'rp_012',
    },
    body_16: {
        id: 'body_16', name: 'Reinforced', slot: 'body',
        weight: 3, budgetCost: 20, unlockCost: 30,
        asset: 'rp_016',
    },
    body_17: {
        id: 'body_17', name: 'Light Frame', slot: 'body',
        weight: 1, budgetCost: 10, unlockCost: null,
        asset: 'rp_017',
    },
    body_18: {
        id: 'body_18', name: 'Window Frame', slot: 'body',
        weight: 3, budgetCost: 20, unlockCost: 30,
        asset: 'rp_018',
    },
    body_19: {
        id: 'body_19', name: 'Wide Frame', slot: 'body',
        weight: 3, budgetCost: 20, unlockCost: 30,
        asset: 'rp_019',
    },

    // --- ENGINE ---
    eng_3: {
        id: 'eng_3', name: 'Basic Thruster', slot: 'engine',
        weight: 2, budgetCost: 20, unlockCost: null,
        asset: 'rp_003', thrust: 5, control: 0.8, fuelBurn: 1.0,
    },
    eng_5: {
        id: 'eng_5', name: 'Double Nozzle', slot: 'engine',
        weight: 3, budgetCost: 30, unlockCost: 35,
        asset: 'rp_005', thrust: 7, control: 0.6, fuelBurn: 1.4,
    },
    eng_8: {
        id: 'eng_8', name: 'Heavy Booster', slot: 'engine',
        weight: 3, budgetCost: 40, unlockCost: 50,
        asset: 'rp_008', thrust: 9, control: 0.3, fuelBurn: 2.0,
    },
    eng_11: {
        id: 'eng_11', name: 'Wide Thruster', slot: 'engine',
        weight: 3, budgetCost: 30, unlockCost: 35,
        asset: 'rp_011', thrust: 6, control: 0.7, fuelBurn: 1.2,
    },
    eng_14: {
        id: 'eng_14', name: 'Speed Thruster', slot: 'engine',
        weight: 4, budgetCost: 50, unlockCost: 80,
        asset: 'rp_014', thrust: 11, control: 0.2, fuelBurn: 2.5,
    },
    eng_31: {
        id: 'eng_31', name: 'Mini Thruster', slot: 'engine',
        weight: 1, budgetCost: 15, unlockCost: null,
        asset: 'rp_031', thrust: 4, control: 1.0, fuelBurn: 0.7,
    },

    // --- SIDES (optional, symmetric) ---
    sides_20: {
        id: 'sides_20', name: 'Fuel Pod S', slot: 'sides',
        weight: 1, budgetCost: 15, unlockCost: null,
        asset: 'rp_020', bonusFuel: 15,
    },
    sides_21: {
        id: 'sides_21', name: 'Fuel Pod M', slot: 'sides',
        weight: 2, budgetCost: 25, unlockCost: 35,
        asset: 'rp_021', bonusFuel: 25,
    },
    sides_22: {
        id: 'sides_22', name: 'Fuel Pod L', slot: 'sides',
        weight: 3, budgetCost: 35, unlockCost: 50,
        asset: 'rp_022', bonusFuel: 35,
    },
    sides_23: {
        id: 'sides_23', name: 'Booster Pod', slot: 'sides',
        weight: 2, budgetCost: 30, unlockCost: 45,
        asset: 'rp_023', bonusFuel: 20, shieldHP: 1,
    },
    sides_24: {
        id: 'sides_24', name: 'Small Wing', slot: 'sides',
        weight: 1, budgetCost: 10, unlockCost: null,
        asset: 'rp_024', rotationDamping: 0.4,
    },
    sides_25: {
        id: 'sides_25', name: 'Standard Wing', slot: 'sides',
        weight: 2, budgetCost: 15, unlockCost: 20,
        asset: 'rp_025', rotationDamping: 0.55,
    },
    sides_26: {
        id: 'sides_26', name: 'Wide Wing', slot: 'sides',
        weight: 2, budgetCost: 20, unlockCost: 30,
        asset: 'rp_026', rotationDamping: 0.65,
    },
    sides_27: {
        id: 'sides_27', name: 'Large Wing', slot: 'sides',
        weight: 3, budgetCost: 25, unlockCost: 40,
        asset: 'rp_027', rotationDamping: 0.75,
    },
    sides_28: {
        id: 'sides_28', name: 'Delta Wing', slot: 'sides',
        weight: 3, budgetCost: 30, unlockCost: 50,
        asset: 'rp_028', rotationDamping: 0.85,
    },
};

export function getPartsForSlot(slot: SlotType): PartDef[] {
    return Object.values(PARTS).filter(p => p.slot === slot);
}

export const BUILD_BUDGET = 1000;
export const BASE_FUEL = 20;
