package cm.indyli.timeflow.billing.application;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.assertThat;

class MoneyTotalsTest {
    @Test void mixedCurrenciesNeverProduceScalarTotals() {
        var totals = new MoneyTotals(); totals.add("EUR", new BigDecimal("100"), 0); totals.add("USD", new BigDecimal("100"), 0);
        assertThat(totals.singleCompleteAmount()).isNull(); assertThat(totals.items()).hasSize(2);
        assertThat(totals.items()).extracting(MoneyTotal::currency).containsExactly("EUR", "USD");
    }
    @Test void unknownRateIsNotZeroAndPricedSubtotalRemainsExplicit() {
        var totals = new MoneyTotals(); totals.add("XAF", new BigDecimal("1200"), 0); totals.add("XAF", null, 420);
        assertThat(totals.singleCompleteAmount()).isNull();
        assertThat(totals.items().getFirst().amount()).isEqualByComparingTo("1200");
        assertThat(totals.items().getFirst().unpricedBillableMinutes()).isEqualTo(420);
    }
    @Test void benignFormulasAndLeadingControlsAreExportedAsText() {
        for (var text : new String[]{"=1+1", "+1", "-1", "@SUM(1)", "  =1+1", "\t=1+1", "\r=1+1", "\uFEFF=1+1", "＝1+1"}) {
            assertThat(CsvCell.text(text)).startsWith("\"'").endsWith("\"");
        }
        assertThat(CsvCell.text("Hello;World")).isEqualTo("\"Hello;World\"");
    }
}
