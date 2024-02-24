use bytes::{Buf, Bytes};
use wasm_bindgen::prelude::*;
use crate::models::traits::FromBytesVersioned;
use crate::utils::get_string;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct EventTimeline {
    #[wasm_bindgen(skip)]
    pub checkpoint_guid: String,
    #[wasm_bindgen(skip)]
    pub stages: Vec<EventStage>
}

impl FromBytesVersioned for EventTimeline {
    fn from_bytes(data: &mut Bytes, version: i32) -> EventTimeline {
        EventTimeline {
            checkpoint_guid: get_string(data),
            stages: {
                let mut stages = Vec::<EventStage>::new();
                for _ in 0..data.get_u32_le() {
                    stages.push(EventStage::from_bytes(data, version));
                }
                stages
            }
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct EventStage {
    #[wasm_bindgen(skip)]
    pub units: Vec<EventUnit>
}

impl FromBytesVersioned for EventStage {
    fn from_bytes(data: &mut Bytes, version: i32) -> EventStage {
        EventStage {
            units: {
                let mut units = Vec::<EventUnit>::new();
                for _ in 0..data.get_u32_le() {
                    units.push(EventUnit::from_bytes(data, version));
                }
                units
            }
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct EventUnit {
    #[wasm_bindgen(skip)]
    pub guid: String
}

impl FromBytesVersioned for EventUnit {
    fn from_bytes(data: &mut Bytes, version: i32) -> EventUnit {
        let guid = if version >= 7 {
            get_string(data)
        } else {  // this is so stupid
            let mut text = get_string(data);
            if text.is_empty() {
                text = get_string(data);
                if text.is_empty() {
                    text = get_string(data);
                }
            }
            text
        };

        EventUnit { guid }
    }
}