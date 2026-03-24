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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AffordabilityService {

    private static final BigDecimal STRESS_BUFFER = new BigDecimal("0.03");
    private static final BigDecimal DTI_PASS_THRESHOLD = new BigDecimal("0.45");
    private static final BigDecimal DTI_MARGINAL_THRESHOLD = new BigDecimal("0.55");
    private static final BigDecimal MAX_DTI = new BigDecimal("9.9999");
    private static final BigDecimal DEFAULT_RATE = new BigDecimal("0.0425");

    private final AffordabilityCheckRepository affordabilityCheckRepository;
    private final ApplicationRepository applicationRepository;
    private final AuditEventRepository auditEventRepository;

    public AffordabilityService(AffordabilityCheckRepository affordabilityCheckRepository,
                                ApplicationRepository applicationRepository,
                                AuditEventRepository auditEventRepository) {
        this.affordabilityCheckRepository = affordabilityCheckRepository;
        this.applicationRepository = applicationRepository;
        this.auditEventRepository = auditEventRepository;
    }

    public Optional<AffordabilityCheck> getAssessment(UUID applicationId) {
        return affordabilityCheckRepository.findByApplicationId(applicationId);
    }

    @Transactional
    public AffordabilityCheck runAssessment(UUID applicationId) {
        Optional<AffordabilityCheck> existing = affordabilityCheckRepository.findByApplicationId(applicationId);
        if (existing.isPresent()) {
            throw new ConflictException("Affordability check already exists for application " + applicationId);
        }

        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found: " + applicationId));

        BigDecimal annualIncome = app.getApplicantAnnualIncome() != null
                ? app.getApplicantAnnualIncome() : BigDecimal.ZERO;
        BigDecimal grossMonthlyIncome = annualIncome.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);

        BigDecimal rent = app.getMonthlyRentOrMortgage() != null ? app.getMonthlyRentOrMortgage() : BigDecimal.ZERO;
        BigDecimal credit = app.getMonthlyCreditCommitments() != null ? app.getMonthlyCreditCommitments() : BigDecimal.ZERO;
        BigDecimal living = app.getMonthlyLivingCosts() != null ? app.getMonthlyLivingCosts() : BigDecimal.ZERO;
        BigDecimal declaredMonthlyOutgoings = rent.add(credit).add(living);

        BigDecimal interestRate = app.getInterestRate() != null ? app.getInterestRate() : DEFAULT_RATE;
        BigDecimal loanAmount = app.getLoanAmount();
        int termMonths = app.getLoanTermMonths();

        BigDecimal mortgagePaymentCurrent = calculateMonthlyPayment(loanAmount, interestRate, termMonths);
        BigDecimal stressedRate = interestRate.add(STRESS_BUFFER);
        BigDecimal mortgagePaymentStressed = calculateMonthlyPayment(loanAmount, stressedRate, termMonths);

        BigDecimal dtiCurrent;
        BigDecimal dtiStressed;

        if (grossMonthlyIncome.compareTo(BigDecimal.ZERO) == 0) {
            dtiCurrent = MAX_DTI;
            dtiStressed = MAX_DTI;
        } else {
            dtiCurrent = declaredMonthlyOutgoings.add(mortgagePaymentCurrent)
                    .divide(grossMonthlyIncome, 4, RoundingMode.HALF_UP)
                    .min(MAX_DTI);
            dtiStressed = declaredMonthlyOutgoings.add(mortgagePaymentStressed)
                    .divide(grossMonthlyIncome, 4, RoundingMode.HALF_UP)
                    .min(MAX_DTI);
        }

        String verdict = determineVerdict(dtiStressed);
        String verdictReason = generateVerdictReason(verdict, dtiStressed, grossMonthlyIncome,
                declaredMonthlyOutgoings, mortgagePaymentStressed);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        AffordabilityCheck check = new AffordabilityCheck();
        check.setId(UUID.randomUUID());
        check.setApplicationId(applicationId);
        check.setGrossMonthlyIncome(grossMonthlyIncome);
        check.setDeclaredMonthlyOutgoings(declaredMonthlyOutgoings);
        check.setMortgagePaymentCurrent(mortgagePaymentCurrent);
        check.setMortgagePaymentStressed(mortgagePaymentStressed);
        check.setDtiRatioCurrent(dtiCurrent);
        check.setDtiRatioStressed(dtiStressed);
        check.setVerdict(verdict);
        check.setVerdictReason(verdictReason);
        check.setCheckedAt(now);

        AffordabilityCheck saved = affordabilityCheckRepository.save(check);

        AuditEvent event = new AuditEvent();
        event.setId(UUID.randomUUID());
        event.setApplicationId(applicationId);
        event.setEntityType("affordability_check");
        event.setEntityId(saved.getId());
        event.setAction("affordability_check.completed");
        event.setActor("system");
        event.setChanges(String.format("{\"verdict\":\"%s\",\"dti_stressed\":%s}", verdict, dtiStressed.toPlainString()));
        event.setMetadata("{\"source\":\"api\"}");
        event.setCreatedAt(now);
        auditEventRepository.save(event);

        return saved;
    }

    String determineVerdict(BigDecimal dtiStressed) {
        if (dtiStressed.compareTo(DTI_PASS_THRESHOLD) <= 0) return "pass";
        if (dtiStressed.compareTo(DTI_MARGINAL_THRESHOLD) <= 0) return "marginal";
        return "fail";
    }

    String generateVerdictReason(String verdict, BigDecimal dtiStressed, BigDecimal grossMonthlyIncome,
                                  BigDecimal outgoings, BigDecimal stressedPayment) {
        String dtiPercent = dtiStressed.multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP).toPlainString();
        switch (verdict) {
            case "pass":
                return String.format("Stressed DTI ratio of %s%% is within acceptable limits. " +
                        "Monthly income of £%s comfortably covers outgoings of £%s plus stressed mortgage payment of £%s.",
                        dtiPercent, grossMonthlyIncome.setScale(0, RoundingMode.HALF_UP).toPlainString(),
                        outgoings.setScale(0, RoundingMode.HALF_UP).toPlainString(),
                        stressedPayment.setScale(0, RoundingMode.HALF_UP).toPlainString());
            case "marginal":
                return String.format("Stressed DTI ratio of %s%% is borderline. " +
                        "Additional review recommended — applicant may struggle with repayments if rates increase.",
                        dtiPercent);
            default:
                return String.format("Stressed DTI ratio of %s%% exceeds acceptable threshold of 55%%. " +
                        "Applicant's income of £%s is insufficient to cover total obligations of £%s under stress conditions.",
                        dtiPercent, grossMonthlyIncome.setScale(0, RoundingMode.HALF_UP).toPlainString(),
                        outgoings.add(stressedPayment).setScale(0, RoundingMode.HALF_UP).toPlainString());
        }
    }

    BigDecimal calculateMonthlyPayment(BigDecimal principal, BigDecimal annualRate, int termMonths) {
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(termMonths), 2, RoundingMode.HALF_UP);
        }
        double r = monthlyRate.doubleValue();
        double p = principal.doubleValue();
        double power = Math.pow(1 + r, termMonths);
        double payment = p * (r * power) / (power - 1);
        return BigDecimal.valueOf(payment).setScale(2, RoundingMode.HALF_UP);
    }
}
