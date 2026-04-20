export type SlotType = "nose" | "body" | "engine" | "wings" | "fuel";

export interface PartDef {
  id: string;
  name: string;
  slot: SlotType;
  weight: number;
  unlockCost: number | null; // null = available from start
  asset?: string; // Phaser texture key
  // Slot-specific stats
  drag?: number; // nose
  shield?: number; // body — absorbs hits and reduces negative effects
  thrust?: number; // engine
  control?: number; // engine
  fuelBurn?: number; // engine
  rotationDamping?: number; // sides
  bonusFuel?: number; // sides
}

export const PARTS: Record<string, PartDef> = {
  // --- NOSE --- drag: lower = better aerodynamics
  // Free nose is intentionally heavy and draggy — reference point for upgrades
  nose_1: {
    id: "nose_1",
    name: "Standard Cone",
    slot: "nose",
    weight: 5,
    unlockCost: null,
    asset: "rp_001",
    drag: 7,
  },
  // Blunt/Wide caps: light but still draggy — trade weight for aerodynamics
  nose_6: {
    id: "nose_6",
    name: "Blunt Cap",
    slot: "nose",
    weight: 4,
    unlockCost: 10,
    asset: "rp_006",
    drag: 1.5,
  },
  nose_2: {
    id: "nose_2",
    name: "Round Nose",
    slot: "nose",
    weight: 3,
    unlockCost: 20,
    asset: "rp_002",
    drag: 0.9,
  },
  nose_30: {
    id: "nose_30",
    name: "Wide Cap",
    slot: "nose",
    weight: 2,
    unlockCost: 25,
    asset: "rp_030",
    drag: 0.9,
  },
  nose_4: {
    id: "nose_4",
    name: "Sharp Nose",
    slot: "nose",
    weight: 1,
    unlockCost: 30,
    asset: "rp_004",
    drag: 0.7,
  },
  nose_7: {
    id: "nose_7",
    name: "Long Cone",
    slot: "nose",
    weight: 1,
    unlockCost: 40,
    asset: "rp_007",
    drag: 0.55,
  },
  nose_29: {
    id: "nose_29",
    name: "Spike",
    slot: "nose",
    weight: 1,
    unlockCost: 60,
    asset: "rp_029",
    drag: 0.4,
  },

  // --- BODY --- only weight matters; free body is the heaviest
  body_9: {
    id: "body_9",
    name: "Standard Frame",
    slot: "body",
    weight: 10,
    unlockCost: null,
    asset: "rp_009",
  },
  body_17: {
    id: "body_17",
    name: "Light Frame",
    slot: "body",
    weight: 9,
    unlockCost: 10,
    asset: "rp_017",
  },
  body_16: {
    id: "body_16",
    name: "Reinforced",
    slot: "body",
    weight: 7,
    unlockCost: 30,
    asset: "rp_016",
    shield: 1,
  },
  body_18: {
    id: "body_18",
    name: "Window Frame",
    slot: "body",
    weight: 6,
    unlockCost: 30,
    asset: "rp_018",
    shield: 1,
  },
  body_19: {
    id: "body_19",
    name: "Wide Frame",
    slot: "body",
    weight: 5,
    unlockCost: 30,
    asset: "rp_019",
    shield: 1,
  },
  body_10: {
    id: "body_10",
    name: "Armored Frame",
    slot: "body",
    weight: 4,
    unlockCost: 40,
    asset: "rp_010",
    shield: 2,
  },

  // --- ENGINE ---
  // Free engine: lots of raw thrust but terrible control, heavy
  // Paid engines scale thrust UP from 30, with better control and efficiency
  // Mini Thruster is a precision/efficiency trade-off (less thrust, way better control)
  eng_3: {
    id: "eng_3",
    name: "Basic Thruster",
    slot: "engine",
    weight: 5,
    unlockCost: null,
    asset: "rp_003",
    thrust: 30,
    control: 0.1,
    fuelBurn: 2.0,
  },
  eng_31: {
    id: "eng_31",
    name: "Mini Thruster",
    slot: "engine",
    weight: 5,
    unlockCost: 10,
    asset: "rp_031",
    thrust: 32, // slightly less raw power
    control: 0.3, // 6× better control than free
    fuelBurn: 1.8,
  },
  eng_11: {
    id: "eng_11",
    name: "Wide Thruster",
    slot: "engine",
    weight: 5,
    unlockCost: 35,
    asset: "rp_011",
    thrust: 35, // more than free
    control: 0.6,
    fuelBurn: 1.5,
  },
  eng_5: {
    id: "eng_5",
    name: "Double Nozzle",
    slot: "engine",
    weight: 5,
    unlockCost: 35,
    asset: "rp_005",
    thrust: 42,
    control: 0.8,
    fuelBurn: 1.5,
  },
  eng_8: {
    id: "eng_8",
    name: "Heavy Booster",
    slot: "engine",
    weight: 5,
    unlockCost: 50,
    asset: "rp_008",
    thrust: 55,
    control: 0.9,
    fuelBurn: 1.3,
  },
  eng_14: {
    id: "eng_14",
    name: "Speed Thruster",
    slot: "engine",
    weight: 5,
    unlockCost: 80,
    asset: "rp_014",
    thrust: 70,
    control: 1,
    fuelBurn: 1,
  },

  // --- WINGS --- control bonus stacks on top of engine control
  sides_24: {
    id: "sides_24",
    name: "Small Wing",
    slot: "wings",
    weight: 1,
    unlockCost: 10,
    asset: "rp_024",
    control: 0.2,
  },
  sides_25: {
    id: "sides_25",
    name: "Standard Wing",
    slot: "wings",
    weight: 1,
    unlockCost: 20,
    asset: "rp_025",
    control: 0.5,
  },
  sides_26: {
    id: "sides_26",
    name: "Wide Wing",
    slot: "wings",
    weight: 2,
    unlockCost: 30,
    asset: "rp_026",
    control: 1,
  },
  sides_27: {
    id: "sides_27",
    name: "Large Wing",
    slot: "wings",
    weight: 2,
    unlockCost: 40,
    asset: "rp_027",
    control: 2,
  },
  sides_28: {
    id: "sides_28",
    name: "Delta Wing",
    slot: "wings",
    weight: 3,
    unlockCost: 50,
    asset: "rp_028",
    control: 5,
  },

  // --- FUEL --- bonusFuel on top of BASE_FUEL=20
  sides_20: {
    id: "sides_20",
    name: "Fuel Pod S",
    slot: "fuel",
    weight: 1,
    unlockCost: 20,
    asset: "rp_020",
    bonusFuel: 15,
  },
  sides_21: {
    id: "sides_21",
    name: "Fuel Pod M",
    slot: "fuel",
    weight: 2,
    unlockCost: 35,
    asset: "rp_021",
    bonusFuel: 25,
  },
  sides_23: {
    id: "sides_23",
    name: "Booster Pod",
    slot: "fuel",
    weight: 2,
    unlockCost: 45,
    asset: "rp_023",
    bonusFuel: 20,
  },
  sides_22: {
    id: "sides_22",
    name: "Fuel Pod L",
    slot: "fuel",
    weight: 3,
    unlockCost: 50,
    asset: "rp_022",
    bonusFuel: 35,
  },
};

export function getPartsForSlot(slot: SlotType): PartDef[] {
  return Object.values(PARTS)
    .filter((p) => p.slot === slot)
    .sort((a, b) => (a.unlockCost ?? 0) - (b.unlockCost ?? 0));
}

export const BASE_FUEL = 20;
