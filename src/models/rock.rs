use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use crate::models::common::Vec3;
use crate::models::traits::FromBytesVersioned;
use crate::utils::get_string;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Rock {
    pub pos: Vec3,
    pub scale: Vec3,
    #[wasm_bindgen(skip)]
    pub prefab_name: String,
    pub flipped: bool,
    pub lock_to_bottom: bool,
    pub uniform_scale: bool
}

impl FromBytesVersioned for Rock {
    fn from_bytes(data: &mut Bytes, version: i32) -> Rock {
        Rock {
            pos: Vec3::from_bytes(data),
            scale: Vec3::from_bytes(data),
            prefab_name: get_string(data),
            flipped: data.get_u8() != 0,
            lock_to_bottom: version >= 60 && data.get_u8() != 0,
            uniform_scale: version >= 66 && data.get_u8() != 0
        }
    }
}
