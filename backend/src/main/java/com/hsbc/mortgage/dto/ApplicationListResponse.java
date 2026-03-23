package com.hsbc.mortgage.dto;

import com.hsbc.mortgage.entity.Application;
import java.util.List;

public class ApplicationListResponse {

    private List<Application> data;
    private long total;
    private int page;
    private int limit;

    public ApplicationListResponse() {}

    public ApplicationListResponse(List<Application> data, long total, int page, int limit) {
        this.data = data;
        this.total = total;
        this.page = page;
        this.limit = limit;
    }

    public List<Application> getData() { return data; }
    public void setData(List<Application> data) { this.data = data; }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getLimit() { return limit; }
    public void setLimit(int limit) { this.limit = limit; }
}
