pub fn md5_hex(pt: &[u8]) -> String {
    hex::encode(md5::compute(pt).0)
}
