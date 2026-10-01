package cm.indyli.timeflow.billing.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.billing.application.BillingDetailItem;
import cm.indyli.timeflow.billing.application.BillingExportService;
import cm.indyli.timeflow.billing.application.BillingOverview;
import cm.indyli.timeflow.billing.application.BillingService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing")
@PreAuthorize("hasAnyRole('COLLABORATOR', 'TRAINER', 'MANAGER', 'DIRECTION', 'ADMIN')")
public class BillingController {

    private final BillingService billingService;
    private final BillingExportService exportService;
    private final CurrentUserService currentUserService;

    public BillingController(BillingService billingService,
                             BillingExportService exportService,
                             CurrentUserService currentUserService) {
        this.billingService = billingService;
        this.exportService = exportService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/overview")
    public BillingOverview getOverview(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) UUID projectId,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        return billingService.getOverview(principal, period, userId, projectId);
    }

    @GetMapping("/details")
    public List<BillingDetailItem> getDetails(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) UUID projectId,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        return billingService.getDetails(principal, period, userId, projectId);
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) UUID projectId,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        BillingOverview overview = billingService.getOverview(principal, period, userId, projectId);
        List<BillingDetailItem> details = billingService.getDetails(principal, period, userId, projectId);
        byte[] bytes = exportService.generateExcel(overview, details);

        String filename = "facturation-" + (period != null && !period.isBlank() ? period : "courant") + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) UUID projectId,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        BillingOverview overview = billingService.getOverview(principal, period, userId, projectId);
        List<BillingDetailItem> details = billingService.getDetails(principal, period, userId, projectId);
        byte[] bytes = exportService.generateCsv(overview, details);

        String filename = "facturation-" + (period != null && !period.isBlank() ? period : "courant") + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }
}
