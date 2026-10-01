package cm.indyli.timeflow.analytics.api;

import cm.indyli.timeflow.analytics.application.AnalyticsOverview;
import cm.indyli.timeflow.analytics.application.AnalyticsService;
import cm.indyli.timeflow.auth.application.CurrentUserService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@PreAuthorize("isAuthenticated()")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final CurrentUserService currentUserService;

    public AnalyticsController(AnalyticsService analyticsService, CurrentUserService currentUserService) {
        this.analyticsService = analyticsService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/overview")
    public AnalyticsOverview getOverview(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) UUID projectId,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        return analyticsService.getOverview(principal, period, userId, projectId);
    }
}
