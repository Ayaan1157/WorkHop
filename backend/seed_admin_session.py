"""Seed an admin user + a long-lived session token for automated testing.
Prints the session token to use as Bearer / localStorage 'workhop_session_token'.
"""
import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
ADMIN_EMAIL = "manarastudio22@gmail.com"
ADMIN_TOKEN = "st_admin_test_workhop_fixed_token"


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    user = await db.users.find_one({"email": ADMIN_EMAIL})
    if not user:
        user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": ADMIN_EMAIL,
            "name": "WorkHop Admin",
            "picture": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(dict(user))
    await db.user_sessions.update_one(
        {"session_token": ADMIN_TOKEN},
        {"$set": {
            "session_token": ADMIN_TOKEN,
            "user_id": user["user_id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=365),
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    print("ADMIN_EMAIL:", ADMIN_EMAIL)
    print("ADMIN_SESSION_TOKEN:", ADMIN_TOKEN)
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
