# WEEK 7 REPORT: DOCUMENTATION AND FINAL PRESENTATION

**Project Title:** An Integrated Digital Platform for Empowering Farmers in Makueni County

**Student Name:** Daniel Muema Makai

**Registration Number:** IC211-0009/2022

**Supervisor:** Dr. Solomon Mwanjele

**Reporting Week:** April 6-April 10, 2026

**Prepared On:** April 19, 2026

**Continuous Assessment Component:** 15 Marks

---

## 1. Introduction

This report presents the Week 7 deliverable for AgrivisionAI, covering final documentation and final presentation readiness. By this phase, the system implementation, integration, testing, and debugging tasks from earlier weeks had already been completed. The focus of Week 7 is therefore to present the completed system in a clear, professional, and verifiable form.

The submission addresses the academic requirement for:

- system demonstration,
- technical documentation,
- user manual,
- conclusion and recommendations.

This report is structured to satisfy the Week 7 assessment criteria exactly as issued:

- **System demonstration (6 marks)**
- **Documentation quality (6 marks)**
- **Professionalism of presentation (3 marks)**

---

## 2. Final System Overview

AgrivisionAI is a full-stack agricultural digital platform built to support coordinated interaction among farmers, buyers, service providers, and administrators. The platform combines account management, marketplace activity, messaging, transport coordination, analytics, and supervision tools in one integrated workflow.

### 2.1 Core Functional Modules

1. **Authentication and Role Management**
   - User registration and login for farmer, buyer, and provider accounts.
   - Token-based authentication with role-aware profile payloads and protected routes.

2. **Marketplace and Orders**
   - Produce listing creation, browsing, filtering, editing, and deletion.
   - Order placement, order status updates, and complaint handling.

3. **Messaging and Communication**
   - Internal user-to-user conversations.
   - Real-time chat updates and inbox notifications through WebSockets.

4. **Transport and Service Coordination**
   - Transport option discovery for listings.
   - Transport request creation, provider updates, and admin moderation.

5. **Analytics and Platform Monitoring**
   - Platform overview metrics.
   - Marketplace, weather, and forecast summaries.
   - Administrative monitoring for users, messages, complaints, and transport activity.

### 2.2 Technology Stack Summary

- **Backend:** Django, Django REST Framework, Django Channels, Celery
- **Frontend:** React, Vite, React Router, Axios, Bootstrap, Chart.js
- **Authentication:** DRF token authentication with session expiry checks
- **Database:** SQLite for the current development environment
- **Realtime and Background Support:** WebSockets via Channels; Redis-backed channel layer and Celery broker are supported when enabled, with local in-memory fallback during debug development

---

## 3. Technical Documentation

### 3.1 Architecture Summary

The system follows a client-server architecture with clearly separated frontend, backend, persistence, and asynchronous communication responsibilities.

- The React frontend handles routing, page rendering, authenticated navigation, and API consumption.
- The Django backend exposes REST endpoints for authentication, marketplace operations, transport workflows, messaging, analytics, and administration.
- Django Channels provides WebSocket communication for chat and notifications.
- Celery is configured for asynchronous messaging support and background processing.
- SQLite stores the application data in the current development environment.
- External data and integration points include weather services and messaging compatibility endpoints documented in the project architecture notes.

**Primary architecture reference:** `ARCHITECTURE_AND_ENDPOINTS.md`

**Screenshot Placeholder 1:** System architecture diagram and module interaction flow.

### 3.2 Backend Implementation Details

The backend is organized into domain-focused modules with explicit routing and permission checks.

**Key backend areas**

- **Authentication module**
  - Handles registration, login, profile retrieval, and profile update operations.
  - Evidence: `backend/agritech/api/auth_views.py`, `backend/agritech/api/auth_urls.py`

- **Core API and marketplace logic**
  - Handles listings, orders, ratings, profiles, bookings, farmers, buyers, and weather-related endpoints.
  - Evidence: `backend/agritech/api/views.py`, `backend/agritech/core/models.py`

- **Platform aggregate endpoints**
  - Provides overview, authentication summary, marketplace summary, analytics data, transport options, and transport requests.
  - Evidence: `backend/agritech/api/platform_views.py`

- **Administrative supervision**
  - Provides metrics, user management, complaint resolution, message moderation, and transport moderation.
  - Evidence: `backend/agritech/api/admin_views.py`

- **Messaging subsystem**
  - Provides conversation retrieval, message sending, message deletion, conversation creation, and WebSocket consumers.
  - Evidence: `backend/agritech/messaging/api_views.py`, `backend/agritech/messaging/consumers.py`, `backend/agritech/messaging/routing.py`

**Routing evidence**

- `backend/agritech/agritech/urls.py` registers the major API groups:
  - `/api/auth/`
  - `/api/platform/`
  - `/api/admin/`
  - `/api/messaging/`
  - router-based catalog and marketplace endpoints such as `/api/listings/`, `/api/providers/`, `/api/services/`, `/api/crops/`, and `/api/markets/`

**Security and validation evidence**

- Role-based access control is enforced through authenticated endpoints and role-aware checks.
- Ownership checks are used on listings, conversations, orders, and transport requests.
- Validation exists for credentials, listing data, message payloads, transport actions, and complaint handling.

**Screenshot Placeholder 2:** Backend endpoint tests for auth, listings, orders, transport, analytics, and admin actions.

### 3.3 Frontend Implementation Details

The frontend is structured around protected navigation, role-aware routes, centralized API helpers, and reusable workflow components.

**Main frontend evidence files**

- `frontend/frontend/src/App.jsx`
- `frontend/frontend/src/context/AuthContext.jsx`
- `frontend/frontend/src/lib/api.js`
- `frontend/frontend/src/pages/Marketplace.jsx`
- `frontend/frontend/src/pages/MyListings.jsx`
- `frontend/frontend/src/pages/Orders.jsx`
- `frontend/frontend/src/pages/Providers.jsx`
- `frontend/frontend/src/pages/Transport.jsx`
- `frontend/frontend/src/pages/Platform.jsx`
- `frontend/frontend/src/pages/Inbox.jsx`
- `frontend/frontend/src/pages/AdminDashboard.jsx`
- `frontend/frontend/src/components/MessageModal.jsx`
- `frontend/frontend/src/components/OrderComplaintModal.jsx`

**Frontend implementation highlights**

- Route protection is implemented in `App.jsx` using `RequireAuth`, `RequireRoles`, and `RequireAdmin`.
- Session state is managed in `AuthContext.jsx` through token loading, profile verification, activity tracking, timeout checks, and logout behavior.
- Central API and WebSocket helpers are defined in `src/lib/api.js`.
- Marketplace, orders, transport, provider selection, inbox, and admin views are implemented as dedicated pages.
- Messaging uses `MessageModal.jsx` together with WebSocket helpers for live conversation updates.

**Screenshot Placeholder 3:** Authenticated UI navigation showing protected routes and role-based menu visibility.

### 3.4 Data Model and Integration Notes

The data model supports end-to-end agricultural workflows from user registration to marketplace fulfillment and communication.

**Key entities**

- `FarmerProfile`, `BuyerProfile`, and `ServiceProvider`
- `Listing`, `Crop`, `Market`, and `MarketplaceOrder`
- `Service` and `Booking`
- `Conversation` and `Message`
- `WeatherForecast`, `PriceForecast`, and `FarmerInsight`
- `Rating` and complaint-related order fields

These entities are integrated to support the following flow:

1. A user account is created and associated with a role profile.
2. A farmer or buyer creates or accesses listings and marketplace records.
3. Orders are placed and tracked through status changes.
4. Users communicate through conversations and messages.
5. Transport requests are created and updated through service and booking records.
6. Admin users supervise system activity through metrics and moderation endpoints.

**Screenshot Placeholder 4:** Database/admin panel view of linked entities and records.

---

## 4. Final System Demonstration

This section provides the Week 7 demonstration structure and the expected outcomes for the final presentation.

### 4.1 Recommended Live Demo Sequence (12-15 minutes)

| Time Window | Presenter Action | Expected Audience Outcome |
| ----------- | ---------------- | ------------------------- |
| 0:00-1:30 | Introduce the agricultural problem and the target users | Audience understands the problem context and stakeholder roles |
| 1:30-4:00 | Demonstrate farmer registration or login, then create a listing | Audience sees successful onboarding, validation, and listing visibility |
| 4:00-6:00 | Demonstrate buyer browsing and order placement | Audience sees end-to-end transaction continuity |
| 6:00-8:00 | Demonstrate messaging between users | Audience sees communication support and live updates |
| 8:00-10:00 | Demonstrate transport request creation and status changes | Audience sees logistics workflow and role restrictions |
| 10:00-12:00 | Demonstrate admin dashboard, complaints, and moderation | Audience sees governance, supervision, and oversight |
| 12:00-15:00 | Summarize architecture, testing evidence, and recommendations | Audience sees technical maturity and readiness for submission |

### 4.2 Demonstration Scenarios and Outcomes

| Demo Scenario | Demonstration Steps | Expected Outcome |
| ------------- | ------------------- | ---------------- |
| 1. Farmer listing workflow | Log in as farmer, open `My Listings`, create a produce listing, then confirm it appears in `Marketplace` | Listing is saved, visible, and manageable by the owner |
| 2. Buyer transaction workflow | Log in as buyer, browse listings, place an order, then open `Orders` | Order is created and displayed with the correct status |
| 3. Buyer-farmer communication | Start or open a conversation and send a message | Message appears in the conversation history and updates live |
| 4. Transport coordination | Create a transport request from a listing, then update status through the permitted role | Transport request is linked correctly and status changes are reflected |
| 5. Admin supervision | Open the admin dashboard, review metrics, complaints, and recent transport activity | Admin data loads successfully and moderation controls work |
| 6. Analytics and platform overview | Open `Platform` and view overview, marketplace, and analytics content | Dashboard cards and charts load with coherent aggregated data |

**Screenshot Placeholder 5:** Farmer listing creation and resulting marketplace listing.

**Screenshot Placeholder 6:** Buyer order creation and order status tracking.

**Screenshot Placeholder 7:** Inbox and active conversation view.

**Screenshot Placeholder 8:** Transport request creation and status transition.

**Screenshot Placeholder 9:** Admin dashboard metrics and complaint moderation.

### 4.3 Live Presentation Preparation Notes

To improve reliability during the final demonstration:

1. Prepare at least one farmer account, one buyer account, one provider account, and one admin account in advance.
2. Keep sample listings and transport-enabled providers already available for a faster live flow.
3. Open backup screenshots before the session in case a service or network issue interrupts the live run.
4. Keep the backend and frontend terminals visible for quick recovery if needed.

---

## 5. User Manual

### 5.1 Prerequisites

Before using the system locally, confirm the following:

1. Python and Node.js are installed.
2. The backend project dependencies are installed from `backend/requirements.txt`.
3. The frontend dependencies are installed from `frontend/frontend/package.json`.
4. The backend server is reachable on `http://localhost:8000`.
5. The frontend development server is reachable from the browser.

### 5.2 Local Run Procedure

#### 5.2.1 Backend Startup

Run the following from the repository root:

```powershell
cd backend/agritech
python -m pip install -r ../requirements.txt
python manage.py migrate
python manage.py runserver
```

If a virtual environment is used locally, activate it before running the commands above.

#### 5.2.2 Frontend Startup

Open a second terminal and run:

```powershell
cd frontend/frontend
npm install
npm run dev
```

#### 5.2.3 Basic Startup Confirmation

After both servers start:

1. Open the frontend URL shown by Vite in the terminal.
2. Confirm the application loads successfully.
3. Register or log in.
4. Verify that authenticated pages can reach backend data.

### 5.3 Common Access Procedure

1. Open the platform home page.
2. Register a new account or log in with an existing account.
3. Use the navigation menu to access pages allowed for that role.
4. Perform the intended workflow.
5. Log out after use.

### 5.4 Farmer Manual

1. Register or log in as a farmer.
2. Open `My Listings`.
3. Create a produce listing by entering crop, quantity, unit, price, market, and contact details.
4. Open `Marketplace` to confirm the listing appears publicly.
5. Open `Orders` to monitor buyer transactions.
6. Open `Transport` to request delivery support for a listing.
7. Use `Messaging` or `Inbox` to communicate with buyers or other users.

### 5.5 Buyer Manual

1. Register or log in as a buyer.
2. Open `Marketplace`.
3. Browse or filter listings by crop or market.
4. Place an order for a selected listing.
5. Open `Orders` to monitor the order lifecycle.
6. Use `Messaging` or `Inbox` to communicate with the seller.
7. Use the complaint option if a transaction issue requires admin review.

### 5.6 Provider Manual

1. Register or log in as a provider account.
2. Open `Transport`.
3. Review assigned or available transport requests according to permissions.
4. Update allowed request statuses.
5. Confirm delivery progression until completion.

### 5.7 Administrator Manual

1. Log in with admin privileges.
2. Open `Admin Dashboard`.
3. Review totals, recent transport requests, messages, conversations, and complaints.
4. Create, update, or remove managed users where necessary.
5. Moderate transport requests and resolve order complaints.
6. Monitor the platform for improper activity or operational issues.

**Screenshot Placeholder 10:** Quick-start screenshots for farmer, buyer, provider, and admin workflows.

---

## 6. Quality and Validation Summary

Week 6 testing and debugging evidence remains valid for final Week 7 presentation readiness. The prior report covered the period from March 30 to April 3, 2026 and confirmed the stability of the integrated system.

**Summary of validated outcomes**

- 10 planned functional test cases were executed and passed.
- Validation was strengthened for authentication, marketplace, messaging, and transport workflows.
- Permission and ownership controls were enforced on sensitive actions.
- Session timeout and auto-logout behavior were integrated.
- Frontend production build verification was completed successfully.

**Reference evidence:** `WEEK6_PROGRESS_REPORT_TESTING_AND_DEBUGGING.md`

### 6.1 Final Readiness Statement

The system meets final academic demonstration readiness because:

1. The major modules operate under one integrated authentication model.
2. Role-based access control is implemented across the core workflows.
3. Marketplace, messaging, transport, analytics, and admin supervision features are connected end to end.
4. Prior testing and debugging evidence confirms stable behavior on the main workflows.
5. The current documentation now explains architecture, implementation evidence, usage procedure, and presentation flow.

---

## 7. Conclusion

AgrivisionAI has reached a complete, stable, and demonstrable state suitable for final academic presentation. The system supports integrated user workflows from account creation and listing management to order handling, messaging, transport coordination, analytics access, and administrative supervision. The Week 7 deliverable consolidates the technical documentation, presentation structure, and user operating guidance required for final submission.

Based on the completed implementation and the verification evidence from earlier phases, the project satisfies the expected standard for the Week 7 continuous assessment component.

---

## 8. Recommendations

1. **Deployment hardening:** move from local SQLite to a managed production database and deploy the backend in a more secure hosted environment.
2. **Automated testing expansion:** add broader backend API tests and frontend integration tests to reduce reliance on manual verification.
3. **Monitoring and observability:** introduce structured logging, runtime monitoring, and health checks for production support.
4. **User onboarding support:** add guided onboarding, contextual hints, and quick tutorials for first-time users.
5. **External data resilience:** strengthen fallback and caching behavior for weather and other external integrations.

---

## 9. Explicit Assessment Rubric Coverage

| Assessment Criterion | Marks | Week 7 Coverage Evidence |
| -------------------- | ----- | ------------------------ |
| System demonstration | 6 | Section 4 provides a timed demo sequence, six end-to-end scenarios, expected outcomes, and screenshot planning |
| Documentation quality | 6 | Sections 2, 3, and 5 explain the system overview, architecture, implementation evidence, and role-based usage procedures |
| Professionalism of presentation | 3 | The report uses structured headings, consistent terminology, screenshot planning, and direct evidence mapping to the implemented system |

**Total:** All 15 marks are explicitly addressed through the report structure and supporting evidence plan.

---

## 10. Professional Presentation Checklist

Use this checklist before submission or live presentation:

1. Ensure all screenshots are clear, labeled, and inserted under the correct placeholders.
2. Use one consistent figure naming style such as `Figure 1`, `Figure 2`, and so on.
3. Keep table formatting and heading capitalization consistent throughout the document.
4. Use the same role terms consistently: farmer, buyer, provider, and admin.
5. Ensure every major feature claim is supported by code evidence, testing evidence, or screenshot evidence.
6. Prepare live demonstration accounts before the presentation session.
7. Keep fallback screenshots ready in case a service interruption affects the live demo.
8. End the presentation with a short summary of delivered features, testing evidence, and future recommendations.

---

## 11. Screenshot Evidence Plan

Insert actual screenshots under each placeholder before final export.

| Placeholder | Required Screenshot Evidence |
| ----------- | ---------------------------- |
| Placeholder 1 | Architecture diagram from project documentation |
| Placeholder 2 | API tests for auth, listings, orders, transport, analytics, and admin |
| Placeholder 3 | Authenticated UI navigation with protected routes and role-based visibility |
| Placeholder 4 | Data model or admin records showing linked entities |
| Placeholder 5 | Farmer listing creation form and resulting listing card |
| Placeholder 6 | Buyer order creation and order tracking view |
| Placeholder 7 | Inbox and message modal with conversation history |
| Placeholder 8 | Transport request creation and status transition view |
| Placeholder 9 | Admin dashboard metrics and moderation actions |
| Placeholder 10 | Quick-start manual screenshots for farmer, buyer, provider, and admin |

---

**Prepared by:** Daniel Muema Makai  
Lead Developer / Researcher
