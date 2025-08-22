# Dynasty Fantasy Football Platform

A comprehensive dynasty fantasy football platform with advanced salary cap management, real-time features, and professional-grade tools.

## 🚀 Features

### ✅ **Currently Implemented**

- **Authentication System** - User registration, login, and role-based access control
- **Firebase Integration** - Real-time database with Firestore
- **Responsive UI** - Modern Angular 20 application with dark/light theme support
- **Route Protection** - Auth guards for protected features
- **Core Architecture** - Domain-driven design with shared libraries

### 🔄 **In Development**

- **User Profiles & Roles** - Admin, Commissioner, General Manager, Owner roles
- **League Management** - Creation wizard, team invitations, settings
- **Team Dashboard** - Cap sheets, roster management, contract overview

### 📋 **Planned Features**

- **Contract System** - Salary cap calculations, dead money, extensions
- **Free Agency** - Real-time bidding with AI negotiation
- **Draft Room** - Interactive draft with pick trading
- **Trade System** - Multi-team trades with cap impact analysis
- **Scoring Integration** - NFL stats to fantasy points
- **Analytics** - Performance metrics and projections

## 🏗️ Architecture

### **Frontend**

- **Angular 20** - Modern standalone components
- **TypeScript** - Full type safety
- **Responsive Design** - Mobile-first approach
- **Theme System** - Dark/light mode with CSS custom properties

### **Backend**

- **Firebase Functions** - Serverless API endpoints
- **Firestore** - Real-time NoSQL database
- **Firebase Auth** - User authentication and management

### **Domain Libraries**

- **Types** - Complete TypeScript interfaces
- **Domain** - Business logic (cap math, validators)
- **Adapters** - External service integrations
- **Testing** - Comprehensive test utilities

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18+ and npm
- Firebase project with Authentication enabled

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

## 🎨 Theme System

The application supports both dark and light themes:

- **Automatic Detection** - Detects system preference
- **Manual Toggle** - User can switch themes
- **Persistence** - Theme choice is saved
- **Smooth Transitions** - CSS animations between themes

## 🔐 User Roles & Access Control

### **Role Hierarchy**

1. **Owner** - Full system access, can manage all leagues
2. **Commissioner** - League management, rule changes, trade approval
3. **General Manager** - Team management, contracts, trades
4. **User** - Basic access, view-only for most features

### **Admin vs User Interface**

- **Main App** (`app.yourdomain.com`) - User interface for GMs and players
- **Admin Panel** (`admin.yourdomain.com`) - Commissioner and owner tools

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

### **Updating Angular in Nx Workspaces**

When updating Angular versions in an Nx workspace, use the following process to avoid dependency conflicts:

```bash
# 1. Check for available migrations
npx nx migrate latest

# 2. Update to a specific Angular version (e.g., 20.2.1)
npx nx migrate @angular/core@20.2.1

# 3. Install updated dependencies
npm install

# 4. Run any generated migrations
npx nx migrate --run-migrations

# 5. Install dependencies again to resolve conflicts
npm install
```

**Note:** Always run migrations after updating dependencies to ensure compatibility and apply any necessary code changes.

### **Project Structure**

```
fantasy-football-dynasty/
├── apps/
│   ├── web/                 # Angular frontend
│   └── functions/           # Firebase Functions
├── libs/
│   ├── types/              # TypeScript interfaces
│   ├── domain/             # Business logic
│   ├── adapters/           # External integrations
│   └── testing/            # Test utilities
└── docs/                   # Documentation
```

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

_Built with ❤️ using Angular 20, Firebase, and modern web technologies_
