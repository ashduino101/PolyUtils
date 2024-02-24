use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use crate::models::common::Vec3;
use crate::models::traits::FromBytesVersioned;
use crate::utils::get_string;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct WaterBlock {
    pub pos: Vec3,
    pub width: f32,
    pub height: f32,
    pub lock_position: bool
}

impl FromBytesVersioned for WaterBlock {
    fn from_bytes(data: &mut Bytes, version: i32) -> WaterBlock {
        WaterBlock {
            pos: Vec3::from_bytes(data),
            width: data.get_f32_le(),
            height: data.get_f32_le(),
            lock_position: version >= 12 && data.get_u8() != 0
        }
    }
}
