package com.hsbc.mortgage.controller;

import com.hsbc.mortgage.dto.UploadDocumentRequest;
import com.hsbc.mortgage.entity.Document;
import com.hsbc.mortgage.service.DocumentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/api/v1/applications/{applicationId}/documents")
    public ResponseEntity<Map<String, List<Document>>> listDocuments(@PathVariable UUID applicationId) {
        return ResponseEntity.ok(Map.of("data", documentService.listByApplication(applicationId)));
    }

    @PostMapping("/api/v1/applications/{applicationId}/documents")
    public ResponseEntity<Object> uploadDocument(@PathVariable UUID applicationId,
                                                  @Valid @RequestBody UploadDocumentRequest request) {
        if (request.getDocumentType() == null || request.getFileName() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Missing required fields: document_type, file_name"));
        }
        Document doc = documentService.upload(applicationId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(doc);
    }

    @PatchMapping("/api/v1/documents/{id}/verify")
    public ResponseEntity<Object> verifyDocument(@PathVariable UUID id,
                                                  @RequestBody Map<String, String> body) {
        String verifiedBy = body.get("verified_by");
        if (verifiedBy == null || verifiedBy.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Missing required field: verified_by"));
        }
        return documentService.verify(id, verifiedBy)
                .<ResponseEntity<Object>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found")));
    }
}
