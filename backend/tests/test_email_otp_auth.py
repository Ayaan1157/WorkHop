"""Backend tests for email OTP auth + freelancer/verify-email + complaints (iteration 20)."""
import os
import time
import uuid

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", os.environ.get("EXPO_BACKEND_URL", "")).rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]

CREATED_EMAILS: list[str] = []
CREATED_FREELANCERS: list[str] = []
CREATED_SESSIONS: list[str] = []


def _uniq_email(tag: str) -> str:
    e = f"workhop.test.{tag}.{uuid.uuid4().hex[:8]}@example.com"
    CREATED_EMAILS.append(e)
    return e


def _read_otp(email: str) -> str:
    doc = db.email_otps.find_one({"_id": email})
    assert doc, f"OTP not found in db.email_otps for {email}"
    return doc["otp"]


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    # Cleanup
    for e in CREATED_EMAILS:
        db.email_otps.delete_many({"_id": e})
        u = db.users.find_one({"email": e})
        if u:
            db.user_sessions.delete_many({"user_id": u.get("user_id")})
            db.users.delete_one({"email": e})
    for fid in CREATED_FREELANCERS:
        db.freelancers.delete_one({"_id": fid})
    for st in CREATED_SESSIONS:
        db.user_sessions.delete_many({"session_token": st})


# ------------- request-otp -------------
class TestRequestOtp:
    def test_valid_email_returns_ok(self, api):
        email = _uniq_email("req1")
        r = api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": email})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert "sent" in data
        # Verify persisted in mongo
        assert db.email_otps.find_one({"_id": email}) is not None

    def test_cooldown_returns_429_on_immediate_resend(self, api):
        email = _uniq_email("cool")
        r1 = api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": email})
        assert r1.status_code == 200
        r2 = api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": email})
        assert r2.status_code == 429, r2.text

    def test_invalid_email_returns_400(self, api):
        r = api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": "not-an-email"})
        assert r.status_code == 400, r.text


# ------------- verify-otp -------------
class TestVerifyOtp:
    def test_wrong_code_returns_400_and_increments_attempts(self, api):
        email = _uniq_email("wrong")
        api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": email})
        # attempts should start at 0
        r = api.post(f"{BASE_URL}/api/auth/email/verify-otp", json={"email": email, "otp": "000000"})
        assert r.status_code == 400
        doc = db.email_otps.find_one({"_id": email})
        assert doc and doc.get("attempts", 0) >= 1

    def test_correct_code_returns_session_and_user(self, api):
        email = _uniq_email("ok")
        api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": email})
        otp = _read_otp(email)
        r = api.post(f"{BASE_URL}/api/auth/email/verify-otp", json={"email": email, "otp": otp})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_token" in data and data["session_token"].startswith("st_")
        assert data["user"]["email"] == email
        assert data["user"]["user_id"]
        CREATED_SESSIONS.append(data["session_token"])

        # /auth/me works with bearer
        me = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {data['session_token']}"})
        assert me.status_code == 200, me.text
        assert me.json()["email"] == email
        # Consumed OTP should be removed
        assert db.email_otps.find_one({"_id": email}) is None

    def test_relogin_reuses_same_user_id(self, api):
        email = _uniq_email("relog")
        # first login
        api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": email})
        otp1 = _read_otp(email)
        r1 = api.post(f"{BASE_URL}/api/auth/email/verify-otp", json={"email": email, "otp": otp1})
        assert r1.status_code == 200
        uid1 = r1.json()["user"]["user_id"]
        CREATED_SESSIONS.append(r1.json()["session_token"])
        # wait past 60s cooldown OR bypass by deleting the last_sent record — the OTP was consumed, so no cooldown
        # request again
        r_req = api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": email})
        assert r_req.status_code == 200, r_req.text
        otp2 = _read_otp(email)
        r2 = api.post(f"{BASE_URL}/api/auth/email/verify-otp", json={"email": email, "otp": otp2})
        assert r2.status_code == 200, r2.text
        uid2 = r2.json()["user"]["user_id"]
        CREATED_SESSIONS.append(r2.json()["session_token"])
        assert uid1 == uid2, "Re-login must reuse the same user_id"


# ------------- freelancer/verify-email -------------
class TestFreelancerVerifyEmail:
    def _create_paid_freelancer(self, email: str) -> str:
        fid = f"fl_{uuid.uuid4().hex[:12]}"
        db.freelancers.insert_one({
            "_id": fid, "freelancer_id": fid, "name": "Test Pro",
            "email": email, "paid": True, "created_at": "2026-01-01T00:00:00+00:00",
            "status": "paid",
        })
        CREATED_FREELANCERS.append(fid)
        return fid

    def test_success_sets_flags(self, api):
        email = _uniq_email("fverify")
        fid = self._create_paid_freelancer(email)
        api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": email})
        otp = _read_otp(email)
        r = api.post(f"{BASE_URL}/api/freelancer/verify-email", json={
            "freelancer_id": fid, "email": email, "otp": otp,
        })
        assert r.status_code == 200, r.text
        assert r.json()["verified"] is True
        doc = db.freelancers.find_one({"_id": fid})
        assert doc["aadhaar_verified"] is True
        assert doc["email_verified"] is True
        assert doc["email"] == email

    def test_wrong_otp_returns_400(self, api):
        email = _uniq_email("fbadotp")
        fid = self._create_paid_freelancer(email)
        api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": email})
        r = api.post(f"{BASE_URL}/api/freelancer/verify-email", json={
            "freelancer_id": fid, "email": email, "otp": "000000",
        })
        assert r.status_code == 400

    def test_unknown_freelancer_returns_404(self, api):
        email = _uniq_email("fnone")
        api.post(f"{BASE_URL}/api/auth/email/request-otp", json={"email": email})
        otp = _read_otp(email)
        r = api.post(f"{BASE_URL}/api/freelancer/verify-email", json={
            "freelancer_id": f"fl_ghost_{uuid.uuid4().hex[:6]}", "email": email, "otp": otp,
        })
        assert r.status_code == 404, r.text


# ------------- complaints -------------
class TestComplaints:
    def test_complaint_creation_returns_200(self, api):
        r = api.post(f"{BASE_URL}/api/complaints", json={
            "name": "TEST_User", "email": "test@example.com",
            "role": "freelancer", "subject": "TEST subject",
            "message": "TEST body",
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["ok"] is True and "complaint_id" in j
        # cleanup
        db.complaints.delete_one({"_id": j["complaint_id"]})
