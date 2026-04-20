# PROGRESS REPORT: TESTING AND DEBUGGING (WEEK 6)

**Project Title:** An Integrated Digital Platform for Empowering Farmers in Makueni County

**Student Name:** Daniel Muema Makai

**Registration Number:** IC211-0009/2022

**Supervisor:** Dr. Solomon Mwanjele

**Date:** April 12, 2026

## 1. Introduction

This document presents the progress achieved during Week 6, covering March 30 to April 3, 2026. The focus of this phase was testing, debugging, and quality assurance. At this stage, the system had already reached functional integration, so the main objective was to confirm stability, identify defects, and apply corrective measures. Testing was conducted primarily through integrated manual test cases on the live system, together with validation checks and frontend build verification. The system is now stable and fully functional for demonstration purposes.

## 2. Testing Scope Overview

The testing process covered the main operational modules of the platform:

- **Authentication and Profile Management**
- **Marketplace Module**
- **Messaging Module**
- **Transport and Logistics Module**
- **Platform Dashboard and Analytics**

The testing emphasis was placed on:

- correctness of user workflows,
- validation of input data,
- permission and access control,
- error handling in the frontend and backend,
- system behavior under invalid or incomplete requests.

## 3. Testing Procedures

### 3.1 Functional Testing Procedure

Testing was carried out by executing real user scenarios on the integrated system. Each scenario was observed from input to final output in order to verify expected behavior. The following procedure was followed:

- create or log in with valid user accounts,
- perform module-specific tasks such as listing produce, sending messages, and requesting transport,
- confirm that data is stored and retrieved correctly from the database,
- verify that the interface updates correctly after each action,
- repeat selected tasks with invalid or restricted inputs to confirm defensive behavior.

### 3.2 Stability and Build Verification

The frontend application was also verified through a production build process to confirm that the integrated React application compiles successfully without breaking errors. This helps confirm deployment readiness and frontend stability.

### 3.3 Validation and Debugging Procedure

Validation and debugging focused on identifying points where incorrect data or unauthorized access could cause failures. Inputs were intentionally varied to test:

- missing credentials,
- duplicate usernames,
- invalid listing references,
- unauthorized conversation access,
- invalid transport actions,
- expired sessions,
- unavailable external weather services.

## 4. Test Cases and Results

| Test Case | Procedure | Expected Result | Result |
|---|---|---|---|
| 1. Valid registration and login | Register a user and sign in with correct credentials. | Token is issued and user session is established. | Passed |
| 2. Duplicate username validation | Attempt to register using an existing username. | System rejects the request with an error message. | Passed |
| 3. Marketplace listing creation | Log in as farmer or buyer and create a produce listing. | Listing is saved and appears in the marketplace feed. | Passed |
| 4. Invalid listing input | Submit a listing with an invalid crop reference. | Backend blocks the request and returns validation feedback. | Passed |
| 5. Messaging workflow | Open a conversation and send a valid message. | Message is stored and displayed in the conversation flow. | Passed |
| 6. Empty message validation | Attempt to send a blank message. | System rejects the request and prevents invalid submission. | Passed |
| 7. Transport request workflow | Create a transport request for an owned listing. | Request is linked to the correct provider, service, and listing. | Passed |
| 8. Transport permission control | Attempt to modify a request without the required role or ownership. | System denies the action with an authorization error. | Passed |
| 9. Dashboard loading | Open the integrated platform dashboard. | Metrics, listings, forecasts, and advisories load correctly. | Passed |
| 10. Frontend build verification | Run the production build process for the React frontend. | Application builds successfully without fatal errors. | Passed |

## 5. Bugs Identified and Corrective Measures

| Bug / Issue Identified | Effect on System | Corrective Measure Taken | Status |
|---|---|---|---|
| Invalid marketplace crop values could break listing creation | Incorrect or missing crop data could cause failed listing requests | Added serializer-level crop validation so only valid crop IDs or names are accepted | Fixed |
| Unauthorized users could attempt restricted actions | Risk of modifying listings, chats, or transport requests without permission | Added role-based and owner-based permission checks across listings, messaging, and transport endpoints | Fixed |
| Empty or malformed chat requests reduced messaging reliability | Users could attempt to send unusable conversation data | Added validation for required message body, required conversation targets, and access checks for conversations | Fixed |
| Session timeout handling needed stronger control | Expired sessions could create inconsistent user behavior | Added expiring token authentication on the backend and automatic logout handling on the frontend | Fixed |
| External weather service failures could affect dashboard stability | Analytics pages could fail when live weather data was unavailable | Added fallback weather and generated analytics responses to keep the dashboard usable | Fixed |
| User-facing feedback was limited during failed actions | Users could be confused when API actions failed | Added visible frontend error messages for login, registration, marketplace, messaging, transport, and admin operations | Fixed |

## 6. Alignment with Assessment Criteria

### 6.1 Test Case Design (4 Marks)

The test cases were designed to cover both normal and abnormal system behavior. They included successful workflows, invalid input handling, permission checks, and integrated feature testing across multiple modules. This provided a balanced evaluation of correctness and robustness.

### 6.2 Debugging Effectiveness (3 Marks)

Debugging was effective because identified issues were followed by direct corrective action. Validation logic, permission rules, session control, fallback behavior, and user-facing feedback were all strengthened to reduce runtime failures and improve system reliability.

### 6.3 System Stability (3 Marks)

The system now demonstrates stable end-to-end behavior across its key modules. Core workflows such as authentication, listing creation, messaging, transport coordination, and dashboard monitoring function consistently. The successful frontend production build further supports the system's readiness for presentation.

## 7. Conclusion

By the end of Week 6, the project had moved into a stable and presentation-ready state. Testing confirmed that the major modules work correctly in an integrated environment, while debugging strengthened validation, access control, and resilience to failure conditions. The system is therefore fully functional and sufficiently stable for the required academic demonstration.

**Daniel Muema Makai**  
Lead Developer / Researcher
