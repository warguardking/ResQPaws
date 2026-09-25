from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Date, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="public")
    phone = Column(String(20), nullable=True)
    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_available = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    organization_name = Column(String(150), nullable=True)
    available_from = Column(String(10), nullable=True)
    available_to = Column(String(10), nullable=True)
    services = Column(String(500), nullable=True)
    emergency_available = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RescueRequest(Base):
    __tablename__ = "rescue_requests"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, nullable=False)
    accepted_by = Column(Integer, nullable=True)
    animal_type = Column(String(50), nullable=False)
    description = Column(String(500), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    emergency_level = Column(String(20), nullable=False, default="medium")
    status = Column(String(30), nullable=False, default="reported")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    photos = relationship(
        "RescuePhoto",
        back_populates="rescue",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    @property
    def photo_urls(self):
        return [photo.url for photo in self.photos]


class RescuePhoto(Base):
    __tablename__ = "rescue_photos"

    id = Column(Integer, primary_key=True, index=True)
    rescue_request_id = Column(Integer, ForeignKey("rescue_requests.id"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    original_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    rescue = relationship("RescueRequest", back_populates="photos")


class RescueStatusHistory(Base):
    __tablename__ = "rescue_status_history"

    id = Column(Integer, primary_key=True, index=True)
    rescue_request_id = Column(Integer, nullable=False)
    status = Column(String(30), nullable=False)
    updated_by = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(String(2000), nullable=False)
    location = Column(String(255), nullable=True)
    poster_url = Column(String(500), nullable=True)
    event_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    rescue_request_id = Column(Integer, nullable=True, index=True)
    announcement_id = Column(Integer, nullable=True, index=True)
    title = Column(String(150), nullable=False)
    message = Column(String(500), nullable=False)
    notification_type = Column(String(50), nullable=False, default="rescue_alert")
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RescueResponse(Base):
    __tablename__ = "rescue_responses"

    id = Column(Integer, primary_key=True, index=True)
    rescue_request_id = Column(Integer, nullable=False, index=True)
    volunteer_id = Column(Integer, nullable=False)
    response = Column(String(30), nullable=False, default="accepted")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
