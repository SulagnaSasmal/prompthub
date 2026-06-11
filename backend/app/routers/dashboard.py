from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.evaluation import Evaluation
from app.models.governance import GovernanceCheck
from app.models.prompt import Prompt
from app.models.user import User
from app.models.version import Version

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total = db.query(func.count(Prompt.prompt_id)).filter(Prompt.status != "Retired").scalar()
    approved = db.query(func.count(Prompt.prompt_id)).filter(
        Prompt.status.in_(["Approved", "Production"])
    ).scalar()
    retired = db.query(func.count(Prompt.prompt_id)).filter(Prompt.status == "Retired").scalar()

    # Average quality score of current Production versions
    prod_versions = (
        db.query(Version)
        .filter(Version.status == "Production")
        .all()
    )
    avg_score = None
    if prod_versions:
        scores = []
        for v in prod_versions:
            evals = v.evaluations
            if evals:
                scores.append(sum(float(e.overall_score) for e in evals) / len(evals))
        if scores:
            avg_score = round(sum(scores) / len(scores), 1)

    # Top 10 most viewed
    most_viewed = (
        db.query(Prompt)
        .filter(Prompt.status != "Retired")
        .order_by(func.cast(Prompt.view_count, db.bind.dialect.INTEGER if db.bind else "INTEGER").desc()
                  if False else Prompt.view_count.desc())
        .limit(10)
        .all()
    )
    most_viewed = (
        db.query(Prompt)
        .filter(Prompt.status != "Retired")
        .order_by(Prompt.view_count.desc())
        .limit(10)
        .all()
    )

    # Failed prompts last 90 days
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    from app.models.workflow_log import WorkflowLog
    failed_transitions = (
        db.query(WorkflowLog)
        .filter(WorkflowLog.to_status == "Draft", WorkflowLog.logged_at >= cutoff)
        .all()
    )

    # Open governance flags
    open_flags = db.query(func.count(GovernanceCheck.check_id)).filter(
        GovernanceCheck.result == "Flag"
    ).scalar()

    # Risk distribution
    risk_dist = {
        "Low": db.query(func.count(Prompt.prompt_id)).filter(Prompt.risk_level == "Low").scalar(),
        "Medium": db.query(func.count(Prompt.prompt_id)).filter(Prompt.risk_level == "Medium").scalar(),
        "High": db.query(func.count(Prompt.prompt_id)).filter(Prompt.risk_level == "High").scalar(),
    }

    # Prompts by category
    category_counts = (
        db.query(Prompt.category, func.count(Prompt.prompt_id))
        .filter(Prompt.status != "Retired")
        .group_by(Prompt.category)
        .all()
    )

    return {
        "total_prompts": total,
        "approved_prompts": approved,
        "average_quality_score": avg_score,
        "open_governance_flags": open_flags,
        "retired_prompts": retired,
        "failed_prompts_last_90_days": len(set(t.version_id for t in failed_transitions)),
        "risk_distribution": risk_dist,
        "prompts_by_category": {cat: cnt for cat, cnt in category_counts},
        "most_viewed": [
            {"prompt_id": str(p.prompt_id), "name": p.name, "view_count": p.view_count}
            for p in most_viewed
        ],
    }
