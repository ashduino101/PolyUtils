use bytes::{Buf, Bytes};
use wasm_bindgen_test::console_log;
use rand::{thread_rng, Rng};
use rand::distributions::Alphanumeric;

pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}


pub(crate) fn get_string(data: &mut Bytes) -> String {
    let len = data.get_u16_le() as usize;
    let mut d = data.slice(0..len);
    data.advance(len);
    String::from_utf8(d.to_vec()).expect("invalid string")
}

pub(crate) fn new_guid() -> String {
    thread_rng()
        .sample_iter(&Alphanumeric)
        .take(21)
        .map(char::from)
        .collect()
}
