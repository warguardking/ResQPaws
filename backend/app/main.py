import os
import uuid
import base64
import json
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, get_db, SessionLocal
from app import models, crud, schemas

from datetime import datetime, timedelta, timezone, date
from jose import jwt, JWTError
from groq import Groq


SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is not set."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

security = HTTPBearer()

BASE_DIR = Path(__file__).resolve().parents[1]
UPLOADS_DIR = BASE_DIR / "uploads"
RESCUE_UPLOADS_DIR = UPLOADS_DIR / "rescue"
ANNOUNCEMENT_UPLOADS_DIR = UPLOADS_DIR / "announcements"

RESCUE_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
ANNOUNCEMENT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


# Existing databases need a few small schema upgrades because create_all()
# does not alter already-created MySQL tables.
Base.metadata.create_all(bind=engine)


def ensure_schema_upgrades():
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    with engine.begin() as connection:
        if "announcements" in tables:
            announcement_columns = {
                column["name"]: column
                for column in inspector.get_columns("announcements")
            }
            if "event_date" not in announcement_columns:
                connection.execute(text(
                    "ALTER TABLE announcements "
                    "ADD COLUMN event_date DATE NULL"
                ))

        if "notifications" in tables:
            columns = {
                column["name"]: column
                for column in inspector.get_columns("notifications")
            }

            if "announcement_id" not in columns:
                connection.execute(text(
                    "ALTER TABLE notifications "
                    "ADD COLUMN announcement_id INT NULL"
                ))

            # Announcement notifications do not belong to a rescue request.
            connection.execute(text(
                "ALTER TABLE notifications "
                "MODIFY rescue_request_id INT NULL"
            ))

    Base.metadata.create_all(bind=engine)


ensure_schema_upgrades()

# Clean announcements that have already passed their event date.
# A new request will also trigger cleanup, so no separate scheduler is required.
with SessionLocal() as startup_db:
    crud.delete_expired_announcements(startup_db)


app = FastAPI(
    title="ResQPaws API",
    description="Smart Community Animal Rescue & Welfare Network",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOADS_DIR)),
    name="uploads"
)


def save_upload(upload: UploadFile, folder: Path, public_prefix: str) -> str:
    """Save any uploaded file without type/size validation, as requested."""
    original_name = upload.filename or "upload"
    suffix = Path(original_name).suffix
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    destination = folder / stored_name

    with destination.open("wb") as file:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            file.write(chunk)

    return f"{public_prefix}/{quote(stored_name)}"


@app.get("/")
def home():
    return {
        "message": "Welcome to ResQPaws API",
        "status": "running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ResQPaws Backend"
    }


@app.get("/api/db-test")
def database_test():
    try:
        with engine.connect() as connection:
            return {
                "status": "success",
                "message": "ResQPaws connected to MySQL successfully"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@app.post("/api/users/register", response_model=schemas.UserResponse)
def register_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = crud.get_user_by_email(db, user.email)

    if existing_user:
        return existing_user

    return crud.create_user(db, user)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(models.User).filter(
            models.User.id == int(user_id)
        ).first()

        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        return user

    except (JWTError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


@app.get("/api/users/me", response_model=schemas.UserResponse)
def get_my_profile(
    current_user: models.User = Depends(get_current_user)
):
    return current_user


@app.post(
    "/api/ai/rescue-guidance",
    response_model=schemas.AIRescueGuidanceResponse
)
async def ai_rescue_guidance(
    situation: str = Form(""),
    image: UploadFile | None = File(None),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["public", "volunteer"]:
        raise HTTPException(
            status_code=403,
            detail="The Rescue Assistant is available only for public users and volunteers."
        )

    if groq_client is None:
        raise HTTPException(
            status_code=503,
            detail="Groq AI is not configured. Please set GROQ_API_KEY."
        )

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Please upload an animal photo."
        )

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }

    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPG, PNG or WebP image."
        )

    image_bytes = await image.read()

    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image must be smaller than 20 MB."
        )

    encoded_image = base64.b64encode(image_bytes).decode("utf-8")

    prompt = f"""
You are ResQPaws Rescue Assistant.

You help a person respond safely when an animal may be injured, sick, trapped, distressed, or in danger.

IMPORTANT SAFETY RULES:
- Do not give a definitive diagnosis.
- Do not claim certainty from a photo.
- Describe only visible or reasonably inferable observations.
- Give simple, safe immediate first-aid or handling steps suitable for a normal member of the public.
- Never recommend human medicines.
- Do not recommend risky procedures, invasive treatment, or forcing the animal to move.
- Tell the user when urgent veterinary help or an emergency rescue service is needed.
- If the situation appears severe, clearly say that the animal should be taken to a veterinarian immediately.
- If the image is unclear, say that it cannot be assessed reliably and give safe general advice.
- Keep the response practical and calm.

User's situation:
{situation.strip()}

Return ONLY valid JSON in this exact structure:
{{
  "observations": "What appears visibly noticeable in the image.",
  "immediate_steps": [
    "Safe immediate action 1",
    "Safe immediate action 2",
    "Safe immediate action 3"
  ],
  "avoid_steps": [
    "Thing the user should avoid 1",
    "Thing the user should avoid 2"
  ],
  "urgent_help": "When the user should contact a veterinarian or emergency rescue service."
}}
"""

    try:
        completion = groq_client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a careful animal rescue safety assistant. "
                        "You provide general safety guidance, not veterinary diagnosis."
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{image.content_type};base64,{encoded_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.2,
            max_completion_tokens=1200,
            response_format={"type": "json_object"}
        )

        content = completion.choices[0].message.content or "{}"
        result = json.loads(content)

        return {
            "observations": result.get(
                "observations",
                "The image could not be assessed clearly."
            ),
            "immediate_steps": result.get(
                "immediate_steps",
                []
            ),
            "avoid_steps": result.get(
                "avoid_steps",
                []
            ),
            "urgent_help": result.get(
                "urgent_help",
                "Contact a veterinarian if the animal appears seriously injured or distressed."
            )
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="AI returned an unreadable response. Please try again."
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"AI rescue guidance failed: {str(e)}"
        )


@app.patch("/api/users/me/availability")
def update_availability(
    availability_data: schemas.AvailabilityLocationUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["volunteer", "ngo", "vet"]:
        raise HTTPException(
            status_code=403,
            detail=f"Availability not allowed for role: {current_user.role}"
        )

    if availability_data.is_available:
        if (
            availability_data.latitude is None
            or availability_data.longitude is None
        ):
            raise HTTPException(
                status_code=400,
                detail="Current location is required when going online"
            )

        current_user.latitude = availability_data.latitude
        current_user.longitude = availability_data.longitude
        current_user.is_available = True
        db.commit()
        db.refresh(current_user)

        crud.create_notifications_for_nearby_rescues(
            db,
            current_user.id,
            current_user.latitude,
            current_user.longitude,
            radius_km=10
        )
    else:
        current_user.is_available = False
        db.commit()
        db.refresh(current_user)

    return current_user


@app.post("/api/users/login", response_model=schemas.TokenResponse)
def login_user(
    user: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    existing_user = crud.get_user_by_email(db, user.email)

    if not existing_user or not crud.verify_password(
        user.password,
        existing_user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    access_token = jwt.encode(
        {
            "sub": str(existing_user.id),
            "email": existing_user.email,
            "role": existing_user.role,
            "exp": expire
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.post(
    "/api/rescue-requests",
    response_model=schemas.RescueRequestResponse
)
async def create_rescue_request_api(
    animal_type: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    emergency_level: str = Form("medium"),
    photos: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Public users and volunteers can report. NGO/Vet use the rescue workflow
    # directly instead of creating a report from their account.
    if current_user.role not in ["public", "volunteer"]:
        raise HTTPException(
            status_code=403,
            detail="Only public users and volunteers can report an animal"
        )

    rescue_data = schemas.RescueRequestCreate(
        animal_type=animal_type,
        description=description,
        location=location,
        latitude=latitude,
        longitude=longitude,
        emergency_level=emergency_level
    )

    rescue_request = crud.create_rescue_request(
        db,
        current_user.id,
        rescue_data
    )

    # Intentionally no file type or file size restriction.
    for photo in photos:
        if not photo or not photo.filename:
            continue

        url = save_upload(
            photo,
            RESCUE_UPLOADS_DIR,
            "/uploads/rescue"
        )

        db.add(models.RescuePhoto(
            rescue_request_id=rescue_request.id,
            url=url,
            original_name=photo.filename
        ))

    db.commit()
    db.refresh(rescue_request)
    return rescue_request


@app.get("/api/volunteers/nearby")
def get_nearby_volunteers_api(
    latitude: float,
    longitude: float,
    radius_km: float = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    volunteers = crud.get_nearby_volunteers(
        db, latitude, longitude, radius_km
    )
    return {
        "count": len(volunteers),
        "radius_km": radius_km,
        "volunteers": volunteers
    }


@app.patch(
    "/api/rescue-requests/{rescue_id}/accept",
    response_model=schemas.RescueRequestResponse
)
def accept_rescue_request_api(
    rescue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["volunteer", "ngo", "vet"]:
        raise HTTPException(
            status_code=403,
            detail="Only rescue helpers can accept rescue requests"
        )

    result = crud.accept_rescue_request(db, rescue_id, current_user.id)

    if result is None:
        raise HTTPException(status_code=404, detail="Rescue request not found")

    if result == "already_accepted":
        raise HTTPException(
            status_code=400,
            detail="Rescue request has already been accepted"
        )

    return result


@app.put(
    "/api/rescue/{rescue_id}/status",
    response_model=schemas.RescueRequestResponse
)
def update_rescue_status(
    rescue_id: int,
    status_data: schemas.RescueStatusUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["volunteer", "ngo", "vet"]:
        raise HTTPException(
            status_code=403,
            detail="Only rescue helpers can update rescue status"
        )

    result = crud.update_rescue_status(
        db,
        rescue_id,
        current_user.id,
        status_data.status
    )

    if result is None:
        raise HTTPException(status_code=404, detail="Rescue request not found")

    if result == "not_assigned":
        raise HTTPException(status_code=403, detail="This rescue is not assigned to you")

    if result == "invalid_transition":
        raise HTTPException(status_code=400, detail="Invalid rescue status transition")

    if result == "invalid_status":
        raise HTTPException(status_code=400, detail="Invalid rescue status")

    return result


@app.get("/api/rescue-requests/{rescue_id}/history")
def get_rescue_history(
    rescue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    rescue_request = crud.get_rescue_by_id(db, rescue_id)

    if rescue_request is None:
        raise HTTPException(status_code=404, detail="Rescue request not found")

    allowed = (
        rescue_request.reporter_id == current_user.id
        or rescue_request.accepted_by == current_user.id
        or current_user.role in ["volunteer", "ngo", "vet"]
    )

    if not allowed:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to view this rescue history"
        )

    return {
        "rescue_request_id": rescue_id,
        "history": crud.get_status_history(db, rescue_id)
    }


@app.get(
    "/api/notifications",
    response_model=list[schemas.NotificationResponse]
)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_user_notifications(db, current_user.id)


@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = crud.mark_notification_read(
        db, notification_id, current_user.id
    )

    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")

    return notification


@app.patch("/api/notifications/read-all")
def mark_all_notifications_read(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return crud.mark_all_notifications_read(db, current_user.id)


@app.delete("/api/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()

    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted successfully"}


@app.post(
    "/api/rescue-requests/{rescue_id}/respond",
    response_model=schemas.RescueResponseResponse
)
def respond_to_rescue(
    rescue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["volunteer", "ngo", "vet"]:
        raise HTTPException(
            status_code=403,
            detail="Only rescue helpers can respond to rescue requests"
        )

    result = crud.create_rescue_response(db, rescue_id, current_user.id)

    if result is None:
        raise HTTPException(status_code=404, detail="Rescue request not found")

    if result == "already_accepted":
        raise HTTPException(
            status_code=400,
            detail="Rescue request has already been accepted by another helper"
        )

    if result == "already_accepted_by_you":
        raise HTTPException(
            status_code=400,
            detail="You have already accepted this rescue request"
        )

    return result


@app.get(
    "/api/rescue-requests/my-reports",
    response_model=list[schemas.RescueRequestResponse]
)
def get_my_reported_rescues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["public", "volunteer"]:
        raise HTTPException(
            status_code=403,
            detail="Only public users and volunteers can track their reports"
        )

    return crud.get_my_reported_rescues(db, current_user.id)


@app.get(
    "/api/rescue-requests/{rescue_id}",
    response_model=schemas.RescueDetailsResponse
)
def get_rescue_details(
    rescue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    rescue_request = crud.get_rescue_by_id(db, rescue_id)

    if rescue_request is None:
        raise HTTPException(status_code=404, detail="Rescue request not found")

    allowed = (
        rescue_request.reporter_id == current_user.id
        or rescue_request.accepted_by == current_user.id
        or current_user.role in ["volunteer", "ngo", "vet"]
    )

    if not allowed:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to view this rescue request"
        )

    return rescue_request


@app.get(
    "/api/volunteers/me/active-rescues",
    response_model=list[schemas.RescueDetailsResponse]
)
def get_my_active_rescues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["volunteer", "ngo", "vet"]:
        raise HTTPException(
            status_code=403,
            detail="Only rescue helpers can view active rescues"
        )

    return crud.get_active_rescues_for_helper(db, current_user.id)


@app.get(
    "/api/volunteers/me/resolved-history",
    response_model=list[schemas.RescueDetailsResponse]
)
def get_my_resolved_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["volunteer", "ngo", "vet"]:
        raise HTTPException(
            status_code=403,
            detail="Only rescue helpers can view resolved history"
        )

    return crud.get_resolved_rescues_for_helper(db, current_user.id)


@app.get(
    "/api/users/me/rescue-requests",
    response_model=list[schemas.RescueDetailsResponse]
)
def get_my_reported_rescues_details(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["public", "volunteer"]:
        raise HTTPException(
            status_code=403,
            detail="Only public users and volunteers can track their reports"
        )

    return crud.get_rescues_reported_by_user(db, current_user.id)


@app.get("/api/volunteers/me/nearby-rescues")
def get_nearby_rescues(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["volunteer", "ngo", "vet"]:
        raise HTTPException(
            status_code=403,
            detail="Only rescue helpers can access nearby rescues"
        )

    if current_user.latitude is None or current_user.longitude is None:
        raise HTTPException(
            status_code=400,
            detail="Volunteer location is not available"
        )

    return crud.get_nearby_active_rescues(
        db,
        current_user.latitude,
        current_user.longitude,
        radius_km=10
    )


@app.get(
    "/api/helpers/nearby",
    response_model=list[schemas.NearbyHelperResponse]
)
def get_nearby_helpers(
    latitude: float,
    longitude: float,
    radius_km: float = 10,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_nearby_helpers(
        db, latitude, longitude, radius_km
    )


# ================================
# ANNOUNCEMENTS
# ================================

@app.get(
    "/api/announcements",
    response_model=list[schemas.AnnouncementResponse]
)
def get_announcements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_announcements(db)


@app.post(
    "/api/announcements",
    response_model=schemas.AnnouncementResponse
)
async def create_announcement_api(
    title: str = Form(...),
    description: str = Form(...),
    location: str = Form(""),
    event_date: str = Form(...),
    poster: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["ngo", "vet"]:
        raise HTTPException(
            status_code=403,
            detail="Only NGOs and veterinary users can post announcements"
        )

    try:
        parsed_event_date = date.fromisoformat(event_date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid event date."
        )

    if parsed_event_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Event date cannot be in the past."
        )

    poster_url = None

    if poster and poster.filename:
        # Intentionally no file type or size restriction for poster uploads.
        poster_url = save_upload(
            poster,
            ANNOUNCEMENT_UPLOADS_DIR,
            "/uploads/announcements"
        )

    return crud.create_announcement(
        db,
        current_user.id,
        title.strip(),
        description.strip(),
        location.strip() or None,
        poster_url,
        parsed_event_date
    )
