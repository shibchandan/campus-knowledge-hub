# Architecture Notes

## Core Domains

- Authentication and access control
- Lecture management
- Notes and PYQ repository
- AI learning engine
- Plagiarism analysis
- Ratings and reputation
- Marketplace and transactions
- Discussion and collaboration

## Backend Shape

- `src/config` for environment, database, constants
- `src/modules` for domain features
- `src/middleware` for auth and error handling
- `src/routes` for API registration
- `src/utils` for shared helpers

## Frontend Shape

- `src/app` for application shell and providers
- `src/features` for domain-specific UI and API wrappers
- `src/pages` for route-level screens
- `src/components` for reusable UI
- `src/layouts` for dashboard framing
