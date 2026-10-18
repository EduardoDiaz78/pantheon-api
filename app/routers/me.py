from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends

from ..auth import Caller, current, get_now, get_store, need
from ..errors import ApiError
from ..i18n import get_lang, t
from ..models import ActionItem, Home, Me, NotificationSettings, RoleChange, User
from ..planning import offer_deadline
from ..replay import replay_summary
from ..store import PERMISSIONS, Store

router = APIRouter(prefix="/v1", tags=["You and your team"])


@router.get("/me", response_model=Me, summary="Who am I")
def me(c: Caller = Depends(current), store: Store = Depends(get_store)) -> Me:
    num = next((n for n, uid in store.whatsapp.items() if uid == c.user.id), None)
    pretty = f"+{num[:2]} {num[2:4]} {num[4:8]} {num[8:]}" if num else None
    return Me(user=c.user, organization=store.organization, permissions=sorted(PERMISSIONS[c.role]), site_ids=list(store.sites),
              whatsapp_number=pretty)


@router.get("/home", response_model=Home, summary="Morning summary: what needs doing now")
def home(c: Caller = Depends(current), store: Store = Depends(get_store), now: datetime = Depends(get_now),
         lang: str = Depends(get_lang)) -> Home:
    tomorrow = now.date() + timedelta(days=1)
    deadline = offer_deadline(tomorrow)
    actions: list[ActionItem] = []
    for s in store.sites.values():
        if s.status in ("maintenance", "onboarding"):
            continue
        st = store.plans.get((s.id, tomorrow))
        if (st is None or not st.approved) and now < deadline:
            actions.append(ActionItem(kind="approve_plan", site_id=s.id, title=f"{s.name}: " + t("a_plan_ready_t", lang, time=deadline.strftime("%H:%M")),
                                      due=deadline, minutes_left=int((deadline - now).total_seconds() // 60),
                                      resource=f"/v1/sites/{s.id}/plans/{tomorrow}"))
    for a in store.alerts:
        if a["status"] == "open" and a["options"]:
            actions.append(ActionItem(kind="incident", site_id=a["site_id"], title=t(a["title"][0], lang, **a["title"][1]),
                                      resource=f"/v1/alerts/{a['id']}"))
    actions.append(ActionItem(kind="review_settlement", site_id="site-a", title=t("a_settle_t", lang, date="2026-10-04", pct="−5.9"),
                              resource="/v1/sites/site-a/settlements?month=2026-10"))
    y = replay_summary()
    return Home(as_of=now, actions=actions, yesterday_energy_margin=y["value_vs_idle"], yesterday_vs_plan_pct=y["vs_plan_pct"],
                yesterday_critical_hours=y["critical_hours_covered"], open_alerts=sum(1 for a in store.alerts if a["status"] == "open"))


@router.get("/me/notifications", response_model=NotificationSettings, summary="My notification channels")
def get_notifications(c: Caller = Depends(current), store: Store = Depends(get_store)) -> NotificationSettings:
    return store.notifications[c.user.id]


@router.put("/me/notifications", response_model=NotificationSettings, summary="Change my notification channels")
def put_notifications(body: NotificationSettings, c: Caller = Depends(current), store: Store = Depends(get_store),
                      now: datetime = Depends(get_now)) -> NotificationSettings:
    store.notifications[c.user.id] = body
    store.log(now, c.actor, "notifications.update", f"email={body.email} whatsapp={body.whatsapp} sms={body.sms} digest={body.digest_time_local}")
    return body


@router.get("/users", response_model=list[User], summary="People with access")
def users(_: Caller = Depends(need("users.read")), store: Store = Depends(get_store)) -> list[User]:
    return list(store.users.values())


@router.put("/users/{user_id}/role", response_model=User, summary="Change someone's role")
def set_role(user_id: str, body: RoleChange, c: Caller = Depends(need("users.edit")), store: Store = Depends(get_store),
             now: datetime = Depends(get_now)) -> User:
    u = store.users.get(user_id)
    if not u:
        raise ApiError(404, "not_found", what=f"User '{user_id}'")
    old = u.role
    store.users[user_id] = u.model_copy(update={"role": body.role})
    store.log(now, c.actor, "users.role", f"{u.name}: {old.value} → {body.role.value}")
    return store.users[user_id]
