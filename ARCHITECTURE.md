# BeautyMatch Modular Architecture

BeautyMatch is split into three independently replaceable modules connected only through stable contracts.

## Modules

### 1. Frontend / Design

Location: `src/app`, `src/components`, `src/frontend`

Responsibilities:
- screens, navigation and interaction
- visual design and accessibility
- rendering API view models
- collecting user input

Forbidden dependencies:
- direct Supabase table access from screens
- AI provider SDKs or prompts
- scraper/provider implementation details
- database schema types

The frontend talks only to `src/frontend/sdk` and shared contracts.

### 2. Backend / Product Platform

Location: `src/backend`, `supabase/functions`, `supabase/migrations`

Responsibilities:
- authentication and authorization
- profiles, products, uploads and analysis jobs
- persistence, cache, quotas, billing and audit logs
- orchestration of intelligence requests

The backend exposes versioned operations and returns contract types. It does not contain UI logic and does not calculate cosmetic intelligence itself.

### 3. Review & Analysis Brain

Location: `src/intelligence`, provider adapters under `supabase/functions`

Responsibilities:
- product resolution and variant matching
- ingredient normalization and formula intelligence
- review discovery, ingestion and normalization
- evidence aggregation and confidence
- personalization and scoring
- LLM synthesis over structured evidence

Provider-specific code must remain behind interfaces. Claude, OpenAI, Open Beauty Facts, Reddit, retailer or paid data providers can be replaced without changing the frontend contract.

## Shared contracts

Location: `src/contracts`

Contracts are the only shared language between the three modules. They contain serializable request/response types and version identifiers. They must not import React, Expo, Supabase or provider SDKs.

## Dependency direction

```text
Frontend -> Frontend SDK -> Backend API -> Intelligence interfaces -> Provider adapters
                    \-> Contracts <-/
```

Reverse imports are forbidden. The intelligence module never imports frontend code. Screens never invoke Supabase Edge Functions directly.

## Migration rule

Existing functionality remains available through a legacy adapter while each feature moves behind the new SDK. UI replacement projects, including a future Lovable build, should implement the same `BeautyMatchClient` contract rather than connect directly to Supabase.

## Versioning

Public contracts start at `v1`. Breaking changes require a new version or an explicit migration adapter. Additive optional fields are allowed within a version.
