import cm.indyli.timeflow.billing.application.CsvCell;
import cm.indyli.timeflow.billing.application.MoneyTotals;
import java.math.BigDecimal;
import java.util.Objects;

/** Dependency-free smoke checks of the production helpers, not a Spring or spreadsheet test. */
public class AuditHelperCheck {
    private static int checks;
    private static void equal(Object expected, Object actual) {
        checks++;
        if (!Objects.equals(expected, actual)) {
            throw new AssertionError("Expected " + expected + ", got " + actual);
        }
    }
    public static void main(String[] args) {
        equal("", CsvCell.text(null));
        equal("Ordinary text", CsvCell.text("Ordinary text"));
        equal("\"a;b\"", CsvCell.text("a;b"));
        equal("\"a\"\"b\"", CsvCell.text("a\"b"));
        for (String value : new String[]{"=1+1", "+1+1", "-1+1", "@SUM(1)", "\t=1+1", "\r=1+1", "\n=1+1",
                "  =1+1", "\u00a0=1+1", "\ufeff=1+1", "＝1+1", "＋1", "－1", "＠A1"}) {
            equal("\"'" + value + "\"", CsvCell.text(value));
        }
        var single = new MoneyTotals();
        single.add(" EUR ", new BigDecimal("100.25"), 0);
        single.add("eur", new BigDecimal("0.75"), 0);
        equal(new BigDecimal("101.00"), single.singleCompleteAmount());
        equal("EUR", single.items().getFirst().currency());
        single.add("USD", new BigDecimal("100"), 0);
        equal(null, single.singleCompleteAmount());
        equal(2, single.items().size());
        equal(new BigDecimal("101.00"), single.items().getFirst().amount());
        equal("USD", single.items().getLast().currency());
        equal(new BigDecimal("100"), single.items().getLast().amount());
        var missing = new MoneyTotals();
        missing.add("XAF", null, 420);
        equal(null, missing.singleCompleteAmount());
        equal(420, missing.items().getFirst().unpricedBillableMinutes());
        missing.add("XAF", new BigDecimal("50000"), 0);
        equal(null, missing.singleCompleteAmount());
        equal(new BigDecimal("50000"), missing.items().getFirst().amount());
        System.out.println(checks + " Java helper assertions passed; Spring, PostgreSQL and spreadsheet applications not exercised.");
    }
}
