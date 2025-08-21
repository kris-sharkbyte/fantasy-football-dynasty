# Admin Subdomain Architecture

## 🏗️ Overview

The Dynasty Fantasy Football platform will use a unified main application with a separate admin subdomain only for commissioner/owner tools. This follows the Sleeper.com pattern where users sign in and go directly to their leagues.

## 🌐 Domain Structure

### **Production**

- `yourdomain.com` - Main user interface (GMs, players) - unified app
- `admin.yourdomain.com` - Admin/commissioner panel only

### **Development**

- `localhost:4200` - Main app (unified)
- `localhost:4201` - Admin panel only

## 🔐 Role-Based Access

### **Admin Panel Access**

- **Owner** - Full system access
- **Commissioner** - League management, rule changes
- **General Manager** - Limited access (team management only)
- **User** - No access (redirected to main app)

### **Main App Access**

- **All authenticated users** - Basic features
- **GMs** - Team management, contracts, trades
- **Players** - View-only access to team info

## 🚀 Implementation Plan

### **Phase 1: Admin Panel Setup**

1. Create separate Angular app for admin
2. Set up routing and authentication
3. Implement role-based guards
4. Create basic admin dashboard

### **Phase 2: Admin Features**

1. **League Management**

   - Create/edit leagues
   - Manage teams and owners
   - Configure rules and settings
   - Monitor league activity

2. **User Management**

   - User profiles and roles
   - Permission management
   - Activity monitoring
   - Support tools

3. **System Administration**
   - Database management
   - Backup and restore
   - Performance monitoring
   - Security settings

### **Phase 3: Integration**

1. Shared authentication between apps
2. Cross-app navigation
3. Unified user experience
4. Data synchronization

## 🛠️ Technical Implementation

### **Angular Workspace Structure**

```
fantasy-football-dynasty/
├── apps/
│   ├── web/                 # Main user app (port 4200)
│   ├── admin/               # Admin panel (port 4201)
│   └── functions/           # Firebase Functions
├── libs/
│   ├── shared/              # Shared components/services
│   ├── auth/                # Authentication logic
│   └── admin/               # Admin-specific logic
```

### **Shared Services**

- Authentication service
- User profile service
- Role management service
- Theme service

### **Admin-Specific Services**

- League management service
- User management service
- System monitoring service
- Audit logging service

## 🔒 Security Considerations

### **Authentication**

- Shared Firebase Auth between apps
- JWT token validation
- Session management

### **Authorization**

- Role-based access control (RBAC)
- Route guards for admin routes
- API endpoint protection

### **Data Isolation**

- Admin users can access all data
- Regular users restricted to their leagues/teams
- Audit logging for all admin actions

## 📱 User Experience

### **Navigation**

- Seamless switching between apps
- Consistent design language
- Shared theme system
- Responsive design

### **Features**

- **Main App**: Team management, contracts, trades
- **Admin Panel**: League oversight, user management, system tools

## 🚀 Deployment Strategy

### **Development**

- Local development with different ports
- Shared Firebase project
- Hot reload for both apps

### **Staging**

- Separate subdomains
- Shared backend services
- Integration testing

### **Production**

- CDN configuration
- Load balancing
- Monitoring and alerting

## 📋 Next Steps

1. **Immediate** (This Sprint)

   - Create admin Angular app
   - Set up basic routing
   - Implement theme system

2. **Short Term** (Next 2 Sprints)

   - Admin authentication
   - Basic dashboard
   - User management

3. **Medium Term** (Next Month)

   - League management tools
   - Role-based access
   - Cross-app navigation

4. **Long Term** (Next Quarter)
   - Advanced admin features
   - System monitoring
   - Performance optimization
