# Admin Approval & Welcome Walkthrough Feature

## Overview
This feature adds an admin approval system for new user signups and a welcome walkthrough.

## Implementation Steps

### 1. Database Schema
- Add `approval_status` field to `profiles` table (pending, approved, rejected)
- Update RLS policies to allow admins to view/update all profiles
- Update signup to create users with "pending" status

### 2. Admin Screen
- Create admin screen to view pending users
- Add approve/deny functionality
- Show user details (name, email, created date)

### 3. Approval Status Checks
- Update auth flow to check approval status
- Show pending screen to unapproved users
- Block access to app features until approved

### 4. Welcome Walkthrough
- Create welcome modal with "Welcome to Crowned Wealth Group"
- Add "Let's get started" button
- Show app walkthrough guide
- Use AsyncStorage to track if user has seen walkthrough
- Show walkthrough once after approval

### 5. Updates Needed
- Update signup flow
- Update login flow
- Update RLS policies
- Update types
- Update auth queries
