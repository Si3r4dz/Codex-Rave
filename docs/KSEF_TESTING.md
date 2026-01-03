# KSeF Integration Testing Guide

This guide explains how to test and validate your generated FA(3) XML invoices with the Polish KSeF (Krajowy System e-Faktur) system.

## 1. Local XSD Validation (Already Implemented ✅)

Our system automatically validates every generated XML against the official FA(3) schema:

```bash
# This happens automatically when you issue an invoice
xmllint --noout --schema lib/schemas/ksef/fa3/schemat.xsd [invoice.xml]
```

If an invoice is generated successfully, it means it passed XSD validation.

## 2. Manual XSD Validation

You can manually validate any generated XML:

```bash
cd Codex-Rave
XML_CATALOG_FILES=lib/schemas/ksef/fa3/catalog.xml \
xmllint --noout --nonet --catalogs \
  --schema lib/schemas/ksef/fa3/schemat.xsd \
  data/invoices/xml/[your-invoice].xml
```

✅ Success: `[file] validates`
❌ Error: Detailed validation errors with line numbers

## 3. KSeF Test Environment

The Ministry of Finance provides a **DEMO environment** for testing:

### Test Portal Access
- **Demo Portal**: https://ksef-demo.mf.gov.pl/
- **Purpose**: Upload and test invoices without affecting production
- **Requirements**: 
  - Valid test NIP (can use real or test NIPs)
  - Test authorization token (obtained via demo portal)

### How to Test on KSeF Demo:

1. **Generate Test Invoice** in your dashboard
   - Use real or fictional client data
   - Download the generated XML file

2. **Access KSeF Demo Portal**
   - Go to: https://ksef-demo.mf.gov.pl/
   - Login with test credentials (or create test account)

3. **Upload Invoice**
   - Navigate to "Wyślij fakturę" (Send Invoice)
   - Upload your XML file
   - Review validation results

4. **Check Results**
   - ✅ **Success**: Invoice accepted, you'll get a KSeF reference number
   - ❌ **Errors**: Detailed error messages with field names
   - ⚠️ **Warnings**: Non-critical issues that should be fixed

## 4. Common Validation Points

### Required Fields Checklist
- ✅ Valid NIP format (10 digits)
- ✅ Correct date format (YYYY-MM-DD)
- ✅ VAT rate from allowed values (23, 8, 5, 0, ZW, NP)
- ✅ Currency code (PLN)
- ✅ Amounts match calculations (NET + VAT = GROSS)
- ✅ Invoice number uniqueness

### Our Implementation Status
- ✅ FA(3) schema compliance (validated locally)
- ✅ Proper XML encoding (UTF-8)
- ✅ All required fields populated
- ✅ VAT calculations correct (grosze-based)
- ✅ Polish character support in PDF
- ✅ Date validation

## 5. Test Scenarios

### Scenario 1: Basic VAT Invoice (23%)
```bash
# Generate invoice for December 2025
# Default: 23% VAT, hours-based service
# Expected: Passes all validations
```

### Scenario 2: Multiple VAT Rates
```bash
# Modify invoice to include:
# - 23% VAT items
# - 8% VAT items
# Expected: P_13_1, P_13_2 fields populated correctly
```

### Scenario 3: Zero VAT (Export)
```bash
# Create invoice with 0% VAT (NP or ZW)
# Expected: P_13_8 or P_13_7 populated
```

## 6. Validation Script

Run comprehensive validation on all generated invoices:

```bash
#!/bin/bash
# Save as: scripts/validate-invoices.sh

echo "🔍 Validating all KSeF XML invoices..."
echo ""

XML_DIR="data/invoices/xml"
SCHEMA="lib/schemas/ksef/fa3/schemat.xsd"
CATALOG="lib/schemas/ksef/fa3/catalog.xml"

if [ ! -d "$XML_DIR" ]; then
  echo "❌ No invoices directory found"
  exit 1
fi

TOTAL=0
PASSED=0
FAILED=0

for xml_file in "$XML_DIR"/*.xml; do
  if [ -f "$xml_file" ]; then
    TOTAL=$((TOTAL + 1))
    filename=$(basename "$xml_file")
    
    if XML_CATALOG_FILES="$CATALOG" xmllint --noout --nonet --catalogs --schema "$SCHEMA" "$xml_file" 2>/dev/null; then
      echo "✅ $filename"
      PASSED=$((PASSED + 1))
    else
      echo "❌ $filename"
      FAILED=$((FAILED + 1))
      # Show detailed errors
      XML_CATALOG_FILES="$CATALOG" xmllint --noout --nonet --catalogs --schema "$SCHEMA" "$xml_file" 2>&1 | head -10
    fi
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total invoices: $TOTAL"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo "🎉 All invoices are valid!"
  exit 0
else
  exit 1
fi
```

Make it executable and run:
```bash
chmod +x scripts/validate-invoices.sh
./scripts/validate-invoices.sh
```

## 7. Integration Testing (Future)

For automated testing with KSeF API:

### Prerequisites
- KSeF Demo API credentials
- Test authorization token
- Test NIP registered in demo environment

### API Endpoints (Demo)
- **Base URL**: `https://ksef-demo.mf.gov.pl/api/`
- **Session**: `/online/Session/InitSigned`
- **Invoice Send**: `/online/Invoice/Send`
- **Status Check**: `/online/Invoice/Status/{reference}`

*Note: Full API integration is not implemented yet. This is manual/local validation only.*

## 8. Production Readiness Checklist

Before using generated invoices in production KSeF:

- [ ] All test invoices validated on KSeF Demo
- [ ] Company data correct (NIP, address, bank account)
- [ ] Invoice numbering sequence configured
- [ ] Backup strategy for XML/PDF files
- [ ] Understanding of KSeF production limits
- [ ] Access credentials for production KSeF
- [ ] Tested with real client NIPs (on demo first)

## 9. Known Limitations

Current implementation is **local-only**:
- ✅ Generates valid FA(3) XML
- ✅ Validates against official XSD
- ✅ Generates PDF invoices
- ❌ No automatic KSeF API submission
- ❌ No automatic token management
- ❌ No KSeF response parsing

**Workflow**: Generate XML → Download → Manually upload to KSeF portal

## 10. Troubleshooting

### Issue: "Invalid NIP format"
**Solution**: Ensure 10 digits, no dashes or spaces

### Issue: "Date validation failed"
**Solution**: Check YYYY-MM-DD format, dates are realistic

### Issue: "Amount mismatch"
**Solution**: Our calculations are grosze-based and correct, but check if manual edits were made

### Issue: "Missing required field"
**Solution**: Review generated XML, compare with schema requirements

## Need Help?

1. Check validation errors in terminal output
2. Review generated XML structure
3. Compare with official FA(3) examples
4. Test on KSeF Demo portal: https://ksef-demo.mf.gov.pl/

---

**Official KSeF Resources:**
- Documentation: https://www.podatki.gov.pl/ksef/
- Schemas: https://podatki-arch.mf.gov.pl/e-deklaracje/
- Demo Portal: https://ksef-demo.mf.gov.pl/

