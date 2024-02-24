use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    pub(crate) fn from_bytes(data: &mut Bytes) -> Vec2 {
        Vec2 {
            x: data.get_f32_le(),
            y: data.get_f32_le()
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32
}

impl Vec3 {
    pub(crate) fn from_bytes(data: &mut Bytes) -> Vec3 {
        Vec3 {
            x: data.get_f32_le(),
            y: data.get_f32_le(),
            z: data.get_f32_le()
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub struct Quat {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub w: f32
}

impl Quat {
    pub(crate) fn from_bytes(data: &mut Bytes) -> Quat {
        Quat {
            x: data.get_f32_le(),
            y: data.get_f32_le(),
            z: data.get_f32_le(),
            w: data.get_f32_le()
        }
    }
}
