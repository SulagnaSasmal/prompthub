from enum import StrEnum


class Capability(StrEnum):
    WORKFLOW_RUN = "workflow.run"
    WORKFLOW_CREATE = "workflow.create"
    WORKFLOW_EDIT = "workflow.edit"
    REVIEW_MANAGE = "review.manage"
    VERSION_APPROVE = "version.approve"
    DEPLOYMENT_MANAGE = "deployment.manage"
    ADMIN_MANAGE = "admin.manage"
    SECURITY_MANAGE = "security.manage"
    AUDIT_VIEW = "audit.view"


ROLE_CAPABILITIES: dict[str, set[Capability]] = {
    "consumer": {
        Capability.WORKFLOW_RUN,
    },
    "author": {
        Capability.WORKFLOW_RUN,
        Capability.WORKFLOW_CREATE,
        Capability.WORKFLOW_EDIT,
    },
    "reviewer": {
        Capability.WORKFLOW_RUN,
        Capability.WORKFLOW_EDIT,
        Capability.REVIEW_MANAGE,
        Capability.AUDIT_VIEW,
    },
    "approver": {
        Capability.WORKFLOW_RUN,
        Capability.REVIEW_MANAGE,
        Capability.VERSION_APPROVE,
        Capability.DEPLOYMENT_MANAGE,
        Capability.AUDIT_VIEW,
    },
    "admin": {
        Capability.WORKFLOW_RUN,
        Capability.WORKFLOW_CREATE,
        Capability.WORKFLOW_EDIT,
        Capability.REVIEW_MANAGE,
        Capability.VERSION_APPROVE,
        Capability.DEPLOYMENT_MANAGE,
        Capability.ADMIN_MANAGE,
        Capability.SECURITY_MANAGE,
        Capability.AUDIT_VIEW,
    },
}


def parse_roles(roles: str | None) -> set[str]:
    if not roles:
        return set()
    return {role.strip() for role in roles.split(",") if role.strip()}


def capabilities_for_roles(roles: str | None) -> set[Capability]:
    capabilities: set[Capability] = set()
    for role in parse_roles(roles):
        capabilities.update(ROLE_CAPABILITIES.get(role, set()))
    return capabilities


def has_capability(roles: str | None, capability: Capability) -> bool:
    return capability in capabilities_for_roles(roles)


def allowed_roles_for(capability: Capability) -> set[str]:
    return {role for role, capabilities in ROLE_CAPABILITIES.items() if capability in capabilities}
