use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use crate::models::common::Vec2;
use crate::models::traits::{FromBytes, FromBytesVersioned};
use crate::utils::get_string;

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub enum SplineType {
    Hermite,
    BSpline,
    Bezier,
    Linear
}

impl FromBytes for SplineType {
    fn from_bytes(data: &mut Bytes) -> SplineType {
        let val = data.get_u32_le();
        match val {
            0 => SplineType::Hermite,
            1 => SplineType::BSpline,
            2 => SplineType::Bezier,
            3 => SplineType::Linear,
            _ => SplineType::Hermite
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Ramp {
    pub pos: Vec2,
    #[wasm_bindgen(skip)]
    pub control_points: Vec<Vec2>,
    pub height: f32,
    pub num_segments: i32,
    pub spline_type: SplineType,
    pub flipped_vertical: bool,
    pub flipped_horizontal: bool,
    pub hide_legs: bool,
    pub flipped_legs: bool,
    #[wasm_bindgen(skip)]
    pub line_points: Vec<Vec2>
}

impl FromBytesVersioned for Ramp {
    fn from_bytes(data: &mut Bytes, version: i32) -> Ramp {
        let mut r = Ramp {
            pos: Vec2::from_bytes(data),
            control_points: {
                let mut points = Vec::new();
                for _ in 0..data.get_u32_le() {
                    points.push(Vec2::from_bytes(data));
                }
                points
            },
            height: data.get_f32_le(),
            num_segments: data.get_i32_le(),
            spline_type: SplineType::from_bytes(data),
            flipped_vertical: data.get_u8() != 0,
            flipped_horizontal: data.get_u8() != 0,
            hide_legs: version >= 23 && data.get_u8() != 0,
            flipped_legs: false,
            line_points: Vec::<Vec2>::new()
        };
        if version >= 25 {
            r.flipped_legs = data.get_u8() != 0;
        } else if version >= 22 {
            data.get_u8();  // incompatible
        } else {
            data.get_u32_le();
        }
        if version >= 13 {
            let mut points = Vec::new();
            for _ in 0..data.get_u32_le() {
                points.push(Vec2::from_bytes(data));
            }
            r.line_points = points
        }
        r
    }
}
