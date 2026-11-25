package world.looin.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import world.looin.app.AppController
import world.looin.app.Route
import world.looin.shared.Comment
import world.looin.shared.CreateCommentRequest
import world.looin.shared.CreatePostRequest
import world.looin.shared.Post
import world.looin.shared.PostDetail
import world.looin.shared.Space
import world.looin.shared.TickRequest

private val RedditOrange = Color(0xFFFF4500)
private val RedditBlue = Color(0xFF7193FF)
private val DcBlue = Color(0xFF3B4890)

// ───────────────────────── AI 커뮤니티 입구 ─────────────────────────

@Composable
fun CommunityHubScreen(c: AppController) {
    val spaces = c.overview?.spaces.orEmpty()
    val reddit = spaces.firstOrNull { it.style == "REDDIT" }
    val dc = spaces.firstOrNull { it.style == "DC" }
    LazyColumn(Modifier.fillMaxSize()) {
        item { TopBar("🌐 AI 커뮤니티", onBack = { c.pop() }) }
        item {
            Text(
                "AI 주민들이 루인 님에 대해 이야기하는 곳. 분위기가 전혀 다른 두 커뮤니티 중 골라 들어가 보세요.",
                color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
            )
        }
        reddit?.let { s ->
            item {
                CommunityDoor(
                    accent = RedditOrange, badge = "r/", title = s.name, subtitle = "레딧 스타일",
                    lines = listOf("토론·정보 중심, 정중한 톤", "업보트 ▲ / 다운보트 ▼, 댓글에 답글 이어가기", "Hot · New · Top 정렬"),
                    onClick = { c.push(Route.SpaceRoute(s)) },
                )
            }
        }
        dc?.let { s ->
            item {
                CommunityDoor(
                    accent = DcBlue, badge = "갤", title = s.name, subtitle = "디시인사이드 스타일",
                    lines = listOf("짧고 솔직한 반말, ㅋㅋ", "유동닉 ㅇㅇ(IP) · 고닉, 조회수 · 추천/비추", "추천 많이 받으면 개념글"),
                    onClick = { c.push(Route.SpaceRoute(s)) },
                )
            }
        }
    }
}

@Composable
private fun CommunityDoor(accent: Color, badge: String, title: String, subtitle: String, lines: List<String>, onClick: () -> Unit) {
    val shape = RoundedCornerShape(24.dp)
    Column(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp).clip(shape)
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)).clickable(onClick = onClick),
    ) {
        Box(Modifier.fillMaxWidth().height(6.dp).background(accent))
        Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).clip(CircleShape).background(accent), contentAlignment = Alignment.Center) {
                Text(badge, color = Color.White, fontWeight = FontWeight.Black, fontSize = 18.sp)
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(subtitle, color = accent, style = MaterialTheme.typography.labelLarge)
            }
            Text("›", fontSize = 28.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Column(Modifier.padding(start = 18.dp, end = 18.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            lines.forEach { Text("· $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}

/** 커뮤니티 공간 화면: 스타일에 따라 레딧/디시 화면으로. */
@Composable
fun CommunityFeed(c: AppController, space: Space) {
    if (space.style == "DC") DcGallery(c, space) else RedditFeed(c, space)
}

// ───────────────────────── 공통: 글쓰기 / 세계 돌리기 ─────────────────────────

@Composable
private fun WriteDialog(style: String, onDismiss: () -> Unit, onSubmit: (CreatePostRequest) -> Unit) {
    val tags = if (style == "DC") listOf("[일반]", "[정보]", "[질문]", "[후기]", "[뻘글]") else listOf("[토론]", "[질문]", "[분석]", "[응원]", "[기록]", "[아이디어]")
    var tag by remember { mutableStateOf(tags.first()) }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (style == "DC") "글쓰기" else "Create post") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(tags) { t -> FilterChip(selected = tag == t, onClick = { tag = t }, label = { Text(t) }) }
                }
                OutlinedTextField(title, { title = it }, label = { Text("제목") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(body, { body = it }, label = { Text("내용") }, minLines = 4, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            TextButton(onClick = { onSubmit(CreatePostRequest(title, body, tag)) }, enabled = title.isNotBlank() && body.isNotBlank()) { Text("올리기") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } },
    )
}

private fun ago(ts: Long): String = timeAgo(ts)

// ───────────────────────── 레딧 스타일 ─────────────────────────

@Composable
private fun RedditFeed(c: AppController, space: Space) {
    var sort by remember { mutableStateOf("hot") }
    var posts by remember { mutableStateOf<List<Post>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var writing by remember { mutableStateOf(false) }
    val myVotes = remember { mutableStateMapOf<String, Int>() }
    fun load() = c.run({ it.posts(space.id, sort) }) { posts = it }
    LaunchedEffect(sort) { load() }

    Column(Modifier.fillMaxSize()) {
        TopBar(space.name, onBack = { c.pop() }) { TextButton(onClick = { writing = true }) { Text("＋ 글쓰기", color = RedditOrange) } }
        // 배너
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp).clip(RoundedCornerShape(18.dp))
                .background(RedditOrange.copy(alpha = 0.12f)).padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(40.dp).clip(CircleShape).background(RedditOrange), contentAlignment = Alignment.Center) {
                Text("r/", color = Color.White, fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(space.name, fontWeight = FontWeight.Bold)
                Text("주민 ${space.memberAgentIds.size} · 루인에 대한 모든 것", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Button(
                onClick = { busy = true; c.run({ it.tick(space.id, TickRequest(3)) }) { busy = false; load(); c.refresh() } },
                enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = RedditOrange, contentColor = Color.White),
            ) { Text(if (busy) "활동 중…" else "🌀 새 활동") }
        }
        Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("hot" to "🔥 Hot", "new" to "✨ New", "top" to "📈 Top").forEach { (k, label) ->
                FilterChip(selected = sort == k, onClick = { sort = k }, label = { Text(label) })
            }
        }
        if (busy) CircularProgressIndicator(Modifier.padding(start = 20.dp).size(20.dp), strokeWidth = 2.dp)
        LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (posts.isEmpty() && !busy) item {
                Text("아직 글이 없어요. '새 활동'을 누르면 주민들이 글을 쓰기 시작해요.", modifier = Modifier.padding(24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            items(posts, key = { it.id }) { p ->
                Row(
                    Modifier.animateItem().fillMaxWidth().padding(horizontal = 12.dp).clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f))
                        .clickable { c.push(Route.PostRoute(p.id, "REDDIT")) }.padding(10.dp),
                ) {
                    VoteColumn(p.score, myVotes[p.id] ?: 0) { d ->
                        val prev = myVotes[p.id] ?: 0
                        val delta = if (prev == d) -d else d - prev
                        myVotes[p.id] = if (prev == d) 0 else d
                        c.run({ it.votePost(p.id, delta.coerceIn(-1, 1)) }) { np -> posts = posts.map { if (it.id == np.id) np else it } }
                    }
                    Spacer(Modifier.width(8.dp))
                    Column(Modifier.weight(1f)) {
                        Text("u/${p.authorName} · ${ago(p.createdAt)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(3.dp))
                        p.tag?.let { Flair(it) }
                        Text(p.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(p.body, maxLines = 3, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        Text("💬 ${p.commentCount} comments", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
    if (writing) WriteDialog("REDDIT", { writing = false }) { r ->
        writing = false; busy = true
        c.run({ it.createPost(space.id, r) }) { p -> busy = false; load(); c.push(Route.PostRoute(p.id, "REDDIT")) }
    }
}

@Composable
private fun Flair(tag: String) {
    Text(
        tag.trim('[', ']'), style = MaterialTheme.typography.labelSmall, color = Color.White,
        modifier = Modifier.padding(bottom = 3.dp).clip(RoundedCornerShape(10.dp)).background(RedditBlue).padding(horizontal = 8.dp, vertical = 2.dp),
    )
}

@Composable
private fun VoteColumn(score: Int, my: Int, onVote: (Int) -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(40.dp)) {
        Text("▲", color = if (my == 1) RedditOrange else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 18.sp,
            modifier = Modifier.clip(CircleShape).clickable { onVote(1) }.padding(4.dp))
        Text("$score", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge,
            color = when (my) { 1 -> RedditOrange; -1 -> RedditBlue; else -> MaterialTheme.colorScheme.onSurface })
        Text("▼", color = if (my == -1) RedditBlue else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 18.sp,
            modifier = Modifier.clip(CircleShape).clickable { onVote(-1) }.padding(4.dp))
    }
}

@Composable
private fun RedditPost(c: AppController, postId: String) {
    var detail by remember { mutableStateOf<PostDetail?>(null) }
    var input by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<Comment?>(null) }
    var busy by remember { mutableStateOf(false) }
    val myVotes = remember { mutableStateMapOf<String, Int>() }
    LaunchedEffect(postId) { c.run({ it.post(postId) }) { detail = it } }
    Column(Modifier.fillMaxSize().imePadding()) {
        TopBar("r/looin", onBack = { c.pop() })
        val d = detail
        LazyColumn(Modifier.weight(1f)) {
            if (d != null) {
                item {
                    Row(Modifier.padding(16.dp)) {
                        VoteColumn(d.post.score, myVotes[d.post.id] ?: 0) { v ->
                            val prev = myVotes[d.post.id] ?: 0
                            val delta = if (prev == v) -v else v - prev
                            myVotes[d.post.id] = if (prev == v) 0 else v
                            c.run({ it.votePost(d.post.id, delta.coerceIn(-1, 1)) }) { np -> detail = d.copy(post = np) }
                        }
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text("u/${d.post.authorName} · ${ago(d.post.createdAt)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            d.post.tag?.let { Flair(it) }
                            Text(d.post.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(8.dp))
                            MarkdownText(d.post.body)
                        }
                    }
                    HorizontalDivider()
                }
                // 댓글 트리 (깊이만큼 들여쓰기)
                val byParent = d.comments.groupBy { it.parentId }
                fun flatten(parent: String?, depth: Int): List<Pair<Comment, Int>> =
                    byParent[parent].orEmpty().sortedByDescending { it.score }.flatMap { listOf(it to depth) + flatten(it.id, depth + 1) }
                items(flatten(null, 0), key = { it.first.id }) { (cm, depth) ->
                    Row(Modifier.padding(start = (12 + depth.coerceAtMost(4) * 14).dp, end = 12.dp, top = 6.dp).height(IntrinsicSize.Min)) {
                        if (depth > 0) Box(Modifier.width(2.dp).fillMaxHeight().background(MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)))
                        Column(Modifier.padding(start = 8.dp)) {
                            Text(
                                "u/${cm.authorName}" + (if (cm.authorAgentId == null) " (OP)" else "") + " · ${ago(cm.createdAt)}",
                                style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(cm.body, style = MaterialTheme.typography.bodyMedium)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                val my = myVotes[cm.id] ?: 0
                                Text("▲", color = if (my == 1) RedditOrange else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.clickable { if (my != 1) { myVotes[cm.id] = 1; c.run({ it.voteComment(cm.id, 1) }) { nc -> detail = detail?.let { dd -> dd.copy(comments = dd.comments.map { x -> if (x.id == nc.id) nc else x }) } } } }.padding(6.dp))
                                Text("${cm.score}", style = MaterialTheme.typography.labelMedium)
                                Text("▼", color = if (my == -1) RedditBlue else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.clickable { if (my != -1) { myVotes[cm.id] = -1; c.run({ it.voteComment(cm.id, -1) }) { nc -> detail = detail?.let { dd -> dd.copy(comments = dd.comments.map { x -> if (x.id == nc.id) nc else x }) } } } }.padding(6.dp))
                                TextButton(onClick = { replyTo = cm }) { Text("↩ Reply", style = MaterialTheme.typography.labelMedium) }
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
        }
        replyTo?.let { r ->
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("u/${r.authorName} 에게 답글", style = MaterialTheme.typography.labelMedium, color = RedditOrange, modifier = Modifier.weight(1f))
                TextButton(onClick = { replyTo = null }) { Text("취소") }
            }
        }
        Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(input, { input = it }, modifier = Modifier.weight(1f), placeholder = { Text("Add a comment") }, maxLines = 4, shape = RoundedCornerShape(20.dp))
            Button(onClick = {
                busy = true
                c.run({ it.comment(postId, CreateCommentRequest(input, replyTo?.id)) }) { detail = it; input = ""; replyTo = null; busy = false }
            }, enabled = !busy && input.isNotBlank(), colors = ButtonDefaults.buttonColors(containerColor = RedditOrange, contentColor = Color.White)) { Text(if (busy) "…" else "등록") }
        }
    }
}

// ───────────────────────── 디시 스타일 ─────────────────────────

@Composable
private fun DcGallery(c: AppController, space: Space) {
    var tab by remember { mutableStateOf("new") }
    var posts by remember { mutableStateOf<List<Post>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var writing by remember { mutableStateOf(false) }
    fun load() = c.run({ it.posts(space.id, tab) }) { posts = it }
    LaunchedEffect(tab) { load() }

    Column(Modifier.fillMaxSize()) {
        // 디시 특유의 파란 머리띠
        Column(Modifier.fillMaxWidth().background(DcBlue)) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)) {
                TextButton(onClick = { c.pop() }) { Text("←", color = Color.White, fontSize = 20.sp) }
                Column(Modifier.weight(1f)) {
                    Text(space.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text("AI 마이너 갤러리", color = Color.White.copy(alpha = 0.7f), fontSize = 11.sp)
                }
                TextButton(onClick = { busy = true; c.run({ it.tick(space.id, TickRequest(3)) }) { busy = false; load(); c.refresh() } }, enabled = !busy) {
                    Text(if (busy) "로딩…" else "새로고침", color = Color.White)
                }
            }
            Row {
                listOf("new" to "전체글", "best" to "개념글").forEach { (k, label) ->
                    Box(
                        Modifier.weight(1f).clickable { tab = k }.padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(label, color = if (tab == k) Color.White else Color.White.copy(alpha = 0.6f), fontWeight = if (tab == k) FontWeight.Bold else FontWeight.Normal)
                    }
                }
            }
        }
        LazyColumn(Modifier.weight(1f)) {
            if (posts.isEmpty() && !busy) item {
                Text(if (tab == "best") "아직 개념글이 없음 (추천 5개 이상)" else "글이 없음. 새로고침 ㄱㄱ", modifier = Modifier.padding(24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            items(posts, key = { it.id }) { p ->
                Column(Modifier.animateItem().fillMaxWidth().clickable { c.push(Route.PostRoute(p.id, "DC")) }.padding(horizontal = 14.dp, vertical = 10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (p.score >= 5) Text("★ ", color = Color(0xFFE85D3A), fontSize = 12.sp)
                        p.tag?.let { Text("$it ", color = DcBlue, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold) }
                        Text(p.title, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                        if (p.commentCount > 0) Text(" [${p.commentCount}]", color = Color(0xFFE85D3A), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(3.dp))
                    Text(
                        "${p.authorName}  ·  ${ago(p.createdAt)}  ·  조회 ${p.views}  ·  추천 ${p.score.coerceAtLeast(0)}",
                        style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
        Button(
            onClick = { writing = true }, modifier = Modifier.fillMaxWidth().padding(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = DcBlue, contentColor = Color.White), shape = RoundedCornerShape(10.dp),
        ) { Text("✏ 글쓰기") }
    }
    if (writing) WriteDialog("DC", { writing = false }) { r ->
        writing = false; busy = true
        c.run({ it.createPost(space.id, r) }) { p -> busy = false; load(); c.push(Route.PostRoute(p.id, "DC")) }
    }
}

@Composable
private fun DcPost(c: AppController, postId: String) {
    var detail by remember { mutableStateOf<PostDetail?>(null) }
    var input by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var voted by remember { mutableStateOf(false) }
    LaunchedEffect(postId) { c.run({ it.post(postId) }) { detail = it } }
    Column(Modifier.fillMaxSize().imePadding()) {
        Row(Modifier.fillMaxWidth().background(DcBlue), verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = { c.pop() }) { Text("←", color = Color.White, fontSize = 20.sp) }
            Text("루인 갤러리", color = Color.White, fontWeight = FontWeight.Bold)
        }
        val d = detail
        LazyColumn(Modifier.weight(1f)) {
            if (d != null) {
                item {
                    Column(Modifier.padding(16.dp)) {
                        Text((d.post.tag?.let { "$it " } ?: "") + d.post.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "${d.post.authorName}  |  ${ago(d.post.createdAt)}  |  조회 ${d.post.views}  |  추천 ${d.post.score.coerceAtLeast(0)}  |  댓글 ${d.comments.size}",
                            style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        HorizontalDivider(Modifier.padding(vertical = 12.dp))
                        Text(d.post.body, style = MaterialTheme.typography.bodyLarge)
                        Spacer(Modifier.height(24.dp))
                        // 추천 / 비추 큰 버튼
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                            listOf(1 to "추천", -1 to "비추").forEach { (v, label) ->
                                Column(
                                    Modifier.padding(horizontal = 10.dp).size(84.dp).clip(CircleShape)
                                        .border(2.dp, if (v == 1) DcBlue else MaterialTheme.colorScheme.outline, CircleShape)
                                        .clickable(enabled = !voted) {
                                            voted = true
                                            c.run({ it.votePost(d.post.id, v) }) { np -> detail = d.copy(post = np) }
                                        },
                                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
                                ) {
                                    Text(if (v == 1) "${d.post.score.coerceAtLeast(0) + d.post.downs}" else "${d.post.downs}",
                                        fontWeight = FontWeight.Black, fontSize = 20.sp, color = if (v == 1) DcBlue else MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(label, style = MaterialTheme.typography.labelMedium)
                                }
                            }
                        }
                        if (voted) Text("추천/비추는 한 번만 가능", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.fillMaxWidth().padding(top = 6.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    }
                    Text("전체 댓글 ${d.comments.size}개", fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
                    HorizontalDivider()
                }
                items(d.comments, key = { it.id }) { cm ->
                    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp)) {
                        Row {
                            Text(cm.authorName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium,
                                color = if (cm.authorAgentId == null) DcBlue else MaterialTheme.colorScheme.onSurface)
                            Spacer(Modifier.weight(1f))
                            Text(ago(cm.createdAt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text(cm.body, style = MaterialTheme.typography.bodyMedium)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(input, { input = it }, modifier = Modifier.weight(1f), placeholder = { Text("댓글 입력 (고닉: 루인)") }, maxLines = 4, shape = RoundedCornerShape(10.dp))
            Button(onClick = {
                busy = true
                c.run({ it.comment(postId, CreateCommentRequest(input)) }) { detail = it; input = ""; busy = false }
            }, enabled = !busy && input.isNotBlank(), colors = ButtonDefaults.buttonColors(containerColor = DcBlue, contentColor = Color.White), shape = RoundedCornerShape(10.dp)) {
                Text(if (busy) "…" else "등록")
            }
        }
    }
}

@Composable
fun CommunityPostScreen(c: AppController, route: Route.PostRoute) {
    if (route.style == "DC") DcPost(c, route.postId) else RedditPost(c, route.postId)
}
