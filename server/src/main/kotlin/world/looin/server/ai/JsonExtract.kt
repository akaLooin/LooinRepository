package world.looin.server.ai

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import world.looin.shared.LooinJson

/** 모델 출력에서 JSON 부분만 너그럽게 꺼낸다 (코드블록, 앞뒤 설명 등을 무시). */
object JsonExtract {
    fun obj(text: String): JsonObject? = slice(text, '{', '}')?.let { runCatching { LooinJson.parseToJsonElement(it) as? JsonObject }.getOrNull() }
    fun arr(text: String): JsonArray? = slice(text, '[', ']')?.let { runCatching { LooinJson.parseToJsonElement(it) as? JsonArray }.getOrNull() }

    private fun slice(text: String, open: Char, close: Char): String? {
        val s = text.indexOf(open)
        val e = text.lastIndexOf(close)
        return if (s >= 0 && e > s) text.substring(s, e + 1) else null
    }
}

fun JsonElement?.str(key: String): String? = ((this as? JsonObject)?.get(key) as? JsonPrimitive)?.contentOrNull
