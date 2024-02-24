use std::collections::HashMap;
use bytes::{Buf, Bytes};
use wasm_bindgen_test::console_log;
use wasm_bindgen::prelude::*;
use crate::models::bridge::{BridgeJoint, BridgeEdge, BridgeSpring, BridgePillar};
use crate::models::hydraulics::{Piston, HydraulicsController};
use crate::models::traits::{FromBytes, FromBytesVersioned};
use crate::utils::get_string;


#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Bridge {
    pub version: i32,
    #[wasm_bindgen(skip)]
    pub joints: Vec<BridgeJoint>,
    #[wasm_bindgen(skip)]
    pub edges: Vec<BridgeEdge>,
    #[wasm_bindgen(skip)]
    pub springs: Vec<BridgeSpring>,
    #[wasm_bindgen(skip)]
    pub pistons: Vec<Piston>,
    #[wasm_bindgen(skip)]
    pub hydraulics_controller: HydraulicsController,
    #[wasm_bindgen(skip)]
    pub anchors: Vec<BridgeJoint>,
    #[wasm_bindgen(skip)]
    pub bridge_pillars: Vec<BridgePillar>,
    #[wasm_bindgen(skip)]
    pub bridge_pillar_anchors: Vec<BridgeJoint>,
    #[wasm_bindgen(skip)]
    pub bridge_edge_colors: HashMap<String, String>,
}

impl FromBytes for Bridge {
    fn from_bytes(data: &mut Bytes) -> Bridge {
        let bridge_version = data.get_i32_le();
        if bridge_version < 2 {
            panic!("unsupported bridge version {}", bridge_version);  // unsupported
        }
        let num_joints = data.get_u32_le();
        let mut joints = Vec::<BridgeJoint>::new();
        for _ in 0..num_joints {
            joints.push(BridgeJoint::from_bytes(data, bridge_version));
        }
        let num_edges = data.get_u32_le();
        let mut edges = Vec::<BridgeEdge>::new();
        for _ in 0..num_edges {
            let e = BridgeEdge::from_bytes(data, bridge_version);
            edges.push(e);
        }
        let springs = if bridge_version >= 7 {
            let num_springs = data.get_u32_le();
            let mut springs = Vec::<BridgeSpring>::new();
            for _ in 0..num_springs {
                springs.push(BridgeSpring::from_bytes(data));
            }
            springs
        } else {
            Vec::<BridgeSpring>::new()
        };
        let num_pistons = data.get_u32_le();
        let mut pistons = Vec::<Piston>::new();
        for _ in 0..num_pistons {
            pistons.push(Piston::from_bytes(data, bridge_version));
        }
        let hydraulics_controller = HydraulicsController::from_bytes(data, bridge_version);

        let anchors = if bridge_version >= 6 {
            let mut anchors = Vec::<BridgeJoint>::new();
            for _ in 0..data.get_u32_le() {
                anchors.push(BridgeJoint::from_bytes(data, bridge_version));
            }
            anchors
        } else {
            Vec::<BridgeJoint>::new()
        };

        if bridge_version >= 4 && bridge_version < 9 {
            data.get_u8();  // unknown, discarded by poly bridge
        }

        let bridge_pillars = if bridge_version > 11 {
            let mut bridge_pillars = Vec::<BridgePillar>::new();
            for _ in 0..data.get_u32_le() {
                bridge_pillars.push(BridgePillar::from_bytes(data, bridge_version));
            }
            bridge_pillars
        } else {
            Vec::<BridgePillar>::new()
        };

        let bridge_pillar_anchors = if bridge_version > 11 {
            let mut bridge_pillar_anchors = Vec::<BridgeJoint>::new();
            for _ in 0..data.get_u32_le() {
                bridge_pillar_anchors.push(BridgeJoint::from_bytes(data, bridge_version));
            }
            bridge_pillar_anchors
        } else {
            Vec::<BridgeJoint>::new()
        };

        let bridge_edge_colors = if bridge_version >= 16 {
            let mut colors = HashMap::<String, String>::new();
            for _ in 0..data.get_u32_le() {
                let key = get_string(data);
                let value = get_string(data);
                colors.insert(key, value);
            }
            colors
        } else {
            HashMap::<String, String>::new()
        };

        Bridge {
            version: bridge_version,
            joints,
            edges,
            springs,
            pistons,
            hydraulics_controller,
            anchors,
            bridge_pillars,
            bridge_pillar_anchors,
            bridge_edge_colors
        }
    }
}
