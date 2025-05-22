# WastewiseClient

A Next.js-based web application for waste management and sustainability tracking.

## Prerequisites

- Node.js 18 or later
- NPM or other package manager (Yarn, pnpm, Bun)
- Environment variables set up (see Configuration section)

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables in `.env` file:
```env
NEXT_PUBLIC_DATABASE_URL=your_database_url
NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID=your_web3_auth_client_id
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Features

- User Authentication with Web3
- Interactive Map Integration
- Waste Collection Tracking
- Leaderboard System
- Rewards Management
- Reporting System
- Real-time Messaging
- Settings Management

## Project Structure

```
app/                    # Next.js app directory
├── collect/           # Waste collection features
├── leaderboard/       # Leaderboard system
├── map/              # Map integration
├── messages/         # Messaging system
├── report/           # Reporting features
├── rewards/          # Rewards management
├── settings/         # User settings
└── verify/           # Verification system
```

## Technologies Used

- Next.js 14
- TailwindCSS
- Web3Auth
- Google Maps API
- Gemini AI
- DrizzleORM

## Deployment

The application can be deployed using Vercel:

1. Push your code to a Git repository
2. Import your project to [Vercel](https://vercel.com/new)
3. Configure your environment variables
4. Deploy

