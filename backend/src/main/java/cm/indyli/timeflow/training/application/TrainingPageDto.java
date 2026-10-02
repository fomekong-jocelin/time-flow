package cm.indyli.timeflow.training.application;

import java.util.List;

public record TrainingPageDto(List<TrainingSessionDto> items, int page, int size,
                              long totalItems, int totalPages) {}
