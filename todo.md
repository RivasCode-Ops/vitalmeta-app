# VitalMeta - Project TODO

## Database & Schema
- [x] User profiles table with diabetes type and device preferences
- [x] Glucose readings table with context (pre/post-prandial) and trend arrows
- [x] Insulin logs table
- [x] Meal logs table with safe meals favorites
- [x] Fasting sessions table
- [x] Medication logs table
- [x] Emergency contacts table
- [x] Onboarding status tracking

## Backend (tRPC Routers)
- [x] Glucose readings CRUD with trend calculation
- [x] Insulin logs CRUD
- [x] Meal logs CRUD with safe meals management
- [x] Fasting session start/stop
- [x] Medication logs CRUD
- [x] Dashboard aggregation (Score, Time in Range, current glucose)
- [x] Timeline events aggregation
- [x] Emergency contacts CRUD
- [x] Onboarding flow procedures
- [x] User profile update with diabetes config
- [ ] Smart alerts/insights generation (future enhancement)

## Frontend Pages
- [x] Dark Mode Navy/Cyan theme setup
- [x] App navigation structure (bottom tab bar mobile-first)
- [x] Dashboard page (Metabolic Score, Time in Range, Glucose card with trend arrow)
- [x] Timeline page (chronological events with icons and colors)
- [x] Quick Log page (glucose, insulin, meal, fasting, medication)
- [x] SOS Emergency page (hypoglycemia protocol, 15min timer, emergency call)
- [x] Onboarding conversational flow
- [x] Safe Meals page (favorites management)
- [x] Profile/Settings page
- [ ] Smart alerts/insights display (future enhancement)

## Testing
- [x] Vitest tests for backend routers
- [x] Vitest tests for auth and protected procedures
- [x] Vitest tests for input validation (16 tests passing)

## Polish
- [x] Responsive design verification
- [x] Logo and branding applied
- [x] Loading states and empty states

## Bugs
- [x] Campo de texto do Quick Log não aceita digitação no dispositivo do usuário - CORRIGIDO: trocado input type=number por type=text com inputMode=numeric para compatibilidade mobile
