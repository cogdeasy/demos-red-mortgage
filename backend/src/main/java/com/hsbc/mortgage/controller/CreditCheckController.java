package com.hsbc.mortgage.controller;

import com.hsbc.mortgage.entity.Application;
import com.hsbc.mortgage.entity.CreditCheck;
import com.hsbc.mortgage.exception.NotFoundException;
import com.hsbc.mortgage.service.ApplicationService;
import com.hsbc.mortgage.service.CreditCheckService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applications")
public class CreditCheckController {

    private final CreditCheckService creditCheckService;
    private final ApplicationService applicationService;

    public CreditCheckController(CreditCheckService creditCheckService,
                                 ApplicationService applicationService) {
        this.creditCheckService = creditCheckService;
        this.applicationService = applicationService;
    }

    @PostMapping("/{id}/credit-check")
    public ResponseEntity<Object> runCreditCheck(@PathVariable UUID id) {
        Application application = applicationService.getById(id)
                .orElseThrow(() -> new NotFoundException("Application not found"));

        if ("draft".equals(application.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Cannot run credit check on a draft application. Submit the application first."));
        }

        if (application.getApplicantAnnualIncome() == null
                || application.getApplicantEmploymentStatus() == null
                || application.getPropertyValue() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Application is missing required fields for credit check: annual income, employment status, and property value"));
        }

        CreditCheck result = creditCheckService.runCheck(
                application.getId(),
                application.getApplicantAnnualIncome(),
                application.getApplicantEmploymentStatus(),
                application.getLoanAmount(),
                application.getPropertyValue());

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/{id}/credit-check")
    public ResponseEntity<Object> getCreditCheck(@PathVariable UUID id) {
        applicationService.getById(id)
                .orElseThrow(() -> new NotFoundException("Application not found"));

        CreditCheck creditCheck = creditCheckService.getByApplicationId(id)
                .orElseThrow(() -> new NotFoundException("No credit check found for this application"));

        return ResponseEntity.ok(creditCheck);
    }
}
