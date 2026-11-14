package com.looin.finance.ui.security

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.UByteVar
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.reinterpret
import kotlinx.cinterop.usePinned
import platform.CoreCrypto.CCKeyDerivationPBKDF
import platform.CoreCrypto.kCCPBKDF2
import platform.CoreCrypto.kCCPRFHmacAlgSHA256

/** iOS: CommonCrypto PBKDF2-SHA256, Android·PC 와 같은 매개변수(2만 회, 32바이트) → 같은 결과. */
@OptIn(ExperimentalForeignApi::class)
actual fun hashPin(pin: String, salt: String): String {
    val password = pin.encodeToByteArray()
    val saltBytes = salt.encodeToByteArray()
    val out = UByteArray(32)
    run {
        saltBytes.usePinned { s ->
            out.usePinned { o ->
                val rc = CCKeyDerivationPBKDF(
                    kCCPBKDF2, pin, password.size.toULong(), // 숫자만이라 C 문자열 = UTF-8 바이트
                    s.addressOf(0).reinterpret<UByteVar>(), saltBytes.size.toULong(),
                    kCCPRFHmacAlgSHA256, 20_000u, o.addressOf(0), out.size.toULong(),
                )
                check(rc == 0) { "PIN 변환 실패($rc)" }
            }
        }
    }
    return out.joinToString("") { it.toString(16).padStart(2, '0') }
}
