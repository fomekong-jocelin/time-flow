package cm.indyli.timeflow.projects.domain;

import java.util.UUID;

public record RemoteProject(UUID id, String name, String state) {
    public RemoteProject {
        if (id == null || name == null || name.isBlank() || name.length() > 255
                || state == null || !java.util.Set.of("wellFormed", "deleted", "deleting", "new", "createPending", "unchanged").contains(state)) {
            throw new IllegalArgumentException("Invalid remote project");
        }
    }

    public boolean active() {
        return "wellFormed".equals(state);
    }
}
