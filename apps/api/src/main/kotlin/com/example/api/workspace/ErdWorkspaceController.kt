package com.example.api.workspace

import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/erd-document")
class ErdWorkspaceController(
    private val service: ErdWorkspaceService,
) {
    @GetMapping
    fun getWorkspace(): ErdWorkspaceResponse = service.getWorkspace()

    @PostMapping
    fun create(@RequestBody request: CreateErdRequest): Map<String, Any> = service.create(request)

    @PatchMapping
    fun update(@RequestBody request: UpdateErdRequest): Map<String, Any> = service.update(request)

    @DeleteMapping
    fun delete(@RequestBody request: DeleteErdRequest): Map<String, Any> = service.delete(request)
}
