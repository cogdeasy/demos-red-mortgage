package com.hsbc.mortgage.service;

import com.hsbc.mortgage.dto.CreateApplicationRequest;
import com.hsbc.mortgage.dto.UpdateApplicationRequest;
import com.hsbc.mortgage.entity.Application;
import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.exception.ConflictException;
import com.hsbc.mortgage.repository.ApplicationRepository;
import com.hsbc.mortgage.repository.AuditEventRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private AuditEventRepository auditEventRepository;

    private ApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ApplicationService(applicationRepository, auditEventRepository);
    }

    @Test
    void create_shouldSaveApplicationWithDraftStatus() {
        CreateApplicationRequest request = new CreateApplicationRequest();
        request.setApplicantFirstName("John");
        request.setApplicantLastName("Doe");
        request.setApplicantEmail("john@example.com");
        request.setLoanAmount(BigDecimal.valueOf(200000));
        request.setLoanTermMonths(300);
        request.setPropertyValue(BigDecimal.valueOf(300000));

        when(applicationRepository.save(any(Application.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        Application result = service.create(request);

        assertNotNull(result.getId());
        assertEquals("draft", result.getStatus());
        assertEquals("John", result.getApplicantFirstName());
        assertNotNull(result.getLtvRatio());
        assertNotNull(result.getInterestRate());
        assertNotNull(result.getMonthlyPayment());

        verify(applicationRepository).save(any(Application.class));
        verify(auditEventRepository).save(any(AuditEvent.class));
    }

    @Test
    void submit_shouldThrowConflictIfNotDraft() {
        UUID id = UUID.randomUUID();
        Application app = createTestApplication(id, "submitted");

        when(applicationRepository.findById(id)).thenReturn(Optional.of(app));

        ConflictException ex = assertThrows(ConflictException.class, () -> service.submit(id));
        assertTrue(ex.getMessage().contains("Cannot submit application in status"));
    }

    @Test
    void submit_shouldChangeStatusToSubmitted() {
        UUID id = UUID.randomUUID();
        Application app = createTestApplication(id, "draft");
        app.setApplicantAnnualIncome(BigDecimal.valueOf(50000));
        app.setPropertyValue(BigDecimal.valueOf(300000));
        app.setPropertyAddressLine1("123 Main St");
        app.setPropertyCity("London");
        app.setPropertyPostcode("EC1A 1BB");

        when(applicationRepository.findById(id)).thenReturn(Optional.of(app));
        when(applicationRepository.save(any(Application.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        Application result = service.submit(id);

        assertEquals("submitted", result.getStatus());
        verify(auditEventRepository).save(any(AuditEvent.class));
    }

    @Test
    void decide_shouldThrowConflictIfInvalidStatus() {
        UUID id = UUID.randomUUID();
        Application app = createTestApplication(id, "draft");

        when(applicationRepository.findById(id)).thenReturn(Optional.of(app));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> service.decide(id, "approved", "Good", "underwriter@hsbc.co.uk"));
        assertTrue(ex.getMessage().contains("Cannot decide on application in status"));
    }

    @Test
    void decide_shouldApproveSubmittedApplication() {
        UUID id = UUID.randomUUID();
        Application app = createTestApplication(id, "submitted");

        when(applicationRepository.findById(id)).thenReturn(Optional.of(app));
        when(applicationRepository.save(any(Application.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        Application result = service.decide(id, "approved", "Strong application", "j.williams@hsbc.co.uk");

        assertEquals("approved", result.getStatus());
        assertEquals("approved", result.getDecision());
        assertEquals("Strong application", result.getDecisionReason());
        assertEquals("j.williams@hsbc.co.uk", result.getAssignedUnderwriter());
    }

    @Test
    void update_shouldReturnNullIfNotFound() {
        UUID id = UUID.randomUUID();
        when(applicationRepository.findById(id)).thenReturn(Optional.empty());

        UpdateApplicationRequest request = new UpdateApplicationRequest();
        request.setApplicantFirstName("Updated");

        Application result = service.update(id, request);
        assertNull(result);
    }

    @Test
    void calculateInterestRate_shouldApplyLtvAdjustments() {
        // High LTV (>90%) should add 1.5%
        BigDecimal highLtv = new BigDecimal("0.95");
        BigDecimal rateHigh = service.calculateInterestRate(highLtv, "fixed");
        assertEquals(new BigDecimal("0.0575"), rateHigh);

        // Low LTV (<=60%) should subtract 0.5%
        BigDecimal lowLtv = new BigDecimal("0.55");
        BigDecimal rateLow = service.calculateInterestRate(lowLtv, "fixed");
        assertEquals(new BigDecimal("0.0375"), rateLow);

        // Variable should subtract 0.3%
        BigDecimal rateVariable = service.calculateInterestRate(new BigDecimal("0.75"), "variable");
        assertEquals(new BigDecimal("0.0395"), rateVariable);
    }

    @Test
    void calculateMonthlyPayment_shouldCalculateCorrectly() {
        BigDecimal payment = service.calculateMonthlyPayment(
                BigDecimal.valueOf(200000), new BigDecimal("0.0425"), 300);
        assertNotNull(payment);
        assertTrue(payment.doubleValue() > 0);
        assertTrue(payment.doubleValue() > 1000);
        assertTrue(payment.doubleValue() < 1500);
    }

    @Test
    void getAuditTrail_shouldReturnEvents() {
        UUID appId = UUID.randomUUID();
        AuditEvent event = new AuditEvent();
        event.setId(UUID.randomUUID());
        event.setApplicationId(appId);
        event.setAction("application.created");
        event.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        when(auditEventRepository.findByApplicationIdOrderByCreatedAtAsc(appId))
                .thenReturn(List.of(event));

        List<AuditEvent> result = service.getAuditTrail(appId);
        assertEquals(1, result.size());
        assertEquals("application.created", result.get(0).getAction());
    }

    private Application createTestApplication(UUID id, String status) {
        Application app = new Application();
        app.setId(id);
        app.setApplicantFirstName("Test");
        app.setApplicantLastName("User");
        app.setApplicantEmail("test@example.com");
        app.setLoanAmount(BigDecimal.valueOf(200000));
        app.setLoanTermMonths(300);
        app.setLoanType("fixed");
        app.setStatus(status);
        app.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        app.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return app;
    }
}
