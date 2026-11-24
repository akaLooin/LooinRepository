package world.looin.app

/** 기기에 저장하는 간단한 설정 (서버 주소, 접속 토큰). */
expect object AppSettings {
    fun get(key: String): String?
    fun set(key: String, value: String?)
}

expect fun nowMillis(): Long
