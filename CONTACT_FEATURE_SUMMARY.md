# Contact Actions, Notes & History Feature

## What's Being Implemented

1. **Database Schema** ✅
   - Added `notes` column to `user_contacts` table
   - Created `contact_history` table for activity log
   - Activity types: call, schedule_appointment, follow_up_appointment, invited_bom, recruiting_interview, note

2. **Contact Queries** ✅
   - Updated to handle notes and history
   - Added hooks for contact detail, history, and updates

3. **Contact Detail Screen** (In Progress)
   - View/edit notes
   - View call history
   - Call action button
   - Action menu after calls

4. **Contacts List Updates** (Pending)
   - Make contacts clickable to open detail view
   - Quick actions on list items

5. **Call Actions** (Pending)
   - Call button that opens phone dialer
   - Action menu to log call outcomes
