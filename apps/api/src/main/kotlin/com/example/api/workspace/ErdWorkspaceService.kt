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
class ErdWorkspaceService(
    private val jdbc: NamedParameterJdbcTemplate,
) {
    @Transactional
    fun getWorkspace(): ErdWorkspaceResponse {
        ensureDefaultProjectIfEmpty()
        val folders = loadFolders()
        val projects = loadProjects()
        return ErdWorkspaceResponse(projects = projects, folders = folders)
    }

    @Transactional
    fun create(request: CreateErdRequest): Map<String, Any> {
        return when (request.type) {
            "folder" -> {
                val folder = createFolder(request.name, request.parentFolderId)
                mapOf("ok" to true, "folder" to folder)
            }
            "project" -> {
                val project = createProject(request.title, request.folderId)
                mapOf("ok" to true, "project" to project)
            }
            else -> badRequest("Invalid request payload.")
        }
    }

    @Transactional
    fun update(request: UpdateErdRequest): Map<String, Any> {
        when (request.type) {
            "folder" -> {
                val id = parseUuid(request.id, "Folder id is required.")
                updateFolder(id, request.name, request.parentFolderId)
            }
            "project" -> {
                val id = parseUuid(request.id, "Project id is required.")
                updateProject(id, request.title, request.folderId)
            }
            "project-content" -> {
                val id = parseUuid(request.id, "Project id is required.")
                updateProjectContent(id, request.value ?: "")
            }
            else -> badRequest("Invalid request payload.")
        }
        return mapOf("ok" to true)
    }

    @Transactional
    fun delete(request: DeleteErdRequest): Map<String, Any> {
        when (request.type) {
            "folder" -> {
                val id = parseUuid(request.id, "Folder id is required.")
                deleteFolder(id)
            }
            "project" -> {
                val id = parseUuid(request.id, "Project id is required.")
                deleteProject(id)
            }
            else -> badRequest("Invalid request payload.")
        }
        return mapOf("ok" to true)
    }

    private fun createFolder(name: String?, parentFolderId: String?): ErdFolderDto {
        val now = Timestamp.from(Instant.now())
        val id = UUID.randomUUID()
        val parent = normalizeParentFolder(parentFolderId, null)
        val safeName = name?.trim().takeUnless { it.isNullOrBlank() } ?: "Untitled Folder"

        jdbc.update(
            """
            insert into erd_folders(id, name, parent_folder_id, created_at, updated_at)
            values (:id, :name, :parentFolderId, :createdAt, :updatedAt)
            """.trimIndent(),
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("name", safeName)
                .addValue("parentFolderId", parent)
                .addValue("createdAt", now)
                .addValue("updatedAt", now),
        )

        return ErdFolderDto(
            id = id.toString(),
            name = safeName,
            parentFolderId = parent?.toString(),
            createdAt = now.toInstant().toString(),
            updatedAt = now.toInstant().toString(),
        )
    }

    private fun createProject(title: String?, folderId: String?): ErdProjectDto {
        val now = Timestamp.from(Instant.now())
        val id = UUID.randomUUID()
        val safeTitle = title?.trim().takeUnless { it.isNullOrBlank() } ?: "Untitled ERD"
        val safeFolderId = parseNullableUuid(folderId)
            ?.takeIf { exists("select 1 from erd_folders where id = :id", it) }

        jdbc.update(
            """
            insert into erd_projects(id, folder_id, title, erd_content, created_at, updated_at, version)
            values (:id, :folderId, :title, :content, :createdAt, :updatedAt, 0)
            """.trimIndent(),
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("folderId", safeFolderId)
                .addValue("title", safeTitle)
                .addValue("content", "")
                .addValue("createdAt", now)
                .addValue("updatedAt", now),
        )

        return ErdProjectDto(
            id = id.toString(),
            title = safeTitle,
            folderId = safeFolderId?.toString(),
            value = "",
            createdAt = now.toInstant().toString(),
            updatedAt = now.toInstant().toString(),
        )
    }

    private fun updateFolder(id: UUID, name: String?, parentFolderId: String?) {
        val current = jdbc.query(
            "select id, name from erd_folders where id = :id",
            mapOf("id" to id),
        ) { rs, _ -> rs.getString("name") }.firstOrNull() ?: notFound("Folder not found.")

        val nextName = name?.trim().takeUnless { it.isNullOrBlank() } ?: current
        val nextParent = if (parentFolderId != null) normalizeParentFolder(parentFolderId, id) else null

        jdbc.update(
            """
            update erd_folders
            set name = :name,
                parent_folder_id = :parentFolderId,
                updated_at = :updatedAt
            where id = :id
            """.trimIndent(),
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("name", nextName)
                .addValue("parentFolderId", nextParent)
                .addValue("updatedAt", Timestamp.from(Instant.now())),
        )
    }

    private fun updateProject(id: UUID, title: String?, folderId: String?) {
        if (!exists("select 1 from erd_projects where id = :id", id)) notFound("Project not found.")
        val safeTitle = title?.trim().takeUnless { it.isNullOrBlank() }
        val safeFolderId = if (folderId == null) null else parseNullableUuid(folderId)
            ?.takeIf { exists("select 1 from erd_folders where id = :id", it) }

        jdbc.update(
            """
            update erd_projects
            set title = coalesce(:title, title),
                folder_id = :folderId,
                updated_at = :updatedAt,
                version = version + 1
            where id = :id
            """.trimIndent(),
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("title", safeTitle)
                .addValue("folderId", safeFolderId)
                .addValue("updatedAt", Timestamp.from(Instant.now())),
        )
    }

    private fun updateProjectContent(id: UUID, value: String) {
        val updated = jdbc.update(
            """
            update erd_projects
            set erd_content = :value,
                updated_at = :updatedAt,
                version = version + 1
            where id = :id
            """.trimIndent(),
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("value", value)
                .addValue("updatedAt", Timestamp.from(Instant.now())),
        )
        if (updated == 0) notFound("Project not found.")
    }

    private fun deleteFolder(id: UUID) {
        if (!exists("select 1 from erd_folders where id = :id", id)) notFound("Folder not found.")

        jdbc.update(
            "update erd_folders set parent_folder_id = null, updated_at = :now where parent_folder_id = :id",
            mapOf("id" to id, "now" to Timestamp.from(Instant.now())),
        )
        jdbc.update(
            "update erd_projects set folder_id = null, updated_at = :now, version = version + 1 where folder_id = :id",
            mapOf("id" to id, "now" to Timestamp.from(Instant.now())),
        )
        jdbc.update("delete from erd_folders where id = :id", mapOf("id" to id))
    }

    private fun deleteProject(id: UUID) {
        jdbc.update("delete from erd_projects where id = :id", mapOf("id" to id))
        ensureDefaultProjectIfEmpty()
    }

    private fun ensureDefaultProjectIfEmpty() {
        val count = jdbc.queryForObject("select count(*) from erd_projects", emptyMap<String, Any>(), Long::class.java) ?: 0L
        if (count > 0L) return
        createProject("Untitled ERD", null)
    }

    private fun loadFolders(): List<ErdFolderDto> {
        return jdbc.query(
            """
            select id, name, parent_folder_id, created_at, updated_at
            from erd_folders
            order by created_at asc
            """.trimIndent(),
            emptyMap<String, Any>(),
        ) { rs, _ ->
            ErdFolderDto(
                id = rs.getObject("id", UUID::class.java).toString(),
                name = rs.getString("name"),
                parentFolderId = rs.getObject("parent_folder_id", UUID::class.java)?.toString(),
                createdAt = rs.getTimestamp("created_at").toInstant().toString(),
                updatedAt = rs.getTimestamp("updated_at").toInstant().toString(),
            )
        }
    }

    private fun loadProjects(): List<ErdProjectDto> {
        return jdbc.query(
            """
            select id, title, folder_id, erd_content, created_at, updated_at
            from erd_projects
            order by updated_at desc
            """.trimIndent(),
            emptyMap<String, Any>(),
        ) { rs, _ ->
            ErdProjectDto(
                id = rs.getObject("id", UUID::class.java).toString(),
                title = rs.getString("title"),
                folderId = rs.getObject("folder_id", UUID::class.java)?.toString(),
                value = rs.getString("erd_content") ?: "",
                createdAt = rs.getTimestamp("created_at").toInstant().toString(),
                updatedAt = rs.getTimestamp("updated_at").toInstant().toString(),
            )
        }
    }

    private fun normalizeParentFolder(parentFolderId: String?, selfId: UUID?): UUID? {
        val parsed = parseNullableUuid(parentFolderId) ?: return null
        if (!exists("select 1 from erd_folders where id = :id", parsed)) return null
        if (selfId != null && parsed == selfId) return null
        if (selfId != null && hasFolderCycle(selfId, parsed)) return null
        return parsed
    }

    private fun hasFolderCycle(selfId: UUID, candidateParentId: UUID): Boolean {
        val parentMap = jdbc.query(
            "select id, parent_folder_id from erd_folders",
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

    private fun exists(sql: String, id: UUID): Boolean {
        val count = jdbc.queryForObject("select count(*) from (${sql}) t", mapOf("id" to id), Long::class.java)
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
