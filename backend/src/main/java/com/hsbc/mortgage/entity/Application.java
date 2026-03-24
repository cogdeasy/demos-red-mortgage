package com.hsbc.mortgage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "applications")
public class Application {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "applicant_first_name", nullable = false, length = 100)
    private String applicantFirstName;

    @Column(name = "applicant_last_name", nullable = false, length = 100)
    private String applicantLastName;

    @Column(name = "applicant_email", nullable = false, length = 255)
    private String applicantEmail;

    @Column(name = "applicant_phone", length = 20)
    private String applicantPhone;

    @Column(name = "applicant_date_of_birth")
    private String applicantDateOfBirth;

    @Column(name = "applicant_annual_income", precision = 15, scale = 2)
    private BigDecimal applicantAnnualIncome;

    @Column(name = "applicant_employment_status", length = 50)
    private String applicantEmploymentStatus;

    @Column(name = "applicant_employer_name", length = 200)
    private String applicantEmployerName;

    @Column(name = "property_address_line1", length = 255)
    private String propertyAddressLine1;

    @Column(name = "property_address_line2", length = 255)
    private String propertyAddressLine2;

    @Column(name = "property_city", length = 100)
    private String propertyCity;

    @Column(name = "property_postcode", length = 20)
    private String propertyPostcode;

    @Column(name = "property_country", length = 100)
    private String propertyCountry = "United Kingdom";

    @Column(name = "property_type", length = 50)
    private String propertyType;

    @Column(name = "property_value", precision = 15, scale = 2)
    private BigDecimal propertyValue;

    @Column(name = "loan_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal loanAmount;

    @Column(name = "loan_term_months", nullable = false)
    private Integer loanTermMonths;

    @Column(name = "loan_type", nullable = false, length = 50)
    private String loanType = "fixed";

    @Column(name = "interest_rate", precision = 5, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "ltv_ratio", precision = 5, scale = 4)
    private BigDecimal ltvRatio;

    @Column(name = "monthly_payment", precision = 15, scale = 2)
    private BigDecimal monthlyPayment;

    @Column(name = "status", nullable = false, length = 50)
    private String status = "draft";

    @Column(name = "decision", length = 50)
    private String decision;

    @Column(name = "decision_reason", columnDefinition = "TEXT")
    private String decisionReason;

    @Column(name = "assigned_underwriter", length = 100)
    private String assignedUnderwriter;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public Application() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getApplicantFirstName() { return applicantFirstName; }
    public void setApplicantFirstName(String applicantFirstName) { this.applicantFirstName = applicantFirstName; }

    public String getApplicantLastName() { return applicantLastName; }
    public void setApplicantLastName(String applicantLastName) { this.applicantLastName = applicantLastName; }

    public String getApplicantEmail() { return applicantEmail; }
    public void setApplicantEmail(String applicantEmail) { this.applicantEmail = applicantEmail; }

    public String getApplicantPhone() { return applicantPhone; }
    public void setApplicantPhone(String applicantPhone) { this.applicantPhone = applicantPhone; }

    public String getApplicantDateOfBirth() { return applicantDateOfBirth; }
    public void setApplicantDateOfBirth(String applicantDateOfBirth) { this.applicantDateOfBirth = applicantDateOfBirth; }

    public BigDecimal getApplicantAnnualIncome() { return applicantAnnualIncome; }
    public void setApplicantAnnualIncome(BigDecimal applicantAnnualIncome) { this.applicantAnnualIncome = applicantAnnualIncome; }

    public String getApplicantEmploymentStatus() { return applicantEmploymentStatus; }
    public void setApplicantEmploymentStatus(String applicantEmploymentStatus) { this.applicantEmploymentStatus = applicantEmploymentStatus; }

    public String getApplicantEmployerName() { return applicantEmployerName; }
    public void setApplicantEmployerName(String applicantEmployerName) { this.applicantEmployerName = applicantEmployerName; }

    public String getPropertyAddressLine1() { return propertyAddressLine1; }
    public void setPropertyAddressLine1(String propertyAddressLine1) { this.propertyAddressLine1 = propertyAddressLine1; }

    public String getPropertyAddressLine2() { return propertyAddressLine2; }
    public void setPropertyAddressLine2(String propertyAddressLine2) { this.propertyAddressLine2 = propertyAddressLine2; }

    public String getPropertyCity() { return propertyCity; }
    public void setPropertyCity(String propertyCity) { this.propertyCity = propertyCity; }

    public String getPropertyPostcode() { return propertyPostcode; }
    public void setPropertyPostcode(String propertyPostcode) { this.propertyPostcode = propertyPostcode; }

    public String getPropertyCountry() { return propertyCountry; }
    public void setPropertyCountry(String propertyCountry) { this.propertyCountry = propertyCountry; }

    public String getPropertyType() { return propertyType; }
    public void setPropertyType(String propertyType) { this.propertyType = propertyType; }

    public BigDecimal getPropertyValue() { return propertyValue; }
    public void setPropertyValue(BigDecimal propertyValue) { this.propertyValue = propertyValue; }

    public BigDecimal getLoanAmount() { return loanAmount; }
    public void setLoanAmount(BigDecimal loanAmount) { this.loanAmount = loanAmount; }

    public Integer getLoanTermMonths() { return loanTermMonths; }
    public void setLoanTermMonths(Integer loanTermMonths) { this.loanTermMonths = loanTermMonths; }

    public String getLoanType() { return loanType; }
    public void setLoanType(String loanType) { this.loanType = loanType; }

    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }

    public BigDecimal getLtvRatio() { return ltvRatio; }
    public void setLtvRatio(BigDecimal ltvRatio) { this.ltvRatio = ltvRatio; }

    public BigDecimal getMonthlyPayment() { return monthlyPayment; }
    public void setMonthlyPayment(BigDecimal monthlyPayment) { this.monthlyPayment = monthlyPayment; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }

    public String getDecisionReason() { return decisionReason; }
    public void setDecisionReason(String decisionReason) { this.decisionReason = decisionReason; }

    public String getAssignedUnderwriter() { return assignedUnderwriter; }
    public void setAssignedUnderwriter(String assignedUnderwriter) { this.assignedUnderwriter = assignedUnderwriter; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
