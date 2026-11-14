package com.looin.finance.ui

import com.looin.finance.ui.platform.InMemoryKeyValueStore
import com.looin.finance.ui.security.AppLock
import com.looin.finance.ui.security.hashPin
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class AppLockTest {
    private val store = InMemoryKeyValueStore()

    /** PIN 원문은 저장하지 않고, 같은 PIN 도 소금이 다르면 해시가 다르다 */
    @Test fun pinIsStoredOnlyAsSaltedHash() {
        AppLock.init(store)
        AppLock.setPin("1234")
        assertFalse(store.get("lock.hash")!!.contains("1234"))
        assertNotEquals(hashPin("1234", "a"), hashPin("1234", "b"))
        assertEquals(hashPin("1234", "a"), hashPin("1234", "a"))
    }

    /** 켜져 있으면 시작 시 잠김, 맞는 PIN 으로 해제, 1분 이상 나갔다 오면 다시 잠김(짧게 나갔다 오면 그대로) */
    @Test fun lockLifecycle() {
        AppLock.init(store); AppLock.setPin("2580")
        AppLock.init(store) // 앱 재시작
        assertTrue(AppLock.locked)
        assertFalse(AppLock.tryUnlock("0000", 1_000))
        assertTrue(AppLock.tryUnlock("2580", 1_000))
        assertFalse(AppLock.locked)
        AppLock.onBackground(10_000); AppLock.onForeground(30_000) // 20초
        assertFalse(AppLock.locked)
        AppLock.onBackground(40_000); AppLock.onForeground(100_000) // 60초
        assertTrue(AppLock.locked)
    }

    /** 5번 틀리면 30초 동안 맞는 PIN 도 받지 않는다 */
    @Test fun lockoutAfterFiveWrongTries() {
        AppLock.init(store); AppLock.setPin("1111"); AppLock.lockNow()
        repeat(5) { assertFalse(AppLock.tryUnlock("9999", 0)) }
        assertFalse(AppLock.tryUnlock("1111", 10_000))
        assertTrue(AppLock.tryUnlock("1111", 30_001))
    }

    /** 끄면 저장된 해시도 지우고, 생체 인증은 잠금이 켜져 있을 때만 */
    @Test fun disableClearsEverything() {
        AppLock.init(store); AppLock.setPin("1234"); AppLock.setBiometric(true)
        assertTrue(AppLock.biometricEnabled)
        AppLock.disable()
        AppLock.init(store)
        assertFalse(AppLock.enabled); assertFalse(AppLock.locked); assertFalse(AppLock.biometricEnabled)
        AppLock.setBiometric(true)
        assertFalse(AppLock.biometricEnabled)
    }
}
