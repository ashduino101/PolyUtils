use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use crate::models::common::{Quat, Vec2};
use crate::models::traits::{FromBytes, FromBytesVersioned};
use crate::utils::get_string;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct ZedAxisVehicle {
    pub pos: Vec2,
    #[wasm_bindgen(skip)]
    pub prefab_name: String,
    #[wasm_bindgen(skip)]
    pub guid: String,
    pub time_delay: f32,
    pub speed: f32,
    pub rot: Quat,
    pub rotation_degrees: f32,
    pub uniform_scale: f32,
    #[wasm_bindgen(skip)]
    pub mod_id: String,
    pub snap_to_water_line: bool,
    pub reverse: bool
}

impl FromBytesVersioned for ZedAxisVehicle {
    fn from_bytes(data: &mut Bytes, version: i32) -> ZedAxisVehicle {
        ZedAxisVehicle {
            pos: Vec2::from_bytes(data),
            prefab_name: get_string(data),
            guid: get_string(data),
            time_delay: data.get_f32_le(),
            speed: if version >= 8 { data.get_f32_le() } else { 1.0 },
            rot: if version >= 26 {
                Quat::from_bytes(data)
            } else {
                Quat { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
            },
            rotation_degrees: if version >= 26 { data.get_f32_le() } else { 0.0 },  // pb2 26 pb3 28
            uniform_scale: if version >= 49 { data.get_f32_le() } else { 1.0 },
            mod_id: if version >= 54 { get_string(data) } else { "".to_string() },
            snap_to_water_line: version >= 54 && data.get_u8() != 0,
            reverse: version >= 57 && data.get_u8() != 0
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub enum StrengthMethod {
    Acceleration,
    MaxSlope,
    TorquePerWheel
}

impl FromBytes for StrengthMethod {
    fn from_bytes(data: &mut Bytes) -> StrengthMethod {
        let val = data.get_u32_le();
        match val {
            0 => StrengthMethod::Acceleration,
            1 => StrengthMethod::MaxSlope,
            2 => StrengthMethod::TorquePerWheel,
            _ => StrengthMethod::Acceleration
        }
    }
}


#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Vehicle {
    #[wasm_bindgen(skip)]
    pub display_name: String,
    pub pos: Vec2,
    pub rot: Quat,
    #[wasm_bindgen(skip)]
    pub prefab_name: String,
    pub target_speed: f32,
    pub mass: f32,
    pub braking_force_multiplier: f32,
    pub strength_method: StrengthMethod,
    pub acceleration: f32,
    pub max_slope: f32,
    pub desired_acceleration: f32,
    pub shocks_multiplier: f32,
    pub rotation_degrees: f32,
    pub time_delay: f32,
    pub idle_on_downhill: bool,
    pub flipped: bool,
    pub ordered_checkpoints: bool,
    #[wasm_bindgen(skip)]
    pub guid: String,
    pub uniform_scale: f32,
    #[wasm_bindgen(skip)]
    pub skin_id: String,
    #[wasm_bindgen(skip)]
    pub mod_id: String,
    #[wasm_bindgen(skip)]
    pub checkpoint_guids: Vec<String>
}

impl FromBytesVersioned for Vehicle {
    fn from_bytes(data: &mut Bytes, version: i32) -> Vehicle {
        Vehicle {
            display_name: get_string(data),
            pos: Vec2::from_bytes(data),
            rot: Quat::from_bytes(data),
            prefab_name: get_string(data),
            target_speed: data.get_f32_le(),
            mass: data.get_f32_le(),
            braking_force_multiplier: data.get_f32_le(),
            strength_method: StrengthMethod::from_bytes(data),
            acceleration: data.get_f32_le(),
            max_slope: data.get_f32_le(),
            desired_acceleration: data.get_f32_le(),
            shocks_multiplier: data.get_f32_le(),
            rotation_degrees: data.get_f32_le(),
            time_delay: data.get_f32_le(),
            idle_on_downhill: data.get_u8() != 0,
            flipped: data.get_u8() != 0,
            ordered_checkpoints: data.get_u8() != 0,
            guid: get_string(data),
            uniform_scale: if version >= 50 { data.get_f32_le() } else { 1.0 },
            skin_id: if version >= 51 { get_string(data) } else { "".to_string() },
            mod_id: if version >= 54 { get_string(data) } else { "".to_string() },
            checkpoint_guids: {
                let mut checkpoint_guids = Vec::<String>::new();
                for _ in 0..data.get_i32_le() {
                    checkpoint_guids.push(get_string(data));
                }
                checkpoint_guids
            }
        }
    }
}


#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct VehicleStopTrigger {
    pub pos: Vec2,
    pub rot: Quat,
    pub height: f32,
    pub rotation_degrees: f32,
    pub flipped: bool,
    pub invisible_in_sim: bool,
    #[wasm_bindgen(skip)]
    pub prefab_name: String,
    #[wasm_bindgen(skip)]
    pub stop_vehicle_guid: String
}

impl FromBytesVersioned for VehicleStopTrigger {
    fn from_bytes(data: &mut Bytes, version: i32) -> VehicleStopTrigger {
        VehicleStopTrigger {
            pos: Vec2::from_bytes(data),
            rot: Quat::from_bytes(data),
            height: data.get_f32_le(),
            rotation_degrees: data.get_f32_le(),
            flipped: data.get_u8() != 0,
            invisible_in_sim: version >= 73 && data.get_u8() != 0,
            prefab_name: get_string(data),
            stop_vehicle_guid: get_string(data)
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct VehicleRestartPhase {
    pub time_delay: f32,
    #[wasm_bindgen(skip)]
    pub guid: String,
    #[wasm_bindgen(skip)]
    pub vehicle_guid: String
}

impl FromBytes for VehicleRestartPhase {
    fn from_bytes(data: &mut Bytes) -> VehicleRestartPhase {
        VehicleRestartPhase {
            time_delay: data.get_f32_le(),
            guid: get_string(data),
            vehicle_guid: get_string(data)
        }
    }
}
