# Teddy Sheddy App

A React application for visitors of the Teddy Sheddy compound. Built with Vite, React, TypeScript, and Mantine UI, with integrated parsers using OpenAI and Langchain.

## Features

- 🏠 **Home Page**: Welcome page with navigation to different sections
- 🏷️ **Place Cards**: Rich cards displaying place information including name, type, description, contact info, and links
- 🔍 **Search & Filter**: Search places by name, description, tags, or category with advanced filtering
- 🗺️ **Map View**: Interactive map showing place locations using Mapbox
- 🔐 **Authentication**: Password-protected access with admin and guest roles
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🎨 **Modern UI**: Beautiful interface with Mantine components
- 📍 **Getting Here**: Information about visiting the compound

## Protected Content

- **Shady**: Guest-level protected content (requires guest password)
- **Lofty**: Guest-level protected content (requires guest password)  
- **Admin Dashboard**: Admin-only section for managing data and settings

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the app directory with required variables (see ENVIRONMENT_VARIABLES.md)

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Start the production server**:
   ```bash
   npm start
   ```

5. **Open your browser**: Navigate to `http://localhost:5173` (dev) or `http://localhost:3000` (production)

## Authentication

The app uses JWT-based authentication with two role levels:
- **Guest**: Access to Shady and Lofty content
- **Admin**: Full access including admin dashboard

Authentication is handled via the `AuthContext` and `ProtectedRoute` components.

## Project Structure

```
src/
├── components/
│   ├── Admin.tsx              # Admin route wrapper
│   ├── AdminDashboard.tsx     # Admin interface for data management
│   ├── Footer.tsx             # App footer
│   ├── GettingHere.tsx        # Visitor information
│   ├── Home.tsx               # Landing page
│   ├── Lofty.tsx              # Protected Lofty content
│   ├── MapView.tsx            # Interactive map component
│   ├── Navigation.tsx         # Main navigation
│   ├── PlaceCard.tsx          # Individual place card
│   ├── PlaceListItem.tsx      # Place list item component
│   ├── PlacesList.tsx         # Main places browser with search/filters
│   ├── ProtectedRoute.tsx     # Authentication wrapper
│   ├── Shady.tsx              # Protected Shady content
│   ├── useHouseMechanics.ts   # Custom hook for house mechanics data
│   └── index.ts               # Component exports
├── contexts/
│   └── AuthContext.tsx        # Authentication context
├── parser/                    # Data parsing and enrichment
│   ├── config.js              # Parser configuration
│   ├── index.js               # Main parser entry point
│   └── ...                    # Other parser modules
├── types.ts                   # TypeScript type definitions
├── theme.ts                   # Mantine theme configuration
├── App.tsx                    # Main app component with routing
└── main.tsx                   # App entry point
```

## Data Sources

- **Places Data**: Generated from Google Docs via the integrated parser
- **House Mechanics**: Markdown files for Lofty and Shady content
- **Authentication**: Server-side with JWT tokens

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm start` - Start production server
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run parse` - Run the data parser
- `npm run parse-debug` - Run parser with debug logging
- `npm run update-data` - Update place data

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI**: Mantine UI, Tabler Icons
- **Routing**: React Router DOM
- **Authentication**: JWT tokens, bcrypt
- **Maps**: Mapbox GL, React Map GL
- **Backend**: Express.js server
- **Data**: OpenAI API, Langchain, Google Docs API
- **Storage**: Google Cloud Storage integration
