package world.looin.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** 마크다운 블록 (가볍게 직접 해석 — 대화 답변에 흔히 쓰이는 것들만). */
sealed interface MdBlock {
    data class Heading(val level: Int, val text: String) : MdBlock
    data class Paragraph(val text: String) : MdBlock
    data class Bullet(val items: List<String>) : MdBlock
    data class Numbered(val items: List<Pair<String, String>>) : MdBlock
    data class Quote(val text: String) : MdBlock
    data class Code(val lang: String, val code: String) : MdBlock
    data object Rule : MdBlock
}

private val numbered = Regex("^(\\d+)[.)]\\s+(.*)")
private val bullet = Regex("^\\s*[-*•]\\s+(.*)")

fun parseMarkdown(src: String): List<MdBlock> {
    val out = mutableListOf<MdBlock>()
    val lines = src.replace("\r\n", "\n").split("\n")
    var i = 0
    val para = StringBuilder()
    fun flush() { if (para.isNotBlank()) out += MdBlock.Paragraph(para.toString().trim()); para.clear() }
    while (i < lines.size) {
        val line = lines[i]
        val t = line.trim()
        when {
            t.startsWith("```") -> {
                flush()
                val lang = t.removePrefix("```").trim()
                val code = StringBuilder()
                i++
                while (i < lines.size && !lines[i].trim().startsWith("```")) { code.appendLine(lines[i]); i++ }
                out += MdBlock.Code(lang, code.toString().trimEnd('\n'))   // 닫히지 않은 코드(작성 중)도 그대로 보여준다
            }
            t.startsWith("#") && t.trimStart('#').startsWith(" ") -> {
                flush(); out += MdBlock.Heading(t.takeWhile { it == '#' }.length.coerceAtMost(3), t.trimStart('#').trim())
            }
            t == "---" || t == "***" || t == "___" -> { flush(); out += MdBlock.Rule }
            t.startsWith(">") -> {
                flush()
                val q = StringBuilder()
                while (i < lines.size && lines[i].trim().startsWith(">")) { q.appendLine(lines[i].trim().removePrefix(">").trim()); i++ }
                out += MdBlock.Quote(q.toString().trim()); continue
            }
            bullet.matches(line) -> {
                flush()
                val items = mutableListOf<String>()
                while (i < lines.size && bullet.matches(lines[i])) { items += bullet.find(lines[i])!!.groupValues[1]; i++ }
                out += MdBlock.Bullet(items); continue
            }
            numbered.matches(t) -> {
                flush()
                val items = mutableListOf<Pair<String, String>>()
                while (i < lines.size && numbered.matches(lines[i].trim())) {
                    val m = numbered.find(lines[i].trim())!!; items += m.groupValues[1] to m.groupValues[2]; i++
                }
                out += MdBlock.Numbered(items); continue
            }
            t.isEmpty() -> flush()
            else -> { if (para.isNotEmpty()) para.append('\n'); para.append(line) }
        }
        i++
    }
    flush()
    return out
}

/** **굵게**, *기울임*, `코드`, [링크](주소) */
fun inlineMarkdown(text: String, codeBg: Color, link: Color): AnnotatedString = buildAnnotatedString {
    var i = 0
    while (i < text.length) {
        val rest = text.substring(i)
        when {
            rest.startsWith("**") && rest.indexOf("**", 2) > 2 -> {
                val end = rest.indexOf("**", 2)
                withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(inlineMarkdown(rest.substring(2, end), codeBg, link)) }
                i += end + 2
            }
            rest.startsWith("`") && rest.indexOf('`', 1) > 1 -> {
                val end = rest.indexOf('`', 1)
                withStyle(SpanStyle(fontFamily = FontFamily.Monospace, background = codeBg, fontSize = 14.sp)) { append(" " + rest.substring(1, end) + " ") }
                i += end + 1
            }
            (rest.startsWith("*") || rest.startsWith("_")) && rest.length > 2 && rest[1] != ' ' &&
                rest.indexOf(rest[0], 1).let { it > 1 && rest[it - 1] != ' ' } -> {
                val end = rest.indexOf(rest[0], 1)
                withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(rest.substring(1, end)) }
                i += end + 1
            }
            rest.startsWith("[") && Regex("^\\[([^\\]]+)]\\(([^)]+)\\)").containsMatchIn(rest) -> {
                val m = Regex("^\\[([^\\]]+)]\\(([^)]+)\\)").find(rest)!!
                withStyle(SpanStyle(color = link, textDecoration = TextDecoration.Underline)) { append(m.groupValues[1]) }
                i += m.value.length
            }
            else -> { append(text[i]); i++ }
        }
    }
}

@Composable
fun MarkdownText(text: String, modifier: Modifier = Modifier) {
    val blocks = remember(text) { parseMarkdown(text) }
    val cs = MaterialTheme.colorScheme
    val codeBg = cs.surfaceVariant
    val body = MaterialTheme.typography.bodyLarge.copy(lineHeight = 24.sp)
    fun inline(s: String) = inlineMarkdown(s, codeBg, cs.primary)

    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        blocks.forEach { b ->
            when (b) {
                is MdBlock.Heading -> Text(
                    inline(b.text),
                    style = when (b.level) { 1 -> MaterialTheme.typography.titleLarge; 2 -> MaterialTheme.typography.titleMedium; else -> MaterialTheme.typography.titleSmall },
                    fontWeight = FontWeight.Bold,
                )
                is MdBlock.Paragraph -> Text(inline(b.text), style = body)
                is MdBlock.Bullet -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    b.items.forEach { item ->
                        Row { Text("•", style = body, modifier = Modifier.width(18.dp)); Text(inline(item), style = body) }
                    }
                }
                is MdBlock.Numbered -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    b.items.forEach { (n, item) ->
                        Row { Text("$n.", style = body, modifier = Modifier.width(24.dp)); Text(inline(item), style = body) }
                    }
                }
                is MdBlock.Quote -> Row(Modifier.height(IntrinsicSize.Min)) {
                    Box(Modifier.width(3.dp).fillMaxHeight().background(cs.primary))
                    Text(inline(b.text), style = body, color = cs.onSurfaceVariant, modifier = Modifier.padding(start = 10.dp))
                }
                is MdBlock.Code -> Column(
                    Modifier.fillMaxWidth().background(cs.surfaceVariant, RoundedCornerShape(10.dp)).padding(12.dp),
                ) {
                    if (b.lang.isNotBlank()) Text(b.lang, style = MaterialTheme.typography.labelSmall, color = cs.onSurfaceVariant)
                    Text(
                        b.code, fontFamily = FontFamily.Monospace, fontSize = 13.sp, lineHeight = 19.sp,
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                    )
                }
                MdBlock.Rule -> HorizontalDivider()
            }
        }
    }
}
