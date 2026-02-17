This is a personal finance accounting system.

Backend:
- Python Flask app
- Jinja templates for UI
- Existing routes, business logic, and database must NOT change
- Flask should be converted into a pure JSON API server

Goal:
- Remove Jinja rendering
- Expose all existing routes as JSON APIs
- Create a modern frontend (Next.js) that consumes these APIs
- Preserve 100% functionality

Rules:
- Do not change business logic
- Do not change database models
- Only refactor UI layer and route outputs
