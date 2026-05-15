"""Human-facing formatting for stored note section titles (no LLM)."""


def format_note_section_title_for_display(title: str) -> str:
    """Capitalize the first alphabetic character; leave the rest unchanged.

    Stored titles follow the generator's lowercase convention; this yields
    sentence-style headings without rewriting acronyms or the rest of the phrase.
    """
    t = title.strip()
    if not t:
        return ""
    for i, ch in enumerate(t):
        if ch.isalpha():
            upper = ch.upper()
            if upper != ch:
                return t[:i] + upper + t[i + 1 :]
            return t
    return t
