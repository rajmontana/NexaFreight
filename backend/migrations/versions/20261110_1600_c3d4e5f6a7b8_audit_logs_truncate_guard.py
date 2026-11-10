"""Enforce statement-level TRUNCATE prohibition on audit_logs via PostgreSQL trigger.

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-11-10 16:00:00.000000
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "c3d4e5f6a7b8"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute(
            """
            CREATE OR REPLACE FUNCTION prevent_audit_log_truncate()
            RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION 'audit_logs is an append-only table: TRUNCATE is prohibited';
            END;
            $$ LANGUAGE plpgsql;
            """
        )
        op.execute(
            """
            CREATE TRIGGER trg_audit_logs_no_truncate
            BEFORE TRUNCATE ON audit_logs
            FOR EACH STATEMENT
            EXECUTE FUNCTION prevent_audit_log_truncate();
            """
        )
    elif dialect == "sqlite":
        # SQLite does not support TRUNCATE statements (DELETE is caught by existing triggers).
        pass


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS trg_audit_logs_no_truncate ON audit_logs;")
        op.execute("DROP FUNCTION IF EXISTS prevent_audit_log_truncate();")
    elif dialect == "sqlite":
        pass
