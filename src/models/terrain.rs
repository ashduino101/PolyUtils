use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use crate::models::common::{Vec3};
use crate::models::traits::{FromBytes, FromBytesVersioned};
use crate::utils::get_string;

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub enum TerrainIslandType {
    Bookend,
    Middle
}

impl FromBytes for TerrainIslandType {
    fn from_bytes(data: &mut Bytes) -> TerrainIslandType {
        let val = data.get_u32_le();
        match val {
            0 => TerrainIslandType::Bookend,
            1 => TerrainIslandType::Middle,
            _ => TerrainIslandType::Bookend
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct TerrainIsland {
    pub pos: Vec3,
    #[wasm_bindgen(skip)]
    pub prefab_name: String,
    pub height_added: f32,
    pub right_edge_water_height: f32,
    pub terrain_island_type: TerrainIslandType,
    pub variant_index: i32,
    pub flipped: bool,
    pub lock_position: bool,
    pub hidden: bool,
    pub height: f32
}

impl FromBytesVersioned for TerrainIsland {
    fn from_bytes(data: &mut Bytes, version: i32) -> TerrainIsland {
        let pos = Vec3::from_bytes(data);
        let prefab_name = get_string(data);
        let height_added = data.get_f32_le();
        TerrainIsland {
            pos,
            prefab_name,
            height_added,
            right_edge_water_height: data.get_f32_le(),
            terrain_island_type: TerrainIslandType::from_bytes(data),
            variant_index: data.get_i32_le(),
            flipped: data.get_u8() != 0,
            lock_position: version >= 6 && data.get_u8() != 0,
            hidden: version >= 27 && data.get_u8() != 0,
            height: if version >= 34 { data.get_f32_le() } else { 10.1 + height_added }
        }
    }
}
