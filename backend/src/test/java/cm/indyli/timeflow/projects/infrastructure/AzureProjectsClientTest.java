package cm.indyli.timeflow.projects.infrastructure;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class AzureProjectsClientTest {
    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final AzureProjectsClient client = new AzureProjectsClient("example", "test-only", builder);

    @Test
    void readsEveryPageAndMapsExplicitDeletedState() {
        server.expect(requestTo("https://dev.azure.com/example/_apis/projects?api-version=7.1&stateFilter=all&$top=100"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Basic OnRlc3Qtb25seQ=="))
                .andRespond(withSuccess(page("00000000-0000-0000-0000-000000000001", "wellFormed"), MediaType.APPLICATION_JSON)
                        .header("x-ms-continuationtoken", "100"));
        server.expect(requestTo("https://dev.azure.com/example/_apis/projects?api-version=7.1&stateFilter=all&$top=100&continuationToken=100"))
                .andRespond(withSuccess(page("00000000-0000-0000-0000-000000000002", "deleted"), MediaType.APPLICATION_JSON));
        var projects = client.fetchAll();
        assertThat(projects).hasSize(2);
        assertThat(projects.getFirst().active()).isTrue();
        assertThat(projects.getLast().active()).isFalse();
        server.verify();
    }

    @Test
    void rejectsMalformedResponseInsteadOfImportingAnEmptyCatalogue() {
        server.expect(anything()).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(client::fetchAll).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsPaginationLoop() {
        server.expect(anything()).andRespond(withSuccess("{\"value\":[]}", MediaType.APPLICATION_JSON).header("x-ms-continuationtoken", "1"));
        server.expect(anything()).andRespond(withSuccess("{\"value\":[]}", MediaType.APPLICATION_JSON).header("x-ms-continuationtoken", "1"));
        assertThatThrownBy(client::fetchAll).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void doesNotAllowAnArbitraryRemoteHostOrPath() {
        assertThat(new AzureProjectsClient("https://evil.example/path", "test-only", builder).configured()).isFalse();
        assertThat(new AzureProjectsClient("example", "", builder).configured()).isFalse();
    }

    private String page(String id, String state) {
        return "{\"value\":[{\"id\":\"" + id + "\",\"name\":\"Mission\",\"state\":\"" + state + "\"}]}";
    }
}
