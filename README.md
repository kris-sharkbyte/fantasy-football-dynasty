# Dynasty Fantasy Football Platform

A comprehensive dynasty fantasy football platform with advanced salary cap management, real-time features, and professional-grade tools. Built with Angular 20, Firebase, and a sophisticated negotiation system.

## 🚀 Features

### ✅ **Currently Implemented**

- **Authentication System** - Complete modal-based auth system with Sleeper-style design
- **Firebase Integration** - Real-time database with Firestore and Functions
- **Responsive UI** - Modern Angular 20 application with dark/light theme support
- **Route Protection** - Auth guards for protected features
- **Core Architecture** - Domain-driven design with shared libraries
- **League Management** - Complete league creation wizard and management interface
- **Team Dashboard** - Cap sheets, roster management, contract overview
- **Draft System** - Real-time draft room with pick tracking and timers
- **Contract Creation** - Professional contract creation interface with validation
- **Player Rating System** - Dynamic OVR calculation from Sleeper data
- **Player Personality System** - Deterministic personality profiles for negotiation

### 🔄 **In Development**

- **Negotiation Engine** - AI-powered contract negotiation system
- **Free Agency System** - Real-time bidding with market simulation
- **Advanced Cap Management** - Multi-year projections and dead money tracking

### 📋 **Planned Features**

- **Trade System** - Multi-team trades with cap impact analysis
- **Scoring Integration** - NFL stats to fantasy points
- **Analytics Dashboard** - Performance metrics and projections
- **Mobile App** - Progressive Web App with offline capabilities

## 🏗️ Architecture

### **Frontend**

- **Angular 20** - Modern standalone components with signals
- **TypeScript** - Full type safety across the entire application
- **Responsive Design** - Mobile-first approach with CSS Grid
- **Theme System** - Dark/light mode with CSS custom properties
- **Component Architecture** - Modular, reusable components with proper separation

### **Backend**

- **Firebase Functions v2** - Serverless API endpoints with Node 20
- **Firestore** - Real-time NoSQL database with optimized queries
- **Firebase Auth** - User authentication and role-based access control
- **Cloud Functions** - Scheduled jobs and real-time triggers

### **Domain Libraries**

- **Types** - Complete TypeScript interfaces for all entities
- **Domain** - Business logic (cap math, validators, player ratings, personality generation)
- **Adapters** - External service integrations (Sleeper API, scoring providers)
- **Testing** - Comprehensive test utilities and fixtures

## 🎯 **NEW: Advanced Negotiation System**

We've implemented a sophisticated 4-layer negotiation model that makes contract negotiations feel realistic and engaging:

### **Layer 1: Deterministic Baseline**

- **Salary Floor Calculation** - Based on player tier × age × position
- **Contract Minimums** - Implements the `PLAYER_CONTRACT.md` specifications
- **Cap Validation** - Real-time salary cap compliance checking

### **Layer 2: Player Personality & Risk**

- **Dynamic Personality Profiles** - Generated deterministically from player attributes
- **Risk Tolerance** - Affects guarantee vs. AAV preferences
- **Security Preferences** - Long-term vs. short-term contract desires
- **Agent Quality** - Determines negotiation toughness
- **Team Priorities** - Role, contender status, location preferences

### **Layer 3: Market Pressure**

- **Team Cap Space Analysis** - Real-time market conditions
- **Positional Need Assessment** - Team depth and requirements
- **Recent Comps** - Market value based on similar contracts
- **Season Stage** - Early FA vs. late season dynamics

### **Layer 4: Reputation & Memory**

- **Team Trust Scoring** - Historical negotiation behavior
- **Promise Tracking** - Playing time and role commitments
- **Contender Status** - Recent performance and playoff odds

### **Negotiation Flow**

1. **Offer Evaluation** - Player utility calculation based on personality
2. **Accept/Reject Logic** - Threshold-based decision making
3. **Counter Generation** - Intelligent counter-offers targeting gaps
4. **Anti-Lowball Protection** - Reservation value increases for insulting offers
5. **Patience System** - Limited negotiation rounds with consequences

### **Technical Implementation**

- **Deterministic Logic** - Fair and testable negotiation outcomes
- **LLM Integration Ready** - Structured data for AI-generated flavor text
- **Real-time Updates** - Live negotiation status and market changes
- **Audit Trail** - Complete negotiation history for transparency

## 🎨 **Enhanced Contract Creation Interface**

Our contract creation system now features a professional, two-column layout:

### **Left Column - Player Profile & Contract Inputs**

- **Dynamic Player Rating** - Calculated OVR from Sleeper data
- **Expected Value Calculation** - Market-based pricing with personality modifiers
- **Risk Assessment** - Visual risk bar with detailed analysis
- **Contract Form** - Years, salary, and bonus inputs with validation

### **Right Column - Team & Analysis**

- **Team Depth Analysis** - Position-specific depth chart
- **Cap Impact Breakdown** - Year-by-year cap hit calculations
- **Player Motivations** - Dynamic motivation factors based on personality
- **Interest Level** - Real-time interest calculation based on offer

### **Smart Validation System**

- **Real-time Feedback** - Instant validation as you type
- **Cap Compliance** - Ensures offers don't exceed salary cap
- **Minimum Requirements** - Enforces league contract floors
- **Risk Warnings** - Highlights potential negotiation issues

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled

### **Installation**

```bash
# Clone the repository
git clone <your-repo-url>
cd fantasy-football-dynasty

# Install dependencies
npm install

# Configure Firebase
# Update apps/web/src/environments/environment.ts with your Firebase config

# Start development server
npx nx serve web
```

### **Firebase Setup**

1. Create a Firebase project
2. Enable Email/Password authentication
3. Set up Firestore database
4. Update environment files with your config
5. See `FIREBASE_SETUP.md` for detailed instructions

## 🧪 Development

### **Commands**

```bash
# Development
npx nx serve web              # Start Angular app
npx nx serve functions        # Start Firebase emulators

# Building
npx nx build web             # Build Angular app
npx nx build functions       # Build Firebase Functions

# Testing
npx nx test web              # Run Angular tests
npx nx test domain           # Run domain logic tests
npx nx e2e web-e2e          # Run E2E tests

# Linting & Formatting
npx nx lint web             # Lint Angular app
npx nx format               # Format all files
```

### **Project Structure**

```
fantasy-football-dynasty/
├── apps/
│   ├── web/                 # Angular frontend
│   └── functions/           # Firebase Functions
├── libs/
│   ├── types/              # TypeScript interfaces
│   ├── domain/             # Business logic (cap math, ratings, personality)
│   ├── adapters/           # External integrations
│   └── testing/            # Test utilities
├── docs/                   # Documentation
└── PROJECT_CHECKLIST.md    # Detailed development status
```

## 🔐 User Roles & Access Control

### **Role Hierarchy**

1. **Owner** - Full system access, can manage all leagues
2. **Commissioner** - League management, rule changes, trade approval
3. **General Manager** - Team management, contracts, trades, negotiations
4. **User** - Basic access, view-only for most features

## 🎨 Theme System

The application supports both dark and light themes:

- **Automatic Detection** - Detects system preference
- **Manual Toggle** - User can switch themes
- **Persistence** - Theme choice is saved
- **Smooth Transitions** - CSS animations between themes
- **CSS Variables** - Consistent theming across all components

## 🔒 Security

- **Authentication** - Firebase Auth with email/password
- **Authorization** - Role-based access control
- **Data Validation** - Zod schemas for all inputs
- **HTTPS** - Secure connections everywhere
- **Input Sanitization** - XSS and injection protection

## 📱 Browser Support

- **Modern Browsers** - Chrome 90+, Firefox 88+, Safari 14+
- **Mobile** - Responsive design for all screen sizes
- **Progressive Web App** - Offline capabilities (planned)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation** - Check `PROJECT_CHECKLIST.md` for current status
- **Issues** - Report bugs via GitHub Issues
- **Discussions** - Join the community for questions and ideas

---

## 🚀 **What's Next?**

Our immediate roadmap focuses on completing the negotiation system:

### **Phase 1: Negotiation Engine (Current)**

- ✅ Player rating and personality systems
- ✅ Contract creation interface
- 🔄 Negotiation session management
- 🔄 Offer evaluation and counter generation

### **Phase 2: Market Simulation**

- 🔄 Team needs analysis
- 🔄 Market pressure calculations
- 🔄 Competitive offer simulation

### **Phase 3: LLM Integration**

- 🔄 AI-generated agent messages
- 🔄 Market rumor generation
- 🔄 Negotiation flavor text

### **Phase 4: Free Agency Integration**

- 🔄 Real-time bidding interface
- 🔄 Market rounds and tie-breakers
- 🔄 Contract commitment flows

---

_Built with ❤️ using Angular 20, Firebase, and sophisticated negotiation AI_
