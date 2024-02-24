use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use crate::models::common::Vec2;
use crate::models::traits::FromBytesVersioned;
use crate::utils::get_string;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Checkpoint {
    pub pos: Vec2,
    #[wasm_bindgen(skip)]
    pub prefab_name: String,
    #[wasm_bindgen(skip)]
    pub vehicle_guid: String,
    #[wasm_bindgen(skip)]
    pub vehicle_restart_phase_guid: String,
    pub trigger_timeline: bool,
    pub stop_vehicle: bool,
    pub reverse_vehicle_on_restart: bool,
    pub invisible_in_sim: bool,
    #[wasm_bindgen(skip)]
    pub guid: String
}

impl FromBytesVersioned for Checkpoint {
    fn from_bytes(data: &mut Bytes, version: i32) -> Checkpoint {
        Checkpoint {
            pos: Vec2::from_bytes(data),
            prefab_name: get_string(data),
            vehicle_guid: get_string(data),
            vehicle_restart_phase_guid: get_string(data),
            trigger_timeline: data.get_u8() != 0,
            stop_vehicle: data.get_u8() != 0,
            reverse_vehicle_on_restart: data.get_u8() != 0,
            invisible_in_sim: version >= 73 && data.get_u8() != 0,
            guid: get_string(data)
        }
    }
}
