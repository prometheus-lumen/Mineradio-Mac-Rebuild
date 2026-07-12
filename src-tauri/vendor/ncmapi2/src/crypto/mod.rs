mod key;

use aes::cipher::{
    block_padding::{Pkcs7, UnpadError},
    generic_array::GenericArray,
    BlockDecryptMut, BlockEncryptMut, KeyInit, KeyIvInit,
};
use base64::engine::general_purpose::STANDARD as base64;
use base64::Engine as _;
use rand::{thread_rng, RngCore};
use rsa::{
    pkcs8::DecodePublicKey,
    rand_core::CryptoRngCore,
    traits::{PaddingScheme, PublicKeyParts},
    RsaPublicKey,
};
use serde::Serialize;

use key::{BASE62, EAPI_KEY, IV, LINUX_API_KEY, PRESET_KEY, PUBLIC_KEY};

#[derive(Serialize, Debug, PartialEq, Eq, Clone, Copy)]
pub enum Crypto {
    Weapi,
    Eapi,
    #[allow(unused)]
    Linuxapi,
}

pub struct WeapiForm {
    params: String,
    enc_sec_key: String,
}

pub struct EapiForm {
    params: String,
}
pub struct LinuxapiForm {
    eparams: String,
}

impl WeapiForm {
    pub fn into_vec(self) -> Vec<(String, String)> {
        vec![
            ("params".to_owned(), self.params),
            ("encSecKey".to_owned(), self.enc_sec_key),
        ]
    }
}

impl EapiForm {
    pub fn into_vec(self) -> Vec<(String, String)> {
        vec![("params".to_owned(), self.params)]
    }
}

impl LinuxapiForm {
    pub fn into_vec(self) -> Vec<(String, String)> {
        vec![("eparams".to_owned(), self.eparams)]
    }
}

pub fn weapi(text: &[u8]) -> WeapiForm {
    let mut rng = rand::thread_rng();
    let mut rand_buf = [0u8; 16];
    rng.fill_bytes(&mut rand_buf);

    let sk = rand_buf
        .iter()
        .map(|i| BASE62.as_bytes()[(i % 62) as usize])
        .collect::<Vec<u8>>();

    let params = {
        let p = base64.encode(aes_128_cbc(text, PRESET_KEY, Some(IV.as_bytes())));
        base64.encode(aes_128_cbc(p.as_bytes(), &sk, Some(IV.as_bytes())))
    };

    let enc_sec_key = {
        let reversed_sk = sk.iter().rev().copied().collect::<Vec<u8>>();
        hex::encode(rsa(&reversed_sk, PUBLIC_KEY.as_bytes()))
    };

    WeapiForm {
        params,
        enc_sec_key,
    }
}

pub fn eapi(url: &[u8], data: &[u8]) -> EapiForm {
    let msg = format!(
        "nobody{}use{}md5forencrypt",
        String::from_utf8_lossy(url),
        String::from_utf8_lossy(data)
    );
    let digest = crate::hex::md5_hex(msg.as_bytes());

    let text = {
        let d = "-36cd479b6b5-";
        [url, d.as_bytes(), data, d.as_bytes(), digest.as_bytes()].concat()
    };

    let params = {
        let p = aes_128_ecb(&text, EAPI_KEY, None);
        hex::encode_upper(p)
    };

    EapiForm { params }
}

#[allow(unused)]
pub fn eapi_decrypt(ct: &[u8]) -> Result<Vec<u8>, UnpadError> {
    aes_128_ecb_decrypt(ct, EAPI_KEY, None)
}

pub fn linuxapi(text: &[u8]) -> LinuxapiForm {
    let ct = aes_128_ecb(text, LINUX_API_KEY.as_bytes(), None);
    let eparams = hex::encode_upper(ct);

    LinuxapiForm { eparams }
}

type Aes128EcbEnc = ecb::Encryptor<aes::Aes128>;
type Aes128EcbDec = ecb::Decryptor<aes::Aes128>;
type Aes128CbcEnc = cbc::Encryptor<aes::Aes128>;

fn aes_128_ecb(pt: &[u8], key: &[u8], _iv: Option<&[u8]>) -> Vec<u8> {
    let cipher = Aes128EcbEnc::new(GenericArray::from_slice(key));
    eprintln!("test de here");
    cipher.encrypt_padded_vec_mut::<Pkcs7>(pt)
}

fn aes_128_ecb_decrypt(ct: &[u8], key: &[u8], _iv: Option<&[u8]>) -> Result<Vec<u8>, UnpadError> {
    let cipher = Aes128EcbDec::new(GenericArray::from_slice(key));
    cipher.decrypt_padded_vec_mut::<Pkcs7>(ct)
}

fn aes_128_cbc(pt: &[u8], key: &[u8], iv: Option<&[u8]>) -> Vec<u8> {
    let cipher = Aes128CbcEnc::new(GenericArray::from_slice(key), iv.unwrap_or_default().into());
    cipher.encrypt_padded_vec_mut::<Pkcs7>(pt)
}

// key: der+base64
fn rsa(pt: &[u8], key: &[u8]) -> Vec<u8> {
    use rsa::{BigUint, Result, RsaPrivateKey};
    pub struct NoPadding;
    impl PaddingScheme for NoPadding {
        fn decrypt<Rng: CryptoRngCore + ?Sized>(
            self,
            _rng: Option<&mut Rng>,
            priv_key: &RsaPrivateKey,
            ciphertext: &[u8],
        ) -> Result<Vec<u8>> {
            let c = BigUint::from_bytes_be(ciphertext);
            let m = c.modpow(&priv_key.n(), &priv_key.n());
            Ok(m.to_bytes_be())
        }

        fn encrypt<Rng: CryptoRngCore + ?Sized>(
            self,
            _rng: &mut Rng,
            pub_key: &RsaPublicKey,
            msg: &[u8],
        ) -> Result<Vec<u8>> {
            let m = BigUint::from_bytes_be(msg);
            let e = BigUint::from_bytes_le(&65537_u32.to_le_bytes());
            let c = m.modpow(&e, &pub_key.n());
            Ok(c.to_bytes_be())
        }
    }

    let pub_key = RsaPublicKey::from_public_key_der(
        &base64::engine::general_purpose::STANDARD
            .decode(key)
            .unwrap(),
    )
    .unwrap();

    let prefix = vec![0u8; 128 - pt.len()];
    let pt = [&prefix[..], pt].concat();

    let mut rng = thread_rng();
    pub_key.encrypt(&mut rng, NoPadding, &pt).unwrap()
}

#[cfg(test)]
mod tests {
    use super::key::{EAPI_KEY, IV, PRESET_KEY, PUBLIC_KEY};
    use super::{aes_128_cbc, aes_128_ecb, aes_128_ecb_decrypt, rsa, weapi};
    use crate::crypto::{eapi, eapi_decrypt, linuxapi};

    #[test]
    fn test_aes_128_ecb() {
        let pt = "plain text";
        let ct = aes_128_ecb(pt.as_bytes(), EAPI_KEY, None);
        let _pt = aes_128_ecb_decrypt(&ct, EAPI_KEY, None);
        assert!(_pt.is_ok());

        if let Ok(decrypted) = _pt {
            assert_eq!(&decrypted, pt.as_bytes());
        }
    }

    #[test]
    fn test_aes_cbc() {
        let pt = "plain text";
        let ct = aes_128_cbc(pt.as_bytes(), PRESET_KEY, Some(IV.as_bytes()));
        assert!(hex::encode(ct).ends_with("baf0"))
    }

    #[test]
    fn test_rsa() {
        let ct = rsa(PRESET_KEY, PUBLIC_KEY.as_bytes());
        assert!(hex::encode(ct).ends_with("4413"));
    }

    #[test]
    fn test_weapi() {
        weapi(r#"{"username": "alex"}"#.as_bytes());
    }

    #[test]
    fn test_eapi() {
        let ct = eapi("/url".as_bytes(), "plain text".as_bytes());
        assert!(ct.params.ends_with("C3F3"));
    }

    #[test]
    fn test_eapi_decrypt() {
        let pt = "plain text";
        let ct = aes_128_ecb(pt.as_bytes(), EAPI_KEY, None);
        assert_eq!(pt.as_bytes(), &eapi_decrypt(&ct).unwrap())
    }

    #[test]
    fn test_linuxapi() {
        let ct = linuxapi(r#""plain text""#.as_bytes());
        assert!(ct.eparams.ends_with("2250"));
    }
}
