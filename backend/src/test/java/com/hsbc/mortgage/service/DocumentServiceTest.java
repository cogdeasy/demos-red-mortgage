package com.hsbc.mortgage.service;

import com.hsbc.mortgage.dto.UploadDocumentRequest;
import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.entity.Document;
import com.hsbc.mortgage.repository.AuditEventRepository;
import com.hsbc.mortgage.repository.DocumentRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private AuditEventRepository auditEventRepository;

    private DocumentService service;

    @BeforeEach
    void setUp() {
        service = new DocumentService(documentRepository, auditEventRepository);
    }

    @Test
    void upload_shouldCreateDocument() {
        UUID appId = UUID.randomUUID();
        UploadDocumentRequest request = new UploadDocumentRequest();
        request.setDocumentType("payslip");
        request.setFileName("payslip.pdf");
        request.setFileSize(1024);
        request.setMimeType("application/pdf");
        request.setUploadedBy("applicant@example.com");

        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        Document result = service.upload(appId, request);

        assertNotNull(result.getId());
        assertEquals(appId, result.getApplicationId());
        assertEquals("payslip", result.getDocumentType());
        assertEquals("payslip.pdf", result.getFileName());
        assertFalse(result.getVerified());

        verify(documentRepository).save(any(Document.class));
        verify(auditEventRepository).save(any(AuditEvent.class));
    }

    @Test
    void verify_shouldUpdateDocumentAndEmitAudit() {
        UUID docId = UUID.randomUUID();
        Document doc = new Document();
        doc.setId(docId);
        doc.setApplicationId(UUID.randomUUID());
        doc.setVerified(false);

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        Optional<Document> result = service.verify(docId, "verifier@hsbc.co.uk");

        assertTrue(result.isPresent());
        assertTrue(result.get().getVerified());
        assertEquals("verifier@hsbc.co.uk", result.get().getVerifiedBy());
        assertNotNull(result.get().getVerifiedAt());

        verify(auditEventRepository).save(any(AuditEvent.class));
    }

    @Test
    void verify_shouldReturnEmptyIfNotFound() {
        UUID docId = UUID.randomUUID();
        when(documentRepository.findById(docId)).thenReturn(Optional.empty());

        Optional<Document> result = service.verify(docId, "verifier@hsbc.co.uk");
        assertTrue(result.isEmpty());
    }

    @Test
    void listByApplication_shouldReturnDocuments() {
        UUID appId = UUID.randomUUID();
        when(documentRepository.findByApplicationIdOrderByCreatedAtDesc(appId))
                .thenReturn(List.of(new Document()));

        List<Document> result = service.listByApplication(appId);
        assertEquals(1, result.size());
    }
}
