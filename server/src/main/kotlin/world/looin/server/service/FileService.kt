package world.looin.server.service

import org.apache.pdfbox.Loader
import org.apache.pdfbox.text.PDFTextStripper
import org.slf4j.LoggerFactory
import world.looin.server.ai.TurnAttachment
import world.looin.server.db.Repository
import world.looin.shared.AttachmentInfo
import world.looin.shared.World
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.io.File
import javax.imageio.ImageIO

/**
 * 채팅 첨부 파일. data/files/<id> 에 저장하고, 두뇌가 읽을 수 있게 준비한다.
 *  - 사진: 너무 크면 긴 변 1568px 로 줄인다 (Claude 권장 크기 — 토큰·용량 절약)
 *  - PDF : Claude 는 PDF 자체를 읽고, 무료 두뇌용으로 글자도 뽑아 둔다
 *  - 텍스트/코드 파일: 글자로 읽는다
 */
class FileService(private val repo: Repository, private val dir: File) {
    private val log = LoggerFactory.getLogger(FileService::class.java)

    companion object {
        const val MAX_BYTES = 25L * 1024 * 1024
        private const val MAX_TEXT_CHARS = 300_000
        private const val IMAGE_MAX_EDGE = 1568
        val IMAGE_TYPES = setOf("image/jpeg", "image/png", "image/gif", "image/webp")
        private val TEXT_EXT = setOf(
            "txt", "md", "markdown", "csv", "tsv", "json", "xml", "yaml", "yml", "html", "htm", "css", "js", "ts",
            "kt", "kts", "java", "py", "rb", "go", "rs", "c", "h", "cpp", "hpp", "cs", "swift", "sh", "sql", "log",
            "ini", "toml", "gradle", "properties", "srt", "tex",
        )

        fun normalizeMime(name: String, mime: String): String {
            val ext = name.substringAfterLast('.', "").lowercase()
            return when {
                ext == "pdf" -> "application/pdf"
                ext in setOf("jpg", "jpeg") -> "image/jpeg"
                ext == "png" -> "image/png"
                ext == "gif" -> "image/gif"
                ext == "webp" -> "image/webp"
                ext in TEXT_EXT -> "text/plain"
                mime.isNotBlank() && mime != "application/octet-stream" -> mime.lowercase()
                else -> "application/octet-stream"
            }
        }

        fun isText(mime: String) = mime.startsWith("text/") || mime == "application/json" || mime == "application/xml"
    }

    init { dir.mkdirs() }

    fun save(world: World, rawName: String, rawMime: String, bytes: ByteArray): AttachmentInfo {
        require(bytes.isNotEmpty()) { "빈 파일입니다" }
        require(bytes.size <= MAX_BYTES) { "파일이 너무 커요 (최대 25MB)" }
        val name = rawName.replace(Regex("[/\\\\]"), "_").take(200).ifBlank { "file" }
        val mime = normalizeMime(name, rawMime)
        require(mime in IMAGE_TYPES || mime == "application/pdf" || isText(mime)) {
            "아직 읽을 수 없는 파일 형식이에요 (사진, PDF, 텍스트/코드 파일만 가능)"
        }
        val stored = if (mime == "image/jpeg" || mime == "image/png") shrinkImage(bytes, mime) else bytes
        val text = when {
            mime == "application/pdf" -> extractPdf(stored)
            isText(mime) -> String(stored, Charsets.UTF_8).take(MAX_TEXT_CHARS)
            else -> null
        }
        val info = repo.saveAttachment(world.id, name, mime, stored.size.toLong(), text)
        File(dir, info.id).writeBytes(stored)
        return info
    }

    /** 두뇌에 넘길 형태로 불러온다. */
    fun load(world: World, id: String): TurnAttachment? {
        val (info, text) = repo.attachment(world.id, id) ?: return null
        val f = File(dir, info.id)
        val bytes = if (f.exists() && !isText(info.mime)) f.readBytes() else null
        return TurnAttachment(info.name, info.mime, bytes, text)
    }

    fun info(world: World, id: String): AttachmentInfo? = repo.attachment(world.id, id)?.first

    private fun shrinkImage(bytes: ByteArray, mime: String): ByteArray = runCatching {
        val img = ImageIO.read(bytes.inputStream()) ?: return bytes
        val edge = maxOf(img.width, img.height)
        if (edge <= IMAGE_MAX_EDGE) return bytes
        val k = IMAGE_MAX_EDGE.toDouble() / edge
        val w = (img.width * k).toInt(); val h = (img.height * k).toInt()
        val type = if (mime == "image/png") BufferedImage.TYPE_INT_ARGB else BufferedImage.TYPE_INT_RGB
        val out = BufferedImage(w, h, type)
        out.createGraphics().apply {
            setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
            drawImage(img, 0, 0, w, h, null)
            dispose()
        }
        ByteArrayOutputStream().also { ImageIO.write(out, if (mime == "image/png") "png" else "jpg", it) }.toByteArray()
    }.getOrElse { log.warn("image shrink failed: {}", it.message); bytes }

    private fun extractPdf(bytes: ByteArray): String? = runCatching {
        Loader.loadPDF(bytes).use { doc -> PDFTextStripper().getText(doc).trim().take(MAX_TEXT_CHARS) }
    }.getOrElse { log.warn("pdf text failed: {}", it.message); null }
}
