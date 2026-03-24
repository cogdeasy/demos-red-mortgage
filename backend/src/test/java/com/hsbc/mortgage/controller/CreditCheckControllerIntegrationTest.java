package com.hsbc.mortgage.controller;

import com.hsbc.mortgage.entity.Application;
import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.entity.CreditCheck;
import com.hsbc.mortgage.repository.ApplicationRepository;
import com.hsbc.mortgage.repository.AuditEventRepository;
import com.hsbc.mortgage.repository.CreditCheckRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CreditCheckControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private CreditCheckRepository creditCheckRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @BeforeEach
    void setUp() {
        creditCheckRepository.deleteAll();
        auditEventRepository.deleteAll();
        applicationRepository.deleteAll();
    }

    // ==================== Happy Path ====================

    @Test
    void happyPath_submitApplicationThenRunCreditCheck() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(95000), "employed",
                BigDecimal.valueOf(385000), BigDecimal.valueOf(550000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").isNumber())
                .andExpect(jsonPath("$.risk_band").isString())
                .andExpect(jsonPath("$.provider").value("mock-experian"))
                .andExpect(jsonPath("$.application_id").value(app.getId().toString()));

        CreditCheck persisted = creditCheckRepository.findByApplicationId(app.getId()).orElse(null);
        assertNotNull(persisted);
        assertEquals(app.getId(), persisted.getApplicationId());
        assertTrue(persisted.getCreditScore() >= 300 && persisted.getCreditScore() <= 850);
        assertNotNull(persisted.getRiskBand());
        assertEquals("mock-experian", persisted.getProvider());
        assertNotNull(persisted.getRequestPayload());
        assertNotNull(persisted.getResponsePayload());

        List<AuditEvent> events = auditEventRepository.findByApplicationIdOrderByCreatedAtAsc(app.getId());
        boolean hasCreditCheckEvent = events.stream()
                .anyMatch(e -> "credit_check.completed".equals(e.getAction()));
        assertTrue(hasCreditCheckEvent, "Expected credit_check.completed audit event");

        mockMvc.perform(get("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(persisted.getCreditScore()))
                .andExpect(jsonPath("$.risk_band").value(persisted.getRiskBand()));
    }

    // ==================== Scoring Scenarios ====================

    @Test
    void scoring_highIncomeEmployedLowLtv() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(120000), "employed",
                BigDecimal.valueOf(250000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(810))
                .andExpect(jsonPath("$.risk_band").value("low"));
    }

    @Test
    void scoring_mediumIncomeSelfEmployedMidLtv() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(80000), "self-employed",
                BigDecimal.valueOf(350000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(730))
                .andExpect(jsonPath("$.risk_band").value("low"));
    }

    @Test
    void scoring_lowIncomeUnemployedHighLtv() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(25000), "unemployed",
                BigDecimal.valueOf(190000), BigDecimal.valueOf(200000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(480))
                .andExpect(jsonPath("$.risk_band").value("very_high"));
    }

    @Test
    void scoring_midIncomeEmployedHighLtv() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(55000), "employed",
                BigDecimal.valueOf(425000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(680))
                .andExpect(jsonPath("$.risk_band").value("medium"));
    }

    @Test
    void scoring_30kIncomeContractorMidLtv() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(35000), "contractor",
                BigDecimal.valueOf(375000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(660))
                .andExpect(jsonPath("$.risk_band").value("medium"));
    }

    @Test
    void scoring_highIncomeUnemployedMidLtv() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(100000), "unemployed",
                BigDecimal.valueOf(350000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(700))
                .andExpect(jsonPath("$.risk_band").value("medium"));
    }

    @Test
    void scoring_lowIncomeEmployedVeryHighLtv() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(20000), "employed",
                BigDecimal.valueOf(190000), BigDecimal.valueOf(200000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(570))
                .andExpect(jsonPath("$.risk_band").value("very_high"));
    }

    // ==================== Idempotency ====================

    @Test
    void idempotency_secondCreditCheckReturns409() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(95000), "employed",
                BigDecimal.valueOf(385000), BigDecimal.valueOf(550000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("already exists")));

        assertEquals(1, creditCheckRepository.findAll().size());
    }

    // ==================== Edge Cases: Risk Band Boundaries ====================

    @Test
    void boundary_scoreExactly720IsLow() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(75000), "employed",
                BigDecimal.valueOf(425000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(720))
                .andExpect(jsonPath("$.risk_band").value("low"));
    }

    @Test
    void boundary_score710IsMedium() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(55000), "employed",
                BigDecimal.valueOf(350000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(710))
                .andExpect(jsonPath("$.risk_band").value("medium"));
    }

    @Test
    void boundary_scoreExactly660IsMedium() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(30000), "contractor",
                BigDecimal.valueOf(375000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(660))
                .andExpect(jsonPath("$.risk_band").value("medium"));
    }

    @Test
    void boundary_score650IsHigh() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(30000), "self-employed",
                BigDecimal.valueOf(375000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(650))
                .andExpect(jsonPath("$.risk_band").value("high"));
    }

    @Test
    void boundary_scoreExactly600IsHigh() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(30000), "contractor",
                BigDecimal.valueOf(460000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(600))
                .andExpect(jsonPath("$.risk_band").value("high"));
    }

    @Test
    void boundary_score590IsVeryHigh() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(30000), "self-employed",
                BigDecimal.valueOf(460000), BigDecimal.valueOf(500000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credit_score").value(590))
                .andExpect(jsonPath("$.risk_band").value("very_high"));
    }

    // ==================== Audit Trail ====================

    @Test
    void auditTrail_creditCheckCompletedEventIsComplete() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(95000), "employed",
                BigDecimal.valueOf(385000), BigDecimal.valueOf(550000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated());

        List<AuditEvent> events = auditEventRepository.findByApplicationIdOrderByCreatedAtAsc(app.getId());
        AuditEvent creditCheckEvent = events.stream()
                .filter(e -> "credit_check.completed".equals(e.getAction()))
                .findFirst()
                .orElse(null);
        assertNotNull(creditCheckEvent, "credit_check.completed audit event should exist");
        assertEquals("credit_check", creditCheckEvent.getEntityType());
        assertEquals("system", creditCheckEvent.getActor());
        assertEquals(app.getId(), creditCheckEvent.getApplicationId());
        assertNotNull(creditCheckEvent.getEntityId());
        assertNotNull(creditCheckEvent.getChanges());
        assertTrue(creditCheckEvent.getChanges().contains("risk_band"));
        assertTrue(creditCheckEvent.getChanges().contains("credit_score"));
        assertNotNull(creditCheckEvent.getMetadata());
        assertTrue(creditCheckEvent.getMetadata().contains("mock-experian"));
    }

    // ==================== Validation Edge Cases ====================

    @Test
    void validation_draftApplicationReturns400() throws Exception {
        Application app = createDraftApplication(
                BigDecimal.valueOf(95000), "employed",
                BigDecimal.valueOf(385000), BigDecimal.valueOf(550000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("draft")));
    }

    @Test
    void validation_missingFieldsReturns400() throws Exception {
        Application app = createSubmittedApplicationMissingFields();

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("missing required fields")));
    }

    @Test
    void validation_nonExistentApplicationReturns404() throws Exception {
        UUID randomId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", randomId))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/applications/{id}/credit-check", randomId))
                .andExpect(status().isNotFound());
    }

    @Test
    void validation_getCreditCheckWhenNoneExistsReturns404() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(95000), "employed",
                BigDecimal.valueOf(385000), BigDecimal.valueOf(550000));

        mockMvc.perform(get("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value(containsString("No credit check found")));
    }

    // ==================== Persistence ====================

    @Test
    void persistence_jsonPayloadsAreStored() throws Exception {
        Application app = createSubmittedApplication(
                BigDecimal.valueOf(95000), "employed",
                BigDecimal.valueOf(385000), BigDecimal.valueOf(550000));

        mockMvc.perform(post("/api/v1/applications/{id}/credit-check", app.getId()))
                .andExpect(status().isCreated());

        CreditCheck check = creditCheckRepository.findByApplicationId(app.getId()).orElse(null);
        assertNotNull(check);
        assertNotNull(check.getRequestPayload());
        assertTrue(check.getRequestPayload().contains(app.getId().toString()));
        assertNotNull(check.getResponsePayload());
        assertTrue(check.getResponsePayload().contains("mock-experian"));
    }

    // ==================== Helpers ====================

    private Application createSubmittedApplication(BigDecimal income, String employmentStatus,
                                                    BigDecimal loanAmount, BigDecimal propertyValue) {
        Application app = new Application();
        app.setId(UUID.randomUUID());
        app.setApplicantFirstName("Test");
        app.setApplicantLastName("User");
        app.setApplicantEmail("test-" + UUID.randomUUID() + "@example.com");
        app.setApplicantAnnualIncome(income);
        app.setApplicantEmploymentStatus(employmentStatus);
        app.setPropertyValue(propertyValue);
        app.setPropertyAddressLine1("123 Test St");
        app.setPropertyCity("London");
        app.setPropertyPostcode("EC1A 1BB");
        app.setLoanAmount(loanAmount);
        app.setLoanTermMonths(300);
        app.setLoanType("fixed");
        app.setStatus("submitted");
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        app.setCreatedAt(now);
        app.setUpdatedAt(now);
        return applicationRepository.save(app);
    }

    private Application createDraftApplication(BigDecimal income, String employmentStatus,
                                                BigDecimal loanAmount, BigDecimal propertyValue) {
        Application app = new Application();
        app.setId(UUID.randomUUID());
        app.setApplicantFirstName("Draft");
        app.setApplicantLastName("User");
        app.setApplicantEmail("draft-" + UUID.randomUUID() + "@example.com");
        app.setApplicantAnnualIncome(income);
        app.setApplicantEmploymentStatus(employmentStatus);
        app.setPropertyValue(propertyValue);
        app.setLoanAmount(loanAmount);
        app.setLoanTermMonths(300);
        app.setLoanType("fixed");
        app.setStatus("draft");
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        app.setCreatedAt(now);
        app.setUpdatedAt(now);
        return applicationRepository.save(app);
    }

    private Application createSubmittedApplicationMissingFields() {
        Application app = new Application();
        app.setId(UUID.randomUUID());
        app.setApplicantFirstName("Incomplete");
        app.setApplicantLastName("User");
        app.setApplicantEmail("incomplete-" + UUID.randomUUID() + "@example.com");
        app.setLoanAmount(BigDecimal.valueOf(200000));
        app.setLoanTermMonths(300);
        app.setLoanType("fixed");
        app.setStatus("submitted");
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        app.setCreatedAt(now);
        app.setUpdatedAt(now);
        return applicationRepository.save(app);
    }
}
