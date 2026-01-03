#!/bin/bash
# KSeF Invoice Validation Script
# Validates all generated XML invoices against FA(3) schema

set -e

echo "🔍 KSeF FA(3) Invoice Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
XML_DIR="$PROJECT_DIR/data/invoices/xml"
SCHEMA="$PROJECT_DIR/lib/schemas/ksef/fa3/schemat.xsd"
CATALOG="$PROJECT_DIR/lib/schemas/ksef/fa3/catalog.xml"

# Check if xmllint is available
if ! command -v xmllint &> /dev/null; then
    echo "❌ xmllint is not installed"
    echo "Install with: brew install libxml2 (macOS) or apt install libxml2-utils (Linux)"
    exit 1
fi

# Check if schema exists
if [ ! -f "$SCHEMA" ]; then
    echo "❌ Schema file not found: $SCHEMA"
    exit 1
fi

# Check if invoices directory exists
if [ ! -d "$XML_DIR" ]; then
    echo "⚠️  No invoices directory found: $XML_DIR"
    echo "Generate an invoice first!"
    exit 0
fi

# Count XML files
XML_COUNT=$(find "$XML_DIR" -name "*.xml" -type f | wc -l | tr -d ' ')

if [ "$XML_COUNT" -eq 0 ]; then
    echo "⚠️  No XML invoices found in: $XML_DIR"
    echo "Generate an invoice first!"
    exit 0
fi

echo "Found $XML_COUNT invoice(s) to validate"
echo ""

TOTAL=0
PASSED=0
FAILED=0

# Validate each XML file
for xml_file in "$XML_DIR"/*.xml; do
    if [ -f "$xml_file" ]; then
        TOTAL=$((TOTAL + 1))
        filename=$(basename "$xml_file")
        
        printf "%-40s " "$filename"
        
        # Run validation
        if XML_CATALOG_FILES="$CATALOG" SGML_CATALOG_FILES="$CATALOG" \
           xmllint --noout --nonet --catalogs --schema "$SCHEMA" "$xml_file" 2>&1 | grep -q "validates"; then
            echo "✅ VALID"
            PASSED=$((PASSED + 1))
        else
            echo "❌ INVALID"
            FAILED=$((FAILED + 1))
            
            # Show detailed errors (first 5 lines)
            echo "   Errors:"
            XML_CATALOG_FILES="$CATALOG" SGML_CATALOG_FILES="$CATALOG" \
              xmllint --noout --nonet --catalogs --schema "$SCHEMA" "$xml_file" 2>&1 | grep -v "validates" | head -5 | sed 's/^/   /'
            echo ""
        fi
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total invoices:  $TOTAL"
echo "✅ Passed:       $PASSED"
echo "❌ Failed:       $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All invoices are valid and ready for KSeF!"
    echo ""
    echo "Next steps:"
    echo "1. Download XML from the dashboard"
    echo "2. Test upload on KSeF Demo: https://ksef-demo.mf.gov.pl/"
    echo "3. Check for any additional warnings"
    exit 0
else
    echo "⚠️  Some invoices have validation errors."
    echo "Please review the errors above and regenerate affected invoices."
    exit 1
fi

