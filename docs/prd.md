# Requirements Document

## 1. Application Overview

### 1.1 Application Name
MetaPay

### 1.2 Application Description
A complete full-stack earning platform enabling users to earn money through various tasks including surveys, watching ads, app testing, data annotation, offers, video tasks, daily tasks, and referrals. The platform features a premium modern UI with purple, blue, and green gradients, glassmorphism effects, dark/light mode support, and responsive design.

## 2. Users and Usage Scenarios

### 2.1 Target Users
- General users seeking to earn money through online tasks
- Inactive users (registered but not activated)
- Active users (paid package subscribers)
- Administrators (Moderator, Admin, Super Admin)

### 2.2 Core Usage Scenarios
- Users register and activate accounts by purchasing packages
- Users complete tasks to earn rewards
- Users refer others to earn referral bonuses
- Users withdraw earnings via M-Pesa
- Administrators manage users, tasks, payments, and withdrawals

## 3. Page Structure and Functionality

### 3.1 Page Hierarchy

```
MetaPay Platform
├── Public Pages (No login required)
│   ├── Home Page
│   ├── Login Page
│   └── Registration Page
├── User Pages (Login required)
│   ├── Dashboard
│   ├── Tasks Page
│   ├── Earnings Page
│   ├── Referrals Page
│   ├── Withdrawals Page
│   ├── Packages Page
│   ├── Account Page
│   └── Payment Success Page
└── Admin Panel (Admin login required)
    ├── Admin Dashboard
    ├── User Management
    ├── Task Management
    ├── Payment Management
    ├── Withdrawal Management
    ├── Referral Management
    ├── Live Activity Manager
    ├── Announcement Manager
    └── Site Settings
```

### 3.2 Public Pages

#### 3.2.1 Home Page
- Display hero section with platform introduction
- Show platform statistics (total users, total earnings, active tasks)
- Display testimonials from users
- Show FAQ section
- Display package options with pricing and features
- Show task preview section
- Display live activity ticker showing recent registrations, withdrawals, task completions, earnings, and package activations
- Provide login and register buttons
- Show about section explaining platform purpose
- Display how it works section with step-by-step guide
- Show recent winners section

#### 3.2.2 Login Page
- Input fields: phone number, password
- Login button
- Link to registration page
- Forgot password option

#### 3.2.3 Registration Page
- Input fields: full name, username (optional), email (optional), phone number, password, confirm password, referral code (optional)
- Register button
- Link to login page
- Upon successful registration, automatically create user profile with: status=\"inactive\", account_approved=false, package=null, completed_tasks=0, withdrawal_balance=0, premium_referrals_used=0, payment_verified=false
- Generate referral code automatically for new user

### 3.3 User Pages

#### 3.3.1 Dashboard
- Display welcome card with user name
- Show current balance card
- Display today's earnings card
- Show weekly earnings card
- Display monthly earnings card
- Show referral earnings card
- Display completed tasks count card
- Show active package card
- Display package expiry date card
- Show recent activity list
- Display earnings chart using graphs
- Show task completion graph
- Display realtime activity graph
- Show leaderboard section
- Display announcements section
- Show daily rewards section
- Display recent transactions list
- Show live feed with platform activity
- Display task categories grid
- Show referral panel with referral code and link
- For inactive users: display all dashboard elements but show locked sections with \"Activate your account to unlock earning\" message, disable task cards and buttons with blur/lock effect, show package upgrade banner, display 0 available tasks
- For active users: enable all features and show actual data

#### 3.3.2 Tasks Page
- Display task categories: Surveys, Watching Ads, App Testing, Data Annotation, Offers, Video Tasks, Daily Tasks, Referrals
- Show task cards with: reward amount, difficulty level, time estimate, start button
- Open task content inside the application (not external redirect)
- For inactive users: show 0 tasks available, disable all task cards
- For active users: show available tasks based on package limits

#### 3.3.3 Earnings Page
- Display total earnings
- Show earnings breakdown by category
- Display earnings history with date, task type, amount
- Show earnings charts and graphs

#### 3.3.4 Referrals Page
- Display referral code
- Show referral link with copy button
- Display referral earnings total
- Show referral count
- Display remaining premium referrals (maximum 3)
- Show list of referred users with status and earnings

#### 3.3.5 Withdrawals Page
- Display current withdrawal balance
- Show withdraw button (minimum KES 500)
- Display withdrawal method: M-Pesa only
- Show withdrawal history with: date, amount, method, status (Pending, Approved, Rejected)
- Display pending withdrawal requests
- For inactive users: disable withdraw button

#### 3.3.6 Packages Page
- Display available packages:
  - Starter: KES 399
  - Bronze: KES 1000
  - Silver: KES 2000
  - Gold: KES 3500
  - VIP: KES 5500
- Show package cards with: name, features list, task limits, daily earnings estimate, benefits, activate button
- Upon clicking activate button, launch in-app payment via embedded page/webview/modal using Paynecta payment URL: https://paynecta.co.ke/pay/metapay-agencies
- Do not redirect user outside application

#### 3.3.7 Account Page
- Display user profile information: full name, username, email, phone number
- Show account status (active/inactive)
- Display current package
- Show activation date
- Display payment verification status
- Provide edit profile option
- Show account settings

#### 3.3.8 Payment Success Page
- Display after successful payment verification
- Show confetti animation
- Display success card with message: \"Payment successful. Welcome to MetaPay\"
- Show activated package details
- Provide button to redirect to dashboard

### 3.4 Admin Panel

#### 3.4.1 Admin Dashboard
- Display total users count
- Show active users count
- Display inactive users count
- Show total revenue
- Display total transactions count
- Show pending withdrawals count
- Display pending payments count
- Show graphs for: user growth, revenue trends, task completion rates

#### 3.4.2 User Management
- Search users by name, phone, email, username
- Display user list with: name, phone, status, package, registration date
- Provide actions: edit user, delete user, suspend user, activate user, view profile, change package

#### 3.4.3 Task Management
- Create new task with: title, description, category, reward amount, difficulty, time estimate, task limits
- Edit existing tasks
- Delete tasks
- Manage task categories

#### 3.4.4 Payment Management
- Display payment logs with: user, package, amount, payment date, verification status
- Show verification logs
- Display all transactions
- Show activation logs

#### 3.4.5 Withdrawal Management
- Display pending withdrawal requests
- Provide approve action
- Provide reject action
- Enable bulk actions for multiple withdrawals
- Show withdrawal history

#### 3.4.6 Referral Management
- Display referral statistics
- Show referral earnings by user
- Monitor referral activities

#### 3.4.7 Live Activity Manager
- Enable or disable live activity system
- Moderate live activity feed
- Pin announcements to live feed
- Create activity manually

#### 3.4.8 Announcement Manager
- Create announcements
- Edit announcements
- Delete announcements
- Publish or unpublish announcements

#### 3.4.9 Site Settings
- Configure site name
- Upload logo
- Set support email
- Manage terms and conditions
- Manage privacy policy
- Configure SEO settings
- Enable or disable maintenance mode
- Manage push notifications

## 4. Business Rules and Logic

### 4.1 Account Activation Rules
- New users register with inactive status
- Users must purchase a package to activate account
- Upon successful payment verification: set status=\"active\", account_approved=true, payment_verified=true, activation_date=current timestamp, save package, create transaction record, create activation logs, send notification, redirect to dashboard
- Active users can: start tasks, submit tasks, earn rewards, withdraw money, access premium features, access earning tools
- Inactive users can: login, view dashboard, view packages, view tasks, view earnings, view referrals, view account page
- Inactive users cannot: start tasks, submit tasks, earn rewards, withdraw money, access premium features, access earning tools

### 4.2 Payment Processing Flow
- User selects package on Packages Page
- System launches in-app Paynecta payment using URL: https://paynecta.co.ke/pay/metapay-agencies
- Payment opens inside application via embedded page/webview/modal
- System verifies payment using Paynecta API key: hmp_SYI0yyw2aRpqBMmb5LCieAu5Nn2BZTb9jnHaO1ud and webhook secret: devan1234
- Upon successful verification: save transaction with receipt, payment amount, package, payment date
- Automatically activate user account
- Redirect to Payment Success Page with confetti animation
- Then redirect to active dashboard

### 4.3 Referral System Rules
- System generates referral code automatically upon user registration
- Referral reward: 10% of referred user's earnings
- Premium referral limit: maximum 3 premium referrals per user
- Track referral count and remaining premium referrals

### 4.4 Withdrawal Rules
- Minimum withdrawal amount: KES 500
- Withdrawal method: M-Pesa only
- Only active users can withdraw
- Withdrawal statuses: Pending, Approved, Rejected
- Admin must approve or reject withdrawal requests

### 4.5 Task Access Rules
- Inactive users see 0 available tasks
- Active users see tasks based on package limits
- Task redirections open inside application
- Track task completions and update user earnings

### 4.6 Live Activity System
- Display realtime activity on homepage and dashboard
- Show: recent registrations, recent withdrawals, recent task completions, recent earnings, recent package activations
- Examples: \"John from Nairobi earned KES 200\", \"Sarah activated Gold package\", \"Kevin withdrew KES 3,500\"
- Include animated ticker, pulse indicators, auto refresh, real-time feed
- Admin can enable, disable, moderate, pin announcements, create activity manually

### 4.7 Admin Role Permissions
- Moderator: limited access to user management and content moderation
- Admin: full access to all management features except site settings
- Super Admin: full access to all features including site settings

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| User attempts to withdraw below minimum amount | Display error message: \"Minimum withdrawal is KES 500\" |
| Inactive user attempts to start task | Display locked message: \"Activate your account to unlock earning\" |
| User exceeds premium referral limit | Display message: \"You have reached the maximum of 3 premium referrals\" |
| Payment verification fails | Display error message, do not activate account, log failed transaction |
| User attempts to access admin panel without admin role | Redirect to login page or display access denied message |
| Withdrawal request pending | Disable new withdrawal requests until current request is processed |
| Package expiry | Notify user, downgrade to inactive status if not renewed |
| Duplicate referral code | Regenerate unique referral code |
| Invalid phone number format during registration | Display validation error |
| Password mismatch during registration | Display error: \"Passwords do not match\" |

## 6. Acceptance Criteria

1. User registers on Registration Page with phone number and password, system creates inactive profile with referral code
2. User logs in on Login Page, system redirects to Dashboard showing inactive status with locked features
3. User navigates to Packages Page, selects package, completes payment via in-app Paynecta payment, system verifies payment and activates account
4. System redirects to Payment Success Page with confetti animation, then to active Dashboard with unlocked features
5. User navigates to Tasks Page, selects and completes task inside application, system updates earnings
6. User navigates to Withdrawals Page, submits withdrawal request for amount above KES 500, admin approves request, system processes withdrawal
7. User navigates to Referrals Page, copies referral link, shares with others, referred user registers and activates, system credits 10% referral reward
8. Admin logs into Admin Panel, views pending withdrawals, approves or rejects requests, manages users and tasks

## 7. Out of Scope for Current Release

- Multiple withdrawal methods beyond M-Pesa
- Automated withdrawal approval without admin review
- Task creation by users
- Multi-language support
- Mobile native applications (iOS/Android)
- Cryptocurrency payment options
- Advanced analytics and reporting dashboards
- Email notification system
- SMS notification system
- Social media integration for sharing
- Gamification features (badges, achievements, levels)
- User-to-user messaging system
- Advanced fraud detection algorithms
- Automated task verification
- API for third-party integrations
- White-label solutions for partners