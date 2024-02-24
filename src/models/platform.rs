use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use crate::models::common::Vec2;
use crate::models::traits::FromBytesVersioned;
use crate::utils::get_string;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Platform {
    pub pos: Vec2,
    pub width: f32,
    pub height: f32,
    pub flipped: bool,
    pub solid: bool
}

impl FromBytesVersioned for Platform {
    fn from_bytes(data: &mut Bytes, version: i32) -> Platform {
        let p = Platform {
            pos: Vec2::from_bytes(data),
            width: data.get_f32_le(),
            height: data.get_f32_le(),
            flipped: data.get_u8() != 0,
            solid: version >= 22 && data.get_u8() != 0,
        };
        if version < 22 {
            data.get_u32_le();  // earlier versions have an unknown int
        }
        p
    }
}
