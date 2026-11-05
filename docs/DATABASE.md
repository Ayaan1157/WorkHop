# WorkHop Database Schema & ER Diagram

## Overview
WorkHop's database architecture uses Supabase (PostgreSQL 15+) with Row Level Security (RLS) enabled on all public tables. The data model decouples core user identity from role-specific workspaces (`freelancer_profiles` and `employer_profiles`), allowing users to seamlessly hire and work from a single account without data collision.

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "1:1 (id = auth.users.id)"
    PROFILES ||--o| FREELANCER_PROFILES : "1:1 user_id"
    PROFILES ||--o| EMPLOYER_PROFILES : "1:1 user_id"
    PROFILES ||--o{ JOBS : "employer_id posts"
    PROFILES ||--o{ APPLICATIONS : "freelancer_id submits"
    JOBS ||--o{ APPLICATIONS : "job_id receives"
    ADMIN_USERS ||--o| PROFILES : "user_id / email"
    
    PROFILES {
        uuid id PK "references auth.users(id)"
        string full_name
        string avatar_url
        string phone
        string city
        string area
        numeric lat
        numeric lng
        text_array roles "['freelancer', 'employer']"
        enum active_role "'freelancer' | 'employer'"
        boolean onboarding_completed
        boolean email_verified
        timestamptz created_at
        timestamptz updated_at
    }

    FREELANCER_PROFILES {
        uuid id PK
        uuid user_id FK "unique references profiles(id)"
        string headline
        string bio
        text_array skills
        string category
        integer hourly_rate
        text_array portfolio_urls
        text_array portfolio_images
        jsonb portfolio_json
        enum approval_status "'pending' | 'approved' | 'rejected'"
        string rejection_reason
        uuid approved_by FK
        timestamptz approved_at
        integer hops_balance
        numeric rating
        integer reviews_count
    }

    EMPLOYER_PROFILES {
        uuid id PK
        uuid user_id FK "unique references profiles(id)"
        string company_name
        string description
        string gst_number
        boolean verified
        integer total_spent
    }

    JOBS {
        uuid id PK
        uuid employer_id FK "references profiles(id)"
        string title
        string description
        string category
        string bucket
        integer pay
        string area
        numeric lat
        numeric lng
        enum status "'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled'"
        boolean is_boosted
        integer applicants_count
    }

    APPLICATIONS {
        uuid id PK
        uuid job_id FK "references jobs(id)"
        uuid freelancer_id FK "references profiles(id)"
        string note
        string applicant_area
        numeric distance_km
        integer boost_credits
        enum status "'applied' | 'shortlisted' | 'hired' | 'rejected' | 'withdrawn'"
        enum payment_mode "'escrow' | 'direct'"
    }

    ADMIN_USERS {
        uuid id PK
        uuid user_id FK "optional references auth.users(id)"
        string email UK
        string notes
    }
```

## Storage Buckets
1. **`avatars`** (Public): User profile images and avatars. Max 3MB. Path pattern: `{auth.uid()}/avatar.{ext}`.
2. **`portfolio`** (Public): Verified work samples, photos, designs. Max 10MB. Path pattern: `{auth.uid()}/portfolio/{filename}`.
3. **`job-attachments`** (Private): NDA documents, specs, contracts. Max 15MB. Path pattern: `{auth.uid()}/jobs/{filename}`.
