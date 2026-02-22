package com.example.api.workspace

data class ErdFolderDto(
    val id: String,
    val name: String,
    val parentFolderId: String?,
    val createdAt: String,
    val updatedAt: String,
)

data class ErdProjectDto(
    val id: String,
    val title: String,
    val folderId: String?,
    val value: String,
    val createdAt: String,
    val updatedAt: String,
)

data class ErdWorkspaceResponse(
    val version: Int = 1,
    val projects: List<ErdProjectDto>,
    val folders: List<ErdFolderDto>,
)

data class CreateErdRequest(
    val type: String,
    val title: String? = null,
    val folderId: String? = null,
    val name: String? = null,
    val parentFolderId: String? = null,
)

data class UpdateErdRequest(
    val type: String,
    val id: String? = null,
    val title: String? = null,
    val folderId: String? = null,
    val name: String? = null,
    val parentFolderId: String? = null,
    val value: String? = null,
)

data class DeleteErdRequest(
    val type: String,
    val id: String? = null,
)

data class ApiDocFolderDto(
    val id: String,
    val name: String,
    val parentFolderId: String?,
    val createdAt: String,
    val updatedAt: String,
)

data class ApiDocKeyValueDto(
    val id: String,
    val key: String,
    val value: String,
    val enabled: Boolean,
)

data class ApiDocResponseDto(
    val id: String,
    val statusCode: Int,
    val title: String,
    val description: String,
    val bodyJson: String,
)

data class ApiDocEndpointDto(
    val id: String,
    val name: String,
    val method: String,
    val urlPath: String,
    val auth: String,
    val headers: List<ApiDocKeyValueDto>,
    val params: List<ApiDocKeyValueDto>,
    val bodyJson: String,
    val responses: List<ApiDocResponseDto>,
    val notes: String,
)

data class ApiDocPageDto(
    val id: String,
    val title: String,
    val folderId: String?,
    val baseUrl: String,
    val status: String,
    val description: String,
    val endpoints: List<ApiDocEndpointDto>,
    val createdAt: String,
    val updatedAt: String,
)

data class ApiDocWorkspaceResponse(
    val version: Int = 2,
    val pages: List<ApiDocPageDto>,
    val folders: List<ApiDocFolderDto>,
)

data class CreateApiDocRequest(
    val type: String,
    val name: String? = null,
    val parentFolderId: String? = null,
    val title: String? = null,
    val folderId: String? = null,
    val pageId: String? = null,
)

data class UpdateApiDocRequest(
    val type: String,
    val id: String? = null,
    val pageId: String? = null,
    val name: String? = null,
    val parentFolderId: String? = null,
    val title: String? = null,
    val folderId: String? = null,
    val baseUrl: String? = null,
    val status: String? = null,
    val description: String? = null,
    val method: String? = null,
    val urlPath: String? = null,
    val auth: String? = null,
    val headers: List<ApiDocKeyValueDto>? = null,
    val params: List<ApiDocKeyValueDto>? = null,
    val bodyJson: String? = null,
    val responses: List<ApiDocResponseDto>? = null,
    val notes: String? = null,
)

data class DeleteApiDocRequest(
    val type: String,
    val id: String? = null,
    val pageId: String? = null,
)
