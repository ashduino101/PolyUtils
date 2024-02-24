#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use wasm_bindgen_test::*;
use include_dir::{include_dir, Dir};

// wasm_bindgen_test_configure!(run_in_browser);

static LAYOUT_DIR: Dir = include_dir!("tests/data/layouts");
static SLOT_DIR: Dir = include_dir!("tests/data/slots");

#[cfg(test)]
mod tests {
    extern crate wasm_bindgen_test;
    use wasm_bindgen_test::*;
    use std::fs::File;
    use std::io::{Read};
    use bytes::{Bytes};
    use polyutils::layout::Layout;
    use polyutils::utils::set_panic_hook;
    use crate::LAYOUT_DIR;

    #[test]
    #[wasm_bindgen_test]
    fn test_layouts() {
        set_panic_hook();

        for entry in LAYOUT_DIR.entries() {
            console_log!("Testing {}", entry.path().to_str().unwrap());
            let mut f = entry.as_file().unwrap();
            let mut data = Vec::from(f.contents());
            let mut b = Bytes::from(data);
            let mut layout = Layout::new(&mut b);
            // console_log!("{:?}", layout);
        }
    }
}