#!/usr/bin/env python3
"""
WorkHop Database Migration 001: Rebuild Payment Deals from Scratch
Date: 2026-10-02

AUDIT SUMMARY (Step 0):
- Legacy mock escrow orders were stored client-side in localStorage ("workhop_escrow_orders").
- Legacy conversation records contained a naive "status" field ("applied" | "hired" | "completed")
  which is now upgraded to reference server-governed deals.
- Unrelated monetization tables (subscriptions, plan_purchases, job_boosts, credits_wallet,
  credit_transactions, employer_unlocks) are strictly preserved.

This migration:
1. Creates indexes for the new deals, deal_events, and escrow_ledger collections.
2. Initializes default platform deal settings in site_settings if not already present.
3. Ensures existing applications and conversations can cleanly link to deal records.
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient


async def run_migration():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "workhop")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print(f"[Migration 001] Connecting to MongoDB at {mongo_url}, database: {db_name}")

    # 1. Deals Indexes
    print("[Migration 001] Creating indexes on 'deals' collection...")
    await db.deals.create_index("deal_id", unique=True)
    await db.deals.create_index("conversation_id")
    await db.deals.create_index("job_id")
    await db.deals.create_index("employer_id")
    await db.deals.create_index("freelancer_id")
    await db.deals.create_index("status")
    await db.deals.create_index("payment_mode")
    await db.deals.create_index("created_at")

    # 2. Deal Events Indexes
    print("[Migration 001] Creating indexes on 'deal_events' collection...")
    await db.deal_events.create_index("event_id", unique=True)
    await db.deal_events.create_index("deal_id")
    await db.deal_events.create_index("conversation_id")
    await db.deal_events.create_index("created_at")

    # 3. Escrow Ledger Indexes
    print("[Migration 001] Creating indexes on 'escrow_ledger' collection...")
    await db.escrow_ledger.create_index("ledger_id", unique=True)
    await db.escrow_ledger.create_index("deal_id")
    await db.escrow_ledger.create_index("gateway_ref")
    await db.escrow_ledger.create_index("entry_type")
    await db.escrow_ledger.create_index("created_at")

    # 4. Applications Index
    print("[Migration 001] Creating index on 'applications' collection...")
    await db.applications.create_index("proposed_payment_mode")

    # 5. Initialize Site Settings Defaults
    print("[Migration 001] Initializing default deal settings in 'site_settings'...")
    await db.site_settings.update_one(
        {"_id": "general_settings"},
        {
            "$setOnInsert": {
                "deal_commission_rate": 0.05,
                "deal_auto_release_hours": 72,
                "deal_funding_timeout_hours": 24,
            }
        },
        upsert=True
    )

    print("[Migration 001] Migration completed successfully!")
    client.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
