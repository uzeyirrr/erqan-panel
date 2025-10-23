# Erqan - Property Rental Management System

A modern property rental management system built with Next.js 15, featuring user authentication, property management, and rental operations.

## Features

- **User Authentication**: Secure login and registration system
- **Property Management**: Add, edit, and manage rental properties
- **Dashboard**: Comprehensive overview of properties and rentals
- **Profile Management**: User profile customization
- **PWA Support**: Progressive Web App capabilities with offline support
- **Modern UI**: Built with Shadcn UI components and Tailwind CSS
- **Real-time Updates**: Live notifications and status updates

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI with Radix UI primitives
- **Database**: PocketBase
- **Icons**: Lucide React
- **PWA**: Service Worker with offline support

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd erqan
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Authentication pages
│   ├── register/
│   ├── my-properties/    # Property management
│   ├── rental-properties/
│   └── profile/          # User profile
├── components/           # Reusable UI components
│   ├── ui/              # Shadcn UI components
│   ├── Layout.tsx       # Main layout component
│   ├── Navbar.tsx       # Navigation bar
│   └── Sidebar.tsx      # Sidebar navigation
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication context
├── hooks/               # Custom React hooks
│   ├── usePWA.ts       # PWA functionality
│   └── useSettings.ts   # Settings management
└── lib/                 # Utility functions
    ├── pocketbase.ts    # Database connection
    ├── properties.ts    # Property operations
    ├── rental-system.ts # Rental management
    └── utils.ts         # General utilities
```

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server on port 3005
- `npm run lint` - Run ESLint

## Features Overview

### Authentication
- Secure user registration and login
- Protected routes and middleware
- Session management with PocketBase

### Property Management
- Add new rental properties
- Edit existing property details
- View property listings
- Property status tracking

### Dashboard
- Overview of all properties
- Rental statistics
- Quick actions and navigation

### PWA Features
- Install as native app
- Offline functionality
- Push notifications
- Service worker caching

## Development

The project uses modern development practices:

- **TypeScript** for type safety
- **ESLint** for code quality
- **Tailwind CSS** for styling
- **Turbopack** for fast development builds
- **App Router** for file-based routing

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is private and proprietary.
