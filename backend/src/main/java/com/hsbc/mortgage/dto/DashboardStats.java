package com.hsbc.mortgage.dto;

import java.util.Map;

public class DashboardStats {

    private long total;
    private Map<String, Long> byStatus;
    private double avgLoanAmount;
    private double avgLtv;

    public DashboardStats() {}

    public DashboardStats(long total, Map<String, Long> byStatus, double avgLoanAmount, double avgLtv) {
        this.total = total;
        this.byStatus = byStatus;
        this.avgLoanAmount = avgLoanAmount;
        this.avgLtv = avgLtv;
    }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }

    public Map<String, Long> getByStatus() { return byStatus; }
    public void setByStatus(Map<String, Long> byStatus) { this.byStatus = byStatus; }

    public double getAvgLoanAmount() { return avgLoanAmount; }
    public void setAvgLoanAmount(double avgLoanAmount) { this.avgLoanAmount = avgLoanAmount; }

    public double getAvgLtv() { return avgLtv; }
    public void setAvgLtv(double avgLtv) { this.avgLtv = avgLtv; }
}
