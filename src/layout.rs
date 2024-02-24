use bytes::{Buf, Bytes, BytesMut};
use wasm_bindgen::prelude::*;
use wasm_bindgen::convert::{IntoWasmAbi, WasmAbi};
use wasm_bindgen::describe::WasmDescribe;
use js_sys::Array;
use wasm_bindgen_test::console_log;
use crate::bridge::Bridge;
use crate::models::bridge::BridgeJoint;
use crate::models::checkpoint::Checkpoint;
use crate::models::common::Vec2;
use crate::models::flying_object::FlyingObject;
use crate::models::hydraulics::HydraulicPhase;
use crate::models::platform::Platform;
use crate::models::ramp::Ramp;
use crate::models::rock::Rock;
use crate::models::terrain::TerrainIsland;
use crate::models::timeline::EventTimeline;
use crate::models::traits::{FromBytes, FromBytesVersioned};
use crate::models::vehicle::{Vehicle, VehicleRestartPhase, VehicleStopTrigger, ZedAxisVehicle};
use crate::models::water_block::WaterBlock;
use crate::utils::{get_string, set_panic_hook};

#[wasm_bindgen]
#[derive(Debug)]
pub struct Layout {
    pub version: i32,
    pub bridge_version: i32,
    #[wasm_bindgen(skip)]
    pub theme: String,
    #[wasm_bindgen(skip)]
    pub anchors: Vec<BridgeJoint>,
    #[wasm_bindgen(skip)]
    pub hydraulic_phases: Vec<HydraulicPhase>,
    #[wasm_bindgen(skip)]
    pub bridge: Bridge,
    #[wasm_bindgen(skip)]
    pub zed_axis_vehicles: Vec<ZedAxisVehicle>,
    #[wasm_bindgen(skip)]
    pub vehicles: Vec<Vehicle>,
    #[wasm_bindgen(skip)]
    pub vehicle_stop_triggers: Vec<VehicleStopTrigger>,
    #[wasm_bindgen(skip)]
    pub event_timelines: Vec<EventTimeline>,
    #[wasm_bindgen(skip)]
    pub checkpoints: Vec<Checkpoint>,
    #[wasm_bindgen(skip)]
    pub terrain_islands: Vec<TerrainIsland>,
    #[wasm_bindgen(skip)]
    pub platforms: Vec<Platform>,
    #[wasm_bindgen(skip)]
    pub ramps: Vec<Ramp>,
    #[wasm_bindgen(skip)]
    pub vehicle_restart_phases: Vec<VehicleRestartPhase>,
    #[wasm_bindgen(skip)]
    pub flying_objects: Vec<FlyingObject>,
    #[wasm_bindgen(skip)]
    pub rocks: Vec<Rock>,
    #[wasm_bindgen(skip)]
    pub water_blocks: Vec<WaterBlock>,
}

impl Layout {
    pub fn new(data: &mut Bytes) -> Layout {
        Self::parse(data)
    }

    fn deserialize_array<T>(data: &mut Bytes) -> Vec<T> where T: FromBytes {
        let num = data.get_u32_le();
        let mut arr = Vec::<T>::new();
        for _ in 0..num {
            arr.push(T::from_bytes(data));
        }
        arr
    }

    fn deserialize_array_versioned<T>(data: &mut Bytes, version: i32) -> Vec<T> where T: FromBytesVersioned {
        let num = data.get_u32_le();
        let mut arr = Vec::<T>::new();
        for _ in 0..num {
            arr.push(T::from_bytes(data, version));
        }
        arr
    }

    fn parse(data: &mut Bytes) -> Layout {
        set_panic_hook();

        let mut version = data.get_i32_le();
        let mut is_modded = false;
        // for PTF mods, the version is inverted to indicate the layout is modded
        // (only occurs in PB2 layouts)
        if version < 0 {
            is_modded = true;
            version = -version;
        }
        let mut bridge_version = if version >= 38 { data.get_i32_le() } else { 0 };
        let theme = get_string(data);

        let mut anchors = if version >= 19 {
            Layout::deserialize_array_versioned::<BridgeJoint>(data, bridge_version)
        } else {
            Vec::<BridgeJoint>::new()
        };

        if version == 37 {
            let num_nobuild_anchors = data.get_u32_le();
            for _ in 0..num_nobuild_anchors {
                let guid = get_string(data);
                for mut a in &mut anchors {
                    if a.guid == guid {
                        a.no_build = true;
                    }
                }
            }
        }

        let mut hydraulic_phases = if version >= 5 {
            Layout::deserialize_array::<HydraulicPhase>(data)
        } else {
            Vec::<HydraulicPhase>::new()
        };

        let bridge = Bridge::from_bytes(data);

        let zed_axis_vehicles = if version >= 7 {
            Layout::deserialize_array_versioned::<ZedAxisVehicle>(data, version)
        } else {
            Vec::<ZedAxisVehicle>::new()
        };

        let vehicles = Layout::deserialize_array_versioned::<Vehicle>(data, version);

        let vehicle_stop_triggers = Layout::deserialize_array_versioned::<VehicleStopTrigger>(data, version);

        if version < 20 {
            let num_theme_objects = data.get_u32_le();
            for _ in 0..num_theme_objects {  // discard these
                Vec2::from_bytes(data);
                get_string(data);
                data.get_u8();
            }
        }

        let event_timelines = Layout::deserialize_array_versioned::<EventTimeline>(data, version);

        let checkpoints = Layout::deserialize_array_versioned::<Checkpoint>(data, version);

        let terrain_islands = Layout::deserialize_array_versioned::<TerrainIsland>(data, version);
        let platforms = Layout::deserialize_array_versioned::<Platform>(data, version);
        let ramps = Layout::deserialize_array_versioned::<Ramp>(data, version);

        hydraulic_phases = if version < 5 {  // in versions < 5, hydraulic phases are here
            Layout::deserialize_array::<HydraulicPhase>(data)
        } else {
            hydraulic_phases
        };

        let vehicle_restart_phases = Layout::deserialize_array::<VehicleRestartPhase>(data);

        let flying_objects = Layout::deserialize_array::<FlyingObject>(data);
        let rocks = Layout::deserialize_array_versioned::<Rock>(data, version);
        let water_blocks = Layout::deserialize_array_versioned::<WaterBlock>(data, version);

        // Unknown TODO: find old assemblies to figure out what these are
        if version < 5 {
            let count = data.get_u32_le();
            for _ in 0..count {
                let count2 = data.get_u32_le();
                for _ in 0..count2 {
                    get_string(data);
                }
            }
        }

        Layout {
            version,
            bridge_version,
            theme,
            anchors,
            hydraulic_phases,
            bridge,
            zed_axis_vehicles,
            vehicles,
            vehicle_stop_triggers,
            event_timelines,
            checkpoints,
            terrain_islands,
            platforms,
            ramps,
            vehicle_restart_phases,
            flying_objects,
            rocks,
            water_blocks
        }
    }
}

#[wasm_bindgen]
impl Layout {
    #[wasm_bindgen(getter)]
    pub fn theme(&self) -> String {
        self.theme.to_string()
    }

    #[wasm_bindgen(getter)]
    pub fn anchors(&self) -> Vec<BridgeJoint> {
        (*self.anchors).to_vec()
    }
}
