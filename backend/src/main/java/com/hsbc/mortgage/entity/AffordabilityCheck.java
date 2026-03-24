package com.hsbc.mortgage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "affordability_checks")
public class AffordabilityCheck {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "application_id", nullable = false, unique = true, columnDefinition = "uuid")
    private UUID applicationId;

    @Column(name = "gross_monthly_income", nullable = false, precision = 15, scale = 2)
    private BigDecimal grossMonthlyIncome;

    @Column(name = "declared_monthly_outgoings", nullable = false, precision = 15, scale = 2)
    private BigDecimal declaredMonthlyOutgoings;

    @Column(name = "mortgage_payment_current", nullable = false, precision = 15, scale = 2)
    private BigDecimal mortgagePaymentCurrent;

    @Column(name = "mortgage_payment_stressed", nullable = false, precision = 15, scale = 2)
    private BigDecimal mortgagePaymentStressed;

    @Column(name = "dti_ratio_current", nullable = false, precision = 5, scale = 4)
    private BigDecimal dtiRatioCurrent;

    @Column(name = "dti_ratio_stressed", nullable = false, precision = 5, scale = 4)
    private BigDecimal dtiRatioStressed;

    @Column(name = "verdict", nullable = false, length = 20)
    private String verdict;

    @Column(name = "verdict_reason", columnDefinition = "TEXT")
    private String verdictReason;

    @Column(name = "checked_at", nullable = false)
    private OffsetDateTime checkedAt;

    public AffordabilityCheck() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getApplicationId() { return applicationId; }
    public void setApplicationId(UUID applicationId) { this.applicationId = applicationId; }

    public BigDecimal getGrossMonthlyIncome() { return grossMonthlyIncome; }
    public void setGrossMonthlyIncome(BigDecimal grossMonthlyIncome) { this.grossMonthlyIncome = grossMonthlyIncome; }

    public BigDecimal getDeclaredMonthlyOutgoings() { return declaredMonthlyOutgoings; }
    public void setDeclaredMonthlyOutgoings(BigDecimal declaredMonthlyOutgoings) { this.declaredMonthlyOutgoings = declaredMonthlyOutgoings; }

    public BigDecimal getMortgagePaymentCurrent() { return mortgagePaymentCurrent; }
    public void setMortgagePaymentCurrent(BigDecimal mortgagePaymentCurrent) { this.mortgagePaymentCurrent = mortgagePaymentCurrent; }

    public BigDecimal getMortgagePaymentStressed() { return mortgagePaymentStressed; }
    public void setMortgagePaymentStressed(BigDecimal mortgagePaymentStressed) { this.mortgagePaymentStressed = mortgagePaymentStressed; }

    public BigDecimal getDtiRatioCurrent() { return dtiRatioCurrent; }
    public void setDtiRatioCurrent(BigDecimal dtiRatioCurrent) { this.dtiRatioCurrent = dtiRatioCurrent; }

    public BigDecimal getDtiRatioStressed() { return dtiRatioStressed; }
    public void setDtiRatioStressed(BigDecimal dtiRatioStressed) { this.dtiRatioStressed = dtiRatioStressed; }

    public String getVerdict() { return verdict; }
    public void setVerdict(String verdict) { this.verdict = verdict; }

    public String getVerdictReason() { return verdictReason; }
    public void setVerdictReason(String verdictReason) { this.verdictReason = verdictReason; }

    public OffsetDateTime getCheckedAt() { return checkedAt; }
    public void setCheckedAt(OffsetDateTime checkedAt) { this.checkedAt = checkedAt; }
}
