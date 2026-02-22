package com.example.api.workspace

import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/api-doc-workspace")
class ApiDocWorkspaceController(
    private val service: ApiDocWorkspaceService,
) {
    @GetMapping
    fun getWorkspace(): ApiDocWorkspaceResponse = service.getWorkspace()

    @PostMapping
    fun create(@RequestBody request: CreateApiDocRequest): Map<String, Any> = service.create(request)

    @PatchMapping
    fun update(@RequestBody request: UpdateApiDocRequest): Map<String, Any> = service.update(request)

    @DeleteMapping
    fun delete(@RequestBody request: DeleteApiDocRequest): Map<String, Any> = service.delete(request)
}
