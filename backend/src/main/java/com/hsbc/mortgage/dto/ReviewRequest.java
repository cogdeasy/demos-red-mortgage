package com.hsbc.mortgage.dto;

import jakarta.validation.constraints.NotBlank;

public class ReviewRequest {

    @NotBlank
    private String underwriter;

    public String getUnderwriter() { return underwriter; }
    public void setUnderwriter(String underwriter) { this.underwriter = underwriter; }
}
