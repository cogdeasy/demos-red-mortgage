package com.hsbc.mortgage.service;

import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.entity.CreditCheck;
import com.hsbc.mortgage.exception.ConflictException;
import com.hsbc.mortgage.repository.AuditEventRepository;
import com.hsbc.mortgage.repository.CreditCheckRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreditCheckService {

    private final CreditCheckRepository creditCheckRepository;
    private final AuditEventRepository auditEventRepository;

    public CreditCheckService(CreditCheckRepository creditCheckRepository,
                              AuditEventRepository auditEventRepository) {
        this.creditCheckRepository = creditCheckRepository;
        this.auditEventRepository = auditEventRepository;
    }

    public Optional<CreditCheck> getByApplicationId(UUID applicationId) {
        return creditCheckRepository.findByApplicationId(applicationId);
    }

    @Transactional
    public CreditCheck runCheck(UUID applicationId, BigDecimal annualIncome,
                                String employmentStatus, BigDecimal loanAmount, BigDecimal propertyValue) {
        Optional<CreditCheck> existing = creditCheckRepository.findByApplicationId(applicationId);
        if (existing.isPresent()) {
            throw new ConflictException("Credit check already exists for application " + applicationId);
        }

        double ltv = loanAmount.doubleValue() / propertyValue.doubleValue();
        int score = calculateScore(annualIncome.doubleValue(), employmentStatus, ltv);
        String riskBand = getRiskBand(score);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        CreditCheck check = new CreditCheck();
        check.setId(UUID.randomUUID());
        check.setApplicationId(applicationId);
        check.setCreditScore(score);
        check.setRiskBand(riskBand);
        check.setProvider("mock-experian");

        String requestPayload = String.format(
                "{\"application_id\":\"%s\",\"applicant_annual_income\":%s,\"applicant_employment_status\":\"%s\",\"loan_amount\":%s,\"property_value\":%s}",
                applicationId, annualIncome.toPlainString(), employmentStatus,
                loanAmount.toPlainString(), propertyValue.toPlainString());
        check.setRequestPayload(requestPayload);

        String responsePayload = String.format(
                "{\"provider\":\"mock-experian\",\"version\":\"1.0\",\"score\":%d,\"income_band\":\"%s\",\"ltv_ratio\":%f,\"employment\":\"%s\",\"timestamp\":\"%s\"}",
                score, annualIncome.doubleValue() >= 75000 ? "high" : "standard",
                ltv, employmentStatus, now.toString());
        check.setResponsePayload(responsePayload);

        check.setCheckedAt(now);
        check.setCreatedAt(now);

        CreditCheck saved;
        try {
            saved = creditCheckRepository.save(check);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Credit check already exists for application " + applicationId);
        }

        AuditEvent event = new AuditEvent();
        event.setId(UUID.randomUUID());
        event.setApplicationId(applicationId);
        event.setEntityType("credit_check");
        event.setEntityId(saved.getId());
        event.setAction("credit_check.completed");
        event.setActor("system");
        event.setChanges(String.format("{\"risk_band\":\"%s\",\"credit_score\":%d}", riskBand, score));
        event.setMetadata("{\"provider\":\"mock-experian\",\"source\":\"api\"}");
        event.setCreatedAt(now);
        auditEventRepository.save(event);

        return saved;
    }

    int calculateScore(double annualIncome, String employmentStatus, double ltv) {
        int score;
        if (annualIncome >= 100000) score = 780;
        else if (annualIncome >= 75000) score = 740;
        else if (annualIncome >= 50000) score = 700;
        else if (annualIncome >= 30000) score = 660;
        else score = 620;

        if (ltv > 0.9) score -= 60;
        else if (ltv > 0.8) score -= 30;
        else if (ltv <= 0.6) score += 20;

        if ("employed".equals(employmentStatus)) score += 10;
        else if ("self-employed".equals(employmentStatus)) score -= 10;
        else if ("unemployed".equals(employmentStatus)) score -= 80;

        return Math.max(300, Math.min(850, score));
    }

    String getRiskBand(int creditScore) {
        if (creditScore >= 720) return "low";
        if (creditScore >= 660) return "medium";
        if (creditScore >= 600) return "high";
        return "very_high";
    }
}
