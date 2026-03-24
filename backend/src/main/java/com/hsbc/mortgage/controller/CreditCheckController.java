package com.hsbc.mortgage.controller;

import com.hsbc.mortgage.entity.Application;
import com.hsbc.mortgage.entity.CreditCheck;
import com.hsbc.mortgage.service.ApplicationService;
import com.hsbc.mortgage.service.CreditCheckService;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applications/{applicationId}/credit-check")
public class CreditCheckController {

    private final CreditCheckService creditCheckService;
    private final ApplicationService applicationService;

    public CreditCheckController(CreditCheckService creditCheckService,
                                  ApplicationService applicationService) {
        this.creditCheckService = creditCheckService;
        this.applicationService = applicationService;
    }

    @GetMapping
    public ResponseEntity<Object> get(@PathVariable UUID applicationId) {
        Optional<CreditCheck> check = creditCheckService.getByApplicationId(applicationId);
        if (check.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "No credit check found for this application"));
        }
        return ResponseEntity.ok(check.get());
    }

    @PostMapping
    public ResponseEntity<Object> trigger(@PathVariable UUID applicationId) {
        Optional<Application> appOpt = applicationService.getById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Application not found"));
        }

        Application app = appOpt.get();
        if (app.getApplicantAnnualIncome() == null || app.getPropertyValue() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Application missing required fields for credit check: annual income and property value"));
        }

        CreditCheck result = creditCheckService.runCheck(
                applicationId,
                app.getApplicantAnnualIncome(),
                app.getApplicantEmploymentStatus() != null ? app.getApplicantEmploymentStatus() : "unknown",
                app.getLoanAmount(),
                app.getPropertyValue()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }
}
