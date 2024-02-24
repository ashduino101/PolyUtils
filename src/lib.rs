pub mod utils;
pub mod layout;
pub mod bridge;
pub mod models;

use bytes::Bytes;
use wasm_bindgen::prelude::*;
use wasm_bindgen_test::console_log;
use crate::layout::Layout;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn load_layout(data: Box<[u8]>) {
    let mut b = Bytes::from(data);
    let layout = Layout::new(&mut b);
    console_log!("{:?}", layout);
}
