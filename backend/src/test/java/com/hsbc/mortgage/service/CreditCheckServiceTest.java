package com.hsbc.mortgage.service;

import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.entity.CreditCheck;
import com.hsbc.mortgage.exception.ConflictException;
import com.hsbc.mortgage.repository.AuditEventRepository;
import com.hsbc.mortgage.repository.CreditCheckRepository;
import java.math.BigDecimal;
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
class CreditCheckServiceTest {

    @Mock
    private CreditCheckRepository creditCheckRepository;

    @Mock
    private AuditEventRepository auditEventRepository;

    private CreditCheckService service;

    @BeforeEach
    void setUp() {
        service = new CreditCheckService(creditCheckRepository, auditEventRepository);
    }

    @Test
    void runCheck_shouldThrowConflictIfAlreadyExists() {
        UUID appId = UUID.randomUUID();
        CreditCheck existing = new CreditCheck();
        existing.setId(UUID.randomUUID());

        when(creditCheckRepository.findByApplicationId(appId)).thenReturn(Optional.of(existing));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> service.runCheck(appId, BigDecimal.valueOf(50000), "employed",
                        BigDecimal.valueOf(200000), BigDecimal.valueOf(300000)));
        assertTrue(ex.getMessage().contains("Credit check already exists"));
    }

    @Test
    void runCheck_shouldCreateCreditCheck() {
        UUID appId = UUID.randomUUID();
        when(creditCheckRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(creditCheckRepository.saveAndFlush(any(CreditCheck.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        CreditCheck result = service.runCheck(appId, BigDecimal.valueOf(95000), "employed",
                BigDecimal.valueOf(385000), BigDecimal.valueOf(550000));

        assertNotNull(result);
        assertEquals(appId, result.getApplicationId());
        assertEquals("mock-experian", result.getProvider());
        assertTrue(result.getCreditScore() >= 300 && result.getCreditScore() <= 850);
        assertNotNull(result.getRiskBand());

        verify(creditCheckRepository).saveAndFlush(any(CreditCheck.class));
        verify(auditEventRepository).save(any(AuditEvent.class));
    }

    @Test
    void calculateScore_shouldApplyIncomeAndLtvAdjustments() {
        // High income + low LTV + employed = high score
        int highScore = service.calculateScore(100000, "employed", 0.5);
        assertTrue(highScore >= 780);

        // Low income + high LTV + unemployed = low score
        int lowScore = service.calculateScore(25000, "unemployed", 0.95);
        assertTrue(lowScore < 600);
    }

    @Test
    void getRiskBand_shouldReturnCorrectBands() {
        assertEquals("low", service.getRiskBand(750));
        assertEquals("medium", service.getRiskBand(690));
        assertEquals("high", service.getRiskBand(630));
        assertEquals("very_high", service.getRiskBand(550));
    }
}
