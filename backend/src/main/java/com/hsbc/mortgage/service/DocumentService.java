package com.hsbc.mortgage.service;

import com.hsbc.mortgage.dto.UploadDocumentRequest;
import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.entity.Document;
import com.hsbc.mortgage.repository.AuditEventRepository;
import com.hsbc.mortgage.repository.DocumentRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final AuditEventRepository auditEventRepository;

    public DocumentService(DocumentRepository documentRepository,
                           AuditEventRepository auditEventRepository) {
        this.documentRepository = documentRepository;
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional
    public Document upload(UUID applicationId, UploadDocumentRequest request) {
        UUID id = UUID.randomUUID();
        String storagePath = "uploads/" + applicationId + "/" + id + "/" + request.getFileName();

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Document doc = new Document();
        doc.setId(id);
        doc.setApplicationId(applicationId);
        doc.setDocumentType(request.getDocumentType());
        doc.setFileName(request.getFileName());
        doc.setFileSize(request.getFileSize());
        doc.setMimeType(request.getMimeType());
        doc.setStoragePath(storagePath);
        doc.setUploadedBy(request.getUploadedBy());
        doc.setVerified(false);
        doc.setCreatedAt(now);

        Document saved = documentRepository.save(doc);

        AuditEvent event = new AuditEvent();
        event.setId(UUID.randomUUID());
        event.setApplicationId(applicationId);
        event.setEntityType("document");
        event.setEntityId(id);
        event.setAction("document.uploaded");
        event.setActor(request.getUploadedBy() != null ? request.getUploadedBy() : "system");
        event.setChanges(String.format("{\"document_type\":\"%s\",\"file_name\":\"%s\"}",
                request.getDocumentType(), request.getFileName()));
        event.setMetadata("{\"source\":\"api\"}");
        event.setCreatedAt(now);
        auditEventRepository.save(event);

        return saved;
    }

    public List<Document> listByApplication(UUID applicationId) {
        return documentRepository.findByApplicationIdOrderByCreatedAtDesc(applicationId);
    }

    @Transactional
    public Optional<Document> verify(UUID documentId, String verifiedBy) {
        Optional<Document> opt = documentRepository.findById(documentId);
        if (opt.isEmpty()) return Optional.empty();

        Document doc = opt.get();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        doc.setVerified(true);
        doc.setVerifiedBy(verifiedBy);
        doc.setVerifiedAt(now);

        Document saved = documentRepository.save(doc);

        AuditEvent event = new AuditEvent();
        event.setId(UUID.randomUUID());
        event.setApplicationId(doc.getApplicationId());
        event.setEntityType("document");
        event.setEntityId(documentId);
        event.setAction("document.verified");
        event.setActor(verifiedBy);
        event.setChanges("{\"verified\":{\"from\":false,\"to\":true}}");
        event.setMetadata("{\"source\":\"underwriter_portal\"}");
        event.setCreatedAt(now);
        auditEventRepository.save(event);

        return Optional.of(saved);
    }
}
