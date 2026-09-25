import math
from sqlalchemy.orm import Session
from datetime import date
from passlib.context import CryptContext

from app import models
from app.schemas import UserCreate


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


def create_user(db: Session, user: UserCreate):
    hashed_password = hash_password(user.password)

    new_user = models.User(
        full_name=user.full_name,
        email=user.email,
        password=hashed_password,
        role=user.role,
        phone=user.phone,
        location=user.location,
        latitude=user.latitude,
        longitude=user.longitude,
        organization_name=user.organization_name,
        available_from=user.available_from,
        available_to=user.available_to,
        services=user.services,
        emergency_available=user.emergency_available
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(
        models.User.email == email
    ).first()


def create_rescue_request(
    db: Session,
    reporter_id: int,
    rescue_data
):
    new_request = models.RescueRequest(
        reporter_id=reporter_id,
        animal_type=rescue_data.animal_type,
        description=rescue_data.description,
        location=rescue_data.location,
        latitude=rescue_data.latitude,
        longitude=rescue_data.longitude,
        emergency_level=rescue_data.emergency_level,
        status="reported"
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    create_status_history(
        db,
        new_request.id,
        "reported",
        reporter_id
    )

    nearby_helpers = get_nearby_volunteers(
        db,
        rescue_data.latitude,
        rescue_data.longitude,
        radius_km=10
    )

    for helper in nearby_helpers:
        create_notification(
            db,
            helper["id"],
            new_request.id,
            None,
            "🚨 Animal Rescue Needed",
            (
                f"{rescue_data.animal_type} rescue needed near "
                f"{rescue_data.location}. "
                f"{helper['distance_km']} km away. "
                f"Emergency level: {rescue_data.emergency_level}."
            ),
            "rescue_alert"
        )

    return new_request


def update_user_availability(
    db: Session,
    user_id: int,
    is_available: bool
):
    user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if user is None:
        return None

    user.is_available = is_available
    db.commit()
    db.refresh(user)
    return user


def get_nearby_volunteers(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 10
):
    helpers = db.query(models.User).filter(
        models.User.role.in_(["volunteer", "ngo", "vet"]),
        models.User.is_available == True,
        models.User.latitude.isnot(None),
        models.User.longitude.isnot(None)
    ).all()

    nearby_helpers = []

    lat1 = math.radians(latitude)
    lon1 = math.radians(longitude)

    for helper in helpers:
        lat2 = math.radians(helper.latitude)
        lon2 = math.radians(helper.longitude)

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1)
            * math.cos(lat2)
            * math.sin(dlon / 2) ** 2
        )

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance_km = 6371 * c

        if distance_km <= radius_km:
            nearby_helpers.append({
                "id": helper.id,
                "full_name": helper.full_name,
                "phone": helper.phone,
                "latitude": helper.latitude,
                "longitude": helper.longitude,
                "distance_km": round(distance_km, 2)
            })

    nearby_helpers.sort(key=lambda x: x["distance_km"])
    return nearby_helpers


def accept_rescue_request(
    db: Session,
    rescue_id: int,
    helper_id: int
):
    rescue_request = db.query(models.RescueRequest).filter(
        models.RescueRequest.id == rescue_id
    ).first()

    if rescue_request is None:
        return None

    if rescue_request.status != "reported" or rescue_request.accepted_by is not None:
        return "already_accepted"

    rescue_request.accepted_by = helper_id
    rescue_request.status = "accepted"

    db.add(models.RescueStatusHistory(
        rescue_request_id=rescue_request.id,
        status="accepted",
        updated_by=helper_id
    ))

    db.commit()
    db.refresh(rescue_request)

    create_notification(
        db,
        helper_id,
        rescue_request.id,
        None,
        "🙋 Rescue assigned to you",
        f"You accepted the {rescue_request.animal_type} rescue at {rescue_request.location}.",
        "rescue_assigned"
    )

    return rescue_request


def update_rescue_status(
    db: Session,
    rescue_id: int,
    helper_id: int,
    status: str
):
    rescue_request = db.query(models.RescueRequest).filter(
        models.RescueRequest.id == rescue_id
    ).first()

    if rescue_request is None:
        return None

    if rescue_request.accepted_by != helper_id:
        return "not_assigned"

    allowed_transitions = {
        "accepted": "rescue_started",
        "rescue_started": "vet_assistance",
        "vet_assistance": "treatment",
        "treatment": "resolved"
    }

    expected_next_status = allowed_transitions.get(rescue_request.status)

    if expected_next_status is None:
        return "invalid_status"

    if status != expected_next_status:
        return "invalid_transition"

    rescue_request.status = status
    db.commit()
    db.refresh(rescue_request)

    create_status_history(db, rescue_id, status, helper_id)

    if status == "resolved":
        reporter = db.query(models.User).filter(
            models.User.id == rescue_request.reporter_id
        ).first()

        if reporter and reporter.role in ["public", "volunteer"]:
            create_notification(
                db,
                reporter.id,
                rescue_request.id,
                None,
                "✅ Rescue case resolved",
                (
                    f"Your reported {rescue_request.animal_type} rescue at "
                    f"{rescue_request.location} has been completed."
                ),
                "rescue_resolved"
            )

    return rescue_request


def create_status_history(
    db: Session,
    rescue_request_id: int,
    status: str,
    updated_by: int
):
    history = models.RescueStatusHistory(
        rescue_request_id=rescue_request_id,
        status=status,
        updated_by=updated_by
    )

    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def get_status_history(db: Session, rescue_request_id: int):
    history = db.query(
        models.RescueStatusHistory,
        models.User.full_name
    ).join(
        models.User,
        models.RescueStatusHistory.updated_by == models.User.id
    ).filter(
        models.RescueStatusHistory.rescue_request_id == rescue_request_id
    ).order_by(
        models.RescueStatusHistory.created_at.asc()
    ).all()

    return [
        {
            "id": item.id,
            "rescue_request_id": item.rescue_request_id,
            "status": item.status,
            "updated_by": item.updated_by,
            "updated_by_name": full_name,
            "created_at": item.created_at
        }
        for item, full_name in history
    ]


def create_notification(
    db: Session,
    user_id: int,
    rescue_request_id: int | None,
    announcement_id: int | None,
    title: str,
    message: str,
    notification_type: str
):
    notification = models.Notification(
        user_id=user_id,
        rescue_request_id=rescue_request_id,
        announcement_id=announcement_id,
        title=title,
        message=message,
        notification_type=notification_type,
        is_read=False
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_user_notifications(db: Session, user_id: int):
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id
    ).order_by(
        models.Notification.created_at.desc()
    ).all()


def mark_notification_read(db: Session, notification_id: int, user_id: int):
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == user_id
    ).first()

    if notification is None:
        return None

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_notifications_read(db: Session, user_id: int):
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).all()

    for notification in notifications:
        notification.is_read = True

    db.commit()
    return {"message": "All notifications marked as read"}


def create_rescue_response(db: Session, rescue_id: int, helper_id: int):
    rescue_request = db.query(models.RescueRequest).filter(
        models.RescueRequest.id == rescue_id
    ).first()

    if rescue_request is None:
        return None

    if rescue_request.accepted_by is not None:
        if rescue_request.accepted_by == helper_id:
            return "already_accepted_by_you"
        return "already_accepted"

    response = models.RescueResponse(
        rescue_request_id=rescue_id,
        volunteer_id=helper_id,
        response="accepted"
    )

    db.add(response)
    rescue_request.accepted_by = helper_id
    rescue_request.status = "accepted"

    db.add(models.RescueStatusHistory(
        rescue_request_id=rescue_id,
        status="accepted",
        updated_by=helper_id
    ))

    db.commit()
    db.refresh(response)

    create_notification(
        db,
        helper_id,
        rescue_id,
        None,
        "🙋 Rescue assigned to you",
        f"You accepted the {rescue_request.animal_type} rescue at {rescue_request.location}.",
        "rescue_assigned"
    )

    return response


def get_rescue_by_id(db: Session, rescue_id: int):
    return db.query(models.RescueRequest).filter(
        models.RescueRequest.id == rescue_id
    ).first()


def get_my_reported_rescues(db: Session, reporter_id: int):
    return db.query(models.RescueRequest).filter(
        models.RescueRequest.reporter_id == reporter_id
    ).order_by(models.RescueRequest.created_at.desc()).all()


def get_active_rescues_for_helper(db: Session, helper_id: int):
    return db.query(models.RescueRequest).filter(
        models.RescueRequest.accepted_by == helper_id,
        models.RescueRequest.status != "resolved"
    ).order_by(models.RescueRequest.created_at.desc()).all()


def get_rescues_reported_by_user(db: Session, reporter_id: int):
    return get_my_reported_rescues(db, reporter_id)


def get_resolved_rescues_for_helper(db: Session, helper_id: int):
    return db.query(models.RescueRequest).filter(
        models.RescueRequest.accepted_by == helper_id,
        models.RescueRequest.status == "resolved"
    ).order_by(models.RescueRequest.created_at.desc()).all()


def get_nearby_active_rescues(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 10
):
    rescues = db.query(models.RescueRequest).filter(
        models.RescueRequest.status != "resolved",
        models.RescueRequest.accepted_by.is_(None)
    ).order_by(models.RescueRequest.created_at.desc()).all()

    nearby_rescues = []
    lat1 = math.radians(latitude)
    lon1 = math.radians(longitude)

    for rescue in rescues:
        rescue_lat = math.radians(rescue.latitude)
        rescue_lon = math.radians(rescue.longitude)

        dlat = rescue_lat - lat1
        dlon = rescue_lon - lon1

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1)
            * math.cos(rescue_lat)
            * math.sin(dlon / 2) ** 2
        )

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance_km = 6371 * c

        if distance_km <= radius_km:
            nearby_rescues.append({
                "id": rescue.id,
                "animal_type": rescue.animal_type,
                "description": rescue.description,
                "location": rescue.location,
                "latitude": rescue.latitude,
                "longitude": rescue.longitude,
                "emergency_level": rescue.emergency_level,
                "status": rescue.status,
                "distance_km": round(distance_km, 2),
                "photo_urls": rescue.photo_urls
            })

    return nearby_rescues


def create_notifications_for_nearby_rescues(
    db: Session,
    helper_id: int,
    latitude: float,
    longitude: float,
    radius_km: float = 10
):
    nearby_rescues = get_nearby_active_rescues(
        db, latitude, longitude, radius_km
    )

    created_notifications = []

    for rescue in nearby_rescues:
        existing_notification = db.query(models.Notification).filter(
            models.Notification.user_id == helper_id,
            models.Notification.rescue_request_id == rescue["id"],
            models.Notification.notification_type == "rescue_alert"
        ).first()

        if existing_notification:
            continue

        created_notifications.append(
            create_notification(
                db,
                helper_id,
                rescue["id"],
                None,
                "🚨 Nearby Rescue Alert",
                (
                    f"{rescue['animal_type']} rescue reported near "
                    f"{rescue['location']}. "
                    f"{rescue['distance_km']} km away."
                ),
                "rescue_alert"
            )
        )

    return created_notifications


def get_nearby_helpers(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 10
):
    helpers = db.query(models.User).filter(
        models.User.role.in_(["volunteer", "ngo", "vet"]),
        models.User.latitude.isnot(None),
        models.User.longitude.isnot(None)
    ).all()

    nearby_helpers = []
    lat1 = math.radians(latitude)
    lon1 = math.radians(longitude)

    for helper in helpers:
        lat2 = math.radians(helper.latitude)
        lon2 = math.radians(helper.longitude)
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1)
            * math.cos(lat2)
            * math.sin(dlon / 2) ** 2
        )

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance_km = 6371 * c

        if distance_km <= radius_km:
            nearby_helpers.append({
                "id": helper.id,
                "full_name": helper.full_name,
                "role": helper.role,
                "phone": helper.phone,
                "location": helper.location,
                "latitude": helper.latitude,
                "longitude": helper.longitude,
                "organization_name": helper.organization_name,
                "available_from": helper.available_from,
                "available_to": helper.available_to,
                "services": helper.services,
                "emergency_available": helper.emergency_available,
                "is_available": helper.is_available,
                "is_verified": helper.is_verified,
                "distance_km": round(distance_km, 2)
            })

    nearby_helpers.sort(key=lambda x: x["distance_km"])
    return nearby_helpers


def delete_expired_announcements(db: Session):
    """Remove announcements one day after their manually entered event date."""
    expired = db.query(models.Announcement).filter(
        models.Announcement.event_date.isnot(None),
        models.Announcement.event_date < date.today()
    ).all()

    if not expired:
        return 0

    expired_ids = [announcement.id for announcement in expired]

    # Remove announcement notifications tied to announcements that are no longer current.
    db.query(models.Notification).filter(
        models.Notification.announcement_id.in_(expired_ids)
    ).delete(synchronize_session=False)

    for announcement in expired:
        db.delete(announcement)

    db.commit()
    return len(expired)


def create_announcement(
    db: Session,
    author_id: int,
    title: str,
    description: str,
    location: str | None,
    poster_url: str | None,
    event_date
):
    announcement = models.Announcement(
        author_id=author_id,
        title=title,
        description=description,
        location=location,
        poster_url=poster_url,
        event_date=event_date
    )

    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    users = db.query(models.User).filter(
        models.User.id != author_id
    ).all()

    for user in users:
        create_notification(
            db,
            user.id,
            None,
            announcement.id,
            "📢 New ResQPaws Announcement",
            f"{title} — {event_date}",
            "announcement"
        )

    return announcement


def get_announcements(db: Session):
    # The page/API request is the automatic cleanup trigger.
    delete_expired_announcements(db)

    return db.query(models.Announcement).order_by(
        models.Announcement.event_date.asc(),
        models.Announcement.created_at.desc()
    ).all()
