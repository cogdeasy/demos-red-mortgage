package com.hsbc.mortgage.controller;

import com.hsbc.mortgage.dto.ApplicationListResponse;
import com.hsbc.mortgage.dto.CreateApplicationRequest;
import com.hsbc.mortgage.dto.DashboardStats;
import com.hsbc.mortgage.dto.DecideRequest;
import com.hsbc.mortgage.dto.ReviewRequest;
import com.hsbc.mortgage.dto.UpdateApplicationRequest;
import com.hsbc.mortgage.entity.Application;
import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.service.ApplicationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @GetMapping
    public ResponseEntity<ApplicationListResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String search,
            @RequestParam(name = "sort_by", required = false) String sortBy,
            @RequestParam(name = "sort_order", required = false) String sortOrder,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(applicationService.list(status, email, search, sortBy, sortOrder, page, limit));
    }

    @GetMapping("/stats")
    public ResponseEntity<DashboardStats> stats() {
        return ResponseEntity.ok(applicationService.getDashboardStats());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getById(@PathVariable UUID id) {
        return applicationService.getById(id)
                .<ResponseEntity<Object>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Application not found")));
    }

    @PostMapping
    public ResponseEntity<Application> create(@Valid @RequestBody CreateApplicationRequest request) {
        Application app = applicationService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(app);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable UUID id,
                                         @Valid @RequestBody UpdateApplicationRequest request) {
        Application app = applicationService.update(id, request);
        if (app == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Application not found"));
        }
        return ResponseEntity.ok(app);
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<Object> submit(@PathVariable UUID id) {
        Application app = applicationService.submit(id);
        if (app == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Application not found"));
        }
        return ResponseEntity.ok(app);
    }

    @PostMapping("/{id}/decide")
    public ResponseEntity<Object> decide(@PathVariable UUID id,
                                         @Valid @RequestBody DecideRequest request) {
        if (request.getDecision() == null || request.getReason() == null || request.getUnderwriter() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Missing required fields: decision, reason, underwriter"));
        }
        List<String> validDecisions = List.of("approved", "conditionally_approved", "declined");
        if (!validDecisions.contains(request.getDecision())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid decision. Must be: approved, conditionally_approved, or declined"));
        }
        Application app = applicationService.decide(id, request.getDecision(),
                request.getReason(), request.getUnderwriter());
        if (app == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Application not found"));
        }
        return ResponseEntity.ok(app);
    }

    @PostMapping("/{id}/withdraw")
    public ResponseEntity<Object> withdraw(@PathVariable UUID id) {
        Application app = applicationService.withdraw(id);
        if (app == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Application not found"));
        }
        return ResponseEntity.ok(app);
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<Object> startReview(@PathVariable UUID id,
                                               @Valid @RequestBody ReviewRequest request) {
        Application app = applicationService.startReview(id, request.getUnderwriter());
        if (app == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Application not found"));
        }
        return ResponseEntity.ok(app);
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<Map<String, List<AuditEvent>>> audit(@PathVariable UUID id) {
        return ResponseEntity.ok(Map.of("data", applicationService.getAuditTrail(id)));
    }
}
