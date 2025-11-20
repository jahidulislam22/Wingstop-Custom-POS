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
  "points_amount": 100,
  "action": "POS Purchase",
  "description": "Order placed via POS - 2 item(s)"
}
```

**Required Fields:**
- `customer_identifier`: Customer email or Shopify ID
- `points_amount`: Number of points to award
- `action`: Action name (e.g., "POS Purchase", "Admin Adjustment")
- `description`: Optional description of the event

**Note:** Using `action` field doesn't require pre-configured earning methods in Rivo app.
If using `source` with `custom_action_name`, you must first create that earning method in the Rivo dashboard.

## Email Notifications

### Purchase Confirmation Email
When a customer completes a purchase and earns points, an automated email is sent containing:
- Order summary with items and total
- Points earned notification
- New points balance
- Professional Wingstop branding

**Requirements:**
- `RESEND_API_KEY` must be configured
- `RESEND_FROM` email address must be configured
- `EMAIL_FROM_NAME` (optional, defaults to "Wingstop")

The email is sent automatically after points are successfully added to the customer's Rivo account.

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

