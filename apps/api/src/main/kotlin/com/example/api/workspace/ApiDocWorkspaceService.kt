package com.example.api.workspace

import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID

@Service
class ApiDocWorkspaceService(
    private val jdbc: NamedParameterJdbcTemplate,
) {
    private val methodSet = setOf("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")
    private val authSet = setOf("none", "bearer", "apiKey", "basic")
    private val statusSet = setOf("draft", "review", "approved", "deprecated")

    @Transactional
    fun getWorkspace(): ApiDocWorkspaceResponse {
        ensureDefaultPageIfEmpty()
        val folders = loadFolders()
        val pages = loadPagesWithDetail()
        return ApiDocWorkspaceResponse(pages = pages, folders = folders)
    }

    @Transactional
    fun create(request: CreateApiDocRequest): Map<String, Any> {
        return when (request.type) {
            "folder" -> mapOf("ok" to true, "folder" to createFolder(request.name, request.parentFolderId))
            "page" -> mapOf("ok" to true, "page" to createPage(request.title, request.folderId))
            "endpoint" -> {
                val pageId = parseUuid(request.pageId, "Page id is required.")
                mapOf("ok" to true, "endpoint" to createEndpoint(pageId, request.name ?: "New API"))
            }
            else -> badRequest("Invalid request payload.")
        }
    }

    @Transactional
    fun update(request: UpdateApiDocRequest): Map<String, Any> {
        when (request.type) {
            "folder" -> {
                val id = parseUuid(request.id, "Folder id is required.")
                updateFolder(id, request.name, request.parentFolderId)
            }
            "page" -> {
                val id = parseUuid(request.id, "Page id is required.")
                updatePage(id, request)
            }
            "endpoint" -> {
                val id = parseUuid(request.id, "API id is required.")
                val pageId = parseUuid(request.pageId, "Page id is required.")
                updateEndpoint(pageId, id, request)
            }
            else -> badRequest("Invalid request payload.")
        }
        return mapOf("ok" to true)
    }

    @Transactional
    fun delete(request: DeleteApiDocRequest): Map<String, Any> {
        when (request.type) {
            "folder" -> deleteFolder(parseUuid(request.id, "Folder id is required."))
            "page" -> deletePage(parseUuid(request.id, "Page id is required."))
            "endpoint" -> {
                val pageId = parseUuid(request.pageId, "Page id is required.")
                val id = parseUuid(request.id, "API id is required.")
                deleteEndpoint(pageId, id)
            }
            else -> badRequest("Invalid request payload.")
        }
        return mapOf("ok" to true)
    }

    private fun createFolder(name: String?, parentFolderId: String?): ApiDocFolderDto {
        val now = Timestamp.from(Instant.now())
        val id = UUID.randomUUID()
        val parent = normalizeParentFolder(parentFolderId, null)
        val safeName = name?.trim().takeUnless { it.isNullOrBlank() } ?: "Untitled Folder"

        jdbc.update(
            """
            insert into api_doc_folders(id, name, parent_folder_id, created_at, updated_at)
            values (:id, :name, :parentFolderId, :createdAt, :updatedAt)
            """.trimIndent(),
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("name", safeName)
                .addValue("parentFolderId", parent)
                .addValue("createdAt", now)
                .addValue("updatedAt", now),
        )

        return ApiDocFolderDto(id.toString(), safeName, parent?.toString(), now.toInstant().toString(), now.toInstant().toString())
    }

    private fun createPage(title: String?, folderId: String?): ApiDocPageDto {
        val now = Timestamp.from(Instant.now())
        val pageId = UUID.randomUUID()
        val safeTitle = title?.trim().takeUnless { it.isNullOrBlank() } ?: "Untitled API Page"
        val safeFolderId = parseNullableUuid(folderId)?.takeIf { exists("api_doc_folders", it) }

        jdbc.update(
            """
            insert into api_doc_pages(id, folder_id, title, base_url, status, description, created_at, updated_at, version)
            values (:id, :folderId, :title, :baseUrl, :status, :description, :createdAt, :updatedAt, 0)
            """.trimIndent(),
            mapOf(
                "id" to pageId,
                "folderId" to safeFolderId,
                "title" to safeTitle,
                "baseUrl" to "https://api.example.com",
                "status" to "draft",
                "description" to "",
                "createdAt" to now,
                "updatedAt" to now,
            ),
        )

        createDefaultEndpoint(pageId, "Untitled API")
        return loadPagesWithDetail().first { it.id == pageId.toString() }
    }

    private fun createEndpoint(pageId: UUID, name: String): ApiDocEndpointDto {
        if (!exists("api_doc_pages", pageId)) notFound("Page not found.")
        return createDefaultEndpoint(pageId, name)
    }

    private fun createDefaultEndpoint(pageId: UUID, name: String): ApiDocEndpointDto {
        val now = Timestamp.from(Instant.now())
        val endpointId = UUID.randomUUID()
        val sortOrder = nextSortOrder("api_doc_endpoints", "page_id", pageId)
        val safeName = name.trim().ifBlank { "New API" }

        jdbc.update(
            """
            insert into api_doc_endpoints(id, page_id, name, method, url_path, auth, body_json, notes, sort_order, created_at, updated_at, version)
            values (:id, :pageId, :name, :method, :urlPath, :auth, :bodyJson, :notes, :sortOrder, :createdAt, :updatedAt, 0)
            """.trimIndent(),
            mapOf(
                "id" to endpointId,
                "pageId" to pageId,
                "name" to safeName,
                "method" to "GET",
                "urlPath" to "/resource",
                "auth" to "bearer",
                "bodyJson" to "{\n  \n}",
                "notes" to "",
                "sortOrder" to sortOrder,
                "createdAt" to now,
                "updatedAt" to now,
            ),
        )

        insertHeaderRows(endpointId, listOf(ApiDocKeyValueDto(UUID.randomUUID().toString(), "Content-Type", "application/json", true)))
        insertParamRows(endpointId, listOf(ApiDocKeyValueDto(UUID.randomUUID().toString(), "", "", true)))
        insertResponseRows(
            endpointId,
            listOf(
                ApiDocResponseDto(UUID.randomUUID().toString(), 200, "200", "", "{\n  \n}"),
                ApiDocResponseDto(UUID.randomUUID().toString(), 400, "400", "", "{\n  \n}"),
            ),
        )

        jdbc.update("update api_doc_pages set updated_at = :now, version = version + 1 where id = :id", mapOf("id" to pageId, "now" to now))

        return loadEndpointDetails().first { it.id == endpointId.toString() }
    }

    private fun updateFolder(id: UUID, name: String?, parentFolderId: String?) {
        if (!exists("api_doc_folders", id)) notFound("Folder not found.")
        val nextName = name?.trim().takeUnless { it.isNullOrBlank() }
        val nextParent = if (parentFolderId != null) normalizeParentFolder(parentFolderId, id) else null

        jdbc.update(
            """
            update api_doc_folders
            set name = coalesce(:name, name),
                parent_folder_id = :parentFolderId,
                updated_at = :updatedAt
            where id = :id
            """.trimIndent(),
            mapOf("id" to id, "name" to nextName, "parentFolderId" to nextParent, "updatedAt" to Timestamp.from(Instant.now())),
        )
    }

    private fun updatePage(id: UUID, request: UpdateApiDocRequest) {
        if (!exists("api_doc_pages", id)) notFound("Page not found.")

        val safeFolderId = when {
            request.folderId == null -> null
            request.folderId.isBlank() -> null
            else -> parseNullableUuid(request.folderId)?.takeIf { exists("api_doc_folders", it) }
        }
        val safeStatus = request.status?.takeIf { statusSet.contains(it) }
        val now = Timestamp.from(Instant.now())

        jdbc.update(
            """
            update api_doc_pages
            set title = coalesce(:title, title),
                folder_id = :folderId,
                base_url = coalesce(:baseUrl, base_url),
                status = coalesce(:status, status),
                description = coalesce(:description, description),
                updated_at = :updatedAt,
                version = version + 1
            where id = :id
            """.trimIndent(),
            mapOf(
                "id" to id,
                "title" to request.title?.trim()?.ifBlank { null },
                "folderId" to safeFolderId,
                "baseUrl" to request.baseUrl,
                "status" to safeStatus,
                "description" to request.description,
                "updatedAt" to now,
            ),
        )
    }

    private fun updateEndpoint(pageId: UUID, endpointId: UUID, request: UpdateApiDocRequest) {
        if (!exists("api_doc_pages", pageId)) notFound("Page not found.")
        if (!existsEndpointInPage(pageId, endpointId)) notFound("API not found.")

        val now = Timestamp.from(Instant.now())
        jdbc.update(
            """
            update api_doc_endpoints
            set name = coalesce(:name, name),
                method = coalesce(:method, method),
                url_path = coalesce(:urlPath, url_path),
                auth = coalesce(:auth, auth),
                body_json = coalesce(:bodyJson, body_json),
                notes = coalesce(:notes, notes),
                updated_at = :updatedAt,
                version = version + 1
            where id = :id and page_id = :pageId
            """.trimIndent(),
            mapOf(
                "id" to endpointId,
                "pageId" to pageId,
                "name" to request.name?.trim()?.ifBlank { null },
                "method" to request.method?.uppercase()?.takeIf { methodSet.contains(it) },
                "urlPath" to request.urlPath?.trim()?.ifBlank { null },
                "auth" to request.auth?.takeIf { authSet.contains(it) },
                "bodyJson" to request.bodyJson,
                "notes" to request.notes,
                "updatedAt" to now,
            ),
        )

        request.headers?.let {
            jdbc.update("delete from api_doc_endpoint_headers where endpoint_id = :id", mapOf("id" to endpointId))
            insertHeaderRows(endpointId, it)
        }
        request.params?.let {
            jdbc.update("delete from api_doc_endpoint_params where endpoint_id = :id", mapOf("id" to endpointId))
            insertParamRows(endpointId, it)
        }
        request.responses?.let {
            jdbc.update("delete from api_doc_endpoint_responses where endpoint_id = :id", mapOf("id" to endpointId))
            insertResponseRows(endpointId, it)
        }

        jdbc.update("update api_doc_pages set updated_at = :now, version = version + 1 where id = :id", mapOf("id" to pageId, "now" to now))
    }

    private fun deleteFolder(id: UUID) {
        if (!exists("api_doc_folders", id)) notFound("Folder not found.")

        val now = Timestamp.from(Instant.now())
        jdbc.update("update api_doc_folders set parent_folder_id = null, updated_at = :now where parent_folder_id = :id", mapOf("id" to id, "now" to now))
        jdbc.update("update api_doc_pages set folder_id = null, updated_at = :now, version = version + 1 where folder_id = :id", mapOf("id" to id, "now" to now))
        jdbc.update("delete from api_doc_folders where id = :id", mapOf("id" to id))
    }

    private fun deletePage(id: UUID) {
        jdbc.update("delete from api_doc_pages where id = :id", mapOf("id" to id))
        ensureDefaultPageIfEmpty()
    }

    private fun deleteEndpoint(pageId: UUID, endpointId: UUID) {
        if (!existsEndpointInPage(pageId, endpointId)) notFound("API not found.")
        jdbc.update("delete from api_doc_endpoints where id = :id", mapOf("id" to endpointId))
        val count = jdbc.queryForObject("select count(*) from api_doc_endpoints where page_id = :pageId", mapOf("pageId" to pageId), Long::class.java) ?: 0L
        if (count == 0L) {
            createDefaultEndpoint(pageId, "Untitled API")
        }
    }

    private fun ensureDefaultPageIfEmpty() {
        val count = jdbc.queryForObject("select count(*) from api_doc_pages", emptyMap<String, Any>(), Long::class.java) ?: 0L
        if (count > 0L) return
        createPage("Untitled API Page", null)
    }

    private fun loadFolders(): List<ApiDocFolderDto> {
        return jdbc.query(
            """
            select id, name, parent_folder_id, created_at, updated_at
            from api_doc_folders
            order by created_at asc
            """.trimIndent(),
            emptyMap<String, Any>(),
        ) { rs, _ ->
            ApiDocFolderDto(
                id = rs.getObject("id", UUID::class.java).toString(),
                name = rs.getString("name"),
                parentFolderId = rs.getObject("parent_folder_id", UUID::class.java)?.toString(),
                createdAt = rs.getTimestamp("created_at").toInstant().toString(),
                updatedAt = rs.getTimestamp("updated_at").toInstant().toString(),
            )
        }
    }

    private fun loadPagesWithDetail(): List<ApiDocPageDto> {
        val pages = jdbc.query(
            """
            select id, title, folder_id, base_url, status, description, created_at, updated_at
            from api_doc_pages
            order by updated_at desc
            """.trimIndent(),
            emptyMap<String, Any>(),
        ) { rs, _ ->
            ApiDocPageDto(
                id = rs.getObject("id", UUID::class.java).toString(),
                title = rs.getString("title"),
                folderId = rs.getObject("folder_id", UUID::class.java)?.toString(),
                baseUrl = rs.getString("base_url"),
                status = rs.getString("status"),
                description = rs.getString("description") ?: "",
                endpoints = emptyList(),
                createdAt = rs.getTimestamp("created_at").toInstant().toString(),
                updatedAt = rs.getTimestamp("updated_at").toInstant().toString(),
            )
        }

        if (pages.isEmpty()) return pages

        val endpointByPage = loadEndpointDetails().groupBy { it.id }.toMutableMap()
        val endpointListByPageId = jdbc.query(
            "select id, page_id from api_doc_endpoints order by sort_order asc, updated_at desc",
            emptyMap<String, Any>(),
        ) { rs, _ ->
            rs.getObject("page_id", UUID::class.java).toString() to rs.getObject("id", UUID::class.java).toString()
        }.groupBy({ it.first }, { it.second })

        return pages.map { page ->
            val endpoints = endpointListByPageId[page.id].orEmpty().mapNotNull { endpointId -> endpointByPage[endpointId]?.firstOrNull() }
            page.copy(endpoints = endpoints)
        }
    }

    private fun loadEndpointDetails(): List<ApiDocEndpointDto> {
        val endpoints = jdbc.query(
            """
            select id, page_id, name, method, url_path, auth, body_json, notes
            from api_doc_endpoints
            order by sort_order asc, updated_at desc
            """.trimIndent(),
            emptyMap<String, Any>(),
        ) { rs, _ ->
            Triple(
                rs.getObject("id", UUID::class.java).toString(),
                rs.getObject("page_id", UUID::class.java).toString(),
                ApiDocEndpointDto(
                    id = rs.getObject("id", UUID::class.java).toString(),
                    name = rs.getString("name"),
                    method = rs.getString("method"),
                    urlPath = rs.getString("url_path"),
                    auth = rs.getString("auth"),
                    headers = emptyList(),
                    params = emptyList(),
                    bodyJson = rs.getString("body_json") ?: "{\n  \n}",
                    responses = emptyList(),
                    notes = rs.getString("notes") ?: "",
                ),
            )
        }

        val headersByEndpoint = jdbc.query(
            """
            select id, endpoint_id, header_key, header_value, enabled
            from api_doc_endpoint_headers
            order by sort_order asc
            """.trimIndent(),
            emptyMap<String, Any>(),
        ) { rs, _ ->
            rs.getObject("endpoint_id", UUID::class.java).toString() to ApiDocKeyValueDto(
                id = rs.getObject("id", UUID::class.java).toString(),
                key = rs.getString("header_key") ?: "",
                value = rs.getString("header_value") ?: "",
                enabled = rs.getBoolean("enabled"),
            )
        }.groupBy({ it.first }, { it.second })

        val paramsByEndpoint = jdbc.query(
            """
            select id, endpoint_id, param_key, param_value, enabled
            from api_doc_endpoint_params
            order by sort_order asc
            """.trimIndent(),
            emptyMap<String, Any>(),
        ) { rs, _ ->
            rs.getObject("endpoint_id", UUID::class.java).toString() to ApiDocKeyValueDto(
                id = rs.getObject("id", UUID::class.java).toString(),
                key = rs.getString("param_key") ?: "",
                value = rs.getString("param_value") ?: "",
                enabled = rs.getBoolean("enabled"),
            )
        }.groupBy({ it.first }, { it.second })

        val responsesByEndpoint = jdbc.query(
            """
            select id, endpoint_id, status_code, title, description, body_json
            from api_doc_endpoint_responses
            order by sort_order asc
            """.trimIndent(),
            emptyMap<String, Any>(),
        ) { rs, _ ->
            rs.getObject("endpoint_id", UUID::class.java).toString() to ApiDocResponseDto(
                id = rs.getObject("id", UUID::class.java).toString(),
                statusCode = rs.getInt("status_code"),
                title = rs.getString("title") ?: "",
                description = rs.getString("description") ?: "",
                bodyJson = rs.getString("body_json") ?: "{\n  \n}",
            )
        }.groupBy({ it.first }, { it.second })

        return endpoints.map { (_, _, endpoint) ->
            endpoint.copy(
                headers = headersByEndpoint[endpoint.id] ?: emptyList(),
                params = paramsByEndpoint[endpoint.id] ?: emptyList(),
                responses = responsesByEndpoint[endpoint.id] ?: emptyList(),
            )
        }
    }

    private fun insertHeaderRows(endpointId: UUID, rows: List<ApiDocKeyValueDto>) {
        if (rows.isEmpty()) return
        val now = Timestamp.from(Instant.now())
        rows.forEachIndexed { index, row ->
            jdbc.update(
                """
                insert into api_doc_endpoint_headers(id, endpoint_id, sort_order, header_key, header_value, enabled, created_at, updated_at)
                values (:id, :endpointId, :sortOrder, :headerKey, :headerValue, :enabled, :createdAt, :updatedAt)
                """.trimIndent(),
                mapOf(
                    "id" to (parseNullableUuid(row.id) ?: UUID.randomUUID()),
                    "endpointId" to endpointId,
                    "sortOrder" to index,
                    "headerKey" to row.key,
                    "headerValue" to row.value,
                    "enabled" to row.enabled,
                    "createdAt" to now,
                    "updatedAt" to now,
                ),
            )
        }
    }

    private fun insertParamRows(endpointId: UUID, rows: List<ApiDocKeyValueDto>) {
        if (rows.isEmpty()) return
        val now = Timestamp.from(Instant.now())
        rows.forEachIndexed { index, row ->
            jdbc.update(
                """
                insert into api_doc_endpoint_params(id, endpoint_id, sort_order, param_key, param_value, enabled, created_at, updated_at)
                values (:id, :endpointId, :sortOrder, :paramKey, :paramValue, :enabled, :createdAt, :updatedAt)
                """.trimIndent(),
                mapOf(
                    "id" to (parseNullableUuid(row.id) ?: UUID.randomUUID()),
                    "endpointId" to endpointId,
                    "sortOrder" to index,
                    "paramKey" to row.key,
                    "paramValue" to row.value,
                    "enabled" to row.enabled,
                    "createdAt" to now,
                    "updatedAt" to now,
                ),
            )
        }
    }

    private fun insertResponseRows(endpointId: UUID, rows: List<ApiDocResponseDto>) {
        if (rows.isEmpty()) return
        val now = Timestamp.from(Instant.now())
        rows.forEachIndexed { index, row ->
            jdbc.update(
                """
                insert into api_doc_endpoint_responses(id, endpoint_id, sort_order, status_code, title, description, body_json, created_at, updated_at)
                values (:id, :endpointId, :sortOrder, :statusCode, :title, :description, :bodyJson, :createdAt, :updatedAt)
                """.trimIndent(),
                mapOf(
                    "id" to (parseNullableUuid(row.id) ?: UUID.randomUUID()),
                    "endpointId" to endpointId,
                    "sortOrder" to index,
                    "statusCode" to row.statusCode.coerceIn(100, 599),
                    "title" to row.title,
                    "description" to row.description,
                    "bodyJson" to row.bodyJson,
                    "createdAt" to now,
                    "updatedAt" to now,
                ),
            )
        }
    }

    private fun normalizeParentFolder(parentFolderId: String?, selfId: UUID?): UUID? {
        val parsed = parseNullableUuid(parentFolderId) ?: return null
        if (!exists("api_doc_folders", parsed)) return null
        if (selfId != null && parsed == selfId) return null
        if (selfId != null && hasFolderCycle(selfId, parsed)) return null
        return parsed
    }

    private fun hasFolderCycle(selfId: UUID, candidateParentId: UUID): Boolean {
        val parentMap = jdbc.query(
            "select id, parent_folder_id from api_doc_folders",
            emptyMap<String, Any>(),
        ) { rs, _ ->
            rs.getObject("id", UUID::class.java) to rs.getObject("parent_folder_id", UUID::class.java)
        }.toMap()

        var cursor: UUID? = candidateParentId
        while (cursor != null) {
            if (cursor == selfId) return true
            cursor = parentMap[cursor]
        }
        return false
    }

    private fun nextSortOrder(table: String, keyColumn: String, keyValue: UUID): Int {
        val sql = "select coalesce(max(sort_order), -1) + 1 from $table where $keyColumn = :id"
        val next = jdbc.queryForObject(sql, mapOf("id" to keyValue), Int::class.java)
        return next ?: 0
    }

    private fun exists(table: String, id: UUID): Boolean {
        val count = jdbc.queryForObject("select count(*) from $table where id = :id", mapOf("id" to id), Long::class.java)
        return (count ?: 0L) > 0L
    }

    private fun existsEndpointInPage(pageId: UUID, endpointId: UUID): Boolean {
        val count = jdbc.queryForObject(
            "select count(*) from api_doc_endpoints where id = :id and page_id = :pageId",
            mapOf("id" to endpointId, "pageId" to pageId),
            Long::class.java,
        )
        return (count ?: 0L) > 0L
    }

    private fun parseUuid(raw: String?, message: String): UUID {
        return try {
            UUID.fromString(raw ?: throw IllegalArgumentException())
        } catch (_: Exception) {
            badRequest(message)
        }
    }

    private fun parseNullableUuid(raw: String?): UUID? {
        if (raw.isNullOrBlank()) return null
        return try {
            UUID.fromString(raw ?: throw IllegalArgumentException())
        } catch (_: Exception) {
            null
        }
    }

    private fun notFound(message: String): Nothing =
        throw ResponseStatusException(HttpStatus.NOT_FOUND, message)

    private fun badRequest(message: String): Nothing =
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, message)
}
