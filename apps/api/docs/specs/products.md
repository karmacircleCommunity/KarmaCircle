# Products Module

[src/modules/products/](../../src/modules/products/) — add/list/get products, and add a product to a user's cart. Owns the `Product` model; the cart itself lives on `User.cart` (see [users.md](./users.md#the-user-model-is-shared-by-five-modules)), so this module also writes into `users`' collection.

## `product.model.ts`

`model<IProduct>("Products", ...)` (note the model name is plural, `"Products"` — every other model in this codebase is singular/lowercase: `"user"`, `"Event"`, `"report"` — no functional impact, Mongoose just uses whatever string you give it for the underlying collection name resolution, but it's an inconsistency worth matching if you ever add a fifth model). `{ timestamps: true }`.

| Field | Type | Notes |
|---|---|---|
| `productType`, `productName`, `productDescription`, `productImage` | `string` (required) | |
| `productPrice`, `productQty` | `number` (required) | No currency field — same implicit-INR assumption as [payments.md](./payments.md) |
| `productSlug` | `string` (required, `unique: true`) | The lookup key for `GET /product/:productSlug` |

## `product.service.ts` / routes

- **`POST /product/addproduct`** — no auth (anyone can add a product; there's no admin/role check anywhere in this codebase — see [known-issues.md](./known-issues.md#products)). `validate(addProductSchema)` requires all seven fields. `409 PRODUCT_SLUG_ALREADY_EXISTS` on a duplicate slug (same existence-check-then-save race caveat as `events`' `uid` and `users`' `userName`). `201` with the saved product on success.
- **`GET /product/allproducts`** — no auth. `validate(listProductsQuerySchema, "query")` — `{ page?: number, limit?: number }` (shared `paginationQuerySchema`, [src/utils/pagination.ts](../../src/utils/pagination.ts); default `page=1`/`limit=20`, capped at 100 — this route didn't have any validation middleware before pagination was added). Returns `{ data, pagination }`.
- **`GET /product/:productSlug`** — no auth. `404 PRODUCT_NOT_FOUND` if the slug doesn't match anything.
- **`POST /product/cart/add`** — `requireAuth` → `validate(addToCartSchema)`. Body is just `{ productId }`; *whose* cart to mutate comes from `req.auth.email` (the `Token` cookie), not from anything in the request body — there used to be an `email` field in the body that identified the target account with no check that it matched the caller, which meant anyone who knew a user's email could push into their cart. That's fixed: the schema no longer has an `email` field at all (Zod's default `.parse()` behavior strips unrecognized keys, so a client that still sends one is silently ignored, not rejected — see `tests/products.test.ts`'s "cannot be used to write into another user's cart" case, which sends a body-level `email` for a different account and confirms the item still lands on the *caller's own* cart). `productService.addToCart(email, productId)`: `User.updateOne({ email }, { $push: { cart: { id: productId } } })`, returns `true` only if `modifiedCount === 1`; controller maps a falsy result to `404 USER_NOT_FOUND` (the same "valid token, deleted account" edge case documented elsewhere — see [clubs.md](./clubs.md#get-clubsdashboard)). **Still open, not part of this fix:** `productId` is never validated against the `Product` collection — any string is accepted and pushed into `cart`, so a cart can end up referencing a product id that doesn't exist. There's also still no de-duplication — adding the same `productId` twice creates two identical entries — and no endpoint anywhere removes/clears a cart entry.

## What's known-broken here

`POST /product/cart/add`'s auth/ownership gap is **fixed** (see above). Still open: `POST /product/addproduct` has no authorization at all (anyone can create a product — this is the separate "no admin/role concept" backlog item, not an ownership-of-an-existing-resource gap like the cart was), and the two `productId`/de-duplication gaps noted above. See [known-issues.md](./known-issues.md#products).
