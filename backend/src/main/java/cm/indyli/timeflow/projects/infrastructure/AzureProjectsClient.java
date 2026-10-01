package cm.indyli.timeflow.projects.infrastructure;

import cm.indyli.timeflow.projects.domain.RemoteProject;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AzureProjectsClient {
    private final String organization;
    private final String pat;
    private final RestClient client;

    @org.springframework.beans.factory.annotation.Autowired
    public AzureProjectsClient(@Value("${timeflow.azure.organization:}") String organization,
                               @Value("${timeflow.azure.pat:}") String pat) {
        this(organization, pat, builder());
    }

    AzureProjectsClient(String organization, String pat, RestClient.Builder builder) {
        this.organization = organization;
        this.pat = pat;
        this.client = builder.baseUrl("https://dev.azure.com").build();
    }

    private static RestClient.Builder builder() {
        var http = java.net.http.HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
                .followRedirects(java.net.http.HttpClient.Redirect.NEVER).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(20));
        return RestClient.builder().requestFactory(factory);
    }

    public boolean configured() {
        return organization.matches("[A-Za-z0-9][A-Za-z0-9-]{0,99}") && !pat.isBlank();
    }

    public String organization() {
        return organization;
    }

    public List<RemoteProject> fetchAll() {
        if (!configured()) throw new IllegalStateException("Integration unavailable");
        var projects = new ArrayList<RemoteProject>();
        var tokens = new HashSet<String>();
        var ids = new HashSet<UUID>();
        String token = null;
        do {
            final String continuation = token;
            var response = client.get().uri(uri -> {
                var target = uri.pathSegment(organization, "_apis", "projects")
                        .queryParam("api-version", "7.1").queryParam("stateFilter", "all")
                        .queryParam("$top", 100);
                if (continuation != null) target.queryParam("continuationToken", continuation);
                return target.build();
            }).headers(headers -> headers.setBasicAuth("", pat)).retrieve().toEntity(ProjectPage.class);
            var page = response.getBody();
            if (page == null || page.value() == null) throw new IllegalStateException("Invalid response");
            for (var project : page.value()) {
                if (project == null || !ids.add(project.id())) throw new IllegalStateException("Invalid response");
                projects.add(project);
            }
            token = response.getHeaders().getFirst("x-ms-continuationtoken");
            if (token != null && token.isBlank()) token = null;
            if (token != null && (!token.matches("[0-9]{1,20}") || !tokens.add(token) || tokens.size() >= 100)) {
                throw new IllegalStateException("Invalid pagination");
            }
        } while (token != null);
        return List.copyOf(projects);
    }

    record ProjectPage(List<RemoteProject> value) { }
}
