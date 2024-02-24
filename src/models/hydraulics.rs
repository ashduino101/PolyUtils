use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use crate::models::traits::{FromBytes, FromBytesVersioned};
use crate::utils::get_string;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Piston {
    pub value: f32,
    #[wasm_bindgen(skip)]
    pub node_a_guid: String,
    #[wasm_bindgen(skip)]
    pub node_b_guid: String,
    #[wasm_bindgen(skip)]
    pub guid: String
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

impl Piston {
    pub(crate) fn from_bytes(data: &mut Bytes, version: i32) -> Piston {
        let mut value = data.get_f32_le();
        if version < 8 {
            if value < 0.25 {
                value = lerp(1.0, 0.5, (value / 0.25).clamp(0.0, 1.0));
            } else if value > 0.75 {
                value = lerp(0.5, 1.0, ((value - 0.75) / 0.25).clamp(0.0, 1.0));
            } else {
                value = lerp(0.0, 0.5, ((value - 0.5) / 0.25).clamp(0.0, 1.0));
            }
        }
        Piston {
            value,
            node_a_guid: get_string(data),
            node_b_guid: get_string(data),
            guid: get_string(data)
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct HydraulicPhase {
    pub time_delay: f32,
    #[wasm_bindgen(skip)]
    pub guid: String
}

impl FromBytes for HydraulicPhase {
    fn from_bytes(data: &mut Bytes) -> HydraulicPhase {
        HydraulicPhase {
            time_delay: data.get_f32_le(),
            guid: get_string(data)
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub enum SplitJointState {
    AllSplit,
    NoneSplit,
    ASplitOnly,
    BSplitOnly,
    CSplitOnly,
}

impl FromBytes for SplitJointState {
    fn from_bytes(data: &mut Bytes) -> SplitJointState {
        let value = data.get_u32();
        match value {
            0 => SplitJointState::AllSplit,
            1 => SplitJointState::NoneSplit,
            2 => SplitJointState::ASplitOnly,
            3 => SplitJointState::BSplitOnly,
            4 => SplitJointState::CSplitOnly,
            _ => SplitJointState::AllSplit
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct BridgeSplitJoint {
    #[wasm_bindgen(skip)]
    pub bridge_joint_guid: String,
    pub split_joint_state: SplitJointState
}

impl FromBytes for BridgeSplitJoint {
    fn from_bytes(data: &mut Bytes) -> BridgeSplitJoint {
        BridgeSplitJoint {
            bridge_joint_guid: get_string(data),
            split_joint_state: SplitJointState::from_bytes(data)
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct HydraulicsControllerPhase {
    #[wasm_bindgen(skip)]
    pub phase_guid: String,
    #[wasm_bindgen(skip)]
    pub piston_guids: Vec<String>,
    #[wasm_bindgen(skip)]
    pub bridge_split_joints: Vec<BridgeSplitJoint>,
    pub disable_new_additions: bool
}

impl FromBytesVersioned for HydraulicsControllerPhase {
    fn from_bytes(data: &mut Bytes, version: i32) -> HydraulicsControllerPhase {
        HydraulicsControllerPhase {
            phase_guid: get_string(data),
            piston_guids: {
                let mut guids = Vec::<String>::new();
                for _ in 0..data.get_u32_le() {
                    guids.push(get_string(data));
                }
                guids
            },
            bridge_split_joints: {
                if version > 2 {
                    let mut split_joints = Vec::<BridgeSplitJoint>::new();
                    for _ in 0..data.get_u32_le() {
                        split_joints.push(BridgeSplitJoint::from_bytes(data));
                    }
                    split_joints
                } else {
                    for _ in 0..data.get_u32_le() {
                        get_string(data);
                    }
                    Vec::<BridgeSplitJoint>::new()
                }
            },
            disable_new_additions: version > 9 && data.get_u8() != 0  // def. as 9 in pb2, 13 in pb3
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct HydraulicsController {
    #[wasm_bindgen(skip)]
    pub phases: Vec<HydraulicsControllerPhase>
}

impl FromBytesVersioned for HydraulicsController {
    fn from_bytes(data: &mut Bytes, version: i32) -> HydraulicsController {
        HydraulicsController {
            phases: {
                let mut phases = Vec::<HydraulicsControllerPhase>::new();
                for _ in 0..data.get_u32_le() {
                    phases.push(HydraulicsControllerPhase::from_bytes(data, version));
                }
                phases
            }
        }
    }
}