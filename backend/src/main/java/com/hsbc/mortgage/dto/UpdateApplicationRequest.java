package com.hsbc.mortgage.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public class UpdateApplicationRequest {

    @Size(min = 1, max = 100)
    private String applicantFirstName;

    @Size(min = 1, max = 100)
    private String applicantLastName;

    @Email @Size(max = 255)
    private String applicantEmail;

    @Size(max = 20)
    private String applicantPhone;

    private String applicantDateOfBirth;

    @Positive
    private BigDecimal applicantAnnualIncome;

    @Size(max = 50)
    private String applicantEmploymentStatus;

    @Size(max = 200)
    private String applicantEmployerName;

    @Size(max = 255)
    private String propertyAddressLine1;

    @Size(max = 255)
    private String propertyAddressLine2;

    @Size(max = 100)
    private String propertyCity;

    @Size(max = 20)
    private String propertyPostcode;

    @Size(max = 100)
    private String propertyCountry;

    @Size(max = 50)
    private String propertyType;

    @Positive
    private BigDecimal propertyValue;

    @Positive
    private BigDecimal loanAmount;

    @Min(12) @Max(480)
    private Integer loanTermMonths;

    @Size(max = 50)
    private String loanType;

    public String getApplicantFirstName() { return applicantFirstName; }
    public void setApplicantFirstName(String v) { this.applicantFirstName = v; }

    public String getApplicantLastName() { return applicantLastName; }
    public void setApplicantLastName(String v) { this.applicantLastName = v; }

    public String getApplicantEmail() { return applicantEmail; }
    public void setApplicantEmail(String v) { this.applicantEmail = v; }

    public String getApplicantPhone() { return applicantPhone; }
    public void setApplicantPhone(String v) { this.applicantPhone = v; }

    public String getApplicantDateOfBirth() { return applicantDateOfBirth; }
    public void setApplicantDateOfBirth(String v) { this.applicantDateOfBirth = v; }

    public BigDecimal getApplicantAnnualIncome() { return applicantAnnualIncome; }
    public void setApplicantAnnualIncome(BigDecimal v) { this.applicantAnnualIncome = v; }

    public String getApplicantEmploymentStatus() { return applicantEmploymentStatus; }
    public void setApplicantEmploymentStatus(String v) { this.applicantEmploymentStatus = v; }

    public String getApplicantEmployerName() { return applicantEmployerName; }
    public void setApplicantEmployerName(String v) { this.applicantEmployerName = v; }

    public String getPropertyAddressLine1() { return propertyAddressLine1; }
    public void setPropertyAddressLine1(String v) { this.propertyAddressLine1 = v; }

    public String getPropertyAddressLine2() { return propertyAddressLine2; }
    public void setPropertyAddressLine2(String v) { this.propertyAddressLine2 = v; }

    public String getPropertyCity() { return propertyCity; }
    public void setPropertyCity(String v) { this.propertyCity = v; }

    public String getPropertyPostcode() { return propertyPostcode; }
    public void setPropertyPostcode(String v) { this.propertyPostcode = v; }

    public String getPropertyCountry() { return propertyCountry; }
    public void setPropertyCountry(String v) { this.propertyCountry = v; }

    public String getPropertyType() { return propertyType; }
    public void setPropertyType(String v) { this.propertyType = v; }

    public BigDecimal getPropertyValue() { return propertyValue; }
    public void setPropertyValue(BigDecimal v) { this.propertyValue = v; }

    public BigDecimal getLoanAmount() { return loanAmount; }
    public void setLoanAmount(BigDecimal v) { this.loanAmount = v; }

    public Integer getLoanTermMonths() { return loanTermMonths; }
    public void setLoanTermMonths(Integer v) { this.loanTermMonths = v; }

    public String getLoanType() { return loanType; }
    public void setLoanType(String v) { this.loanType = v; }
}
