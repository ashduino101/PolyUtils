use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use wasm_bindgen_test::console_log;
use crate::models::common::Vec3;
use crate::models::traits::{FromBytes, FromBytesVersioned};
use crate::utils::{get_string, new_guid};

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct BridgeJoint {
    pub pos: Vec3,
    pub is_anchor: bool,
    pub is_split: bool,
    pub no_build: bool,
    #[wasm_bindgen(skip)]
    pub guid: String
}

impl FromBytesVersioned for BridgeJoint {
    fn from_bytes(data: &mut Bytes, version: i32) -> BridgeJoint {
        BridgeJoint {
            pos: Vec3::from_bytes(data),
            is_anchor: data.get_u8() != 0,
            is_split: data.get_u8() != 0,
            guid: get_string(data),
            no_build: if version >= 13 { data.get_u8() != 0 } else { false }
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub enum BridgeMaterialType {
    Invalid,
    Road,
    ReinforcedRoad,
    Wood,
    Steel,
    Hydraulics,
    Rope,
    Cable,
    BungineRope,
    Spring,
    Pillar
}

impl FromBytes for BridgeMaterialType {
    fn from_bytes(data: &mut Bytes) -> BridgeMaterialType {
        let val = data.get_u32_le();
        match val {
            1 => BridgeMaterialType::Road,
            2 => BridgeMaterialType::ReinforcedRoad,
            3 => BridgeMaterialType::Wood,
            4 => BridgeMaterialType::Steel,
            5 => BridgeMaterialType::Hydraulics,
            6 => BridgeMaterialType::Rope,
            7 => BridgeMaterialType::Cable,
            8 => BridgeMaterialType::BungineRope,
            9 => BridgeMaterialType::Spring,
            10 => BridgeMaterialType::Pillar,
            _ => BridgeMaterialType::Invalid
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub enum SplitJointPart {
    A,
    B,
    C
}

impl FromBytes for SplitJointPart {
    fn from_bytes(data: &mut Bytes) -> SplitJointPart {
        let val = data.get_u32_le();
        match val {
            0 => SplitJointPart::A,
            1 => SplitJointPart::B,
            2 => SplitJointPart::C,
            _ => SplitJointPart::A
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub enum PrebuiltState {
    None,
    HardLocked,
    SoftLocked
}

impl FromBytes for PrebuiltState {
    fn from_bytes(data: &mut Bytes) -> PrebuiltState {
        let val = data.get_u32_le();
        match val {
            0 => PrebuiltState::None,
            1 => PrebuiltState::HardLocked,
            2 => PrebuiltState::SoftLocked,
            _ => PrebuiltState::None
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct BridgeEdge {
    pub material: BridgeMaterialType,
    #[wasm_bindgen(skip)]
    pub node_a_guid: String,
    #[wasm_bindgen(skip)]
    pub node_b_guid: String,
    pub joint_a_part: SplitJointPart,
    pub joint_b_part: SplitJointPart,
    pub bridge_prebuilt_state: PrebuiltState,
    #[wasm_bindgen(skip)]
    pub guid: String
}

impl FromBytesVersioned for BridgeEdge {
    fn from_bytes(data: &mut Bytes, version: i32) -> BridgeEdge {
        BridgeEdge {
            material: BridgeMaterialType::from_bytes(data),
            node_a_guid: get_string(data),
            node_b_guid: get_string(data),
            joint_a_part: SplitJointPart::from_bytes(data),
            joint_b_part: SplitJointPart::from_bytes(data),
            bridge_prebuilt_state: if version >= 12 {
                PrebuiltState::from_bytes(data)
            } else {
                PrebuiltState::None
            },
            guid: if version >= 11 {
                get_string(data)
            } else {
                new_guid()
            }
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct BridgeSpring {
    pub value: f32,
    #[wasm_bindgen(skip)]
    pub node_a_guid: String,
    #[wasm_bindgen(skip)]
    pub node_b_guid: String,
    #[wasm_bindgen(skip)]
    pub guid: String,
}

impl FromBytes for BridgeSpring {
    fn from_bytes(data: &mut Bytes) -> BridgeSpring {
        BridgeSpring {
            value: data.get_f32_le(),
            node_a_guid: get_string(data),
            node_b_guid: get_string(data),
            guid: get_string(data)
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct BridgePillar {
    pub pos: Vec3,
    pub height: f32,
    #[wasm_bindgen(skip)]
    pub prefab_name: String,
    #[wasm_bindgen(skip)]
    pub guid: String,
    #[wasm_bindgen(skip)]
    pub anchor_guid: String,
    pub bridge_prebuilt_state: PrebuiltState
}

impl FromBytesVersioned for BridgePillar {
    fn from_bytes(data: &mut Bytes, version: i32) -> BridgePillar {
        BridgePillar {
            pos: Vec3::from_bytes(data),
            height: data.get_f32_le(),
            prefab_name: get_string(data),
            guid: get_string(data),
            anchor_guid: get_string(data),
            bridge_prebuilt_state: if version >= 12 {
                PrebuiltState::from_bytes(data)
            } else {
                PrebuiltState::None
            }
        }
    }
}
