package com.looin.finance.ui.security

import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

actual fun hashPin(pin: String, salt: String): String {
    val spec = PBEKeySpec(pin.toCharArray(), salt.encodeToByteArray(), 20_000, 256)
    val bytes = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
    return bytes.joinToString("") { (it.toInt() and 0xFF).toString(16).padStart(2, '0') }
}
