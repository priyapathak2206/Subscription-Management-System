# Integration Findings & Notes for Person A

This document logs integration observations and non-blocking architectural notes for Person A. Per integration protocol, Person A's foundation modules were kept intact.

---

## 1. Password Policy Compliance (> 8 Characters)
- **File:** `server/src/utils/password.ts`, Line 4-5
- **Observation:** `PASSWORD_RULES.MIN_LENGTH` is set to `9` with the description `"MORE THAN 8 characters"`.
- **Clarification:** The problem statement explicitly requires passwords to be *"more than eight characters"*. An integer length strictly greater than 8 means $\ge 9$ characters. Therefore, `MIN_LENGTH: 9` is mathematically and specificationally correct. No change is recommended or needed; passwords of 8 characters or fewer are properly rejected.

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
