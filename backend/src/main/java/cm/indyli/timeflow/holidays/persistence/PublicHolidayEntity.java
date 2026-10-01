package cm.indyli.timeflow.holidays.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "public_holiday")
public class PublicHolidayEntity {

    @Id
    private UUID id;

    @Column(name = "holiday_date", nullable = false, unique = true)
    private LocalDate holidayDate;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "is_worked", nullable = false)
    private boolean isWorked = false;

    @Column(nullable = false)
    private int year;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected PublicHolidayEntity() {
    }

    public static PublicHolidayEntity create(LocalDate holidayDate, String name, boolean isWorked) {
        var entity = new PublicHolidayEntity();
        entity.id = UUID.randomUUID();
        entity.holidayDate = holidayDate;
        entity.name = name;
        entity.isWorked = isWorked;
        entity.year = holidayDate.getYear();
        entity.createdAt = OffsetDateTime.now();
        entity.updatedAt = OffsetDateTime.now();
        return entity;
    }

    public void update(String name, boolean isWorked) {
        this.name = name;
        this.isWorked = isWorked;
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public LocalDate getHolidayDate() {
        return holidayDate;
    }

    public String getName() {
        return name;
    }

    public boolean isWorked() {
        return isWorked;
    }

    public int getYear() {
        return year;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
