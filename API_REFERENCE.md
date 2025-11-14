# API Calls Reference

This middleware makes the following API calls:

## Import Flow (import.js)

### 1. Shopify Admin API - Create Draft Order
```
POST https://{store}.myshopify.com/admin/api/2024-10/graphql.json
Header: X-Shopify-Access-Token: {token}

GraphQL Mutation: draftOrderCreate
```

### 2. Rivo Merchant API - Create Points Event
```
POST https://developer-api.rivo.io/merchant_api/v1/points_events
Header: Authorization: {api_key}

Body:
{
  "customer_identifier": "email@example.com",
  "points": 100,
  "reason": "POS Order POS001"
}
```

## Export Flow (export.js)

### Rivo Merchant API - List Customers
```
GET https://developer-api.rivo.io/merchant_api/v1/customers
Header: Authorization: {api_key}
```

Returns customer list with points balances for CSV export.

## Notes
- Rivo API uses direct API key (not Bearer token)
- Customer identifier can be email or Shopify customer ID
- Points events create audit trail in Rivo

