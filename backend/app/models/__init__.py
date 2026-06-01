"""SQLAlchemy models. Importing this package registers every table on `Base`."""

from app.models.analysis import Analysis  # noqa: F401
from app.models.interview_session import InterviewSession  # noqa: F401
from app.models.practice_session import PracticeSession  # noqa: F401
from app.models.question import Question  # noqa: F401
from app.models.resume import Resume  # noqa: F401
from app.models.resume_note import NotesSection, ResumeNote, SectionQuizTag  # noqa: F401
from app.models.plan_day import PlanDay  # noqa: F401
from app.models.plan_day_module import PlanDayModule  # noqa: F401
from app.models.prep_plan import PrepPlan  # noqa: F401
from app.models.push_subscription import PushSubscription  # noqa: F401
from app.models.seminar import Seminar  # noqa: F401
from app.models.user import User  # noqa: F401
