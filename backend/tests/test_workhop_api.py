import os, requests, pytest
BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://payment-mgmt-10.preview.emergentagent.com").rstrip("/")

def test_leads_preview():
    r = requests.get(f"{BASE}/api/leads/preview", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 50
    for ld in data:
        for k in ("id","initials","skill","distance_km","rating","jobs_done","name","phone","portfolio","keywords"):
            assert k in ld

def test_employer_unlock():
    r = requests.post(f"{BASE}/api/employer/unlock", json={"payment_method":"upi"}, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert "unlock_id" in d and len(d["leads"])==50 and d["paid_amount"]==199

@pytest.fixture(scope="module")
def freelancer_id():
    r = requests.post(f"{BASE}/api/freelancer/pay", json={"full_name":"TEST_Pro","payment_method":"upi"}, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["paid"] is True and d["paid_amount"]==99
    return d["freelancer_id"]

def test_aadhaar_short(freelancer_id):
    r = requests.post(f"{BASE}/api/freelancer/aadhaar/verify", json={"freelancer_id":freelancer_id,"aadhaar_number":"12345"}, timeout=30)
    assert r.status_code == 400

@pytest.mark.parametrize("dummy",["000000000000","111111111111","123456789012"])
def test_aadhaar_dummy(freelancer_id, dummy):
    r = requests.post(f"{BASE}/api/freelancer/aadhaar/verify", json={"freelancer_id":freelancer_id,"aadhaar_number":dummy}, timeout=30)
    assert r.status_code == 400

def test_aadhaar_unknown_freelancer():
    r = requests.post(f"{BASE}/api/freelancer/aadhaar/verify", json={"freelancer_id":"nope-xxx","aadhaar_number":"432112345678"}, timeout=30)
    assert r.status_code == 404

def test_aadhaar_success(freelancer_id):
    r = requests.post(f"{BASE}/api/freelancer/aadhaar/verify", json={"freelancer_id":freelancer_id,"aadhaar_number":"432112349876"}, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["verified"] is True and d["masked_aadhaar"].endswith("9876")

def test_submit_too_many_images(freelancer_id):
    r = requests.post(f"{BASE}/api/freelancer/submit", json={"freelancer_id":freelancer_id,"linkedin_url":"x","portfolio_url":"y","portfolio_images":["a","b","c","d"]}, timeout=30)
    assert r.status_code == 400

def test_submit_unknown():
    r = requests.post(f"{BASE}/api/freelancer/submit", json={"freelancer_id":"none","linkedin_url":"x","portfolio_url":"y","portfolio_images":[]}, timeout=30)
    assert r.status_code == 404

def test_submit_success(freelancer_id):
    r = requests.post(f"{BASE}/api/freelancer/submit", json={"freelancer_id":freelancer_id,"linkedin_url":"linkedin.com/in/test","portfolio_url":"test.com","portfolio_images":["img1","img2","img3"]}, timeout=30)
    assert r.status_code == 200
    assert r.json()["status"]=="under_review"
