package com.hsbc.mortgage.dto;

import jakarta.validation.constraints.NotBlank;

public class DecideRequest {

    @NotBlank
    private String decision;

    @NotBlank
    private String reason;

    @NotBlank
    private String underwriter;

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getUnderwriter() { return underwriter; }
    public void setUnderwriter(String underwriter) { this.underwriter = underwriter; }
}
