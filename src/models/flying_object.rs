use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use crate::models::common::Vec3;
use crate::models::traits::FromBytes;
use crate::utils::get_string;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct FlyingObject {
    pub pos: Vec3,
    pub scale: Vec3,
    #[wasm_bindgen(skip)]
    pub prefab_name: String
}

impl FromBytes for FlyingObject {
    fn from_bytes(data: &mut Bytes) -> FlyingObject {
        FlyingObject {
            pos: Vec3::from_bytes(data),
            scale: Vec3::from_bytes(data),
            prefab_name: get_string(data)
        }
    }
}
