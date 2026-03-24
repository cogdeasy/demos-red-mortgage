package com.hsbc.mortgage.config;

import com.hsbc.mortgage.entity.Application;
import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.entity.Note;
import com.hsbc.mortgage.repository.ApplicationRepository;
import com.hsbc.mortgage.repository.AuditEventRepository;
import com.hsbc.mortgage.repository.NoteRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class DataSeeder {

    @Bean
    @Profile("seed")
    public CommandLineRunner seedData(ApplicationRepository appRepo, AuditEventRepository auditRepo, NoteRepository noteRepo) {
        return args -> {
            if (appRepo.count() > 0) {
                System.out.println("Database already seeded, skipping...");
                return;
            }
            System.out.println("Seeding sample mortgage applications...");

            Object[][] samples = {
                {"Sarah", "Thompson", "s.thompson@gmail.com", "07700100201", 95000, "employed", "Barclays Capital", "42 Victoria Embankment", "London", "EC4Y 0DZ", "flat", 550000, 385000, 300, "fixed", "approved", "approved", "Strong income-to-loan ratio, stable employment at Tier 1 bank", "j.williams@hsbc.co.uk", 14},
                {"David", "Patel", "d.patel@outlook.com", "07700100202", 72000, "employed", "NHS England", "8 Harley Street", "London", "W1G 9QY", "terraced", 425000, 340000, 360, "fixed", "approved", "approved", "Public sector stability, LTV within acceptable range", "j.williams@hsbc.co.uk", 12},
                {"Emma", "Richardson", "e.richardson@proton.me", "07700100203", 110000, "employed", "Deloitte LLP", "1 New Street Square", "London", "EC4A 3HQ", "flat", 720000, 504000, 300, "fixed", "approved", "approved", "High earner, Big 4 employment, acceptable LTV at 70%", "m.chen@hsbc.co.uk", 10},
                {"Michael", "O'Brien", "m.obrien@yahoo.co.uk", "07700100204", 65000, "employed", "Rolls-Royce Holdings", "15 Cathedral Close", "Derby", "DE1 3GP", "semi-detached", 310000, 248000, 300, "fixed", "approved", "approved", "Solid LTV ratio, stable aerospace employer", "j.williams@hsbc.co.uk", 9},
                {"Priya", "Sharma", "p.sharma@gmail.com", "07700100205", 88000, "employed", "AstraZeneca", "22 Silk Road", "Cambridge", "CB2 1TN", "detached", 480000, 288000, 240, "tracker", "approved", "approved", "Excellent LTV of 60%, strong pharma employment", "m.chen@hsbc.co.uk", 8},
                {"James", "Wilson", "j.wilson@live.co.uk", "07700100206", 52000, "employed", "Manchester City Council", "7 Deansgate", "Manchester", "M3 4LQ", "terraced", 280000, 252000, 300, "fixed", "conditionally_approved", "conditionally_approved", "LTV at 90% requires additional documentation — proof of deposit source needed", "j.williams@hsbc.co.uk", 6},
                {"Lucy", "Evans", "l.evans@icloud.com", "07700100207", 78000, "self-employed", "Evans Design Studio Ltd", "31 Park Place", "Cardiff", "CF10 3BS", "flat", 350000, 280000, 300, "variable", "conditionally_approved", "conditionally_approved", "Self-employed — requires 3 years of SA302 tax returns", "m.chen@hsbc.co.uk", 5},
                {"Oliver", "Hughes", "o.hughes@gmail.com", "07700100208", 68000, "employed", "BAE Systems", "14 Farnborough Road", "Farnborough", "GU14 6TF", "semi-detached", 390000, 312000, 300, "fixed", "under_review", null, null, null, 4},
                {"Aisha", "Khan", "a.khan@hotmail.co.uk", "07700100209", 55000, "employed", "University of Birmingham", "9 Edgbaston Park Road", "Birmingham", "B15 2TT", "terraced", 265000, 212000, 360, "fixed", "submitted", null, null, null, 3},
                {"Thomas", "Clarke", "t.clarke@gmail.com", "07700100210", 120000, "employed", "Goldman Sachs International", "25 Shoe Lane", "London", "EC4A 4AU", "flat", 850000, 680000, 300, "fixed", "submitted", null, null, null, 3},
                {"Sophie", "Bennett", "s.bennett@outlook.com", "07700100211", 62000, "employed", "John Lewis Partnership", "3 Cabot Circus", "Bristol", "BS1 3BX", "flat", 295000, 236000, 300, "variable", "under_review", null, null, null, 2},
                {"Raj", "Gupta", "r.gupta@gmail.com", "07700100212", 85000, "contractor", "Cognizant Technology Solutions", "17 Canary Wharf", "London", "E14 5AB", "flat", 520000, 416000, 300, "fixed", "submitted", null, null, null, 2},
                {"Charlotte", "Taylor", "c.taylor@gmail.com", "07700100213", 48000, "employed", "Tesco PLC", "6 Market Square", "Leeds", "LS1 6AE", "terraced", 220000, 176000, 300, "fixed", "draft", null, null, null, 1},
                {"Daniel", "Murphy", "d.murphy@proton.me", "07700100214", 75000, "employed", "BT Group", "81 Newgate Street", "London", "EC1A 7AJ", "flat", 450000, 360000, 300, "tracker", "draft", null, null, null, 1},
                {"Fiona", "MacLeod", "f.macleod@gmail.com", "07700100215", 92000, "employed", "Royal Bank of Scotland", "36 St Andrew Square", "Edinburgh", "EH2 2YB", "detached", 380000, 266000, 240, "fixed", "draft", null, null, null, 0},
                {"Mark", "Stevens", "m.stevens@yahoo.co.uk", "07700100216", 32000, "employed", "Wetherspoons", "44 High Street", "Watford", "WD17 2BS", "flat", 250000, 237500, 360, "fixed", "declined", "declined", "LTV exceeds 95%, income-to-loan ratio too high at 7.4x", "j.williams@hsbc.co.uk", 7},
                {"Hannah", "Roberts", "h.roberts@gmail.com", "07700100217", 58000, "employed", "Airbus UK", "12 Broughton Lane", "Chester", "CH4 0DR", "semi-detached", 320000, 256000, 300, "fixed", "approved", "approved", "Solid employment, LTV at 80% acceptable with income level", "m.chen@hsbc.co.uk", 11},
                {"William", "Foster", "w.foster@outlook.com", "07700100218", 145000, "employed", "McKinsey & Company", "1 Jermyn Street", "London", "SW1Y 4UH", "flat", 950000, 665000, 300, "fixed", "approved", "approved", "High earner, LTV 70%, premium consulting firm employment", "j.williams@hsbc.co.uk", 15},
                {"Amara", "Osei", "a.osei@gmail.com", "07700100219", 67000, "employed", "Transport for London", "55 Broadway", "London", "SW1H 0BD", "flat", 380000, 304000, 300, "fixed", "submitted", null, null, null, 1},
                {"George", "Wright", "g.wright@icloud.com", "07700100220", 82000, "employed", "Jaguar Land Rover", "28 Corporation Street", "Coventry", "CV1 1GF", "detached", 410000, 328000, 300, "tracker", "under_review", null, null, null, 3},
            };

            for (Object[] s : samples) {
                UUID id = UUID.randomUUID();
                int propertyVal = (int) s[11];
                int loanAmt = (int) s[12];
                int termMonths = (int) s[13];
                String loanType = (String) s[14];

                BigDecimal propValue = BigDecimal.valueOf(propertyVal);
                BigDecimal loan = BigDecimal.valueOf(loanAmt);
                BigDecimal ltv = loan.divide(propValue, 4, RoundingMode.HALF_UP);
                BigDecimal rate = calcRate(ltv, loanType);
                BigDecimal payment = calcPayment(loan, rate, termMonths);
                int daysAgo = (int) s[19];
                OffsetDateTime created = OffsetDateTime.now(ZoneOffset.UTC).minusDays(daysAgo);

                Application app = new Application();
                app.setId(id);
                app.setApplicantFirstName((String) s[0]);
                app.setApplicantLastName((String) s[1]);
                app.setApplicantEmail((String) s[2]);
                app.setApplicantPhone((String) s[3]);
                app.setApplicantAnnualIncome(BigDecimal.valueOf((int) s[4]));
                app.setApplicantEmploymentStatus((String) s[5]);
                app.setApplicantEmployerName((String) s[6]);
                app.setPropertyAddressLine1((String) s[7]);
                app.setPropertyCity((String) s[8]);
                app.setPropertyPostcode((String) s[9]);
                app.setPropertyCountry("United Kingdom");
                app.setPropertyType((String) s[10]);
                app.setPropertyValue(propValue);
                app.setLoanAmount(loan);
                app.setLoanTermMonths(termMonths);
                app.setLoanType(loanType);
                app.setInterestRate(rate);
                app.setLtvRatio(ltv);
                app.setMonthlyPayment(payment);
                app.setStatus((String) s[15]);
                app.setDecision((String) s[16]);
                app.setDecisionReason((String) s[17]);
                app.setAssignedUnderwriter((String) s[18]);
                app.setCreatedAt(created);
                app.setUpdatedAt(created);
                appRepo.save(app);

                AuditEvent audit = new AuditEvent();
                audit.setId(UUID.randomUUID());
                audit.setApplicationId(id);
                audit.setEntityType("application");
                audit.setEntityId(id);
                audit.setAction("application.created");
                audit.setActor("system");
                audit.setChanges("{\"status\":{\"from\":null,\"to\":\"draft\"}}");
                audit.setMetadata("{\"source\":\"seed\"}");
                audit.setCreatedAt(created);
                auditRepo.save(audit);

                if (!"draft".equals(s[15])) {
                    AuditEvent submit = new AuditEvent();
                    submit.setId(UUID.randomUUID());
                    submit.setApplicationId(id);
                    submit.setEntityType("application");
                    submit.setEntityId(id);
                    submit.setAction("application.submitted");
                    submit.setActor("applicant");
                    submit.setChanges("{\"status\":{\"from\":\"draft\",\"to\":\"submitted\"}}");
                    submit.setMetadata("{\"source\":\"api\"}");
                    submit.setCreatedAt(created.plusHours(1));
                    auditRepo.save(submit);
                }

                if (s[16] != null) {
                    AuditEvent decide = new AuditEvent();
                    decide.setId(UUID.randomUUID());
                    decide.setApplicationId(id);
                    decide.setEntityType("application");
                    decide.setEntityId(id);
                    decide.setAction("application." + s[16]);
                    decide.setActor(s[18] != null ? (String) s[18] : "system");
                    decide.setChanges(String.format("{\"status\":{\"from\":\"submitted\",\"to\":\"%s\"}}", s[16]));
                    decide.setMetadata("{\"source\":\"underwriter_portal\"}");
                    decide.setCreatedAt(created.plusHours(2));
                    auditRepo.save(decide);
                }
            }

            // Sample notes for non-draft applications
            String[][] sampleNotes = {
                {"Initial review completed. Income documentation verified.", "general", "j.williams@hsbc.co.uk"},
                {"LTV ratio is borderline. Requesting additional valuation.", "condition", "m.chen@hsbc.co.uk"},
                {"Applicant called to discuss terms. Prefers fixed rate.", "follow_up", "j.williams@hsbc.co.uk"},
                {"Credit check returned satisfactory results.", "general", "m.chen@hsbc.co.uk"},
                {"Employment verification pending from HR department.", "internal", "j.williams@hsbc.co.uk"},
                {"Property survey scheduled for next week.", "follow_up", "m.chen@hsbc.co.uk"},
            };

            int noteIdx = 0;
            int totalNotes = 0;
            // Re-iterate to add notes — we need to re-query saved apps
            for (Application savedApp : appRepo.findAll()) {
                if ("draft".equals(savedApp.getStatus())) continue;
                int notesCount = 1 + (noteIdx % 3); // 1, 2, or 3 notes per app
                for (int n = 0; n < notesCount; n++) {
                    String[] noteData = sampleNotes[(noteIdx + n) % sampleNotes.length];
                    UUID noteId = UUID.randomUUID();
                    OffsetDateTime noteTime = savedApp.getCreatedAt().plusHours(3 + n);

                    Note note = new Note();
                    note.setId(noteId);
                    note.setApplicationId(savedApp.getId());
                    note.setContent(noteData[0]);
                    note.setNoteType(noteData[1]);
                    note.setAuthor(noteData[2]);
                    note.setCreatedAt(noteTime);
                    noteRepo.save(note);

                    AuditEvent noteAudit = new AuditEvent();
                    noteAudit.setId(UUID.randomUUID());
                    noteAudit.setApplicationId(savedApp.getId());
                    noteAudit.setEntityType("note");
                    noteAudit.setEntityId(noteId);
                    noteAudit.setAction("note.created");
                    noteAudit.setActor(noteData[2]);
                    noteAudit.setChanges(String.format("{\"content\":\"%s\",\"note_type\":\"%s\"}",
                            noteData[0].replace("\"", "\\\""), noteData[1]));
                    noteAudit.setMetadata("{\"source\":\"seed\"}");
                    noteAudit.setCreatedAt(noteTime);
                    auditRepo.save(noteAudit);
                    totalNotes++;
                }
                noteIdx++;
            }

            System.out.println("Seeded " + samples.length + " sample applications and " + totalNotes + " notes");
        };
    }

    private BigDecimal calcRate(BigDecimal ltv, String loanType) {
        BigDecimal base = new BigDecimal("0.0425");
        if (ltv.compareTo(new BigDecimal("0.9")) > 0) base = base.add(new BigDecimal("0.015"));
        else if (ltv.compareTo(new BigDecimal("0.8")) > 0) base = base.add(new BigDecimal("0.005"));
        else if (ltv.compareTo(new BigDecimal("0.6")) <= 0) base = base.subtract(new BigDecimal("0.005"));
        if ("variable".equals(loanType)) base = base.subtract(new BigDecimal("0.003"));
        if ("tracker".equals(loanType)) base = base.subtract(new BigDecimal("0.005"));
        return base.setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal calcPayment(BigDecimal principal, BigDecimal annualRate, int termMonths) {
        double r = annualRate.doubleValue() / 12;
        double p = principal.doubleValue();
        if (r == 0) return principal.divide(BigDecimal.valueOf(termMonths), 2, RoundingMode.HALF_UP);
        double power = Math.pow(1 + r, termMonths);
        double payment = p * (r * power) / (power - 1);
        return BigDecimal.valueOf(payment).setScale(2, RoundingMode.HALF_UP);
    }
}
