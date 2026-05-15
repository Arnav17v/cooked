"""SQLAlchemy models. Importing this package registers every table on `Base`."""

from app.models.analysis import Analysis  # noqa: F401
from app.models.interview_session import InterviewSession  # noqa: F401
from app.models.practice_session import PracticeSession  # noqa: F401
from app.models.question import Question  # noqa: F401
from app.models.resume import Resume  # noqa: F401
from app.models.resume_note import NotesSection, ResumeNote, SectionQuizTag  # noqa: F401
from app.models.user import User  # noqa: F401
