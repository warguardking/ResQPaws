import os
from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DB_SSL_CA = os.getenv("DB_SSL_CA")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

connect_args = {}

if DB_SSL_CA:
    ca_path = Path(DB_SSL_CA)

    if not ca_path.is_absolute():
        ca_path = Path(__file__).resolve().parent.parent / ca_path

    connect_args["ssl"] = {
        "ca": str(ca_path),
        "check_hostname": True
    }
else:
    raise RuntimeError("DB_SSL_CA is not set")

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args=connect_args
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()