# Integration Findings & Notes for Person A

This document logs integration observations and non-blocking architectural notes for Person A. Per integration protocol, Person A's foundation modules were kept intact.

---

## 1. Password Policy Edge Case
- **File:** `server/src/utils/password.ts`, Line 4-5
- **Observation:** `PASSWORD_RULES.MIN_LENGTH` is set to `9` with the description `"MORE THAN 8 characters"`.
- **Impact:** An 8-character password with uppercase, lowercase, number, and special character fails validation because the schema requires $\ge 9$ characters.
- **Suggested Fix for Person A:**
  ```ts
  // If standard 8-character passwords should be allowed:
  export const PASSWORD_RULES = {
    MIN_LENGTH: 8, // Minimum 8 characters
    SPECIAL_CHAR_REGEX: /[^a-zA-Z0-9]/,
    UPPERCASE_REGEX: /[A-Z]/,
    LOWERCASE_REGEX: /[a-z]/,
  };
  ```

---

## 2. Parameter Ordering in `applyCustomerScope`
- **File:** `server/src/utils/customerScope.ts`, Line 65
- **Observation:** Function signature is `applyCustomerScope(user, existingWhere, customerIdField)`.
- **Note:** In early integration, consumers might assume `(existingWhere, user)`. The parameter order is documented and adhered to across all billing and reporting modules.

---

## 3. Product Variant Extra Price in Line Items
- **File:** `server/src/modules/products/`
- **Observation:** Product model stores base `salesPrice`, and `ProductVariant` stores `extraPrice`.
- **Recommendation:** When client-side or server-side orders select a variant, ensure the effective line unit price is computed as `product.salesPrice + (variant.extraPrice || 0)`. This has been accounted for in the billing and subscription services.
