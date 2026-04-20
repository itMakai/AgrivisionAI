# PROGRESS REPORT: INITIAL SYSTEM IMPLEMENTATION (WEEK 4)

**Project Title:** An Integrated Digital Platform for Empowering Farmers in Makueni County

**Student Name:** Daniel Muema Makai

**Registration Number:** IC211-0009/2022

**Supervisor:** Dr. Solomon Mwanjele

**Date:** March 28, 2026

## 1. Introduction

This document presents the progress achieved during Week 4 of system implementation, covering March 16 to March 20, 2026. At this stage, the project has moved from planning into actual development and has achieved over 40% functionality. The main completed core module is the **Marketplace Module**, which is now operational and demonstrates the system's ability to connect farmers and buyers through digital produce listings.

## 2. Module One: Marketplace Overview

The Marketplace Module is designed to improve market access for farmers by allowing produce to be listed and discovered online. The module currently supports the following functions:

- **User Authentication:** Farmers and buyers can register and log in securely using token-based authentication.
- **Produce Listing:** Authenticated users can create listings by selecting a crop, quantity, unit, price, market, and contact phone number.
- **Product Discovery:** Users can browse active listings and filter them by crop, market, or search keyword.
- **Buyer-Farmer Interaction:** Buyers and farmers can initiate communication from the marketplace through the integrated messaging feature.

## 3. Technical Implementation

### 3.1 Backend Architecture (Django)

The backend is implemented using **Django** and **Django REST Framework**, with **SQLite** as the current development database.

Core marketplace entities implemented include:

- **Crop**: stores crop names and local language labels.
- **Market**: stores market names within Makueni County.
- **Listing**: stores the owner, crop, quantity, unit, price, market, contact phone, status, and creation time.
- **FarmerProfile / BuyerProfile**: distinguish user roles and support marketplace permissions.

The backend exposes working marketplace endpoints for:

- registering and logging in users,
- creating listings,
- retrieving active listings,
- filtering listings by crop, market, owner, and search term,
- protecting listing updates and deletion so only the owner or admin can modify them.

### 3.2 Frontend Architecture (React)

The frontend is built with **React.js** and provides the user interface for marketplace access.

Implemented frontend pages and logic include:

- **Marketplace.jsx**: loads crops, markets, and available listings.
- **AuthContext.jsx**: manages authenticated user sessions and privileges.
- **api.js**: connects the React frontend to Django API endpoints such as `/api/listings/`, `/api/crops/`, `/api/markets/`, `/api/auth/login/`, and `/api/auth/register/`.

The marketplace page already supports:

- displaying all active listings,
- searching by crop, market, or keyword,
- creating a new listing through a form,
- opening a message dialog to contact another user.

## 4. Functional Demonstration (Proof of Work)

| Step | Action | Expected Result | Status |
|---|---|---|---|
| 1 | User Registration / Login | Authentication token is generated and user role is recognized. | Working |
| 2 | Create Listing | Listing data is submitted to `/api/listings/` and saved in SQLite. | Working |
| 3 | View Marketplace | Active listings are fetched and displayed on the marketplace page. | Working |
| 4 | Search and Filter | Listings can be filtered by crop, market, or keyword. | Working |
| 5 | Contact Listing Owner | User can open the messaging modal from a listing card. | Working |

## 5. Alignment with Assessment Criteria

### 5.1 Working Module Demonstration (8 Marks)

The Marketplace Module is functional and demonstrates a complete core workflow:

- authentication,
- listing creation,
- listing retrieval,
- marketplace search,
- user-to-user contact initiation.

This confirms that Module One is working and suitable for the required Week 4 partial system demonstration.

### 5.2 Code Structure and Organization (4 Marks)

The project maintains a clear separation of concerns:

- **Frontend:** React application for user interaction,
- **Backend:** Django REST API for business logic and persistence,
- **Database:** SQLite for storing users, crops, markets, and listings.

The codebase is organized into dedicated files for models, serializers, views, authentication, and page-level frontend components.

### 5.3 Progress Consistency (3 Marks)

Development progress is consistent with the implementation schedule for Week 4. The project has moved beyond setup into real feature delivery, with the marketplace serving as the first completed core module. Additional modules such as messaging, transport, and platform analytics are also partially implemented, supporting the claim that the system is already above 40% functional.

## 6. Conclusion

By the end of Week 4, the initial system implementation milestone has been achieved. The Marketplace Module is operational and demonstrates the core objective of digitally connecting farmers and buyers in Makueni County. This provides a solid foundation for extending the system with transport coordination, analytics, and other supporting services in the next development phase.

**Daniel Muema Makai**  
Lead Developer / Researcher
