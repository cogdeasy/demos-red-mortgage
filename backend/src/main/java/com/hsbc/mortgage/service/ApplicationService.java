package com.hsbc.mortgage.service;

import com.hsbc.mortgage.dto.ApplicationListResponse;
import com.hsbc.mortgage.dto.CreateApplicationRequest;
import com.hsbc.mortgage.dto.DashboardStats;
import com.hsbc.mortgage.dto.UpdateApplicationRequest;
import com.hsbc.mortgage.entity.Application;
import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.exception.ConflictException;
import com.hsbc.mortgage.repository.AffordabilityCheckRepository;
import com.hsbc.mortgage.repository.ApplicationRepository;
import com.hsbc.mortgage.repository.AuditEventRepository;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationService {

    private static final Set<String> VALID_SORT_COLUMNS = Set.of(
            "created_at", "loan_amount", "ltv_ratio", "applicant_last_name", "property_city"
    );

    private static final Map<String, String> SORT_COLUMN_MAP = Map.of(
            "created_at", "createdAt",
            "loan_amount", "loanAmount",
            "ltv_ratio", "ltvRatio",
            "applicant_last_name", "applicantLastName",
            "property_city", "propertyCity"
    );

    private final ApplicationRepository applicationRepository;
    private final AuditEventRepository auditEventRepository;
    private final AffordabilityCheckRepository affordabilityCheckRepository;

    public ApplicationService(ApplicationRepository applicationRepository,
                              AuditEventRepository auditEventRepository,
                              AffordabilityCheckRepository affordabilityCheckRepository) {
        this.applicationRepository = applicationRepository;
        this.auditEventRepository = auditEventRepository;
        this.affordabilityCheckRepository = affordabilityCheckRepository;
    }

    @Transactional
    public Application create(CreateApplicationRequest request) {
        Application app = new Application();
        app.setId(UUID.randomUUID());
        app.setApplicantFirstName(request.getApplicantFirstName());
        app.setApplicantLastName(request.getApplicantLastName());
        app.setApplicantEmail(request.getApplicantEmail());
        app.setApplicantPhone(request.getApplicantPhone());
        app.setApplicantDateOfBirth(request.getApplicantDateOfBirth());
        app.setApplicantAnnualIncome(request.getApplicantAnnualIncome());
        app.setApplicantEmploymentStatus(request.getApplicantEmploymentStatus());
        app.setApplicantEmployerName(request.getApplicantEmployerName());
        app.setPropertyAddressLine1(request.getPropertyAddressLine1());
        app.setPropertyAddressLine2(request.getPropertyAddressLine2());
        app.setPropertyCity(request.getPropertyCity());
        app.setPropertyPostcode(request.getPropertyPostcode());
        app.setPropertyCountry(request.getPropertyCountry() != null ? request.getPropertyCountry() : "United Kingdom");
        app.setPropertyType(request.getPropertyType());
        app.setPropertyValue(request.getPropertyValue());
        app.setLoanAmount(request.getLoanAmount());
        app.setLoanTermMonths(request.getLoanTermMonths());
        app.setLoanType(request.getLoanType() != null ? request.getLoanType() : "fixed");
        app.setMonthlyRentOrMortgage(request.getMonthlyRentOrMortgage());
        app.setMonthlyCreditCommitments(request.getMonthlyCreditCommitments());
        app.setMonthlyLivingCosts(request.getMonthlyLivingCosts());
        app.setNumberOfDependants(request.getNumberOfDependants() != null ? request.getNumberOfDependants() : 0);
        app.setStatus("draft");

        BigDecimal ltvRatio = calculateLtvRatio(app.getPropertyValue(), app.getLoanAmount());
        BigDecimal interestRate = calculateInterestRate(ltvRatio, app.getLoanType());
        BigDecimal monthlyPayment = calculateMonthlyPayment(app.getLoanAmount(), interestRate, app.getLoanTermMonths());

        app.setLtvRatio(ltvRatio);
        app.setInterestRate(interestRate);
        app.setMonthlyPayment(monthlyPayment);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        app.setCreatedAt(now);
        app.setUpdatedAt(now);

        Application saved = applicationRepository.save(app);

        emitAuditEvent(saved.getId(), "application", saved.getId(),
                "application.created", "system",
                "{\"status\":{\"from\":null,\"to\":\"draft\"}}",
                "{\"source\":\"api\"}");

        return saved;
    }

    public Optional<Application> getById(UUID id) {
        return applicationRepository.findById(id);
    }

    public ApplicationListResponse list(String status, String email, String search,
                                         String sortBy, String sortOrder, Integer page, Integer limit) {
        int pageNum = (page != null && page > 0) ? page : 1;
        int pageSize = (limit != null && limit > 0) ? limit : 20;

        if (sortBy != null && !VALID_SORT_COLUMNS.contains(sortBy)) {
            throw new IllegalArgumentException("Invalid sort column: " + sortBy);
        }

        String jpaSort = (sortBy != null) ? SORT_COLUMN_MAP.getOrDefault(sortBy, "createdAt") : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(pageNum - 1, pageSize, Sort.by(direction, jpaSort));

        // Use email as search term if provided (matches original Node.js behavior)
        String effectiveSearch = search != null ? search : email;

        Page<Application> result;
        if (status != null && effectiveSearch != null) {
            result = applicationRepository.searchByStatus(status, effectiveSearch, pageable);
        } else if (effectiveSearch != null) {
            result = applicationRepository.searchApplications(effectiveSearch, pageable);
        } else if (status != null) {
            result = applicationRepository.findByStatus(status, pageable);
        } else {
            result = applicationRepository.findAll(pageable);
        }

        return new ApplicationListResponse(result.getContent(), result.getTotalElements(), pageNum, pageSize);
    }

    @Transactional
    public Application update(UUID id, UpdateApplicationRequest request) {
        Application app = applicationRepository.findById(id).orElse(null);
        if (app == null) return null;

        if (request.getApplicantFirstName() != null) app.setApplicantFirstName(request.getApplicantFirstName());
        if (request.getApplicantLastName() != null) app.setApplicantLastName(request.getApplicantLastName());
        if (request.getApplicantEmail() != null) app.setApplicantEmail(request.getApplicantEmail());
        if (request.getApplicantPhone() != null) app.setApplicantPhone(request.getApplicantPhone());
        if (request.getApplicantDateOfBirth() != null) app.setApplicantDateOfBirth(request.getApplicantDateOfBirth());
        if (request.getApplicantAnnualIncome() != null) app.setApplicantAnnualIncome(request.getApplicantAnnualIncome());
        if (request.getApplicantEmploymentStatus() != null) app.setApplicantEmploymentStatus(request.getApplicantEmploymentStatus());
        if (request.getApplicantEmployerName() != null) app.setApplicantEmployerName(request.getApplicantEmployerName());
        if (request.getPropertyAddressLine1() != null) app.setPropertyAddressLine1(request.getPropertyAddressLine1());
        if (request.getPropertyAddressLine2() != null) app.setPropertyAddressLine2(request.getPropertyAddressLine2());
        if (request.getPropertyCity() != null) app.setPropertyCity(request.getPropertyCity());
        if (request.getPropertyPostcode() != null) app.setPropertyPostcode(request.getPropertyPostcode());
        if (request.getPropertyCountry() != null) app.setPropertyCountry(request.getPropertyCountry());
        if (request.getPropertyType() != null) app.setPropertyType(request.getPropertyType());
        if (request.getPropertyValue() != null) app.setPropertyValue(request.getPropertyValue());
        if (request.getLoanAmount() != null) app.setLoanAmount(request.getLoanAmount());
        if (request.getLoanTermMonths() != null) app.setLoanTermMonths(request.getLoanTermMonths());
        if (request.getLoanType() != null) app.setLoanType(request.getLoanType());
        if (request.getMonthlyRentOrMortgage() != null) app.setMonthlyRentOrMortgage(request.getMonthlyRentOrMortgage());
        if (request.getMonthlyCreditCommitments() != null) app.setMonthlyCreditCommitments(request.getMonthlyCreditCommitments());
        if (request.getMonthlyLivingCosts() != null) app.setMonthlyLivingCosts(request.getMonthlyLivingCosts());
        if (request.getNumberOfDependants() != null) app.setNumberOfDependants(request.getNumberOfDependants());

        BigDecimal ltvRatio = calculateLtvRatio(app.getPropertyValue(), app.getLoanAmount());
        BigDecimal interestRate = calculateInterestRate(ltvRatio, app.getLoanType());
        BigDecimal monthlyPayment = calculateMonthlyPayment(app.getLoanAmount(), interestRate, app.getLoanTermMonths());

        app.setLtvRatio(ltvRatio);
        app.setInterestRate(interestRate);
        app.setMonthlyPayment(monthlyPayment);
        app.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        Application saved = applicationRepository.save(app);

        emitAuditEvent(id, "application", id,
                "application.updated", "system",
                "{}", "{\"source\":\"api\"}");

        return saved;
    }

    @Transactional
    public Application submit(UUID id) {
        Application app = applicationRepository.findById(id).orElse(null);
        if (app == null) return null;

        if (!"draft".equals(app.getStatus())) {
            throw new ConflictException("Cannot submit application in status: " + app.getStatus());
        }

        // Validate required fields for submission
        if (app.getApplicantAnnualIncome() == null || app.getPropertyValue() == null
                || app.getPropertyAddressLine1() == null || app.getPropertyCity() == null
                || app.getPropertyPostcode() == null) {
            throw new IllegalArgumentException(
                    "Application incomplete — missing required fields for submission");
        }

        app.setStatus("submitted");
        app.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        Application saved = applicationRepository.save(app);

        emitAuditEvent(id, "application", id,
                "application.submitted", "applicant",
                "{\"status\":{\"from\":\"draft\",\"to\":\"submitted\"}}",
                "{\"source\":\"api\"}");

        return saved;
    }

    @Transactional
    public Application decide(UUID id, String decision, String reason, String underwriter) {
        Application app = applicationRepository.findById(id).orElse(null);
        if (app == null) return null;

        if (!"submitted".equals(app.getStatus()) && !"under_review".equals(app.getStatus())) {
            throw new ConflictException("Cannot decide on application in status: " + app.getStatus());
        }

        List<String> validDecisions = List.of("approved", "conditionally_approved", "declined");
        if (!validDecisions.contains(decision)) {
            throw new IllegalArgumentException(
                    "Invalid decision. Must be: approved, conditionally_approved, or declined");
        }

        String previousStatus = app.getStatus();
        app.setStatus(decision);
        app.setDecision(decision);
        app.setDecisionReason(reason);
        app.setAssignedUnderwriter(underwriter);
        app.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        Application saved = applicationRepository.save(app);

        String changes = String.format(
                "{\"status\":{\"from\":\"%s\",\"to\":\"%s\"},\"decision\":\"%s\",\"reason\":\"%s\"}",
                previousStatus, decision, decision, reason.replace("\"", "\\\""));
        emitAuditEvent(id, "application", id,
                "application." + decision, underwriter,
                changes, "{\"source\":\"underwriter_portal\"}");

        return saved;
    }

    public List<AuditEvent> getAuditTrail(UUID applicationId) {
        return auditEventRepository.findByApplicationIdOrderByCreatedAtAsc(applicationId);
    }

    public DashboardStats getDashboardStats() {
        long total = applicationRepository.count();

        Map<String, Long> byStatus = new HashMap<>();
        for (Object[] row : applicationRepository.countByStatusGrouped()) {
            byStatus.put((String) row[0], (Long) row[1]);
        }

        List<Object[]> avgsList = applicationRepository.getAverages();
        Object[] avgs = (avgsList != null && !avgsList.isEmpty()) ? avgsList.get(0) : null;
        double avgLoan = avgs != null && avgs[0] != null ? ((Number) avgs[0]).doubleValue() : 0;
        double avgLtv = avgs != null && avgs[1] != null ? ((Number) avgs[1]).doubleValue() : 0;

        Map<String, Long> affordabilityByVerdict = new HashMap<>();
        for (Object[] row : affordabilityCheckRepository.countByVerdictGrouped()) {
            affordabilityByVerdict.put((String) row[0], (Long) row[1]);
        }

        Double avgDti = affordabilityCheckRepository.getAverageDtiRatio();
        double avgDtiRatio = avgDti != null ? avgDti : 0;

        return new DashboardStats(total, byStatus, avgLoan, avgLtv, affordabilityByVerdict, avgDtiRatio);
    }

    private void emitAuditEvent(UUID applicationId, String entityType, UUID entityId,
                                String action, String actor, String changes, String metadata) {
        AuditEvent event = new AuditEvent();
        event.setId(UUID.randomUUID());
        event.setApplicationId(applicationId);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setAction(action);
        event.setActor(actor);
        event.setChanges(changes);
        event.setMetadata(metadata);
        event.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        auditEventRepository.save(event);
    }

    BigDecimal calculateLtvRatio(BigDecimal propertyValue, BigDecimal loanAmount) {
        if (propertyValue == null || propertyValue.compareTo(BigDecimal.ZERO) == 0) return null;
        return loanAmount.divide(propertyValue, 4, RoundingMode.HALF_UP);
    }

    BigDecimal calculateInterestRate(BigDecimal ltvRatio, String loanType) {
        BigDecimal baseRate = new BigDecimal("0.0425");
        if (ltvRatio != null) {
            if (ltvRatio.compareTo(new BigDecimal("0.9")) > 0) {
                baseRate = baseRate.add(new BigDecimal("0.015"));
            } else if (ltvRatio.compareTo(new BigDecimal("0.8")) > 0) {
                baseRate = baseRate.add(new BigDecimal("0.005"));
            } else if (ltvRatio.compareTo(new BigDecimal("0.6")) <= 0) {
                baseRate = baseRate.subtract(new BigDecimal("0.005"));
            }
        }
        if ("variable".equals(loanType)) baseRate = baseRate.subtract(new BigDecimal("0.003"));
        if ("tracker".equals(loanType)) baseRate = baseRate.subtract(new BigDecimal("0.005"));
        return baseRate.setScale(4, RoundingMode.HALF_UP);
    }

    BigDecimal calculateMonthlyPayment(BigDecimal principal, BigDecimal annualRate, int termMonths) {
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(termMonths), 2, RoundingMode.HALF_UP);
        }
        // P * (r * (1+r)^n) / ((1+r)^n - 1)
        double r = monthlyRate.doubleValue();
        double p = principal.doubleValue();
        int n = termMonths;
        double power = Math.pow(1 + r, n);
        double payment = p * (r * power) / (power - 1);
        return BigDecimal.valueOf(payment).setScale(2, RoundingMode.HALF_UP);
    }
}
