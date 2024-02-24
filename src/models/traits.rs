use bytes::Bytes;

pub trait FromBytes {
    fn from_bytes(data: &mut Bytes) -> Self;
}

pub trait FromBytesVersioned {
    fn from_bytes(data: &mut Bytes, version: i32) -> Self;
}
