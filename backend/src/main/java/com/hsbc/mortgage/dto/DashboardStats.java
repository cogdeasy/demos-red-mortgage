package com.hsbc.mortgage.dto;

import java.util.Map;

public class DashboardStats {

    private long total;
    private Map<String, Long> byStatus;
    private double avgLoanAmount;
    private double avgLtv;
    private Map<String, Long> affordabilityByVerdict;
    private double avgDtiRatio;

    public DashboardStats() {}

    public DashboardStats(long total, Map<String, Long> byStatus, double avgLoanAmount, double avgLtv,
                          Map<String, Long> affordabilityByVerdict, double avgDtiRatio) {
        this.total = total;
        this.byStatus = byStatus;
        this.avgLoanAmount = avgLoanAmount;
        this.avgLtv = avgLtv;
        this.affordabilityByVerdict = affordabilityByVerdict;
        this.avgDtiRatio = avgDtiRatio;
    }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }

    public Map<String, Long> getByStatus() { return byStatus; }
    public void setByStatus(Map<String, Long> byStatus) { this.byStatus = byStatus; }

    public double getAvgLoanAmount() { return avgLoanAmount; }
    public void setAvgLoanAmount(double avgLoanAmount) { this.avgLoanAmount = avgLoanAmount; }

    public double getAvgLtv() { return avgLtv; }
    public void setAvgLtv(double avgLtv) { this.avgLtv = avgLtv; }

    public Map<String, Long> getAffordabilityByVerdict() { return affordabilityByVerdict; }
    public void setAffordabilityByVerdict(Map<String, Long> affordabilityByVerdict) { this.affordabilityByVerdict = affordabilityByVerdict; }

    public double getAvgDtiRatio() { return avgDtiRatio; }
    public void setAvgDtiRatio(double avgDtiRatio) { this.avgDtiRatio = avgDtiRatio; }
}
