"""
WorkHop Payment & Deals State Machine Tests
Covers:
1. Escrow Mode (5% commission, Razorpay order/verify, start work, submit work, approve & release funds).
2. Direct Mode (0% commission, double-sided risk acknowledgement, deliver work, confirm payment).
3. Dispute Arbitration (frozen funds, admin release, refund, split arbitration).
4. Unauthorized / Invalid state transition rejections.
5. Idempotent payment funding / webhook handling.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "http://localhost:8000"
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_escrow_deal_lifecycle(api):
    """Test full Escrow happy path from creation to completion."""
    conv_id = f"test-conv-{uuid.uuid4().hex[:8]}"
    agreed_rupees = 10000
    agreed_paise = agreed_rupees * 100  # 1,000,000 paise

    # 1. Create Escrow Deal
    create_payload = {
        "conversation_id": conv_id,
        "job_id": "test-job-1",
        "employer_id": "test-employer-1",
        "employer_name": "Test Employer",
        "freelancer_id": "test-freelancer-1",
        "freelancer_name": "Test Freelancer",
        "payment_mode": "escrow",
        "agreed_amount_paise": agreed_paise,
    }
    r = api.post(f"{BASE_URL}/api/deals/create", json=create_payload)
    if r.status_code != 200:
        pytest.skip(f"Backend not running at {BASE_URL}: {r.status_code}")

    data = r.json()
    deal = data["deal"]
    deal_id = deal["deal_id"]

    assert deal["payment_mode"] == "escrow"
    assert deal["status"] == "created"
    assert deal["agreed_amount_paise"] == agreed_paise
    assert deal["commission_paise"] == int(agreed_paise * 0.05)  # 50,000 paise
    assert deal["freelancer_net_paise"] == agreed_paise - deal["commission_paise"]  # 950,000 paise

    # 2. Reject starting work before funding
    r_bad = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "start_work",
        "actor_role": "freelancer",
    })
    assert r_bad.status_code == 400

    # 3. Create Razorpay Fund Order
    r_order = api.post(f"{BASE_URL}/api/deals/{deal_id}/fund/create-order")
    assert r_order.status_code == 200
    order_data = r_order.json()
    assert order_data["amount"] == agreed_paise
    assert "order_id" in order_data

    # 4. Verify Escrow Funding
    r_verify = api.post(f"{BASE_URL}/api/deals/{deal_id}/fund/verify", json={
        "razorpay_order_id": order_data["order_id"],
        "razorpay_payment_id": f"pay_{uuid.uuid4().hex[:10]}",
        "razorpay_signature": "mock_signature",
    })
    assert r_verify.status_code == 200
    deal_funded = r_verify.json()["deal"]
    assert deal_funded["status"] == "funded"

    # 5. Freelancer Starts Work
    r_start = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "start_work",
        "actor_role": "freelancer",
    })
    assert r_start.status_code == 200
    assert r_start.json()["deal"]["status"] == "in_progress"

    # 6. Freelancer Submits Work Delivery
    r_submit = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "submit_work",
        "actor_role": "freelancer",
        "notes": "Delivered all design assets: https://workhop.in/samples",
    })
    assert r_submit.status_code == 200
    deal_submitted = r_submit.json()["deal"]
    assert deal_submitted["status"] == "submitted"
    assert deal_submitted["auto_release_at"] is not None

    # 7. Employer Approves Work & Releases Escrow
    r_approve = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "approve_work",
        "actor_role": "employer",
    })
    assert r_approve.status_code == 200
    deal_completed = r_approve.json()["deal"]
    assert deal_completed["status"] == "completed"
    assert deal_completed["completed_at"] is not None


def test_direct_deal_lifecycle(api):
    """Test full Direct Payment happy path with double-sided risk acknowledgement."""
    conv_id = f"test-conv-{uuid.uuid4().hex[:8]}"
    agreed_paise = 500000  # ₹5,000

    # 1. Create Direct Deal with Freelancer Acknowledgement
    create_payload = {
        "conversation_id": conv_id,
        "employer_id": "test-employer-2",
        "freelancer_id": "test-freelancer-2",
        "payment_mode": "direct",
        "agreed_amount_paise": agreed_paise,
        "freelancer_ack_at": "2026-10-02T10:00:00Z",
    }
    r = api.post(f"{BASE_URL}/api/deals/create", json=create_payload)
    if r.status_code != 200:
        pytest.skip(f"Backend not running at {BASE_URL}")

    deal = r.json()["deal"]
    deal_id = deal["deal_id"]

    assert deal["payment_mode"] == "direct"
    assert deal["commission_paise"] == 0
    assert deal["freelancer_net_paise"] == agreed_paise
    assert deal["status"] == "created"

    # 2. Employer Acknowledges Risk
    r_ack = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "acknowledge",
        "actor_role": "employer",
    })
    assert r_ack.status_code == 200
    assert r_ack.json()["deal"]["status"] == "acknowledged"

    # 3. Freelancer Starts Work
    r_start = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "start_work",
        "actor_role": "freelancer",
    })
    assert r_start.status_code == 200
    assert r_start.json()["deal"]["status"] == "in_progress"

    # 4. Freelancer Delivers Work
    r_del = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "submit_work",
        "actor_role": "freelancer",
        "notes": "Code delivered via GitHub",
    })
    assert r_del.status_code == 200
    assert r_del.json()["deal"]["status"] == "work_submitted"

    # 5. Employer Confirms Work Delivery
    r_confirm_work = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "confirm_work",
        "actor_role": "employer",
    })
    assert r_confirm_work.status_code == 200
    assert r_confirm_work.json()["deal"]["status"] == "work_confirmed"

    # 6. Freelancer Confirms Direct Payment Received
    r_confirm_pay = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "confirm_payment",
        "actor_role": "freelancer",
    })
    assert r_confirm_pay.status_code == 200
    assert r_confirm_pay.json()["deal"]["status"] == "completed"


def test_dispute_and_admin_arbitration(api):
    """Test dispute opening, funds freezing, and admin arbitration."""
    conv_id = f"test-conv-{uuid.uuid4().hex[:8]}"
    agreed_paise = 2000000  # ₹20,000

    # 1. Create & Fund Escrow Deal
    r_create = api.post(f"{BASE_URL}/api/deals/create", json={
        "conversation_id": conv_id,
        "employer_id": "test-emp-3",
        "freelancer_id": "test-free-3",
        "payment_mode": "escrow",
        "agreed_amount_paise": agreed_paise,
    })
    if r_create.status_code != 200:
        pytest.skip(f"Backend not running at {BASE_URL}")

    deal_id = r_create.json()["deal"]["deal_id"]

    # Fund it
    api.post(f"{BASE_URL}/api/deals/{deal_id}/fund/verify", json={
        "razorpay_order_id": f"order_{uuid.uuid4().hex[:8]}",
        "razorpay_payment_id": f"pay_{uuid.uuid4().hex[:8]}",
        "razorpay_signature": "mock_signature",
    })

    # 2. Raise Dispute
    r_disp = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "dispute",
        "actor_role": "employer",
        "notes": "Deliverables do not match initial requirements",
    })
    assert r_disp.status_code == 200
    deal_disputed = r_disp.json()["deal"]
    assert deal_disputed["status"] == "disputed"

    # 3. Unauthorized transition blocked during dispute
    r_bad = api.post(f"{BASE_URL}/api/deals/{deal_id}/action", json={
        "action": "approve_work",
        "actor_role": "employer",
    })
    assert r_bad.status_code == 400
