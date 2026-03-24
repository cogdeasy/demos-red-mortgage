package com.hsbc.mortgage.service;

import com.hsbc.mortgage.entity.AffordabilityCheck;
import com.hsbc.mortgage.entity.Application;
import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.exception.ConflictException;
import com.hsbc.mortgage.exception.NotFoundException;
import com.hsbc.mortgage.repository.AffordabilityCheckRepository;
import com.hsbc.mortgage.repository.ApplicationRepository;
import com.hsbc.mortgage.repository.AuditEventRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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
class AffordabilityServiceTest {

    @Mock
    private AffordabilityCheckRepository affordabilityCheckRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private AuditEventRepository auditEventRepository;

    private AffordabilityService service;

    @BeforeEach
    void setUp() {
        service = new AffordabilityService(affordabilityCheckRepository, applicationRepository, auditEventRepository);
    }

    @Test
    void runAssessment_shouldReturnPassVerdict_whenDtiIsLow() {
        UUID appId = UUID.randomUUID();
        Application app = createTestApplication(appId, BigDecimal.valueOf(120000),
                BigDecimal.valueOf(200), BigDecimal.valueOf(100), BigDecimal.valueOf(300),
                BigDecimal.valueOf(300000), 300, new BigDecimal("0.0425"));

        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));
        when(affordabilityCheckRepository.save(any(AffordabilityCheck.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        AffordabilityCheck result = service.runAssessment(appId);

        assertNotNull(result);
        assertEquals(appId, result.getApplicationId());
        assertEquals("pass", result.getVerdict());
        assertTrue(result.getDtiRatioStressed().doubleValue() <= 0.45);
        assertNotNull(result.getVerdictReason());
        verify(affordabilityCheckRepository).save(any(AffordabilityCheck.class));
        verify(auditEventRepository).save(any(AuditEvent.class));
    }

    @Test
    void runAssessment_shouldReturnMarginalVerdict_whenDtiIsMedium() {
        UUID appId = UUID.randomUUID();
        // Income: 60000/year = 5000/month. Outgoings: 600+200+300 = 1100.
        // With stressed payment around ~1850, DTI stressed ~ (1100+1850)/5000 ~ 0.59 -> but let's tune:
        // Actually need DTI stressed between 0.45 and 0.55
        // Income: 72000/year = 6000/month. Outgoings: 400+200+200 = 800.
        // Loan: 300000, rate 0.0425, term 300. Payment current ~1647. Stressed rate 0.0725, payment ~2097
        // DTI stressed = (800+2097)/6000 = 0.4828 -> pass. Need higher outgoings.
        // Outgoings: 700+300+300 = 1300. DTI stressed = (1300+2097)/6000 = 0.566 -> fail. Too high.
        // Outgoings: 500+100+100 = 700. DTI stressed = (700+2097)/6000 = 0.466 -> marginal!
        Application app = createTestApplication(appId, BigDecimal.valueOf(72000),
                BigDecimal.valueOf(500), BigDecimal.valueOf(100), BigDecimal.valueOf(100),
                BigDecimal.valueOf(300000), 300, new BigDecimal("0.0425"));

        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));
        when(affordabilityCheckRepository.save(any(AffordabilityCheck.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        AffordabilityCheck result = service.runAssessment(appId);

        assertEquals("marginal", result.getVerdict());
        assertTrue(result.getDtiRatioStressed().doubleValue() > 0.45);
        assertTrue(result.getDtiRatioStressed().doubleValue() <= 0.55);
    }

    @Test
    void runAssessment_shouldReturnFailVerdict_whenDtiIsHigh() {
        UUID appId = UUID.randomUUID();
        // Income: 36000/year = 3000/month. Outgoings: 500+200+300 = 1000.
        // Loan: 300000, rate 0.0425, term 300. Payment stressed ~2097
        // DTI stressed = (1000+2097)/3000 = 1.032 -> fail
        Application app = createTestApplication(appId, BigDecimal.valueOf(36000),
                BigDecimal.valueOf(500), BigDecimal.valueOf(200), BigDecimal.valueOf(300),
                BigDecimal.valueOf(300000), 300, new BigDecimal("0.0425"));

        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));
        when(affordabilityCheckRepository.save(any(AffordabilityCheck.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        AffordabilityCheck result = service.runAssessment(appId);

        assertEquals("fail", result.getVerdict());
        assertTrue(result.getDtiRatioStressed().doubleValue() > 0.55);
    }

    @Test
    void runAssessment_shouldCalculateStressedPaymentWithBufferRate() {
        UUID appId = UUID.randomUUID();
        BigDecimal baseRate = new BigDecimal("0.0425");
        Application app = createTestApplication(appId, BigDecimal.valueOf(120000),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.valueOf(200000), 300, baseRate);

        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));
        when(affordabilityCheckRepository.save(any(AffordabilityCheck.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        AffordabilityCheck result = service.runAssessment(appId);

        // Verify stressed payment > current payment (due to +3% rate buffer)
        assertTrue(result.getMortgagePaymentStressed().compareTo(result.getMortgagePaymentCurrent()) > 0);

        // Verify the stressed payment matches expected calculation with rate + 3%
        BigDecimal expectedStressed = service.calculateMonthlyPayment(
                BigDecimal.valueOf(200000), baseRate.add(new BigDecimal("0.03")), 300);
        assertEquals(expectedStressed, result.getMortgagePaymentStressed());
    }

    @Test
    void runAssessment_shouldThrowConflictIfAlreadyExists() {
        UUID appId = UUID.randomUUID();
        AffordabilityCheck existing = new AffordabilityCheck();
        existing.setId(UUID.randomUUID());

        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.of(existing));

        ConflictException ex = assertThrows(ConflictException.class, () -> service.runAssessment(appId));
        assertTrue(ex.getMessage().contains("Affordability check already exists"));
    }

    @Test
    void runAssessment_shouldThrowNotFoundIfApplicationMissing() {
        UUID appId = UUID.randomUUID();

        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(appId)).thenReturn(Optional.empty());

        NotFoundException ex = assertThrows(NotFoundException.class, () -> service.runAssessment(appId));
        assertTrue(ex.getMessage().contains("Application not found"));
    }

    @Test
    void runAssessment_shouldHandleZeroIncome() {
        UUID appId = UUID.randomUUID();
        Application app = createTestApplication(appId, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.valueOf(200000), 300, new BigDecimal("0.0425"));

        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));
        when(affordabilityCheckRepository.save(any(AffordabilityCheck.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        AffordabilityCheck result = service.runAssessment(appId);

        assertEquals("fail", result.getVerdict());
        assertEquals(new BigDecimal("9.9999"), result.getDtiRatioCurrent());
        assertEquals(new BigDecimal("9.9999"), result.getDtiRatioStressed());
    }

    @Test
    void runAssessment_shouldDefaultMissingOutgoingsToZero() {
        UUID appId = UUID.randomUUID();
        Application app = new Application();
        app.setId(appId);
        app.setApplicantAnnualIncome(BigDecimal.valueOf(120000));
        app.setMonthlyRentOrMortgage(null);
        app.setMonthlyCreditCommitments(null);
        app.setMonthlyLivingCosts(null);
        app.setLoanAmount(BigDecimal.valueOf(200000));
        app.setLoanTermMonths(300);
        app.setInterestRate(new BigDecimal("0.0425"));

        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));
        when(affordabilityCheckRepository.save(any(AffordabilityCheck.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        AffordabilityCheck result = service.runAssessment(appId);

        assertEquals(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), result.getDeclaredMonthlyOutgoings().setScale(2, RoundingMode.HALF_UP));
    }

    @Test
    void runAssessment_shouldCapDtiAtMaxForLowIncome() {
        UUID appId = UUID.randomUUID();
        // Very low income: 2400/year = 200/month. Outgoings: 500+200+300=1000.
        // Mortgage stressed ~2097. DTI = (1000+2097)/200 = 15.49 -> capped at 9.9999
        Application app = createTestApplication(appId, BigDecimal.valueOf(2400),
                BigDecimal.valueOf(500), BigDecimal.valueOf(200), BigDecimal.valueOf(300),
                BigDecimal.valueOf(300000), 300, new BigDecimal("0.0425"));

        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));
        when(affordabilityCheckRepository.save(any(AffordabilityCheck.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        AffordabilityCheck result = service.runAssessment(appId);

        assertTrue(result.getDtiRatioStressed().compareTo(new BigDecimal("9.9999")) <= 0);
        assertEquals("fail", result.getVerdict());
    }

    @Test
    void getAssessment_shouldReturnExistingCheck() {
        UUID appId = UUID.randomUUID();
        AffordabilityCheck check = new AffordabilityCheck();
        check.setId(UUID.randomUUID());
        check.setApplicationId(appId);

        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.of(check));

        Optional<AffordabilityCheck> result = service.getAssessment(appId);

        assertTrue(result.isPresent());
        assertEquals(appId, result.get().getApplicationId());
    }

    @Test
    void getAssessment_shouldReturnEmptyIfNoneExists() {
        UUID appId = UUID.randomUUID();
        when(affordabilityCheckRepository.findByApplicationId(appId)).thenReturn(Optional.empty());

        Optional<AffordabilityCheck> result = service.getAssessment(appId);

        assertFalse(result.isPresent());
    }

    @Test
    void determineVerdict_shouldReturnCorrectVerdicts() {
        assertEquals("pass", service.determineVerdict(new BigDecimal("0.40")));
        assertEquals("pass", service.determineVerdict(new BigDecimal("0.45")));
        assertEquals("marginal", service.determineVerdict(new BigDecimal("0.46")));
        assertEquals("marginal", service.determineVerdict(new BigDecimal("0.55")));
        assertEquals("fail", service.determineVerdict(new BigDecimal("0.56")));
        assertEquals("fail", service.determineVerdict(new BigDecimal("0.90")));
    }

    @Test
    void calculateMonthlyPayment_shouldBePositive() {
        BigDecimal payment = service.calculateMonthlyPayment(
                BigDecimal.valueOf(200000), new BigDecimal("0.0425"), 300);
        assertNotNull(payment);
        assertTrue(payment.doubleValue() > 0);
    }

    @Test
    void calculateMonthlyPayment_shouldHandleZeroRate() {
        BigDecimal payment = service.calculateMonthlyPayment(
                BigDecimal.valueOf(120000), BigDecimal.ZERO, 300);
        assertEquals(BigDecimal.valueOf(120000).divide(BigDecimal.valueOf(300), 2, RoundingMode.HALF_UP), payment);
    }

    private Application createTestApplication(UUID id, BigDecimal annualIncome,
            BigDecimal rent, BigDecimal credit, BigDecimal living,
            BigDecimal loanAmount, int termMonths, BigDecimal interestRate) {
        Application app = new Application();
        app.setId(id);
        app.setApplicantFirstName("Test");
        app.setApplicantLastName("User");
        app.setApplicantEmail("test@example.com");
        app.setApplicantAnnualIncome(annualIncome);
        app.setMonthlyRentOrMortgage(rent);
        app.setMonthlyCreditCommitments(credit);
        app.setMonthlyLivingCosts(living);
        app.setLoanAmount(loanAmount);
        app.setLoanTermMonths(termMonths);
        app.setInterestRate(interestRate);
        app.setLoanType("fixed");
        app.setStatus("submitted");
        app.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        app.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return app;
    }
}
