package world.looin.server

import io.ktor.http.ContentType
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.UserIdPrincipal
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.request.receiveChannel
import io.ktor.utils.io.toByteArray
import io.ktor.server.response.respond
import io.ktor.server.response.respondBytesWriter
import io.ktor.server.response.respondText
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.utils.io.writeStringUtf8
import world.looin.server.service.FileService
import world.looin.server.service.NotFound
import world.looin.shared.AddMemoryRequest
import world.looin.shared.BrainSettingsUpdate
import world.looin.shared.BrainSettingsView
import world.looin.shared.ChatStreamEvent
import world.looin.shared.CreateAgentRequest
import world.looin.shared.CreateCommentRequest
import world.looin.shared.CreatePostRequest
import world.looin.shared.LooinJson
import world.looin.shared.MeetingRequest
import world.looin.shared.OwnerProfile
import world.looin.shared.PostDetail
import world.looin.shared.SendMessageRequest
import world.looin.shared.SpaceType
import world.looin.shared.TickRequest
import world.looin.shared.World
import world.looin.shared.WorldOverview

fun Route.apiRoutes(app: App) {
    val repo = app.repo

    suspend fun ApplicationCall.world(): World {
        val userId = principal<UserIdPrincipal>()!!.name
        return repo.worldForUser(userId) ?: throw NotFound("world not found")
    }

    authenticate("owner") {
        route("/api") {
            get("/world") {
                val w = call.world()
                call.respond(
                    WorldOverview(w, repo.profile(w.id), repo.agents(w.id), repo.spaces(w.id), repo.stats(w.id), app.brain.info),
                )
            }

            // ---- 프로필 & 기억 ----
            get("/profile") { call.respond(repo.profile(call.world().id)) }
            put("/profile") {
                val w = call.world()
                val p = call.receive<OwnerProfile>()
                repo.saveProfile(w.id, p)
                call.respond(p)
            }
            get("/memories") { call.respond(repo.memories(call.world().id)) }
            post("/memories") {
                val w = call.world()
                val r = call.receive<AddMemoryRequest>()
                require(r.content.isNotBlank()) { "content 가 비어 있습니다" }
                call.respond(repo.addMemory(w.id, r.category.ifBlank { "기타" }, r.content.trim(), "manual", r.importance))
            }
            delete("/memories/{id}") {
                call.respond(mapOf("deleted" to repo.deleteMemory(call.world().id, call.parameters["id"]!!)))
            }

            // ---- 에이전트 ----
            get("/agents") { call.respond(repo.agents(call.world().id)) }
            post("/agents") {
                val w = call.world()
                val r = call.receive<CreateAgentRequest>()
                require(r.name.isNotBlank()) { "이름이 비어 있습니다" }
                val a = repo.createAgent(w.id, r.kind, r.name.trim(), r.role.trim(), r.persona.trim(), r.avatar.ifBlank { "🙂" })
                r.spaceIds.forEach { sid -> repo.space(w.id, sid)?.let { repo.addMember(it.id, a.id) } }
                call.respond(a)
            }
            delete("/agents/{id}") {
                call.respond(mapOf("deleted" to repo.deleteAgent(call.world().id, call.parameters["id"]!!)))
            }

            // ---- 채팅 ----
            get("/agents/{id}/conversations") {
                call.respond(repo.conversations(call.world().id, call.parameters["id"]!!))
            }
            get("/conversations/{id}/messages") {
                val w = call.world()
                val c = repo.conversation(w.id, call.parameters["id"]!!) ?: throw NotFound("conversation not found")
                call.respond(repo.messages(c.id))
            }
            post("/chat/stream") {
                val w = call.world()
                val req = call.receive<SendMessageRequest>()
                require(req.text.isNotBlank()) { "메시지가 비어 있습니다" }
                call.respondBytesWriter(contentType = ContentType.Text.EventStream) {
                    try {
                        app.chat.stream(w, req).collect { ev ->
                            writeStringUtf8("data: " + LooinJson.encodeToString(ChatStreamEvent.serializer(), ev) + "\n\n")
                            flush()
                        }
                    } catch (e: NotFound) {
                        val ev = ChatStreamEvent(ChatStreamEvent.Type.ERROR, text = e.message)
                        writeStringUtf8("data: " + LooinJson.encodeToString(ChatStreamEvent.serializer(), ev) + "\n\n")
                        flush()
                    }
                }
            }

            // ---- 첨부 파일 ----
            post("/files") {
                val w = call.world()
                val name = call.request.queryParameters["name"] ?: "file"
                val mime = call.request.queryParameters["mime"] ?: ""
                val len = call.request.headers["Content-Length"]?.toLongOrNull()
                require(len == null || len <= FileService.MAX_BYTES) { "파일이 너무 커요 (최대 25MB)" }
                val bytes = call.receiveChannel().toByteArray()
                call.respond(app.files.save(w, name, mime, bytes))
            }

            // ---- 두뇌 설정 (앱에서 API 키 입력) ----
            get("/settings/brain") {
                call.world()
                call.respond(BrainSettingsView(app.brainSettings.view(app.envForView()), app.brain.info))
            }
            put("/settings/brain") {
                call.world()
                app.updateBrainSettings(call.receive<BrainSettingsUpdate>().values)
                call.respond(BrainSettingsView(app.brainSettings.view(app.envForView()), app.brain.info))
            }

            // ---- 성장 ----
            get("/growth") { call.respond(app.growth.status(call.world())) }
            get("/growth/insights") { call.respond(repo.insights(call.world().id)) }
            post("/growth/reflect") { call.respond(app.growth.reflect(call.world())) }
            get("/growth/training.jsonl") {
                call.respondText(app.growth.exportTrainingJsonl(call.world()), ContentType.parse("application/jsonl"))
            }

            // ---- 공간 ----
            get("/spaces") { call.respond(repo.spaces(call.world().id)) }
            get("/spaces/{id}/posts") {
                val w = call.world()
                val s = repo.space(w.id, call.parameters["id"]!!) ?: throw NotFound("space not found")
                call.respond(repo.posts(s.id))
            }
            post("/spaces/{id}/posts") {
                val w = call.world()
                val s = repo.space(w.id, call.parameters["id"]!!) ?: throw NotFound("space not found")
                val r = call.receive<CreatePostRequest>()
                require(r.title.isNotBlank() && r.body.isNotBlank()) { "제목과 본문이 필요합니다" }
                val ownerName = repo.profile(w.id).let { it.nickname.ifBlank { it.name }.ifBlank { "나" } }
                val p = repo.createPost(s.id, null, ownerName, r.title.trim(), r.body.trim())
                if (s.type == SpaceType.COMMUNITY) app.sim.reactToOwnerPost(w, s, p)
                call.respond(repo.post(w.id, p.id)!!)
            }
            get("/posts/{id}") {
                val w = call.world()
                val p = repo.post(w.id, call.parameters["id"]!!) ?: throw NotFound("post not found")
                call.respond(PostDetail(p, repo.comments(p.id)))
            }
            post("/posts/{id}/comments") {
                val w = call.world()
                val p = repo.post(w.id, call.parameters["id"]!!) ?: throw NotFound("post not found")
                val r = call.receive<CreateCommentRequest>()
                require(r.body.isNotBlank()) { "댓글이 비어 있습니다" }
                val ownerName = repo.profile(w.id).let { it.nickname.ifBlank { it.name }.ifBlank { "나" } }
                repo.createComment(p.id, null, ownerName, r.body.trim())
                // 내 댓글에 글쓴이(AI)가 답한다.
                val s = repo.space(w.id, p.spaceId)
                if (s != null && p.authorAgentId != null) app.sim.replyAsAuthor(w, s, p)
                call.respond(PostDetail(repo.post(w.id, p.id)!!, repo.comments(p.id)))
            }
            post("/spaces/{id}/tick") {
                val w = call.world()
                val s = repo.space(w.id, call.parameters["id"]!!) ?: throw NotFound("space not found")
                val r = call.receive<TickRequest>()
                call.respond(app.sim.tick(w, s, r.actions))
            }
            get("/spaces/{id}/meetings") {
                val w = call.world()
                val s = repo.space(w.id, call.parameters["id"]!!) ?: throw NotFound("space not found")
                call.respond(repo.meetings(s.id))
            }
            post("/spaces/{id}/meetings") {
                val w = call.world()
                val s = repo.space(w.id, call.parameters["id"]!!) ?: throw NotFound("space not found")
                val r = call.receive<MeetingRequest>()
                require(r.topic.isNotBlank()) { "안건이 비어 있습니다" }
                call.respond(app.sim.meeting(w, s, r.topic.trim(), r.rounds))
            }
        }
    }
}
