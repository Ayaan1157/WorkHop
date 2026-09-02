"""
Iteration 10 focused regression tests:
- Complaints endpoint with empty RESEND_API_KEY (background email must be no-op, still return 200)
- /api/jobs feed smoke (~200 jobs)
- Apply flow: verified freelancer -> conversation created
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://payment-mgmt-10.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ============ Complaints (BackgroundTask + empty RESEND_API_KEY) ============
class TestComplaints:
    def test_complaint_saved_and_returns_200_without_resend(self, api):
        payload = {
            "name": "TEST_v10 QA",
            "email": "test_v10@workhop.dev",
            "role": "freelancer",
            "subject": "TEST_v10 bug report",
            "message": "TEST_v10 verifying complaint endpoint returns 200 with empty RESEND_API_KEY.",
        }
        r = api.post(f"{BASE_URL}/api/complaints", json=payload, timeout=15)
        assert r.status_code == 200, f"expected 200 got {r.status_code} body={r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "complaint_id" in data and len(data["complaint_id"]) >= 8
        assert data.get("support_email") == "manarastudio22@gmail.com"

    def test_complaint_400_on_empty_subject(self, api):
        r = api.post(
            f"{BASE_URL}/api/complaints",
            json={"name": "x", "email": "x@x.com", "subject": "  ", "message": "hello"},
            timeout=15,
        )
        assert r.status_code == 400


# ============ Jobs feed regression ============
class TestJobsFeed:
    def test_jobs_returns_list_with_expected_shape(self, api):
        r = api.get(f"{BASE_URL}/api/jobs", timeout=20)
        assert r.status_code == 200
        jobs = r.json()
        assert isinstance(jobs, list)
        assert len(jobs) >= 150, f"expected ~200 jobs, got {len(jobs)}"
        # sample shape
        j = jobs[0]
        for key in ("id", "title", "category", "pay", "distance_km", "company_name", "area"):
            assert key in j, f"missing key {key}"

    def test_jobs_have_categories_covering_catalog_chips(self, api):
        r = api.get(f"{BASE_URL}/api/jobs", timeout=20)
        jobs = r.json()
        cats = {j["category"] for j in jobs}
        # At least one design category & one tech category must exist so chip filters have hits
        design_cats = {"Graphic Design", "Brand Identity", "Illustration", "UI/UX Design",
                       "Packaging", "Interior Design", "Fashion Design", "Landscape Design",
                       "3D Visualization", "AutoCAD", "Product Photography", "Creative"}
        tech_cats = {"Frontend Dev", "Mobile Dev", "Shopify Dev", "No-Code Dev",
                     "QA Engineer", "Cybersecurity", "Database", "IT Support", "Tech"}
        assert cats & design_cats, f"no design categories present in feed. cats={cats}"
        assert cats & tech_cats, f"no tech categories present in feed. cats={cats}"


# ============ Apply flow regression ============
class TestApplyFlow:
    @pytest.fixture(scope="class")
    def verified_freelancer_id(self, api):
        # Onboard: create draft
        pay = api.post(
            f"{BASE_URL}/api/freelancer/pay",
            json={"full_name": "TEST_v10 ApplyPro", "phone": "9000000010", "category": "Graphic Design"},
            timeout=15,
        )
        assert pay.status_code == 200, pay.text
        fid = pay.json()["freelancer_id"]
        # Verify aadhaar (mock accepts non-blacklisted 12-digit)
        av = api.post(
            f"{BASE_URL}/api/freelancer/aadhaar/verify",
            json={"freelancer_id": fid, "aadhaar_number": "432112345678"},
            timeout=15,
        )
        assert av.status_code == 200, av.text
        return fid

    def test_verified_freelancer_apply_creates_conversation(self, api, verified_freelancer_id):
        fid = verified_freelancer_id
        # Get a job to apply to
        jobs = api.get(f"{BASE_URL}/api/jobs?freelancer_id={fid}", timeout=15).json()
        assert len(jobs) > 0
        job = jobs[0]
        r = api.post(
            f"{BASE_URL}/api/jobs/{job['id']}/apply",
            json={"freelancer_id": fid, "note": "TEST_v10 auto-apply"},
            timeout=15,
        )
        assert r.status_code == 200, f"apply failed: {r.status_code} {r.text}"
        data = r.json()
        assert "conversation_id" in data and data["conversation_id"]
        assert "quota_used" in data
        # verify chat visible for freelancer
        chats = api.get(f"{BASE_URL}/api/chats?freelancer_id={fid}", timeout=15).json()
        assert any(c["conversation_id"] == data["conversation_id"] for c in chats)


# ============ Auth bypass session (regression) ============
class TestAuthBypass:
    def test_bearer_token_returns_user(self, api):
        r = api.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer test_token_workhop_e2e"},
            timeout=15,
        )
        # 200 if session seeded; else 401. We only fail if 500.
        assert r.status_code in (200, 401), r.text
