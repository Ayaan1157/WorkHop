"""Backend tests for iteration 8: auth, chat, map pins, anonymized jobs."""
import os
import requests
import pytest

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://payment-mgmt-10.preview.emergentagent.com").rstrip("/")
BEARER = "test_token_workhop_e2e"


# ------------- Auth -------------
class TestAuth:
    def test_auth_me_with_valid_token(self):
        r = requests.get(f"{BASE}/api/auth/me", headers={"Authorization": f"Bearer {BEARER}"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user_id"] == "user_testauto0001"
        assert d["email"] == "testauto@workhop.dev"

    def test_auth_me_without_token(self):
        r = requests.get(f"{BASE}/api/auth/me", timeout=30)
        assert r.status_code == 401

    def test_auth_me_bad_token(self):
        r = requests.get(f"{BASE}/api/auth/me", headers={"Authorization": "Bearer nope-token"}, timeout=30)
        assert r.status_code == 401


# ------------- Anonymized jobs -------------
class TestJobsAnonymized:
    def test_jobs_have_company_and_area_no_employer_info(self):
        r = requests.get(f"{BASE}/api/jobs", timeout=30)
        assert r.status_code == 200
        jobs = r.json()
        assert len(jobs) >= 100  # 200 gigs per iteration 7
        for j in jobs:
            assert "company_name" in j and j["company_name"]
            assert "area" in j and j["area"]
            assert "employer_name" not in j
            assert "employer_phone" not in j
            assert "phone" not in j

    def test_jobs_with_verified_freelancer_still_anonymous(self):
        # Create a verified freelancer
        p = requests.post(f"{BASE}/api/freelancer/pay", json={"full_name": "TEST_ChatE2E", "payment_method": "upi"}, timeout=30).json()
        fid = p["freelancer_id"]
        requests.post(f"{BASE}/api/freelancer/aadhaar/verify", json={"freelancer_id": fid, "aadhaar_number": "432112345678"}, timeout=30)
        r = requests.get(f"{BASE}/api/jobs?freelancer_id={fid}", timeout=30)
        assert r.status_code == 200
        for j in r.json():
            assert "employer_name" not in j and "employer_phone" not in j and "phone" not in j


# ------------- Map pins -------------
class TestMapPins:
    def test_map_pins_shape(self):
        r = requests.get(f"{BASE}/api/map/pins", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "center" in d and "lat" in d["center"] and "lng" in d["center"]
        assert d["center"]["lat"] == 12.9716
        assert len(d["candidates"]) == 50
        assert len(d["employers"]) == 14
        for p in d["candidates"] + d["employers"]:
            assert -90 <= p["lat"] <= 90
            assert -180 <= p["lng"] <= 180
            # near Bengaluru
            assert 12.5 < p["lat"] < 13.5
            assert 77.0 < p["lng"] < 78.0


# ------------- Apply → Chat -------------
@pytest.fixture(scope="module")
def verified_freelancer():
    p = requests.post(f"{BASE}/api/freelancer/pay", json={"full_name": "TEST_ChatFlow", "payment_method": "upi"}, timeout=30).json()
    fid = p["freelancer_id"]
    v = requests.post(f"{BASE}/api/freelancer/aadhaar/verify", json={"freelancer_id": fid, "aadhaar_number": "432112345678"}, timeout=30)
    assert v.status_code == 200
    return fid


class TestChatFlow:
    def test_apply_returns_conversation_id(self, verified_freelancer):
        jobs = requests.get(f"{BASE}/api/jobs", timeout=30).json()
        job_id = jobs[0]["id"]
        r = requests.post(f"{BASE}/api/jobs/{job_id}/apply", json={"freelancer_id": verified_freelancer, "note": "hi"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("conversation_id")
        pytest.conversation_id = d["conversation_id"]
        pytest.freelancer_id = verified_freelancer

    def test_send_message_freelancer(self):
        cid = pytest.conversation_id
        r = requests.post(f"{BASE}/api/chats/{cid}/messages", json={"sender_role": "freelancer", "text": "Hello from freelancer"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["sender_role"] == "freelancer"
        assert d["text"] == "Hello from freelancer"

    def test_send_message_employer(self):
        cid = pytest.conversation_id
        r = requests.post(f"{BASE}/api/chats/{cid}/messages", json={"sender_role": "employer", "text": "Hello from employer"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["sender_role"] == "employer"

    def test_send_empty_message_400(self):
        cid = pytest.conversation_id
        r = requests.post(f"{BASE}/api/chats/{cid}/messages", json={"sender_role": "freelancer", "text": "   "}, timeout=30)
        assert r.status_code == 400

    def test_send_bad_role_400(self):
        cid = pytest.conversation_id
        r = requests.post(f"{BASE}/api/chats/{cid}/messages", json={"sender_role": "admin", "text": "x"}, timeout=30)
        assert r.status_code == 400

    def test_list_messages(self):
        cid = pytest.conversation_id
        r = requests.get(f"{BASE}/api/chats/{cid}/messages", timeout=30)
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 2
        roles = {m["sender_role"] for m in msgs}
        assert "freelancer" in roles and "employer" in roles

    def test_get_chat_by_id(self):
        r = requests.get(f"{BASE}/api/chats/{pytest.conversation_id}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["conversation_id"] == pytest.conversation_id
        assert d["company_name"]
        assert d.get("last_message") is not None

    def test_get_chat_404(self):
        r = requests.get(f"{BASE}/api/chats/does-not-exist-xxx", timeout=30)
        assert r.status_code == 404

    def test_list_chats_filtered_by_freelancer(self):
        r = requests.get(f"{BASE}/api/chats?freelancer_id={pytest.freelancer_id}", timeout=30)
        assert r.status_code == 200
        chats = r.json()
        assert len(chats) >= 1
        for c in chats:
            assert c["freelancer_id"] == pytest.freelancer_id

    def test_list_chats_all(self):
        r = requests.get(f"{BASE}/api/chats", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_apply_dedup_409(self):
        # Apply again to same job -> 409
        jobs = requests.get(f"{BASE}/api/jobs", timeout=30).json()
        job_id = jobs[0]["id"]
        r = requests.post(f"{BASE}/api/jobs/{job_id}/apply", json={"freelancer_id": pytest.freelancer_id, "note": "hi again"}, timeout=30)
        assert r.status_code == 409
